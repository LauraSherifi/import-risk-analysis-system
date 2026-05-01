from pathlib import Path
import pandas as pd


ML_DIR = Path(__file__).resolve().parents[1]

RAW_DATA_PATH = ML_DIR / "data" / "raw" / "shipping_data.csv"
PROCESSED_DIR = ML_DIR / "data" / "processed"
CLEAN_DATA_PATH = PROCESSED_DIR / "shipping_data_clean.csv"


def load_raw_dataset():
    """Load the raw shipment dataset."""
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {RAW_DATA_PATH}")

    return pd.read_csv(RAW_DATA_PATH)


def rename_columns(df):
    """Rename columns to clean and consistent names for Python/ML processing."""
    return df.rename(
        columns={
            "name": "product_name",
            "price ($)": "price_usd",
            "weight (kg)": "weight_kg",
            "length (m)": "length_m",
            "width (m)": "width_m",
            "height (m)": "height_m",
            "shipment date": "shipment_date",
            "destination port": "destination_port",
        }
    )


def convert_data_types(df):
    """Convert columns to suitable data types."""
    numeric_columns = [
        "price_usd",
        "weight_kg",
        "length_m",
        "width_m",
        "height_m",
    ]

    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["shipment_date"] = pd.to_datetime(df["shipment_date"], errors="coerce")

    return df


def handle_missing_values(df):
    """Handle missing values without adding extra flag columns."""
    df = df.copy()

    for col in ["weight_kg", "length_m"]:
        df[col] = df[col].fillna(df.groupby("product_name")[col].transform("median"))
        df[col] = df[col].fillna(df[col].median())

    median_shipment_date = df["shipment_date"].median()
    df["shipment_date"] = df["shipment_date"].fillna(median_shipment_date)

    df["destination_port"] = df["destination_port"].fillna("Unknown")

    return df


def save_cleaned_dataset(df):
    """Save the cleaned dataset."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(CLEAN_DATA_PATH, index=False)


def main():
    df = load_raw_dataset()

    print("Raw dataset loaded successfully.")
    print(f"Original dataset shape: {df.shape}")

    print("\nMissing values before cleaning:")
    print(df.isna().sum())

    df = rename_columns(df)
    df = convert_data_types(df)
    df = df.drop_duplicates()
    df = handle_missing_values(df)

    print("\nMissing values after cleaning:")
    print(df.isna().sum())

    save_cleaned_dataset(df)

    print("\nData preparation completed successfully.")
    print(f"Cleaned dataset saved to: {CLEAN_DATA_PATH}")
    print(f"Final dataset shape: {df.shape}")


if __name__ == "__main__":
    main()