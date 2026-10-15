import { config } from '../config.js';

/** All n8n calls live here so the frontend never learns the webhook URL. */
export async function callN8n(path, payload) {
  if (!config.n8nBaseUrl) throw new Error('N8N_BASE_URL chưa được cấu hình.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.n8nTimeoutMs);
  try {
    const response = await fetch(`${config.n8nBaseUrl}/${path}`, {
      method: 'POST',
      headers: {
        ...(payload instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(config.n8nApiKey ? { 'X-API-Key': config.n8nApiKey } : {}),
      },
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { response: raw };
    }
    if (!response.ok) throw new Error(data.message || `n8n trả lỗi HTTP ${response.status}`);
    // n8n webhook nodes may return a single-item array.
    return Array.isArray(data) && data.length === 1 ? data[0] : data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('n8n quá thời gian chờ phản hồi.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
