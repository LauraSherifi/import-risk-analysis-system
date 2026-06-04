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
DEFAULT_EXPECTED_TAX_RATE = 0.12

EXPECTED_TAX_RATE_RULES = [
    {
        "category": "electronics",
        "keywords": [
            "camera",
            "charger",
            "headphone",
            "speaker",
            "television",
            "phone",
            "laptop",
            "tablet",
            "monitor",
        ],
        "rate": 0.18,
    },
    {
        "category": "appliances",
        "keywords": [
            "coffee maker",
            "microwave",
            "vacuum",
            "leaf blower",
            "lawn mower",
            "hedge trimmer",
        ],
        "rate": 0.16,
    },
    {
        "category": "footwear_apparel",
        "keywords": ["shoe", "boots", "clothing", "shirt", "jacket", "gloves"],
        "rate": 0.14,
    },
    {
        "category": "furniture",
        "keywords": ["bed", "sofa", "armchair", "bookshelf", "chair", "table"],
        "rate": 0.13,
    },
    {
        "category": "outdoor_sports",
        "keywords": [
            "bicycle",
            "tent",
            "sleeping bag",
            "backpack",
            "yoga",
            "resistance bands",
        ],
        "rate": 0.11,
    },
    {
        "category": "food_beverage",
        "keywords": ["coffee", "beans", "tea", "food"],
        "rate": 0.08,
    },
    {
        "category": "books_media",
        "keywords": ["book", "guitar", "piano"],
        "rate": 0.07,
    },
    {
        "category": "shipping_supplies",
        "keywords": ["box", "tube", "envelope", "pallet", "pallete"],
        "rate": 0.05,
    },
    {
        "category": "building_materials",
        "keywords": ["cement", "tile", "steel", "wood", "lumber"],
        "rate": 0.10,
    },
]

FINAL_REQUIRED_COLUMNS = [
    "product_name",
    "price_usd",
    "weight_kg",
    "length_m",
    "width_m",
    "height_m",
    "shipment_date",
    "destination_port",
    "volume_m3",
    "max_dimension_m",
    "dimension_sum_m",
    "density_kg_m3",
    "value_per_kg",
    "value_per_m3",
    "tax",
    "tax_ratio",
    "tax_category",
    "expected_tax_rate",
    "expected_tax",
    "tax_gap",
    "tax_paid_share",
    "risk",
]


def load_clean_dataset():
    if not CLEAN_DATA_PATH.exists():
        raise FileNotFoundError(f"Cleaned dataset not found at: {CLEAN_DATA_PATH}")

    return pd.read_csv(CLEAN_DATA_PATH)


def validate_required_columns(df):
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
    result = np.divide(
        numerator,
        denominator,
        out=np.full(len(numerator), default, dtype=float),
        where=denominator > 0,
    )

    return result


def add_dimension_features(df):
    df = df.copy()

    df["volume_m3"] = df["length_m"] * df["width_m"] * df["height_m"]
    df["max_dimension_m"] = df[["length_m", "width_m", "height_m"]].max(axis=1)
    df["dimension_sum_m"] = df["length_m"] + df["width_m"] + df["height_m"]
    df["density_kg_m3"] = safe_divide(df["weight_kg"], df["volume_m3"])

    derived_columns = [
        "volume_m3",
        "max_dimension_m",
        "dimension_sum_m",
        "density_kg_m3",
    ]

    df[derived_columns] = df[derived_columns].round(4)

    return df


def add_value_features(df):
    df = df.copy()

    df["value_per_kg"] = safe_divide(df["price_usd"], df["weight_kg"])
    df["value_per_m3"] = safe_divide(df["price_usd"], df["volume_m3"])

    df["value_per_kg"] = df["value_per_kg"].round(4)
    df["value_per_m3"] = df["value_per_m3"].round(4)

    return df


