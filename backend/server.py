import os
from pathlib import Path

import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent              # .../backend
ROOT_DIR = BASE_DIR.parent                               # .../LIBRAS_WEB
FRONTEND_DIR = ROOT_DIR / "frontend"                     # .../frontend
ASSETS_DIR = FRONTEND_DIR / "assets"

MODELS_DIR = BASE_DIR / "models"
MODEL_DIR = str(MODELS_DIR / "savedmodel_libras")         # pasta SavedModel
LABELS_PATH = str(MODELS_DIR / "labels.txt")

PORT = int(os.environ.get("PORT", 5000))


app = Flask(
    __name__,
    static_folder=None
)
CORS(app)


def load_labels(path: str):
    labels = []
    if not os.path.exists(path):
        return labels

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            # aceita "1 A" ou "A"
            if len(parts) >= 2 and parts[0].isdigit():
                labels.append(parts[1])
            else:
                labels.append(parts[0])
    return labels

LABELS = load_labels(LABELS_PATH)


model = None
infer = None
input_key = None
output_key = None
load_ok = False
load_error = None

def load_savedmodel(model_dir: str):
    global model, infer, input_key, output_key

    if not os.path.exists(model_dir):
        raise FileNotFoundError(f"Model dir não encontrado: {model_dir}")

    model = tf.saved_model.load(model_dir)

    if "serving_default" not in model.signatures:
        raise RuntimeError(
            f"Assinatura 'serving_default' não encontrada. Assinaturas: {list(model.signatures.keys())}"
        )

    infer = model.signatures["serving_default"]

    input_keys = list(infer.structured_input_signature[1].keys())
    if not input_keys:
        raise RuntimeError("Não achei nenhuma chave de input no SavedModel.")
    input_key = input_keys[0]

    out = infer.structured_outputs
    output_keys = list(out.keys())
    if not output_keys:
        raise RuntimeError("Não achei nenhuma chave de output no SavedModel.")
    output_key = output_keys[0]

try:
    load_savedmodel(MODEL_DIR)
    load_ok = True
except Exception as e:
    load_ok = False
    load_error = str(e)


def softmax(x: np.ndarray):
    x = x - np.max(x)
    ex = np.exp(x)
    return ex / (np.sum(ex) + 1e-9)

def predict_from_features(features):
    """
    features: list[float] len=63
    returns: (pred_index, confidence)
    """
    x = np.asarray(features, dtype=np.float32).reshape(1, -1)
    outputs = infer(tf.constant(x))[output_key].numpy()  
    logits_or_probs = outputs[0]

  
    s = float(np.sum(logits_or_probs))
    if np.all(logits_or_probs >= 0) and np.all(logits_or_probs <= 1) and (0.95 <= s <= 1.05):
        probs = logits_or_probs
    else:
        probs = softmax(logits_or_probs)

    pred_index = int(np.argmax(probs))
    confidence = float(probs[pred_index])
    return pred_index, confidence

def index_to_label(idx: int):
    if LABELS and 0 <= idx < len(LABELS):
        return LABELS[idx]
    return str(idx)


@app.get("/")
def serve_index():
    return send_from_directory(str(FRONTEND_DIR), "index.html")

@app.get("/main.js")
def serve_main_js():
    return send_from_directory(str(FRONTEND_DIR), "main.js")

@app.get("/style.css")
def serve_css():
    return send_from_directory(str(FRONTEND_DIR), "style.css")

@app.get("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(str(ASSETS_DIR), filename)


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "tensorflow": tf.__version__,
        "model_loaded": bool(load_ok),
        "model_dir": MODEL_DIR,
        "labels": len(LABELS),
        "input_key": input_key,
        "output_key": output_key,
        "error": load_error
    })

@app.post("/predict")
def predict():
    if not load_ok:
        return jsonify({"error": "Modelo não carregou", "details": load_error}), 500

    data = request.get_json(silent=True) or {}
    features = data.get("features", None)

    if features is None:
        return jsonify({"error": "Campo 'features' não enviado"}), 400
    if not isinstance(features, list):
        return jsonify({"error": "'features' deve ser uma lista"}), 400
    if len(features) != 63:
        return jsonify({"error": f"'features' deve ter 63 valores. Recebido: {len(features)}"}), 400

    try:
        pred_index, confidence = predict_from_features(features)
        letter = index_to_label(pred_index)
        return jsonify({
            "letter": letter,
            "confidence": confidence,
            "pred_index": pred_index
        })
    except Exception as e:
        return jsonify({"error": "Falha na inferência", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)