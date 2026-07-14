const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://phplwcompmzeldpmalxz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Noadmin123';

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
}

function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

async function parseJsonBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function forwardDelete(url) {
  return fetch(url, { method: 'DELETE', headers: supabaseHeaders() });
}

function sendJson(res, status, payload) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).send(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const pathname = req.url ? req.url.split('?')[0] : '';

  try {
    if (req.method === 'POST' && pathname === '/api/admin-login') {
      const body = await parseJsonBody(req);
      const username = body.username || '';
      const password = body.password || '';

      if (!username || !password) {
        return sendJson(res, 400, { error: 'Missing username or password' });
      }

      const okUser = safeCompare(username, ADMIN_USERNAME);
      const okPass = safeCompare(password, ADMIN_PASSWORD);
      if (!okUser || !okPass) {
        return sendJson(res, 401, { error: 'Invalid credentials' });
      }

      const token = crypto.randomBytes(24).toString('hex');
      return sendJson(res, 200, { success: true, token });
    }

    if (req.method === 'POST' && pathname === '/api/delete-log') {
      const body = await parseJsonBody(req);
      const id = body.id;
      if (!id) return sendJson(res, 400, { error: 'Missing id' });
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=eq.${encodeURIComponent(id)}`;
      const r = await forwardDelete(url);
      if (!r.ok) {
        const errText = await r.text();
        return sendJson(res, r.status, { error: errText || 'Delete failed' });
      }
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname === '/api/delete-all-logs') {
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=not.is.null`;
      const r = await forwardDelete(url);
      if (!r.ok) {
        const errText = await r.text();
        return sendJson(res, r.status, { error: errText || 'Delete all failed' });
      }
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname === '/api/delete-student') {
      const body = await parseJsonBody(req);
      const student_id = body.student_id;
      if (!student_id) return sendJson(res, 400, { error: 'Missing student_id' });
      const url = `${SUPABASE_URL}/rest/v1/students?student_id=eq.${encodeURIComponent(student_id)}`;
      const r = await forwardDelete(url);
      if (!r.ok) {
        const errText = await r.text();
        return sendJson(res, r.status, { error: errText || 'Delete student failed' });
      }
      return sendJson(res, 200, { success: true });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Vercel handler error:', err);
    return sendJson(res, 500, { error: 'Server error' });
  }
};
