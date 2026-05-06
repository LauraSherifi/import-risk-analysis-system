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
    required_columns = {"price_usd"}
    missing_columns = required_columns.difference(df.columns)

    if missing_columns:
        raise ValueError(f"Missing required columns: {sorted(missing_columns)}")


def prepare_price_column(df):
    """Convert price values to numeric and handle invalid entries safely."""
    df = df.copy()
    df["price_usd"] = pd.to_numeric(df["price_usd"], errors="coerce")
    df["price_usd"] = df["price_usd"].fillna(0)
    df.loc[df["price_usd"] < 0, "price_usd"] = 0

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
    """Add a 'risk' column based on tax_ratio."""
    df["risk"] = df["tax_ratio"].apply(lambda x: "HIGH RISK" if x > 0.5 else "LOW RISK")
    return df


def save_feature_dataset(df):
    """Save the feature-engineered dataset for later model training."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(FEATURE_DATA_PATH, index=False)


def main():
    df = load_clean_dataset()
    validate_required_columns(df)
    df = prepare_price_column(df)
    df = add_tax_feature(df)
    df = add_tax_ratio_feature(df)
    df = add_risk_column(df)
    save_feature_dataset(df)

    print("Feature engineering completed successfully.")
    print(f"Feature dataset saved to: {FEATURE_DATA_PATH}")
    print("\nNew columns added:")
    print(df[["price_usd", "tax", "tax_ratio", "risk"]].head())


if __name__ == "__main__":
    main()
    # Load the cleaned dataset
    cleaned_df = pd.read_csv(CLEAN_DATA_PATH)

    # Display the first 5 rows
    print(cleaned_df.head())
