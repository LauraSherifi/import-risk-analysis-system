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
let predictionLabContextCache = null;

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

function round(value, digits = 4) {
  return Number(toNumber(value).toFixed(digits));
}

function createSampleId(productName, index) {
  const slug = String(productName || `shipment-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "shipment"}-${index + 1}`;
}

function normalizePredictionSample(row, index) {
  return {
    id: createSampleId(row.product_name, index),
    productName: row.product_name || `Shipment ${index + 1}`,
    destinationPort: row.destination_port || "Unknown",
    priceUsd: round(row.price_usd, 2),
    weightKg: round(row.weight_kg, 3),
    volumeM3: round(row.volume_m3, 4),
    taxUsd: round(row.tax, 2),
    taxRatio: round(row.tax_ratio, 4),
    taxCategory: row.tax_category || "general_goods",
    expectedTaxRate: round(row.expected_tax_rate, 4),
    expectedTax: round(row.expected_tax, 2),
    taxGap: round(row.tax_gap, 2),
    taxPaidShare: round(row.tax_paid_share, 4),
    risk: row.risk || "LOW RISK",
  };
}

function getQuantile(numbers, quantile) {
  if (!numbers.length) {
    return 0;
  }

  const sorted = [...numbers].sort((left, right) => left - right);
  const position = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];
  const weight = position - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * weight;
}

function selectSamples(samples, count, predicate, sorter, usedIds) {
  const available = samples
    .filter((sample) => !usedIds.has(sample.id))
    .filter((sample) => (typeof predicate === "function" ? predicate(sample) : true))
    .sort(sorter);

  const selected = available.slice(0, count);
  selected.forEach((sample) => usedIds.add(sample.id));

  return selected;
}

