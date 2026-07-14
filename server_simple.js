// Minimal server without external deps — reads .env if present and exposes API endpoints
const http = require('http');
const fs = require('fs');
const { URL } = require('url');

function loadEnv() {
  const env = {};
  try {
    const data = fs.readFileSync('.env', 'utf8');
    data.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([^#=]+)=\s*(.*)\s*$/);
      if (m) env[m[1].trim()] = m[2].trim();
    });
  } catch (e) {}
  return env;
}

const env = Object.assign({}, process.env, loadEnv());
const SUPABASE_URL = env.SUPABASE_URL || 'https://phplwcompmzeldpmalxz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
const PORT = Number(env.PORT || 3000);

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
}

async function forwardDelete(url) {
  const res = await fetch(url, { method: 'DELETE', headers: supabaseHeaders() });
  return res;
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  console.log('[api]', req.method, parsed.pathname);
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return resEnd(204, {});
  if (req.method === 'POST' && parsed.pathname === '/api/delete-log') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      let id;
      try { id = JSON.parse(body || '{}').id; }
      catch (e) { console.error('Invalid JSON body for delete-log:', body); return resEnd(400, { error: 'Invalid JSON' }); }
      if (!id) return resEnd(400, { error: 'Missing id' });
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=eq.${encodeURIComponent(id)}`;
      const r = await forwardDelete(url);
      if (!r.ok) return resEnd(r.status, { error: 'Delete failed' });
      return resEnd(200, { success: true });
    } catch (err) { console.error(err); return resEnd(500, { error: 'Server error' }); }
  }

  if (req.method === 'POST' && parsed.pathname === '/api/delete-all-logs') {
    try {
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=not.is.null`;
      const r = await forwardDelete(url);
      if (!r.ok) return resEnd(r.status, { error: 'Delete all failed' });
      return resEnd(200, { success: true });
    } catch (err) { console.error(err); return resEnd(500, { error: 'Server error' }); }
  }

  if (req.method === 'POST' && parsed.pathname === '/api/delete-student') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      let student_id;
      try { student_id = JSON.parse(body || '{}').student_id; }
      catch (e) { console.error('Invalid JSON body for delete-student:', body); return resEnd(400, { error: 'Invalid JSON' }); }
      if (!student_id) return resEnd(400, { error: 'Missing student_id' });
      const url = `${SUPABASE_URL}/rest/v1/students?student_id=eq.${encodeURIComponent(student_id)}`;
      const r = await forwardDelete(url);
      if (!r.ok) return resEnd(r.status, { error: 'Delete student failed' });
      return resEnd(200, { success: true });
    } catch (err) { console.error(err); return resEnd(500, { error: 'Server error' }); }
  }

  // default
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));

  function resEnd(status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  }
});

server.listen(PORT, () => console.log(`Simple admin API server listening on http://localhost:${PORT}`));
