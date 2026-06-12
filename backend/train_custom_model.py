"""
FER2013 CNN — architecture from the high-accuracy Kaggle notebook.
Run: python train_custom_model.py
"""
import os, json, warnings
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_XLA_FLAGS"] = "--tf_xla_auto_jit=0"

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, log_loss, confusion_matrix

import tensorflow as tf
from tensorflow.keras import regularizers
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPool2D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

BACKEND_DIR  = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
TRAIN_DIR    = PROJECT_ROOT / "public" / "train_data" / "train"
VAL_DIR      = PROJECT_ROOT / "public" / "train_data" / "test"
MODELS_DIR   = BACKEND_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_PATH  = MODELS_DIR / "emotion_cnn.h5"
META_PATH   = MODELS_DIR / "emotion_cnn.metadata.json"
PLOT_PATH   = MODELS_DIR / "training_plot.png"
PUBLIC_META = PROJECT_ROOT / "public" / "models" / "emotion_cnn.metadata.json"

IMG_SIZE   = 48
BATCH_SIZE = 64
EPOCHS     = 60

CLASS_NAMES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

# Map dataset folder names → CLASS_NAMES (handles disgusted/fearful/surprised variants)
FOLDER_TO_CLASS = {
    "angry":     "angry",
    "disgusted": "disgust",
    "disgust":   "disgust",
    "fearful":   "fear",
    "fear":      "fear",
    "happy":     "happy",
    "neutral":   "neutral",
    "sad":       "sad",
    "surprised": "surprise",
    "surprise":  "surprise",
}

