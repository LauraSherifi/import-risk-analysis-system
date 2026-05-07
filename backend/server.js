const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Import Risk Analysis backend is running."
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

app.get("/ml-health", async (req, res) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);

    if (!response.ok) {
      return res.status(502).json({
        error: "ML service is unavailable"
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error reaching ML service:", error);
    res.status(502).json({
      error: "Unable to connect to the ML service"
    });
  }
});

// POST /predict endpoint
app.post("/predict", async (req, res) => {
  const { tax, tax_ratio } = req.body;

  if (tax == null || tax_ratio == null) {
    return res.status(400).json({
      error: "Missing required fields: tax and tax_ratio"
    });
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tax, tax_ratio })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || "Prediction request failed"
      });
    }

    res.json({
      risk: data.prediction
    });
  } catch (error) {
    console.error("Error during prediction:", error);
    res.status(502).json({
      error: "Failed to reach the ML prediction service"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
