from pathlib import Path
import json
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
)
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_score,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from svm_threshold import ThresholdedClassifier


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
    "length_m",
    "width_m",
    "height_m",
    "volume_m3",
    "max_dimension_m",
    "dimension_sum_m",
    "density_kg_m3",
    "value_per_kg",
    "value_per_m3",
]

MODEL_NOTE = (
    "The final SVM is trained on pre-risk shipment features only. "
    "Tax-derived shortcuts were removed to avoid label leakage."
)

TARGET_COLUMN = "risk"
TARGET_MAPPING = {"LOW RISK": 0, "HIGH RISK": 1}
TARGET_NAMES = ["LOW RISK", "HIGH RISK"]


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

    allowed_targets = set(TARGET_MAPPING.keys())
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
    y = df[TARGET_COLUMN].map(TARGET_MAPPING)

    if y.isna().any():
        invalid_targets = sorted(df.loc[y.isna(), TARGET_COLUMN].unique())
        raise ValueError(f"Unexpected target values after mapping: {invalid_targets}")

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
                    C=0.1,
                    class_weight="balanced",
                    dual=False,
                    max_iter=10000,
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


def find_best_threshold(model, X_validation, y_validation):
    scores = model.decision_function(X_validation)
    precision, recall, thresholds = precision_recall_curve(y_validation, scores)

    if len(thresholds) == 0:
        return 0.0, {
            "validation_precision": 0.0,
            "validation_recall": 0.0,
            "validation_f1": 0.0,
        }

    f1_scores = np.divide(
        2 * precision[1:] * recall[1:],
        precision[1:] + recall[1:],
        out=np.zeros_like(precision[1:], dtype=float),
        where=(precision[1:] + recall[1:]) != 0,
    )
    best_index = int(np.argmax(f1_scores))
    best_threshold = float(thresholds[best_index])

    return best_threshold, {
        "validation_precision": round(float(precision[best_index + 1]), 4),
        "validation_recall": round(float(recall[best_index + 1]), 4),
        "validation_f1": round(float(f1_scores[best_index]), 4),
    }


def evaluate_baseline(X_train, y_train, X_test, y_test):
    baseline_model = DummyClassifier(strategy="most_frequent")
    baseline_model.fit(X_train, y_train)
    baseline_predictions = baseline_model.predict(X_test)

    return round(float(accuracy_score(y_test, baseline_predictions)), 4)


def cross_validate_model(X, y):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    model = build_svm_model()
    scores = cross_val_score(model, X, y, cv=cv, scoring="f1", n_jobs=1)

    return {
        "cv_f1_mean": round(float(scores.mean()), 4),
        "cv_f1_std": round(float(scores.std()), 4),
    }


def evaluate_model(model, X_test, y_test, total_rows):
    y_pred = model.predict(X_test)

    metrics = {
        "model": "SVM",
        "features_used": FEATURE_COLUMNS,
        "rows_used": int(total_rows),
        "test_rows": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "confusion_matrix": {
            "labels": TARGET_NAMES,
            "matrix": confusion_matrix(y_test, y_pred, labels=[0, 1]).tolist(),
        },
        "classification_report": classification_report(
            y_test,
            y_pred,
            labels=[0, 1],
            target_names=TARGET_NAMES,
            output_dict=True,
            zero_division=0,
        ),
    }

    report_text = classification_report(
        y_test,
        y_pred,
        labels=[0, 1],
        target_names=TARGET_NAMES,
        zero_division=0,
    )

    return metrics, report_text


def save_outputs(model, metrics, report_text):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    metrics["model_note"] = MODEL_NOTE

    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    with REPORT_PATH.open("w", encoding="utf-8") as report_file:
        report_file.write("SVM MODEL EVALUATION REPORT\n")
        report_file.write("=" * 50)
        report_file.write("\n\n")
        report_file.write(report_text)
        report_file.write("\n\n")
        report_file.write(f"Accuracy: {metrics['accuracy']}\n")
        report_file.write(f"Baseline Accuracy: {metrics['baseline_accuracy']}\n")
        report_file.write(f"Decision Threshold: {metrics['decision_threshold']}\n")
        report_file.write(f"Precision: {metrics['precision']}\n")
        report_file.write(f"Recall: {metrics['recall']}\n")
        report_file.write(f"F1 Score: {metrics['f1_score']}\n")
        report_file.write(f"Validation Precision: {metrics['validation_precision']}\n")
        report_file.write(f"Validation Recall: {metrics['validation_recall']}\n")
        report_file.write(f"Validation F1: {metrics['validation_f1']}\n")
        report_file.write(f"CV F1 Mean: {metrics['cv_f1_mean']}\n")
        report_file.write(f"CV F1 Std: {metrics['cv_f1_std']}\n")
        report_file.write(f"Rows used: {metrics['rows_used']}\n")
        report_file.write(f"Test rows: {metrics['test_rows']}\n")
        report_file.write(f"Best params: {metrics.get('best_params', {})}\n")
        report_file.write(f"Note: {metrics['model_note']}\n")


def main():
    df = load_dataset()
    validate_dataset(df)

    df = sample_dataset_for_svm(df)
    X_train, X_test, y_train, y_test = prepare_train_test_data(df)
    X_fit, X_validation, y_fit, y_validation = train_test_split(
        X_train,
        y_train,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y_train,
    )

    search = tune_svm(X_fit, y_fit)
    best_pipeline = search.best_estimator_
    best_threshold, threshold_metrics = find_best_threshold(
        best_pipeline,
        X_validation,
        y_validation,
    )

    best_pipeline.fit(X_train, y_train)
    model = ThresholdedClassifier(pipeline=best_pipeline, threshold=best_threshold)

    metrics, report_text = evaluate_model(model, X_test, y_test, len(df))
    metrics["baseline_accuracy"] = evaluate_baseline(X_train, y_train, X_test, y_test)
    metrics.update(cross_validate_model(df[FEATURE_COLUMNS], df[TARGET_COLUMN].map(TARGET_MAPPING)))
    metrics["decision_threshold"] = round(float(best_threshold), 6)
    metrics.update(threshold_metrics)
    metrics["best_params"] = search.best_params_
    save_outputs(model, metrics, report_text)

    print("SVM model training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Report saved to: {REPORT_PATH}")
    print(f"Accuracy: {metrics['accuracy']}")
    print(f"Baseline Accuracy: {metrics['baseline_accuracy']}")
    print(f"Decision Threshold: {metrics['decision_threshold']}")
    print(f"Precision: {metrics['precision']}")
    print(f"Recall: {metrics['recall']}")
    print(f"F1 Score: {metrics['f1_score']}")
    print(f"Validation Precision: {metrics['validation_precision']}")
    print(f"Validation Recall: {metrics['validation_recall']}")
    print(f"Validation F1: {metrics['validation_f1']}")
    print(f"CV F1 Mean: {metrics['cv_f1_mean']}")
    print(f"CV F1 Std: {metrics['cv_f1_std']}")
    print(f"Best Params: {metrics['best_params']}")


if __name__ == "__main__":
    main()