def add_tax_feature(df, seed=RNG_SEED):
    df = df.copy()

    rng = np.random.default_rng(seed)
    tax_rates = rng.uniform(MIN_TAX_RATE, MAX_TAX_RATE, len(df))

    df["tax"] = np.where(df["price_usd"] > 0, df["price_usd"] * tax_rates, 0)
    df["tax"] = df["tax"].round(2)

    return df


def add_tax_ratio_feature(df):
    df = df.copy()

    df["tax_ratio"] = np.where(df["price_usd"] > 0, df["tax"] / df["price_usd"], 0)
    df["tax_ratio"] = df["tax_ratio"].round(4)

    return df


def classify_tax_category(product_name):
    product_text = str(product_name).lower()

    for rule in EXPECTED_TAX_RATE_RULES:
        if any(keyword in product_text for keyword in rule["keywords"]):
            return rule["category"]

    return "general_goods"


def lookup_expected_tax_rate(tax_category):
    for rule in EXPECTED_TAX_RATE_RULES:
        if rule["category"] == tax_category:
            return rule["rate"]

    return DEFAULT_EXPECTED_TAX_RATE


def add_expected_tax_features(df):
    df = df.copy()

    df["tax_category"] = df["product_name"].apply(classify_tax_category)
    df["expected_tax_rate"] = df["tax_category"].apply(lookup_expected_tax_rate)
    df["expected_tax"] = df["price_usd"] * df["expected_tax_rate"]
    df["tax_gap"] = df["expected_tax"] - df["tax"]
    df["tax_paid_share"] = safe_divide(df["tax"], df["expected_tax"], default=0)

    df["expected_tax_rate"] = df["expected_tax_rate"].round(4)
    df["expected_tax"] = df["expected_tax"].round(2)
    df["tax_gap"] = df["tax_gap"].round(2)
    df["tax_paid_share"] = df["tax_paid_share"].round(4)

    return df


def add_risk_column(df):
    df = df.copy()

    low_risk_threshold = df["tax_ratio"].quantile(0.15)

    df["risk"] = df["tax_ratio"].apply(
        lambda value: "HIGH RISK" if value < low_risk_threshold else "LOW RISK"
    )

    return df


def validate_final_dataset(df):
    missing_columns = set(FINAL_REQUIRED_COLUMNS).difference(df.columns)

    if missing_columns:
        raise ValueError(f"Missing final dataset columns: {sorted(missing_columns)}")

    total_missing_values = int(df[FINAL_REQUIRED_COLUMNS].isna().sum().sum())

    if total_missing_values > 0:
        raise ValueError(f"Final dataset contains {total_missing_values} missing values.")

    duplicate_rows = int(df.duplicated().sum())

    if duplicate_rows > 0:
        raise ValueError(f"Final dataset contains {duplicate_rows} duplicate rows.")

    numeric_df = df.select_dtypes(include=[np.number])
    infinite_values = int(np.isinf(numeric_df.to_numpy()).sum())

    if infinite_values > 0:
        raise ValueError(f"Final dataset contains {infinite_values} infinite values.")

    allowed_risk_values = {"HIGH RISK", "LOW RISK"}
    invalid_risk_values = set(df["risk"].dropna().unique()).difference(allowed_risk_values)

    if invalid_risk_values:
        raise ValueError(f"Invalid risk values found: {sorted(invalid_risk_values)}")

    return {
        "rows": df.shape[0],
        "columns": df.shape[1],
        "missing_values": total_missing_values,
        "duplicate_rows": duplicate_rows,
        "infinite_values": infinite_values,
    }


def save_feature_dataset(df):
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
    df = add_expected_tax_features(df)
    df = add_risk_column(df)

    validation_summary = validate_final_dataset(df)

    save_feature_dataset(df)

    print("Feature engineering completed successfully.")
    print(f"Feature dataset saved to: {FEATURE_DATA_PATH}")
    print("\nFinal dataset validation:")
    print(validation_summary)
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
                "tax_category",
                "expected_tax_rate",
                "expected_tax",
                "tax_gap",
                "tax_paid_share",
                "risk",
            ]
        ].head()
    )


if __name__ == "__main__":
    main()
