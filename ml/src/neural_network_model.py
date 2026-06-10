from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight

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
TARGET_COLUMN = "risk"
LABEL_LEAKAGE_NOTE = (
    "The final neural network is trained only on pre-risk shipment features. "
    "Tax-derived features and other variables used to construct the risk label "
    "are excluded from the neural network input to prevent target leakage."
)

ARCHITECTURES = [
    {
        "name": "baseline_64_32",
        "layers": [64, 32],
        "dropout": 0.2,
        "batch_normalization": False,
        "l2_regularization": 0.0,
        "positive_class_weight_multiplier": 1.0,
        "learning_rate": 0.001,
        "batch_size": 64,
        "epochs": 25,
    },
    {
        "name": "deeper_128_64_32",
        "layers": [128, 64, 32],
        "dropout": 0.3,
        "batch_normalization": False,
        "l2_regularization": 0.0,
        "positive_class_weight_multiplier": 1.0,
        "learning_rate": 0.0005,
        "batch_size": 128,
        "epochs": 30,
    },
    {
        "name": "regularized_128_64_32",
        "layers": [128, 64, 32],
        "dropout": 0.2,
        "batch_normalization": True,
        "l2_regularization": 0.0001,
        "positive_class_weight_multiplier": 0.9,
        "learning_rate": 0.0003,
        "batch_size": 128,
        "epochs": 35,
    },
    {
        "name": "regularized_256_128_32",
        "layers": [256, 128, 32],
        "dropout": 0.25,
        "batch_normalization": True,
        "l2_regularization": 0.0001,
        "positive_class_weight_multiplier": 0.9,
        "learning_rate": 0.0003,
        "batch_size": 128,
        "epochs": 35,
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
        model.add(
            keras.layers.Dense(
                units,
                activation="relu",
                kernel_regularizer=keras.regularizers.l2(
                    architecture["l2_regularization"]
                ),
            )
        )
        if architecture["batch_normalization"]:
            model.add(keras.layers.BatchNormalization())
        model.add(keras.layers.Dropout(architecture["dropout"]))

    model.add(keras.layers.Dense(1, activation="sigmoid"))
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=architecture["learning_rate"]),
        loss="binary_crossentropy",
        metrics=[
            "accuracy",
            keras.metrics.AUC(curve="PR", name="pr_auc"),
        ],
    )

    return model


def calculate_class_weights(y_train, positive_class_weight_multiplier=1.0):
    classes = np.sort(y_train.unique())
    weights = compute_class_weight(
        class_weight="balanced",
        classes=classes,
        y=y_train,
    )

    class_weights = {
        int(class_value): float(weight)
        for class_value, weight in zip(classes, weights)
    }
    class_weights[1] *= positive_class_weight_multiplier

    return class_weights


def select_f1_threshold(y_true, probabilities):
    precision, recall, thresholds = precision_recall_curve(y_true, probabilities)

    if thresholds.size == 0:
        return 0.5

    f1_scores = np.divide(
        2 * precision[:-1] * recall[:-1],
        precision[:-1] + recall[:-1],
        out=np.zeros_like(thresholds),
        where=(precision[:-1] + recall[:-1]) > 0,
    )
    best_index = int(np.argmax(f1_scores))

    return float(thresholds[best_index])


