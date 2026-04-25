
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

ext.runtime.onMessage.addListener((message) => {

  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "START_CARD_CHECK") {
    return handleCardCheck(message.payload);
  }

});
async function handleCardCheck(payload) {
  const serials = payload?.serials || [];
  const results = [];

  console.log("[CARD] bắt đầu check:", serials.length, "serial");

  for (const raw of serials) {
    const serial = String(raw).trim();

    if (!serial) continue;

    console.log("[CARD] xử lý serial:", serial);

    try {
      const tab = await ext.tabs.create({
        url: "https://10.38.45.87/1090/Block_display_scratch.jsp",
        active: false
      });

      const tabId = tab.id;

      console.log("[CARD] mở tab thành công:", tabId);

      await waitTabLoaded(tabId);

      console.log("[CARD] tab load xong:", tabId);

      await sleep(2000);

      console.log("[CARD] gửi message sang content.js");

      const response = await ext.tabs.sendMessage(tabId, {
        type: "CHECK_CARD_SERIAL",
        payload: { serial }
      });

      console.log("[CARD] response content:", response);

      results.push({
        serial,
        pass: response?.pass || "Không có"
      });

      await ext.tabs.remove(tabId);

      console.log("[CARD] đã đóng tab:", tabId);

    } catch (err) {
      console.error("[CARD] lỗi:", err);

      results.push({
        serial,
        pass: "Lỗi"
      });
    }
  }

  console.log("[CARD] hoàn tất");

  return {
    ok: true,
    results
  };
}
async function runProcess(phones, promoCode) {
  let done = 0;
  const total = phones.length;

  const CONCURRENT = 20; // mở 5 tab cùng lúc

  sendProgress(done, total);

  for (let i = 0; i < phones.length; i += CONCURRENT) {
    const batch = phones.slice(i, i + CONCURRENT);

    await Promise.all(
      batch.map(async (phone) => {
        try {
          console.log("[background] opening tab:", phone);

          const tab = await ext.tabs.create({
            url: TARGET_URL,
            active: false
          });

          const tabId = tab.id;

          await waitTabLoaded(tabId);
          await sleep(AFTER_LOAD_DELAY_MS);

          try {
            await ext.tabs.sendMessage(tabId, {
              type: "AUTO_FILL_PROMO",
              payload: {
                phone,
                promoCode
              }
            });
          } catch (e) {
            console.warn("[background] send fail:", e);
          }

        } catch (err) {
          console.error("[background] tab fail:", err);
        }

        done++;
        sendProgress(done, total);
      })
    );

    await sleep(800); // nghỉ giữa batch
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

