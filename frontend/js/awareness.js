const API_BASE = "https://fit5120-onboarding-fynt.onrender.com";

const DEFAULT_STATE_CODE = "VIC";
const DEFAULT_CITY_NAME = "Melbourne";
const DEFAULT_YEAR = "2023";

let locationsCache = null;
let lastUvItems = [];

async function loadMelanomaChart() {
  const loader = document.getElementById("melanomaLoader");
  loader.classList.remove("hidden");
  loader.textContent = "Loading melanoma data…";

  try {
    const res = await fetch(`${API_BASE}/cancer-stats`);
    const data = await res.json();

    const rawItems = (data && data.items) ? data.items : [];

    const items = rawItems
      .filter(row => row.sex === "Persons")
      .map(row => {
        const incidence = parseFloat(row.incidence_rate);
        const mortality = parseFloat(row.mortality_rate);
        return {
          year: row.year,
          incidence,
          mortality
        };
      })
      .filter(row =>
        Number.isFinite(row.incidence) &&
        Number.isFinite(row.mortality)
      );

    if (!items.length) {
      loader.textContent = "No melanoma data available.";
      return;
    }

    const byYear = new Map();

    for (const row of items) {
      if (!byYear.has(row.year)) {
        byYear.set(row.year, { sumInc: 0, sumMort: 0, n: 0 });
      }
      const y = byYear.get(row.year);
      y.sumInc += row.incidence;
      y.sumMort += row.mortality;
      y.n += 1;
    }

    const years = Array.from(byYear.keys()).sort((a, b) => a - b);
    const incidence = years.map(year => {
      const y = byYear.get(year);
      return y.sumInc / y.n;
    });
    const mortality = years.map(year => {
      const y = byYear.get(year);
      return y.sumMort / y.n;
    });

    const ctx = document.getElementById("melanomaChart").getContext("2d");

    if (window.melanomaChart && typeof window.melanomaChart.destroy === "function") {
      window.melanomaChart.destroy();
    }

    window.melanomaChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Incidence rate (per 100,000)",
            data: incidence,
            borderColor: "#0b3c5d",
            backgroundColor: "rgba(11, 60, 93, 0.1)",
            tension: 0.2
          },
          {
            label: "Mortality rate (per 100,000)",
            data: mortality,
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: { position: "bottom" }
        },
        scales: {
          x: { title: { display: true, text: "Year" } },
          y: {
            title: { display: true, text: "Rate per 100,000" },
            beginAtZero: true
          }
        }
      }
    });

    loader.classList.add("hidden");
  } catch (err) {
    console.error("Failed to load melanoma chart", err);
    loader.textContent = "Error loading melanoma data.";
  }
}

async function loadLocations() {
  const stateSelect = document.getElementById("stateSelect");
  const citySelect = document.getElementById("citySelect");
  const yearSelect = document.getElementById("uvYearSelect");

  try {
    const res = await fetch(`${API_BASE}/locations`);
    const data = await res.json();
    const states = data.states || [];
    locationsCache = states;

    stateSelect.innerHTML = "";
    stateSelect.disabled = false;

    stateSelect.insertAdjacentHTML(
      "beforeend",
      `<option value="">Select state</option>`
    );

    states.forEach((s) => {
      stateSelect.insertAdjacentHTML(
        "beforeend",
        `<option value="${s.state_code}">${s.state_code} - ${s.state_name || ""}</option>`
      );
    });

    if (DEFAULT_STATE_CODE) {
      stateSelect.value = DEFAULT_STATE_CODE;
      populateCitiesForState(DEFAULT_STATE_CODE);
    }

    stateSelect.addEventListener("change", () => {
      const code = stateSelect.value;
      populateCitiesForState(code);
    });

    citySelect.addEventListener("change", () => {
      triggerUvReload();
    });

    yearSelect.addEventListener("change", () => {
      triggerUvReload();
    });

  } catch (err) {
    console.error("Failed to load locations", err);
    stateSelect.innerHTML = `<option value="">Error loading states</option>`;
    citySelect.innerHTML = `<option value="">Error</option>`;
    citySelect.disabled = true;
    yearSelect.disabled = true;
  }
}