def train_architecture(architecture, X_train, y_train, X_valid, y_valid):
    keras.utils.set_random_seed(RANDOM_STATE)
    model = build_model(X_train.shape[1], architecture)
    class_weights = calculate_class_weights(
        y_train,
        architecture["positive_class_weight_multiplier"],
    )

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
        class_weight=class_weights,
        verbose=2,
    )

    probabilities = model.predict(X_valid, verbose=0).ravel()
    decision_threshold = select_f1_threshold(y_valid, probabilities)
    predictions = (probabilities >= decision_threshold).astype(int)

    metrics = {
        "name": architecture["name"],
        "selection_split": "validation",
        "layers": architecture["layers"],
        "dropout": architecture["dropout"],
        "batch_normalization": architecture["batch_normalization"],
        "l2_regularization": architecture["l2_regularization"],
        "positive_class_weight_multiplier": architecture[
            "positive_class_weight_multiplier"
        ],
        "learning_rate": architecture["learning_rate"],
        "batch_size": architecture["batch_size"],
        "epochs_requested": architecture["epochs"],
        "epochs_ran": len(history.history["loss"]),
        "class_weights": {
            str(class_value): round(weight, 4)
            for class_value, weight in class_weights.items()
        },
        "decision_threshold": round(decision_threshold, 6),
        "validation_loss": round(float(min(history.history["val_loss"])), 4),
        "validation_accuracy": round(float(accuracy_score(y_valid, predictions)), 4),
        "validation_precision": round(
            float(precision_score(y_valid, predictions, zero_division=0)), 4
        ),
        "validation_recall": round(
            float(recall_score(y_valid, predictions, zero_division=0)), 4
        ),
        "validation_f1_score": round(
            float(f1_score(y_valid, predictions, zero_division=0)), 4
        ),
        "validation_pr_auc": round(
            float(average_precision_score(y_valid, probabilities)), 4
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
    probabilities = model.predict(X_test, verbose=0).ravel()
    decision_threshold = architecture_metrics["decision_threshold"]
    predictions = (probabilities >= decision_threshold).astype(int)

    return {
        "name": architecture_metrics["name"],
        "evaluation_split": "held_out_test",
        "label_leakage_note": LABEL_LEAKAGE_NOTE,
        "features_used": FEATURE_COLUMNS,
        "layers": architecture_metrics["layers"],
        "dropout": architecture_metrics["dropout"],
        "batch_normalization": architecture_metrics["batch_normalization"],
        "l2_regularization": architecture_metrics["l2_regularization"],
        "positive_class_weight_multiplier": architecture_metrics[
            "positive_class_weight_multiplier"
        ],
        "learning_rate": architecture_metrics["learning_rate"],
        "batch_size": architecture_metrics["batch_size"],
        "epochs_requested": architecture_metrics["epochs_requested"],
        "epochs_ran": architecture_metrics["epochs_ran"],
        "class_weights": architecture_metrics["class_weights"],
        "decision_threshold": decision_threshold,
        "validation_f1_score_used_for_selection": architecture_metrics[
            "validation_f1_score"
        ],
        "validation_accuracy_used_for_selection": architecture_metrics[
            "validation_accuracy"
        ],
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "precision": round(
            float(precision_score(y_test, predictions, zero_division=0)), 4
        ),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "pr_auc": round(float(average_precision_score(y_test, probabilities)), 4),
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
        report_file.write(
            f"Decision threshold: {best_metrics['decision_threshold']}\n"
        )
        report_file.write(f"Class weights: {best_metrics['class_weights']}\n")
        report_file.write(
            f"Batch normalization: {best_metrics['batch_normalization']}\n"
        )
        report_file.write(
            f"L2 regularization: {best_metrics['l2_regularization']}\n"
        )
        report_file.write(f"Accuracy: {best_metrics['accuracy']}\n")
        report_file.write(f"Precision: {best_metrics['precision']}\n")
        report_file.write(f"Recall: {best_metrics['recall']}\n")
        report_file.write(f"F1 Score: {best_metrics['f1_score']}\n")
        report_file.write(f"PR AUC: {best_metrics['pr_auc']}\n")
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
    print(f"Precision: {final_metrics['precision']}")
    print(f"Recall: {final_metrics['recall']}")
    print(f"F1 Score: {final_metrics['f1_score']}")
    print(f"PR AUC: {final_metrics['pr_auc']}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Scaler saved to: {SCALER_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Tuning results saved to: {TUNING_PATH}")
    print(f"Report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()
