const ext = typeof browser !== "undefined" ? browser : chrome;

const TARGET_URL = "http://10.3.17.135:9009/";
const CARD_URL_KEYWORD = "10.38.45.87/1090/Block_display_scratch.jsp";

const AFTER_LOAD_DELAY_MS = 1800;

console.log("[background] loaded");

/* ===============================
   INSTALL
================================= */
if (ext.runtime.onInstalled) {
  ext.runtime.onInstalled.addListener(() => {
    console.log("[background] installed");
  });
}

/* ===============================
   MAIN MESSAGE LISTENER
================================= */
ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  /* ===============================
     PROMO CHECK
  ================================= */
  if (message.type === "START_PROMO_CHECK") {
    (async () => {
      try {
        const phones = Array.isArray(message.payload?.phones)
          ? message.payload.phones
          : [];

        const promoCode = String(
          message.payload?.promoCode || ""
        ).trim();

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

        const total = await runPromoProcess(
          phones,
          promoCode
        );

        sendResponse({
          ok: true,
          totalTabs: total
        });

      } catch (error) {
        console.error("[PROMO] lỗi:", error);

        sendResponse({
          ok: false,
          error:
            error?.message ||
            "Không thể chạy kiểm tra."
        });
      }
    })();

    return true;
  }

  /* ===============================
     CARD CHECK
  ================================= */
  if (message.type === "START_CARD_CHECK") {
    (async () => {
      try {
        const result = await handleCardCheck(
          message.payload
        );

        sendResponse(result);

      } catch (error) {
        console.error("[CARD] lỗi:", error);

        sendResponse({
          ok: false,
          error:
            error?.message ||
            "Lỗi check thẻ cào."
        });
      }
    })();

    return true;
  }

  return false;
});

/* ===============================
   CARD CHECK
================================= */
async function handleCardCheck(payload) {
  const serials = Array.isArray(payload?.serials)
    ? payload.serials
    : [];

  if (!serials.length) {
    return {
      ok: false,
      error: "Không có serial."
    };
  }

  const targetTab = await findCardTab();

  if (!targetTab) {
    return {
      ok: false,
      error:
        "Hãy mở sẵn web tra cứu thẻ cào."
    };
  }

  const tabId = targetTab.id;

  console.log("[CARD] dùng tab:", tabId);

  const results = [];

  for (const raw of serials) {
    const serial = String(raw).trim();

    if (!serial) continue;

    console.log("[CARD] check:", serial);

    try {
      await waitStableTab(tabId);

      const submitRes = await safeSendMessage(
        tabId,
        {
          type: "SUBMIT_SERIAL",
          payload: { serial }
        }
      );

      console.log(
        "[CARD] submit:",
        submitRes
      );

      await waitResultPage(tabId);
      
      await sleep(3000);

      const result = await readCardResult(tabId);
      console.log(
        "[CARD] result:",
        result
      );

      results.push({
        serial,
        pass:
          result?.pass?.trim() ||
          "Không có"
      });

    } catch (error) {
      console.error(
        "[CARD] fail:",
        serial,
        error
      );

      results.push({
        serial,
        pass: "Lỗi"
      });
    }
  }

  return {
    ok: true,
    results
  };
}
async function readCardResult(tabId) {
  return await safeSendMessage(tabId, {
    type: "READ_RESULT"
  }, 20);
}
/* ===============================
   PROMO CHECK
================================= */
async function runPromoProcess(
  phones,
  promoCode
) {
  let done = 0;
  const total = phones.length;

  const CONCURRENT = 20;

  sendProgress(done, total);

  for (
    let i = 0;
    i < phones.length;
    i += CONCURRENT
  ) {
    const batch = phones.slice(
      i,
      i + CONCURRENT
    );

    await Promise.all(
      batch.map(async (phone) => {
        try {
          const tab = await ext.tabs.create({
            url: TARGET_URL,
            active: false
          });

          const tabId = tab.id;

          await waitTabLoaded(tabId);

          await sleep(
            AFTER_LOAD_DELAY_MS
          );

          await safeSendMessage(
            tabId,
            {
              type: "AUTO_FILL_PROMO",
              payload: {
                phone,
                promoCode
              }
            }
          );

        } catch (error) {
          console.error(
            "[PROMO] fail:",
            phone,
            error
          );
        }

        done++;
        sendProgress(done, total);
      })
    );

    await sleep(800);
  }

  return total;
}

/* ===============================
   HELPERS
================================= */

async function findCardTab() {
  const tabs = await ext.tabs.query({});

  return tabs.find(
    (tab) =>
      tab.url &&
      tab.url.includes(CARD_URL_KEYWORD)
  );
}

async function safeSendMessage(
  tabId,
  data,
  retry = 10
) {
  for (let i = 0; i < retry; i++) {
    try {
      return await ext.tabs.sendMessage(
        tabId,
        data
      );
    } catch (error) {
      await sleep(700);
    }
  }

  throw new Error(
    "Không kết nối được content.js"
  );
}

async function waitResultPage(tabId) {
  return new Promise((resolve) => {
    let done = false;

    const listener = async (
      id,
      info,
      tab
    ) => {
      if (
        id === tabId &&
        info.status === "complete"
      ) {
        const url = tab.url || "";

        if (
          url.includes(
            "?p_display_scratch=YES"
          )
        ) {
          done = true;

          ext.tabs.onUpdated.removeListener(
            listener
          );

          resolve();
        }
      }
    };

    ext.tabs.onUpdated.addListener(
      listener
    );

    setTimeout(() => {
      if (!done) {
        ext.tabs.onUpdated.removeListener(
          listener
        );

        resolve();
      }
    }, 15000);
  });
}

async function waitStableTab(tabId) {
  for (let i = 0; i < 20; i++) {
    try {
      const tab = await ext.tabs.get(tabId);

      if (
        tab.url &&
        tab.url.startsWith(
          "https://10.38.45.87/"
        )
      ) {
        return;
      }
    } catch (e) {}

    await sleep(500);
  }
}

function sendProgress(done, total) {
  try {
    ext.runtime.sendMessage({
      type: "PROMO_PROGRESS",
      payload: { done, total }
    });
  } catch (error) {}
}

function waitTabLoaded(tabId) {
  return new Promise((resolve) => {
    let finished = false;

    const listener = (
      updatedTabId,
      changeInfo
    ) => {
      if (
        updatedTabId === tabId &&
        changeInfo.status ===
          "complete" &&
        !finished
      ) {
        finished = true;

        ext.tabs.onUpdated.removeListener(
          listener
        );

        resolve();
      }
    };

    ext.tabs.onUpdated.addListener(
      listener
    );

    setTimeout(() => {
      if (!finished) {
        finished = true;

        ext.tabs.onUpdated.removeListener(
          listener
        );

        resolve();
      }
    }, 12000);
  });
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}