function populateCitiesForState(stateCode) {
  const citySelect = document.getElementById("citySelect");
  const yearSelect = document.getElementById("uvYearSelect");
  citySelect.innerHTML = "";

  if (!locationsCache || !stateCode) {
    citySelect.disabled = true;
    citySelect.insertAdjacentHTML(
      "beforeend",
      `<option value="">Select a state first</option>`
    );
    yearSelect.disabled = true;
    return;
  }

  const state = locationsCache.find(s => s.state_code === stateCode);

  if (!state || !state.cities || !state.cities.length) {
    citySelect.disabled = true;
    citySelect.insertAdjacentHTML(
      "beforeend",
      `<option value="">No cities available</option>`
    );
    yearSelect.disabled = true;
    return;
  }

  citySelect.disabled = false;
  citySelect.insertAdjacentHTML(
    "beforeend",
    `<option value="">Select city</option>`
  );

  state.cities.forEach((c) => {
    citySelect.insertAdjacentHTML(
      "beforeend",
      `<option value="${c.city_name}">${c.city_name}</option>`
    );
  });

  if (stateCode === DEFAULT_STATE_CODE) {
    const cityExists = state.cities.some(c => c.city_name === DEFAULT_CITY_NAME);
    if (cityExists) {
      citySelect.value = DEFAULT_CITY_NAME;
    }
  }

  yearSelect.disabled = false;
}

function triggerUvReload() {
  const stateSelect = document.getElementById("stateSelect");
  const citySelect = document.getElementById("citySelect");
  const yearSelect = document.getElementById("uvYearSelect");

  const stateCode = stateSelect.value;
  const cityName = citySelect.value;
  const year = yearSelect.value || null;

  if (stateCode && cityName) {
    loadUvHistoryChart(stateCode, cityName, year);
  }
}

async function loadUvHistoryChart(stateCode, cityName, year) {
  const loader = document.getElementById("uvLoader");
  loader.classList.remove("hidden");
  loader.textContent = `Loading UV data for ${cityName}, ${stateCode}…`;

  try {
    const params = new URLSearchParams({
      state_code: stateCode,
      city_name: cityName,
      limit_days: 365
    });

    if (year) {
      params.append("year", year);
    }

    const res = await fetch(`${API_BASE}/uv-history?${params.toString()}`);
    const data = await res.json();
    lastUvItems = data.items || [];

    drawUvChart(lastUvItems, stateCode, cityName, year);

  } catch (err) {
    console.error("Failed to load UV history chart", err);
    loader.textContent = "Error loading UV data.";
  }
}

function drawUvChart(items, stateCode, cityName, year) {
  const loader = document.getElementById("uvLoader");
  const ctx = document.getElementById("uvHistoryChart").getContext("2d");

  if (!items.length) {
    loader.textContent = "No UV data available for this selection.";
    loader.classList.remove("hidden");

    if (window.uvHistoryChart && typeof window.uvHistoryChart.destroy === "function") {
      window.uvHistoryChart.destroy();
    }

    window.uvHistoryChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return;
  }

  loader.classList.add("hidden");

  const xLabels = [];
  const values = [];
  const dates = [];

  items.forEach(row => {
    const d = new Date(row.day_utc);
    if (Number.isNaN(d.getTime())) return;
    xLabels.push(d.getUTCMonth());
    values.push(parseFloat(row.max_uv_index));
    dates.push(d);
  });

  if (window.uvHistoryChart && typeof window.uvHistoryChart.destroy === "function") {
    window.uvHistoryChart.destroy();
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  window.uvHistoryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: xLabels,
      datasets: [
        {
          label: `Daily peak UV – ${cityName}, ${stateCode} (${year})`,
          data: values,
          borderColor: "#0284c7",
          backgroundColor: "rgba(2, 132, 199, 0.1)",
          tension: 0.2,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            title: (ctx) => {
              const idx = ctx[0].dataIndex;
              const d = dates[idx];
              return d.toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              });
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Month" },
          ticks: {
            callback: (value, index) => {
              const monthIndex = xLabels[index];
              return monthNames[monthIndex];
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12
          }
        },
        y: {
          title: { display: true, text: "Peak UV index" },
          beginAtZero: true
        }
      }
    }
  });
}

