from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    normalized_mutual_info_score,
    silhouette_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


ML_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ML_DIR / "data" / "processed" / "cleaned_dataset.csv"
MODELS_DIR = ML_DIR / "models"

MODEL_PATH = MODELS_DIR / "import_risk_kmeans.joblib"
METRICS_PATH = MODELS_DIR / "kmeans_metrics.json"
REPORT_PATH = MODELS_DIR / "kmeans_report.txt"

RANDOM_STATE = 42
K_CANDIDATES = range(2, 9)
SILHOUETTE_SAMPLE_SIZE = 10000

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

TARGET_COLUMN = "risk"
TARGET_MAPPING = {"LOW RISK": 0, "HIGH RISK": 1}


def load_dataset():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATA_PATH}")

    return pd.read_csv(DATA_PATH)


def validate_dataset(df):
    required_columns = set(FEATURE_COLUMNS + [TARGET_COLUMN])
    missing_columns = sorted(required_columns.difference(df.columns))

    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")

    selected_data = df[FEATURE_COLUMNS + [TARGET_COLUMN]]
    if selected_data.isna().sum().sum() > 0:
        raise ValueError("Dataset contains missing values.")

    if np.isinf(df[FEATURE_COLUMNS].to_numpy()).any():
        raise ValueError("Dataset contains infinite feature values.")

    invalid_targets = set(df[TARGET_COLUMN].unique()).difference(TARGET_MAPPING)
    if invalid_targets:
        raise ValueError(f"Invalid risk values found: {sorted(invalid_targets)}")


def select_cluster_count(X_scaled):
    results = []
    best_k = None
    best_score = float("-inf")
    sample_size = min(SILHOUETTE_SAMPLE_SIZE, len(X_scaled))

    for cluster_count in K_CANDIDATES:
        model = KMeans(
            n_clusters=cluster_count,
            n_init=10,
            random_state=RANDOM_STATE,
        )
        labels = model.fit_predict(X_scaled)
        score = silhouette_score(
            X_scaled,
            labels,
            sample_size=sample_size,
            random_state=RANDOM_STATE,
        )
        results.append(
            {
                "clusters": cluster_count,
                "silhouette_score": round(float(score), 4),
                "inertia": round(float(model.inertia_), 2),
            }
        )

        if score > best_score:
            best_k = cluster_count
            best_score = score

    return best_k, results


