import { initAudio } from "./audio.js";
import { initCrawl } from "./crawl.js";
import { initSecretAdmin } from "./admin.js";
import { subscribeToCA, DEFAULT_CA } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const caBar = document.getElementById("caBar");
  const caText = document.getElementById("caText");
  const caCopyIndicator = document.getElementById("caCopyIndicator");
  const figureContainer = document.getElementById("figureContainer");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const charArthur = document.getElementById("charArthur");
  const charLongnose = document.getElementById("charLongnose");
  const speechArthur = document.getElementById("speechArthur");
  const speechLongnose = document.getElementById("speechLongnose");

  let currentCA = DEFAULT_CA;

  // 1. Initialize Engines
  initAudio();
  initCrawl();
  initSecretAdmin((newCA) => {
    updateCA(newCA);
  });

  // 2. Real-time Firebase Firestore Sync
  try {
    const cached = localStorage.getItem("arthur_longnose_ca");
    if (cached && cached.length > 15) {
      updateCA(cached);
    }
  } catch {}

  subscribeToCA((liveCA) => {
    updateCA(liveCA);
    try {
      localStorage.setItem("arthur_longnose_ca", liveCA);
    } catch {}
  });

  function updateCA(ca) {
    currentCA = ca;
    if (caText) {
      caText.textContent = ca.slice(0, 4) + "..." + ca.slice(-4);
      caText.dataset.ca = ca;
      caText.title = ca;
    }
  }

  // 3. Copy CA on Click
  if (caBar) {
    caBar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(currentCA);
        if (caCopyIndicator) {
          const orig = caCopyIndicator.textContent;
          caCopyIndicator.textContent = "COPIED!";
          caCopyIndicator.style.background = "#2b8a3e";
          setTimeout(() => {
            caCopyIndicator.textContent = orig;
            caCopyIndicator.style.background = "";
          }, 1500);
        }
      } catch (err) {
        console.warn("Clipboard copy fallback:", err);
      }
    });
  }

  // 4. Character View Switcher Tabs
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const mode = btn.dataset.mode;
      figureContainer.className = "figure-container " + (mode ? `mode-${mode}` : "mode-duo");
    });
  });

  // 5. Easter Eggs & Quotes
  const arthurQuotes = [
    "Arthur: Diamond hands never waver.",
    "Arthur: 1996 till the end of time.",
    "Arthur: Red candles compress carbon into diamonds.",
    "Arthur: D.W. told me to sell at 10k. I said no.",
    "Arthur: Aardvarks dig until they strike bedrock.",
    "Arthur: Clenched fists, clear vision."
  ];

  const longnoseQuotes = [
    "Longnose: I smell 3am liquidity.",
    "Longnose: Going long on the weirdos.",
    "Longnose: The shorter the timeframe, the louder the noise.",
    "Longnose: The nose knows before the charts do.",
    "Longnose: The internet moves fast, we move long.",
    "Longnose: Still holding since block zero."
  ];

  let arthurQuoteIdx = 0;
  let longnoseQuoteIdx = 0;
  let arthurTimer = null;
  let longnoseTimer = null;

  function spawnSparkles(el) {
    const rect = el.getBoundingClientRect();
    const symbols = ["✦", "✧", "💎", "✨"];
    for (let i = 0; i < 6; i++) {
      const sp = document.createElement("span");
      sp.className = "sparkle-fx";
      sp.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      sp.style.left = `${Math.random() * 80 + 10}%`;
      sp.style.top = `${Math.random() * 80 + 10}%`;
      sp.style.setProperty("--tx", `${(Math.random() - 0.5) * 80}px`);
      sp.style.setProperty("--ty", `${-Math.random() * 60 - 20}px`);
      el.appendChild(sp);
      setTimeout(() => sp.remove(), 800);
    }
  }

  if (charArthur) {
    charArthur.addEventListener("click", (e) => {
      e.stopPropagation();
      spawnSparkles(charArthur);
      speechArthur.textContent = arthurQuotes[arthurQuoteIdx % arthurQuotes.length];
      arthurQuoteIdx++;
      speechArthur.classList.add("is-visible");
      clearTimeout(arthurTimer);
      arthurTimer = setTimeout(() => {
        speechArthur.classList.remove("is-visible");
      }, 2400);
    });
  }

  if (charLongnose) {
    charLongnose.addEventListener("click", (e) => {
      e.stopPropagation();
      speechLongnose.textContent = longnoseQuotes[longnoseQuoteIdx % longnoseQuotes.length];
      longnoseQuoteIdx++;
      speechLongnose.classList.add("is-visible");
      clearTimeout(longnoseTimer);
      longnoseTimer = setTimeout(() => {
        speechLongnose.classList.remove("is-visible");
      }, 2400);
    });
  }
});
