(function initPromoAutoFill() {
  const MAX_RETRY = 15;
  const RETRY_DELAY_MS = 500;

  const params = new URLSearchParams(window.location.search);
  const phone = params.get("extPhone") || "";
  const promoCode = params.get("extPromo") || "";

  if (!phone || !promoCode) {
    console.debug("[content] Missing extPhone/extPromo query params, skip.");
    return;
  }

  console.debug("[content] Start autofill with data", { phone, promoCode });
  runFillFlow(phone, promoCode);

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "FILL_PROMO_FORM") {
      return;
    }
    const payload = message.payload || {};
    runFillFlow(String(payload.phone || ""), String(payload.promoCode || ""));
  });

  async function runFillFlow(phoneValue, promoValue) {
    for (let attempt = 1; attempt <= MAX_RETRY; attempt += 1) {
      const elements = locateFormElements();

      if (elements.phoneInput && elements.codeInput && elements.searchButton) {
        fillInput(elements.phoneInput, phoneValue);
        fillInput(elements.codeInput, promoValue);
        await wait(80);
        elements.searchButton.click();
        console.debug("[content] Clicked search button.");
        return;
      }

      console.debug(`[content] Retry ${attempt}/${MAX_RETRY}: form elements not ready`);
      await wait(RETRY_DELAY_MS);
    }

    console.warn("[content] Failed to locate form elements after retries.");
  }

  function locateFormElements() {
    const phoneSelectors = [
      'input[type="text"][name="isdn"][style*="min-width: 300px"].form-input',
      'input[name="isdn"]',
      'input[placeholder*="số"][type="text"]',
      'input[type="text"].form-input'
    ];

    const codeSelectors = [
      'input[type="text"][name="code"][style*="min-width: 300px"].form-input.border-green-500',
      'input[name="code"]',
      'input[placeholder*="gói"][type="text"]',
      'input[type="text"].border-green-500'
    ];

    const phoneInput = findFirst(phoneSelectors);
    const codeInput = findFirst(codeSelectors);
    const searchButton = findSearchButton();

    return { phoneInput, codeInput, searchButton };
  }

  function findFirst(selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        return el;
      }
    }
    return null;
  }

  function findSearchButton() {
    const exactSelector =
      'button.btn.btn-default.btn-blue.btn-rounded.btn-icon[type="submit"]';
    const exact = document.querySelector(exactSelector);
    if (exact) return exact;

    const buttonCandidates = Array.from(document.querySelectorAll("button"));
    const byText = buttonCandidates.find((btn) => {
      const text = (btn.textContent || "").trim().toLowerCase();
      return text.includes("tìm kiếm") || text.includes("tim kiem") || text.includes("search");
    });
    if (byText) return byText;

    return document.querySelector('button[type="submit"]');
  }

  function fillInput(input, value) {
    if (!input) return;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.blur();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
