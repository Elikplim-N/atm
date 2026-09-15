const ARKESEL_SEND_URL = 'https://sms.arkesel.com/api/v2/sms/send';

// Converts a Ghanaian local number (0XXXXXXXXX) to E.164 (+233XXXXXXXXX).
// Leaves anything already in international format, or that doesn't match
// the local pattern, untouched — Arkesel can reject it, which sendSms
// already handles without throwing.
export function toGhanaE164(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (/^0\d{9}$/.test(digits)) return `+233${digits.slice(1)}`;
  return digits;
}

// Sends a single SMS via Arkesel (https://sms.arkesel.com/api/v2/sms/send).
// Never throws: a failed or unconfigured send is logged and returns null,
// so an SMS problem never breaks the feedback flow that triggered it.
// `callbackUrl`, if given, is where Arkesel will report delivery status
// (a GET with ?sms_id=...&status=... — see routes/sms.js).
export async function sendSms(to, message, callbackUrl) {
  const apiKey = process.env.ARKESEL_API_KEY;
  if (!apiKey) {
    console.warn('ARKESEL_API_KEY not set; skipping SMS to', to);
    return null;
  }

  const recipient = toGhanaE164(to);
  const body = {
    sender: process.env.ARKESEL_SENDER_ID || 'GCB',
    message,
    recipients: [recipient],
  };
  if (callbackUrl) body.callback_url = callbackUrl;

  try {
    const res = await fetch(ARKESEL_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const rawBody = await res.text();
    let data = null;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Non-JSON response (e.g. an upstream proxy error page) — fall through
      // with data left null so the raw text still gets logged below.
    }
    if (!res.ok || data?.status !== 'success') {
      console.error('Arkesel SMS send failed:', res.status, data ?? rawBody);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Arkesel SMS request error:', err.message);
    return null;
  }
}
