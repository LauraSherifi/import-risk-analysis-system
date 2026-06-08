const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const {
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
} = require("./dataService");
const {
  generateAssistantReply,
  getAssistantConfiguration,
} = require("./assistantService");

const app = express();
const PORT = process.env.PORT || 8000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8001";
const RISK_MAP_DATA_PATH = path.resolve(
  __dirname,
  "..",
  "ml",
  "data",
  "processed",
  "cleaned_dataset.csv"
);
const MAX_HISTORY_ITEMS = 100;
const AUTH_SECRET = process.env.AUTH_SECRET || "change-this-secret";
const ADMIN_ID = process.env.ADMIN_ID || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;
const predictionHistory = [];
let nextHistoryId = 1;

const PORT_COORDINATES = {
  "Port of Busan (South Korea)": {
    country: "South Korea",
    position: [35.104, 129.04],
  },
  "Port of Tianjin (China)": {
    country: "China",
    position: [38.9846, 117.7334],
  },
  "Port of Tokyo (Japan)": {
    country: "Japan",
    position: [35.6167, 139.7667],
  },
  "Port of Singapore (Singapore)": {
    country: "Singapore",
    position: [1.2644, 103.8222],
  },
  "Port of Shanghai (China)": {
    country: "China",
    position: [31.2304, 121.4737],
  },
};

app.use(express.json());

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

function createAuthToken(adminId) {
  const payload = {
    adminId,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

function verifyAuthToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload));
    if (!payload?.adminId || !payload?.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice("Bearer ".length);
}

function requireAuth(request, response, next) {
  const payload = verifyAuthToken(getBearerToken(request));
  if (!payload) {
    return response.status(401).json({
      error: "Authentication required",
    });
  }

  request.auth = payload;
  next();
}

function parseNonNegativeNumber(value, fieldName) {
  if (value == null || value === "") {
    return {
      ok: false,
      error: `Missing required field: ${fieldName}`,
    };
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return {
      ok: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (parsedValue < 0) {
    return {
      ok: false,
      error: `${fieldName} must be greater than or equal to 0`,
    };
  }

  return {
    ok: true,
    value: parsedValue,
  };
}

function buildPredictionPayload(body) {
  const taxResult = parseNonNegativeNumber(body.tax, "tax");
  if (!taxResult.ok) {
    return taxResult;
  }

  if (body.tax_ratio != null && body.tax_ratio !== "") {
    const taxRatioResult = parseNonNegativeNumber(body.tax_ratio, "tax_ratio");
    if (!taxRatioResult.ok) {
      return taxRatioResult;
    }

    return {
      ok: true,
      payload: {
        tax: Number(taxResult.value.toFixed(2)),
        tax_ratio: Number(taxRatioResult.value.toFixed(4)),
      },
    };
  }

  const priceResult = parseNonNegativeNumber(body.price, "price");
  if (!priceResult.ok) {
    return {
      ok: false,
      error: "Provide either tax_ratio directly or provide price so tax_ratio can be calculated",
    };
  }

  if (priceResult.value === 0) {
    return {
      ok: false,
      error: "price must be greater than 0 when tax_ratio is not provided",
    };
  }

  return {
    ok: true,
    payload: {
      tax: Number(taxResult.value.toFixed(2)),
      tax_ratio: Number((taxResult.value / priceResult.value).toFixed(4)),
    },
  };
}

function createHistoryEntry({ risk, confidence, probabilities, input, metadata }) {
  return {
    id: nextHistoryId++,
    risk,
    confidence,
    probabilities,
    input,
    metadata: metadata ?? null,
    created_at: new Date().toISOString(),
  };
}

function addPredictionToHistory(entry) {
  predictionHistory.unshift(entry);

  if (predictionHistory.length > MAX_HISTORY_ITEMS) {
    predictionHistory.pop();
  }
}

function buildHistorySummary() {
  const summary = {
    total_predictions: predictionHistory.length,
    high_risk_count: 0,
    low_risk_count: 0,
    latest_prediction_at: predictionHistory[0]?.created_at ?? null,
  };

  for (const entry of predictionHistory) {
    if (entry.risk === "HIGH RISK") {
      summary.high_risk_count += 1;
    } else if (entry.risk === "LOW RISK") {
      summary.low_risk_count += 1;
    }
  }

  return summary;
}

function parseCsvLine(line) {
  const values = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
    } else {
      currentValue += character;
    }
  }

  values.push(currentValue);
  return values;
}

