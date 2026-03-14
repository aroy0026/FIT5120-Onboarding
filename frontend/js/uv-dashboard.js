let map;
let marker;
let uvChartInstance;

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

function showUvAlert(uv, riskLevel) {
  const alertBox = document.getElementById("uvAlert");
  const alertTitle = document.getElementById("uvAlertTitle");
  const alertMessage = document.getElementById("uvAlertMessage");

  alertBox.className = "uv-alert hidden";

  if (uv >= 11) {
    alertBox.className = "uv-alert extreme";
    alertTitle.textContent = "Extreme UV Alert";
    alertMessage.textContent = "Avoid direct sun exposure if possible. Seek shade immediately, wear protective clothing, and apply SPF50+ sunscreen.";
    return;
  }

  if (uv >= 8) {
    alertBox.className = "uv-alert very-high";
    alertTitle.textContent = "Very High UV Alert";
    alertMessage.textContent = "Your UV level is very high. Find shade, wear sunglasses, and apply SPF50+ sunscreen now.";
    return;
  }

  if (uv >= 6) {
    alertBox.className = "uv-alert high";
    alertTitle.textContent = "High UV Alert";
    alertMessage.textContent = "UV is high. Wear protective clothing and apply sunscreen before staying outdoors.";
    return;
  }
}

function findPeakTime(times, values) {
  if (!times || !values || !values.length) return "--";
  let index = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[index]) index = i;
  }
  return times[index].slice(11, 16);
}

function drawChart(times, values) {
  const ctx = document.getElementById("uvChart").getContext("2d");

  if (uvChartInstance) {
    uvChartInstance.destroy();
  }

  const labels = times.map(time => time.slice(11, 16));

  uvChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "UV Index",
          data: values,
          borderColor: "#2563ff",
          backgroundColor: "rgba(37, 99, 255, 0.15)",
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Time"
          },
          ticks: {
            maxTicksLimit: 8
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "UV Index"
          }
        }
      }
    }
  });
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

  showUvAlert(uv, risk.level);
  updateMap(lat, lon, label);
  drawChart(hourlyTimes.slice(0, 24), hourlyUv.slice(0, 24));
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