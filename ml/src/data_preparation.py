from pathlib import Path
import pandas as pd


ML_DIR = Path(__file__).resolve().parents[1]

RAW_DATA_PATH = ML_DIR / "data" / "raw" / "shipping_data.csv"
PROCESSED_DIR = ML_DIR / "data" / "processed"
CLEAN_DATA_PATH = PROCESSED_DIR / "shipping_data_clean.csv"
CLEANING_REPORT_PATH = PROCESSED_DIR / "cleaning_report.txt"


COLUMN_RENAME_MAP = {
    "name": "product_name",
    "price ($)": "price_usd",
    "weight (kg)": "weight_kg",
    "length (m)": "length_m",
    "width (m)": "width_m",
    "height (m)": "height_m",
    "shipment date": "shipment_date",
    "destination port": "destination_port",
}

REQUIRED_RAW_COLUMNS = set(COLUMN_RENAME_MAP.keys())
REQUIRED_CLEAN_COLUMNS = set(COLUMN_RENAME_MAP.values())

NUMERIC_COLUMNS = [
    "price_usd",
    "weight_kg",
    "length_m",
    "width_m",
    "height_m",
]

TEXT_COLUMNS = [
    "product_name",
    "destination_port",
]


def load_raw_dataset():
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {RAW_DATA_PATH}")

    df = pd.read_csv(RAW_DATA_PATH)
    df.columns = df.columns.str.strip()
    return df


def validate_raw_columns(df):
    missing_columns = REQUIRED_RAW_COLUMNS.difference(df.columns)

    if missing_columns:
        raise ValueError(f"Missing required raw columns: {sorted(missing_columns)}")


def validate_clean_columns(df):
    missing_columns = REQUIRED_CLEAN_COLUMNS.difference(df.columns)

    if missing_columns:
        raise ValueError(f"Missing required clean columns: {sorted(missing_columns)}")


def rename_columns(df):
    df = df.copy()
    return df.rename(columns=COLUMN_RENAME_MAP)


def clean_text_columns(df):
    df = df.copy()

    for col in TEXT_COLUMNS:
        df[col] = df[col].astype("string").str.strip()
        df[col] = df[col].replace(
            {
                "": pd.NA,
                "nan": pd.NA,
                "None": pd.NA,
                "NULL": pd.NA,
                "null": pd.NA,
            }
        )
        df[col] = df[col].fillna("Unknown")

    return df


def convert_data_types(df):
    df = df.copy()

    for col in NUMERIC_COLUMNS:
        df[col] = (
            df[col]
            .astype("string")
            .str.replace(",", "", regex=False)
            .str.replace("$", "", regex=False)
        )
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["shipment_date"] = pd.to_datetime(df["shipment_date"], errors="coerce")

    return df


def count_invalid_numeric_values(df):
    invalid_counts = {}

    for col in NUMERIC_COLUMNS:
        invalid_counts[col] = int((df[col] <= 0).sum())

    return pd.Series(invalid_counts)


def replace_invalid_numeric_values(df):
    df = df.copy()

    for col in NUMERIC_COLUMNS:
        df.loc[df[col] <= 0, col] = pd.NA

    return df


def fill_numeric_missing_values(df):
    df = df.copy()

    for col in NUMERIC_COLUMNS:
        product_median = df.groupby("product_name")[col].transform("median")
        df[col] = df[col].fillna(product_median)
        df[col] = df[col].fillna(df[col].median())

    return df


def fill_date_missing_values(df):
    df = df.copy()

    if df["shipment_date"].notna().any():
        median_date = df["shipment_date"].median()
        df["shipment_date"] = df["shipment_date"].fillna(median_date)
    else:
        df["shipment_date"] = df["shipment_date"].fillna(pd.Timestamp("2000-01-01"))

    return df


def round_numeric_columns(df):
    df = df.copy()

    rounding_rules = {
        "price_usd": 2,
        "weight_kg": 3,
        "length_m": 3,
        "width_m": 3,
        "height_m": 3,
    }

    for col, decimals in rounding_rules.items():
        df[col] = df[col].round(decimals)

    return df


def save_cleaned_dataset(df):
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(CLEAN_DATA_PATH, index=False)


def save_cleaning_report(
    original_shape,
    final_shape,
    missing_before,
    missing_after,
    invalid_numeric_before,
    duplicate_rows_removed,
):
    report = f"""
DATA CLEANING REPORT
==================================================

Original dataset shape:
{original_shape}

Cleaned dataset shape:
{final_shape}

Missing values before cleaning:
{missing_before.to_string()}

Missing values after cleaning:
{missing_after.to_string()}

Invalid numeric values before cleaning:
{invalid_numeric_before.to_string()}

Duplicate rows removed:
{duplicate_rows_removed}

Cleaning steps applied:
- Validated required raw columns
- Renamed columns to ML-friendly names
- Cleaned text columns
- Converted numeric columns
- Converted shipment_date to datetime
- Removed duplicate rows
- Treated zero and negative numeric values as invalid
- Filled missing numeric values using product-level median first
- Used global median as fallback
- Filled missing shipment dates using median shipment date
- Saved cleaned dataset for feature engineering

Output files:
Cleaned dataset: {CLEAN_DATA_PATH}
Cleaning report: {CLEANING_REPORT_PATH}
"""

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    with open(CLEANING_REPORT_PATH, "w", encoding="utf-8") as file:
        file.write(report.strip())


def main():
    df = load_raw_dataset()

    original_shape = df.shape
    validate_raw_columns(df)

    missing_before = df.isna().sum()

    df = rename_columns(df)
    validate_clean_columns(df)

    df = clean_text_columns(df)
    df = convert_data_types(df)

    invalid_numeric_before = count_invalid_numeric_values(df)

    before_duplicates = len(df)
    df = df.drop_duplicates()
    duplicate_rows_removed = before_duplicates - len(df)

    df = replace_invalid_numeric_values(df)
    df = fill_numeric_missing_values(df)
    df = fill_date_missing_values(df)
    df = round_numeric_columns(df)

    missing_after = df.isna().sum()
    final_shape = df.shape

    save_cleaned_dataset(df)
    save_cleaning_report(
        original_shape=original_shape,
        final_shape=final_shape,
        missing_before=missing_before,
        missing_after=missing_after,
        invalid_numeric_before=invalid_numeric_before,
        duplicate_rows_removed=duplicate_rows_removed,
    )

    print("Data preparation completed successfully.")
    print(f"Cleaned dataset saved to: {CLEAN_DATA_PATH}")
    print(f"Cleaning report saved to: {CLEANING_REPORT_PATH}")
    print(f"Final dataset shape: {final_shape}")


if __name__ == "__main__":
    main()