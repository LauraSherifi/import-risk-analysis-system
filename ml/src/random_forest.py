from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split


ML_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ML_DIR / "data" / "processed" / "cleaned_dataset.csv"
MODELS_DIR = ML_DIR / "models"

MODEL_PATH = MODELS_DIR / "import_risk_random_forest.joblib"
METRICS_PATH = MODELS_DIR / "random_forest_metrics.json"
REPORT_PATH = MODELS_DIR / "random_forest_report.txt"

RANDOM_STATE = 42
TRAINING_SAMPLE_SIZE = 60000

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


def load_dataset():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")

    return pd.read_csv(DATA_PATH)


def limit_dataset_size(df, max_rows):
    if len(df) <= max_rows:
        return df.reset_index(drop=True)

    sampled_df, _ = train_test_split(
        df,
        train_size=max_rows,
        random_state=RANDOM_STATE,
        stratify=df["risk"],
    )

    return sampled_df.reset_index(drop=True)


def validate_training_columns(df):
    required_columns = set(FEATURE_COLUMNS + ["risk"])
    missing_columns = sorted(required_columns.difference(df.columns))

    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")


def prepare_training_data(df):
    X = df[FEATURE_COLUMNS].copy()
    y = df["risk"].map({"HIGH RISK": 1, "LOW RISK": 0})

    if y.isna().any():
        raise ValueError("Risk column contains invalid values.")

    return X, y


def build_random_forest_model():
    return RandomForestClassifier(
        n_estimators=80,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=1,
    )


def evaluate_baseline(X_train, y_train, X_test, y_test):
    baseline_model = DummyClassifier(strategy="most_frequent")
    baseline_model.fit(X_train, y_train)
    baseline_predictions = baseline_model.predict(X_test)

    return round(accuracy_score(y_test, baseline_predictions), 4)


def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)

    return {
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


def build_feature_importance(model):
    return sorted(
        [
            {
                "feature": feature,
                "importance": round(float(importance), 6),
            }
            for feature, importance in zip(FEATURE_COLUMNS, model.feature_importances_)
        ],
        key=lambda item: item["importance"],
        reverse=True,
    )


def save_outputs(model, metrics):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_PATH)

    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    with REPORT_PATH.open("w", encoding="utf-8") as report_file:
        report_file.write("Random Forest Evaluation\n")
        report_file.write(f"Features: {', '.join(FEATURE_COLUMNS)}\n\n")
        report_file.write(f"Accuracy: {metrics['accuracy']}\n")
        report_file.write(f"Baseline Accuracy: {metrics['baseline_accuracy']}\n")
        report_file.write(f"Precision: {metrics['precision']}\n")
        report_file.write(f"Recall: {metrics['recall']}\n")
        report_file.write(f"F1 Score: {metrics['f1_score']}\n")
        report_file.write(f"Rows Used: {metrics['rows_used']}\n")
        report_file.write(f"Test Rows: {metrics['test_rows']}\n")
        report_file.write(f"Confusion Matrix: {metrics['confusion_matrix']}\n\n")

        report_file.write("Feature Importance:\n")
        for item in metrics["feature_importance"]:
            report_file.write(f"- {item['feature']}: {item['importance']}\n")

        report_file.write("\nClassification Report:\n")
        report_file.write(metrics["classification_report"])


def main():
    df = load_dataset()
    df = limit_dataset_size(df, TRAINING_SAMPLE_SIZE)

    print(f"Using {len(df):,} rows for Random Forest training.")

    validate_training_columns(df)
    X, y = prepare_training_data(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    model = build_random_forest_model()

    print("Training Random Forest with full feature set...")
    model.fit(X_train, y_train)

    metrics = evaluate_model(model, X_test, y_test)
    metrics["baseline_accuracy"] = evaluate_baseline(X_train, y_train, X_test, y_test)
    metrics["feature_importance"] = build_feature_importance(model)
    metrics["features_used"] = FEATURE_COLUMNS
    metrics["rows_used"] = len(X)
    metrics["test_rows"] = len(X_test)
    metrics["model"] = "Random Forest"

    save_outputs(model, metrics)

    print("\nRandom Forest training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Report saved to: {REPORT_PATH}")

    print("\nEvaluation summary:")
    print(f"Accuracy: {metrics['accuracy']}")
    print(f"Baseline Accuracy: {metrics['baseline_accuracy']}")
    print(f"Precision: {metrics['precision']}")
    print(f"Recall: {metrics['recall']}")
    print(f"F1 Score: {metrics['f1_score']}")
    print(f"Confusion Matrix: {metrics['confusion_matrix']}")

    print("\nTop Feature Importance:")
    for item in metrics["feature_importance"][:8]:
        print(f"{item['feature']}: {item['importance']}")


if __name__ == "__main__":
    main()
