const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

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

// POST /predict endpoint
app.post("/predict", (req, res) => {
  const { price, weight, tax } = req.body;

  // Validate input
  if (price == null || weight == null || tax == null) {
    return res.status(400).json({ error: "Missing required fields: price, weight, tax" });
  }

  try {
    // Mock prediction logic
    const risk = tax > 0.5 ? "HIGH RISK" : "LOW RISK";
    res.json({ risk });
  } catch (error) {
    console.error("Error during prediction:", error);
    res.status(500).json({ error: "Failed to process prediction" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
