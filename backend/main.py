from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from deepface import DeepFace
import os
import shutil
import traceback
import json

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

app = Flask(__name__)
app.json_encoder = NumpyEncoder
CORS(app)

EMOTION_MAP = {
    "happy": "heartwarming",
    "sad": "chill",
    "angry": "adrenaline",
    "fear": "spooky",
    "surprise": "mind-bending",
    "neutral": "chill",
    "disgust": "spooky"
}

def decode_image(image_data):
    if "," in image_data:
        image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def self_heal_deepface():
    deepface_home = os.path.join(os.path.expanduser("~"), ".deepface")
    if os.path.exists(deepface_home):
        try:
            shutil.rmtree(deepface_home)
            return True
        except Exception as e:
            print(f"Failed to clear .deepface folder: {e}")
    return False

def preload():
    print("Checking AI models...")
    try:
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        print("AI models ready!")
    except Exception as e:
        error_msg = str(e)
        print(f"Model loading error detected: {error_msg}")
        
        if "gdown" in error_msg.lower():
            print("CRITICAL: 'gdown' library is missing. DeepFace needs it to download models.")
            print("Please run: pip install gdown")
        elif any(phrase in error_msg for phrase in ["BadZipFile", "corrupted", "weights", "pre-trained"]):
            print("Detected corrupted or incomplete AI models. Attempting automatic fix...")
            if self_heal_deepface():
                print("\n" + "="*50)
                print("Environment HEALED! I have cleared the corrupted model files.")
                print("Please RESTART this script (setup_backend.bat) now.")
                print("It will re-download the correct files automatically.")
                print("="*50 + "\n")
                os._exit(0)
            else:
                print("Self-heal failed. Please manually delete the C:\\Users\\arshi\\.deepface folder.")

@app.route('/detect-mood', methods=['POST'])
def detect_mood():
    try:
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
        except Exception as e:
            return jsonify({"error": f"Failed to decode image: {str(e)}"}), 400
        
        try:
            results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        except Exception as e:
            traceback.print_exc()
            return jsonify({
                "error": "AI Model Error",
                "details": str(e),
                "hint": "This often happens if model files are missing or corrupted. Try restarting setup_backend.bat."
            }), 500
        
        if not results:
            return jsonify({"error": "Could not analyze image"}), 500
            
        if isinstance(results, list):
            result = results[0]
        else:
            result = results
            
        dominant_emotion = result['dominant_emotion']
        mood_id = EMOTION_MAP.get(dominant_emotion, "chill")
        
        emotions_serialized = {k: float(v) for k, v in result['emotion'].items()}
        
        return jsonify({
            "emotion": dominant_emotion,
            "mood_id": mood_id,
            "all_emotions": emotions_serialized
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    preload()
    app.run(host='0.0.0.0', port=5000, debug=True)