async function loadEducationalResources() {
  const loader = document.getElementById("resourceLoader");
  const stripWrapper = document.querySelector(".resource-strip-wrapper");
  const strip = document.getElementById("resourceStrip");
  const scrollLeftBtn = document.getElementById("resourceScrollLeft");
  const scrollRightBtn = document.getElementById("resourceScrollRight");

  try {
    loader.classList.remove("hidden");
    loader.textContent = "Loading resources…";

    const res = await fetch(`${API_BASE}/educational-resources`);
    const data = await res.json();
    const items = data.items || [];

    if (!items.length) {
      loader.textContent = "No educational resources available.";
      return;
    }

    strip.innerHTML = "";

    function getYoutubeThumb(url) {
      try {
        const u = new URL(url);
        const vParam = u.searchParams.get("v");
        const videoId = vParam || u.pathname.split("/").filter(Boolean).pop();
        if (!videoId) return null;
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } catch {
        return null;
      }
    }

    function getFallbackLabel(item) {
      if (item.source_type === "YouTube") return "YT";
      if (item.source_type === "GovSite") return "Gov";
      if (item.source_type === "NGO") return "NGO";
      try {
        const u = new URL(item.url);
        return u.hostname.replace("www.", "").split(".")[0].slice(0, 3).toUpperCase();
      } catch {
        return "UV";
      }
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "resource-card";

      const header = document.createElement("div");
      header.className = "resource-header";

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "resource-thumb";

      let thumbUrl = null;
      if (item.source_type === "YouTube") {
        thumbUrl = getYoutubeThumb(item.url);
      }

      if (thumbUrl) {
        const img = document.createElement("img");
        img.alt = item.title;
        img.src = thumbUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        thumbWrap.appendChild(img);
      } else {
        thumbWrap.textContent = getFallbackLabel(item);
      }

      const titleWrap = document.createElement("div");
      const titleEl = document.createElement("div");
      titleEl.className = "resource-title";
      titleEl.textContent = item.title;

      const categoryEl = document.createElement("div");
      categoryEl.className = "resource-category";
      categoryEl.textContent = item.category;

      titleWrap.appendChild(titleEl);
      titleWrap.appendChild(categoryEl);

      header.appendChild(thumbWrap);
      header.appendChild(titleWrap);

      const descEl = document.createElement("p");
      descEl.className = "resource-description";
      descEl.textContent = item.description;

      const footer = document.createElement("div");
      footer.className = "resource-footer";

      const sourceEl = document.createElement("span");
      sourceEl.className = "resource-source";
      sourceEl.textContent = item.source_type;

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "primary-btn";
      openBtn.textContent = "Open";
      openBtn.onclick = () => {
        window.open(item.url, "_blank", "noopener");
      };

      footer.appendChild(sourceEl);
      footer.appendChild(openBtn);

      card.appendChild(header);
      card.appendChild(descEl);
      card.appendChild(footer);

      strip.appendChild(card);
    });

    loader.classList.add("hidden");
    stripWrapper.classList.remove("hidden");

    function getCardWidth() {
      const firstCard = strip.querySelector(".resource-card");
      return firstCard ? firstCard.offsetWidth + 12 : 260;
    }

    scrollLeftBtn.onclick = () => {
      strip.scrollBy({ left: -getCardWidth(), behavior: "smooth" });
    };

    scrollRightBtn.onclick = () => {
      strip.scrollBy({ left: getCardWidth(), behavior: "smooth" });
    };
  } catch (err) {
    console.error("Failed to load educational resources", err);
    loader.textContent = "Error loading resources.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  loadMelanomaChart();
  await loadLocations();
  const yearSelect = document.getElementById("uvYearSelect");
  yearSelect.disabled = false;
  yearSelect.value = DEFAULT_YEAR;
  triggerUvReload();
  loadEducationalResources();
});