function normalizePortId(portName) {
  return portName
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getRiskLevel(riskScore) {
  if (riskScore >= 18) {
    return "high";
  }

  if (riskScore >= 12) {
    return "medium";
  }

  return "low";
}

function getHotspotRiskLevel(riskScore) {
  if (riskScore >= 22) {
    return "high";
  }

  if (riskScore >= 17) {
    return "medium";
  }

  return "low";
}

function buildPortRiskReason(port) {
  if (port.risk === "high") {
    return "High-risk shipment concentration is above the dataset baseline.";
  }

  if (port.risk === "medium") {
    return "High-risk shipment concentration is close to the dataset baseline.";
  }

  return "High-risk shipment concentration is below the dataset baseline.";
}

function getDateKey(dateValue) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(dateValue || "");
  return match ? match[1] : null;
}

function addProductCount(productMap, productName, isHighRisk) {
  const normalizedProduct = productName || "Unknown product";

  if (!productMap.has(normalizedProduct)) {
    productMap.set(normalizedProduct, {
      name: normalizedProduct,
      shipments: 0,
      highRisk: 0,
    });
  }

  const product = productMap.get(normalizedProduct);
  product.shipments += 1;

  if (isHighRisk) {
    product.highRisk += 1;
  }
}

function rankProducts(productMap, sorter) {
  return [...productMap.values()]
    .sort(sorter)
    .slice(0, 5)
    .map((product) => ({
      ...product,
      riskScore:
        product.shipments > 0
          ? Number(((product.highRisk / product.shipments) * 100).toFixed(1))
          : 0,
    }));
}

function buildProductHotspots(productMap, minShipments = 50) {
  return [...productMap.values()]
    .map((product) => {
      const riskScore =
        product.shipments > 0
          ? Number(((product.highRisk / product.shipments) * 100).toFixed(1))
          : 0;

      return {
        ...product,
        riskScore,
        risk: getHotspotRiskLevel(riskScore),
      };
    })
    .filter((product) => product.shipments >= minShipments)
    .sort(
      (left, right) =>
        right.riskScore - left.riskScore ||
        right.highRisk - left.highRisk ||
        right.shipments - left.shipments
    );
}

