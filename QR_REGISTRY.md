# Реестр QR-инструментов Farmak — единый источник правды

**Назначение.** Один документ со всеми боевыми ссылками, QR-инструментами, PDF-инструкциями
и внешними зависимостями. Отсюда автоматический аудит (`.github/workflows/link-audit.yml`)
берёт список URL и ежедневно проверяет, что всё живо. При добавлении нового QR — **сначала
строка сюда**, потом печать кода.

**Базовый адрес сайта:** `https://farmak-tools.netlify.app/`

Последнее обновление реестра: 2026-07-31.

---

## 1. Клинические инструменты (боевые страницы)

| Инструмент | URL | Бренды | Аудитория |
|---|---|---|---|
| ОКНО — терапевтическое окно при тяжёлом ОИИ | https://farmak-tools.netlify.app/okno.html | Флертис | Неврологи, реаниматологи |
| Восстановление после инсульта | https://farmak-tools.netlify.app/vosstanovlenie.html | Фленокс, Лира | Неврологи |
| Гинекология (кровотечение / тромбоз) | https://farmak-tools.netlify.app/gyn.html | Фленокс, Гемотран | Гинекологи |
| ХИМ — пациент с симптомами | https://farmak-tools.netlify.app/him.html | Глиятон, Лира, Динар | Терапевты |
| Кардиология — тромбопрофилактика ВТЭ | https://farmak-tools.netlify.app/cardio.html | Фленокс | Кардиологи стационарные |
| ВТЭ в реанимации | https://farmak-tools.netlify.app/vte-icu.html | Фленокс | Реаниматологи |
| Хаб инструментов (chooser) | https://farmak-tools.netlify.app/index.html | — | Навигация |
| Нейро-хаб (инструмент/игра) | https://farmak-tools.netlify.app/neuro.html | — | Навигация |
| Нейро-квиз (игра) | https://farmak-tools.netlify.app/neuroigra.html | — | Тренинг |

## 2. Инструкции (PDF) и вьюер

Инструкции открываются через **`viewer.html`** — надёжно во встроенных браузерах мессенджеров.
Прямые PDF оставлены как файл для скачивания.

| Инструкция | Через вьюер (для QR/кнопок) | Прямой PDF (скачивание) |
|---|---|---|
| Флертис | https://farmak-tools.netlify.app/viewer.html?f=flertis | https://farmak-tools.netlify.app/flertis_instrukciya.pdf |
| Глиятон | https://farmak-tools.netlify.app/viewer.html?f=gliyaton | https://farmak-tools.netlify.app/gliyaton_instrukciya.pdf |
| Лира | https://farmak-tools.netlify.app/viewer.html?f=lira | https://farmak-tools.netlify.app/lira_instrukciya.pdf |

## 3. Страница производителя (паспорт Farmak)

Открывается с параметром `?p=` — подставляет нужную инструкцию в кнопку.

| URL | Инструкция в кнопке |
|---|---|
| https://farmak-tools.netlify.app/farmak_zavod.html?p=flertis | Флертис |
| https://farmak-tools.netlify.app/farmak_zavod.html?p=gliyaton | Глиятон |
| https://farmak-tools.netlify.app/farmak_zavod.html?p=lira | Лира |

## 4. Deep-link якоря (gyn.html)

`gyn.html` открывает нужный сценарий по hash (JS-роутинг). Оба маршрута должны присутствовать в коде.

| Ссылка | Сценарий |
|---|---|
| https://farmak-tools.netlify.app/gyn.html#krovotechenie | Кровотечение (Гемотран) |
| https://farmak-tools.netlify.app/gyn.html#tromboz | Тромбоз (Фленокс) |

## 5. Кликабельные источники (PMID) внутри инструментов

Эти ссылки на PubMed зашиты в инструменты и видны врачу. Авто-аудит проверяет, что ссылка **жива**.
Проверку **содержания** (правильный автор/год/атрибуция — по Уставу) делает Claude через PubMed MCP,
а не HTTP-чекер (см. раздел 8).

| Инструмент | PMID | Ссылка (аудируется) |
|---|---|---|
| okno.html | 30741623 | https://pubmed.ncbi.nlm.nih.gov/30741623 |
| okno.html | 33638896 | https://pubmed.ncbi.nlm.nih.gov/33638896 |
| okno.html | 35443847 | https://pubmed.ncbi.nlm.nih.gov/35443847 |
| cardio.html | 10477777 | https://pubmed.ncbi.nlm.nih.gov/10477777 |
| cardio.html | 20453069 | https://pubmed.ncbi.nlm.nih.gov/20453069 |
| gyn.html | 11919306 | https://pubmed.ncbi.nlm.nih.gov/11919306 |
| gyn.html | 19917854 | https://pubmed.ncbi.nlm.nih.gov/19917854 |
| vosstanovlenie.html | 17448820 | https://pubmed.ncbi.nlm.nih.gov/17448820 |
| vosstanovlenie.html | 26999113 | https://pubmed.ncbi.nlm.nih.gov/26999113 |
| vte-icu.html | 15900257 | https://pubmed.ncbi.nlm.nih.gov/15900257 |
| vte-icu.html | 22315263 | https://pubmed.ncbi.nlm.nih.gov/22315263 |

## 6. Внешние зависимости

| Ссылка | Где | Критичность |
|---|---|---|
| https://farmak.uz/ | Кнопка на farmak_zavod.html | Средняя |
| https://youtu.be/R5Q8e0v7Dn8 | Экскурсия по заводу, farmak_zavod.html | Средняя |
| cdnjs (pdf.js) | Движок вьюера viewer.html | Высокая — без него вьюер уходит в фолбэк на прямой PDF |
| Google Fonts | Шрифты инструментов | Низкая — косметика |

## 7. Физические QR-коды — ЗАПОЛНЯЕТ ЮНУС

Этого нет в репозитории, только у тебя. Заполняй при печати каждого нового кода —
чтобы знать, какой физический QR куда закодирован (если URL меняется, код надо перепечатать).

| Материал / носитель | Куда закодирован QR (URL) | Дата печати | Тираж / где роздан |
|---|---|---|---|
| _(пример)_ Аптечный детейл Флертис | https://farmak-tools.netlify.app/viewer.html?f=flertis | | |
| | | | |
| | | | |

## 8. Что авто-аудит проверяет, а что — нет

**Проверяет ежедневно (машина, 24/7):**
- жив ли сайт и каждая страница из разделов 1–3 (HTTP 200);
- отдаётся ли каждый PDF (200 + тип `application/pdf`);
- на месте ли оба hash-маршрута gyn (`krovotechenie`, `tromboz`);
- живы ли PMID-ссылки и внешние зависимости (раздел 5–6).
- При любом падении — заводит Issue в репозитории и присылает письмо владельцу.

**НЕ проверяет (это работа Claude по запросу или при добавлении материалов):**
- **правильность содержания PMID** — верный ли автор, год, что ссылка соответствует Уставу
  (PubMed отдаёт 200 даже на неверный, но существующий PMID — HTTP-статус тут бесполезен);
- клинические утверждения, дозы, привязку бренда, красные линии;
- соответствие метода и позиционирования.

Механику держит машина. Содержание — Claude.
