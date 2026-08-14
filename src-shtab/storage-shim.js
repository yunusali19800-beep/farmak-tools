// Совместимая замена window.storage (Claude Artifacts API) → Netlify Function + Netlify Blobs.
// Контракт методов сохранён 1:1, поэтому логика App.jsx не тронута ни строкой.

const KV_ENDPOINT = '/.netlify/functions/kv';

async function kvCall(action, params = {}) {
  const res = await fetch(KV_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    let msg = 'kv_error_' + res.status;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch (e) {
      /* ignore parse error, use default msg */
    }
    throw new Error(msg);
  }
  return res.json();
}

window.storage = {
  get: async (key, shared) => {
    const r = await kvCall('get', { key });
    return { key, value: r.value === undefined ? null : r.value, shared: !!shared };
  },
  set: async (key, value, shared) => {
    await kvCall('set', { key, value });
    return { key, value, shared: !!shared };
  },
  delete: async (key, shared) => {
    await kvCall('delete', { key });
    return { key, deleted: true, shared: !!shared };
  },
  list: async (prefix, shared) => {
    const r = await kvCall('list', { prefix: prefix || '' });
    return { keys: r.keys || [], prefix, shared: !!shared };
  },
};
