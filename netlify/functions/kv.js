const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(statusCode, obj) {
  return { statusCode, headers: HEADERS, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'bad_json' });
  }

  const { action, key, value, prefix } = body || {};
  const store = getStore('nevro-quiz-storage');

  try {
    if (action === 'get') {
      if (!key) return json(400, { error: 'missing_key' });
      const val = await store.get(key);
      return json(200, { value: val === null ? null : val });
    }

    if (action === 'set') {
      if (!key) return json(400, { error: 'missing_key' });
      await store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      return json(200, { ok: true });
    }

    if (action === 'delete') {
      if (!key) return json(400, { error: 'missing_key' });
      await store.delete(key);
      return json(200, { ok: true });
    }

    if (action === 'list') {
      const { blobs } = await store.list({ prefix: prefix || '' });
      return json(200, { keys: (blobs || []).map((b) => b.key) });
    }

    return json(400, { error: 'unknown_action' });
  } catch (e) {
    return json(500, { error: String((e && e.message) || e) });
  }
};
