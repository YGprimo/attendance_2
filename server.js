require('dotenv').config();
const express = require('express');
const fetch = global.fetch || require('node-fetch');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

app.post('/api/delete-student', async (req, res) => {

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

app.post('/api/delete-all-logs', async (req, res) => {
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

app.post('/api/delete-student', async (req, res) => {
  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: 'Missing student_id' });
  try {
    const url = `${SUPABASE_URL}/rest/v1/students?student_id=eq.${encodeURIComponent(student_id)}`;
    const r = await fetch(url, { method: 'DELETE', headers: supabaseHeaders() });
    if (!r.ok) return res.status(r.status).json({ error: 'Delete student failed' });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Admin API server listening on http://localhost:${port}`));