function buildRiskMapData(filters = {}) {
  if (!fs.existsSync(RISK_MAP_DATA_PATH)) {
    throw new Error(`Risk map dataset not found at ${RISK_MAP_DATA_PATH}`);
  }

  const csvContent = fs.readFileSync(RISK_MAP_DATA_PATH, "utf8").trim();
  const [headerLine, ...rows] = csvContent.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const productIndex = headers.indexOf("product_name");
  const shipmentDateIndex = headers.indexOf("shipment_date");
  const destinationIndex = headers.indexOf("destination_port");
  const riskIndex = headers.indexOf("risk");
  const taxRatioIndex = headers.indexOf("tax_ratio");

  if (
    productIndex === -1 ||
    shipmentDateIndex === -1 ||
    destinationIndex === -1 ||
    riskIndex === -1
  ) {
    throw new Error(
      "Risk map dataset must contain product_name, shipment_date, destination_port, and risk columns"
    );
  }

  const selectedDate = filters.date || "all";
  const productSearch = (filters.product || "").trim().toLowerCase();
  const minHotspotShipments = selectedDate === "all" && !productSearch ? 50 : 18;
  const portGroups = new Map();
  const portTrendGroups = new Map();
  const dateSet = new Set();
  const globalProductCounts = new Map();
  let skippedRows = 0;
  let matchedRows = 0;

  for (const row of rows) {
    if (!row.trim()) {
      continue;
    }

    const values = parseCsvLine(row);
    const productName = values[productIndex]?.trim() || "Unknown product";
    const dateKey = getDateKey(values[shipmentDateIndex]);
    const destinationPort = values[destinationIndex]?.trim() || "Unknown";
    const coordinates = PORT_COORDINATES[destinationPort];
    const risk = values[riskIndex]?.trim();
    const isHighRisk = risk === "HIGH RISK";
    const taxRatio = Number(values[taxRatioIndex]);

    if (dateKey) {
      dateSet.add(dateKey);
    }

    if (productSearch && !productName.toLowerCase().includes(productSearch)) {
      continue;
    }

    if (coordinates && dateKey) {
      if (!portTrendGroups.has(destinationPort)) {
        portTrendGroups.set(destinationPort, {
          id: normalizePortId(destinationPort),
          dailyCounts: new Map(),
        });
      }

      const trendPort = portTrendGroups.get(destinationPort);
      if (!trendPort.dailyCounts.has(dateKey)) {
        trendPort.dailyCounts.set(dateKey, {
          date: dateKey,
          shipments: 0,
          highRisk: 0,
        });
      }

      const trendEntry = trendPort.dailyCounts.get(dateKey);
      trendEntry.shipments += 1;

      if (isHighRisk) {
        trendEntry.highRisk += 1;
      }
    }

    if (selectedDate !== "all" && dateKey !== selectedDate) {
      continue;
    }

    matchedRows += 1;
    addProductCount(globalProductCounts, productName, isHighRisk);

    if (!coordinates) {
      skippedRows += 1;
      continue;
    }

    if (!portGroups.has(destinationPort)) {
      portGroups.set(destinationPort, {
        id: normalizePortId(destinationPort),
        sourceName: destinationPort,
        name: destinationPort.replace(/\s*\([^)]*\)\s*$/, ""),
        country: coordinates.country,
        position: coordinates.position,
        shipments: 0,
        highRisk: 0,
        lowRisk: 0,
        taxRatioSum: 0,
        taxRatioCount: 0,
        productCounts: new Map(),
      });
    }

    const port = portGroups.get(destinationPort);

    port.shipments += 1;
    if (isHighRisk) {
      port.highRisk += 1;
    } else if (risk === "LOW RISK") {
      port.lowRisk += 1;
    }

    if (Number.isFinite(taxRatio)) {
      port.taxRatioSum += taxRatio;
      port.taxRatioCount += 1;
    }

    addProductCount(port.productCounts, productName, isHighRisk);

  }

  const ports = [...portGroups.values()]
    .map((port) => {
      const riskScore = Number(((port.highRisk / port.shipments) * 100).toFixed(1));
      const averageTaxRatio =
        port.taxRatioCount > 0
          ? Number((port.taxRatioSum / port.taxRatioCount).toFixed(4))
          : null;
      const risk = getRiskLevel(riskScore);
      const productHotspots = buildProductHotspots(
        port.productCounts,
        minHotspotShipments
      );
      const hotspot = productHotspots[0] || null;
      const trendPort = portTrendGroups.get(port.sourceName);
      const dailyTrend = trendPort
        ? [...trendPort.dailyCounts.values()]
            .sort((left, right) => left.date.localeCompare(right.date))
            .map((entry) => ({
              ...entry,
              riskScore:
                entry.shipments > 0
                  ? Number(((entry.highRisk / entry.shipments) * 100).toFixed(1))
                  : 0,
            }))
        : [];

      return {
        id: port.id,
        name: port.name,
        country: port.country,
        position: port.position,
        shipments: port.shipments,
        highRisk: port.highRisk,
        lowRisk: port.lowRisk,
        risk,
        riskScore,
        averageTaxRatio,
        reason: buildPortRiskReason({ ...port, risk }),
        hotspot,
        hotspotRisk: hotspot?.risk || risk,
        hotspotRiskScore: hotspot?.riskScore || riskScore,
        topProducts: rankProducts(
          port.productCounts,
          (left, right) => right.shipments - left.shipments
        ),
        topHighRiskProducts: rankProducts(
          port.productCounts,
          (left, right) =>
            right.highRisk - left.highRisk || right.shipments - left.shipments
        ),
        productHotspots: productHotspots.slice(0, 5),
        dailyTrend,
      };
    })
    .sort((left, right) => right.riskScore - left.riskScore);

  const totalShipments = ports.reduce((sum, port) => sum + port.shipments, 0);
  const highRiskShipments = ports.reduce((sum, port) => sum + port.highRisk, 0);
  const datasetRiskScore =
    totalShipments > 0
      ? Number(((highRiskShipments / totalShipments) * 100).toFixed(1))
      : 0;

  return {
    ports,
    filters: {
      selectedDate,
      product: filters.product || "",
      availableDates: [...dateSet].sort(),
      topProducts: rankProducts(
        globalProductCounts,
        (left, right) => right.shipments - left.shipments
      ),
    },
    hotspots: ports
      .filter((port) => port.hotspot)
      .map((port) => ({
        portId: port.id,
        portName: port.name,
        country: port.country,
        position: port.position,
        ...port.hotspot,
      }))
      .sort(
        (left, right) =>
          right.riskScore - left.riskScore ||
          right.highRisk - left.highRisk ||
          right.shipments - left.shipments
      )
      .slice(0, 10),
    summary: {
      totalPorts: ports.length,
      totalShipments,
      highRiskShipments,
      lowRiskShipments: ports.reduce((sum, port) => sum + port.lowRisk, 0),
      skippedRows,
      matchedRows,
      datasetRiskScore,
    },
  };
}

