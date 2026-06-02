from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC


ML_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ML_DIR / "data" / "processed" / "cleaned_dataset.csv"
MODELS_DIR = ML_DIR / "models"

MODEL_PATH = MODELS_DIR / "import_risk_svm.joblib"
METRICS_PATH = MODELS_DIR / "svm_metrics.json"
REPORT_PATH = MODELS_DIR / "svm_report.txt"

RANDOM_STATE = 42
MAX_ROWS_FOR_SVM = 80000

FEATURE_COLUMNS = [
    "price_usd",
    "weight_kg",
    "volume_m3",
    "max_dimension_m",
    "dimension_sum_m",
    "density_kg_m3",
    "value_per_kg",
    "value_per_m3",
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


def sample_dataset_for_svm(df):
    if len(df) <= MAX_ROWS_FOR_SVM:
        return df.copy()

    sample_df, _ = train_test_split(
        df,
        train_size=MAX_ROWS_FOR_SVM,
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


def build_svm_model():
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                LinearSVC(
                    C=1.0,
                    class_weight="balanced",
                    dual=False,
                    max_iter=5000,
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def tune_svm(X_train, y_train):
    parameter_grid = {
        "classifier__C": [0.01, 0.1, 1.0, 10.0],
        "classifier__class_weight": [None, "balanced"],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    search = GridSearchCV(
        estimator=build_svm_model(),
        param_grid=parameter_grid,
        scoring="f1",
        cv=cv,
        n_jobs=1,
    )
    search.fit(X_train, y_train)

    return search


def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    labels = ["LOW RISK", "HIGH RISK"]

    metrics = {
        "model": "SVM",
        "features_used": FEATURE_COLUMNS,
        "rows_used": int(len(X_test) / 0.2),
        "test_rows": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "confusion_matrix": {
            "labels": labels,
            "matrix": confusion_matrix(y_test, y_pred, labels=labels).tolist(),
        },
        "classification_report": classification_report(
            y_test,
            y_pred,
            labels=labels,
            output_dict=True,
            zero_division=0,
        ),
    }

    report_text = classification_report(
        y_test,
        y_pred,
        labels=labels,
        zero_division=0,
    )

    return metrics, report_text


def save_outputs(model, metrics, report_text):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    with REPORT_PATH.open("w", encoding="utf-8") as report_file:
        report_file.write("SVM MODEL EVALUATION REPORT\n")
        report_file.write("=" * 50)
        report_file.write("\n\n")
        report_file.write(report_text)
        report_file.write("\n\n")
        report_file.write(f"Accuracy: {metrics['accuracy']}\n")
        report_file.write(f"Precision: {metrics['precision']}\n")
        report_file.write(f"Recall: {metrics['recall']}\n")
        report_file.write(f"F1 Score: {metrics['f1_score']}\n")
        report_file.write(f"Rows used: {metrics['rows_used']}\n")
        report_file.write(f"Test rows: {metrics['test_rows']}\n")
        report_file.write(f"Best params: {metrics.get('best_params', {})}\n")


def main():
    df = load_dataset()
    validate_dataset(df)

    df = sample_dataset_for_svm(df)
    X_train, X_test, y_train, y_test = prepare_train_test_data(df)

    search = tune_svm(X_train, y_train)
    model = search.best_estimator_

    metrics, report_text = evaluate_model(model, X_test, y_test)
    metrics["best_params"] = search.best_params_
    save_outputs(model, metrics, report_text)

    print("SVM model training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Report saved to: {REPORT_PATH}")
    print(f"Accuracy: {metrics['accuracy']}")
    print(f"Precision: {metrics['precision']}")
    print(f"Recall: {metrics['recall']}")
    print(f"F1 Score: {metrics['f1_score']}")
    print(f"Best Params: {metrics['best_params']}")


if __name__ == "__main__":
    main()
