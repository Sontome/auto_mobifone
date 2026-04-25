
const TARGET_URL = "http://10.3.17.135:9009/";
const OPEN_DELAY = 400;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "START_PROMO_CHECK") return;

  const phones = message.payload?.phones || [];
  const promoCode = String(message.payload?.promoCode || "").trim();

  run(phones, promoCode)
    .then(total => sendResponse({ ok: true, totalTabs: total }))
    .catch(err =>
      sendResponse({
        ok: false,
        error: err.message
      })
    );

  return true;
});

async function run(phones, promoCode) {
  let done = 0;
  const total = phones.length;

  for (const phone of phones) {
    const tab = await chrome.tabs.create({
      url: TARGET_URL,
      active: false
    });

    await waitLoaded(tab.id);

    try { await chrome.tabs.sendMessage(tab.id, { type: "AUTO_FILL_PROMO", payload: { phone, promoCode } }); } catch (error) { console.warn("sendMessage fail, tab vẫn đã mở:", error); }

    done++;

    chrome.runtime.sendMessage({
      type: "PROMO_PROGRESS",
      payload: { done, total }
    });

    await sleep(OPEN_DELAY);
  }

  return total;
}

function waitLoaded(tabId) {
  return new Promise(resolve => {
    const fn = (id, info) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(fn);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(fn);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