async function scoreSampleWithMl(sample) {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tax: Number(sample.taxUsd ?? 0),
        tax_ratio: Number(sample.taxRatio ?? 0),
      }),
    });

    if (!response.ok) {
      return {
        aiPrediction: null,
        confidence: null,
        probabilities: null,
      };
    }

    const data = await response.json();

    return {
      aiPrediction: data.prediction ?? null,
      confidence:
        data.confidence == null ? null : Number(Number(data.confidence).toFixed(4)),
      probabilities: data.probabilities ?? null,
    };
  } catch {
    return {
      aiPrediction: null,
      confidence: null,
      probabilities: null,
    };
  }
}

async function attachLiveModelSignals(sampleGroups) {
  const allSamples = Object.values(sampleGroups).flat();
  const uniqueSamples = [...new Map(allSamples.map((sample) => [sample.id, sample])).values()];
  const scoredEntries = await Promise.all(
    uniqueSamples.map(async (sample) => [sample.id, await scoreSampleWithMl(sample)])
  );
  const scoreById = new Map(scoredEntries);

  return Object.fromEntries(
    Object.entries(sampleGroups).map(([groupName, samples]) => [
      groupName,
      samples.map((sample) => ({
        ...sample,
        ...(scoreById.get(sample.id) || {
          aiPrediction: null,
          confidence: null,
          probabilities: null,
        }),
      })),
    ])
  );
}

app.get("/", (req, res) => {
  res.json({
    message: "Import Risk Analysis backend is running.",
  });
});

app.post("/auth/login", (request, response) => {
  const { adminId, password } = request.body || {};

  if (adminId !== ADMIN_ID || password !== ADMIN_PASSWORD) {
    return response.status(401).json({
      error: "Invalid admin credentials",
    });
  }

  const authToken = createAuthToken(adminId);
  response.json({
    adminId,
    token: authToken.token,
    expiresAt: authToken.expiresAt,
  });
});

app.get("/auth/session", requireAuth, (request, response) => {
  response.json({
    adminId: request.auth.adminId,
    expiresAt: new Date(request.auth.exp).toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/prediction-history", requireAuth, (req, res) => {
  res.json({
    total: predictionHistory.length,
    items: predictionHistory,
  });
});

app.get("/prediction-history/summary", requireAuth, (req, res) => {
  res.json(buildHistorySummary());
});

app.get("/risk-map", requireAuth, (req, res) => {
  try {
    res.json(
      buildRiskMapData({
        date: typeof req.query.date === "string" ? req.query.date : "all",
        product: typeof req.query.product === "string" ? req.query.product : "",
      })
    );
  } catch (error) {
    console.error("Error building risk map data:", error);
    res.status(500).json({
      error: "Unable to build risk map data",
    });
  }
});

app.get("/ml-health", requireAuth, async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);

    if (!response.ok) {
      return res.status(502).json({
        error: "ML service is unavailable",
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error reaching ML service:", error);
    res.status(502).json({
      error: "Unable to connect to the ML service",
    });
  }
});

app.post("/predict", requireAuth, async (req, res) => {
  const predictionPayload = buildPredictionPayload(req.body || {});

  if (!predictionPayload.ok) {
    return res.status(400).json({
      error: predictionPayload.error,
    });
  }

  try {
    const metadata = {
      product_name:
        typeof req.body?.product_name === "string"
          ? req.body.product_name.trim()
          : "",
      destination_port:
        typeof req.body?.destination_port === "string"
          ? req.body.destination_port.trim()
          : "",
      price: Number.isFinite(Number(req.body?.price))
        ? Number(req.body.price)
        : null,
      weight_kg: Number.isFinite(Number(req.body?.weight_kg))
        ? Number(req.body.weight_kg)
        : null,
      volume_m3: Number.isFinite(Number(req.body?.volume_m3))
        ? Number(req.body.volume_m3)
        : null,
    };

    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(predictionPayload.payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || "Prediction request failed",
      });
    }

    const historyEntry = createHistoryEntry({
      risk: data.prediction,
      confidence: data.confidence ?? null,
      probabilities: data.probabilities ?? null,
      input: predictionPayload.payload,
      metadata,
    });
    addPredictionToHistory(historyEntry);

    res.json({
      risk: data.prediction,
      confidence: data.confidence ?? null,
      probabilities: data.probabilities ?? null,
      input: predictionPayload.payload,
      metadata,
      history_entry: historyEntry,
    });
  } catch (error) {
    console.error("Error during prediction:", error);
    res.status(502).json({
      error: "Failed to reach the ML prediction service",
    });
  }
});

