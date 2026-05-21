from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "processed" / "cleaned_dataset.csv"
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "import_risk_logistic_regression.joblib"
METRICS_PATH = MODELS_DIR / "logistic_regression_metrics.json"
REPORT_PATH = MODELS_DIR / "logistic_regression_report.txt"
RANDOM_STATE = 42

FEATURE_COLUMNS = [
    "price_usd",
    "weight_kg",
    "volume_m3",
    "max_dimension_m",
    "dimension_sum_m",
    "density_kg_m3",
    "value_per_kg",
    "value_per_m3",
    "tax",
    "tax_ratio",
]


def load_dataset():
    """Load the processed dataset used for model training."""
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Error: Dataset not found at {DATA_PATH}.")

    return pd.read_csv(DATA_PATH)


def validate_training_columns(df):
    """Ensure all selected model features exist before training."""
    required_columns = set(FEATURE_COLUMNS + ["risk"])
    missing_columns = sorted(required_columns.difference(df.columns))

    if missing_columns:
        raise ValueError(f"Missing required columns for training: {missing_columns}")


def prepare_training_data(df):
    """Build feature and target matrices for supervised learning."""
    X = df[FEATURE_COLUMNS].copy()
    y = df["risk"].map({"HIGH RISK": 1, "LOW RISK": 0})

    return X, y


def build_logistic_regression_pipeline():
    """Create a scaled Logistic Regression pipeline for risk classification."""
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def evaluate_model(model, X_test, y_test):
    """Return a metrics summary for the trained model."""
    y_pred = model.predict(X_test)

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred), 4),
        "recall": round(recall_score(y_test, y_pred), 4),
        "f1_score": round(f1_score(y_test, y_pred), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(
            y_test,
            y_pred,
            target_names=["LOW RISK", "HIGH RISK"],
        ),
    }

    return metrics


def save_outputs(model, metrics):
    """Persist the trained model and its evaluation artifacts."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    with REPORT_PATH.open("w", encoding="utf-8") as report_file:
        report_file.write("Logistic Regression Evaluation\n")
        report_file.write(f"Features: {', '.join(FEATURE_COLUMNS)}\n\n")
        report_file.write(f"Accuracy: {metrics['accuracy']}\n")
        report_file.write(f"Precision: {metrics['precision']}\n")
        report_file.write(f"Recall: {metrics['recall']}\n")
        report_file.write(f"F1 Score: {metrics['f1_score']}\n")
        report_file.write(f"Confusion Matrix: {metrics['confusion_matrix']}\n\n")
        report_file.write("Classification Report:\n")
        report_file.write(metrics["classification_report"])


def main():
    df = load_dataset()
    validate_training_columns(df)
    X, y = prepare_training_data(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    model = build_logistic_regression_pipeline()
    model.fit(X_train, y_train)

    metrics = evaluate_model(model, X_test, y_test)
    save_outputs(model, metrics)

    print("Logistic Regression training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Detailed report saved to: {REPORT_PATH}")
    print("\nEvaluation summary:")
    print(f"Accuracy: {metrics['accuracy']}")
    print(f"Precision: {metrics['precision']}")
    print(f"Recall: {metrics['recall']}")
    print(f"F1 Score: {metrics['f1_score']}")
    print(f"Confusion Matrix: {metrics['confusion_matrix']}")
    print("\nClassification Report:")
    print(metrics["classification_report"])


if __name__ == "__main__":
    main()
