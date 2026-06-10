from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


ML_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ML_DIR / "data" / "processed" / "cleaned_dataset.csv"
MODELS_DIR = ML_DIR / "models"

MODEL_PATH = MODELS_DIR / "import_risk_knn.joblib"
METRICS_PATH = MODELS_DIR / "knn_metrics.json"
REPORT_PATH = MODELS_DIR / "knn_report.txt"

RANDOM_STATE = 42
MAX_ROWS_FOR_KNN = 60000

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
    "value_per_kg",
    "value_per_m3",
    "tax",
    "tax_ratio",
]

TARGET_COLUMN = "risk"


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


def sample_dataset_for_knn(df):
    if len(df) <= MAX_ROWS_FOR_KNN:
        return df.copy()

    sample_df, _ = train_test_split(
        df,
        train_size=MAX_ROWS_FOR_KNN,
        stratify=df[TARGET_COLUMN],
        random_state=RANDOM_STATE,
    )

    return sample_df.copy()


def prepare_train_test_data(df):
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    return train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )


def build_knn_model():
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "knn",
                KNeighborsClassifier(
                    n_neighbors=5,
                    weights="distance",
                    metric="minkowski",
                    n_jobs=1,
                ),
            ),
        ]
    )


def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)

    labels = ["LOW RISK", "HIGH RISK"]

    report_dict = classification_report(
        y_test,
        y_pred,
        labels=labels,
        output_dict=True,
        zero_division=0,
    )

    report_text = classification_report(
        y_test,
        y_pred,
        labels=labels,
        zero_division=0,
    )

    matrix = confusion_matrix(y_test, y_pred, labels=labels)

    metrics = {
        "model": "KNN",
        "features_used": FEATURE_COLUMNS,
        "rows_used": int(len(X_test) / 0.2),
        "test_rows": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_test, y_pred, average="macro")), 4),
        "weighted_f1": round(float(f1_score(y_test, y_pred, average="weighted")), 4),
        "classification_report": report_dict,
        "confusion_matrix": {
            "labels": labels,
            "matrix": matrix.tolist(),
        },
    }

    return metrics, report_text


def save_outputs(model, metrics, report_text):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    with open(MODEL_PATH, "wb") as model_file:
        joblib.dump(model, model_file)

    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=4)

    with open(REPORT_PATH, "w", encoding="utf-8") as file:
        file.write("KNN MODEL EVALUATION REPORT\n")
        file.write("=" * 50)
        file.write("\n\n")
        file.write(report_text)
        file.write("\n\n")
        file.write(f"Accuracy: {metrics['accuracy']}\n")
        file.write(f"Macro F1: {metrics['macro_f1']}\n")
        file.write(f"Weighted F1: {metrics['weighted_f1']}\n")
        file.write(f"Rows used: {metrics['rows_used']}\n")
        file.write(f"Test rows: {metrics['test_rows']}\n")


def main():
    df = load_dataset()
    validate_dataset(df)

    df = sample_dataset_for_knn(df)

    X_train, X_test, y_train, y_test = prepare_train_test_data(df)

    model = build_knn_model()
    model.fit(X_train, y_train)

    metrics, report_text = evaluate_model(model, X_test, y_test)

    save_outputs(model, metrics, report_text)

    print("KNN model training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Report saved to: {REPORT_PATH}")
    print(f"Accuracy: {metrics['accuracy']}")
    print(f"Macro F1: {metrics['macro_f1']}")
    print(f"Weighted F1: {metrics['weighted_f1']}")


if __name__ == "__main__":
    main()
