from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

try:
    from tensorflow import keras
except ImportError as exc:
    raise ImportError(
        "TensorFlow is required for neural network training. "
        "Install project requirements with: pip install -r requirements.txt"
    ) from exc


ML_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ML_DIR / "data" / "processed" / "cleaned_dataset.csv"
MODELS_DIR = ML_DIR / "models"

MODEL_PATH = MODELS_DIR / "import_risk_neural_network.h5"
SCALER_PATH = MODELS_DIR / "import_risk_neural_network_scaler.joblib"
METRICS_PATH = MODELS_DIR / "neural_network_metrics.json"
REPORT_PATH = MODELS_DIR / "neural_network_report.txt"
TUNING_PATH = MODELS_DIR / "neural_network_tuning_results.json"

RANDOM_STATE = 42
TEST_SIZE = 0.2
VALIDATION_SIZE = 0.2

FEATURE_COLUMNS = [
    "weight_kg",
    "length_m",
    "width_m",
    "height_m",
    "volume_m3",
    "max_dimension_m",
    "dimension_sum_m",
    "density_kg_m3",
    "expected_tax_rate",
    "tax_gap",
    "tax_per_kg",
    "tax_per_m3",
    "log_tax",
]
TARGET_COLUMN = "risk"
LABEL_LEAKAGE_NOTE = (
    "The current target is derived from tax_ratio, so the dataset itself still "
    "contains label leakage. The neural network feature set removes tax_ratio, "
    "raw tax, price_usd, value-per-price features, and tax_paid_share to avoid "
    "trivially reconstructing tax_ratio, but the target definition should be "
    "reworked for a fully leakage-free model."
)

ARCHITECTURES = [
    {
        "name": "baseline_64_32",
        "layers": [64, 32],
        "dropout": 0.2,
        "learning_rate": 0.001,
        "batch_size": 64,
        "epochs": 25,
    },
    {
        "name": "deeper_128_64_32",
        "layers": [128, 64, 32],
        "dropout": 0.3,
        "learning_rate": 0.0005,
        "batch_size": 128,
        "epochs": 30,
    },
]


def load_dataset():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATA_PATH}")

    return pd.read_csv(DATA_PATH)


def validate_dataset(df):
    required_columns = set(FEATURE_COLUMNS + [TARGET_COLUMN])
    missing_columns = required_columns.difference(df.columns)

    if missing_columns:
        raise ValueError(f"Missing required columns: {sorted(missing_columns)}")

    if df[FEATURE_COLUMNS + [TARGET_COLUMN]].isna().sum().sum() > 0:
        raise ValueError("Dataset contains missing values.")

    numeric_df = df[FEATURE_COLUMNS]
    if np.isinf(numeric_df.to_numpy()).sum() > 0:
        raise ValueError("Dataset contains infinite values.")

    allowed_targets = {"HIGH RISK", "LOW RISK"}
    invalid_targets = set(df[TARGET_COLUMN].unique()).difference(allowed_targets)

    if invalid_targets:
        raise ValueError(f"Invalid target values found: {sorted(invalid_targets)}")


def prepare_train_validation_test_data(df):
    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].map({"LOW RISK": 0, "HIGH RISK": 1})

    X_train_valid, X_test, y_train_valid, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    validation_fraction = VALIDATION_SIZE / (1 - TEST_SIZE)

    X_train, X_valid, y_train, y_valid = train_test_split(
        X_train_valid,
        y_train_valid,
        test_size=validation_fraction,
        random_state=RANDOM_STATE,
        stratify=y_train_valid,
    )

    return X_train, X_valid, X_test, y_train, y_valid, y_test


def scale_features(X_train, X_valid, X_test):
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_valid_scaled = scaler.transform(X_valid)
    X_test_scaled = scaler.transform(X_test)

    return scaler, X_train_scaled, X_valid_scaled, X_test_scaled


def build_model(input_shape, architecture):
    model = keras.Sequential(name=architecture["name"])
    model.add(keras.Input(shape=(input_shape,)))

    for units in architecture["layers"]:
        model.add(keras.layers.Dense(units, activation="relu"))
        model.add(keras.layers.Dropout(architecture["dropout"]))

    model.add(keras.layers.Dense(1, activation="sigmoid"))
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=architecture["learning_rate"]),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )

    return model