def build_model(cluster_count):
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "kmeans",
                KMeans(
                    n_clusters=cluster_count,
                    n_init=20,
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def build_cluster_profiles(df, labels):
    profile_data = df[FEATURE_COLUMNS + [TARGET_COLUMN]].copy()
    profile_data["cluster"] = labels
    profiles = []

    for cluster_id, cluster_df in profile_data.groupby("cluster", sort=True):
        risk_counts = cluster_df[TARGET_COLUMN].value_counts()
        feature_means = cluster_df[FEATURE_COLUMNS].mean()
        profiles.append(
            {
                "cluster": int(cluster_id),
                "rows": int(len(cluster_df)),
                "dataset_share": round(float(len(cluster_df) / len(profile_data)), 4),
                "high_risk_rows": int(risk_counts.get("HIGH RISK", 0)),
                "high_risk_rate": round(
                    float(risk_counts.get("HIGH RISK", 0) / len(cluster_df)), 4
                ),
                "feature_means": {
                    feature: round(float(feature_means[feature]), 4)
                    for feature in FEATURE_COLUMNS
                },
            }
        )

    return profiles


def map_clusters_to_risk(labels, risk_values):
    mapped_predictions = np.zeros(len(labels), dtype=int)
    cluster_mapping = {}

    for cluster_id in np.unique(labels):
        cluster_mask = labels == cluster_id
        majority_label = int(np.bincount(risk_values[cluster_mask]).argmax())
        mapped_predictions[cluster_mask] = majority_label
        cluster_mapping[str(int(cluster_id))] = (
            "HIGH RISK" if majority_label == 1 else "LOW RISK"
        )

    return mapped_predictions, cluster_mapping


def evaluate_model(model, df, k_results):
    X = df[FEATURE_COLUMNS]
    labels = model.predict(X)
    X_scaled = model.named_steps["scaler"].transform(X)
    y = df[TARGET_COLUMN].map(TARGET_MAPPING).to_numpy()
    sample_size = min(SILHOUETTE_SAMPLE_SIZE, len(X_scaled))
    mapped_predictions, cluster_mapping = map_clusters_to_risk(labels, y)
    majority_class_accuracy = float(np.max(np.bincount(y)) / len(y))
    mapped_accuracy = float(np.mean(mapped_predictions == y))

    return {
        "model": "K-Means",
        "learning_type": "unsupervised clustering",
        "rows_used": int(len(df)),
        "features_used": FEATURE_COLUMNS,
        "selected_clusters": int(model.named_steps["kmeans"].n_clusters),
        "cluster_selection": k_results,
        "silhouette_score": round(
            float(
                silhouette_score(
                    X_scaled,
                    labels,
                    sample_size=sample_size,
                    random_state=RANDOM_STATE,
                )
            ),
            4,
        ),
        "calinski_harabasz_score": round(
            float(calinski_harabasz_score(X_scaled, labels)), 2
        ),
        "inertia": round(float(model.named_steps["kmeans"].inertia_), 2),
        "adjusted_rand_index_vs_risk": round(
            float(adjusted_rand_score(y, labels)), 4
        ),
        "normalized_mutual_info_vs_risk": round(
            float(normalized_mutual_info_score(y, labels)), 4
        ),
        "majority_mapped_accuracy_vs_risk": round(mapped_accuracy, 4),
        "majority_class_baseline_accuracy": round(majority_class_accuracy, 4),
        "accuracy_improvement_over_baseline": round(
            mapped_accuracy - majority_class_accuracy, 4
        ),
        "cluster_to_risk_mapping": cluster_mapping,
        "cluster_profiles": build_cluster_profiles(df, labels),
        "interpretation_note": (
            "Risk labels were not used to train K-Means. Comparisons with risk are "
            "post-training diagnostics only and should not be treated as supervised "
            "classification performance."
        ),
    }


def save_outputs(model, metrics):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    with METRICS_PATH.open("w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    with REPORT_PATH.open("w", encoding="utf-8") as report_file:
        report_file.write("K-MEANS CLUSTERING REPORT\n")
        report_file.write("=" * 50)
        report_file.write("\n\n")
        report_file.write(f"Rows used: {metrics['rows_used']}\n")
        report_file.write(f"Selected clusters: {metrics['selected_clusters']}\n")
        report_file.write(f"Silhouette score: {metrics['silhouette_score']}\n")
        report_file.write(
            f"Calinski-Harabasz score: {metrics['calinski_harabasz_score']}\n"
        )
        report_file.write(f"Inertia: {metrics['inertia']}\n")
        report_file.write(
            "Adjusted Rand index vs risk: "
            f"{metrics['adjusted_rand_index_vs_risk']}\n"
        )
        report_file.write(
            "Normalized mutual information vs risk: "
            f"{metrics['normalized_mutual_info_vs_risk']}\n"
        )
        report_file.write(
            "Majority-mapped accuracy vs risk: "
            f"{metrics['majority_mapped_accuracy_vs_risk']}\n\n"
        )
        report_file.write(
            "Majority-class baseline accuracy: "
            f"{metrics['majority_class_baseline_accuracy']}\n"
        )
        report_file.write(
            "Accuracy improvement over baseline: "
            f"{metrics['accuracy_improvement_over_baseline']}\n\n"
        )
        report_file.write("Cluster selection:\n")
        for result in metrics["cluster_selection"]:
            report_file.write(
                f"- k={result['clusters']}: silhouette="
                f"{result['silhouette_score']}, inertia={result['inertia']}\n"
            )

        report_file.write("\nCluster profiles:\n")
        for profile in metrics["cluster_profiles"]:
            report_file.write(
                f"- Cluster {profile['cluster']}: rows={profile['rows']}, "
                f"share={profile['dataset_share']}, "
                f"high-risk rate={profile['high_risk_rate']}\n"
            )

        report_file.write(f"\nNote: {metrics['interpretation_note']}\n")


def main():
    df = load_dataset()
    validate_dataset(df)
    X = df[FEATURE_COLUMNS]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    selected_clusters, k_results = select_cluster_count(X_scaled)

    model = build_model(selected_clusters)
    model.fit(X)
    metrics = evaluate_model(model, df, k_results)
    save_outputs(model, metrics)

    print("K-Means training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Report saved to: {REPORT_PATH}")
    print(f"Selected clusters: {metrics['selected_clusters']}")
    print(f"Silhouette score: {metrics['silhouette_score']}")
    print(
        "Majority-mapped accuracy vs risk: "
        f"{metrics['majority_mapped_accuracy_vs_risk']}"
    )


if __name__ == "__main__":
    main()
