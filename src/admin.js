import confetti from "canvas-confetti";
import { saveCA, MASTER_PASSCODE } from "./firebase.js";

export function initSecretAdmin(onSuccess) {
  // Key sequence buffer
  const keyBuffer = [];
  const secretSequences = [
    ["j", "k", "l"],
    ["f", "u", "k", "u"]
  ];

  // Create modal element in DOM (hidden by default)
  const modal = document.createElement("div");
  modal.id = "secretAdminModal";
  modal.className = "secret-modal-backdrop";
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="secret-modal-box">
      <div class="secret-modal-header">
        <span class="secret-tag">ADMIN // RESTRICTED ACCESS</span>
        <button type="button" class="secret-close-btn" id="closeAdminBtn" aria-label="Close">&times;</button>
      </div>
      <p class="secret-modal-desc">
        Update the Solana Contract Address across all live instances.
      </p>
      <form id="secretAdminForm" class="secret-form">
        <div class="secret-field">
          <label for="adminPasscode">AUTHENTICATION PASSCODE</label>
          <input type="password" id="adminPasscode" placeholder="••••••••" autocomplete="off" required />
        </div>
        <div class="secret-field">
          <label for="adminCA">NEW CONTRACT ADDRESS (CA)</label>
          <input type="text" id="adminCA" placeholder="e.g. 9GzX7W3dRtQp1aZ4mN8vK2xL6bYjEwF5tCuS1pump" required spellcheck="false" />
        </div>
        <div id="adminStatusMsg" class="secret-status-msg"></div>
        <div class="secret-actions">
          <button type="submit" id="adminSubmitBtn" class="secret-btn-submit">
            UPDATE ONCHAIN CA
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = document.getElementById("secretAdminForm");
  const closeBtn = document.getElementById("closeAdminBtn");
  const passInput = document.getElementById("adminPasscode");
  const caInput = document.getElementById("adminCA");
  const statusMsg = document.getElementById("adminStatusMsg");
  const submitBtn = document.getElementById("adminSubmitBtn");

  function openModal() {
    modal.style.display = "flex";
    passInput.value = "";
    const activeCA = document.getElementById("caText")?.dataset.ca || "";
    caInput.value = activeCA;
    statusMsg.textContent = "";
    statusMsg.className = "secret-status-msg";
    setTimeout(() => passInput.focus(), 50);
  }

  function closeModal() {
    modal.style.display = "none";
    passInput.value = "";
    statusMsg.textContent = "";
  }

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Secret keystroke listener
  window.addEventListener("keydown", (e) => {
    // If inside an active text input, don't track unless Ctrl+Shift+L
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    const isTyping = tag === "input" || tag === "textarea";

    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      openModal();
      return;
    }

    if (e.key === "Escape" && modal.style.display === "flex") {
      closeModal();
      return;
    }

    if (isTyping) return;

    keyBuffer.push(e.key.toLowerCase());
    if (keyBuffer.length > 8) keyBuffer.shift();

    for (const seq of secretSequences) {
      const slice = keyBuffer.slice(-seq.length);
      if (slice.join("") === seq.join("")) {
        openModal();
        keyBuffer.length = 0;
        break;
      }
    }
  });

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredPass = passInput.value.trim();
    const enteredCA = caInput.value.trim();

    if (enteredPass !== MASTER_PASSCODE) {
      statusMsg.textContent = "ERR: Invalid authorization passcode.";
      statusMsg.className = "secret-status-msg is-error";
      return;
    }

    if (!enteredCA || enteredCA.length < 20) {
      statusMsg.textContent = "ERR: Invalid Solana Contract Address format.";
      statusMsg.className = "secret-status-msg is-error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "COMMITTING TO FIREBASE...";
    statusMsg.textContent = "";

    try {
      await saveCA(enteredCA);
      statusMsg.textContent = "SUCCESS: Contract Address updated successfully!";
      statusMsg.className = "secret-status-msg is-success";

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#AA936F", "#515042", "#211F19", "#E6DFC8"]
      });

      if (onSuccess) onSuccess(enteredCA);

      setTimeout(() => {
        closeModal();
        submitBtn.disabled = false;
        submitBtn.textContent = "UPDATE ONCHAIN CA";
      }, 1400);
    } catch (err) {
      console.error("Admin save error:", err);
      statusMsg.textContent = "ERR: " + (err.message || "Failed to update Firestore");
      statusMsg.className = "secret-status-msg is-error";
      submitBtn.disabled = false;
      submitBtn.textContent = "UPDATE ONCHAIN CA";
    }
  });
}
