let map;
let marker;

function initMap() {
  map = L.map("map").setView([-37.8136, 144.9631], 11);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  marker = L.marker([-37.8136, 144.9631]).addTo(map);
}

function updateMap(lat, lon, label) {
  map.setView([lat, lon], 12);
  marker.setLatLng([lat, lon]).bindPopup(label).openPopup();
}

function getRiskInfo(uv) {
  if (uv <= 2) return { level: "Low", burn: "60+ min" };
  if (uv <= 5) return { level: "Moderate", burn: "30–45 min" };
  if (uv <= 7) return { level: "High", burn: "15–25 min" };
  if (uv <= 10) return { level: "Very High", burn: "10–15 min" };
  return { level: "Extreme", burn: "< 10 min" };
}

function getPillStyle(level) {
  if (level === "Low") return { bg: "#dff5d6", color: "#1d6530" };
  if (level === "Moderate") return { bg: "#ffe8b0", color: "#7f5a00" };
  if (level === "High") return { bg: "#ffd8cc", color: "#b34a2a" };
  if (level === "Very High") return { bg: "#ffe2d7", color: "#c04b2d" };
  return { bg: "#eadcff", color: "#6e32b6" };
}

function findPeakTime(times, values) {
  if (!times || !values || !values.length) return "--";
  let index = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[index]) index = i;
  }
  return times[index].slice(11, 16);
}

function drawChart(values) {
  const canvas = document.getElementById("uvChart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const left = 40;
  const top = 15;
  const chartW = w - 60;
  const chartH = h - 45;

  ctx.strokeStyle = "#dbe2ee";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, chartW, chartH);

  if (!values || !values.length) return;

  const max = Math.max(...values, 1);

  ctx.beginPath();
  ctx.strokeStyle = "#2563ff";
  ctx.lineWidth = 3;

  values.forEach((value, index) => {
    const x = left + (index / (values.length - 1)) * chartW;
    const y = top + chartH - (value / max) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = "#7b8498";
  ctx.font = "12px Arial";
  ctx.fillText("00:00", left, h - 10);
  ctx.fillText("24:00", w - 48, h - 10);
}

async function fetchUvData(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,uv_index` +
    `&hourly=uv_index` +
    `&timezone=auto`;

  const res = await fetch(url);
  return res.json();
}

function renderAll(data, lat, lon, label) {
  const uv = Number(data.current?.uv_index || 0);
  const temp = data.current?.temperature_2m;
  const hourlyUv = data.hourly?.uv_index || [];
  const hourlyTimes = data.hourly?.time || [];

  const risk = getRiskInfo(uv);
  const pill = getPillStyle(risk.level);

  document.getElementById("uvNumber").textContent = uv.toFixed(1);
  localStorage.setItem("currentUV", uv);
  document.getElementById("uvPill").textContent = risk.level;
  document.getElementById("uvPill").style.background = pill.bg;
  document.getElementById("uvPill").style.color = pill.color;
  document.getElementById("burnTime").textContent = risk.burn;
  document.getElementById("peakTime").textContent = findPeakTime(hourlyTimes, hourlyUv);
  document.getElementById("tempValue").textContent = temp !== undefined ? `${temp}°C` : "--";
  document.getElementById("coordValue").textContent = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  document.getElementById("locationChip").textContent = label;
  document.getElementById("statusText").textContent = `Loaded UV data for ${label}.`;

  updateMap(lat, lon, label);
  drawChart(hourlyUv.slice(0, 24));
}

async function loadCurrentLocation() {
  if (!navigator.geolocation) {
    document.getElementById("statusText").textContent = "Geolocation is not supported in this browser.";
    return;
  }

  document.getElementById("statusText").textContent = "Loading your current location...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const data = await fetchUvData(lat, lon);
        renderAll(data, lat, lon, "Current Location");
      } catch (error) {
        document.getElementById("statusText").textContent = "Failed to load UV data.";
        console.error(error);
      }
    },
    () => {
      document.getElementById("statusText").textContent = "Location permission was denied.";
    }
  );
}

async function loadMelbourneDefault() {
  const lat = -37.8136;
  const lon = 144.9631;
  const data = await fetchUvData(lat, lon);
  renderAll(data, lat, lon, "Melbourne");
}

initMap();
loadMelbourneDefault();