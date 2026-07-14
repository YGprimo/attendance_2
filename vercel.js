// Vercel serverless handler for admin delete operations.
// Deploy this file (or its exported handler) to Vercel and route /api/* to it.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://phplwcompmzeldpmalxz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
}

async function forwardDelete(url) {
  return await fetch(url, { method: 'DELETE', headers: supabaseHeaders() });
}

async function parseJsonBody(req) {
  // Vercel may already provide req.body; accept both.
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handler(req, res) {
  // Basic CORS for browser calls when previewing on Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const pathname = req.url.split('?')[0] || '/';
  try {
    if (req.method === 'POST' && pathname === '/api/delete-log') {
      const body = await parseJsonBody(req);
      const id = body && body.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=eq.${encodeURIComponent(id)}`;
      const r = await forwardDelete(url);
      if (!r.ok) return res.status(r.status).json({ error: 'Delete failed' });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'POST' && pathname === '/api/delete-all-logs') {
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=not.is.null`;
      const r = await forwardDelete(url);
      if (!r.ok) return res.status(r.status).json({ error: 'Delete all failed' });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'POST' && pathname === '/api/delete-student') {
      const body = await parseJsonBody(req);
      const student_id = body && body.student_id;
      if (!student_id) return res.status(400).json({ error: 'Missing student_id' });
      const url = `${SUPABASE_URL}/rest/v1/students?student_id=eq.${encodeURIComponent(student_id)}`;
      const r = await forwardDelete(url);
      if (!r.ok) return res.status(r.status).json({ error: 'Delete student failed' });
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('vercel handler error:', err && err.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Support both CommonJS and ESM default export patterns
module.exports = handler;
module.exports.default = handler;
