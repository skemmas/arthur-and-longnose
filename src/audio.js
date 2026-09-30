/**
 * Audio Engine: Supports /music.mp3 with fallback to procedural warm ambient synth
 */

export function initAudio() {
  const audio = document.getElementById("audio");
  const player = document.getElementById("player");
  const playBtn = document.getElementById("playBtn");
  const muteBtn = document.getElementById("muteBtn");
  const seekEl = document.getElementById("seek");
  const volEl = document.getElementById("vol");

  const VOL_KEY = "arthur-longnose-volume";

  let synthActive = false;
  let audioCtx = null;
  let synthGain = null;
  let synthOscs = [];
  let isMuted = false;

  function readStoredVolume() {
    try {
      const v = parseFloat(window.localStorage.getItem(VOL_KEY));
      if (!isNaN(v) && v >= 0 && v <= 1) return v;
    } catch {
      // ignore
    }
    return 0.7;
  }

  function storeVolume(v) {
    try {
      window.localStorage.setItem(VOL_KEY, String(v));
    } catch {
      // ignore
    }
  }

  const initialVol = readStoredVolume();
  audio.loop = true;
  audio.volume = initialVol;

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function hasDuration() {
    return isFinite(audio.duration) && audio.duration > 0;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function makeSlider(el, opts) {
    let dragging = false;

    function fracFromEvent(e) {
      const r = el.getBoundingClientRect();
      return clamp01((e.clientX - r.left) / (r.width || 1));
    }

    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      el.classList.add("is-dragging");
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      opts.set(fracFromEvent(e));
      e.preventDefault();
    });

    el.addEventListener("pointermove", (e) => {
      if (dragging) opts.set(fracFromEvent(e));
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (e.type === "pointerup") opts.set(fracFromEvent(e), true);
      if (opts.end) opts.end();
    }

    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);

    el.addEventListener("keydown", (e) => {
      let f = opts.get();
      const s = opts.step;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          f += s;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          f -= s;
          break;
        case "PageUp":
          f += s * 4;
          break;
        case "PageDown":
          f -= s * 4;
          break;
        case "Home":
          f = 0;
          break;
        case "End":
          f = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      opts.set(clamp01(f), true);
    });

    return {
      render(f, valueText) {
        f = clamp01(f);
        el.style.setProperty("--p", f.toFixed(4));
        el.setAttribute("aria-valuenow", String(Math.round(f * 100)));
        if (valueText) el.setAttribute("aria-valuetext", valueText);
      },
      isDragging() {
        return dragging;
      }
    };
  }

  // Seek Slider
  let seekFrac = 0;
  const seek = makeSlider(seekEl, {
    step: 0.02,
    get() {
      return hasDuration() ? audio.currentTime / audio.duration : 0;
    },
    set(f) {
      if (!hasDuration()) return;
      seekFrac = f;
      audio.currentTime = f * audio.duration;
      renderSeek();
    }
  });

  function renderSeek() {
    let f = 0;
    if (hasDuration()) {
      f = seek.isDragging() ? seekFrac : audio.currentTime / audio.duration;
      seek.render(f, fmt(audio.currentTime) + " of " + fmt(audio.duration));
    } else {
      // In procedural synth mode, animate a slow breathing bar
      if (synthActive) {
        f = (Math.sin(Date.now() / 4000) + 1) / 2;
        seek.render(f, "Ambient Mode");
      } else {
        seek.render(0, "0:00");
      }
    }
  }

  // Volume Slider
  const vol = makeSlider(volEl, {
    step: 0.05,
    get() {
      return isMuted ? 0 : audio.volume;
    },
    set(f, final) {
      audio.volume = f;
      isMuted = f === 0;
      audio.muted = isMuted;
      if (synthGain && audioCtx) {
        synthGain.gain.setValueAtTime(isMuted ? 0 : f * 0.15, audioCtx.currentTime);
      }
      if (final && f > 0) storeVolume(f);
      renderVolume();
    }
  });

  function renderVolume() {
    const level = isMuted ? 0 : audio.volume;
    vol.render(level, Math.round(level * 100) + " percent");
    const silent = isMuted || audio.volume === 0;
    player.classList.toggle("is-muted", silent);
    muteBtn.setAttribute("aria-label", silent ? "unmute" : "mute");
    muteBtn.setAttribute("aria-pressed", silent ? "true" : "false");
  }

  muteBtn.addEventListener("click", () => {
    if (isMuted || audio.volume === 0) {
      isMuted = false;
      audio.muted = false;
      if (audio.volume === 0) audio.volume = 0.5;
      if (synthGain && audioCtx) {
        synthGain.gain.setValueAtTime(audio.volume * 0.15, audioCtx.currentTime);
      }
    } else {
      isMuted = true;
      audio.muted = true;
      if (synthGain && audioCtx) {
        synthGain.gain.setValueAtTime(0, audioCtx.currentTime);
      }
    }
    renderVolume();
  });

  // Procedural WebAudio Ambient Synth Fallback
  function startSynthAmbient() {
    if (synthActive) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      synthGain = audioCtx.createGain();
      synthGain.gain.setValueAtTime(isMuted ? 0 : audio.volume * 0.15, audioCtx.currentTime);

      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, audioCtx.currentTime);

      // Warm relaxing frequencies: F3, A3, C4, E4, G4 (Fmaj9 ambient chord)
      const freqs = [174.61, 220.0, 261.63, 329.63, 392.0];
      synthOscs = freqs.map((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f + (Math.random() - 0.5) * 1.5, audioCtx.currentTime);
        osc.connect(filter);
        osc.start();
        return osc;
      });

      filter.connect(synthGain);
      synthGain.connect(audioCtx.destination);
      synthActive = true;
    } catch (err) {
      console.warn("Synth fallback could not start:", err);
    }
  }

  function stopSynthAmbient() {
    if (!synthActive) return;
    try {
      synthOscs.forEach((o) => {
        try {
          o.stop();
          o.disconnect();
        } catch {}
      });
      synthOscs = [];
      if (audioCtx) audioCtx.close();
    } catch {}
    synthActive = false;
  }

  function tryPlay() {
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          stopSynthAmbient();
          renderPlayState();
        })
        .catch(() => {
          // If mp3 play blocked or file not ready, start gentle synth
          startSynthAmbient();
          renderPlayState();
        });
    } else {
      renderPlayState();
    }
  }

  playBtn.addEventListener("click", () => {
    if (!audio.paused || synthActive) {
      audio.pause();
      stopSynthAmbient();
      renderPlayState();
    } else {
      tryPlay();
    }
  });

  let raf = 0;
  function tick() {
    renderSeek();
    const isPlaying = !audio.paused || synthActive;
    raf = isPlaying ? window.requestAnimationFrame(tick) : 0;
  }

  function renderPlayState() {
    const playing = !audio.paused || synthActive;
    player.classList.toggle("is-playing", playing);
    playBtn.setAttribute("aria-label", playing ? "pause" : "play");
    if (playing && !raf) raf = window.requestAnimationFrame(tick);
    if (!playing) renderSeek();
  }

  audio.addEventListener("play", renderPlayState);
  audio.addEventListener("playing", renderPlayState);
  audio.addEventListener("pause", renderPlayState);
  audio.addEventListener("timeupdate", () => {
    if (!raf) renderSeek();
  });
  audio.addEventListener("loadedmetadata", renderSeek);
  audio.addEventListener("durationchange", renderSeek);
  audio.addEventListener("volumechange", renderVolume);

  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    tryPlay();
  });

  renderPlayState();
  renderSeek();
  renderVolume();

  // Try auto start if browser allows
  tryPlay();
}
