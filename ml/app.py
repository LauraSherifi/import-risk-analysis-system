from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

# Initialize Flask app
app = Flask(__name__)
ML_API_PORT = int(os.environ.get("ML_API_PORT", 5001))

# Define the base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Build the absolute path to the model
model_path = os.path.join(BASE_DIR, "models", "import_risk_classifier.joblib")

# Load the trained model
model = joblib.load(model_path)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Parse input JSON
        data = request.get_json()
        tax = data.get("tax")
        tax_ratio = data.get("tax_ratio")

        # Validate input
        if tax is None or tax_ratio is None:
            return jsonify({"error": "Invalid input. 'tax' and 'tax_ratio' are required."}), 400

        # Prepare input for the model
        input_features = np.array([[tax, tax_ratio]])

        # Make prediction
        prediction = model.predict(input_features)

        # Map prediction to human-readable output
        prediction_label = "HIGH RISK" if prediction[0] == 1 else "LOW RISK"

        return jsonify({"prediction": prediction_label})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=ML_API_PORT)
