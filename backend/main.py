import os
os.environ["TF_XLA_FLAGS"] = "--tf_xla_auto_jit=0"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import base64

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from emotion_model import load_model_bundle, predict_emotion

app = Flask(__name__)
CORS(app)
MODEL_BUNDLE = None

def decode_image(image_data):
    if "," in image_data:
        image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def preload():
    global MODEL_BUNDLE
    print("Loading local emotion model...")
    try:
        MODEL_BUNDLE = load_model_bundle()
        print(f"Emotion model ready: {MODEL_BUNDLE['model_path']}")
        # Warmup: run a dummy prediction so the first real request is fast
        input_shape = MODEL_BUNDLE["model"].input_shape
        channels = int(input_shape[-1]) if input_shape[-1] else 1
        size = int(input_shape[1])
        dummy = np.zeros((1, size, size, channels), dtype="float32")
        MODEL_BUNDLE["model"].predict(dummy, verbose=0)
        print(f"Model warmup complete (input: {size}x{size}x{channels}).")
    except Exception as e:
        MODEL_BUNDLE = None
        import traceback
        print(f"Model loading error: {e}")
        traceback.print_exc()

@app.route('/detect-face', methods=['POST'])
def detect_face():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('image'):
            return jsonify({"face": None}), 200
        img = decode_image(data['image'])
        if MODEL_BUNDLE is None:
            return jsonify({"face": None}), 200
        from emotion_model import extract_primary_face
        _, found = extract_primary_face(img, MODEL_BUNDLE["face_detector"])
        if not found:
            return jsonify({"face": None}), 200
        # Return raw face coordinates
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = MODEL_BUNDLE["face_detector"].detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(30,30))
        if len(faces) == 0:
            return jsonify({"face": None}), 200
        x, y, w, h = max(faces, key=lambda b: b[2]*b[3])
        return jsonify({"face": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}}), 200
    except Exception:
        return jsonify({"face": None}), 200


@app.route('/detect-mood', methods=['POST'])
def detect_mood():
    try:
        if MODEL_BUNDLE is None:
            return jsonify({
                "error": "Emotion model is not available",
                "hint": "Train the local model first: python train_emotion_model.py"
            }), 503

        print("Received request at /detect-mood")
        data = request.get_json(silent=True)
        
        if not data:
            print("Error: No JSON data received")
            return jsonify({"error": "No JSON data provided"}), 400
            
        image_data = data.get('image')
        
        if not image_data:
            print("Error: 'image' field is missing or empty")
            return jsonify({"error": "No image data provided"}), 400
        
        print(f"Image data received (length: {len(image_data)})")
        
        try:
            img = decode_image(image_data)
            h, w = img.shape[:2]
            print(f"Image decoded: {w}x{h}")
            if w > 320:
                scale = 320 / w
                img = cv2.resize(img, (320, int(h * scale)), interpolation=cv2.INTER_AREA)
                print(f"Image resized to: {img.shape[1]}x{img.shape[0]}")
        except Exception as e:
            print(f"Image decode error: {e}")
            return jsonify({"error": f"Failed to decode image: {str(e)}"}), 400

        result = predict_emotion(
            img,
            MODEL_BUNDLE["model"],
            MODEL_BUNDLE["face_detector"],
            class_names=MODEL_BUNDLE["class_names"],
            input_size=MODEL_BUNDLE["input_size"],
        )
        print(f"Detected: {result['emotion']} | Scores: {result['all_emotions']}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    preload()
    app.run(host='0.0.0.0', port=5000, debug=False)
