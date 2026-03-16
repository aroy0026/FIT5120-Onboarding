
function getCurrentUV() {
  const uv = localStorage.getItem("currentUV");
  if (uv !== null && uv !== "") {
    const num = Number(uv);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function getUvBandLabel(uv) {
  const v = Number(uv);
  if (v <= 2) return "Low";
  if (v <= 5) return "Moderate";
  if (v <= 7) return "High";
  return "Very high / Extreme";
}


function updateUvDisplays(uv) {
  const globalValEl = document.getElementById("globalUvValue");
  const uvUsedBadge = document.getElementById("uvUsedBadge");
  const clothingUvLabel = document.getElementById("clothingUvLabel");

  if (globalValEl) {
    globalValEl.textContent =
      uv !== null ? uv.toFixed(2) : "Not available";
  }

  if (uvUsedBadge) {
    uvUsedBadge.textContent =
      uv !== null ? `UV level used: ${uv}` : "UV level used: Not set";
  }

  if (clothingUvLabel) {
    if (uv !== null) {
      clothingUvLabel.textContent = `UV - ${getUvBandLabel(uv)}`;
    } else {
      clothingUvLabel.textContent = "UV level: not available";
    }
  }
}

function initUvFromStorage() {
  const uv = getCurrentUV();
  updateUvDisplays(uv);

  if (uv !== null) {
    const uvInput = document.getElementById("uvInput");
    if (uvInput) {
      uvInput.value = uv;
    }
  }
}

function useCurrentUV() {
  const uv = getCurrentUV();

  if (uv === null) {
    alert("No UV data found. Visit the UV Dashboard first.");
    return;
  }

  const uvInput = document.getElementById("uvInput");
  if (uvInput) {
    uvInput.value = uv;
  }

  updateUvDisplays(uv);

  const clothingSource = document.getElementById("clothingSourceText");
  if (clothingSource) {
    clothingSource.textContent =
      "Clothing based on current UV from the dashboard.";
  }

  renderClothingAdvice(uv);
}

function selectSkinType(type) {
  document.getElementById("skinType").value = type;

  const tiles = document.querySelectorAll(".skin-tile");
  tiles.forEach(tile => tile.classList.remove("selected"));

  if (tiles[type - 1]) {
    tiles[type - 1].classList.add("selected");
  }
}

/* Calculate Protection using manual or current UV,
   but DO NOT overwrite currentUV in localStorage,
   and DO NOT touch the top-right global badge. */
function calculateDosage() {
  const uvInputEl = document.getElementById("uvInput");
  let uv = uvInputEl ? parseFloat(uvInputEl.value) : NaN;
  const bodyArea = document.getElementById("bodyArea").value;
  const skinType = document.getElementById("skinType").value;
  const result = document.getElementById("dosageResult");

  if (isNaN(uv)) {
    uv = getCurrentUV();
  }

  if (uv === null || isNaN(uv)) {
    result.textContent =
      "No UV value available. Visit the UV Dashboard or enter UV manually.";
    return;
  }

  if (!skinType) {
    result.textContent =
      "Please select your skin type.";
    return;
  }

  let amount = "";
  let spf = "SPF 30";
  let reapply = "Every 2 hours";

  if (bodyArea === "face") {
    amount = "1 teaspoon for face and neck";
  } else if (bodyArea === "arms") {
    amount = "1.5 teaspoons for face and arms";
  } else {
    amount = "3 teaspoons for exposed body areas";
  }

  if (skinType === "1" || skinType === "2") {
    spf = "SPF 50+";
  } else if (skinType === "3" || skinType === "4") {
    spf = "SPF 30+ to SPF 50";
  } else {
    spf = "SPF 30";
  }

  if (uv >= 8) {
    spf = "SPF 50+";
    reapply = "Every 2 hours";
  } else if (uv >= 6) {
    reapply = "Every 2 hours";
  } else if (uv >= 3) {
    reapply = "Every 3 hours";
  } else {
    reapply = "As needed";
  }

  result.innerHTML = `
    <strong>UV level used:</strong> ${uv}<br><br>
    <strong>Recommended SPF:</strong> ${spf}<br><br>
    <strong>Suggested amount:</strong> ${amount}<br><br>
    <strong>Reapply:</strong> ${reapply}
  `;

  // Do NOT touch localStorage.currentUV here.
  // Do NOT call updateUvDisplays(uv) - global "Current UV" stays old.

  const clothingSource = document.getElementById("clothingSourceText");
  if (clothingSource) {
    clothingSource.textContent =
      "Clothing based on the UV you entered above.";
  }

  renderClothingAdvice(uv);
}

/* clothing advice logic */
function getClothingAdviceForUv(uv) {
  const value = Number(uv);
  if (!Number.isFinite(value)) {
    return null;
  }

  if (value <= 2) {
    return {
      label: `UV - Low`,
      top: "Normal everyday top is fine. Light long-sleeve optional if you burn easily.",
      bottom: "Any comfortable pants or shorts.",
      hat: "Hat optional and wear one if you prefer extra shade.",
      sunglasses: "Sunglasses if it's bright or for eye comfort.",
      extra: "Sun protection is still useful for prolonged outdoor time."
    };
  } else if (value <= 5) {
    return {
      label: `UV - Moderate`,
      top: "Lightweight long-sleeve shirt or t-shirt that covers shoulders.",
      bottom: "Long pants or knee-length shorts/skirt.",
      hat: "Broad-brim hat or cap with good shade over face and neck.",
      sunglasses: "UV-rated sunglasses (category 2-3).",
      extra: "Seek shade in the middle of the day and apply sunscreen to exposed skin."
    };
  } else if (value <= 7) {
    return {
      label: `UV - High`,
      top: "Long-sleeve top made from tightly woven or UPF 30+ fabric.",
      bottom: "Long pants or leggings and avoid very short shorts.",
      hat: "Broad-brim or legionnaire hat that covers ears and neck.",
      sunglasses: "Wraparound UV-rated sunglasses.",
      extra: "Limit time in direct sun around midday and reapply sunscreen regularly."
    };
  } else {
    return {
      label: `UV - Very high / Extreme`,
      top: "UPF 50+ long-sleeve top or rash vest and high neck if possible.",
      bottom: "Full-length pants or leggings and for swimming, longer swim shorts.",
      hat: "Broad-brim or legionnaire hat at all times outdoors.",
      sunglasses: "High quality wraparound sunglasses with 100% UV protection.",
      extra: "Avoid midday sun where possible and stay in shade and reapply SPF 50+ every 2 hours."
    };
  }
}

function renderClothingAdvice(uv) {
  const labelEl = document.getElementById("clothingUvLabel");
  const topEl = document.getElementById("wearTopText");
  const bottomEl = document.getElementById("wearBottomText");
  const hatEl = document.getElementById("wearHatText");
  const sunglassesEl = document.getElementById("wearSunglassesText");
  const extraEl = document.getElementById("wearExtraText");

  if (!labelEl || !topEl || !bottomEl || !hatEl || !sunglassesEl || !extraEl) {
    return;
  }

  if (uv === null || isNaN(uv)) {
    labelEl.textContent = "UV level: not available";
    topEl.textContent =
      "Visit the UV Dashboard or enter a UV value to see clothing suggestions.";
    bottomEl.textContent = "";
    hatEl.textContent = "";
    sunglassesEl.textContent = "";
    extraEl.textContent = "";
    return;
  }

  const advice = getClothingAdviceForUv(uv);
  if (!advice) {
    labelEl.textContent = `UV level: ${uv}`;
    topEl.textContent = "No clothing advice available for this value.";
    bottomEl.textContent = "";
    hatEl.textContent = "";
    sunglassesEl.textContent = "";
    extraEl.textContent = "";
    return;
  }

  labelEl.textContent = advice.label;
  topEl.textContent = advice.top;
  bottomEl.textContent = advice.bottom;
  hatEl.textContent = advice.hat;
  sunglassesEl.textContent = advice.sunglasses;
  extraEl.textContent = advice.extra;
}

/* init */
window.onload = function () {
  initUvFromStorage();
  const uv = getCurrentUV();
  if (uv !== null) {
    renderClothingAdvice(uv);
  }
};
