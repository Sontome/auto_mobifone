
const ext = typeof browser !== "undefined" ? browser : chrome;

const TARGET_URL = "http://10.3.17.135:9009/";
const OPEN_DELAY_MS = 500;
const AFTER_LOAD_DELAY_MS = 1800;

console.log("[background] loaded");

if (ext.runtime.onInstalled) {
  ext.runtime.onInstalled.addListener(() => {
    console.log("[background] installed");
  });
}

ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "START_PROMO_CHECK") {
    return false;
  }

  console.log("[background] START_PROMO_CHECK", message);

  (async () => {
    try {
      const phones = Array.isArray(message.payload?.phones)
        ? message.payload.phones
        : [];

      const promoCode = String(message.payload?.promoCode || "").trim();

      if (!phones.length) {
        sendResponse({
          ok: false,
          error: "Không có số điện thoại."
        });
        return;
      }

      if (!promoCode) {
        sendResponse({
          ok: false,
          error: "Thiếu tên gói cước."
        });
        return;
      }

      const total = await runProcess(phones, promoCode);

      sendResponse({
        ok: true,
        totalTabs: total
      });
    } catch (error) {
      console.error("[background] fatal error:", error);

      sendResponse({
        ok: false,
        error: error?.message || "Không thể khởi chạy tiến trình."
      });
    }
  })();

  return true;
});

async function runProcess(phones, promoCode) {
  let done = 0;
  const total = phones.length;

  sendProgress(done, total);

  for (const phone of phones) {
    try {
      console.log("[background] opening tab:", phone);

      const tab = await ext.tabs.create({
        url: TARGET_URL,
        active: false
      });

      const tabId = tab?.id;

      if (!tabId) {
        throw new Error("Không lấy được tab id.");
      }

      console.log("[background] opened tab:", tabId);

      await waitTabLoaded(tabId);
      await sleep(AFTER_LOAD_DELAY_MS);

      console.log("[background] send message:", tabId, phone, promoCode);

      try {
        await ext.tabs.sendMessage(tabId, {
          type: "AUTO_FILL_PROMO",
          payload: {
            phone,
            promoCode
          }
        });

        console.log("[background] sendMessage success:", tabId);
      } catch (msgError) {
        console.warn("[background] sendMessage fail:", msgError);
      }

      done++;
      sendProgress(done, total);

      await sleep(OPEN_DELAY_MS);
    } catch (tabError) {
      console.error("[background] tab error:", tabError);

      done++;
      sendProgress(done, total);

      await sleep(OPEN_DELAY_MS);
    }
  }

  return total;
}

function sendProgress(done, total) {
  try {
    ext.runtime.sendMessage({
      type: "PROMO_PROGRESS",
      payload: { done, total }
    });
  } catch (error) {
    console.warn("[background] progress send fail:", error);
  }
}

function waitTabLoaded(tabId) {
  return new Promise((resolve) => {
    let finished = false;

    const listener = (updatedTabId, changeInfo) => {
      if (
        updatedTabId === tabId &&
        changeInfo.status === "complete" &&
        !finished
      ) {
        finished = true;

        ext.tabs.onUpdated.removeListener(listener);

        console.log("[background] tab loaded:", tabId);

        resolve();
      }
    };

    ext.tabs.onUpdated.addListener(listener);

    setTimeout(() => {
      if (!finished) {
        finished = true;

        ext.tabs.onUpdated.removeListener(listener);

        console.log("[background] tab timeout loaded:", tabId);

        resolve();
      }
    }, 12000);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

