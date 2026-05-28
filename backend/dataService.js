const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");

const DATASET_PATH = path.join(
  PROJECT_ROOT,
  "ml",
  "data",
  "processed",
  "cleaned_dataset.csv"
);

const MODELS_DIR = path.join(PROJECT_ROOT, "ml", "models");

let datasetCache = null;
let datasetSummaryCache = null;

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, ""));
}

function loadDataset() {
  if (datasetCache) {
    return datasetCache;
  }

  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset not found at: ${DATASET_PATH}`);
  }

  const csvText = fs.readFileSync(DATASET_PATH, "utf-8").trim();
  const lines = csvText.split(/\r?\n/);
  const columns = parseCsvLine(lines[0]);

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    columns.forEach((column, index) => {
      row[column] = values[index] ?? "";
    });

    return row;
  });

  datasetCache = { columns, rows };
  return datasetCache;
}

function readJsonFile(fileName) {
  const filePath = path.join(MODELS_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readTextFile(fileName) {
  const filePath = path.join(MODELS_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isMissing(value) {
  if (value == null) return true;

  const normalized = String(value).trim().toLowerCase();

  return (
    normalized === "" ||
    normalized === "na" ||
    normalized === "nan" ||
    normalized === "null" ||
    normalized === "none" ||
    normalized === "undefined"
  );
}

function countBy(rows, column) {
  const counts = {};

  rows.forEach((row) => {
    const key = row[column] || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

function average(rows, column) {
  if (!rows.length) return 0;

  const total = rows.reduce((sum, row) => sum + toNumber(row[column]), 0);
  return total / rows.length;
}

function buildRiskDistribution(rows) {
  const total = rows.length;
  const counts = countBy(rows, "risk");

  return Object.entries(counts).map(([label, value]) => ({
    label,
    value,
    percentage: total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0,
  }));
}

function buildMissingValues(columns, rows) {
  const byColumn = {};

  columns.forEach((column) => {
    byColumn[column] = rows.filter((row) => isMissing(row[column])).length;
  });

  const total = Object.values(byColumn).reduce((sum, value) => sum + value, 0);

  return {
    total,
    by_column: byColumn,
  };
}

function buildDuplicateRows(rows) {
  const seen = new Set();
  let duplicates = 0;

  rows.forEach((row) => {
    const key = JSON.stringify(row);

    if (seen.has(key)) {
      duplicates += 1;
    } else {
      seen.add(key);
    }
  });

  return duplicates;
}

function buildTopItems(rows, column, labelName, limit = 8) {
  return Object.entries(countBy(rows, column))
    .map(([label, count]) => ({
      [labelName]: label,
      count,
      percentage: Number(((count / rows.length) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildMonthlyTrend(rows) {
  const counts = {};

  rows.forEach((row) => {
    const month = String(row.shipment_date || "").slice(0, 7);

    if (month) {
      counts[month] = (counts[month] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function buildSampleRows(rows, limit = 10) {
  return rows.slice(0, limit).map((row) => ({
    product_name: row.product_name,
    price_usd: toNumber(row.price_usd),
    weight_kg: toNumber(row.weight_kg),
    volume_m3: toNumber(row.volume_m3),
    tax: toNumber(row.tax),
    tax_ratio: toNumber(row.tax_ratio),
    destination_port: row.destination_port,
    shipment_date: row.shipment_date,
    risk: row.risk,
  }));
}

function buildFeatureImpact(rows) {
  const highRiskRows = rows.filter((row) => row.risk === "HIGH RISK");
  const lowRiskRows = rows.filter((row) => row.risk === "LOW RISK");

  const features = [
    "tax_ratio",
    "tax",
    "value_per_kg",
    "value_per_m3",
    "density_kg_m3",
    "volume_m3",
    "weight_kg",
  ];

  return features.map((feature) => {
    const highRiskAverage = average(highRiskRows, feature);
    const lowRiskAverage = average(lowRiskRows, feature);
    const totalAverage = average(rows, feature) || 1;
    const impact = Math.abs(highRiskAverage - lowRiskAverage) / totalAverage;

    return {
      feature,
      high_risk_average: Number(highRiskAverage.toFixed(4)),
      low_risk_average: Number(lowRiskAverage.toFixed(4)),
      impact_score: Number(Math.min(impact * 100, 100).toFixed(1)),
    };
  });
}

function buildNumericSummary(rows) {
  return {
    price_usd: Number(average(rows, "price_usd").toFixed(2)),
    weight_kg: Number(average(rows, "weight_kg").toFixed(2)),
    volume_m3: Number(average(rows, "volume_m3").toFixed(4)),
    tax: Number(average(rows, "tax").toFixed(2)),
    tax_ratio: Number(average(rows, "tax_ratio").toFixed(4)),
    density_kg_m3: Number(average(rows, "density_kg_m3").toFixed(2)),
  };
}

function buildDatasetSummary() {
  if (datasetSummaryCache) {
    return datasetSummaryCache;
  }

  const { columns, rows } = loadDataset();

  const missingValues = buildMissingValues(columns, rows);
  const duplicateRows = buildDuplicateRows(rows);
  const riskDistribution = buildRiskDistribution(rows);

  datasetSummaryCache = {
    total_records: rows.length,
    total_columns: columns.length,
    columns,
    missing_values: missingValues,
    duplicate_rows: duplicateRows,
    risk_distribution: riskDistribution,
    numeric_summary: buildNumericSummary(rows),
    top_ports: buildTopItems(rows, "destination_port", "port", 8),
    top_products: buildTopItems(rows, "product_name", "product", 8),
    monthly_trend: buildMonthlyTrend(rows),
    sample_rows: buildSampleRows(rows, 12),
    feature_impact: buildFeatureImpact(rows),
    feature_groups: [
      "Original shipment attributes",
      "Dimension-based features",
      "Value-density features",
      "Tax simulation features",
      "Simulated risk label",
    ],
    data_quality: {
      missing_values: missingValues.total,
      duplicate_rows: duplicateRows,
      validation_status:
        missingValues.total === 0 && duplicateRows === 0 ? "Passed" : "Needs review",
    },
  };

  return datasetSummaryCache;
}

function buildDashboardSummary() {
  const dataset = buildDatasetSummary();

  const knnDemo = readJsonFile("knn_demo_metrics.json");
  const knnCheck = readJsonFile("knn_check_metrics.json");
  const knnLatest = readJsonFile("knn_metrics.json");
  const logisticRegression = readJsonFile("logistic_regression_metrics.json");

  const highRiskShare =
    dataset.risk_distribution.find((item) => item.label === "HIGH RISK")
      ?.percentage ?? 0;

  const lowRiskShare =
    dataset.risk_distribution.find((item) => item.label === "LOW RISK")
      ?.percentage ?? 0;

  return {
    overview: {
      total_records: dataset.total_records,
      total_columns: dataset.total_columns,
      missing_values: dataset.missing_values.total,
      duplicate_rows: dataset.duplicate_rows,
      high_risk_share: highRiskShare,
      low_risk_share: lowRiskShare,
    },
    overview_cards: [
      {
        label: "Total Records",
        value: dataset.total_records.toLocaleString(),
        note: "Final cleaned shipment records",
      },
      {
        label: "Completed Models",
        value: "2",
        note: "KNN and Logistic Regression",
      },
      {
        label: "High Risk Share",
        value: `${highRiskShare}%`,
        note: "Simulated risk label",
      },
      {
        label: "Model-ready Features",
        value: "13",
        note: "After feature engineering",
      },
    ],
    risk_distribution: dataset.risk_distribution,
    numeric_summary: dataset.numeric_summary,
    top_ports: dataset.top_ports,
    top_products: dataset.top_products,
    monthly_trend: dataset.monthly_trend,
    sample_rows: dataset.sample_rows.slice(0, 5),
    feature_impact: dataset.feature_impact,
    data_quality: dataset.data_quality,
    models: {
      knn_demo: knnDemo,
      knn_check: knnCheck,
      knn_latest: knnLatest,
      logistic_regression: logisticRegression,
    },
  };
}

function buildKnnModelData() {
  return {
    demo: readJsonFile("knn_demo_metrics.json"),
    check: readJsonFile("knn_check_metrics.json"),
    latest: readJsonFile("knn_metrics.json"),
    comparison_report: readTextFile("knn_comparison_report.txt"),
  };
}

function buildLogisticRegressionData() {
  return {
    metrics: readJsonFile("logistic_regression_metrics.json"),
    report: readTextFile("logistic_regression_report.txt"),
    features_used: [
      "price_usd",
      "weight_kg",
      "volume_m3",
      "max_dimension_m",
      "dimension_sum_m",
      "density_kg_m3",
      "value_per_kg",
      "value_per_m3",
    ],
  };
}

function buildDebugPaths() {
  return {
    project_root: PROJECT_ROOT,
    dataset_path: DATASET_PATH,
    dataset_exists: fs.existsSync(DATASET_PATH),
    models_dir: MODELS_DIR,
    models_dir_exists: fs.existsSync(MODELS_DIR),
    model_files: fs.existsSync(MODELS_DIR) ? fs.readdirSync(MODELS_DIR) : [],
  };
}

module.exports = {
  buildDashboardSummary,
  buildDatasetSummary,
  buildSampleRows,
  buildKnnModelData,
  buildLogisticRegressionData,
  buildDebugPaths,
  loadDataset,
};