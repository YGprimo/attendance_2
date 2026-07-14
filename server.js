require('dotenv').config();
const express = require('express');
const fetch = global.fetch || require('node-fetch');
const cors = require('cors');

const crypto = require('crypto');

const app = express();
app.use(express.json());

// For admin login we want same-origin by default, but app currently used as API.
// Keeping permissive CORS as you already had it; authorization is still server-side.
app.use(cors());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin credentials (recommended via environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Noadmin123';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Check .env');
}

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

// In-memory session tokens (sufficient for small projects / single instance).
// If you deploy to multiple instances, switch to a persistent store.
const adminSessions = new Map(); // token -> { username, createdAt }

function isAuthorized(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const session = adminSessions.get(token);
  if (!session) return null;
  // 24h expiry
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    adminSessions.delete(token);
    return null;
  }
  return session;
}

function requireAdmin(req, res, next) {
  const session = isAuthorized(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  req.adminSession = session;
  next();
}

app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  // Constant-time compare to reduce timing attacks (basic)
  const okUser = String(username) === String(ADMIN_USERNAME);
  const okPass = safeCompare(password, ADMIN_PASSWORD);

  if (!okUser || !okPass) return res.status(401).json({ error: 'Invalid credentials' });

  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, { username, createdAt: Date.now() });

  return res.json({ success: true, token });
});


app.post('/api/delete-student', requireAdmin, async (req, res) => {

  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({
      error: "Missing student_id"
    });
  }

  try {

    // Delete attendance logs first
    const logsUrl =
      `${SUPABASE_URL}/rest/v1/attendance_logs?student_id=eq.${encodeURIComponent(student_id)}`;

    const logsDelete = await fetch(logsUrl, {
      method: "DELETE",
      headers: supabaseHeaders()
    });

    if (!logsDelete.ok) {
      const error = await logsDelete.text();

      return res.status(logsDelete.status).json({
        error: error
      });
    }

    // Delete student profile
    const studentUrl =
      `${SUPABASE_URL}/rest/v1/students?student_id=eq.${encodeURIComponent(student_id)}`;

    const studentDelete = await fetch(studentUrl, {
      method: "DELETE",
      headers: supabaseHeaders()
    });

    if (!studentDelete.ok) {
      const error = await studentDelete.text();

      return res.status(studentDelete.status).json({
        error: error
      });
    }

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});

app.post('/api/delete-all-logs', requireAdmin, async (req, res) => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/attendance_logs?id=not.is.null`;
    const r = await fetch(url, { method: 'DELETE', headers: supabaseHeaders() });
    if (!r.ok) return res.status(r.status).json({ error: 'Delete all failed' });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// NOTE: Your original file had a duplicate /api/delete-student route.
// It has been removed to avoid conflicts.

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Admin API server listening on http://localhost:${port}`));