app.get("/api/debug/paths", requireAuth, (req, res) => {
  res.json(buildDebugPaths());
});

app.get("/api/dashboard/summary", requireAuth, (req, res) => {
  try {
    res.json(buildDashboardSummary());
  } catch (error) {
    console.error("Error building dashboard summary:", error);
    res.status(500).json({
      error: "Unable to build dashboard summary",
      details: error.message,
    });
  }
});

app.get("/api/dataset/summary", requireAuth, (req, res) => {
  try {
    res.json(buildDatasetSummary());
  } catch (error) {
    console.error("Error building dataset summary:", error);
    res.status(500).json({
      error: "Unable to build dataset summary",
      details: error.message,
    });
  }
});

app.get("/api/dataset/sample", requireAuth, (req, res) => {
  try {
    const { rows } = loadDataset();
    const limit = Number(req.query.limit || 20);

    res.json({
      total: rows.length,
      items: buildSampleRows(rows, limit),
    });
  } catch (error) {
    console.error("Error loading dataset sample:", error);
    res.status(500).json({
      error: "Unable to load dataset sample",
      details: error.message,
    });
  }
});

app.get("/api/models/knn", requireAuth, (req, res) => {
  try {
    res.json(buildKnnModelData());
  } catch (error) {
    console.error("Error loading KNN model data:", error);
    res.status(500).json({
      error: "Unable to load KNN model data",
      details: error.message,
    });
  }
});

app.get("/api/models/logistic-regression", requireAuth, (req, res) => {
  try {
    res.json(buildLogisticRegressionData());
  } catch (error) {
    console.error("Error loading Logistic Regression model data:", error);
    res.status(500).json({
      error: "Unable to load Logistic Regression model data",
      details: error.message,
    });
  }
});

app.get("/api/models/random-forest", requireAuth, (req, res) => {
  try {
    res.json(buildRandomForestData());
  } catch (error) {
    console.error("Error loading Random Forest model data:", error);
    res.status(500).json({
      error: "Unable to load Random Forest model data",
      details: error.message,
    });
  }
});

app.get("/api/models/decision-tree", requireAuth, (req, res) => {
  try {
    res.json(buildDecisionTreeData());
  } catch (error) {
    console.error("Error loading Decision Tree model data:", error);
    res.status(500).json({
      error: "Unable to load Decision Tree model data",
      details: error.message,
    });
  }
});

app.get("/api/models/neural-network", requireAuth, (req, res) => {
  try {
    res.json(buildNeuralNetworkData());
  } catch (error) {
    console.error("Error loading Neural Network model data:", error);
    res.status(500).json({
      error: "Unable to load Neural Network model data",
      details: error.message,
    });
  }
});

app.get("/api/models/svm", requireAuth, (req, res) => {
  try {
    res.json(buildSvmModelData());
  } catch (error) {
    console.error("Error loading SVM model data:", error);
    res.status(500).json({
      error: "Unable to load SVM model data",
      details: error.message,
    });
  }
});

app.get("/api/labs/context", requireAuth, async (req, res) => {
  try {
    const predictionLabDataset = buildPredictionLabContext();
    const scoredSamples = await attachLiveModelSignals({
      featuredSamples: predictionLabDataset.featuredSamples,
      comparisonSamples: predictionLabDataset.comparisonSamples,
      labSamples: predictionLabDataset.labSamples,
    });

    res.json({
      predictionLabDataset: {
        ...predictionLabDataset,
        ...scoredSamples,
      },
      algorithmMetrics: buildModelComparisonMetrics(),
    });
  } catch (error) {
    console.error("Error building lab context:", error);
    res.status(500).json({
      error: "Unable to build lab context",
      details: error.message,
    });
  }
});

app.get("/api/assistant/config", requireAuth, (req, res) => {
  res.json(getAssistantConfiguration());
});

app.post("/api/assistant/chat", requireAuth, async (req, res) => {
  try {
    const reply = await generateAssistantReply({
      route: req.body?.route,
      question: req.body?.question,
      history: Array.isArray(req.body?.history) ? req.body.history : [],
      predictionHistory,
      historySummary: buildHistorySummary(),
    });

    res.json(reply);
  } catch (error) {
    console.error("Error generating assistant reply:", error);
    res.status(error.statusCode || 500).json({
      error: error.message || "Assistant reply failed",
      details: error.details || null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
