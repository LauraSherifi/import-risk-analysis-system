from pathlib import Path
import json
import os

import joblib
import numpy as np
from flask import Flask, jsonify, request
from tensorflow import keras


app = Flask(__name__)
ML_API_PORT = int(os.environ.get("ML_API_PORT", 8001))

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "import_risk_neural_network.h5"
SCALER_PATH = MODELS_DIR / "import_risk_neural_network_scaler.joblib"
METRICS_PATH = MODELS_DIR / "neural_network_metrics.json"

FEATURE_COLUMNS = [
    "price_usd",
    "weight_kg",
    "length_m",
    "width_m",
    "height_m",
    "volume_m3",
    "max_dimension_m",
    "dimension_sum_m",
    "density_kg_m3",
]


def load_json(path):
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_required_number(data, *keys, field_name):
    for key in keys:
        value = data.get(key)
        if value is None or value == "":
            continue

        try:
            parsed = float(value)
        except (TypeError, ValueError):
            raise ValueError(f"{field_name} must be a valid number") from None

        if parsed < 0:
            raise ValueError(f"{field_name} must be greater than or equal to 0")

        return parsed

    raise ValueError(f"Missing required field: {field_name}")


def parse_optional_number(data, *keys):
    for key in keys:
        value = data.get(key)
        if value is None or value == "":
            continue

        try:
            parsed = float(value)
        except (TypeError, ValueError):
            raise ValueError(f"{key} must be a valid number") from None

        if parsed < 0:
            raise ValueError(f"{key} must be greater than or equal to 0")

        return parsed

    return None


def estimate_dimensions_from_volume(volume_m3):
    safe_volume = max(float(volume_m3), 1e-6)
    edge = safe_volume ** (1 / 3)
    return edge, edge, edge


def build_feature_vector(data):
    price_usd = parse_required_number(data, "price_usd", "price", field_name="price_usd")
    weight_kg = parse_required_number(data, "weight_kg", "weight", field_name="weight_kg")
    volume_m3 = parse_required_number(data, "volume_m3", "volume", field_name="volume_m3")

    length_m = parse_optional_number(data, "length_m", "length")
    width_m = parse_optional_number(data, "width_m", "width")
    height_m = parse_optional_number(data, "height_m", "height")

    if length_m is None or width_m is None or height_m is None:
        length_m, width_m, height_m = estimate_dimensions_from_volume(volume_m3)

    max_dimension_m = parse_optional_number(data, "max_dimension_m", "maxDimensionM")
    if max_dimension_m is None:
        max_dimension_m = max(length_m, width_m, height_m)

    dimension_sum_m = parse_optional_number(data, "dimension_sum_m", "dimensionSumM")
    if dimension_sum_m is None:
        dimension_sum_m = length_m + width_m + height_m

    density_kg_m3 = parse_optional_number(data, "density_kg_m3", "densityKgM3")
    if density_kg_m3 is None:
        density_kg_m3 = weight_kg / volume_m3 if volume_m3 > 0 else 0.0

    raw_features = np.array(
        [
            [
                price_usd,
                weight_kg,
                length_m,
                width_m,
                height_m,
                volume_m3,
                max_dimension_m,
                dimension_sum_m,
                density_kg_m3,
            ]
        ],
        dtype=float,
    )

    scaled_features = scaler.transform(raw_features)

    return raw_features, scaled_features


def build_probability_summary(predicted_probability):
    high_risk_probability = round(float(predicted_probability), 4)
    low_risk_probability = round(1 - high_risk_probability, 4)
    probability_map = {
        "LOW RISK": low_risk_probability,
        "HIGH RISK": high_risk_probability,
    }

    prediction_label = (
        "HIGH RISK" if high_risk_probability >= decision_threshold else "LOW RISK"
    )

    confidence = probability_map[prediction_label]

    return {
        "prediction": prediction_label,
        "confidence": confidence,
        "probabilities": probability_map,
        "decision_threshold": decision_threshold,
    }


metrics = load_json(METRICS_PATH)
decision_threshold = float(metrics.get("decision_threshold", 0.5))
model = keras.models.load_model(MODEL_PATH, compile=False)
scaler = joblib.load(SCALER_PATH)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        _, scaled_features = build_feature_vector(data)

        predicted_probability = float(model.predict(scaled_features, verbose=0).ravel()[0])
        probability_summary = build_probability_summary(predicted_probability)

        return jsonify(
            {
                "prediction": probability_summary["prediction"],
                "confidence": probability_summary["confidence"],
                "probabilities": probability_summary["probabilities"],
                "decision_threshold": probability_summary["decision_threshold"],
                "model": metrics.get("name", "Neural Network"),
                "features_used": FEATURE_COLUMNS,
            }
        )

    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=ML_API_PORT)
