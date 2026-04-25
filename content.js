
(() => {
  const MAX_RETRY = 20;
  const RETRY_DELAY = 600;

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "AUTO_FILL_PROMO") return;

    const phone = String(message.payload?.phone || "").trim();
    const promoCode = String(message.payload?.promoCode || "").trim();

    if (!phone || !promoCode) return;

    run(phone, promoCode);
  });

  async function run(phone, promoCode) {
    console.log("[content] start fill", phone, promoCode);

    for (let i = 1; i <= MAX_RETRY; i++) {
      const phoneInput = findPhoneInput();
      const promoInput = findPromoInput();
      const button = findSearchButton();

      if (phoneInput && promoInput && button) {
        fill(phoneInput, phone);
        fill(promoInput, promoCode);

        await sleep(150);

        button.click();

        console.log("[content] clicked search");
        return;
      }

      console.log("[content] retry", i);
      await sleep(RETRY_DELAY);
    }

    console.warn("[content] cannot find form");
  }

  function findPhoneInput() {
    const selectors = [
      'input[name="isdn"]',
      'input[placeholder*="số"]',
      'input[type="text"]'
    ];

    return pick(selectors);
  }

  function findPromoInput() {
    const selectors = [
      'input[name="code"]',
      'input[placeholder*="gói"]',
      'input.border-green-500'
    ];

    return pick(selectors);
  }

  function pick(arr) {
    for (const s of arr) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function findSearchButton() {
    const buttons = [...document.querySelectorAll("button")];

    for (const btn of buttons) {
      const txt = (btn.innerText || "").toLowerCase();

      if (
        txt.includes("tìm kiếm") ||
        txt.includes("tim kiem") ||
        txt.includes("search")
      ) {
        return btn;
      }
    }

    return document.querySelector('button[type="submit"]');
  }

  function fill(el, val) {
    el.focus();
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
})();
