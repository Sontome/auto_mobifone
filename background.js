
const TARGET_URL = "http://10.3.17.135:9009/research/program-object";
const OPEN_TAB_DELAY_MS = 500;
const AFTER_LOAD_DELAY_MS = 1200;

chrome.runtime.onInstalled.addListener(() => {
  console.log("[background] installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "START_PROMO_CHECK") {
    const phones = Array.isArray(message.payload?.phones)
      ? message.payload.phones
      : [];

    const promoCode = String(message.payload?.promoCode || "").trim();

    if (!phones.length || !promoCode) {
      sendResponse({
        ok: false,
        error: "Thiếu số điện thoại hoặc gói cước."
      });
      return;
    }

    runPromoProcess(phones, promoCode)
      .then((total) => sendResponse({ ok: true, totalTabs: total }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err.message || "Lỗi xử lý"
        })
      );

    return true;
  }
});

async function runPromoProcess(phones, promoCode) {
  let done = 0;
  const total = phones.length;

  updateProgress(done, total);

  for (const phone of phones) {
    const tab = await chrome.tabs.create({
      url: TARGET_URL,
      active: false
    });

    await waitTabLoaded(tab.id);
    await sleep(AFTER_LOAD_DELAY_MS);

    await chrome.tabs.sendMessage(tab.id, {
      type: "AUTO_FILL_PROMO",
      payload: {
        phone,
        promoCode
      }
    });

    done++;
    updateProgress(done, total);

    await sleep(OPEN_TAB_DELAY_MS);
  }

  return total;
}

function updateProgress(done, total) {
  chrome.runtime.sendMessage({
    type: "PROMO_PROGRESS",
    payload: { done, total }
  });
}

function waitTabLoaded(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

