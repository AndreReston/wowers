import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { T } from '../lib/styles';
import { Field, Modal, Confirm, Notification } from '../components/UI';
import {
  ROLES, ROLE_META, COURSES, YEAR_LEVELS, SECTIONS, DOCS, STAGES, NEXT_STAGE,
  STAGE_COLOR, STAGE_ICON, FLOORS, BUILDINGS, CATEGORIES, CAT_ICON, CAT_COLOR, STATUS_STYLE,
  ACADEMIC_YEARS, SEMESTERS, CURRENT_AY, CURRENT_SEMESTER, DAYS, TIME_SLOTS,
  GRADE_COMPONENTS, ATTENDANCE_STATUS, ANN_TARGETS, BOOK_CATEGORIES,
  MAX_BORROW_LIMIT, FINE_PER_DAY, CLEARANCE_OFFICES, FEE_TYPES, PAYMENT_METHODS,
  DOC_TYPES, DOC_PURPOSES, WITHDRAWAL_REASONS, SHIFT_REASONS, HONORS,
  today, dueDate, transmute, transmuteLabel, gradeDescription, getHonor,
  computeGrade, gradeColor, validSectionsFor, detectScheduleConflicts,
} from '../lib/constants';

// ─── DATA HOOKS ──────────────────────────────────────────────────────────────

