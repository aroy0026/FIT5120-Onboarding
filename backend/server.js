const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/uv/current", async (req, res) => {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;

    if (!lat || !lon) {
      return res.status(400).json({
        error: "lat and lon are required"
      });
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,uv_index` +
      `&hourly=uv_index` +
      `&timezone=auto`;

    const response = await axios.get(url);
    const data = response.data;

    res.json(data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Failed to fetch UV data"
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});