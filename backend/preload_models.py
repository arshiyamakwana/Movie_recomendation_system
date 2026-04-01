from deepface import DeepFace
import os

def preload_models():
    print("Attempting to pre-download DeepFace models...")
    print("This requires an internet connection and might take a few minutes (approx 100-200MB).")
    
    # Simple neutral image for pre-loading
    import numpy as np
    import cv2
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    
    try:
        # This will trigger the download and loading of the emotion models
        print("Pre-loading emotion model...")
        DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        print("\nSUCCESS: Models loaded correctly!")
        print("You can now close this script and start your backend server.")
    except Exception as e:
        print(f"\nERROR: Failed to load models: {e}")
        print("\nTry this fix:")
        print(f"1. Open your user folder: {os.path.expanduser('~')}")
        print("2. Look for a hidden folder named '.deepface'")
        print("3. Delete the '.deepface' folder to clear any corrupted files.")
        print("4. Run this script again to re-download.")

if __name__ == "__main__":
    preload_models()
