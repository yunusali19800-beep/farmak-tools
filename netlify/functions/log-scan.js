const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const ts = Date.now();
    const rec = {
      ts,
      tool: String(data.tool || "").slice(0, 60),
      screen: String(data.screen || "").slice(0, 60),
      src: String(data.src || "").slice(0, 80),
      device: String(data.device || "").slice(0, 80),
      ua: String(event.headers["user-agent"] || "").slice(0, 200),
      ip: String(
        event.headers["x-nf-client-connection-ip"] ||
        event.headers["client-ip"] ||
        ""
      ).slice(0, 60)
    };

    if (!rec.device) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: "no device id" }) };
    }

    const store = getStore("scans");
    const key = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
    await store.setJSON(key, rec);

    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};
