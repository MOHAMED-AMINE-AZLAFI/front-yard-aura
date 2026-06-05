import pinsData from './pins-data.json';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
const RESEND_EMAILS_API = 'https://api.resend.com/emails';
const CONTACT_ALLOWED_ORIGIN = 'https://frontyardaura.com';
const CONTACT_FROM = 'Front Yard Aura <hello@frontyardaura.com>';
const CONTACT_TO = '6243amine@gmail.com';
const CONTACT_DEFAULT_SUBJECT = 'General inquiry';
const DEFAULT_TIME_ZONE = 'America/New_York';
const DEFAULT_DAILY_CAP = 5;
const HISTORY_PREFIX = 'pinterest-publisher:v1';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/contact') {
      return handleContactRequest(request, env);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        ok: true,
        worker: 'pinterest-publisher',
        dry_run: parseBoolean(env.DRY_RUN, true),
        daily_cap: parseNonNegativeInteger(env.DAILY_CAP ?? DEFAULT_DAILY_CAP, 'DAILY_CAP'),
        schedule_time_zone: env.SCHEDULE_TIME_ZONE || DEFAULT_TIME_ZONE,
        data_generated_at_utc: pinsData.generated_at_utc,
        pins: pinsData.stats?.pins ?? pinsData.pins.length,
        schedule_rows: pinsData.stats?.schedule_rows ?? pinsData.schedule.length,
        cron_note: 'Publishing is handled by the scheduled() cron handler, not by this HTTP route.'
      });
    }

    return jsonResponse({ ok: false, error: 'Not found.' }, 404);
  },

  async scheduled(controller, env) {
    try {
      const result = await runPinterestPublisher({
        env,
        cron: controller.cron,
        scheduledTime: controller.scheduledTime
      });

      log('info', 'run_complete', result.summary);
    } catch (error) {
      log('error', 'run_failed', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
      throw error;
    }
  }
};

async function handleContactRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return contactOptionsResponse(request);
  }

  if (request.method !== 'POST') {
    return contactJsonResponse(request, { ok: false, error: 'Method not allowed.' }, 405);
  }

  const origin = request.headers.get('Origin');
  if (origin && origin !== CONTACT_ALLOWED_ORIGIN) {
    return contactJsonResponse(request, { ok: false, error: 'Origin not allowed.' }, 403);
  }

  if (!env.RESEND_API_KEY) {
    log('error', 'contact_missing_resend_api_key');
    return contactJsonResponse(request, { ok: false, error: 'Email service is not configured.' }, 500);
  }

  let payload;
  try {
    payload = validateContactFields(await parseContactFields(request));
  } catch (error) {
    return contactJsonResponse(
      request,
      { ok: false, error: error.message || 'Invalid contact form submission.' },
      400
    );
  }

  try {
    const resendResponse = await sendContactEmail(env.RESEND_API_KEY, payload);
    log('info', 'contact_email_sent', { resend_email_id: resendResponse.id || null });
    return contactJsonResponse(request, { ok: true }, 200);
  } catch (error) {
    log('error', 'contact_email_failed', {
      status: error.status || null,
      message: error.message
    });
    return contactJsonResponse(request, { ok: false, error: 'Unable to send message right now.' }, 502);
  }
}

function contactOptionsResponse(request) {
  const origin = request.headers.get('Origin');
  if (!origin) {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'POST, OPTIONS'
      }
    });
  }

  if (origin !== CONTACT_ALLOWED_ORIGIN) {
    return new Response(null, {
      status: 403,
      headers: {
        Vary: 'Origin'
      }
    });
  }

  return new Response(null, {
    status: 204,
    headers: contactCorsHeaders(request)
  });
}

async function parseContactFields(request) {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Invalid JSON body.');
    }

    return body;
  }

  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  throw new Error('Unsupported content type.');
}

function validateContactFields(fields) {
  const name = cleanContactField(fields.name);
  const email = cleanContactField(fields.email).toLowerCase();
  const subject = cleanContactField(fields.subject);
  const message = cleanContactField(fields.message, { multiline: true });

  if (!name) throw new Error('Name is required.');
  if (!email) throw new Error('Email is required.');
  if (!isValidEmail(email)) throw new Error('Email must be valid.');
  if (!message) throw new Error('Message is required.');

  return {
    name,
    email,
    subject: subject || CONTACT_DEFAULT_SUBJECT,
    message
  };
}

