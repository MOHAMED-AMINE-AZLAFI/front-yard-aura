# Cloudflare Pinterest Worker

هذا الدليل يشرح تشغيل Pinterest publishing من Cloudflare Worker بدون تشغيل الكمبيوتر.

الـ Worker موجود في:

```bash
workers/pinterest-publisher/
```

وهو يستخدم:

- Cloudflare Cron Trigger مرة واحدة يومياً.
- Pinterest API الرسمي فقط: `POST https://api.pinterest.com/v5/pins`.
- Secret باسم `PINTEREST_ACCESS_TOKEN`.
- KV باسم `PINTEREST_HISTORY` لحفظ سجل النشر ومنع التكرار.
- `DRY_RUN = "true"` افتراضياً، لذلك لا ينشر أي Pin حتى تغيّره صراحة.

لا يوجد browser automation، ولا login automation، ولا follow/like/comment.

## 1. تصدير بيانات الـ Worker

من جذر المشروع شغّل:

```bash
node scripts/export-pinterest-worker-data.mjs
```

هذا يحوّل:

```text
data/pinterest/pinterest-pins.csv
data/pinterest/pinterest-schedule.csv
data/pinterest/pinterest-boards.json
```

إلى:

```text
workers/pinterest-publisher/src/pins-data.json
```

أعد تشغيل هذا الأمر كلما عدّلت pins أو schedule أو boards.

## 2. إنشاء KV history

من داخل مجلد الـ Worker:

```bash
cd workers/pinterest-publisher
npx wrangler kv namespace create PINTEREST_HISTORY
npx wrangler kv namespace create PINTEREST_HISTORY --preview
```

انسخ `id` و`preview_id` الناتجين إلى:

```text
workers/pinterest-publisher/wrangler.toml
```

مكان:

```toml
id = "replace-with-production-kv-namespace-id"
preview_id = "replace-with-preview-kv-namespace-id"
```

## 3. إضافة Pinterest access token كـ secret

من داخل `workers/pinterest-publisher`:

```bash
npx wrangler secret put PINTEREST_ACCESS_TOKEN
```

ألصق قيمة الـ token عند الطلب. لا تضعه في `wrangler.toml` ولا في Git.

الـ token يجب أن يكون من Pinterest OAuth وبصلاحية `pins:write`، ويفضل أيضاً `pins:read`, `boards:read`, `boards:write` حسب إعداداتك.

## 4. تشغيل dry-run

الإعداد الحالي في `wrangler.toml`:

```toml
DRY_RUN = "true"
DAILY_CAP = "5"
SCHEDULE_TIME_ZONE = "America/New_York"
```

لتجربة محلية بدون نشر:

```bash
cd workers/pinterest-publisher
npx wrangler dev --test-scheduled
```

ثم من terminal آخر:

```bash
curl "http://localhost:8787/__scheduled?cron=15+14+*+*+*"
```

على PowerShell:

```powershell
Invoke-WebRequest "http://localhost:8787/__scheduled?cron=15+14+*+*+*"
```

الـ dry-run يقرأ Pins المبرمجة لتاريخ اليوم فقط، يطبّق daily cap، ويتحقق من history إن كانت KV متاحة، لكنه لا يرسل أي طلب نشر إلى Pinterest.

## 5. رفع Worker

بعد وضع KV ids وإضافة secret:

```bash
cd workers/pinterest-publisher
npx wrangler deploy
```

طالما `DRY_RUN = "true"` سيعمل الـ Cron كاختبار فقط ولن ينشر.

لمراقبة اللوجات:

```bash
npx wrangler tail
```

## 6. تفعيل cron publishing الحقيقي

بعد مراجعة dry-run والـ logs:

1. افتح `workers/pinterest-publisher/wrangler.toml`.
2. غيّر:

```toml
DRY_RUN = "false"
```

3. تأكد من:

```toml
DAILY_CAP = "5"
```

4. ارفع مجدداً:

```bash
npx wrangler deploy
```

الـ Cron الحالي:

```toml
[triggers]
crons = ["15 14 * * *"]
```

Cloudflare Cron يعمل بتوقيت UTC، وهذا يعني تشغيل مرة واحدة يومياً عند 14:15 UTC.

## 7. كيف يمنع التكرار؟

عند النشر الحقيقي، الـ Worker يكتب في KV:

```text
pinterest-publisher:v1:pin:<pin_id>
pinterest-publisher:v1:schedule:<schedule_id>
pinterest-publisher:v1:date:<YYYY-MM-DD>
```

قبل نشر أي Pin، يتحقق من سجل `pin_id` و`schedule_id`. إذا وجد سجلاً سابقاً، يتخطى الـ Pin. كما يستخدم سجل اليوم لحساب ما تم نشره مسبقاً حتى لا يتجاوز `DAILY_CAP` عند إعادة تشغيل نفس اليوم.

## مراجع رسمية

- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare scheduled handler: https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
- Pinterest Create boards and Pins: https://developer.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/
