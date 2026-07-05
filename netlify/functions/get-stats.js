const { getStore } = require("@netlify/blobs");

const RAPID_WINDOW_MS = 10 * 60 * 1000; // 10 минут
const RAPID_MULTI_SRC_THRESHOLD = 3;    // разных src от одного device за окно
const RAPID_REPEAT_THRESHOLD = 5;       // событий с одним src от одного device за окно

exports.handler = async (event) => {
  const cors = { "Access-Control-Allow-Origin": "*" };

  const key = (event.queryStringParameters || {}).key || "";
  const expected = process.env.STATS_KEY || "";
  if (!expected || key !== expected) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ ok: false, error: "unauthorized" }) };
  }

  try {
    const store = getStore("scans");
    let records = [];
    try {
      const existing = await store.get("events", { type: "json" });
      if (Array.isArray(existing)) records = existing;
    } catch (e) {
      records = [];
    }

    records.sort((a, b) => a.ts - b.ts);

    const byTool = {};
    const byScreen = {};
    const bySrc = {};
    const byDevice = {};

    for (const r of records) {
      byTool[r.tool || "(нет)"] = (byTool[r.tool || "(нет)"] || 0) + 1;
      byScreen[r.screen || "(нет)"] = (byScreen[r.screen || "(нет)"] || 0) + 1;
      bySrc[r.src || "(без метки)"] = (bySrc[r.src || "(без метки)"] || 0) + 1;
      if (!byDevice[r.device]) byDevice[r.device] = [];
      byDevice[r.device].push(r);
    }

    const uniqueDevices = Object.keys(byDevice).length;

    const flags = [];
    for (const [device, events] of Object.entries(byDevice)) {
      events.sort((a, b) => a.ts - b.ts);
      for (let i = 0; i < events.length; i++) {
        const windowEvents = events.filter(
          (e) => e.ts >= events[i].ts && e.ts <= events[i].ts + RAPID_WINDOW_MS
        );
        const distinctSrc = new Set(windowEvents.map((e) => e.src)).size;
        const sameSrcCount = {};
        windowEvents.forEach((e) => {
          sameSrcCount[e.src] = (sameSrcCount[e.src] || 0) + 1;
        });
        const maxSameSrc = Math.max(0, ...Object.values(sameSrcCount));

        if (distinctSrc >= RAPID_MULTI_SRC_THRESHOLD) {
          flags.push({
            device,
            type: "multi_src_rapid",
            at: events[i].ts,
            detail: `${distinctSrc} разных src за 10 мин`
          });
          break;
        }
        if (maxSameSrc >= RAPID_REPEAT_THRESHOLD) {
          flags.push({
            device,
            type: "same_src_repeat",
            at: events[i].ts,
            detail: `${maxSameSrc} сканов одного src за 10 мин`
          });
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        total: records.length,
        uniqueDevices,
        byTool,
        byScreen,
        bySrc,
        flags,
        recent: records.slice(-50).reverse()
      })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        total: 0,
        uniqueDevices: 0,
        byTool: {},
        byScreen: {},
        bySrc: {},
        flags: [],
        recent: [],
        warning: String(e)
      })
    };
  }
};