function buildSampleCollections(samples, quartiles) {
  const usedIds = new Set();
  const byTaxRatioAsc = (left, right) => left.taxRatio - right.taxRatio;
  const byTaxRatioDesc = (left, right) => right.taxRatio - left.taxRatio;
  const byMedianDistance = (left, right) =>
    Math.abs(left.taxRatio - quartiles.median) - Math.abs(right.taxRatio - quartiles.median) ||
    right.priceUsd - left.priceUsd;

  const featuredSamples = [
    ...selectSamples(
      samples,
      2,
      (sample) => sample.risk === "LOW RISK" && sample.taxRatio >= quartiles.median,
      byMedianDistance,
      usedIds
    ),
    ...selectSamples(
      samples,
      2,
      (sample) => sample.risk === "HIGH RISK",
      byTaxRatioAsc,
      usedIds
    ),
  ];

  while (featuredSamples.length < 4) {
    featuredSamples.push(
      ...selectSamples(samples, 1, () => true, byMedianDistance, usedIds)
    );
  }

  const comparisonSamples = [
    ...selectSamples(
      samples,
      2,
      (sample) => sample.risk === "HIGH RISK",
      byTaxRatioAsc,
      usedIds
    ),
    ...selectSamples(
      samples,
      2,
      (sample) => sample.risk === "LOW RISK",
      byTaxRatioDesc,
      usedIds
    ),
  ];

  while (comparisonSamples.length < 4) {
    comparisonSamples.push(
      ...selectSamples(samples, 1, () => true, byTaxRatioAsc, usedIds)
    );
  }

  const labSamples = [
    ...selectSamples(
      samples,
      7,
      (sample) => sample.risk === "HIGH RISK",
      byTaxRatioAsc,
      usedIds
    ),
    ...selectSamples(
      samples,
      7,
      (sample) => sample.risk === "LOW RISK",
      byMedianDistance,
      usedIds
    ),
  ];

  while (labSamples.length < 14) {
    labSamples.push(
      ...selectSamples(samples, 1, () => true, byMedianDistance, usedIds)
    );
  }

  return {
    featuredSamples,
    comparisonSamples,
    labSamples,
  };
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
    tax_category: row.tax_category,
    expected_tax_rate: toNumber(row.expected_tax_rate),
    expected_tax: toNumber(row.expected_tax),
    tax_gap: toNumber(row.tax_gap),
    tax_paid_share: toNumber(row.tax_paid_share),
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
    "tax_paid_share",
    "tax_gap",
    "expected_tax",
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
    expected_tax_rate: Number(average(rows, "expected_tax_rate").toFixed(4)),
    expected_tax: Number(average(rows, "expected_tax").toFixed(2)),
    tax_gap: Number(average(rows, "tax_gap").toFixed(2)),
    tax_paid_share: Number(average(rows, "tax_paid_share").toFixed(4)),
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

  const decisionTree = readJsonFile("decision_tree_metrics.json");
  const neuralNetwork = readJsonFile("neural_network_metrics.json");
  const svm = readJsonFile("svm_metrics.json");
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
        value: "3",
        note: "Decision Tree, Neural Network, and SVM",
      },
      {
        label: "High Risk Share",
        value: `${highRiskShare}%`,
        note: "Simulated risk label",
      },
      {
        label: "Model-ready Features",
        value: "17",
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
      decision_tree: decisionTree,
      neural_network: neuralNetwork,
      svm,
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

function buildRandomForestData() {
  const metrics = readJsonFile("random_forest_metrics.json");

  return {
    metrics,
    report: readTextFile("random_forest_report.txt"),
    features_used: metrics?.features_used ?? [
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
    ],
  };
}

function buildNeuralNetworkData() {
  const metrics = readJsonFile("neural_network_metrics.json");

  return {
    metrics,
    report: readTextFile("neural_network_report.txt"),
    tuning_results: readJsonFile("neural_network_tuning_results.json"),
    features_used: metrics?.features_used ?? [
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
      "tax",
      "tax_ratio",
    ],
  };
}

function buildSvmModelData() {
  const metrics = readJsonFile("svm_metrics.json");

  return {
    metrics,
    report: readTextFile("svm_report.txt"),
    features_used: metrics?.features_used ?? [
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

function buildDecisionTreeData() {
  const metrics = readJsonFile("decision_tree_metrics.json");

  return {
    metrics,
    report: readTextFile("decision_tree_report.txt"),
    features_used: metrics?.features_used ?? [
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
    ],
  };
}

function buildModelComparisonMetrics() {
  const decisionTreeMetrics = readJsonFile("decision_tree_metrics.json") || {};
  const neuralNetworkMetrics = readJsonFile("neural_network_metrics.json") || {};
  const svmMetrics = readJsonFile("svm_metrics.json") || {};

  const decisionTreeAccuracy = round((decisionTreeMetrics.accuracy ?? 0) * 100, 2);
  const neuralNetworkAccuracy = round((neuralNetworkMetrics.accuracy ?? 0) * 100, 2);
  const svmAccuracy = round((svmMetrics.accuracy ?? 0) * 100, 2);

  const decisionTreeF1 = round((decisionTreeMetrics.f1_score ?? 0) * 100, 2);
  const neuralNetworkF1 = round((neuralNetworkMetrics.f1_score ?? 0) * 100, 2);
  const svmF1 = round((svmMetrics.f1_score ?? 0) * 100, 2);

  const decisionTreePrecision = round((decisionTreeMetrics.precision ?? 0) * 100, 2);
  const neuralNetworkPrecision = round(
    (neuralNetworkMetrics.classification_report?.["HIGH RISK"]?.precision ?? 0) * 100,
    2
  );
  const svmPrecision = round((svmMetrics.precision ?? 0) * 100, 2);

  const decisionTreeRecall = round((decisionTreeMetrics.recall ?? 0) * 100, 2);
  const neuralNetworkRecall = round(
    (neuralNetworkMetrics.classification_report?.["HIGH RISK"]?.recall ?? 0) * 100,
    2
  );
  const svmRecall = round((svmMetrics.recall ?? 0) * 100, 2);

  return [
    {
      id: "accuracy",
      title: "Accuracy",
      decisionTree: decisionTreeAccuracy,
      neuralNetwork: neuralNetworkAccuracy,
      svm: svmAccuracy,
      description:
        "Accuracy compares how often each saved model correctly classifies shipment records across the evaluation split.",
      recommendation:
        decisionTreeAccuracy >= neuralNetworkAccuracy && decisionTreeAccuracy >= svmAccuracy
          ? "Decision Tree currently leads on overall correctness, so it is the strongest reference point."
          : neuralNetworkAccuracy >= svmAccuracy
            ? "Neural Network currently leads on overall correctness, so it deserves the spotlight."
            : "SVM currently leads on overall correctness, so it should be highlighted more.",
    },
    {
      id: "f1",
      title: "F1 Score",
      decisionTree: decisionTreeF1,
      neuralNetwork: neuralNetworkF1,
      svm: svmF1,
      description:
        "F1 Score balances precision and recall so high-risk detection is not judged by accuracy alone.",
      recommendation:
        decisionTreeF1 >= neuralNetworkF1 && decisionTreeF1 >= svmF1
          ? "Decision Tree has the strongest balance here, which makes it easy to explain."
          : neuralNetworkF1 >= svmF1
            ? "Neural Network has the strongest balance here, so its behavior should be highlighted more clearly."
            : "SVM has the strongest balance here, which makes it a useful risk-focused reference.",
    },
    {
      id: "precision",
      title: "Precision",
      decisionTree: decisionTreePrecision,
      neuralNetwork: neuralNetworkPrecision,
      svm: svmPrecision,
      description:
        "Precision shows how trustworthy a HIGH RISK prediction is once the model raises an alert.",
      recommendation:
        decisionTreePrecision >= neuralNetworkPrecision && decisionTreePrecision >= svmPrecision
          ? "Decision Tree produces the cleanest risk flags here."
          : neuralNetworkPrecision >= svmPrecision
            ? "Neural Network produces the cleanest risk flags here."
            : "SVM produces the cleanest risk flags here.",
    },
    {
      id: "recall",
      title: "Recall",
      decisionTree: decisionTreeRecall,
      neuralNetwork: neuralNetworkRecall,
      svm: svmRecall,
      description:
        "Recall measures how many of the truly risky shipments the model manages to catch.",
      recommendation:
        decisionTreeRecall >= neuralNetworkRecall && decisionTreeRecall >= svmRecall
          ? "Decision Tree recovers the most risky shipments here."
          : neuralNetworkRecall >= svmRecall
            ? "Neural Network recovers the most risky shipments here."
            : "SVM recovers the most risky shipments here, which matters when missing risk is costly.",
    },
  ];
}

function buildPredictionLabContext() {
  if (predictionLabContextCache) {
    return predictionLabContextCache;
  }

  const dataset = buildDatasetSummary();
  const { rows } = loadDataset();
  const normalizedSamples = rows.map(normalizePredictionSample);
  const taxRatios = normalizedSamples
    .map((sample) => sample.taxRatio)
    .filter((value) => Number.isFinite(value));

  const quartiles = {
    low: round(getQuantile(taxRatios, 0.25), 4),
    median: round(getQuantile(taxRatios, 0.5), 4),
    high: round(getQuantile(taxRatios, 0.75), 4),
  };

  const sampleCollections = buildSampleCollections(normalizedSamples, quartiles);
  const svmMetrics = readJsonFile("svm_metrics.json") || {};

  predictionLabContextCache = {
    totalShipments: dataset.total_records,
    lowRiskCount:
      dataset.risk_distribution.find((item) => item.label === "LOW RISK")?.value ?? 0,
    highRiskCount:
      dataset.risk_distribution.find((item) => item.label === "HIGH RISK")?.value ?? 0,
    lowRiskShare:
      dataset.risk_distribution.find((item) => item.label === "LOW RISK")?.percentage ?? 0,
    highRiskShare:
      dataset.risk_distribution.find((item) => item.label === "HIGH RISK")?.percentage ?? 0,
    averageTaxRatio: round(dataset.numeric_summary.tax_ratio, 4),
    averagePriceUsd: round(dataset.numeric_summary.price_usd, 2),
    averageWeightKg: round(dataset.numeric_summary.weight_kg, 2),
    averageTaxUsd: round(dataset.numeric_summary.tax, 2),
    taxRatioQuartiles: quartiles,
    model: {
      name: svmMetrics.model || "SVM Classifier",
      accuracy: round((svmMetrics.accuracy ?? 0) * 100, 2),
      macroF1: round((svmMetrics.f1_score ?? 0) * 100, 2),
      rowsUsed: Number(svmMetrics.rows_used ?? 0),
      testRows: Number(svmMetrics.test_rows ?? 0),
    },
    topPorts: dataset.top_ports.map((item) => ({
      name: item.port,
      shipmentCount: item.count,
    })),
    featuredSamples: sampleCollections.featuredSamples,
    comparisonSamples: sampleCollections.comparisonSamples,
    labSamples: sampleCollections.labSamples,
  };

  return predictionLabContextCache;
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
  buildRandomForestData,
  buildDecisionTreeData,
  buildNeuralNetworkData,
  buildSvmModelData,
  buildModelComparisonMetrics,
  buildPredictionLabContext,
  buildDebugPaths,
  loadDataset,
};
