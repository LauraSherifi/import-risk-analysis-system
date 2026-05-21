from pathlib import Path

import numpy as np
import pandas as pd


ML_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ML_DIR / "data" / "processed"
CLEAN_DATA_PATH = PROCESSED_DIR / "shipping_data_clean.csv"
FEATURE_DATA_PATH = PROCESSED_DIR / "cleaned_dataset.csv"
RNG_SEED = 42
MIN_TAX_RATE = 0.05
MAX_TAX_RATE = 0.20


def load_clean_dataset():
    """Load the cleaned dataset created during data preparation."""
    if not CLEAN_DATA_PATH.exists():
        raise FileNotFoundError(f"Cleaned dataset not found at: {CLEAN_DATA_PATH}")

    return pd.read_csv(CLEAN_DATA_PATH)


def validate_required_columns(df):
    """Ensure the dataset contains the columns needed for feature engineering."""
    required_columns = {
        "price_usd",
        "weight_kg",
        "length_m",
        "width_m",
        "height_m",
    }
    missing_columns = required_columns.difference(df.columns)

    if missing_columns:
        raise ValueError(f"Missing required columns: {sorted(missing_columns)}")


def prepare_price_column(df):
    """Convert numeric inputs to safe non-negative values for feature creation."""
    df = df.copy()

    numeric_columns = [
        "price_usd",
        "weight_kg",
        "length_m",
        "width_m",
        "height_m",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")
        df[column] = df[column].fillna(0)
        df.loc[df[column] < 0, column] = 0

    return df


def safe_divide(numerator, denominator, default=0):
    """Divide arrays safely and replace invalid results with a default value."""
    result = np.divide(
        numerator,
        denominator,
        out=np.full(len(numerator), default, dtype=float),
        where=denominator > 0,
    )
    return result


def add_dimension_features(df):
    """Create derived size and density features from shipment dimensions."""
    df = df.copy()

    df["volume_m3"] = df["length_m"] * df["width_m"] * df["height_m"]
    df["max_dimension_m"] = df[["length_m", "width_m", "height_m"]].max(axis=1)
    df["dimension_sum_m"] = df["length_m"] + df["width_m"] + df["height_m"]
    df["density_kg_m3"] = safe_divide(df["weight_kg"], df["volume_m3"])

    derived_columns = ["volume_m3", "max_dimension_m", "dimension_sum_m", "density_kg_m3"]
    df[derived_columns] = df[derived_columns].round(4)

    return df


def add_value_features(df):
    """Add value concentration features using the available shipment fields."""
    df = df.copy()

    # The dataset does not contain a unit-count field, so we use value density proxies instead.
    df["value_per_kg"] = safe_divide(df["price_usd"], df["weight_kg"])
    df["value_per_m3"] = safe_divide(df["price_usd"], df["volume_m3"])

    df["value_per_kg"] = df["value_per_kg"].round(4)
    df["value_per_m3"] = df["value_per_m3"].round(4)

    return df


def add_tax_feature(df, seed=RNG_SEED):
    """Simulate a tax amount between 5% and 20% of the declared price."""
    df = df.copy()
    rng = np.random.default_rng(seed)
    tax_rates = rng.uniform(MIN_TAX_RATE, MAX_TAX_RATE, len(df))

    df["tax"] = np.where(df["price_usd"] > 0, df["price_usd"] * tax_rates, 0)
    df["tax"] = df["tax"].round(2)

    return df


def add_tax_ratio_feature(df):
    """Create a normalized tax ratio for easier comparison across transactions."""
    df = df.copy()
    df["tax_ratio"] = np.where(df["price_usd"] > 0, df["tax"] / df["price_usd"], 0)
    df["tax_ratio"] = df["tax_ratio"].round(4)

    return df


def add_risk_column(df):
    """Add a 'risk' column based on tax_ratio using a percentile-based approach."""
    df = df.copy()

    # Calculate percentiles for tax_ratio
    low_risk_threshold = df['tax_ratio'].quantile(0.15)  # Lowest 15% are HIGH RISK

    # Apply new risk labeling logic
    df['risk'] = df['tax_ratio'].apply(
        lambda x: 'HIGH RISK' if x < low_risk_threshold else 'LOW RISK'
    )

    return df


def save_feature_dataset(df):
    """Save the feature-engineered dataset for later model training."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(FEATURE_DATA_PATH, index=False)


def main():
    df = load_clean_dataset()
    validate_required_columns(df)
    df = prepare_price_column(df)
    df = add_dimension_features(df)
    df = add_value_features(df)
    df = add_tax_feature(df)
    df = add_tax_ratio_feature(df)
    df = add_risk_column(df)
    save_feature_dataset(df)

    print("Feature engineering completed successfully.")
    print(f"Feature dataset saved to: {FEATURE_DATA_PATH}")
    print("\nNew columns added:")
    print(
        df[
            [
                "price_usd",
                "weight_kg",
                "volume_m3",
                "density_kg_m3",
                "value_per_kg",
                "value_per_m3",
                "tax",
                "tax_ratio",
                "risk",
            ]
        ].head()
    )


if __name__ == "__main__":
    main()
