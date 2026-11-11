// Cloudflare Worker для farmak-tools.
//   POST /api/kv      хранилище квиза «Инсультный штаб» (замена Netlify Blobs), таблица kv в D1
//   POST /api/scan    журнал сканирований QR (замена Netlify Forms), таблица scan_log в D1
//   GET  /api/scans   сводка и выгрузка журнала для руководителя, нужен секрет ADMIN_KEY
// Всё остальное отдаётся как статические файлы из папки public.

const MAX_KEY = 200;
const MAX_VALUE = 1_000_000;
const MAX_FIELD = 200;
const LIST_LIMIT = 1000;

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let schemaReady = null;
function ensureSchema(db) {
  if (!schemaReady) {
    schemaReady = db
      .batch([
        db.prepare('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)'),
        db.prepare(
          'CREATE TABLE IF NOT EXISTS scan_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, tool TEXT, screen TEXT, src TEXT, device TEXT, ts TEXT, page TEXT, city TEXT, region TEXT, country TEXT, lat TEXT, lon TEXT, isp TEXT)'
        ),
        db.prepare('CREATE INDEX IF NOT EXISTS scan_log_created ON scan_log (created_at)'),
      ])
      .catch((e) => {
        schemaReady = null;
        throw e;
      });
  }
  return schemaReady;
}

async function readJson(req) {
  try {
    return (await req.json()) || {};
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

// ---------- хранилище квиза ----------
async function kv(req, env) {
  if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
  const { action, key, value, prefix } = await readJson(req);
  const needKey = () => {
    if (typeof key !== 'string' || !key) throw new HttpError(400, 'missing_key');
    if (key.length > MAX_KEY) throw new HttpError(400, 'key_too_long');
  };

  if (action === 'get') {
    needKey();
    const row = await env.DB.prepare('SELECT value FROM kv WHERE key = ?').bind(key).first();
    return json({ value: row ? row.value : null });
  }
  if (action === 'set') {
    needKey();
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (text.length > MAX_VALUE) throw new HttpError(413, 'value_too_large');
    await env.DB.prepare(
      'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    )
      .bind(key, text, Date.now())
      .run();
    return json({ ok: true });
  }
  if (action === 'delete') {
    needKey();
    await env.DB.prepare('DELETE FROM kv WHERE key = ?').bind(key).run();
    return json({ ok: true });
  }
  if (action === 'list') {
    const p = typeof prefix === 'string' ? prefix.slice(0, MAX_KEY) : '';
    const { results } = await env.DB.prepare('SELECT key FROM kv WHERE substr(key, 1, ?) = ? ORDER BY key LIMIT ?')
      .bind(p.length, p, LIST_LIMIT)
      .all();
    return json({ keys: results.map((r) => r.key) });
  }
  throw new HttpError(400, 'unknown_action');
}

// ---------- журнал сканирований ----------
const clip = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, MAX_FIELD) : '');

function countryName(code) {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

async function scan(req, env) {
  if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
  const b = await readJson(req);
  const tool = clip(b.tool);
  if (!tool) throw new HttpError(400, 'missing_tool');
  const cf = req.cf || {};
  await env.DB.prepare(
    'INSERT INTO scan_log (created_at, tool, screen, src, device, ts, page, city, region, country, lat, lon, isp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      Date.now(),
      tool,
      clip(b.screen),
      clip(b.src),
      clip(b.device),
      clip(b.ts),
      clip(b.page),
      clip(cf.city),
      clip(cf.region),
      countryName(cf.country),
      clip(cf.latitude),
      clip(cf.longitude),
      clip(cf.asOrganization)
    )
    .run();
  return json({ ok: true });
}

// ---------- выгрузка для руководителя ----------
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function requireAdmin(req, env) {
  if (!env.ADMIN_KEY) throw new HttpError(503, 'Выгрузка не включена: на сервере не задан секрет ADMIN_KEY');
  const given = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!given || !(await safeEqual(given, env.ADMIN_KEY))) throw new HttpError(401, 'Неверный ключ');
}

const CSV_COLUMNS = ['created_at', 'tool', 'screen', 'src', 'device', 'ts', 'page', 'city', 'region', 'country', 'lat', 'lon', 'isp'];

function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  // защита от формул при открытии в Excel; обычные числа (например, долгота -97.7) не трогаем
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

async function scans(req, env, url) {
  if (req.method !== 'GET') throw new HttpError(405, 'method_not_allowed');
  await requireAdmin(req, env);
  const db = env.DB;

  if (url.searchParams.get('format') === 'csv') {
    const { results } = await db.prepare('SELECT * FROM scan_log ORDER BY id').all();
    const lines = [CSV_COLUMNS.join(',')];
    for (const r of results) {
      lines.push(CSV_COLUMNS.map((c) => csvCell(c === 'created_at' ? new Date(r.created_at).toISOString() : r[c])).join(','));
    }
    return new Response('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="scan-log.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const since = Date.now() - 30 * 86_400_000;
  const [total, byTool, byDay, byRegion, devices] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM scan_log').first(),
    db.prepare('SELECT tool, COUNT(*) AS n, COUNT(DISTINCT device) AS devices FROM scan_log GROUP BY tool ORDER BY n DESC').all(),
    db
      .prepare("SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM scan_log WHERE created_at > ? GROUP BY day ORDER BY day DESC")
      .bind(since)
      .all(),
    db
      .prepare("SELECT IFNULL(NULLIF(region, ''), '(не определён)') AS region, COUNT(*) AS n FROM scan_log GROUP BY region ORDER BY n DESC LIMIT 20")
      .all(),
    db.prepare('SELECT COUNT(DISTINCT device) AS n FROM scan_log').first(),
  ]);
  return json({
    total: total.n,
    devices: devices.n,
    byTool: byTool.results,
    byDay: byDay.results,
    byRegion: byRegion.results,
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      // Главная страница: html_handling выключен, чтобы адреса вида /okno.html не менялись (QR напечатаны).
      if (url.pathname === '/') return env.ASSETS.fetch(new Request(new URL('/index.html', url), req));
      await ensureSchema(env.DB);
      if (url.pathname === '/api/kv') return await kv(req, env);
      if (url.pathname === '/api/scan') return await scan(req, env);
      if (url.pathname === '/api/scans') return await scans(req, env, url);
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      return json({ error: 'server_error' }, 500);
    }
  },
};
