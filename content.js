
(() => {
  const MAX_RETRY = 20;
  const RETRY_DELAY = 700;

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "AUTO_FILL_PROMO") return;

    const phone = String(message.payload?.phone || "").trim();
    const promoCode = String(message.payload?.promoCode || "").trim();

    run(phone, promoCode);
  });

  async function run(phone, promoCode) {
    for (let i = 1; i <= MAX_RETRY; i++) {
      const phoneInput = findPhoneInput();
      const promoInput = findPromoInput();
      const searchBtn = findSearchButton();

      if (phoneInput && promoInput && searchBtn) {
        fill(phoneInput, phone);
        fill(promoInput, promoCode);

        await sleep(150);

        searchBtn.click();

        console.log("[content] done");
        return;
      }

      await sleep(RETRY_DELAY);
    }

    console.warn("[content] không tìm thấy form");
  }

  function findPhoneInput() {
    return pick([
      'input[name="isdn"]',
      'input[placeholder*="số"]',
      'input[type="text"]'
    ]);
  }

  function findPromoInput() {
    return pick([
      'input[name="code"]',
      'input[placeholder*="gói"]',
      'input.border-green-500'
    ]);
  }

  function findSearchButton() {
    const buttons = [...document.querySelectorAll("button,input[type=submit]")];

    return buttons.find(btn => {
      const txt = (btn.innerText || btn.value || "").toLowerCase();

      return txt.includes("tìm kiếm")
        || txt.includes("tim kiem")
        || txt.includes("search");
    });
  }

  function pick(arr) {
    for (const s of arr) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  function fill(el, val) {
    el.focus();
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
})();

