const crypto = require("crypto");
const express = require("express");
const {
  buildDashboardSummary,
  buildDatasetSummary,
  buildSampleRows,
  buildKnnModelData,
  buildLogisticRegressionData,
  buildRandomForestData,
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
const MAX_HISTORY_ITEMS = 100;
const AUTH_SECRET = process.env.AUTH_SECRET || "change-this-secret";
const ADMIN_ID = process.env.ADMIN_ID || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;
const predictionHistory = [];
let nextHistoryId = 1;

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