function cleanContactField(value, options = {}) {
  const text = String(value || '').replace(/\u0000/g, '').replace(/\r\n?/g, '\n');

  if (options.multiline) {
    return text
      .replace(/[\u0001-\u0009\u000B-\u001F\u007F]/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return text.replace(/[\u0001-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendContactEmail(apiKey, payload) {
  const response = await fetch(RESEND_EMAILS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      reply_to: payload.email,
      subject: `Contact Form: ${payload.subject}`,
      text: contactEmailText(payload),
      html: contactEmailHtml(payload)
    })
  });

  const text = await response.text();
  const body = parseJson(text, { raw: text });

  if (!response.ok) {
    const message = body?.message || body?.error?.message || body?.name || text || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

function contactEmailText({ name, email, subject, message }) {
  return [
    'New contact form message from Front Yard Aura.',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    '',
    'Message:',
    message
  ].join('\n');
}

function contactEmailHtml({ name, email, subject, message }) {
  return `
    <p>New contact form message from Front Yard Aura.</p>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function runPinterestPublisher({ env, cron, scheduledTime }) {
  const startedAt = Date.now();
  const now = new Date(scheduledTime || Date.now());
  const dryRun = parseBoolean(env.DRY_RUN, true);
  const dailyCap = parseNonNegativeInteger(
    env.DAILY_CAP ?? pinsData.stats?.suggested_daily_cap ?? DEFAULT_DAILY_CAP,
    'DAILY_CAP'
  );
  const timeZone = env.SCHEDULE_TIME_ZONE || DEFAULT_TIME_ZONE;
  const runDate = env.RUN_DATE ? validateDateString(env.RUN_DATE, 'RUN_DATE') : dateStringInTimeZone(now, timeZone);
  const kv = env.PINTEREST_HISTORY;

  if (!dryRun && !env.PINTEREST_ACCESS_TOKEN) {
    throw new Error('PINTEREST_ACCESS_TOKEN is required when DRY_RUN is false.');
  }

  if (!dryRun && !kv) {
    throw new Error('PINTEREST_HISTORY KV binding is required when DRY_RUN is false.');
  }

  const pinsById = new Map(pinsData.pins.map((pin) => [pin.pin_id, pin]));
  const todaysSchedule = pinsData.schedule
    .filter((row) => row.scheduled_date === runDate)
    .filter((row) => !row.status || row.status === 'pending')
    .sort(compareScheduleRows);

  const dateHistory = normalizeDateHistory(await kvGetJson(kv, dateHistoryKey(runDate), emptyDateHistory(runDate)));
  const alreadyPublishedToday = dateHistory.published.length;
  const remainingDailySlots = Math.max(0, dailyCap - alreadyPublishedToday);

  log('info', 'run_start', {
    dry_run: dryRun,
    cron,
    scheduled_time_utc: now.toISOString(),
    schedule_date: runDate,
    schedule_time_zone: timeZone,
    scheduled_today: todaysSchedule.length,
    daily_cap: dailyCap,
    already_published_today: alreadyPublishedToday,
    remaining_daily_slots: remainingDailySlots,
    data_generated_at_utc: pinsData.generated_at_utc
  });

  const results = [];
  let publishSlotsUsed = 0;
  let previewed = 0;
  let published = 0;
  let skipped = 0;
  let capSkipped = 0;
  let errors = 0;

  for (const [index, row] of todaysSchedule.entries()) {
    const label = `${index + 1}/${todaysSchedule.length} ${row.pin_id}`;
    const existingRecord = await findPublishedRecord(kv, row);

    if (existingRecord) {
      skipped += 1;
      log('info', 'pin_skipped_already_published', {
        label,
        pin_id: row.pin_id,
        schedule_id: row.schedule_id,
        pinterest_pin_id: existingRecord.pinterest_pin_id || null
      });
      results.push(resultFor(row, { ok: true, skipped: true, reason: 'already_published' }));
      continue;
    }

    if (publishSlotsUsed >= remainingDailySlots) {
      capSkipped += 1;
      log('info', 'pin_skipped_daily_cap', {
        label,
        pin_id: row.pin_id,
        daily_cap: dailyCap,
        already_published_today: alreadyPublishedToday,
        selected_this_run: publishSlotsUsed
      });
      results.push(resultFor(row, { ok: true, skipped: true, reason: 'daily_cap_reached' }));
      continue;
    }

    const pin = pinsById.get(row.pin_id);
    if (!pin) {
      errors += 1;
      const error = `Missing pin metadata for ${row.pin_id}.`;
      log('error', 'pin_error', { label, error });
      results.push(resultFor(row, { ok: false, error }));
      continue;
    }

    try {
      const boardId = boardIdFor(pinsData.boards, row.board_slug, dryRun);
      const payload = payloadFor(pin, row, boardId);
      publishSlotsUsed += 1;

      if (dryRun) {
        previewed += 1;
        log('info', 'pin_dry_run', {
          label,
          pin_id: row.pin_id,
          schedule_id: row.schedule_id,
          board_slug: row.board_slug,
          board_id: boardId,
          image_url: pin.image_url,
          title: payload.title
        });
        results.push(
          resultFor(row, {
            ok: true,
            dry_run: true,
            board_id: boardId,
            title: payload.title,
            link: payload.link
          })
        );
        continue;
      }

      log('info', 'pin_publish_start', {
        label,
        pin_id: row.pin_id,
        schedule_id: row.schedule_id,
        board_slug: row.board_slug,
        board_id: boardId,
        image_url: pin.image_url
      });

      const response = await createPinterestPin(env.PINTEREST_ACCESS_TOKEN, payload);
      const publishedAt = new Date().toISOString();
      const record = {
        schedule_id: row.schedule_id,
        pin_id: row.pin_id,
        article_slug: row.article_slug,
        board_slug: row.board_slug,
        board_id: boardId,
        pin_variant: row.pin_variant,
        scheduled_date: row.scheduled_date,
        scheduled_at_utc: row.scheduled_at_utc,
        published_at_utc: publishedAt,
        pinterest_pin_id: response.id || null,
        title: payload.title,
        link: payload.link,
        image_url: pin.image_url
      };

      await recordPublished(kv, runDate, record, dateHistory);
      published += 1;

      log('info', 'pin_publish_success', {
        label,
        pin_id: row.pin_id,
        schedule_id: row.schedule_id,
        pinterest_pin_id: response.id || null
      });
      results.push(resultFor(row, { ok: true, pinterest_pin_id: response.id || null, board_id: boardId }));
    } catch (error) {
      errors += 1;
      log('error', 'pin_error', {
        label,
        pin_id: row.pin_id,
        schedule_id: row.schedule_id,
        status: error.status || null,
        retry_after: error.retryAfter || null,
        error: error.message
      });
      results.push(
        resultFor(row, {
          ok: false,
          status: error.status || null,
          retry_after: error.retryAfter || null,
          error: error.message
        })
      );
    }
  }

  return {
    summary: {
      dry_run: dryRun,
      schedule_date: runDate,
      scheduled_today: todaysSchedule.length,
      daily_cap: dailyCap,
      already_published_today: alreadyPublishedToday,
      selected_this_run: publishSlotsUsed,
      previewed,
      published,
      skipped,
      cap_skipped: capSkipped,
      errors,
      runtime_ms: Date.now() - startedAt
    },
    results: results.slice(0, 50)
  };
}

function payloadFor(pin, scheduleRow, boardId) {
  requireApprovedQuality(pin);

  const title = required(pin, 'pin_title');
  const description = required(pin, 'pin_description');
  const link = required(pin, 'destination_url');
  const altText = required(pin, 'alt_text');
  const imageUrl = required(pin, 'image_url');

  if (!/^https:\/\//i.test(imageUrl)) {
    throw new Error(`${pin.pin_id} image_url must be a public HTTPS URL.`);
  }

  return {
    board_id: boardId,
    title,
    description,
    link,
    alt_text: altText,
    media_source: {
      source_type: 'image_url',
      url: imageUrl,
      is_standard: true
    }
  };
}

function requireApprovedQuality(pin) {
  const status = String(pin.quality_status || '').trim();
  const reasons = String(pin.quality_rejection_reasons || '').trim();
  if (status !== 'approved' || reasons) {
    throw new Error(
      `${pin.pin_id || 'pin'} is not approved by the strict image quality filter ` +
        `(quality_status=${status || 'missing'}${reasons ? `, reasons=${reasons}` : ''}).`
    );
  }
}

async function createPinterestPin(accessToken, payload) {
  const response = await fetch(`${PINTEREST_API_BASE}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  const body = parseJson(text, { raw: text });

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    const message = body?.message || body?.code || text || `HTTP ${response.status}`;
    const error = new Error(retryAfter ? `${message} (retry-after: ${retryAfter})` : message);
    error.status = response.status;
    error.retryAfter = retryAfter;
    throw error;
  }

  return body;
}

function boardIdFor(boards, boardSlug, dryRun) {
  const boardId = boards?.[boardSlug];
  if (boardId && !isPlaceholderBoardId(boardId)) return boardId;
  if (dryRun) return `dry-run-board-id:${boardSlug}`;
  throw new Error(`Missing real board_id for board_slug "${boardSlug}".`);
}

function isPlaceholderBoardId(value) {
  return /^PUT_/.test(String(value)) || /_HERE$/.test(String(value)) || /^dry-run-board-id:/.test(String(value));
}

async function findPublishedRecord(kv, row) {
  if (!kv) return null;
  return (
    (await kvGetJson(kv, pinHistoryKey(row.pin_id), null)) ||
    (await kvGetJson(kv, scheduleHistoryKey(row.schedule_id), null))
  );
}

async function recordPublished(kv, runDate, record, dateHistory) {
  const cleanRecord = {
    ...record,
    recorded_at_utc: new Date().toISOString()
  };

  dateHistory.published = [
    ...dateHistory.published.filter((item) => item.pin_id !== cleanRecord.pin_id),
    {
      pin_id: cleanRecord.pin_id,
      schedule_id: cleanRecord.schedule_id,
      pinterest_pin_id: cleanRecord.pinterest_pin_id,
      published_at_utc: cleanRecord.published_at_utc
    }
  ];
  dateHistory.updated_at_utc = cleanRecord.recorded_at_utc;

  await Promise.all([
    kv.put(pinHistoryKey(cleanRecord.pin_id), JSON.stringify(cleanRecord)),
    kv.put(scheduleHistoryKey(cleanRecord.schedule_id), JSON.stringify(cleanRecord)),
    kv.put(dateHistoryKey(runDate), JSON.stringify(dateHistory))
  ]);
}

function emptyDateHistory(date) {
  return {
    version: 1,
    date,
    updated_at_utc: null,
    published: []
  };
}

function normalizeDateHistory(value) {
  if (!value || !Array.isArray(value.published)) return emptyDateHistory(value?.date || '');

  return {
    version: Number(value.version || 1),
    date: value.date || '',
    updated_at_utc: value.updated_at_utc || null,
    published: dedupeByPinId(value.published)
  };
}

function dedupeByPinId(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    if (!item?.pin_id || seen.has(item.pin_id)) continue;
    seen.add(item.pin_id);
    output.push(item);
  }
  return output;
}

function pinHistoryKey(pinId) {
  return `${HISTORY_PREFIX}:pin:${pinId}`;
}

function scheduleHistoryKey(scheduleId) {
  return `${HISTORY_PREFIX}:schedule:${scheduleId}`;
}

function dateHistoryKey(date) {
  return `${HISTORY_PREFIX}:date:${date}`;
}

async function kvGetJson(kv, key, fallback) {
  if (!kv) return fallback;
  const value = await kv.get(key);
  if (!value) return fallback;
  return parseJson(value, fallback);
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function required(object, field) {
  const value = String(object[field] || '').trim();
  if (!value) throw new Error(`${object.pin_id || 'pin'} is missing ${field}.`);
  return value;
}

function compareScheduleRows(a, b) {
  return scheduleSortKey(a).localeCompare(scheduleSortKey(b));
}

function scheduleSortKey(row) {
  return [
    row.scheduled_date,
    String(row.daily_slot || '').padStart(3, '0'),
    row.scheduled_at_utc || '',
    row.schedule_id
  ].join('|');
}

function dateStringInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validateDateString(value, label) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${label} must be YYYY-MM-DD.`);
  return date;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function resultFor(row, extra) {
  return {
    pin_id: row.pin_id,
    schedule_id: row.schedule_id,
    scheduled_date: row.scheduled_date,
    board_slug: row.board_slug,
    ...extra
  };
}

function contactJsonResponse(request, body, status = 200) {
  return jsonResponse(body, status, contactCorsHeaders(request));
}

function contactCorsHeaders(request) {
  if (request.headers.get('Origin') !== CONTACT_ALLOWED_ORIGIN) return {};

  return {
    'Access-Control-Allow-Origin': CONTACT_ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    }
  });
}

function log(level, event, details = {}) {
  const line = `[pinterest-worker] ${event} ${JSON.stringify(details)}`;
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}
