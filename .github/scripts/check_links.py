#!/usr/bin/env python3
"""
Аудит ссылок Farmak QR-инструментов.
Читает URL из QR_REGISTRY.md, проверяет доступность каждого.
Спец-проверки: PDF content-type, hash-маршруты gyn.html.
Пишет отчёт в GITHUB_STEP_SUMMARY, падает (exit 1) при любой проблеме.
"""
import os, re, sys, ssl, time
import urllib.request, urllib.error

REGISTRY = os.path.join(os.path.dirname(__file__), "..", "..", "QR_REGISTRY.md")
UA = "Mozilla/5.0 (compatible; FarmakLinkAudit/1.0)"
TIMEOUT = 25
CTX = ssl.create_default_context()

# внешние CDN/шрифты — не проверяем (шум, всегда живы, не наши)
SKIP = ("fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "w3.org")

def extract_urls(text):
    urls = re.findall(r'https?://[^\s\)\]\|<>"\'`]+', text)
    clean, seen = [], set()
    for u in urls:
        u = u.rstrip(".,;`")
        if any(s in u for s in SKIP):
            continue
        if u in seen:
            continue
        seen.add(u); clean.append(u)
    return clean

def fetch(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX)

def check_url(url):
    """Вернуть (ok: bool, detail: str)."""
    # убрать hash для HTTP-запроса
    base = url.split("#", 1)[0]
    is_pdf = base.lower().endswith(".pdf")
    try:
        r = fetch(base)
        code = r.getcode()
        ctype = r.headers.get("Content-Type", "")
        body = b""
        if is_pdf or "#" in url:
            body = r.read(4096)  # начало достаточно для проверки
        if code != 200:
            return False, f"HTTP {code}"
        if is_pdf and "pdf" not in ctype.lower() and not body.startswith(b"%PDF"):
            return False, f"не PDF (тип: {ctype or 'нет'})"
        # hash-маршруты gyn: маршрут должен присутствовать в коде страницы
        if "#" in url:
            frag = url.split("#", 1)[1].lower()
            full = body + fetch(base).read()
            if frag.encode() not in full.lower():
                return False, f"маршрут #{frag} отсутствует в коде страницы"
        return True, f"200 · {ctype.split(';')[0] or 'ok'}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"

def main():
    with open(REGISTRY, encoding="utf-8") as f:
        reg = f.read()
    urls = extract_urls(reg)

    results = []
    for u in urls:
        ok, detail = check_url(u)
        results.append((ok, u, detail))
        time.sleep(0.3)  # вежливо к серверам

    fails = [r for r in results if not r[0]]

    # отчёт
    lines = ["# Аудит ссылок Farmak", "",
             f"Проверено: **{len(results)}** · Проблем: **{len(fails)}**", ""]
    if fails:
        lines += ["## ❌ Проблемы", "", "| URL | Причина |", "|---|---|"]
        for _, u, d in fails:
            lines.append(f"| {u} | {d} |")
        lines.append("")
    lines += ["## Полный список", "", "| Статус | URL | Детали |", "|---|---|---|"]
    for ok, u, d in results:
        lines.append(f"| {'✅' if ok else '❌'} | {u} | {d} |")
    report = "\n".join(lines)

    print(report)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(report + "\n")
    # для тела Issue
    with open("audit_report.md", "w", encoding="utf-8") as f:
        f.write(report + "\n")

    if fails:
        print(f"\n::error::Аудит нашёл {len(fails)} проблем(ы)")
        sys.exit(1)
    print("\nВсё живо.")

if __name__ == "__main__":
    main()