# ── Model architecture (FER2013 Kaggle notebook) ───────────────────────────────
def build_model():
    model = Sequential()
    model.add(Conv2D(32, kernel_size=(3,3), padding='same', activation='relu', input_shape=(48,48,1)))
    model.add(Conv2D(64, (3,3), padding='same', activation='relu'))
    model.add(BatchNormalization())
    model.add(MaxPool2D(pool_size=(2,2)))
    model.add(Dropout(0.25))

    model.add(Conv2D(128, (5,5), padding='same', activation='relu'))
    model.add(BatchNormalization())
    model.add(MaxPool2D(pool_size=(2,2)))
    model.add(Dropout(0.25))

    model.add(Conv2D(512, (3,3), padding='same', activation='relu', kernel_regularizer=regularizers.l2(0.01)))
    model.add(BatchNormalization())
    model.add(MaxPool2D(pool_size=(2,2)))
    model.add(Dropout(0.25))

    model.add(Conv2D(512, (3,3), padding='same', activation='relu', kernel_regularizer=regularizers.l2(0.01)))
    model.add(BatchNormalization())
    model.add(MaxPool2D(pool_size=(2,2)))
    model.add(Dropout(0.25))

    model.add(Flatten())
    model.add(Dense(256, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dropout(0.25))

    model.add(Dense(512, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dropout(0.25))

    model.add(Dense(7, activation='softmax'))

    model.compile(
        optimizer=Adam(learning_rate=0.0001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


# ── Plot ───────────────────────────────────────────────────────────────────────
def save_plot(history, val_acc, best_ep, class_accs):
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.patch.set_facecolor("#0f172a")
    fig.suptitle(f"FilmFlix Emotion AI  ·  Val Accuracy: {val_acc*100:.2f}%  ·  Best Epoch: {best_ep}",
                 color="white", fontsize=13, fontweight="bold")
    for ax in axes:
        ax.set_facecolor("#1e293b")
        ax.tick_params(colors="#94a3b8", labelsize=8)
        for sp in ax.spines.values(): sp.set_edgecolor("#334155")

    ep = list(range(1, len(history.history["accuracy"])+1))
    axes[0].plot(ep, history.history["accuracy"],     "#6366f1", lw=2, label="Train")
    axes[0].plot(ep, history.history["val_accuracy"], "#22d3ee", lw=2, label="Val")
    axes[0].set_title("Accuracy", color="white"); axes[0].set_ylim(0, 1)
    axes[0].legend(facecolor="#1e293b", labelcolor="white", fontsize=8)

    axes[1].plot(ep, history.history["loss"],     "#f43f5e", lw=2, label="Train")
    axes[1].plot(ep, history.history["val_loss"], "#fb923c", lw=2, label="Val")
    axes[1].set_title("Loss", color="white")
    axes[1].legend(facecolor="#1e293b", labelcolor="white", fontsize=8)

    names  = list(class_accs.keys())
    values = [class_accs[n] for n in names]
    colors = ["#22d3ee" if v>=0.7 else "#f59e0b" if v>=0.5 else "#f43f5e" for v in values]
    bars = axes[2].barh(names, values, color=colors, height=0.6)
    axes[2].set_xlim(0, 1)
    axes[2].set_title("Per-Class Accuracy", color="white")
    for bar, val in zip(bars, values):
        axes[2].text(min(bar.get_width()+0.02, 0.9), bar.get_y()+bar.get_height()/2,
                     f"{val*100:.1f}%", va="center", color="white", fontsize=8)
    plt.tight_layout()
    plt.savefig(str(PLOT_PATH), dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("="*60)
    print("  FilmFlix Emotion AI — FER2013 Architecture")
    print(f"  IMG: {IMG_SIZE}x{IMG_SIZE}  Batch: {BATCH_SIZE}  Max Epochs: {EPOCHS}")
    print(f"  Training data: {TRAIN_DIR}")
    print("="*60)

    # Count images per class
    print("\n[1] Scanning training data ...")
    total = 0
    for folder in sorted(TRAIN_DIR.iterdir()):
        if not folder.is_dir(): continue
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.jpeg")) + list(folder.glob("*.png"))
        print(f"  train/{folder.name:12s} → {len(imgs):5d} images")
        total += len(imgs)
    val_total = 0
    for folder in sorted(VAL_DIR.iterdir()):
        if not folder.is_dir(): continue
        imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.jpeg")) + list(folder.glob("*.png"))
        print(f"  test/{folder.name:12s}  → {len(imgs):5d} images")
        val_total += len(imgs)
    print(f"\n  Train images: {total:,}   Val images: {val_total:,}")

    # Data generators — separate train and test dirs like the Kaggle notebook
    train_datagen = ImageDataGenerator(
        width_shift_range=0.1,
        height_shift_range=0.1,
        horizontal_flip=True,
        rescale=1./255,
    )
    val_datagen = ImageDataGenerator(rescale=1./255)

    # Get actual folder names from disk (e.g. "disgusted", "fearful", "surprised")
    train_folders = sorted([f.name for f in TRAIN_DIR.iterdir() if f.is_dir()])
    # Order them to match CLASS_NAMES index order
    DATASET_CLASS_ORDER = ["angry", "disgusted", "fearful", "happy", "neutral", "sad", "surprised"]
    # Only include folders that actually exist
    ordered_folders = [f for f in DATASET_CLASS_ORDER if f in train_folders]

    train_generator = train_datagen.flow_from_directory(
        directory=str(TRAIN_DIR),
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        color_mode="grayscale",
        class_mode="categorical",
        classes=ordered_folders,
        shuffle=True,
    )
    val_generator = val_datagen.flow_from_directory(
        directory=str(VAL_DIR),
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        color_mode="grayscale",
        class_mode="categorical",
        classes=ordered_folders,
        shuffle=False,
    )

    print(f"\n  Train samples : {train_generator.samples:,}")
    print(f"  Val samples   : {val_generator.samples:,}")
    print(f"  Class indices : {train_generator.class_indices}")

    print(f"\n[2] Building model ...")
    model = build_model()
    model.summary()

    cb_list = [
        EarlyStopping(monitor='val_loss', mode='min', patience=8, restore_best_weights=True, verbose=1),
        ModelCheckpoint(str(MODEL_PATH), monitor='val_accuracy', mode='max', save_best_only=True, verbose=1),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=4, min_lr=1e-7, verbose=1),
    ]

    print(f"\n[3] Training ...")
    history = model.fit(
        train_generator,
        epochs=EPOCHS,
        validation_data=val_generator,
        callbacks=cb_list,
        verbose=1,
    )

    print("\n[4] Evaluating ...")
    val_loss, val_acc = model.evaluate(val_generator, verbose=0)
    best_ep = int(np.argmax(history.history["val_accuracy"])) + 1

    # Get predictions for metrics
    val_generator.reset()
    y_prob = model.predict(val_generator, verbose=0)
    y_pred = np.argmax(y_prob, axis=1)
    y_true = val_generator.classes

    # Map class indices from generator to CLASS_NAMES order
    class_idx = val_generator.class_indices  # e.g. {"angry": 0, ...}

    precision = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    recall    = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1        = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    logloss   = log_loss(y_true, y_prob)
    try:
        roc_auc = roc_auc_score(y_true, y_prob, multi_class="ovr", average="weighted")
    except Exception:
        roc_auc = 0.0
    cm = confusion_matrix(y_true, y_pred)

    # Per-class accuracy using generator's class order
    idx_to_name = {v: k for k, v in class_idx.items()}
    class_accs = {}
    print("\n  Per-class accuracy:")
    for idx in sorted(idx_to_name.keys()):
        name = idx_to_name[idx]
        mask = y_true == idx
        if mask.sum() == 0: continue
        acc_i = float((y_pred[mask] == idx).mean())
        class_accs[name] = acc_i
        print(f"    {name:10s} {acc_i*100:5.1f}%  {'█'*int(acc_i*25)}")

    print(f"\n{'='*60}")
    print(f"  Val Accuracy : {val_acc*100:.2f}%")
    print(f"  Precision    : {precision*100:.2f}%")
    print(f"  Recall       : {recall*100:.2f}%")
    print(f"  F1-Score     : {f1*100:.2f}%")
    print(f"  ROC-AUC      : {roc_auc:.4f}")
    print(f"  Log Loss     : {logloss:.4f}")
    print(f"  Best Epoch   : {best_ep}")
    print(f"{'='*60}")

    print("\n  Confusion Matrix:")
    names_ordered = [idx_to_name[i] for i in sorted(idx_to_name.keys())]
    print("          " + " ".join(f"{n[:5]:>6}" for n in names_ordered))
    for i, row in enumerate(cm):
        print(f"  {names_ordered[i]:8s}  " + " ".join(f"{v:6d}" for v in row))

    meta = {
        "class_names": CLASS_NAMES,
        "input_size": IMG_SIZE,
        "val_accuracy": round(float(val_acc), 4),
        "val_loss": round(float(val_loss), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc_auc), 4),
        "log_loss": round(float(logloss), 4),
        "epochs_trained": best_ep,
        "total_samples": total + val_total,
        "architecture": "FER2013 CNN (Kaggle notebook architecture)",
        "per_class_accuracy": class_accs,
        "confusion_matrix": cm.tolist(),
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    PUBLIC_META.parent.mkdir(exist_ok=True)
    PUBLIC_META.write_text(json.dumps(meta, indent=2))
    save_plot(history, val_acc, best_ep, class_accs)
    print(f"\n  Model saved → {MODEL_PATH}")
    print("  DONE! Restart backend: python main.py")


if __name__ == "__main__":
    main()
