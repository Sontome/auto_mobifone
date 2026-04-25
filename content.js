
(() => {
  const MAX_RETRY = 25;
  const DELAY = 800;

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "AUTO_FILL_PROMO") return;

    const phone = String(message.payload?.phone || "").trim();
    const promoCode = String(message.payload?.promoCode || "").trim();

    run(phone, promoCode);
  });

  async function run(phone, promoCode) {
    await openProgramPage();
    await waitFormThenFill(phone, promoCode);
  }

  async function openProgramPage() {
    for (let i = 1; i <= MAX_RETRY; i++) {
      const link = findProgramLink();

      if (link) {
        link.click();
        console.log("[content] clicked Đối tượng chương trình");
        await sleep(1800);
        return;
      }

      await sleep(DELAY);
    }
  }

  async function waitFormThenFill(phone, promoCode) {
    for (let i = 1; i <= MAX_RETRY; i++) {
      const phoneInput = findPhoneInput();
      const promoInput = findPromoInput();
      const button = findSearchButton();

      if (phoneInput && promoInput && button) {
        fill(phoneInput, phone);
        fill(promoInput, promoCode);

        await sleep(200);

        button.click();

        console.log("[content] search clicked");
        return;
      }

      await sleep(DELAY);
    }

    console.warn("[content] form not found");
  }

  function findProgramLink() {
    const links = [...document.querySelectorAll("a")];

    return links.find((a) => {
      const text = (a.innerText || "").toLowerCase();
      const href = a.getAttribute("href") || "";

      return (
        text.includes("đối tượng chương trình") ||
        text.includes("doi tuong chuong trinh") ||
        href.includes("/research/program-object")
      );
    });
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

    return buttons.find((btn) => {
      const txt = (btn.innerText || btn.value || "").toLowerCase();

      return (
        txt.includes("tìm kiếm") ||
        txt.includes("tim kiem") ||
        txt.includes("search")
      );
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
    return new Promise((r) => setTimeout(r, ms));
  }
})();

