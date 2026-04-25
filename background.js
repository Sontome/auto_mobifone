const TARGET_URL = "http://10.3.17.135:9009/research/program-object";
const OPEN_TAB_DELAY_MS = 300;

chrome.runtime.onInstalled.addListener(() => {
  console.log("[background] Extension installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "START_PROMO_CHECK") {
    const payload = message.payload || {};
    const phones = Array.isArray(payload.phones) ? payload.phones : [];
    const promoCode = String(payload.promoCode || "").trim();

    if (!promoCode || phones.length === 0) {
      sendResponse({ ok: false, error: "Thiếu dữ liệu số điện thoại hoặc gói cước." });
      return;
    }

    runPromoTabs(phones, promoCode)
      .then((totalTabs) => {
        sendResponse({ ok: true, totalTabs });
      })
      .catch((error) => {
        console.error("[background] runPromoTabs failed", error);
        sendResponse({
          ok: false,
          error: error?.message || "Không thể mở tab kiểm tra."
        });
      });

    return true;
  }

  return false;
});

async function runPromoTabs(phones, promoCode) {
  let done = 0;
  const total = phones.length;

  broadcastProgress(done, total);

  for (const phone of phones) {
    const url = new URL(TARGET_URL);
    url.searchParams.set("extPhone", phone);
    url.searchParams.set("extPromo", promoCode);

    await chrome.tabs.create({
      url: url.toString()
    });

    done += 1;
    broadcastProgress(done, total);
    await sleep(OPEN_TAB_DELAY_MS);
  }

  return total;
}

function broadcastProgress(done, total) {
  chrome.runtime.sendMessage({
    type: "PROMO_PROGRESS",
    payload: { done, total }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
