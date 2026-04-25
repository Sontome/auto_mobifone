const btnCard = document.getElementById("btn-card");
const btnPromo = document.getElementById("btn-promo");
const modalOverlay = document.getElementById("modal-overlay");
const btnCancel = document.getElementById("btn-cancel");
const btnContinue = document.getElementById("btn-continue");
const modalError = document.getElementById("modal-error");
const toast = document.getElementById("toast");
const promoCodeInput = document.getElementById("promo-code");
const phoneListInput = document.getElementById("phone-list");
const statusPanel = document.getElementById("status-panel");
const progressText = document.getElementById("progress-text");

let toastTimer = null;

btnCard.addEventListener("click", () => {
  showToast("Tính năng Check thẻ cào đang phát triển.", true);
});

btnPromo.addEventListener("click", () => {
  openModal();
});

btnCancel.addEventListener("click", () => {
  closeModal();
});

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

btnContinue.addEventListener("click", async () => {
  hideError();
  const promoCode = promoCodeInput.value.trim();
  const rawPhones = phoneListInput.value || "";

  if (!promoCode) {
    showError("Vui lòng nhập tên gói cước.");
    return;
  }

  const normalizedResult = normalizePhones(rawPhones);
  if (normalizedResult.errors.length > 0) {
    showError(normalizedResult.errors.join(" | "));
    return;
  }

  const phones = normalizedResult.phones;
  if (phones.length === 0) {
    showError("Không có số điện thoại hợp lệ.");
    return;
  }

  setLoadingState(true);
  progressText.textContent = `0/${phones.length}`;
  statusPanel.classList.remove("is-hidden");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_PROMO_CHECK",
      payload: {
        promoCode,
        phones
      }
    });

    if (!response || !response.ok) {
      throw new Error(response?.error || "Không thể khởi chạy tiến trình.");
    }

    showToast(`Đã mở ${response.totalTabs} tab để kiểm tra.`, false);
    closeModal();
  } catch (error) {
    console.error("[popup] START_PROMO_CHECK failed", error);
    showToast(`Lỗi: ${error.message || "Không xác định"}`, true);
  } finally {
    setLoadingState(false);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "PROMO_PROGRESS") {
    const { done = 0, total = 0 } = message.payload || {};
    progressText.textContent = `${done}/${total}`;
    statusPanel.classList.remove("is-hidden");

    if (done >= total && total > 0) {
      showToast(`Hoàn tất xử lý ${done}/${total} số.`, false);
    }
  }
});

function normalizePhones(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const unique = new Set();
  const validPhones = [];
  const errors = [];

  for (const line of lines) {
    const digits = line.replace(/\s+/g, "");
    if (!/^\d+$/.test(digits)) {
      errors.push(`Số không hợp lệ: "${line}"`);
      continue;
    }

    const normalized = digits.startsWith("0") ? digits.slice(1) : digits;
    if (!/^\d{9,10}$/.test(normalized)) {
      errors.push(`Sai độ dài sau khi bỏ 0: "${line}"`);
      continue;
    }

    if (!unique.has(normalized)) {
      unique.add(normalized);
      validPhones.push(normalized);
    }
  }

  return {
    phones: validPhones,
    errors
  };
}

function openModal() {
  modalOverlay.classList.remove("is-hidden");
  hideError();
}

function closeModal() {
  modalOverlay.classList.add("is-hidden");
}

function showError(message) {
  modalError.textContent = message;
  modalError.classList.remove("is-hidden");
}

function hideError() {
  modalError.textContent = "";
  modalError.classList.add("is-hidden");
}

function setLoadingState(isLoading) {
  btnContinue.disabled = isLoading;
  btnCancel.disabled = isLoading;
  btnPromo.disabled = isLoading;
  btnCard.disabled = isLoading;
  btnContinue.textContent = isLoading ? "Đang chạy..." : "Tiếp tục";
}

function showToast(message, isError) {
  toast.textContent = message;
  toast.classList.remove("is-hidden");
  toast.classList.toggle("is-error", Boolean(isError));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("is-hidden");
    toast.classList.remove("is-error");
  }, 2800);
}
