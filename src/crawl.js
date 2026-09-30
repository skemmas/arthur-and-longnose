/**
 * Crawl Controller: smooth upward vertical text crawl with full physics,
 * pointer dragging, keyboard nudging, and responsive auto-resizing.
 */

export function initCrawl() {
  const crawl = document.getElementById("crawl");
  const text = document.getElementById("crawlText");
  if (!crawl || !text) return;

  const SPEED_PER_EM = 1.55;
  const reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const canAnimate = typeof text.animate === "function";

  let anim = null;
  let duration = 0;
  let userPaused = false;
  let isHovered = false;
  let lastKey = "";

  function pxPerSecond() {
    const fs = parseFloat(window.getComputedStyle(text).fontSize) || 16;
    return fs * SPEED_PER_EM;
  }

  function wrapTime(t) {
    return ((t % duration) + duration) % duration;
  }

  function isStatic() {
    return !canAnimate || (reduceMq && reduceMq.matches);
  }

  function build() {
    const winH = crawl.clientHeight;
    const contentH = text.offsetHeight;
    if (!winH || !contentH) return;

    const key = `${winH}|${contentH}|${text.offsetWidth}`;
    if (anim && key === lastKey) return;
    lastKey = key;

    let progress = null;
    if (anim && duration) {
      progress = wrapTime(anim.currentTime || 0) / duration;
      anim.cancel();
    }

    const startY = winH;
    const endY = -contentH;
    const distance = startY - endY;
    duration = (distance / pxPerSecond()) * 1000;

    anim = text.animate(
      [
        { transform: `translate3d(0,${startY}px,0)` },
        { transform: `translate3d(0,${endY}px,0)` }
      ],
      { duration, iterations: Infinity, easing: "linear" }
    );

    // Initial position starts nicely placed
    if (progress === null) {
      progress = (winH * 0.75) / distance;
    }
    anim.currentTime = progress * duration;

    if (userPaused || isHovered || document.hidden) {
      anim.pause();
    }
    text.classList.add("is-ready");
  }

  function stopAnimation() {
    if (anim) anim.cancel();
    anim = null;
    lastKey = "";
  }

  function applyMode() {
    if (isStatic()) {
      stopAnimation();
      crawl.classList.add("is-static");
      text.classList.add("is-ready");
    } else {
      crawl.classList.remove("is-static");
      build();
    }
  }

  function nudge(px) {
    if (!anim || !duration) return;
    const dt = (px / pxPerSecond()) * 1000;
    anim.currentTime = wrapTime((anim.currentTime || 0) + dt);
  }

  // Pointer dragging / wheel nudging
  let isPointerDown = false;
  let startY = 0;
  let lastY = 0;

  crawl.addEventListener("pointerdown", (e) => {
    isPointerDown = true;
    startY = e.clientY;
    lastY = e.clientY;
    if (anim) anim.pause();
  });

  window.addEventListener("pointermove", (e) => {
    if (!isPointerDown) return;
    const deltaY = lastY - e.clientY;
    lastY = e.clientY;
    nudge(deltaY);
  });

  window.addEventListener("pointerup", () => {
    if (!isPointerDown) return;
    isPointerDown = false;
    if (!userPaused && !isHovered && anim) {
      anim.play();
    }
  });

  // Mouse wheel nudging
  crawl.addEventListener("wheel", (e) => {
    e.preventDefault();
    nudge(e.deltaY * 0.4);
  }, { passive: false });

  // Hover to pause so readers can easily read
  crawl.addEventListener("mouseenter", () => {
    isHovered = true;
    if (anim) anim.pause();
  });

  crawl.addEventListener("mouseleave", () => {
    isHovered = false;
    if (!userPaused && !isPointerDown && anim) {
      anim.play();
    }
  });

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea") return;

    const step = 40;
    switch (e.key) {
      case " ":
        e.preventDefault();
        userPaused = !userPaused;
        if (anim) {
          if (userPaused) anim.pause();
          else anim.play();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        nudge(step);
        break;
      case "ArrowUp":
        e.preventDefault();
        nudge(-step);
        break;
      case "PageDown":
        e.preventDefault();
        nudge(crawl.clientHeight * 0.8);
        break;
      case "PageUp":
        e.preventDefault();
        nudge(-crawl.clientHeight * 0.8);
        break;
    }
  });

  // Visibility changes
  document.addEventListener("visibilitychange", () => {
    if (!anim) return;
    if (document.hidden) anim.pause();
    else if (!userPaused && !isHovered) anim.play();
  });

  // Responsive observation
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(() => {
      build();
    });
    ro.observe(crawl);
    ro.observe(text);
  }

  window.addEventListener("resize", build);
  window.addEventListener("orientationchange", build);

  if (reduceMq) {
    if (reduceMq.addEventListener) reduceMq.addEventListener("change", applyMode);
    else if (reduceMq.addListener) reduceMq.addListener(applyMode);
  }

  applyMode();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(build);
  }
}
