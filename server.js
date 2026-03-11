require("dotenv").config();
const express = require("express");
const app = express();

const weatherRoutes = require("./routes/weather");
const locationsRoutes = require("./routes/locations");
const healthRoutes = require("./routes/health");

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Sun Safety API is running. Try GET /api/weather?lat=40.7&lon=-74.0 and GET /api/health");
});

app.use("/api/weather", weatherRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/health", healthRoutes);

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log("Server running on http://%s:%s", HOST, PORT);
});