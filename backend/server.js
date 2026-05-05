const express = require("express");

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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
