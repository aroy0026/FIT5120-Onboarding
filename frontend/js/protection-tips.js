function getCurrentUV() {
  const uv = localStorage.getItem("currentUV");
  if (uv) return Number(uv);
  return null;
}

function updateCurrentUVDisplay() {
  const uv = getCurrentUV();
  const text = uv ? `Current UV: ${uv}` : "Current UV: Not available";

  document.getElementById("currentUvDosage").textContent = text;
  document.getElementById("currentUvReminder").textContent = text;
}

function useCurrentUV() {
  const uv = getCurrentUV();
  if (uv === null) {
    alert("No UV data found. Visit dashboard first.");
    return;
  }

  document.getElementById("uvInput").value = uv;
}

function calculateDosage() {
  const uv = Number(document.getElementById("uvInput").value);
  const bodyArea = document.getElementById("bodyArea").value;

  const result = document.getElementById("dosageResult");

  if (!uv) {
    result.textContent = "Please enter a UV level.";
    return;
  }

  let message;

  if (uv <= 2) message = "Light protection recommended.";
  else if (uv <= 5) message = "Moderate sunscreen use.";
  else if (uv <= 7) message = "Generous sunscreen recommended.";
  else message = "High sunscreen protection required.";

  result.textContent = message + " Area: " + bodyArea;
}

function openReminderModal() {
  document.getElementById("reminderModal").classList.add("show");
}

function closeReminderModal() {
  document.getElementById("reminderModal").classList.remove("show");
}

function saveReminder() {
  const email = document.getElementById("reminderEmail").value;
  const time = document.getElementById("reminderTime").value;

  if (!email || !time) {
    alert("Please enter email and time.");
    return;
  }

  const reminders = JSON.parse(localStorage.getItem("reminders")) || [];

  reminders.push({
    email,
    time
  });

  localStorage.setItem("reminders", JSON.stringify(reminders));

  alert("Reminder saved.");

  closeReminderModal();
}

window.onload = updateCurrentUVDisplay;