const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pool = require("./db"); // <-- import the pool
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Add near your other routes in server.js

// GET /uv-yearly-summary?state_code=VIC&city_name=Melbourne
app.get("/uv-yearly-summary", async (req, res) => {
  try {
    const stateCode = req.query.state_code || "VIC";
    const cityName = req.query.city_name || "Melbourne";

    // Resolve city_id
    const citySql = `
      SELECT c.city_id, c.city_name, s.state_code, s.state_name
      FROM dim_city c
      JOIN dim_state s ON c.state_id = s.state_id
      WHERE s.state_code = $1 AND c.city_name = $2
      LIMIT 1;
    `;
    const cityResult = await pool.query(citySql, [stateCode, cityName]);

    if (cityResult.rowCount === 0) {
      return res.json({ count: 0, items: [] });
    }

    const { city_id, state_name } = cityResult.rows[0];

    const summarySql = `
      SELECT year, max_uv, min_uv
      FROM uv_yearly_summary
      WHERE city_id = $1
      ORDER BY year;
    `;
    const summaryResult = await pool.query(summarySql, [city_id]);

    res.json({
      state_code: stateCode,
      state_name,
      city_name: cityName,
      count: summaryResult.rowCount,
      items: summaryResult.rows.map(r => ({
        year: Number(r.year),
        max_uv: Number(r.max_uv),
        min_uv: Number(r.min_uv)
      }))
    });
  } catch (err) {
    console.error("Error fetching yearly UV summary:", err.message);
    res.status(500).json({ error: "Failed to fetch yearly UV summary" });
  }
});


app.get("/locations", async (req, res) => {
  try {
    const sql = `
      SELECT
        s.state_id,
        s.state_code,
        s.state_name,
        c.city_id,
        c.city_name
      FROM dim_state s
      LEFT JOIN dim_city c ON c.state_id = s.state_id
      ORDER BY s.state_code, c.city_name;
    `;

    const result = await pool.query(sql);

    const byState = new Map();

    for (const row of result.rows) {
      if (!byState.has(row.state_id)) {
        byState.set(row.state_id, {
          state_id: row.state_id,
          state_code: row.state_code,
          state_name: row.state_name,
          cities: [],
        });
      }

      if (row.city_id) {
        byState.get(row.state_id).cities.push({
          city_id: row.city_id,
          city_name: row.city_name,
        });
      }
    }

    res.json({
      states: Array.from(byState.values()),
    });
  } catch (err) {
    console.error("Error fetching locations:", err.message);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

/**
 * GET /uv-history
 * Required:
 *   state_code  - e.g. VIC
 *   city_name   - e.g. Melbourne
 * Optional:
 *   from        - ISO timestamp
 *   to          - ISO timestamp
 *   limit       - max rows (default 500)
 */
app.get("/uv-history", async (req, res) => {
  try {
    const { state_code, city_name, year, limit_days } = req.query;

    if (!state_code || !city_name) {
      return res.status(400).json({
        error: "state_code and city_name are required",
      });
    }

    const params = [];
    let where = [];

    // Resolve state + city -> city_id
    params.push(state_code);
    params.push(city_name);

    const citySql = `
      SELECT c.city_id, c.city_name, s.state_code, s.state_name
      FROM dim_city c
      JOIN dim_state s ON c.state_id = s.state_id
      WHERE s.state_code = $1 AND c.city_name = $2
      LIMIT 1;
    `;

    const cityResult = await pool.query(citySql, params);
    if (cityResult.rowCount === 0) {
      return res.json({ count: 0, items: [] });
    }

    const { city_id, state_name } = cityResult.rows[0];

    // Build query on summary table
    const qParams = [city_id];
    where.push(`city_id = $1`);

    if (year) {
      qParams.push(parseInt(year, 10));
      where.push(`EXTRACT(YEAR FROM day_utc) = $${qParams.length}`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    let limitSql = "";
    if (limit_days) {
      const n = parseInt(limit_days, 10);
      if (!Number.isNaN(n) && n > 0) {
        limitSql = `LIMIT ${n}`;
      }
    }

    const dailySql = `
      SELECT
        day_utc,
        max_uv
      FROM fact_uv_daily_max
      ${whereSql}
      ORDER BY day_utc ASC
      ${limitSql};
    `;

    const result = await pool.query(dailySql, qParams);

    res.json({
      count: result.rowCount,
      items: result.rows.map(r => ({
        state_code,
        state_name,
        city_name,
        day_utc: r.day_utc,
        max_uv_index: r.max_uv
      })),
    });
  } catch (err) {
    console.error("Error fetching UV history:", err.message);
    res.status(500).json({ error: "Failed to fetch UV history" });
  }
});


// server.js (add this near your other routes)
app.get("/educational-resources", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        title,
        description,
        url,
        source_type,
        category
      FROM educational_resource
      ORDER BY category;
    `);

    res.json({
      count: result.rowCount,
      items: result.rows,
    });
  } catch (err) {
    console.error("Error fetching educational resources:", err.message);
    res.status(500).json({ error: "Failed to fetch educational resources" });
  }
});


// db-health check: tries a lightweight query
app.get("/db-health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT 1 AS ok"
    );

    // or, to confirm table exists:
    // const result = await pool.query("SELECT COUNT(*) FROM cancer_stats");

    res.json({
      status: "ok",
      db: "connected",
      result: result.rows[0],
    });
  } catch (err) {
    console.error("DB health check failed:", err.message);
    res.status(500).json({
      status: "error",
      db: "unreachable",
      message: err.message,
    });
  }
});


app.get("/cancer-stats", async (req, res) => {
  try {
    const { state, age_group, year, sex } = req.query;

    // base query: melanoma only
    const values = ["Melanoma of the skin"];
    let sql = `
      SELECT
        cancer_type,
        state,
        sex,
        age_group,
        year,
        incidence_rate,
        mortality_rate
      FROM cancer_stats
      WHERE cancer_type = $1
    `;

    // optional filters
    if (state) {
      values.push(state);
      sql += ` AND state = $${values.length}`;
    }

    if (age_group) {
      values.push(age_group);
      sql += ` AND age_group = $${values.length}`;
    }

    if (year) {
      values.push(parseInt(year, 10));
      sql += ` AND year = $${values.length}`;
    }

    if (sex) {
      values.push(sex);
      sql += ` AND sex = $${values.length}`;
    }

    // order for consistency
    sql += " ORDER BY year, state, age_group, sex";

    const result = await pool.query(sql, values);

    res.json({
      count: result.rowCount,
      items: result.rows,
    });
  } catch (err) {
    console.error("Error fetching cancer stats:", err.message);
    res.status(500).json({ error: "Failed to fetch cancer stats" });
  }
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});