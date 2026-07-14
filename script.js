const SUPABASE_URL = "https://phplwcompmzeldpmalxz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocGx3Y29tcG16ZWxkcG1hbHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Njk1NTEsImV4cCI6MjA5OTU0NTU1MX0.B-Kp_RJ-vEXcYmRblzMpZK4OvXkgkBmhsYHo0UaDh2Y";

function showStatus(message, type = '') {
  const el = document.getElementById('status');
  el.style.display = 'block';
  el.textContent = message;
  el.className = 'alert';
  if (type === 'success') el.classList.add('alert-success');
  if (type === 'error') el.classList.add('alert-error');
}

function clearStatus() {
  const el = document.getElementById('status');
  el.style.display = 'none';
  el.textContent = '';
  el.className = 'alert';
}

async function checkInStudent(studentId) {
  try {
    // Verify student exists
    const lookup = await fetch(`${SUPABASE_URL}/rest/v1/students?student_id=eq.${encodeURIComponent(studentId)}&select=full_name`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!lookup.ok) throw new Error(`Lookup failed: ${lookup.status}`);
    const matches = await lookup.json();
    if (!matches || matches.length === 0) {
      showStatus('ID not found. Please register first.', 'error');
      return;
    }

    const payload = { student_id: studentId, timestamp: new Date().toISOString() };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify([payload])
    });

    if (!res.ok) {
      if (res.status === 409) {
        showStatus('Already checked in (conflict).', 'error');
      } else {
        throw new Error(`Insert failed: ${res.status}`);
      }
      return;
    }

    showStatus('Checked in successfully ✅', 'success');
    loadRecentLogs();
  } catch (err) {
    console.error(err);
    showStatus('Failed to check in. Please try again.', 'error');
  }
}

async function loadRecentLogs() {
  const tbody = document.getElementById('recentLogs');
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">Loading recent check-ins…</td></tr>`;
  try {
    const params = new URLSearchParams({ select: 'timestamp,student_id,students(full_name)', order: 'timestamp.desc', limit: '10' });
    const url = `${SUPABASE_URL}/rest/v1/attendance_logs?${params.toString()}`;
    const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    if (!res.ok) throw new Error(`Fetch logs failed: ${res.status}`);
    const logs = await res.json();

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No check-ins yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    logs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleString();
      const name = log.students ? log.students.full_name : '-';
      const row = `<tr><td>${time}</td><td><strong>${log.student_id}</strong></td><td>${name}</td></tr>`;
      tbody.insertAdjacentHTML('beforeend', row);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#ef4444;">Failed loading logs.</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkinForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatus();
    const id = document.getElementById('studentId').value.trim();
    if (!id) {
      showStatus('Please enter an ID.', 'error');
      return;
    }
    showStatus('Recording check-in...', '');
    await checkInStudent(id);
    form.reset();
    setTimeout(clearStatus, 3500);
  });

  loadRecentLogs();
});

// Only attempt to load recent logs if the target element exists (admin-only UI removed from terminal)
if (document.getElementById('recentLogs')) {
  loadRecentLogs();
}
