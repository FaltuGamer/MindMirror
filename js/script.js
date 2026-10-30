const moods = [
  ["😊", "Happy"],
  ["😌", "Calm"],
  ["😐", "Neutral"],
  ["😔", "Sad"],
  ["😡", "Angry"]
];

const reasons = [
  "Study", "Family", "Career", "Love",
  "Friends", "Health", "Money", "Other"
];

let selectedMood = "Happy";
let selectedReason = "Study";

const $ = id => document.getElementById(id);

function getData() {
  return JSON.parse(localStorage.getItem("mindmirror_entries") || "[]");
}

function saveData(data) {
  localStorage.setItem("mindmirror_entries", JSON.stringify(data));
}

function renderChoices() {
  $("moods").innerHTML = moods.map((m, i) => `
    <button class="mood ${i === 0 ? "active" : ""}" data-mood="${m[1]}">
      <span class="emoji">${m[0]}</span>
      <span>${m[1]}</span>
    </button>
  `).join("");

  $("reasons").innerHTML = reasons.map((r, i) => `
    <button class="reason ${i === 0 ? "active" : ""}" data-reason="${r}">
      ${r}
    </button>
  `).join("");

  document.querySelectorAll("[data-mood]").forEach(button => {
    button.addEventListener("click", () => {
      selectedMood = button.dataset.mood;
      document.querySelectorAll("[data-mood]").forEach(x => x.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelectorAll("[data-reason]").forEach(button => {
    button.addEventListener("click", () => {
      selectedReason = button.dataset.reason;
      document.querySelectorAll("[data-reason]").forEach(x => x.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");

  setTimeout(() => {
    $("toast").classList.remove("show");
  }, 2200);
}

function moodEmoji(mood) {
  return moods.find(item => item[1] === mood)?.[0] || "🪞";
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function generateInsight(data) {
  if (!data.length) {
    return "Save your first reflection and MindMirror will create a gentle insight from your recent entries.";
  }

  const average = data.reduce((sum, item) => sum + item.energy, 0) / data.length;
  const counts = {};

  data.forEach(item => {
    counts[item.mood] = (counts[item.mood] || 0) + 1;
  });

  const topMood = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];

  if (average >= 75) {
    return `Your recent energy is strong, averaging ${Math.round(average)}%. Your most common mood is ${moodEmoji(topMood)} ${topMood}. Keep noticing what helps you feel this steady.`;
  }

  if (average < 45) {
    return `Your recent energy is around ${Math.round(average)}%. Your most common mood is ${moodEmoji(topMood)} ${topMood}. A slower day, rest, or a small supportive activity may be worth making space for.`;
  }

  return `Your recent energy averages ${Math.round(average)}%. ${moodEmoji(topMood)} ${topMood} appears most often. Notice which people, places, and activities show up on your better days.`;
}

function calculateStreak(data) {
  if (!data.length) return 0;

  const days = new Set(
    data.map(item => new Date(item.date).toISOString().slice(0, 10))
  );

  let date = new Date();
  let streak = 0;

  while (days.has(date.toISOString().slice(0, 10))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

function escapeHTML(text) {
  return text.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[character]));
}

function render() {
  const data = getData().sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  $("entries").textContent = data.length;

  $("avgEnergy").textContent = data.length
    ? Math.round(
        data.reduce((sum, item) => sum + item.energy, 0) / data.length
      ) + "%"
    : "—";

  const counts = {};
  data.forEach(item => {
    counts[item.mood] = (counts[item.mood] || 0) + 1;
  });

  const topMood = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  $("topMood").textContent = topMood
    ? `${moodEmoji(topMood)} ${topMood}`
    : "—";

  $("streak").textContent = `${calculateStreak(data)} 🔥`;
  $("insight").textContent = generateInsight(data);

  $("diary").innerHTML = data.length
    ? data.slice(0, 12).map(item => `
      <article class="entry">
        <div class="entry-top">
          <strong>${moodEmoji(item.mood)} ${item.mood}</strong>
          <span class="entry-date">${formatDate(item.date)}</span>
        </div>

        <div style="margin-top:7px">
          <span class="tag">${item.reason}</span>
          <span class="tag">Energy ${item.energy}%</span>
        </div>

        ${
          item.thoughts
            ? `<p class="entry-text">${escapeHTML(item.thoughts)}</p>`
            : ""
        }
      </article>
    `).join("")
    : `<div class="empty">No reflections yet. Your first check-in will appear here.</div>`;

  drawChart(data);
}

function drawChart(data) {
  const canvas = $("chart");
  const context = canvas.getContext("2d");

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const scale = window.devicePixelRatio || 1;

  canvas.width = width * scale;
  canvas.height = height * scale;
  context.setTransform(scale, 0, 0, scale, 0, 0);

  context.clearRect(0, 0, width, height);

  const now = new Date();
  const values = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);

    const key = date.toISOString().slice(0, 10);

    const found = data.find(
      item => new Date(item.date).toISOString().slice(0, 10) === key
    );

    values.push(found?.energy ?? null);
  }

  const padding = 22;

  context.strokeStyle =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--border");

  context.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const y = padding + (height - padding * 2) * i / 3;

    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  context.strokeStyle =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--accent");

  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";

  let started = false;

  values.forEach((value, index) => {
    if (value === null) {
      started = false;
      return;
    }

    const x = padding + (width - padding * 2) * index / 6;
    const y = height - padding -
      (height - padding * 2) * value / 100;

    if (!started) {
      context.beginPath();
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  });

  context.stroke();

  values.forEach((value, index) => {
    if (value === null) return;

    const x = padding + (width - padding * 2) * index / 6;
    const y = height - padding -
      (height - padding * 2) * value / 100;

    context.fillStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--surface");

    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent");

    context.lineWidth = 2;
    context.stroke();
  });
}

$("energy").addEventListener("input", event => {
  $("energyValue").textContent = `${event.target.value}%`;
});

$("saveBtn").addEventListener("click", () => {
  const thoughts = $("thoughts").value.trim();
  const data = getData();

  data.push({
    date: new Date().toISOString(),
    mood: selectedMood,
    energy: Number($("energy").value),
    reason: selectedReason,
    thoughts
  });

  saveData(data);

  $("thoughts").value = "";

  showToast("Reflection saved to your mirror ✨");
  render();
});

$("clearBtn").addEventListener("click", () => {
  if (confirm("Delete all saved reflections from this browser?")) {
    localStorage.removeItem("mindmirror_entries");
    render();
    showToast("Reflections cleared");
  }
});

$("today").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long"
});

renderChoices();
render();

window.addEventListener("resize", () => {
  drawChart(getData());
});
