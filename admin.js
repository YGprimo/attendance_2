const SUPABASE_URL = "https://phplwcompmzeldpmalxz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocGx3Y29tcG16ZWxkcG1hbHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Njk1NTEsImV4cCI6MjA5OTU0NTU1MX0.B-Kp_RJ-vEXcYmRblzMpZK4OvXkgkBmhsYHo0UaDh2Y";

function adminShowAlert(msg, type = '') {
  const el = document.getElementById('regAlert');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = msg;
  el.className = 'alert';
  if (type === 'success') el.classList.add('alert-success');
  if (type === 'error') el.classList.add('alert-error');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('regId').value.trim();
      const fullName = document.getElementById('regName').value.trim();
      const courseUnit = document.getElementById('regCourse').value.trim();

      adminShowAlert('Saving entry...');
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation'
          },
          body: JSON.stringify([{ student_id: studentId, full_name: fullName, course_or_grade: courseUnit }])
        });
        if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
        adminShowAlert('✅ Success: Profile added to active registry.', 'success');
        form.reset();
        loadLoginHistory();
      } catch (err) {
        console.error(err);
        adminShowAlert('❌ Entry Rejected. See console for details.', 'error');
      }
    });
  }

  // --- Login History ---
  async function loadLoginHistory() {
    const tableBody = document.getElementById('logsDataTableBody');
    if (!tableBody) return;
    try {
      const params = new URLSearchParams({ select: 'id,timestamp,student_id,students(full_name,course_or_grade)', order: 'timestamp.desc', limit: '200' });
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?${params.toString()}`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const logs = await res.json();

      // cache logs for download/print
      window._adminLogsCache = logs || [];

      tableBody.innerHTML = '';
      if (!logs || logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No terminal logs registered to memory files.</td></tr>`;
        return;
      }

      logs.forEach(log => {
        const tr = document.createElement('tr');
        const ts = new Date(log.timestamp).toLocaleString();
        const name = log.students ? log.students.full_name : 'Deleted System Profile';
        const course = log.students ? log.students.course_or_grade : 'Unresolved Data';
        tr.innerHTML = `
          <td>${ts}</td>
          <td><strong>${log.student_id}</strong></td>
          <td>${name}</td>
          <td>${course}</td>
          <td><button class="btn-refresh" onclick="deleteLog(${log.id})">Delete</button></td>
        `;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;">Failed loading logs.</td></tr>`;
    }
  }

  // --- Audit ---
  async function loadAudit() {
    const tableBody = document.getElementById('auditTableBody');
    if (!tableBody) return;
    try {
      const params = new URLSearchParams({ select: '*', order: 'timestamp.desc', limit: '200' });
      const url = `${SUPABASE_URL}/rest/v1/audit_logs?${params.toString()}`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error('Fetch failed');
      const rows = await res.json();
      tableBody.innerHTML = '';
      if (!rows || rows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No audit records.</td></tr>`;
        return;
      }
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.actor||''}</td><td>${r.action||''}</td><td>${r.details||''}</td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444">Failed loading audit.</td></tr>`;
    }
  }

  // --- DTR (derived) ---
  async function loadDTR() {
    const tableBody = document.getElementById('dtrTableBody');
    if (!tableBody) return;
    try {
      const params = new URLSearchParams({ select: 'timestamp,student_id,students(full_name)', order: 'timestamp.asc', limit: '1000' });
      const url = `${SUPABASE_URL}/rest/v1/attendance_logs?${params.toString()}`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error('Fetch failed');
      const logs = await res.json();
      // group by student and date
      const map = new Map();
      logs.forEach(l => {
        const d = new Date(l.timestamp);
        const key = `${l.student_id}_${d.toISOString().slice(0,10)}`;
        if (!map.has(key)) map.set(key, { student_id: l.student_id, date: d.toISOString().slice(0,10), first: l.timestamp, last: l.timestamp, name: l.students?l.students.full_name:'' });
        else {
          const obj = map.get(key);
          if (l.timestamp < obj.first) obj.first = l.timestamp;
          if (l.timestamp > obj.last) obj.last = l.timestamp;
        }
      });
      const rows = Array.from(map.values());
      tableBody.innerHTML = '';
      if (!rows.length) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No DTR data.</td></tr>`;
        return;
      }
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.date}</td><td>${r.student_id}</td><td>${new Date(r.first).toLocaleTimeString()}</td><td>${new Date(r.last).toLocaleTimeString()}</td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444">Failed loading DTR.</td></tr>`;
    }
  }

  // --- Students list ---
  async function loadStudents() {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return;
    try {
      const url = `${SUPABASE_URL}/rest/v1/students?select=student_id,full_name,course_or_grade&order=student_id.asc`;
      const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (!res.ok) throw new Error('Fetch failed');
      const rows = await res.json();
      tableBody.innerHTML = '';
      if (!rows || rows.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8">No students found.</td></tr>`;
        return;
      }
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.student_id}</td><td>${r.full_name}</td><td>${r.course_or_grade||''}</td><td><button class="btn-refresh" onclick="deleteStudent('${r.student_id}')">Delete</button></td>`;
        tableBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#ef4444">Failed loading students.</td></tr>`;
    }
  }

  function logsToCsv(logs) {
    const headers = ['timestamp','student_id','full_name','course_or_grade'];
    const rows = logs.map(l => {
      const full = l.students ? l.students.full_name : '';
      const course = l.students ? l.students.course_or_grade : '';
      return [l.timestamp, l.student_id, full, course].map(v => `"${String(v || '').replace(/"/g,'""')}"`).join(',');
    });
    return headers.join(',') + '\n' + rows.join('\n');
  }

  function downloadCsv() {
    const logs = window._adminLogsCache || [];
    if (!logs.length) return alert('No logs to download');
    const csv = logsToCsv(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login_history_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printLogs() {
    const logs = window._adminLogsCache || [];
    const popup = window.open('', '_blank');
    const html = `<!doctype html><html><head><title>Login History</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style></head><body><h2>Login History</h2><table><thead><tr><th>Timestamp</th><th>Student ID</th><th>Name</th><th>Course</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.student_id}</td><td>${l.students?l.students.full_name:''}</td><td>${l.students?l.students.course_or_grade:''}</td></tr>`).join('')}</tbody></table></body></html>`;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  // hook up download and print buttons
  const downloadBtn = document.getElementById('downloadCsvBtn');
  if (downloadBtn) downloadBtn.addEventListener('click', downloadCsv);
  const printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', printLogs);

  // expose for manual refresh button (legacy name kept for compatibility)
  window.loadLoginHistory = loadLoginHistory;
  loadLoginHistory();

  // tab switching
  const tabs = {
    tabLoginHistory: 'sectionLoginHistory',
    tabAudit: 'sectionAudit',
    tabDTR: 'sectionDTR',
    tabStudents: 'sectionStudents'
  };
  Object.keys(tabs).forEach(tabId => {
    const btn = document.getElementById(tabId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      Object.values(tabs).forEach(sid => document.getElementById(sid).style.display = 'none');
      document.getElementById(tabs[tabId]).style.display = 'block';
      if (tabId === 'tabLoginHistory') loadLoginHistory();
      if (tabId === 'tabAudit') loadAudit();
      if (tabId === 'tabDTR') loadDTR();
      if (tabId === 'tabStudents') loadStudents();
    });
  });

  // delete functions
  window.deleteLog = async function(id) {
    if (!confirm('Delete this log entry?')) return;
    try {
      const res = await fetch('http://localhost:3000/api/delete-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      loadLoginHistory();
    } catch (err) { console.error(err); alert('Failed to delete log'); }
  };

  const deleteAllBtn = document.getElementById('deleteAllLogsBtn');
  if (deleteAllBtn) deleteAllBtn.addEventListener('click', async () => {
    if (!confirm('Delete ALL login history? This cannot be undone.')) return;
    try {
      const res = await fetch('http://localhost:3000/api/delete-all-logs', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Delete all failed');
      loadLoginHistory();
    } catch (err) { console.error(err); alert('Failed to delete all logs'); }
  });

  window.deleteStudent = async function(studentId) {
    if (!confirm(`Delete student ${studentId}? This will remove the profile.`)) return;
    try {
      const res = await fetch('http://localhost:3000/api/delete-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentId }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Delete student failed');
      loadStudents();
    } catch (err) { console.error(err); alert('Failed to delete student'); }
  };
});