def train_architecture(architecture, X_train, y_train, X_valid, y_valid):
    keras.utils.set_random_seed(RANDOM_STATE)
    model = build_model(X_train.shape[1], architecture)

    early_stopping = keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
    )

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_valid, y_valid),
        epochs=architecture["epochs"],
        batch_size=architecture["batch_size"],
        callbacks=[early_stopping],
        verbose=1,
    )

    probabilities = model.predict(X_valid).ravel()
    predictions = (probabilities >= 0.5).astype(int)

    metrics = {
        "name": architecture["name"],
        "selection_split": "validation",
        "layers": architecture["layers"],
        "dropout": architecture["dropout"],
        "learning_rate": architecture["learning_rate"],
        "batch_size": architecture["batch_size"],
        "epochs_requested": architecture["epochs"],
        "epochs_ran": len(history.history["loss"]),
        "validation_loss": round(float(min(history.history["val_loss"])), 4),
        "validation_accuracy": round(float(accuracy_score(y_valid, predictions)), 4),
        "validation_f1_score": round(
            float(f1_score(y_valid, predictions, zero_division=0)), 4
        ),
        "validation_confusion_matrix": confusion_matrix(y_valid, predictions).tolist(),
        "validation_classification_report": classification_report(
            y_valid,
            predictions,
            target_names=["LOW RISK", "HIGH RISK"],
            zero_division=0,
        ),
    }

    return model, metrics


def evaluate_on_test(model, architecture_metrics, X_test, y_test):
    probabilities = model.predict(X_test).ravel()
    predictions = (probabilities >= 0.5).astype(int)

    return {
        "name": architecture_metrics["name"],
        "evaluation_split": "held_out_test",
        "label_leakage_note": LABEL_LEAKAGE_NOTE,
        "features_used": FEATURE_COLUMNS,
        "layers": architecture_metrics["layers"],
        "dropout": architecture_metrics["dropout"],
        "learning_rate": architecture_metrics["learning_rate"],
        "batch_size": architecture_metrics["batch_size"],
        "epochs_requested": architecture_metrics["epochs_requested"],
        "epochs_ran": architecture_metrics["epochs_ran"],
        "validation_f1_score_used_for_selection": architecture_metrics[
            "validation_f1_score"
        ],
        "validation_accuracy_used_for_selection": architecture_metrics[
            "validation_accuracy"
        ],
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "f1_score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
        "classification_report": classification_report(
            y_test,
            predictions,
            target_names=["LOW RISK", "HIGH RISK"],
            zero_division=0,
        ),
    }


def save_outputs(best_model, scaler, best_metrics, tuning_results):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    best_model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(best_metrics, metrics_file, indent=2)

    with TUNING_PATH.open("w", encoding="utf-8") as tuning_file:
        json.dump(tuning_results, tuning_file, indent=2)

    with REPORT_PATH.open("w", encoding="utf-8") as report_file:
        report_file.write("Neural Network Evaluation Report\n")
        report_file.write("=" * 50)
        report_file.write("\n\n")
        report_file.write(f"Best architecture: {best_metrics['name']}\n")
        report_file.write(f"Features: {', '.join(FEATURE_COLUMNS)}\n")
        report_file.write(f"Evaluation split: {best_metrics['evaluation_split']}\n")
        report_file.write(f"Accuracy: {best_metrics['accuracy']}\n")
        report_file.write(f"F1 Score: {best_metrics['f1_score']}\n")
        report_file.write(f"Confusion Matrix: {best_metrics['confusion_matrix']}\n\n")
        report_file.write("Leakage Note:\n")
        report_file.write(best_metrics["label_leakage_note"])
        report_file.write("\n\nClassification Report:\n")
        report_file.write(best_metrics["classification_report"])


def main():
    df = load_dataset()
    validate_dataset(df)

    X_train, X_valid, X_test, y_train, y_valid, y_test = (
        prepare_train_validation_test_data(df)
    )
    scaler, X_train_scaled, X_valid_scaled, X_test_scaled = scale_features(
        X_train,
        X_valid,
        X_test,
    )

    tuning_results = []
    trained_models = []

    for architecture in ARCHITECTURES:
        model, metrics = train_architecture(
            architecture,
            X_train_scaled,
            y_train,
            X_valid_scaled,
            y_valid,
        )
        trained_models.append((model, metrics))
        tuning_results.append(metrics)

    best_model, best_metrics = max(
        trained_models,
        key=lambda item: (
            item[1]["validation_f1_score"],
            item[1]["validation_accuracy"],
        ),
    )

    final_metrics = evaluate_on_test(best_model, best_metrics, X_test_scaled, y_test)

    save_outputs(best_model, scaler, final_metrics, tuning_results)

    print("Neural network training completed successfully.")
    print(f"Best architecture: {final_metrics['name']}")
    print("Evaluation split: held_out_test")
    print(f"Accuracy: {final_metrics['accuracy']}")
    print(f"F1 Score: {final_metrics['f1_score']}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Scaler saved to: {SCALER_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Tuning results saved to: {TUNING_PATH}")
    print(f"Report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
