function getCurrentUV() {
  const uv = localStorage.getItem("currentUV");

  if (uv !== null && uv !== "") {
    return Number(uv);
  }

  return null;
}

function updateCurrentUVDisplay() {
  const uv = getCurrentUV();
  const text = uv !== null ? `Current UV: ${uv}` : "Current UV: Not available";

  document.getElementById("currentUvDosage").textContent = text;
  document.getElementById("currentUvReminder").textContent = text;

  if (uv !== null) {
    document.getElementById("uvInput").value = uv;
  }
}

function useCurrentUV() {
  const uv = getCurrentUV();

  if (uv === null) {
    alert("No UV data found. Visit the UV Dashboard first.");
    return;
  }

  document.getElementById("uvInput").value = uv;
  renderClothingAdviceFromCurrentUV();
}

function selectSkinType(type) {
  document.getElementById("skinType").value = type;

  const tiles = document.querySelectorAll(".skin-tile");
  tiles.forEach(tile => tile.classList.remove("selected"));

  if (tiles[type - 1]) {
    tiles[type - 1].classList.add("selected");
  }
}

function calculateDosage() {
  let uv = parseFloat(document.getElementById("uvInput").value);
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

  /* body area dosage */
  if (bodyArea === "face") {
    amount = "1 teaspoon for face and neck";
  } else if (bodyArea === "arms") {
    amount = "1.5 teaspoons for face and arms";
  } else {
    amount = "3 teaspoons for exposed body areas";
  }

  /* skin type SPF */
  if (skinType === "1" || skinType === "2") {
    spf = "SPF 50+";
  } else if (skinType === "3" || skinType === "4") {
    spf = "SPF 30+ to SPF 50";
  } else {
    spf = "SPF 30";
  }

  /* UV strength adjustment */
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

  localStorage.setItem("currentUV", uv);
  renderClothingAdviceFromCurrentUV();
}

function openReminderModal() {
  document.getElementById("reminderModal").classList.add("show");
}

function closeReminderModal() {
  document.getElementById("reminderModal").classList.remove("show");
}

function getReminderIntervalByUv(uv) {
  if (uv <= 2) return 4;
  if (uv <= 5) return 3;
  if (uv <= 7) return 2;
  return 1;
}

function suggestReminderInterval() {
  const uv = getCurrentUV();
  const suggestionBox = document.getElementById("reminderSuggestion");

  if (uv === null) {
    suggestionBox.textContent =
      "No UV data available. Visit the UV Dashboard first.";
    return;
  }

  const intervalHours = getReminderIntervalByUv(uv);

  suggestionBox.textContent =
    `Suggested reminder interval: every ${intervalHours} hour(s) based on UV ${uv}.`;
}

function getSavedReminders() {
  return JSON.parse(localStorage.getItem("reminders")) || [];
}

function setSavedReminders(reminders) {
  localStorage.setItem("reminders", JSON.stringify(reminders));
}

function saveReminder() {
  const email = document.getElementById("reminderEmail").value.trim();
  const reminderTime = document.getElementById("reminderTime").value;
  const uv = getCurrentUV();
  const result = document.getElementById("reminderResult");

  if (!email || !reminderTime) {
    result.textContent =
      "Please enter email and reminder time.";
    return;
  }

  if (uv === null) {
    result.textContent =
      "No UV data found. Visit the UV Dashboard first.";
    return;
  }

  const repeatIntervalHours = getReminderIntervalByUv(uv);

  const reminder = {
    id: Date.now(),
    email,
    reminderTime,
    uvLevel: uv,
    repeatIntervalHours
  };

  const reminders = getSavedReminders();
  reminders.push(reminder);
  setSavedReminders(reminders);

  result.textContent =
    `Reminder saved for ${email} at ${formatDateTime(reminderTime)}. Repeats every ${repeatIntervalHours} hour(s).`;

  renderReminderList();
  scheduleReminder(reminder);
  closeReminderModal();

  document.getElementById("reminderEmail").value = "";
  document.getElementById("reminderTime").value = "";
}

function renderReminderList() {
  const reminderList = document.getElementById("reminderList");
  const reminders = getSavedReminders();

  if (reminders.length === 0) {
    reminderList.innerHTML =
      "No reminders saved yet.";
    return;
  }

  reminderList.innerHTML = reminders.map(reminder => {
    const dateText =
      reminder.reminderTime
        ? formatDateTime(reminder.reminderTime)
        : "Not specified";

    const uvText =
      reminder.uvLevel ?? "Unknown";

    const repeatText =
      reminder.repeatIntervalHours ?? "Unknown";

    return `
      <div class="list-item">
        <strong>Email:</strong> ${reminder.email}<br>
        <strong>First reminder:</strong> ${dateText}<br>
        <strong>UV level:</strong> ${uvText}<br>
        <strong>Repeat interval:</strong> every ${repeatText} hour(s)
      </div>
    `;
  }).join("");
}

function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);

  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

let reminderTimers = [];

function scheduleReminder(reminder) {
  const firstTime = new Date(reminder.reminderTime).getTime();
  const now = Date.now();

  const delay = firstTime - now;

  if (delay <= 0) {
    return;
  }

  const firstTimer = setTimeout(() => {
    sendReminderNotification(reminder);

    const repeatTimer = setInterval(() => {
      sendReminderNotification(reminder);
    }, reminder.repeatIntervalHours * 60 * 60 * 1000);

    reminderTimers.push(repeatTimer);
  }, delay);

  reminderTimers.push(firstTimer);
}

function sendReminderNotification(reminder) {
  console.log(
    `Reminder for ${reminder.email}: Time to reapply sunscreen.`
  );
}

function loadAndScheduleReminders() {
  const reminders = getSavedReminders();

  reminders.forEach(reminder => {
    if (reminder.reminderTime) {
      scheduleReminder(reminder);
    }
  });

  renderReminderList();
}

/* --- Clothing advice based on UV --- */

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

function renderClothingAdviceFromCurrentUV() {
  const uv = getCurrentUV();
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
    topEl.textContent = "Visit the UV Dashboard or enter a UV value to see clothing suggestions.";
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

/* --- Init --- */

window.onload = function () {
  updateCurrentUVDisplay();
  loadAndScheduleReminders();
  renderClothingAdviceFromCurrentUV();
};
