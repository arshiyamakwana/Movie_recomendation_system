from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pandas as pd
import tensorflow as tf
from PIL import Image
from tensorflow.keras import layers, models


BACKEND_DIR = Path(__file__).resolve().parent
MODELS_DIR = BACKEND_DIR / "models"
DEFAULT_MODEL_PATH = MODELS_DIR / "emotion_cnn.h5"
DEFAULT_METADATA_PATH = MODELS_DIR / "emotion_cnn.metadata.json"

CLASS_NAMES = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "neutral",
    "sad",
    "surprise",
]

EMOTION_MAP = {
    "happy":    "happy",
    "sad":      "sad",
    "angry":    "angry",
    "fear":     "fear",
    "surprise": "surprise",
    "neutral":  "neutral",
    "disgust":  "disgust",
}


def build_emotion_cnn(
    input_shape: tuple[int, int, int] = (48, 48, 1),
    num_classes: int = len(CLASS_NAMES),
) -> tf.keras.Model:
    model = models.Sequential([
        layers.Input(shape=input_shape),
        layers.Rescaling(1.0 / 255),
        layers.Conv2D(512, (5, 5), activation="elu", padding="same", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.Conv2D(256, (5, 5), activation="elu", padding="same", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),

        layers.Conv2D(128, (3, 3), activation="elu", padding="same", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.Conv2D(128, (3, 3), activation="elu", padding="same", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),

        layers.Conv2D(256, (3, 3), activation="elu", padding="same", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.Conv2D(512, (3, 3), activation="elu", padding="same", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),

        layers.Flatten(),
        layers.Dense(256, activation="elu", kernel_initializer="he_normal"),
        layers.BatchNormalization(),
        layers.Dropout(0.25),
        layers.Dense(num_classes, activation="softmax"),
    ])
    return model


def load_fer2013_csv(
    csv_path: str | Path,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    df = pd.read_csv(csv_path)

    if not {"emotion", "pixels"}.issubset(df.columns):
        raise ValueError(
            "FER2013 CSV must contain at least 'emotion' and 'pixels' columns."
        )

    pixels = np.stack(
        df["pixels"]
        .astype(str)
        .map(lambda raw: np.fromstring(raw, dtype=np.float32, sep=" "))
        .to_list()
    )

    if pixels.shape[1] != 48 * 48:
        raise ValueError(
            f"Expected FER2013 images with 2304 pixels, got {pixels.shape[1]}."
        )

    x = pixels.reshape((-1, 48, 48, 1))
    y = tf.keras.utils.to_categorical(df["emotion"].astype(int), len(CLASS_NAMES))

    if "Usage" in df.columns:
        train_mask = df["Usage"].isin(["Training", "train"])
        val_mask = df["Usage"].isin(["PublicTest", "PrivateTest", "val", "validation"])

        if not train_mask.any() or not val_mask.any():
            raise ValueError(
                "Usage column found, but training/validation rows could not be split."
            )

        x_train, y_train = x[train_mask.to_numpy()], y[train_mask.to_numpy()]
        x_val, y_val = x[val_mask.to_numpy()], y[val_mask.to_numpy()]
    else:
        split_index = int(len(x) * 0.9)
        x_train, y_train = x[:split_index], y[:split_index]
        x_val, y_val = x[split_index:], y[split_index:]

    return x_train, y_train, x_val, y_val


def load_huggingface_dataset(
    dataset_name: str,
    train_split: str = "train",
    eval_split: str | None = None,
    image_column: str = "image",
    label_column: str = "label",
    validation_ratio: float = 0.1,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    from datasets import load_dataset

    dataset = load_dataset(dataset_name)
    train_ds = dataset[train_split]

    if eval_split and eval_split in dataset:
        eval_ds = dataset[eval_split]
    else:
        split_data = train_ds.train_test_split(
            test_size=validation_ratio,
            stratify_by_column=label_column,
            seed=42,
        )
        train_ds = split_data["train"]
        eval_ds = split_data["test"]

    x_train = _dataset_images_to_array(train_ds[image_column])
    y_train = tf.keras.utils.to_categorical(
        np.asarray(train_ds[label_column], dtype=np.int32), len(CLASS_NAMES)
    )
    x_val = _dataset_images_to_array(eval_ds[image_column])
    y_val = tf.keras.utils.to_categorical(
        np.asarray(eval_ds[label_column], dtype=np.int32), len(CLASS_NAMES)
    )

    return x_train, y_train, x_val, y_val


def _dataset_images_to_array(images: list[Any]) -> np.ndarray:
    tensors: list[np.ndarray] = []
    for image in images:
        if isinstance(image, Image.Image):
            pil_image = image
        elif isinstance(image, dict) and "bytes" in image and image["bytes"] is not None:
            from io import BytesIO

            pil_image = Image.open(BytesIO(image["bytes"]))
        else:
            pil_image = Image.fromarray(np.asarray(image))

        gray = pil_image.convert("L").resize((48, 48))
        tensors.append(np.asarray(gray, dtype=np.float32))

    return np.expand_dims(np.stack(tensors), axis=-1)


def create_face_detector() -> cv2.CascadeClassifier:
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(str(cascade_path))
    if detector.empty():
        raise RuntimeError(f"Could not load Haar cascade from {cascade_path}")
    return detector


def extract_primary_face(
    image_bgr: np.ndarray,
    face_detector: cv2.CascadeClassifier,
) -> tuple[np.ndarray | None, bool]:
    if image_bgr is None or image_bgr.size == 0:
        print("[face] Empty image received")
        return None, False

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = []

    # Single fast pass — scaleFactor=1.1, minNeighbors=3
    try:
        detected = face_detector.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30)
        )
        if len(detected) > 0:
            faces = detected
    except Exception as e:
        print(f"[face] detectMultiScale error: {e}")

    # One fallback pass with looser constraints
    if len(faces) == 0:
        try:
            detected = face_detector.detectMultiScale(
                gray, scaleFactor=1.05, minNeighbors=1, minSize=(20, 20)
            )
            if len(detected) > 0:
                faces = detected
                print("[face] Found face with aggressive detection")
        except Exception as e:
            print(f"[face] aggressive detectMultiScale error: {e}")

    if len(faces) == 0:
        print("[face] No face detected — using centre crop as fallback")
        h_img, w_img = gray.shape[:2]
        size = min(h_img, w_img)
        if size == 0:
            return None, False
        y1 = (h_img - size) // 2
        x1 = (w_img - size) // 2
        face_crop = gray[y1:y1 + size, x1:x1 + size]
        if face_crop.size == 0:
            return None, False
        return face_crop, True

    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])
    pad = int(min(w, h) * 0.1)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(gray.shape[1], x + w + pad)
    y2 = min(gray.shape[0], y + h + pad)
    face_crop = gray[y1:y2, x1:x2]
    if face_crop.size == 0:
        return gray, True
    print(f"[face] Detected at ({x},{y}) size {w}x{h}")
    return face_crop, True


def preprocess_face(face_gray: np.ndarray, input_size: int = 48, channels: int = 1) -> np.ndarray:
    resized = cv2.resize(face_gray, (input_size, input_size), interpolation=cv2.INTER_AREA)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    enhanced = clahe.apply(resized)
    if channels == 3:
        # Convert grayscale to RGB by stacking 3 channels
        rgb = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
        return np.expand_dims(rgb.astype("float32"), axis=0)  # (1, H, W, 3)
    # Grayscale single channel — shape (1, H, W, 1)
    return np.expand_dims(np.expand_dims(enhanced.astype("float32"), axis=-1), axis=0)


def predict_emotion(
    image_bgr: np.ndarray,
    model: tf.keras.Model,
    face_detector: cv2.CascadeClassifier,
    class_names: list[str] | None = None,
    input_size: int = 48,
) -> dict[str, Any]:
    labels = class_names or CLASS_NAMES
    face, face_found = extract_primary_face(image_bgr, face_detector)
    if not face_found:
        return {"error": "no_face", "emotion": None, "mood_id": None, "all_emotions": {}}

    # Read actual input shape from model to handle any architecture
    model_input_shape = model.input_shape  # e.g. (None, 96, 96, 3) or (None, 48, 48, 1)
    actual_size = int(model_input_shape[1])
    actual_channels = int(model_input_shape[3]) if model_input_shape[3] else 1
    print(f"[model] input shape: {model_input_shape} → size={actual_size}, channels={actual_channels}")

    tensor = preprocess_face(face, input_size=actual_size, channels=actual_channels)
    print(f"[model] tensor shape: {tensor.shape}")
    try:
        raw_predictions = model.predict(tensor, verbose=0)[0]
    except Exception as e:
        print(f"[model] predict error: {e}")
        return {"error": str(e), "emotion": None, "mood_id": None, "all_emotions": {}}

    # Use raw predictions directly — softer distribution keeps minority emotions visible
    predictions = raw_predictions.copy()

    # Penalise dominant classes that overpower weaker emotions
    for bias_label, factor in [("happy", 0.35), ("neutral", 0.25), ("sad", 0.6)]:
        if bias_label in labels:
            predictions[labels.index(bias_label)] *= factor

    # Boost underrepresented emotions so they can win when actually present
    for boost_label, factor in [("angry", 1.8), ("surprise", 1.6), ("fear", 1.5), ("disgust", 1.5)]:
        if boost_label in labels:
            predictions[labels.index(boost_label)] *= factor

    predictions = predictions / predictions.sum()

    percentages = {
        label: round(float(score) * 100.0, 4)
        for label, score in zip(labels, predictions)
    }
    dominant_emotion = labels[int(np.argmax(predictions))]

    print(f"[emotion] raw scores: { {l: round(float(s)*100,1) for l,s in zip(labels,raw_predictions)} }")
    print(f"[emotion] adjusted → {dominant_emotion} ({percentages[dominant_emotion]:.1f}%)")

    return {
        "emotion": dominant_emotion,
        "mood_id": EMOTION_MAP.get(dominant_emotion, "chill"),
        "all_emotions": percentages,
    }


def save_metadata(
    path: str | Path,
    class_names: list[str] | None = None,
    input_size: int = 48,
) -> None:
    payload = {
        "class_names": class_names or CLASS_NAMES,
        "input_size": input_size,
    }
    Path(path).write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_model_bundle(
    model_path: str | Path | None = None,
    metadata_path: str | Path | None = None,
) -> dict[str, Any]:
    resolved_model_path = Path(model_path or DEFAULT_MODEL_PATH)
    resolved_metadata_path = Path(metadata_path or DEFAULT_METADATA_PATH)

    if not resolved_model_path.exists():
        raise FileNotFoundError(
            f"Trained model not found at {resolved_model_path}. "
            "Train it first with: python train_emotion_model.py --dataset path\\to\\fer2013.csv"
        )

    class_names = CLASS_NAMES
    input_size = 48
    if resolved_metadata_path.exists():
        metadata = json.loads(resolved_metadata_path.read_text(encoding="utf-8"))
        class_names = metadata.get("class_names", CLASS_NAMES)
        input_size = int(metadata.get("input_size", 48))

    model = tf.keras.models.load_model(resolved_model_path, compile=False)
    detector = create_face_detector()

    return {
        "model": model,
        "face_detector": detector,
        "class_names": class_names,
        "input_size": input_size,
        "model_path": str(resolved_model_path),
    }