function useSupabaseQuery(table, select = '*', filter = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(table).select(select);
    if (filter) Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v); });
    const { data: result, error } = await q;
    if (error) console.error(`useSupabaseQuery [${table}]:`, error.message);
    setData(result || []);
    setLoading(false);
  }, [table, select, JSON.stringify(filter)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { profile } = useAuth();
  const { data: users } = useSupabaseQuery('profiles');
  const { data: rooms } = useSupabaseQuery('rooms');
  const { data: applicants } = useSupabaseQuery('applicants');
  const { data: transactions } = useSupabaseQuery('book_transactions');
  const { data: books } = useSupabaseQuery('books');
  const { data: subjects } = useSupabaseQuery('subjects');
  const { data: announcements } = useSupabaseQuery('announcements');

  const isTeacher = profile?.role === 'Teacher';
  const overdue = transactions.filter(t => t.status === 'Overdue').length;
  const enrolled = applicants.filter(a => a.stage === 'Enrolled').length;
  const pendingApps = applicants.filter(a => ["Applicant", "Under Review", "For Interview", "Approved"].includes(a.stage)).length;

  const mySubjects = isTeacher ? subjects.filter(s => s.teacher_id === profile?.id) : [];
  const mySections = [...new Set(mySubjects.map(s => s.section))];
  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const todayClasses = mySubjects.filter(s => s.day === todayName);
  const myAnn = announcements.filter(a => a.target === "All" || a.target === "Teachers").slice(0, 3);

  if (isTeacher) {
    return (
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Teacher Dashboard</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>Welcome back, {profile?.name?.split(" ")[0]}.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
          {[["My Subjects", mySubjects.length, "#0f3460"], ["My Sections", mySections.length, "#1b4332"], ["Today's Classes", todayClasses.length, "#633806"]].map(([k, v, c]) => (
            <div key={k} style={{ ...T.card, padding: "1.25rem" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={T.card}>
            <p style={{ ...T.label, marginBottom: 12 }}>Today's Schedule — {todayName}</p>
            {todayClasses.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No classes today.</p>}
            {todayClasses.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f4f0" }}>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: "#1565c0", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.code} — {s.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{s.section} · {s.time_slot}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={T.card}>
            <p style={{ ...T.label, marginBottom: 12 }}>Announcements</p>
            {myAnn.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No announcements.</p>}
            {myAnn.map(a => (
              <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f4f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {a.pinned && <span style={T.pill("#fff8ee","#a05800","#fac77555")}>Pinned</span>}
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{a.title}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{a.date}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#666", lineHeight: 1.5 }}>{a.body?.slice(0, 120)}{a.body?.length > 120 ? "..." : ""}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>System Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
        {[["Users", users.length, "#1a1a2e"], ["Enrolled", enrolled, "#1b4332"], ["In Pipeline", pendingApps, "#633806"], ["Overdue Books", overdue, overdue > 0 ? "#7a1c2e" : "#aaa"]].map(([k, v, c]) => (
          <div key={k} style={{ ...T.card, padding: "1.25rem" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={T.card}>
          <p style={{ ...T.label, marginBottom: 12 }}>Users by role</p>
          {ROLES.map(r => {
            const count = users.filter(u => u.role === r).length;
            const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
            const m = ROLE_META[r];
            return (
              <div key={r} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: m.color, fontWeight: 500 }}>{m.icon} {r}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 4, background: "#f5f4f0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: m.accent, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={T.card}>
          <p style={{ ...T.label, marginBottom: 12 }}>Enrollment pipeline</p>
          {STAGES.map(s => {
            const count = applicants.filter(a => a.stage === s).length;
            const pct = applicants.length > 0 ? Math.round((count / applicants.length) * 100) : 0;
            const sc = STAGE_COLOR[s];
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, width: 96, color: sc.color, fontWeight: 500 }}>{STAGE_ICON[s]} {s}</span>
                <div style={{ flex: 1, height: 4, background: "#f5f4f0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: sc.border, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#555", width: 20, textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { profile } = useAuth();
  const { data: enrollments } = useSupabaseQuery('enrollments', '*, subjects(*)');
  const { data: grades } = useSupabaseQuery('grades', '*', { student_id: profile?.id });
  const { data: attendance } = useSupabaseQuery('attendance', '*', { student_id: profile?.id });
  const { data: transactions } = useSupabaseQuery('book_transactions', '*', { borrower_id: profile?.id });
  const { data: announcements } = useSupabaseQuery('announcements');
  const { data: subjects } = useSupabaseQuery('subjects');

  const m = ROLE_META["Student"];
  const mySubjects = enrollments.map(e => e.subjects).filter(Boolean);
  const activeTx = transactions.filter(t => t.status !== "Returned");
  const presentCount = attendance.filter(a => a.status === "Present").length;
  const totalAtt = attendance.length;
  const attRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : null;
  const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const todayClasses = mySubjects.filter(s => s.day === todayName);
  const myAnn = announcements.filter(a => a.target === "All" || a.target === "Students").slice(0, 3);

  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + computeGrade(g), 0) / grades.length)
    : null;

  return (
    <div>
      <div style={{ ...T.card, marginBottom: "1.25rem", padding: "1.5rem", background: m.light, border: `1px solid ${m.accent}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 50, background: m.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>{profile?.avatar}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: m.color }}>{profile?.name}</p>
            <p style={{ margin: 0, fontSize: 13, color: m.accent }}>{profile?.course} · {profile?.year} · {profile?.section || "No section"}</p>
          </div>
          {avgGrade !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: avgGrade >= 85 ? "#1b4332" : avgGrade >= 75 ? "#633806" : "#7a1c2e" }}>{avgGrade}</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg Grade</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "1.25rem" }}>
        <div style={{ ...T.card, padding: "1rem" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0f3460" }}>{mySubjects.length}</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Enrolled Subjects</div>
        </div>
        <div style={{ ...T.card, padding: "1rem" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: attRate !== null ? (attRate >= 90 ? "#1b4332" : attRate >= 75 ? "#633806" : "#7a1c2e") : "#aaa" }}>{attRate !== null ? `${attRate}%` : "—"}</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Attendance Rate</div>
        </div>
        <div style={{ ...T.card, padding: "1rem" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: activeTx.length > 0 ? "#633806" : "#1b4332" }}>{activeTx.length}</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Active Borrows</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={T.card}>
          <p style={{ ...T.label, marginBottom: 10 }}>Today's Classes — {todayName}</p>
          {todayClasses.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No classes today.</p>}
          {todayClasses.map(s => (
            <div key={s.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f4f0" }}>
              <div style={{ width: 4, borderRadius: 2, background: "#2d6a4f", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.code} — {s.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{s.time_slot} · {s.section}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={T.card}>
          <p style={{ ...T.label, marginBottom: 10 }}>My Grades</p>
          {grades.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No grades posted yet.</p>}
          {grades.slice(0, 4).map(g => {
            const subj = subjects.find(s => s.id === g.subject_id);
            const avg = computeGrade(g);
            return (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f5f4f0" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{subj?.code || "—"}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{subj?.name?.slice(0, 30) || ""}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: gradeColor(avg) }}>{avg}</span>
              </div>
            );
          })}
        </div>
        <div style={{ ...T.card, gridColumn: "1 / -1" }}>
          <p style={{ ...T.label, marginBottom: 10 }}>Announcements</p>
          {myAnn.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No announcements.</p>}
          {myAnn.map(a => (
            <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f4f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {a.pinned && <span style={T.pill("#fff8ee","#a05800","#fac77555")}>Pinned</span>}
                <span style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{a.author_name} · {a.date}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#666", lineHeight: 1.5 }}>{a.body?.slice(0, 100)}{a.body?.length > 100 ? "..." : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── USERS MODULE ────────────────────────────────────────────────────────────

function UsersModule({ notify }) {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("All");
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, []);

  const filtered = users.filter(u => {
    const mr = filterRole === "All" || u.role === filterRole;
    const mq = u.name.toLowerCase().includes(searchQ.toLowerCase()) || u.email.toLowerCase().includes(searchQ.toLowerCase());
    return mr && mq;
  });

  const roleCounts = ROLES.reduce((a, r) => ({ ...a, [r]: users.filter(u => u.role === r).length }), {});

  const updateRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    setUsers(p => p.map(u => u.id === id ? { ...u, role } : u));
    notify("Role updated.");
  };

  const toggleStatus = async (id, current) => {
    const next = current === "Active" ? "Suspended" : "Active";
    await supabase.from('profiles').update({ status: next }).eq('id', id);
    setUsers(p => p.map(u => u.id === id ? { ...u, status: next } : u));
    notify("Status updated.");
  };

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>User Management</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{users.length} total users</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.25rem" }}>
        {ROLES.map(r => {
          const m = ROLE_META[r];
          return (
            <div key={r} style={{ ...T.card, padding: "1rem", cursor: "pointer", border: filterRole === r ? `2px solid ${m.accent}` : "1px solid #e8e6e0" }} onClick={() => setFilterRole(filterRole === r ? "All" : r)}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{roleCounts[r]}</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>{r}s</div>
            </div>
          );
        })}
      </div>
      <div style={T.card}>
        <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search name or email..." style={{ ...T.input, maxWidth: 280 }} />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={T.select}>
            <option value="All">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0efeb" }}>
                {["User", "Role", "Status", "Course", "Year", "Section", "Joined", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const m = ROLE_META[u.role];
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 50, background: m.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: m.color, flexShrink: 0 }}>{u.avatar}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500 }}>{u.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{ padding: "4px 8px", background: m.light, border: `1px solid ${m.accent}33`, borderRadius: 7, fontSize: 12, fontWeight: 600, color: m.color, cursor: "pointer" }}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={T.pill(u.status === "Active" ? "#eafaf1" : "#fff8ee", u.status === "Active" ? "#1b4332" : "#a05800")}>{u.status}</span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#888", fontSize: 12 }}>{u.course || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#888", fontSize: 12 }}>{u.year || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#888", fontSize: 12 }}>{u.section || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#aaa", fontSize: 12 }}>{u.joined || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => toggleStatus(u.id, u.status)} style={{ ...T.btn("ghost"), padding: "4px 10px", fontSize: 11 }}>
                        {u.status === "Active" ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No users match.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── ROOMS MODULE — BLUEPRINT HELPERS ────────────────────────────────────────

const _SNAP = 20;
const _MIN_W = 100;
const _MIN_H = 60;
const _CANVAS_W = 1400;
const _CANVAS_H = 900;
const _GRID = 20;
const _BP_STORAGE_KEY = 'schoolos_blueprint_layout';

const CAT_BP_COLOR = {
  Classroom:      { fill: '#e8f0ff', stroke: '#6b8fd4', label: '#1a3a7c' },
  Laboratory:     { fill: '#ede8ff', stroke: '#8b7ed4', label: '#2d1a7c' },
  Library:        { fill: '#e8fff0', stroke: '#6bd4a0', label: '#0f5c3a' },
  Gym:            { fill: '#fff8e8', stroke: '#d4a96b', label: '#7c4a0f' },
  'Faculty Room': { fill: '#ffe8f4', stroke: '#d46b9b', label: '#7c0f3f' },
  'Admin Office': { fill: '#f0f0f0', stroke: '#888',    label: '#333'    },
  Canteen:        { fill: '#eaffe8', stroke: '#7bd46b', label: '#1f6b0f' },
  Clinic:         { fill: '#ffe8e8', stroke: '#d46b6b', label: '#7c0f0f' },
};

const CAT_PHOTO_KW = {
  Classroom:      'classroom school',
  Laboratory:     'science laboratory school',
  Library:        'school library books',
  Gym:            'school gymnasium',
  'Faculty Room': 'office faculty room',
  'Admin Office': 'school administration office',
  Canteen:        'school cafeteria',
  Clinic:         'school clinic medical',
};

function _loadLayout() {
  try { return JSON.parse(localStorage.getItem(_BP_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function _saveLayout(layout) {
  try { localStorage.setItem(_BP_STORAGE_KEY, JSON.stringify(layout)); } catch {}
}

// ─── MULTI-FLOOR STACKED ISOMETRIC BLUEPRINT ─────────────────────────────────

const ISO_CANVAS_W = 1400;
const ISO_CANVAS_H = 920;
const ISO_ORIGIN_X = 700;
const ISO_ORIGIN_Y = 220;

const FLOOR_LABEL_ORDER = [
  'Ground Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor',
];
function floorIdx(label) {
  const i = FLOOR_LABEL_ORDER.indexOf(label);
  return i >= 0 ? i : 0;
}

const FLOOR_LIFT_PX = 110;
const BASE_TILE_W = 110;
const BASE_TILE_H = 55;
const BASE_WALL_H = 44;

const _ISO_STORAGE_KEY = 'schoolos_iso_blueprint_layout_v2';
function _loadIsoLayout() {
  try { return JSON.parse(localStorage.getItem(_ISO_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function _saveIsoLayout(layout) {
  try { localStorage.setItem(_ISO_STORAGE_KEY, JSON.stringify(layout)); } catch {}
}

function makeFloorIso(tileW, tileH, panX, panY) {
  function project(gx, gy, floorElevation = 0) {
    const sx = ISO_ORIGIN_X + panX + (gx - gy) * (tileW / 2);
    const sy = ISO_ORIGIN_Y + panY + (gx + gy) * (tileH / 2) - floorElevation;
    return { sx, sy };
  }
  function screenToGridDelta(dx, dy) {
    const gx = (dx / (tileW / 2) + dy / (tileH / 2)) / 2;
    const gy = (dy / (tileH / 2) - dx / (tileW / 2)) / 2;
    return { gx, gy };
  }
  return { project, screenToGridDelta };
}

function IsoRoomBox({ gx, gy, gw, gh, wallH, floorElev, tileW, tileH, panX, panY,
  faceColor, rightColor, leftColor, strokeColor, isSelected,
  children, onClick, onDragStart, onResizeDrag }) {
  const { project } = makeFloorIso(tileW, tileH, panX, panY);
  const tl = project(gx,      gy,      floorElev);
  const tr = project(gx + gw, gy,      floorElev);
  const br = project(gx + gw, gy + gh, floorElev);
  const bl = project(gx,      gy + gh, floorElev);
  const topPts   = `${tl.sx},${tl.sy} ${tr.sx},${tr.sy} ${br.sx},${br.sy} ${bl.sx},${bl.sy}`;
  const rightPts = `${tr.sx},${tr.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + wallH} ${tr.sx},${tr.sy + wallH}`;
  const leftPts  = `${bl.sx},${bl.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + wallH} ${bl.sx},${bl.sy + wallH}`;
  const cx = (tl.sx + tr.sx + br.sx + bl.sx) / 4;
  const cy = (tl.sy + tr.sy + br.sy + bl.sy) / 4;
  const rhx = br.sx, rhy = br.sy + wallH;
  return (
    <g style={{ cursor: 'grab' }} onMouseDown={onDragStart}
      onClick={e => { e.stopPropagation(); onClick && onClick(); }}>
      <polygon points={rightPts} fill={rightColor} stroke={strokeColor} strokeWidth="0.8" />
      <polygon points={leftPts}  fill={leftColor}  stroke={strokeColor} strokeWidth="0.8" />
      <polygon points={topPts}   fill={faceColor}  stroke={strokeColor} strokeWidth="1.2"
        style={{ filter: isSelected ? `drop-shadow(0 0 6px ${strokeColor})` : 'none' }} />
      {isSelected && <polygon points={topPts} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeOpacity="0.9" />}
      {children && (
        <foreignObject x={cx - 55} y={cy - 24} width={110} height={48} style={{ pointerEvents: 'none' }}>
          <div xmlns="http://www.w3.org/1999/xhtml"
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            {children}
          </div>
        </foreignObject>
      )}
      <circle cx={rhx} cy={rhy} r={6} fill={isSelected ? '#5ba4ff' : strokeColor}
        stroke="#fff" strokeWidth="1.5" style={{ cursor: 'nwse-resize' }}
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onResizeDrag && onResizeDrag(e); }}
        onClick={e => e.stopPropagation()} />
    </g>
  );
}

function IsoStaircase({ fromElev, toElev, gx, gy, tileW, tileH, wallH, panX, panY }) {
  const { project } = makeFloorIso(tileW, tileH, panX, panY);
  const W = 1.5, D = 1.0, steps = 6;
  const paths = [];
  for (let s = 0; s < steps; s++) {
    const t0 = s / steps, t1 = (s + 1) / steps;
    const e0 = fromElev + (toElev - fromElev) * t0;
    const e1 = fromElev + (toElev - fromElev) * t1;
    const x0 = gx + W * t0, x1 = gx + W * t1;
    const tl = project(x0, gy,     e0);
    const tr = project(x1, gy,     e1);
    const br = project(x1, gy + D, e1);
    const bl = project(x0, gy + D, e0);
    const topPts   = `${tl.sx},${tl.sy} ${tr.sx},${tr.sy} ${br.sx},${br.sy} ${bl.sx},${bl.sy}`;
    const riserPts = `${tr.sx},${tr.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + wallH * 0.25} ${tr.sx},${tr.sy + wallH * 0.25}`;
    paths.push(
      <g key={s}>
        <polygon points={riserPts} fill="rgba(180,200,255,0.18)" stroke="rgba(100,160,255,0.35)" strokeWidth="0.5" />
        <polygon points={topPts}   fill={s % 2 === 0 ? 'rgba(160,190,255,0.28)' : 'rgba(120,160,255,0.22)'}
          stroke="rgba(100,160,255,0.45)" strokeWidth="0.6" />
      </g>
    );
  }
  const r0 = project(gx,     gy,     fromElev);
  const r1 = project(gx + W, gy,     toElev);
  const r2 = project(gx,     gy + D, fromElev);
  const r3 = project(gx + W, gy + D, toElev);
  const railH = wallH * 0.55;
  return (
    <g>
      {paths}
      <line x1={r0.sx} y1={r0.sy - railH} x2={r1.sx} y2={r1.sy - railH} stroke="rgba(100,160,255,0.6)" strokeWidth="1.5" strokeDasharray="4,2" />
      <line x1={r0.sx} y1={r0.sy} x2={r0.sx} y2={r0.sy - railH} stroke="rgba(100,160,255,0.4)" strokeWidth="1" />
      <line x1={r1.sx} y1={r1.sy} x2={r1.sx} y2={r1.sy - railH} stroke="rgba(100,160,255,0.4)" strokeWidth="1" />
      <line x1={r2.sx} y1={r2.sy - railH} x2={r3.sx} y2={r3.sy - railH} stroke="rgba(100,160,255,0.4)" strokeWidth="1" strokeDasharray="4,2" />
      <text x={(r0.sx + r1.sx) / 2} y={(r0.sy + r1.sy) / 2 - railH - 4}
        fill="rgba(160,200,255,0.7)" fontSize="7" fontFamily="monospace" textAnchor="middle">STAIRS</text>
    </g>
  );
}

function IsoElevator({ fromElev, toElev, gx, gy, tileW, tileH, wallH, panX, panY }) {
  const { project } = makeFloorIso(tileW, tileH, panX, panY);
  const W = 1.0, D = 1.0;
  const tr  = project(gx + W, gy,     fromElev);
  const bl  = project(gx,     gy + D, fromElev);
  const ttr = project(gx + W, gy,     toElev);
  const tbl = project(gx,     gy + D, toElev);
  const ttl = project(gx,     gy,     toElev);
  const tbrP = project(gx + W, gy + D, toElev);
  const midElev = (fromElev + toElev) / 2;
  const ctlm = project(gx + 0.15,     gy + 0.15,     midElev);
  const ctrm = project(gx + W - 0.15, gy + 0.15,     midElev);
  const cbrm = project(gx + W - 0.15, gy + D - 0.15, midElev);
  const cblm = project(gx + 0.15,     gy + D - 0.15, midElev);
  const topFace = `${ttl.sx},${ttl.sy} ${ttr.sx},${ttr.sy} ${tbrP.sx},${tbrP.sy} ${tbl.sx},${tbl.sy}`;
  const cabPts  = `${ctlm.sx},${ctlm.sy} ${ctrm.sx},${ctrm.sy} ${cbrm.sx},${cbrm.sy} ${cblm.sx},${cblm.sy}`;
  const cx = (ttl.sx + ttr.sx + tbrP.sx + tbl.sx) / 4;
  const cy = (ttl.sy + ttr.sy + tbrP.sy + tbl.sy) / 4;
  return (
    <g>
      <line x1={tr.sx}  y1={tr.sy}  x2={ttr.sx} y2={ttr.sy} stroke="rgba(255,200,60,0.5)"  strokeWidth="1" strokeDasharray="4,3" />
      <line x1={bl.sx}  y1={bl.sy}  x2={tbl.sx} y2={tbl.sy} stroke="rgba(255,200,60,0.35)" strokeWidth="1" strokeDasharray="4,3" />
      <polygon points={cabPts}  fill="rgba(255,220,80,0.3)"  stroke="rgba(255,200,60,0.75)" strokeWidth="1.2" />
      <polygon points={topFace} fill="rgba(255,215,60,0.15)" stroke="rgba(255,200,60,0.5)"  strokeWidth="0.8" />
      <text x={cx} y={cy - 6} fill="rgba(255,215,60,0.85)" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">LIFT</text>
    </g>
  );
}

function IsoFloorSlab({ floorIndex: fi, tileW, tileH, panX, panY, zoom }) {
  const { project } = makeFloorIso(tileW, tileH, panX, panY);
  const elev  = fi * FLOOR_LIFT_PX * zoom;
  const slabH = 6 * zoom;
  const W = 22, D = 17;
  const tl = project(0, 0, elev); const tr = project(W, 0, elev);
  const br = project(W, D, elev); const bl = project(0, D, elev);
  const topPts   = `${tl.sx},${tl.sy} ${tr.sx},${tr.sy} ${br.sx},${br.sy} ${bl.sx},${bl.sy}`;
  const rightPts = `${tr.sx},${tr.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + slabH} ${tr.sx},${tr.sy + slabH}`;
  const leftPts  = `${bl.sx},${bl.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + slabH} ${bl.sx},${bl.sy + slabH}`;
  const labelP = project(0, D / 2, elev);
  const floorLabel = FLOOR_LABEL_ORDER[fi] || `Floor ${fi}`;
  return (
    <g>
      {Array.from({ length: 23 }, (_, i) => {
        const a = project(i, 0, elev), b = project(i, D, elev);
        return <line key={`gx${fi}-${i}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(100,160,255,0.05)" strokeWidth="0.7" />;
      })}
      {Array.from({ length: 18 }, (_, j) => {
        const a = project(0, j, elev), b = project(W, j, elev);
        return <line key={`gy${fi}-${j}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(100,160,255,0.05)" strokeWidth="0.7" />;
      })}
      <polygon points={rightPts} fill="rgba(20,50,100,0.55)"  stroke="rgba(60,120,200,0.2)"  strokeWidth="0.5" />
      <polygon points={leftPts}  fill="rgba(15,40,80,0.55)"   stroke="rgba(60,120,200,0.2)"  strokeWidth="0.5" />
      <polygon points={topPts}   fill="rgba(15,30,62,0.45)"   stroke="rgba(60,120,200,0.18)" strokeWidth="0.8" />
      <text x={labelP.sx - 6} y={labelP.sy} fill="rgba(100,160,255,0.55)" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="end">
        {floorLabel.toUpperCase()}
      </text>
    </g>
  );
}

// ─── BUILDING PALETTE for labels ─────────────────────────────────────────────
const BUILDING_LABEL_COLORS = [
  'rgba(100,180,255,0.85)',
  'rgba(180,255,160,0.85)',
  'rgba(255,200,100,0.85)',
  'rgba(255,140,180,0.85)',
  'rgba(160,220,255,0.85)',
  'rgba(200,170,255,0.85)',
];

// Per-building canvas width in grid units (buildings are spaced apart)
const BUILDING_GRID_W = 24; // grid columns reserved per building
const BUILDING_GRID_OFFSET_Y = 0; // all buildings share same gy origin

function BlueprintCanvas({ rooms, onRoomClick, activeFloor, hasElevator }) {
  const [layout, setLayout] = useState(_loadIsoLayout);
  const [selected, setSelected] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.7);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const panRef = useRef(null);
  const svgRef = useRef(null);
  const isPanning = useRef(false);
  const [panCursor, setPanCursor] = useState(false);

  const MIN_ZOOM = 0.2, MAX_ZOOM = 1.8;
  const SNAP_G = 0.5;
  const MIN_GW = 1, MIN_GH = 1, MAX_GW = 8, MAX_GH = 8;

  const tileW = BASE_TILE_W * zoom;
  const tileH = BASE_TILE_H * zoom;
  const wallH  = BASE_WALL_H * zoom;

  const { screenToGridDelta } = makeFloorIso(tileW, tileH, pan.x, pan.y);

  // ── Group rooms by building ──────────────────────────────────────────────────
  const allBuildingNames = [...new Set(rooms.map(r => r.building || 'Main Building'))].sort();

  // Global floor range (across all buildings, for legend)
  const allFloorLabels = [...new Set(rooms.map(r => r.floor || 'Ground Floor'))];
  const allFloorIdxs   = allFloorLabels.map(floorIdx);
  const minFloor = allFloorIdxs.length > 0 ? Math.min(...allFloorIdxs) : 0;
  const maxFloor = allFloorIdxs.length > 0 ? Math.max(...allFloorIdxs) : 0;
  const allFloorsRange = Array.from({ length: maxFloor - minFloor + 1 }, (_, i) => minFloor + i);

  useEffect(() => {
    setLayout(prev => {
      const next = { ...prev };
      let changed = false;
      // Lay out rooms per building, each building gets its own gx offset
      allBuildingNames.forEach((bldg, bldgIdx) => {
        const bldgRooms = rooms.filter(r => (r.building || 'Main Building') === bldg);
        const byFloor = {};
        bldgRooms.forEach(r => {
          const fi = floorIdx(r.floor || 'Ground Floor');
          if (!byFloor[fi]) byFloor[fi] = [];
          byFloor[fi].push(r);
        });
        Object.values(byFloor).forEach(fRooms => {
          fRooms.forEach((r, i) => {
            if (!next[r.id]) {
              // Place within this building's grid column band
              const bldgOffsetGx = bldgIdx * BUILDING_GRID_W;
              next[r.id] = { gx: bldgOffsetGx + (i % 4) * 4 + 1, gy: Math.floor(i / 4) * 3.5 + 1, gw: 3, gh: 2.5 };
              changed = true;
            }
          });
        });
      });
      if (changed) _saveIsoLayout(next);
      return next;
    });
  }, [rooms]);

  const snapG = v => Math.round(v / SNAP_G) * SNAP_G;

  const onPanStart = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    isPanning.current = false; setPanCursor(true);
    panRef.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
    const onMove = me => {
      if (!panRef.current) return;
      const dx = me.clientX - panRef.current.startX, dy = me.clientY - panRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isPanning.current = true;
      setPan({ x: panRef.current.origX + dx, y: panRef.current.origY + dy });
    };
    const onUp = () => { panRef.current = null; isPanning.current = false; setPanCursor(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [pan]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    if (e.shiftKey) setPan(p => ({ ...p, x: p.x - e.deltaY }));
    else if (e.ctrlKey) setPan(p => ({ ...p, y: p.y - e.deltaY }));
    else setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.001)));
  }, []);

  const onDragStart = useCallback((e, roomId) => {
    e.preventDefault(); e.stopPropagation(); setSelected(roomId);
    const orig = layout[roomId] || { gx: 0, gy: 0, gw: 2.5, gh: 2 };
    dragRef.current = { roomId, startX: e.clientX, startY: e.clientY, origGx: orig.gx, origGy: orig.gy };
    const onMove = me => {
      if (!dragRef.current) return;
      const { gx: dgx, gy: dgy } = screenToGridDelta(me.clientX - dragRef.current.startX, me.clientY - dragRef.current.startY);
      setLayout(prev => ({ ...prev, [roomId]: { ...prev[roomId], gx: Math.max(0, snapG(dragRef.current.origGx + dgx)), gy: Math.max(0, snapG(dragRef.current.origGy + dgy)) } }));
    };
    const onUp = () => { dragRef.current = null; setLayout(prev => { _saveIsoLayout(prev); return prev; }); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [layout, screenToGridDelta]);

  const onResizeStart = useCallback((e, roomId) => {
    e.preventDefault(); e.stopPropagation(); setSelected(roomId);
    const orig = layout[roomId] || { gx: 0, gy: 0, gw: 2.5, gh: 2 };
    resizeRef.current = { roomId, startX: e.clientX, startY: e.clientY, origGw: orig.gw, origGh: orig.gh };
    const onMove = me => {
      if (!resizeRef.current) return;
      const { gx: dgx, gy: dgy } = screenToGridDelta(me.clientX - resizeRef.current.startX, me.clientY - resizeRef.current.startY);
      setLayout(prev => ({ ...prev, [roomId]: { ...prev[roomId], gw: Math.max(MIN_GW, Math.min(MAX_GW, snapG(resizeRef.current.origGw + dgx))), gh: Math.max(MIN_GH, Math.min(MAX_GH, snapG(resizeRef.current.origGh + dgy))) } }));
    };
    const onUp = () => { resizeRef.current = null; setLayout(prev => { _saveIsoLayout(prev); return prev; }); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [layout, screenToGridDelta]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // ── Per-building derived data ─────────────────────────────────────────────
  // Each building gets its own floor range and room list
  const buildingData = allBuildingNames.map((bldgName, bldgIdx) => {
    const bldgRooms = rooms.filter(r => (r.building || 'Main Building') === bldgName);
    const visibleBldgRooms = activeFloor === 'All'
      ? bldgRooms
      : bldgRooms.filter(r => r.floor === activeFloor);
    const bldgFloorLabels = [...new Set(bldgRooms.map(r => r.floor || 'Ground Floor'))];
    const bldgFloorIdxs = bldgFloorLabels.map(floorIdx);
    const bldgMinFloor = bldgFloorIdxs.length > 0 ? Math.min(...bldgFloorIdxs) : 0;
    const bldgMaxFloor = bldgFloorIdxs.length > 0 ? Math.max(...bldgFloorIdxs) : 0;
    const bldgFloorsRange = Array.from({ length: bldgMaxFloor - bldgMinFloor + 1 }, (_, i) => bldgMinFloor + i);
    const floorsVisible = activeFloor === 'All' ? bldgFloorsRange : [floorIdx(activeFloor)].filter(fi => bldgFloorsRange.includes(fi));
    // gx offset for this building's slab (in grid units)
    const gxOffset = bldgIdx * BUILDING_GRID_W;
    const labelColor = BUILDING_LABEL_COLORS[bldgIdx % BUILDING_LABEL_COLORS.length];
    const sortedRooms = [...visibleBldgRooms].sort((a, b) => {
      const fA = floorIdx(a.floor || 'Ground Floor'), fB = floorIdx(b.floor || 'Ground Floor');
      if (fA !== fB) return fA - fB;
      const pa = layout[a.id], pb = layout[b.id];
      if (!pa || !pb) return 0;
      return (pa.gx + pa.gy) - (pb.gx + pb.gy);
    });
    return { bldgName, bldgIdx, gxOffset, bldgFloorsRange, floorsVisible, bldgMinFloor, bldgMaxFloor, sortedRooms, labelColor };
  });

  const floorsVisibleGlobal = activeFloor === 'All' ? allFloorsRange : [floorIdx(activeFloor)];

  const STAIR_GX_LOCAL = 19, STAIR_GY = 1;
  const ELEV_GX_LOCAL  = 19, ELEV_GY  = 4;

  // Canvas width scales with number of buildings
  const canvasW = Math.max(ISO_CANVAS_W, allBuildingNames.length * 700);
  const canvasH = ISO_CANVAS_H;

  const _pbs = { width: '100%', height: '100%', border: 'none', borderRadius: 6, background: 'rgba(100,160,255,0.1)', color: 'rgba(100,160,255,0.6)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 0 };

  // IsoFloorSlab with gx offset for per-building placement
  function IsoFloorSlabOffset({ floorIndex: fi, tileW, tileH, panX, panY, zoom, gxOffset }) {
    const { project } = makeFloorIso(tileW, tileH, panX, panY);
    const elev  = fi * FLOOR_LIFT_PX * zoom;
    const slabH = 6 * zoom;
    const W = 20, D = 14;
    const ox = gxOffset;
    const tl = project(ox,     0, elev); const tr = project(ox + W, 0, elev);
    const br = project(ox + W, D, elev); const bl = project(ox,     D, elev);
    const topPts   = `${tl.sx},${tl.sy} ${tr.sx},${tr.sy} ${br.sx},${br.sy} ${bl.sx},${bl.sy}`;
    const rightPts = `${tr.sx},${tr.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + slabH} ${tr.sx},${tr.sy + slabH}`;
    const leftPts  = `${bl.sx},${bl.sy} ${br.sx},${br.sy} ${br.sx},${br.sy + slabH} ${bl.sx},${bl.sy + slabH}`;
    const labelP = project(ox, D / 2, elev);
    const floorLabel = FLOOR_LABEL_ORDER[fi] || `Floor ${fi}`;
    return (
      <g>
        {Array.from({ length: W + 1 }, (_, i) => {
          const a = project(ox + i, 0, elev), b = project(ox + i, D, elev);
          return <line key={`gx${fi}-${i}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(100,160,255,0.05)" strokeWidth="0.7" />;
        })}
        {Array.from({ length: D + 1 }, (_, j) => {
          const a = project(ox, j, elev), b = project(ox + W, j, elev);
          return <line key={`gy${fi}-${j}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="rgba(100,160,255,0.05)" strokeWidth="0.7" />;
        })}
        <polygon points={rightPts} fill="rgba(20,50,100,0.55)"  stroke="rgba(60,120,200,0.2)"  strokeWidth="0.5" />
        <polygon points={leftPts}  fill="rgba(15,40,80,0.55)"   stroke="rgba(60,120,200,0.2)"  strokeWidth="0.5" />
        <polygon points={topPts}   fill="rgba(15,30,62,0.45)"   stroke="rgba(60,120,200,0.18)" strokeWidth="0.8" />
        <text x={labelP.sx - 6} y={labelP.sy} fill="rgba(100,160,255,0.4)" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="end">
          {floorLabel.toUpperCase()}
        </text>
      </g>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ── HUD Controls ──────────────────────────────────────────────────── */}
      <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(10,22,40,0.88)', borderRadius: 10, padding: '5px 8px', border: '1px solid rgba(100,160,255,0.2)' }}>
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z - 0.1).toFixed(2)))} style={{ ..._pbs, width: 24, height: 24, fontSize: 14 }}>−</button>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(100,160,255,0.7)', minWidth: 36, textAlign: 'center', fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z + 0.1).toFixed(2)))} style={{ ..._pbs, width: 24, height: 24, fontSize: 14 }}>+</button>
          <button onClick={() => { setZoom(0.7); setPan({ x: 0, y: 0 }); }} style={{ ..._pbs, width: 24, height: 24, fontSize: 9 }}>⌂</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 28px 28px', gridTemplateRows: '28px 28px 28px', gap: 2, background: 'rgba(10,22,40,0.88)', borderRadius: 10, padding: 5, border: '1px solid rgba(100,160,255,0.2)' }}>
          <div /><button onClick={() => setPan(p => ({ ...p, y: p.y + 80 }))} style={_pbs}>▲</button><div />
          <button onClick={() => setPan(p => ({ ...p, x: p.x + 80 }))} style={_pbs}>◀</button>
          <button onClick={() => setPan({ x: 0, y: 0 })} style={{ ..._pbs, fontSize: 8 }}>⌂</button>
          <button onClick={() => setPan(p => ({ ...p, x: p.x - 80 }))} style={_pbs}>▶</button>
          <div /><button onClick={() => setPan(p => ({ ...p, y: p.y - 80 }))} style={_pbs}>▼</button><div />
        </div>

        {/* Building index legend */}
        <div style={{ background: 'rgba(10,22,40,0.88)', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(100,160,255,0.2)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 9, color: 'rgba(100,160,255,0.5)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>BUILDINGS</span>
          {buildingData.map(({ bldgName, bldgIdx, labelColor }) => (
            <div key={bldgName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: labelColor, opacity: 0.7, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: labelColor, fontFamily: 'monospace', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bldgName}</span>
            </div>
          ))}
        </div>

        {allFloorsRange.length > 0 && (
          <div style={{ background: 'rgba(10,22,40,0.88)', borderRadius: 10, padding: '7px 10px', border: '1px solid rgba(100,160,255,0.2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(100,160,255,0.5)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 2 }}>FLOORS</span>
            {[...allFloorsRange].reverse().map(fi => (
              <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: `rgba(100,160,255,${0.2 + fi * 0.12})`, border: '1px solid rgba(100,160,255,0.4)' }} />
                <span style={{ fontSize: 9, color: 'rgba(100,160,255,0.65)', fontFamily: 'monospace' }}>{FLOOR_LABEL_ORDER[fi] || `Floor ${fi}`}</span>
              </div>
            ))}
            {hasElevator && allFloorsRange.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, borderTop: '1px solid rgba(100,160,255,0.1)', paddingTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,210,60,0.4)', border: '1px solid rgba(255,200,60,0.6)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,210,60,0.75)', fontFamily: 'monospace' }}>ELEVATOR</span>
              </div>
            )}
            {allFloorsRange.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(100,160,255,0.15)', border: '1px dashed rgba(100,160,255,0.5)' }} />
                <span style={{ fontSize: 9, color: 'rgba(100,160,255,0.55)', fontFamily: 'monospace' }}>STAIRCASE</span>
              </div>
            )}
          </div>
        )}
        <div style={{ fontSize: 9, color: 'rgba(100,160,255,0.3)', textAlign: 'right', lineHeight: 1.5 }}>
          Scroll to zoom · Drag to pan<br />Shift+scroll: horiz · Click room to view
        </div>
      </div>

      <svg ref={svgRef} width={canvasW} height={canvasH}
        style={{ background: '#080f1e', borderRadius: 12, border: '1.5px solid #1e3a5f', boxShadow: '0 8px 40px #00000090', display: 'block', userSelect: 'none', cursor: panCursor ? 'grabbing' : 'grab' }}
        onMouseDown={onPanStart}>

        <text x="28" y="36" fill="rgba(100,160,255,0.5)" fontSize="12" fontFamily="monospace" fontWeight="bold">N↑</text>
        <text x="28" y="50" fill="rgba(100,160,255,0.25)" fontSize="8" fontFamily="monospace">
          CAMPUS BLUEPRINT · {allBuildingNames.length} BUILDING{allBuildingNames.length !== 1 ? 'S' : ''}
        </text>

        {/* ── Render each building independently ──────────────────────────── */}
        {buildingData.map(({ bldgName, bldgIdx, gxOffset, bldgFloorsRange, floorsVisible, bldgMinFloor, bldgMaxFloor, sortedRooms, labelColor }) => {
          const STAIR_GX = gxOffset + STAIR_GX_LOCAL;
          const ELEV_GX  = gxOffset + ELEV_GX_LOCAL;
          return (
            <g key={bldgName}>
              {/* Building label above the top floor */}
              {(() => {
                const topFi = bldgFloorsRange[bldgFloorsRange.length - 1] ?? 0;
                const elev  = topFi * FLOOR_LIFT_PX * zoom;
                const { project } = makeFloorIso(tileW, tileH, pan.x, pan.y);
                const mid   = project(gxOffset + 10, 0, elev + wallH + 18 * zoom);
                return (
                  <text x={mid.sx} y={mid.sy}
                    fill={labelColor} fontSize="13" fontFamily="monospace" fontWeight="bold"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', textShadow: '0 2px 6px #000' }}>
                    {bldgName.toUpperCase()}
                  </text>
                );
              })()}

              {/* Floor slabs for this building */}
              {floorsVisible.map(fi => (
                <IsoFloorSlabOffset key={`slab-${bldgName}-${fi}`} floorIndex={fi}
                  tileW={tileW} tileH={tileH} panX={pan.x} panY={pan.y} zoom={zoom}
                  gxOffset={gxOffset} />
              ))}

              {/* Staircase connectors */}
              {activeFloor === 'All' && bldgFloorsRange.length > 1 && bldgFloorsRange.slice(0, -1).map(fi => (
                <IsoStaircase key={`stair-${bldgName}-${fi}`}
                  fromElev={fi * FLOOR_LIFT_PX * zoom} toElev={(fi + 1) * FLOOR_LIFT_PX * zoom}
                  gx={STAIR_GX} gy={STAIR_GY} tileW={tileW} tileH={tileH} wallH={wallH}
                  panX={pan.x} panY={pan.y} />
              ))}

              {/* Elevator (per building) */}
              {activeFloor === 'All' && hasElevator && bldgFloorsRange.length > 1 && (
                <IsoElevator
                  fromElev={bldgMinFloor * FLOOR_LIFT_PX * zoom} toElev={bldgMaxFloor * FLOOR_LIFT_PX * zoom}
                  gx={ELEV_GX} gy={ELEV_GY} tileW={tileW} tileH={tileH} wallH={wallH}
                  panX={pan.x} panY={pan.y} />
              )}

              {/* Room boxes for this building */}
              {sortedRooms.map(room => {
                const pos = layout[room.id];
                if (!pos) return null;
                const fi   = floorIdx(room.floor || 'Ground Floor');
                const elev = fi * FLOOR_LIFT_PX * zoom;
                const bp   = CAT_BP_COLOR[room.category] || CAT_BP_COLOR['Classroom'];
                const dot  = room.status === 'Available' ? '#4ade80' : room.status === 'Occupied' ? '#f87171' : '#fb923c';
                return (
                  <IsoRoomBox key={room.id}
                    gx={pos.gx} gy={pos.gy} gw={pos.gw} gh={pos.gh}
                    wallH={wallH} floorElev={elev} tileW={tileW} tileH={tileH} panX={pan.x} panY={pan.y}
                    faceColor={bp.fill} rightColor={bp.stroke + 'cc'} leftColor={bp.stroke + '88'} strokeColor={bp.stroke}
                    isSelected={selected === room.id}
                    onClick={() => { if (!isPanning.current) onRoomClick(room); }}
                    onDragStart={e => onDragStart(e, room.id)}
                    onResizeDrag={e => onResizeStart(e, room.id)}>
                    <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: bp.label, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{room.name}</div>
                      <div style={{ fontSize: 7.5, color: bp.label, opacity: 0.65, marginTop: 1 }}>{room.category}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 7, color: bp.label, opacity: 0.55 }}>{room.status}</span>
                      </div>
                    </div>
                  </IsoRoomBox>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}




// ─── ROOM PHOTO MODAL ─────────────────────────────────────────────────────────

function RoomPhotoModal({ room, onClose, onEdit }) {
  const [imgErr, setImgErr] = useState(false);
  const kw = CAT_PHOTO_KW[room.category] || 'school room';
  const seed = (room.id || room.name || 'room').replace(/-/g, '').slice(0, 8);
  const photoUrl = `https://source.unsplash.com/800x450/?${encodeURIComponent(kw)}&sig=${seed}`;
  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(room.name)}/800/450`;
  const bp = CAT_BP_COLOR[room.category] || CAT_BP_COLOR['Classroom'];
  const ss = STATUS_STYLE[room.status] || STATUS_STYLE['Available'];
  const pct = room.capacity > 0 ? Math.round((room.seats / room.capacity) * 100) : 0;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#00000080', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', maxWidth: 680, width: '100%', boxShadow: '0 24px 80px #00000050' }}>
        {/* Photo */}
        <div style={{ position: 'relative', height: 260, background: bp.fill, overflow: 'hidden' }}>
          <img
            src={imgErr ? fallbackUrl : photoUrl}
            alt={room.name}
            onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#00000088 0%,transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', textShadow: '0 2px 8px #00000060' }}>{room.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{room.building ? `${room.building} · ` : ''}{room.floor} · {room.category}</div>
            </div>
            <span style={{ background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{room.status}</span>
          </div>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 50, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>
        {/* Details */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1rem' }}>
            {[['Capacity', room.capacity], ['Current Seats', room.seats], ['Section', room.section !== 'None' ? room.section : '—']].map(([lbl, val]) => (
              <div key={lbl} style={{ background: '#f9f8f5', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{lbl}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginBottom: 4 }}>
              <span>Occupancy</span>
              <span style={{ fontWeight: 700, color: pct >= 90 ? '#e94560' : pct >= 60 ? '#a05800' : '#1b4332' }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: '#f0efeb', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#e94560' : pct >= 60 ? '#ef9f27' : '#1d9e75', borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={T.btn('ghost')}>Close</button>
            {onEdit && <button onClick={() => { onEdit(room); onClose(); }} style={T.btn('primary')}>Edit Room</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOMS MODULE ─────────────────────────────────────────────────────────────

function RoomsModule({ notify }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBuilding, setActiveBuilding] = useState('All');
  const [activeFloor, setActiveFloor] = useState('All');
  const [filterCat, setFilterCat] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [modal, setModal] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [view, setView] = useState('list');
  const [form, setForm] = useState({ name: '', building: BUILDINGS[0], floor: FLOORS[0], category: 'Classroom', capacity: 40, seats: 0, section: 'None', status: 'Available' });

  // Derive the building and floor lists dynamically from actual room data,
  // falling back to the defaults from constants when no rooms exist yet.
  const allBuildings = [...new Set([...BUILDINGS, ...rooms.map(r => r.building).filter(Boolean)])].sort();
  const floorsForBuilding = activeBuilding === 'All'
    ? [...new Set([...FLOORS, ...rooms.map(r => r.floor).filter(Boolean)])].sort()
    : [...new Set([...FLOORS, ...rooms.filter(r => r.building === activeBuilding).map(r => r.floor).filter(Boolean)])].sort();
  const buildingCount = allBuildings.length;

  const [hasElevator, setHasElevator] = useState(false);

  useEffect(() => {
    supabase.from('rooms').select('*').then(({ data }) => {
      const seen = new Set();
      const unique = (data || []).filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      setRooms(unique);
      setLoading(false);
    });
    // Gracefully handle case where has_elevator column doesn't exist yet
    supabase.from('schools').select('*').limit(1).maybeSingle()
      .then(({ data, error }) => { if (!error && data?.has_elevator) setHasElevator(true); })
      .catch(() => {});
  }, []);

  const filtered = rooms.filter(r => {
    const fb = activeBuilding === 'All' || r.building === activeBuilding;
    const fl = activeFloor === 'All' || r.floor === activeFloor;
    const ct = filterCat === 'All' || r.category === filterCat;
    const q = r.name.toLowerCase().includes(searchQ.toLowerCase());
    return fb && fl && ct && q;
  });

  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'Occupied').length,
    available: rooms.filter(r => r.status === 'Available').length,
    maintenance: rooms.filter(r => r.status === 'Maintenance').length,
  };

  const openAdd = () => {
    setForm({ name: '', building: allBuildings[0] || BUILDINGS[0], floor: FLOORS[0], category: 'Classroom', capacity: 40, seats: 0, section: 'None', status: 'Available' });
    setModal('add');
  };
  const openEdit = room => { setForm({ ...room }); setModal('edit'); };

  const save = async () => {
    if (!form.name?.trim()) return;
    if (modal === 'add') {
      const { data, error } = await supabase.from('rooms').insert({ ...form, capacity: +form.capacity, seats: +form.seats }).select('*').maybeSingle();
      if (error) {
        console.error('Room insert error:', error);
        notify(`Room add failed: ${error.message}`, 'danger');
        return;
      }
      if (data) setRooms(p => p.some(r => r.id === data.id) ? p : [...p, data]);
      notify('Room added.');
    } else {
      const { data, error } = await supabase.from('rooms').update({ ...form, capacity: +form.capacity, seats: +form.seats }).eq('id', form.id).select('*').maybeSingle();
      if (error) {
        console.error('Room update error:', error);
        notify(`Room update failed: ${error.message}`, 'danger');
        return;
      }
      if (data) setRooms(p => p.map(r => r.id === data.id ? data : r));
      notify('Room updated.');
    }
    setModal(null);
  };

  const F = key => ({ value: form[key] ?? '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div>
      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Room' : 'Edit Room'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><Field label="Room Name"><input style={T.input} {...F('name')} placeholder="e.g. Room 101" /></Field></div>
            <Field label="Building">
              <>
                <input
                  style={T.input}
                  list="building-list"
                  {...F('building')}
                  placeholder="e.g. Main Building, Annex"
                />
                <datalist id="building-list">
                  {allBuildings.map(b => <option key={b} value={b} />)}
                </datalist>
              </>
            </Field>
            <Field label="Floor">
              <>
                <input
                  style={T.input}
                  list="floor-list"
                  {...F('floor')}
                  placeholder="e.g. Ground Floor, 4th Floor"
                />
                <datalist id="floor-list">
                  {FLOORS.map(f => <option key={f} value={f} />)}
                </datalist>
              </>
            </Field>
            <Field label="Category"><select style={{ ...T.select, width: '100%' }} {...F('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Status"><select style={{ ...T.select, width: '100%' }} {...F('status')}>{['Available', 'Occupied', 'Maintenance'].map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Capacity"><input style={T.input} type="number" {...F('capacity')} /></Field>
            <Field label="Current Seats"><input style={T.input} type="number" {...F('seats')} /></Field>
            <div style={{ gridColumn: '1/-1' }}><Field label="Section"><select style={{ ...T.select, width: '100%' }} {...F('section')}>{SECTIONS.map(s => <option key={s}>{s}</option>)}</select></Field></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
            <button onClick={() => setModal(null)} style={T.btn('ghost')}>Cancel</button>
            <button onClick={save} style={T.btn('primary')}>Save</button>
          </div>
        </Modal>
      )}

      {/* Room Photo Modal */}
      {selectedRoom && (
        <RoomPhotoModal room={selectedRoom} onClose={() => setSelectedRoom(null)} onEdit={openEdit} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Rooms & Sections</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>{rooms.length} rooms · {buildingCount} building{buildingCount !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', background: '#f5f4f0', borderRadius: 10, padding: 3, gap: 2 }}>
            {[['list', '☰ List'], ['blueprint', '⬡ Blueprint']].map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: view === v ? '#1a1a2e' : 'transparent', color: view === v ? '#fff' : '#888' }}>{lbl}</button>
            ))}
          </div>
          <button onClick={openAdd} style={T.btn('primary')}>+ Add Room</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.25rem' }}>
        {[['Total', stats.total, '#1a1a2e'], ['Available', stats.available, '#1b4332'], ['Occupied', stats.occupied, '#7a1c2e'], ['Maintenance', stats.maintenance, '#7a4500']].map(([k, v, c]) => (
          <div key={k} style={{ ...T.card, padding: '1rem' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search rooms..." style={{ ...T.input, maxWidth: 220 }} />
        {/* Building filter */}
        {allBuildings.length > 1 && (
          <select
            value={activeBuilding}
            onChange={e => { setActiveBuilding(e.target.value); setActiveFloor('All'); }}
            style={T.select}
          >
            <option value="All">All buildings</option>
            {allBuildings.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        {/* Floor filter tabs */}
        {['All', ...floorsForBuilding].map(f => (
          <button key={f} onClick={() => setActiveFloor(f)} style={{ ...T.btn(activeFloor === f ? 'primary' : 'ghost'), padding: '7px 14px', fontSize: 12 }}>{f}</button>
        ))}
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={T.select}>
          <option value="All">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={{ ...T.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0efeb' }}>
                {['Room', 'Building', 'Floor', 'Category', 'Section', 'Capacity', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const cc = CAT_COLOR[r.category] || CAT_COLOR['Classroom'];
                const pct = r.capacity > 0 ? Math.round((r.seats / r.capacity) * 100) : 0;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f9f8f5', cursor: 'pointer' }} onClick={() => setSelectedRoom(r)}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}><span style={{ marginRight: 8, color: cc.color }}>{CAT_ICON[r.category]}</span>{r.name}</td>
                    <td style={{ padding: '10px 12px', color: '#666', fontSize: 12 }}>{r.building || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 12 }}>{r.floor}</td>
                    <td style={{ padding: '10px 12px' }}><span style={T.pill(cc.bg, cc.color, cc.border)}>{r.category}</span></td>
                    <td style={{ padding: '10px 12px', color: r.section !== 'None' ? '#1565c0' : '#ccc', fontSize: 12 }}>{r.section}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: pct >= 90 ? '#e94560' : pct >= 60 ? '#a05800' : '#1b4332' }}>{r.seats}/{r.capacity}</span>
                        <div style={{ width: 40, height: 3, background: '#f0efeb', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#e94560' : pct >= 60 ? '#ef9f27' : '#1d9e75' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}><span style={T.pill(STATUS_STYLE[r.status].bg, STATUS_STYLE[r.status].color)}>{r.status}</span></td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(r)} style={{ ...T.btn('ghost'), padding: '3px 8px', fontSize: 11 }}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#bbb', padding: '2rem', fontSize: 13 }}>No rooms match.</p>}
        </div>
      )}

      {/* BLUEPRINT VIEW */}
      {view === 'blueprint' && (
        <div>
          {/* Legend */}
          <div style={{ ...T.card, marginBottom: '1rem', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Legend</span>
            {CATEGORIES.map(cat => {
              const bp = CAT_BP_COLOR[cat] || CAT_BP_COLOR['Classroom'];
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: bp.fill, border: `1.5px solid ${bp.stroke}` }} />
                  <span style={{ fontSize: 11, color: '#555' }}>{cat}</span>
                </div>
              );
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              {[['#4ade80', 'Available'], ['#f87171', 'Occupied'], ['#fb923c', 'Maintenance']].map(([col, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 50, background: col }} />
                  <span style={{ fontSize: 11, color: '#555' }}>{lbl}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>Drag room to move · Resize corner dot · Click to view · Drag canvas to pan · Scroll to zoom</span>
          </div>
          {/* Canvas */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 940, borderRadius: 12 }}>
            <BlueprintCanvas rooms={rooms} activeFloor={activeFloor} onRoomClick={setSelectedRoom} hasElevator={hasElevator} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ENROLLMENT MODULE ───────────────────────────────────────────────────────

function EnrollmentModule({ notify }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", course: "BSIT", year: "1st Year" });

  useEffect(() => {
    supabase.from('applicants').select('*').then(({ data }) => { setApplicants(data || []); setLoading(false); });
  }, []);

  const filtered = applicants.filter(a => {
    const st = filterStage === "All" || a.stage === filterStage;
    const q = a.name.toLowerCase().includes(searchQ.toLowerCase());
    return st && q;
  });

  const stageCounts = STAGES.reduce((a, s) => ({ ...a, [s]: applicants.filter(ap => ap.stage === s).length }), {});

  const advance = async (id) => {
    const a = applicants.find(x => x.id === id);
    const next = NEXT_STAGE[a.stage];
    if (!next) return;
    const newTimestamps = { ...a.stage_timestamps, [next]: today() };
    await supabase.from('applicants').update({ stage: next, stage_timestamps: newTimestamps }).eq('id', id);
    setApplicants(p => p.map(ap => ap.id === id ? { ...ap, stage: next, stage_timestamps: newTimestamps } : ap));
    notify(`${a.name} moved to "${next}"`);
  };

  const reject = async (id) => {
    const a = applicants.find(x => x.id === id);
    const newTimestamps = { ...a.stage_timestamps, Rejected: today() };
    await supabase.from('applicants').update({ stage: "Rejected", stage_timestamps: newTimestamps }).eq('id', id);
    setApplicants(p => p.map(ap => ap.id === id ? { ...ap, stage: "Rejected", stage_timestamps: newTimestamps } : ap));
    notify("Applicant rejected.", "warning");
  };

  const toggleDoc = async (id, doc) => {
    const a = applicants.find(x => x.id === id);
    const newDocs = { ...a.docs, [doc]: !a.docs[doc] };
    await supabase.from('applicants').update({ docs: newDocs }).eq('id', id);
    setApplicants(p => p.map(ap => ap.id === id ? { ...ap, docs: newDocs } : ap));
  };

  const addApplicant = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const initials = form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const { data } = await supabase.from('applicants').insert({
      ...form, avatar: initials, stage: "Applicant", applied_date: today(),
      stage_timestamps: { Applicant: today() },
      docs: DOCS.reduce((a, d) => ({ ...a, [d]: false }), {}),
    }).select().maybeSingle();
    if (data) setApplicants(p => [...p, data]);
    setModal(null);
    notify(`${form.name} added.`);
  };

  const docsCount = (docs) => DOCS.filter(d => docs[d]).length;
  const docsComplete = (docs) => DOCS.every(d => docs[d]);

  return (
    <div>
      {modal === "add" && (
        <Modal title="Add Applicant" onClose={() => setModal(null)}>
          <Field label="Full Name"><input style={T.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Email"><input style={T.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Course"><select style={{ ...T.select, width: "100%" }} value={form.course} onChange={e => setForm(p => ({ ...p, course: e.target.value }))}>{COURSES.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Year Level"><select style={{ ...T.select, width: "100%" }} value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}>{YEAR_LEVELS.map(y => <option key={y}>{y}</option>)}</select></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={addApplicant} style={T.btn("primary")}>Add</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Enrollment Workflow</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{applicants.length} applicants · {stageCounts["Enrolled"]} enrolled</p>
        </div>
        <button onClick={() => setModal("add")} style={T.btn("primary")}>+ Add Applicant</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: "1.25rem" }}>
        {STAGES.map(s => {
          const sc = STAGE_COLOR[s];
          return (
            <div key={s} onClick={() => setFilterStage(filterStage === s ? "All" : s)} style={{ ...T.card, padding: "0.75rem", cursor: "pointer", border: filterStage === s ? `2px solid ${sc.border}` : "1px solid #e8e6e0" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{STAGE_ICON[s]}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: sc.color }}>{stageCounts[s]}</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search applicants..." style={{ ...T.input, maxWidth: 240 }} />
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={T.select}>
          <option value="All">All stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f0efeb" }}>
              {["Applicant", "Course", "Stage", "Docs", "Applied", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const sc = STAGE_COLOR[a.stage];
              const count = docsCount(a.docs || {});
              const complete = docsComplete(a.docs || {});
              const canAdvance = !!NEXT_STAGE[a.stage];
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 50, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: sc.color, flexShrink: 0 }}>{a.avatar}</div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 500 }}>{a.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#888" }}>{a.course} · {a.year}</td>
                  <td style={{ padding: "10px 14px" }}><span style={T.pill(sc.bg, sc.color, sc.border)}>{STAGE_ICON[a.stage]} {a.stage}</span></td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 50, height: 4, background: "#f0efeb", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(count / DOCS.length) * 100}%`, background: complete ? "#1d9e75" : "#ef9f27" }} />
                      </div>
                      <span style={{ fontSize: 11, color: complete ? "#0f6e56" : "#a05800", fontWeight: 700 }}>{count}/{DOCS.length}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#aaa" }}>{a.applied_date}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {canAdvance && <button onClick={() => advance(a.id)} style={{ ...T.btn("success"), padding: "3px 10px", fontSize: 11 }}>Advance</button>}
                      {a.stage !== "Rejected" && a.stage !== "Enrolled" && <button onClick={() => reject(a.id)} style={{ ...T.btn("danger"), padding: "3px 10px", fontSize: 11 }}>Reject</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No applicants match.</p>}
      </div>
    </div>
  );
}

// ─── SCHEDULE MODULE ──────────────────────────────────────────────────────────

function ScheduleModule({ notify }) {
  const { profile: currentUser } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("timetable");
  const [filterSection, setFilterSection] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", teacher_id: "", section: "BSIT-1A", room_id: "", day: "Monday", time_slot: "7:00–8:00", units: 3, color: "#eef4ff", semester: CURRENT_SEMESTER, academic_year: CURRENT_AY });

  const { data: users } = useSupabaseQuery('profiles');
  const { data: rooms } = useSupabaseQuery('rooms');
  const teachers = (users || []).filter(u => u.role === 'Teacher');

  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('enrollments').select('*'),
    ]).then(([{ data: subs }, { data: enrs }]) => {
      setSubjects(subs || []);
      setEnrollments(enrs || []);
      setLoading(false);
    });
  }, []);

  const isStudent = currentUser?.role === 'Student';
  const isAdmin = currentUser?.role === 'Admin';

  const mySubjects = isStudent
    ? subjects.filter(s => enrollments.some(e => e.student_id === currentUser?.id && e.subject_id === s.id))
    : subjects;

  const filteredSubjects = filterSection === "All" ? mySubjects : mySubjects.filter(s => s.section === filterSection);
  const getTeacher = (id) => teachers.find(t => t.id === id)?.name || "Unassigned";
  const getRoom = (id) => (rooms || []).find(r => r.id === id)?.name || "—";

  const handleEnroll = async (subject) => {
    const exists = enrollments.find(e => e.student_id === currentUser.id && e.subject_id === subject.id);
    if (exists) { notify("Already enrolled.", "warning"); return; }
    const { data } = await supabase.from('enrollments').insert({ student_id: currentUser.id, subject_id: subject.id }).select().maybeSingle();
    if (data) setEnrollments(p => [...p, data]);
    notify(`Enrolled in ${subject.code}`);
  };

  const handleDrop = async (subject) => {
    await supabase.from('enrollments').delete().eq('student_id', currentUser.id).eq('subject_id', subject.id);
    setEnrollments(p => p.filter(e => !(e.student_id === currentUser.id && e.subject_id === subject.id)));
    notify(`Dropped ${subject.code}`);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    if (modal === "add") {
      const { data } = await supabase.from('subjects').insert({ ...form, units: +form.units }).select().maybeSingle();
      if (data) setSubjects(p => [...p, data]);
      notify("Subject added.");
    } else {
      const { data } = await supabase.from('subjects').update({ ...form, units: +form.units }).eq('id', form.id).select().maybeSingle();
      if (data) setSubjects(p => p.map(s => s.id === data.id ? data : s));
      notify("Subject updated.");
    }
    setModal(null);
  };

  const F = (key) => ({ value: form[key] ?? "", onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div>
      {modal && (
        <Modal title={modal === "add" ? "Add Subject" : "Edit Subject"} onClose={() => setModal(null)} width={560}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Subject Code"><input style={T.input} {...F("code")} placeholder="e.g. CC101" /></Field>
            <Field label="Units"><input style={T.input} type="number" min={1} max={6} {...F("units")} /></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Subject Name"><input style={T.input} {...F("name")} /></Field></div>
            <Field label="Teacher"><select style={{ ...T.select, width: "100%" }} value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))}><option value="">Unassigned</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Section"><select style={{ ...T.select, width: "100%" }} {...F("section")}>{SECTIONS.filter(s => s !== "None").map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Day"><select style={{ ...T.select, width: "100%" }} {...F("day")}>{DAYS.map(d => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Time Slot"><select style={{ ...T.select, width: "100%" }} {...F("time_slot")}>{TIME_SLOTS.map(t => <option key={t}>{t}</option>)}</select></Field>
            <div style={{ gridColumn: "1 / -1" }}><Field label="Room"><select style={{ ...T.select, width: "100%" }} value={form.room_id} onChange={e => setForm(p => ({ ...p, room_id: e.target.value }))}><option value="">Select room</option>{(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name} ({r.floor})</option>)}</select></Field></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={save} style={T.btn("primary")}>Save</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Subjects & Schedule</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{filteredSubjects.length} subjects</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isStudent && (
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={T.select}>
              <option value="All">All sections</option>
              {SECTIONS.filter(s => s !== "None").map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          <div style={{ display: "flex", gap: 4, background: "#f5f4f0", borderRadius: 10, padding: 4 }}>
            {["timetable", "list", ...(isStudent ? ["enroll"] : [])].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer", background: view === v ? "#fff" : "transparent", color: view === v ? "#1a1a2e" : "#aaa" }}>
                {v === "timetable" ? "Timetable" : v === "list" ? "List" : "Enroll"}
              </button>
            ))}
          </div>
          {isAdmin && <button onClick={() => { setForm({ code: "", name: "", teacher_id: "", section: "BSIT-1A", room_id: "", day: "Monday", time_slot: "7:00–8:00", units: 3, color: "#eef4ff", semester: CURRENT_SEMESTER, academic_year: CURRENT_AY }); setModal("add"); }} style={T.btn("primary")}>+ Add Subject</button>}
        </div>
      </div>

      {view === "timetable" ? (
        <div style={{ ...T.card, padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f9f8f5" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", width: 90, borderBottom: "1px solid #f0efeb" }}>Time</th>
                {DAYS.map(d => (<th key={d} style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", borderBottom: "1px solid #f0efeb", borderLeft: "1px solid #f5f4f0" }}>{d}</th>))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(slot => (
                <tr key={slot} style={{ borderBottom: "1px solid #f9f8f5" }}>
                  <td style={{ padding: "8px 14px", color: "#aaa", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{slot}</td>
                  {DAYS.map(day => {
                    const subj = filteredSubjects.find(s => s.day === day && s.time_slot === slot);
                    const isEnrolled = isStudent && enrollments.some(e => e.subject_id === subj?.id && e.student_id === currentUser?.id);
                    return (
                      <td key={day} style={{ padding: "6px 8px", borderLeft: "1px solid #f5f4f0", verticalAlign: "top", height: 52 }}>
                        {subj && (
                          <div style={{ background: subj.color, borderRadius: 8, padding: "6px 8px", height: "100%", boxSizing: "border-box", border: `1px solid ${isEnrolled ? "#2d6a4f" : "#e8e6e0"}` }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 11, color: "#1a1a2e" }}>{subj.code}</p>
                            <p style={{ margin: "1px 0 0", fontSize: 10, color: "#666" }}>{getRoom(subj.room_id)}</p>
                            {!isStudent && <p style={{ margin: "1px 0 0", fontSize: 10, color: "#888" }}>{subj.section}</p>}
                            {isStudent && isEnrolled && <p style={{ margin: "1px 0 0", fontSize: 9, color: "#1b4332", fontWeight: 600 }}>Enrolled</p>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "enroll" ? (
        <div style={{ display: "grid", gap: 12 }}>
          {isStudent && enrollments.filter(e => e.student_id === currentUser.id).length > 0 && (
            <div style={T.card}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, marginBottom: "0.75rem", color: "#1a1a2e" }}>Your Current Enrollment</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {subjects.filter(s => enrollments.some(e => e.student_id === currentUser.id && e.subject_id === s.id)).map(s => (
                  <div key={s.id} style={{ border: "1.5px solid #d4f0e7", borderRadius: 12, padding: "12px", background: "#eafaf1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div><p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{s.code}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>{s.name}</p></div>
                      <span style={T.pill("#d4f0e7", "#1b4332")}>{s.units}u</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: 11, color: "#666" }}>{getTeacher(s.teacher_id)} · {s.day} {s.time_slot}</p>
                    <button onClick={() => handleDrop(s)} style={{ ...T.btn("danger"), padding: "5px 10px", fontSize: 11, width: "100%", marginTop: 8 }}>Drop Subject</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isStudent && (
            <div style={T.card}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, marginBottom: "0.75rem", color: "#1a1a2e" }}>Available Subjects</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {subjects.filter(s => s.section === currentUser?.section && !enrollments.some(e => e.student_id === currentUser.id && e.subject_id === s.id)).map(s => (
                  <div key={s.id} style={{ border: "1.5px solid #b5d4f4", borderRadius: 12, padding: "12px", background: "#eef4ff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div><p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{s.code}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>{s.name}</p></div>
                      <span style={T.pill("#b5d4f4", "#0f3460")}>{s.units}u</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: 11, color: "#666" }}>{getTeacher(s.teacher_id)} · {s.day} {s.time_slot}</p>
                    <button onClick={() => handleEnroll(s)} style={{ ...T.btn("success"), padding: "5px 10px", fontSize: 11, width: "100%", marginTop: 8 }}>Enroll</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0efeb" }}>
                {["Code", "Subject", "Section", "Teacher", "Day & Time", "Room", "Units"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                  <td style={{ padding: "10px 14px" }}><div style={{ padding: "3px 8px", background: s.color, borderRadius: 6, display: "inline-block", fontSize: 12, fontWeight: 700 }}>{s.code}</div></td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: "10px 14px", color: "#1565c0", fontSize: 12 }}>{s.section}</td>
                  <td style={{ padding: "10px 14px", color: "#888", fontSize: 12 }}>{getTeacher(s.teacher_id)}</td>
                  <td style={{ padding: "10px 14px", color: "#888", fontSize: 12 }}>{s.day} · {s.time_slot}</td>
                  <td style={{ padding: "10px 14px", color: "#888", fontSize: 12 }}>{getRoom(s.room_id)}</td>
                  <td style={{ padding: "10px 14px" }}><span style={T.pill("#f5f4f0", "#555")}>{s.units} units</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSubjects.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No subjects found.</p>}
        </div>
      )}
    </div>
  );
}

// ─── GRADEBOOK MODULE ─────────────────────────────────────────────────────────

function GradebookModule({ notify }) {
  const { profile: currentUser } = useAuth();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ student_id: "", subject_id: "", quizzes: 0, activities: 0, midterm: 0, finals: 0, remarks: "Passed" });

  const { data: users } = useSupabaseQuery('profiles');
  const students = (users || []).filter(u => u.role === 'Student');

  useEffect(() => {
    supabase.from('subjects').select('*').then(({ data }) => { setSubjects(data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'Student') {
      supabase.from('grades').select('*').eq('student_id', currentUser.id).then(({ data }) => setGrades(data || []));
    } else {
      supabase.from('grades').select('*').then(({ data }) => setGrades(data || []));
    }
  }, [currentUser?.id]);

  const isStudent = currentUser?.role === 'Student';
  const isAdmin = currentUser?.role === 'Admin';
  const isTeacher = currentUser?.role === 'Teacher';

  const mySubjects = isStudent
    ? subjects.filter(s => grades.some(g => g.subject_id === s.id))
    : isTeacher ? subjects.filter(s => s.teacher_id === currentUser?.id) : subjects;

  const activeSubject = selectedSubjectId ? mySubjects.find(s => s.id === selectedSubjectId) : mySubjects[0];
  const subjectGrades = activeSubject ? grades.filter(g => g.subject_id === activeSubject.id) : [];
  const sectionStudents = activeSubject ? students.filter(s => s.section === activeSubject.section) : [];

  const saveGrade = async () => {
    const existing = grades.find(g => g.student_id === form.student_id && g.subject_id === form.subject_id);
    const payload = { student_id: form.student_id, subject_id: form.subject_id, semester: CURRENT_SEMESTER, academic_year: CURRENT_AY, quizzes: +form.quizzes, activities: +form.activities, midterm: +form.midterm, finals: +form.finals, remarks: form.remarks };
    if (existing) {
      const { data } = await supabase.from('grades').update(payload).eq('id', existing.id).select().maybeSingle();
      if (data) setGrades(p => p.map(g => g.id === data.id ? data : g));
    } else {
      const { data } = await supabase.from('grades').insert(payload).select().maybeSingle();
      if (data) setGrades(p => [...p, data]);
    }
    setModal(null);
    notify("Grade saved.");
  };

  if (isStudent) {
    const gradedEntries = grades.filter(g => !["INC","NFE","Dropped","Withdrawn"].includes(g.remarks));
    const transmutedGrades = gradedEntries.map(g => transmute(computeGrade(g)));
    const gwa = transmutedGrades.length > 0 ? (transmutedGrades.reduce((a, b) => a + b, 0) / transmutedGrades.length).toFixed(2) : null;
    const honor = gwa ? getHonor(+gwa) : null;

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>My Grades</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{currentUser?.course} · {currentUser?.section}</p>
          </div>
          {gwa && (
            <div style={{ ...T.card, padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>GWA (Transmuted)</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: +gwa <= 3 ? "#0f3460" : "#7a1c2e" }}>{gwa}</div>
              </div>
              {honor && <span style={{ ...T.pill(honor.bg, honor.color, honor.border), fontSize: 12, padding: "5px 12px" }}>{honor.label}</span>}
            </div>
          )}
        </div>
        <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0efeb" }}>
                {["Subject", "Quizzes", "Activities", "Midterm", "Finals", "Raw", "Grade (1-5)", "Remarks"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mySubjects.map(subj => {
                const g = grades.find(x => x.subject_id === subj.id);
                const avg = g ? computeGrade(g) : null;
                const tGrade = g ? transmute(avg) : null;
                return (
                  <tr key={subj.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                    <td style={{ padding: "10px 14px" }}><p style={{ margin: 0, fontWeight: 600 }}>{subj.code}</p><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{subj.name}</p></td>
                    {g ? (
                      <>
                        {GRADE_COMPONENTS.map(c => <td key={c} style={{ padding: "10px 14px", color: "#555" }}>{g[c.toLowerCase()]}</td>)}
                        <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 16, fontWeight: 700, color: gradeColor(avg) }}>{avg}</span></td>
                        <td style={{ padding: "10px 14px" }}>{tGrade !== null ? <span style={{ fontSize: 14, fontWeight: 700, color: tGrade <= 3.0 ? "#0f3460" : "#7a1c2e" }}>{tGrade.toFixed(2)}</span> : <span style={{ color: "#ccc" }}>—</span>}</td>
                        <td style={{ padding: "10px 14px" }}><span style={T.pill(g.remarks === "Passed" ? "#eafaf1" : "#fff0f3", g.remarks === "Passed" ? "#1b4332" : "#7a1c2e")}>{g.remarks}</span></td>
                      </>
                    ) : (
                      <td colSpan={6} style={{ padding: "10px 14px", color: "#ccc", fontSize: 12 }}>No grade posted yet</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {modal === "grade" && (
        <Modal title="Enter / Update Grade" onClose={() => setModal(null)} width={440}>
          <Field label="Student"><select style={{ ...T.select, width: "100%" }} value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}><option value="">Select student</option>{sectionStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {GRADE_COMPONENTS.map(c => <Field key={c} label={c}><input style={T.input} type="number" min={0} max={100} value={form[c.toLowerCase()]} onChange={e => setForm(p => ({ ...p, [c.toLowerCase()]: +e.target.value }))} /></Field>)}
          </div>
          <Field label="Remarks"><select style={{ ...T.select, width: "100%" }} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}>{SPECIAL_REMARKS.map(r => <option key={r}>{r}</option>)}</select></Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={saveGrade} style={T.btn("primary")}>Save Grade</button>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Gradebook</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>Select a subject to view and enter grades</p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          {mySubjects.map(s => (
            <div key={s.id} onClick={() => setSelectedSubjectId(s.id)} style={{ ...T.card, marginBottom: 8, padding: "0.9rem", cursor: "pointer", border: (activeSubject?.id === s.id) ? "2px solid #1a1a2e" : "1px solid #e8e6e0" }}>
              <div style={{ display: "inline-block", padding: "2px 8px", background: s.color, borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{s.code}</div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{s.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>{s.section}</p>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {activeSubject ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{activeSubject.code} — {activeSubject.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>{activeSubject.section} · {sectionStudents.length} students</p>
                </div>
                {(isAdmin || isTeacher) && <button onClick={() => { setForm({ student_id: sectionStudents[0]?.id || "", subject_id: activeSubject.id, quizzes: 0, activities: 0, midterm: 0, finals: 0, remarks: "Passed" }); setModal("grade"); }} style={T.btn("primary")}>+ Enter Grade</button>}
              </div>
              <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f0efeb" }}>
                      {["Student", ...GRADE_COMPONENTS, "Final Grade", "Remarks"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionStudents.map(stu => {
                      const g = subjectGrades.find(x => x.student_id === stu.id);
                      const avg = g ? computeGrade(g) : null;
                      return (
                        <tr key={stu.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                          <td style={{ padding: "10px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 26, height: 26, borderRadius: 50, background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#0f3460" }}>{stu.avatar}</div><span style={{ fontWeight: 500 }}>{stu.name}</span></div></td>
                          {g ? (
                            <>
                              {GRADE_COMPONENTS.map(c => <td key={c} style={{ padding: "10px 14px", color: "#555" }}>{g[c.toLowerCase()]}</td>)}
                              <td style={{ padding: "10px 14px" }}><span style={{ fontSize: 16, fontWeight: 700, color: gradeColor(avg) }}>{avg}</span></td>
                              <td style={{ padding: "10px 14px" }}><span style={T.pill(avg >= 75 ? "#eafaf1" : "#fff0f3", avg >= 75 ? "#1b4332" : "#7a1c2e")}>{g.remarks}</span></td>
                            </>
                          ) : (
                            <td colSpan={5} style={{ padding: "10px 14px", color: "#ccc", fontSize: 12 }}>No grade yet</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {sectionStudents.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No students in this section.</p>}
              </div>
            </div>
          ) : (
            <div style={{ ...T.card, textAlign: "center", padding: "3rem", color: "#aaa", fontSize: 13 }}>Select a subject to view grades.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ATTENDANCE MODULE ────────────────────────────────────────────────────────

function AttendanceModule({ notify }) {
  const { profile: currentUser } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [markDate, setMarkDate] = useState(today());
  const [modal, setModal] = useState(null);
  const [bulkStatus, setBulkStatus] = useState({});

  const { data: users } = useSupabaseQuery('profiles');
  const students = (users || []).filter(u => u.role === 'Student');

  useEffect(() => {
    Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('attendance').select('*'),
    ]).then(([{ data: subs }, { data: atts }]) => {
      setSubjects(subs || []);
      setAttendance(atts || []);
      setLoading(false);
    });
  }, []);

  const isStudent = currentUser?.role === 'Student';
  const isAdmin = currentUser?.role === 'Admin';
  const isTeacher = currentUser?.role === 'Teacher';

  const mySubjects = isStudent
    ? subjects.filter(s => s.section === currentUser?.section)
    : isTeacher ? subjects.filter(s => s.teacher_id === currentUser?.id) : subjects;

  const activeSubject = selectedSubjectId ? mySubjects.find(s => s.id === selectedSubjectId) : mySubjects[0];
  const sectionStudents = activeSubject ? students.filter(s => s.section === activeSubject.section) : [];
  const subjectAttendance = activeSubject ? attendance.filter(a => a.subject_id === activeSubject.id) : [];
  const attDates = [...new Set(subjectAttendance.map(a => a.date))].sort().reverse();

  const attColor = { Present: "#eafaf1", Absent: "#fff0f3", Late: "#fff8ee", Excused: "#eeedfe" };
  const attText = { Present: "#1b4332", Absent: "#7a1c2e", Late: "#a05800", Excused: "#3c3489" };

  const getAttStatus = (studentId, date) => subjectAttendance.find(a => a.student_id === studentId && a.date === date)?.status || null;

  const initBulk = () => {
    const init = {};
    sectionStudents.forEach(s => { init[s.id] = getAttStatus(s.id, markDate) || "Present"; });
    setBulkStatus(init);
    setModal("mark");
  };

  const saveBulk = async () => {
    const existing = attendance.filter(a => a.subject_id === activeSubject.id && a.date === markDate);
    for (const id of existing.map(e => e.id)) {
      await supabase.from('attendance').delete().eq('id', id);
    }
    const newRecords = sectionStudents.map(s => ({
      student_id: s.id, subject_id: activeSubject.id, date: markDate,
      status: bulkStatus[s.id] || "Present", semester: CURRENT_SEMESTER, academic_year: CURRENT_AY,
    }));
    const { data } = await supabase.from('attendance').insert(newRecords).select();
    if (data) {
      setAttendance(p => [...p.filter(a => !(a.subject_id === activeSubject.id && a.date === markDate)), ...data]);
    }
    setModal(null);
    notify(`Attendance marked for ${markDate}.`);
  };

  if (isStudent) {
    const myAtt = attendance.filter(a => a.student_id === currentUser.id);
    const presentCount = myAtt.filter(a => a.status === "Present").length;
    const total = myAtt.length;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : null;

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>My Attendance</h2><p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{currentUser?.section}</p></div>
          {rate !== null && <div style={{ ...T.card, padding: "0.75rem 1.25rem" }}><div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase" }}>Attendance Rate</div><div style={{ fontSize: 28, fontWeight: 700, color: rate >= 90 ? "#1b4332" : rate >= 75 ? "#633806" : "#7a1c2e" }}>{rate}%</div></div>}
        </div>
        <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #f0efeb" }}>{["Date", "Subject", "Status"].map(h => (<th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
            <tbody>
              {myAtt.sort((a, b) => b.date.localeCompare(a.date)).map(a => {
                const subj = subjects.find(s => s.id === a.subject_id);
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                    <td style={{ padding: "10px 14px", color: "#888" }}>{a.date}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ fontWeight: 600 }}>{subj?.code || "—"}</span><span style={{ marginLeft: 8, fontSize: 12, color: "#aaa" }}>{subj?.name}</span></td>
                    <td style={{ padding: "10px 14px" }}><span style={T.pill(attColor[a.status], attText[a.status])}>{a.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {myAtt.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No attendance records yet.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {modal === "mark" && activeSubject && (
        <Modal title={`Mark Attendance — ${activeSubject.code}`} onClose={() => setModal(null)} width={500}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: "1.25rem" }}>
            <Field label="Date"><input style={{ ...T.input, maxWidth: 180 }} type="date" value={markDate} onChange={e => setMarkDate(e.target.value)} /></Field>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: "0.75rem" }}>
            {ATTENDANCE_STATUS.map(st => (<button key={st} onClick={() => { const n = {}; sectionStudents.forEach(s => { n[s.id] = st; }); setBulkStatus(n); }} style={{ ...T.btn("ghost"), padding: "4px 10px", fontSize: 11 }}>All {st}</button>))}
          </div>
          {sectionStudents.map(stu => (
            <div key={stu.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f5f4f0" }}>
              <div style={{ width: 28, height: 28, borderRadius: 50, background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#0f3460", flexShrink: 0 }}>{stu.avatar}</div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{stu.name}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {ATTENDANCE_STATUS.map(st => (<button key={st} onClick={() => setBulkStatus(prev => ({ ...prev, [stu.id]: st }))} style={{ padding: "3px 8px", borderRadius: 7, border: "1.5px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", background: bulkStatus[stu.id] === st ? attColor[st] : "#fff", color: bulkStatus[stu.id] === st ? attText[st] : "#aaa", borderColor: bulkStatus[stu.id] === st ? attText[st] + "55" : "#e8e6e0" }}>{st}</button>))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={saveBulk} style={T.btn("primary")}>Save Attendance</button>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Attendance</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>Select a subject to view and mark attendance</p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          {mySubjects.map(s => (
            <div key={s.id} onClick={() => setSelectedSubjectId(s.id)} style={{ ...T.card, marginBottom: 8, padding: "0.9rem", cursor: "pointer", border: (activeSubject?.id === s.id) ? "2px solid #1a1a2e" : "1px solid #e8e6e0" }}>
              <div style={{ display: "inline-block", padding: "2px 8px", background: s.color, borderRadius: 6, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{s.code}</div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{s.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>{s.section}</p>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          {activeSubject ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div><p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{activeSubject.code} — {activeSubject.name}</p><p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>{activeSubject.section} · {sectionStudents.length} students</p></div>
                {(isAdmin || isTeacher) && <button onClick={initBulk} style={T.btn("primary")}>Mark Attendance</button>}
              </div>
              {attDates.length > 0 ? (
                <div style={{ ...T.card, padding: 0, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: "1px solid #f0efeb" }}><th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Student</th>{attDates.map(d => (<th key={d} style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", whiteSpace: "nowrap" }}>{d}</th>))}</tr></thead>
                    <tbody>
                      {sectionStudents.map(stu => (
                        <tr key={stu.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{stu.name}</td>
                          {attDates.map(d => { const st = getAttStatus(stu.id, d); return (<td key={d} style={{ padding: "8px 14px", textAlign: "center" }}>{st ? <span style={{ ...T.pill(attColor[st], attText[st]), fontSize: 10 }}>{st[0]}</span> : <span style={{ color: "#ddd", fontSize: 11 }}>—</span>}</td>); })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ ...T.card, textAlign: "center", padding: "3rem", color: "#aaa", fontSize: 13 }}>No attendance records yet. Click "Mark Attendance" to start.</div>
              )}
            </div>
          ) : (
            <div style={{ ...T.card, textAlign: "center", padding: "3rem", color: "#aaa", fontSize: 13 }}>Select a subject to manage attendance.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LIBRARY MODULE ───────────────────────────────────────────────────────────

function LibraryModule({ notify }) {
  const { profile: currentUser } = useAuth();
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [modal, setModal] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [borrowerId, setBorrowerId] = useState("");
  const [dueDays, setDueDays] = useState(7);
  const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", category: "ICT", copies: 1, available: 1 });
  const [confirmReturn, setConfirmReturn] = useState(null);

  const { data: users } = useSupabaseQuery('profiles');
  const isAdmin = currentUser?.role === 'Admin';
  const isStudent = currentUser?.role === 'Student';
  const borrowers = (users || []).filter(u => ["Student", "Teacher"].includes(u.role) && u.status === "Active");

  useEffect(() => {
    Promise.all([
      supabase.from('books').select('*'),
      supabase.from('book_transactions').select('*'),
    ]).then(([{ data: bks }, { data: txs }]) => {
      setBooks(bks || []);
      setTransactions(txs || []);
      setLoading(false);
    });
  }, []);

  const filteredBooks = books.filter(b => {
    const mq = b.title.toLowerCase().includes(searchQ.toLowerCase()) || b.author.toLowerCase().includes(searchQ.toLowerCase());
    const mc = filterCat === "All" || b.category === filterCat;
    return mq && mc;
  });

  const filteredTx = isStudent ? transactions.filter(tx => tx.borrower_id === currentUser.id) : transactions;

  const confirmBorrow = async () => {
    if (!borrowerId && !isStudent) return;
    const bId = isStudent ? currentUser.id : parseInt(borrowerId);
    const borrower = (users || []).find(u => u.id === bId);
    const book = books.find(b => b.id === selectedBook.id);
    if (book.available <= 0) { notify("No copies available.", "danger"); return; }
    const newTx = { book_id: book.id, borrower_id: bId, borrower_name: borrower?.name || currentUser.name, borrowed_date: today(), due_date: dueDate(dueDays), status: "Borrowed", fine: 0, fine_paid: false };
    const { data } = await supabase.from('book_transactions').insert(newTx).select().maybeSingle();
    if (data) setTransactions(p => [...p, data]);
    await supabase.from('books').update({ available: book.available - 1 }).eq('id', book.id);
    setBooks(p => p.map(b => b.id === book.id ? { ...b, available: b.available - 1 } : b));
    setModal(null);
    notify(`"${book.title}" borrowed by ${borrower?.name || currentUser.name}.`);
  };

  const returnBook = async (tx) => {
    await supabase.from('book_transactions').update({ returned_date: today(), status: "Returned" }).eq('id', tx.id);
    setTransactions(p => p.map(t => t.id === tx.id ? { ...t, returned_date: today(), status: "Returned" } : t));
    const book = books.find(b => b.id === tx.book_id);
    if (book) {
      await supabase.from('books').update({ available: Math.min(book.available + 1, book.copies) }).eq('id', book.id);
      setBooks(p => p.map(b => b.id === tx.book_id ? { ...b, available: Math.min(b.available + 1, b.copies) } : b));
    }
    setConfirmReturn(null);
    notify("Book returned successfully.");
  };

  const saveBook = async () => {
    if (!bookForm.title.trim()) return;
    if (modal === "addBook") {
      const { data } = await supabase.from('books').insert({ ...bookForm, copies: +bookForm.copies, available: +bookForm.available }).select().maybeSingle();
      if (data) setBooks(p => [...p, data]);
      notify("Book added to catalog.");
    } else {
      const { data } = await supabase.from('books').update({ ...bookForm, copies: +bookForm.copies, available: +bookForm.available }).eq('id', bookForm.id).select().maybeSingle();
      if (data) setBooks(p => p.map(b => b.id === data.id ? data : b));
      notify("Book updated.");
    }
    setModal(null);
  };

  const stats = { total: books.length, totalCopies: books.reduce((a, b) => a + b.copies, 0), borrowed: transactions.filter(t => t.status === "Borrowed").length, overdue: transactions.filter(t => t.status === "Overdue").length };

  const CAT_COLOR_LIB = { ICT: { bg: "#eef4ff", color: "#0f3460", border: "#b5d4f4" }, Mathematics: { bg: "#eeedfe", color: "#3c3489", border: "#afa9ec" }, Science: { bg: "#e1f5ee", color: "#0f6e56", border: "#5dcaa5" }, Humanities: { bg: "#fff8ee", color: "#633806", border: "#fac775" }, Business: { bg: "#fbeaf0", color: "#72243e", border: "#ed93b1" }, Other: { bg: "#f1efea", color: "#444441", border: "#b4b2a9" } };

  return (
    <div>
      {confirmReturn && <Confirm msg={`Mark "${books.find(b => b.id === confirmReturn.book_id)?.title}" as returned?`} onConfirm={() => returnBook(confirmReturn)} onCancel={() => setConfirmReturn(null)} />}

      {(modal === "addBook" || modal === "editBook") && (
        <Modal title={modal === "addBook" ? "Add Book" : "Edit Book"} onClose={() => setModal(null)}>
          <Field label="Title"><input style={T.input} value={bookForm.title} onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Author"><input style={T.input} value={bookForm.author} onChange={e => setBookForm(p => ({ ...p, author: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ISBN"><input style={T.input} value={bookForm.isbn} onChange={e => setBookForm(p => ({ ...p, isbn: e.target.value }))} /></Field>
            <Field label="Category"><select style={{ ...T.select, width: "100%" }} value={bookForm.category} onChange={e => setBookForm(p => ({ ...p, category: e.target.value }))}>{BOOK_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Total Copies"><input style={T.input} type="number" min={1} value={bookForm.copies} onChange={e => setBookForm(p => ({ ...p, copies: e.target.value }))} /></Field>
            <Field label="Available Now"><input style={T.input} type="number" min={0} value={bookForm.available} onChange={e => setBookForm(p => ({ ...p, available: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={saveBook} style={T.btn("primary")}>Save</button>
          </div>
        </Modal>
      )}

      {modal === "borrow" && selectedBook && (
        <Modal title={`Borrow: "${selectedBook.title}"`} onClose={() => setModal(null)} width={420}>
          <div style={{ marginBottom: "1rem", padding: "10px 14px", background: "#f9f8f5", borderRadius: 10, border: "1px solid #eae8e2" }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600 }}>{selectedBook.title}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>{selectedBook.author} · {selectedBook.available} of {selectedBook.copies} available</p>
          </div>
          {!isStudent && <Field label="Borrower"><select style={{ ...T.select, width: "100%" }} value={borrowerId} onChange={e => setBorrowerId(e.target.value)}><option value="">— Select borrower —</option>{borrowers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</select></Field>}
          <Field label={`Loan Period (days): ${dueDays}`}><input type="range" min={1} max={30} step={1} value={dueDays} onChange={e => setDueDays(+e.target.value)} style={{ width: "100%", marginTop: 6 }} /></Field>
          <p style={{ fontSize: 12, color: "#888", margin: "-0.5rem 0 1rem" }}>Due: <strong>{dueDate(dueDays)}</strong></p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={confirmBorrow} style={T.btn("primary")}>Confirm Borrow</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Library</h2><p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{stats.totalCopies} books · {stats.borrowed} borrowed · {stats.overdue} overdue</p></div>
        {isAdmin && <button onClick={() => { setBookForm({ title: "", author: "", isbn: "", category: "ICT", copies: 1, available: 1 }); setModal("addBook"); }} style={T.btn("primary")}>+ Add Book</button>}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: "1rem", background: "#f5f4f0", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {["catalog", "transactions"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "7px 18px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: activeTab === tab ? "#fff" : "transparent", color: activeTab === tab ? "#1a1a2e" : "#aaa" }}>{tab === "catalog" ? "Catalog" : "Transactions"}</button>
        ))}
      </div>

      {activeTab === "catalog" ? (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search title, author, ISBN..." style={{ ...T.input, maxWidth: 300 }} />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={T.select}><option value="All">All categories</option>{BOOK_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: "1px solid #f0efeb" }}>{["Title", "Author", "ISBN", "Category", "Availability", ""].map(h => (<th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
              <tbody>
                {filteredBooks.map(b => {
                  const cc = CAT_COLOR_LIB[b.category] || CAT_COLOR_LIB["Other"];
                  const canBorrow = b.available > 0;
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{b.title}</td>
                      <td style={{ padding: "10px 14px", color: "#888" }}>{b.author}</td>
                      <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 12, fontFamily: "monospace" }}>{b.isbn}</td>
                      <td style={{ padding: "10px 14px" }}><span style={T.pill(cc.bg, cc.color, cc.border)}>{b.category}</span></td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: b.available === 0 ? "#e94560" : "#1b4332" }}>{b.available}/{b.copies}</span>
                          {b.available === 0 && <span style={T.pill("#fff0f3", "#e94560")}>Out</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {canBorrow && <button onClick={() => { setSelectedBook(b); setBorrowerId(isStudent ? String(currentUser.id) : ""); setDueDays(7); setModal("borrow"); }} style={{ ...T.btn("success"), padding: "3px 10px", fontSize: 11 }}>Borrow</button>}
                          {isAdmin && <button onClick={() => { setBookForm({ ...b }); setModal("editBook"); }} style={{ ...T.btn("ghost"), padding: "3px 8px", fontSize: 11 }}>Edit</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredBooks.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No books found.</p>}
          </div>
        </div>
      ) : (
        <div style={{ ...T.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #f0efeb" }}>{["Book", ...(!isStudent ? ["Borrower"] : []), "Borrowed", "Due Date", "Status", ""].map(h => (<th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
            <tbody>
              {filteredTx.map(tx => {
                const book = books.find(b => b.id === tx.book_id);
                const statusStyle = tx.status === "Returned" ? { bg: "#eafaf1", color: "#1b4332" } : tx.status === "Overdue" ? { bg: "#fff0f3", color: "#7a1c2e" } : { bg: "#fff8ee", color: "#a05800" };
                return (
                  <tr key={tx.id} style={{ borderBottom: "1px solid #f9f8f5" }}>
                    <td style={{ padding: "10px 14px" }}><p style={{ margin: 0, fontWeight: 500 }}>{book?.title || "Unknown"}</p><p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{book?.author}</p></td>
                    {!isStudent && <td style={{ padding: "10px 14px", color: "#555" }}>{tx.borrower_name}</td>}
                    <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 12 }}>{tx.borrowed_date}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: tx.status === "Overdue" ? "#e94560" : "#555", fontWeight: tx.status === "Overdue" ? 700 : 400 }}>{tx.due_date}</td>
                    <td style={{ padding: "10px 14px" }}><span style={T.pill(statusStyle.bg, statusStyle.color)}>{tx.status}</span></td>
                    <td style={{ padding: "10px 14px" }}>
                      {tx.status !== "Returned" && <button onClick={() => setConfirmReturn(tx)} style={{ ...T.btn("success"), padding: "3px 10px", fontSize: 11 }}>Return</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTx.length === 0 && <p style={{ textAlign: "center", color: "#bbb", padding: "2rem", fontSize: 13 }}>No transactions found.</p>}
        </div>
      )}
    </div>
  );
}

// ─── ANNOUNCEMENTS MODULE ─────────────────────────────────────────────────────

function AnnouncementsModule({ notify }) {
  const { profile: currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: "", body: "", target: "All", pinned: false });

  useEffect(() => {
    supabase.from('announcements').select('*').then(({ data }) => { setAnnouncements(data || []); setLoading(false); });
  }, []);

  const isAdmin = currentUser?.role === 'Admin';
  const isTeacher = currentUser?.role === 'Teacher';
  const canPost = isAdmin || isTeacher;

  const visible = announcements.filter(a => a.target === "All" || a.target === (isTeacher ? "Teachers" : currentUser?.role === "Student" ? "Students" : "All")).sort((a, b) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return b.date?.localeCompare(a.date) || 0; });

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const { data } = await supabase.from('announcements').insert({
      author_id: currentUser.id, author_name: currentUser.name, author_role: currentUser.role,
      title: form.title, body: form.body, target: form.target, pinned: form.pinned, date: today(), read_by: [],
    }).select().maybeSingle();
    if (data) setAnnouncements(p => [...p, data]);
    setModal(null);
    notify("Announcement posted.");
    setForm({ title: "", body: "", target: "All", pinned: false });
  };

  const deleteAnn = async (id) => {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(p => p.filter(a => a.id !== id));
    notify("Announcement deleted.", "warning");
  };

  const togglePin = async (id) => {
    const ann = announcements.find(a => a.id === id);
    await supabase.from('announcements').update({ pinned: !ann.pinned }).eq('id', id);
    setAnnouncements(p => p.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
    notify("Pin status updated.");
  };

  const targetStyle = { All: { bg: "#f5f4f0", color: "#555" }, Students: { bg: "#eef4ff", color: "#0f3460" }, Teachers: { bg: "#eeedfe", color: "#3c3489" } };

  return (
    <div>
      {modal === "add" && (
        <Modal title="Post Announcement" onClose={() => setModal(null)} width={540}>
          <Field label="Title"><input style={T.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Message"><textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={5} style={{ ...T.input, resize: "vertical" }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Visible to"><select style={{ ...T.select, width: "100%" }} value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}>{ANN_TARGETS.map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Pin to top"><div style={{ display: "flex", gap: 8, marginTop: 4 }}>{[true, false].map(v => (<button key={String(v)} onClick={() => setForm(p => ({ ...p, pinned: v }))} style={{ ...T.btn(form.pinned === v ? "primary" : "ghost"), padding: "7px 14px", fontSize: 12 }}>{v ? "Pinned" : "Normal"}</button>))}</div></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1rem" }}>
            <button onClick={() => setModal(null)} style={T.btn("ghost")}>Cancel</button>
            <button onClick={save} style={T.btn("primary")}>Post</button>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Announcements</h2><p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>{visible.length} announcements</p></div>
        {canPost && <button onClick={() => setModal("add")} style={T.btn("primary")}>+ Post</button>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.length === 0 && <div style={{ ...T.card, textAlign: "center", padding: "3rem", color: "#aaa", fontSize: 13 }}>No announcements.</div>}
        {visible.map(a => {
          const ts = targetStyle[a.target] || targetStyle.All;
          const canEdit = isAdmin || a.author_id === currentUser?.id;
          return (
            <div key={a.id} style={{ ...T.card, background: a.pinned ? "#fffdf8" : "#fff", border: a.pinned ? "1px solid #fac77555" : "1px solid #e8e6e0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {a.pinned && <span style={{ fontSize: 14 }}>Pinned</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{a.title}</span>
                    <span style={T.pill(ts.bg, ts.color)}>{a.target}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa", whiteSpace: "nowrap" }}>{a.date}</span>
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#444", lineHeight: 1.65 }}>{a.body}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 50, background: ROLE_META[a.author_role]?.light || "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: ROLE_META[a.author_role]?.color || "#555" }}>{a.author_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                    <span style={{ fontSize: 12, color: "#888" }}>{a.author_name} · {a.author_role}</span>
                  </div>
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => togglePin(a.id)} style={{ ...T.btn("ghost"), padding: "4px 10px", fontSize: 11 }}>{a.pinned ? "Unpin" : "Pin"}</button>
                    {isAdmin && <button onClick={() => deleteAnn(a.id)} style={{ ...T.btn("danger"), padding: "4px 10px", fontSize: 11 }}>Del</button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PROFILE MODULE ───────────────────────────────────────────────────────────

function ProfileModule({ notify }) {
  const { profile: currentUser, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: currentUser?.name || "", contact: currentUser?.contact || "", address: currentUser?.address || "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [tab, setTab] = useState("info");

  useEffect(() => {
    if (currentUser) setForm({ name: currentUser.name, contact: currentUser.contact || "", address: currentUser.address || "" });
  }, [currentUser]);

  const saveProfile = async () => {
    if (!form.name.trim()) return;
    const initials = form.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    await updateProfile({ name: form.name, contact: form.contact, address: form.address, avatar: initials });
    notify("Profile updated.");
  };

  const changePassword = async () => {
    setPwError("");
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords do not match."); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    if (error) { setPwError(error.message); return; }
    setPwForm({ current: "", next: "", confirm: "" });
    notify("Password changed successfully.");
  };

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>My Profile</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>Update your contact details and password</p>
      </div>
      <div style={{ display: "flex", gap: 4, background: "#f5f4f0", borderRadius: 10, padding: 4, marginBottom: "1.25rem", maxWidth: 360 }}>
        {["info", "password"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: tab === t ? "#fff" : "transparent", color: tab === t ? "#1a1a2e" : "#aaa" }}>
            {t === "info" ? "Personal Info" : "Change Password"}
          </button>
        ))}
      </div>
      {tab === "info" ? (
        <div style={{ ...T.card, maxWidth: 520 }}>
          <Field label="Name"><input style={T.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Contact Number"><input style={T.input} value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} placeholder="0917-xxx-xxxx" /></Field>
          <Field label="Address"><input style={T.input} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Barangay, City" /></Field>
          <button onClick={saveProfile} style={{ ...T.btn("primary"), width: "100%" }}>Save Profile</button>
        </div>
      ) : (
        <div style={{ ...T.card, maxWidth: 520 }}>
          {pwError && <div style={{ marginBottom: "1rem", padding: "8px 14px", background: "#fff0f3", border: "1px solid #e9456033", borderRadius: 8, fontSize: 12, color: "#e94560" }}>{pwError}</div>}
          <Field label="New Password"><input style={T.input} type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="••••••••" /></Field>
          <Field label="Confirm New Password"><input style={T.input} type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" /></Field>
          {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && <p style={{ fontSize: 12, color: "#e94560", margin: "-0.5rem 0 1rem" }}>Passwords do not match.</p>}
          <button onClick={changePassword} style={{ ...T.btn("primary"), width: "100%" }}>Change Password</button>
        </div>
      )}
    </div>
  );
}

// ─── SEARCH MODULE ────────────────────────────────────────────────────────────

function SearchModule() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const { data: users } = useSupabaseQuery('profiles');
  const { data: subjects } = useSupabaseQuery('subjects');
  const { data: rooms } = useSupabaseQuery('rooms');
  const { data: books } = useSupabaseQuery('books');

  const userResults = q ? (users || []).filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : [];
  const subjectResults = q ? (subjects || []).filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) : [];
  const roomResults = q ? (rooms || []).filter(r => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) : [];
  const bookResults = q ? (books || []).filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)) : [];

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Global Search</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#aaa" }}>Search users, subjects, rooms, and books from one place.</p>
      </div>
      <div style={{ ...T.card, marginBottom: "1.5rem" }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search everything..." style={{ ...T.input, width: "100%" }} />
      </div>
      {!q ? (
        <div style={{ ...T.card, textAlign: "center", color: "#aaa", padding: "3rem" }}>Type a name, subject code, room number, or book title to find results.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {[
            { label: "Users", results: userResults, render: u => <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f4f0" }}><div style={{ width: 32, height: 32, borderRadius: 50, background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f3460", fontWeight: 700 }}>{u.avatar}</div><div><div style={{ fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 12, color: "#888" }}>{u.email} · {u.role}</div></div></div> },
            { label: "Subjects", results: subjectResults, render: s => <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f4f0" }}><div style={{ fontWeight: 600 }}>{s.code} — {s.name}</div><div style={{ fontSize: 12, color: "#888" }}>{s.section} · {s.day} · {s.time_slot}</div></div> },
            { label: "Rooms", results: roomResults, render: r => <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f4f0" }}><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 12, color: "#888" }}>{r.category} · {r.section || "No section"}</div></div> },
            { label: "Books", results: bookResults, render: b => <div key={b.id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f4f0" }}><div style={{ fontWeight: 600 }}>{b.title}</div><div style={{ fontSize: 12, color: "#888" }}>{b.author} · {b.category}</div></div> },
          ].map(({ label, results, render }) => (
            <div key={label} style={T.card}>
              <p style={{ ...T.label, marginBottom: 10 }}>{label}</p>
              {results.length > 0 ? results.slice(0, 6).map(render) : <p style={{ margin: 0, color: "#bbb" }}>No matching {label.toLowerCase()}.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

export {
  AdminDashboard, StudentDashboard,
  UsersModule, RoomsModule, EnrollmentModule,
  ScheduleModule, GradebookModule, AttendanceModule,
  LibraryModule, AnnouncementsModule, ProfileModule, SearchModule,
};