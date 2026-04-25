
(() => {
  const ext = typeof browser !== "undefined" ? browser : chrome;

  const MAX_RETRY = 25;
  const DELAY = 800;

  console.log("[EXT] content.js injected");
  console.log("[EXT] Current URL:", location.href);

  ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[EXT] Received message:", message);

    if (!message || message.type !== "AUTO_FILL_PROMO") {
      console.log("[EXT] Ignore message");
      return;
    }

    const phone = String(message.payload?.phone || "").trim();
    const promoCode = String(message.payload?.promoCode || "").trim();

    console.log("[EXT] Start process:", {
      phone,
      promoCode
    });

    run(phone, promoCode);
  });
  ext.runtime.onMessage.addListener((message) => {

    if (message.type === "SUBMIT_SERIAL") {
      return submitSerial(message.payload.serial);
    }
  
    if (message.type === "READ_RESULT") {
      return readResult();
    }
  
  });
  
  function submitSerial(serial) {
    const input = document.querySelector(
      'input[name="txtCardSerialNum"]'
    );
  
    if (!input) {
      return { ok: false };
    }
  
    input.value = serial;
  
    if (typeof window.fCommit === "function") {
      window.fCommit();
    } else {
      document.forms["frmLookup"].submit();
    }
  
    return { ok: true };
  }
  
  function readResult() {
    const pass = document.querySelector(
      'input[name="txtCardPass"]'
    );
  
    return {
      pass: pass?.value?.trim() || "Không có"
    };
  }
  async function run(phone, promoCode) {
    console.log("[EXT] Step 1: find menu");

    const clicked = await openProgramPage();

    console.log("[EXT] Menu clicked:", clicked);

    console.log("[EXT] Step 2: wait form");

    await waitFormThenFill(phone, promoCode);
  }

  async function openProgramPage() {
    for (let i = 1; i <= MAX_RETRY; i++) {
      console.log(`[EXT] Find menu retry ${i}`);

      const link = findProgramLink();

      if (link) {
        console.log("[EXT] Found menu:", link);

        try {
          link.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window
            })
          );

          console.log("[EXT] Clicked menu by MouseEvent");
        } catch (error) {
          console.warn("[EXT] MouseEvent click fail:", error);

          try {
            link.click();
            console.log("[EXT] Clicked menu by .click()");
          } catch (error2) {
            console.warn("[EXT] Native click fail:", error2);
          }
        }

        await sleep(2200);
        return true;
      }

      await sleep(DELAY);
    }

    console.warn("[EXT] Menu not found");
    return false;
  }

  async function waitFormThenFill(phone, promoCode) {
    for (let i = 1; i <= MAX_RETRY; i++) {
      console.log(`[EXT] Find form retry ${i}`);

      const phoneInput = findPhoneInput();
      const promoInput = findPromoInput();
      const button = findSearchButton();

      console.log("[EXT] phoneInput:", phoneInput);
      console.log("[EXT] promoInput:", promoInput);
      console.log("[EXT] button:", button);

      if (phoneInput && promoInput && button) {
        fill(phoneInput, phone);
        fill(promoInput, promoCode);

        console.log("[EXT] Filled data");

        await sleep(350);

        try {
          button.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window
            })
          );

          console.log("[EXT] Clicked search by MouseEvent");
        } catch (error) {
          console.warn("[EXT] Search MouseEvent fail:", error);

          button.click();
          console.log("[EXT] Clicked search by .click()");
        }

        return;
      }

      await sleep(DELAY);
    }

    console.warn("[EXT] Cannot find form");
  }

  function findProgramLink() {
    const links = [...document.querySelectorAll("a")];

    return links.find((a) => {
      const txt = ((a.innerText || a.textContent || "") + "")
        .toLowerCase()
        .trim();

      const href = a.getAttribute("href") || "";

      return (
        txt.includes("đối tượng chương trình") ||
        txt.includes("doi tuong chuong trinh") ||
        href.includes("/research/program-object")
      );
    });
  }

  function findPhoneInput() {
    return pick([
      'input[name="isdn"]',
      'input[placeholder*="số"]',
      'input[placeholder*="so"]',
      'input[type="text"]'
    ]);
  }

  function findPromoInput() {
    return pick([
      'input[name="code"]',
      'input[placeholder*="gói"]',
      'input[placeholder*="goi"]',
      'input.border-green-500'
    ]);
  }

  function findSearchButton() {
    const buttons = [
      ...document.querySelectorAll("button"),
      ...document.querySelectorAll('input[type="submit"]')
    ];

    return buttons.find((btn) => {
      const txt = ((btn.innerText || btn.value || btn.textContent || "") + "")
        .toLowerCase()
        .trim();

      return (
        txt.includes("tìm kiếm") ||
        txt.includes("tim kiem") ||
        txt.includes("search")
      );
    });
  }

  function pick(arr) {
    for (const selector of arr) {
      const el = document.querySelector(selector);

      if (el) {
        return el;
      }
    }

    return null;
  }

  function fill(el, val) {
    try {
      el.focus();
      el.value = val;

      el.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );

      el.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );

      el.dispatchEvent(
        new KeyboardEvent("keyup", {
          bubbles: true
        })
      );

      el.blur();
    } catch (error) {
      console.warn("[EXT] Fill error:", error);
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();

