// ─── ExtraModules.jsx ─────────────────────────────────────────────────────────
// Supplementary modules to add to SchoolOS:
//   1. ClearanceModule      — Student clearance tracker per office
//   2. FeesModule           — Fee ledger, payment recording, balance tracking
//   3. DocumentRequestModule— TOR, COR, Good Moral, etc.
//   4. BulkImportModule     — CSV bulk-import of student profiles
//   5. NoticeBoardModule    — Student-visible notice board with categories
//
// HOW TO INTEGRATE:
//   a) Copy this file to src/modules/ExtraModules.jsx
//   b) In App.jsx, import the exports and add NAV entries:
//        { id: 'clearance', label: 'Clearance',   icon: '✔', roles: ['Admin','Student'] },
//        { id: 'fees',      label: 'Fees',         icon: '◈', roles: ['Admin','Student'] },
//        { id: 'docrequests', label: 'Doc Requests', icon: '▣', roles: ['Admin','Student'] },
//        { id: 'bulkimport', label: 'Bulk Import', icon: '⬡', roles: ['Admin'] },
//        { id: 'notices',   label: 'Notices',      icon: '◉', roles: ['Admin','Teacher','Student','Applicant'] },
//   c) Add cases to renderModule() in App.jsx:
//        case 'clearance':   return <ClearanceModule notify={notify} />;
//        case 'fees':        return <FeesModule notify={notify} />;
//        case 'docrequests': return <DocumentRequestModule notify={notify} />;
//        case 'bulkimport':  return <BulkImportModule notify={notify} />;
//        case 'notices':     return <NoticeBoardModule notify={notify} />;
//   d) Run the companion SQL below in Supabase to create the needed tables.
//
// ─── REQUIRED SQL (run once in Supabase SQL editor) ──────────────────────────
/*
  -- Clearance
  CREATE TABLE IF NOT EXISTS clearance (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid REFERENCES profiles(id),
    school_id   uuid REFERENCES schools(id),
    office      text NOT NULL,
    status      text DEFAULT 'Pending',  -- Pending | Cleared | Flagged
    cleared_by  text DEFAULT '',
    notes       text DEFAULT '',
    cleared_at  timestamptz,
    created_at  timestamptz DEFAULT now()
  );

  -- Fees / Payments
  CREATE TABLE IF NOT EXISTS fees (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid REFERENCES profiles(id),
    school_id   uuid REFERENCES schools(id),
    fee_type    text NOT NULL,
    amount      numeric NOT NULL DEFAULT 0,
    paid        numeric DEFAULT 0,
    due_date    date,
    status      text DEFAULT 'Unpaid',   -- Unpaid | Partial | Paid
    semester    text DEFAULT '',
    academic_year text DEFAULT '',
    created_at  timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS payments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_id      uuid REFERENCES fees(id),
    student_id  uuid REFERENCES profiles(id),
    amount      numeric NOT NULL,
    method      text DEFAULT 'Cash',
    reference   text DEFAULT '',
    recorded_by text DEFAULT '',
    paid_at     timestamptz DEFAULT now()
  );

  -- Document Requests
  CREATE TABLE IF NOT EXISTS document_requests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid REFERENCES profiles(id),
    school_id   uuid REFERENCES schools(id),
    doc_type    text NOT NULL,
    purpose     text DEFAULT '',
    copies      integer DEFAULT 1,
    status      text DEFAULT 'Pending',  -- Pending | Processing | Ready | Released
    notes       text DEFAULT '',
    requested_at timestamptz DEFAULT now(),
    ready_at    timestamptz,
    released_at timestamptz
  );

  -- Notices (distinct from announcements — public board, categorized)
  CREATE TABLE IF NOT EXISTS notices (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid REFERENCES schools(id),
    author_id   uuid REFERENCES profiles(id),
    author_name text DEFAULT '',
    title       text NOT NULL,
    body        text DEFAULT '',
    category    text DEFAULT 'General',  -- General | Academic | Events | Lost & Found | Jobs
    target      text DEFAULT 'All',
    pinned      boolean DEFAULT false,
    expires_at  date,
    date        date DEFAULT CURRENT_DATE,
    created_at  timestamptz DEFAULT now()
  );
*/
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { T } from '../lib/styles';
import { Field } from '../components/UI';
import {
  CLEARANCE_OFFICES, FEE_TYPES, PAYMENT_METHODS,
  DOC_TYPES, DOC_PURPOSES, CURRENT_AY, CURRENT_SEMESTER,
  COURSES, YEAR_LEVELS, SECTIONS, today,
} from '../lib/constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Pill({ bg, color, border, children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: bg, color, border: `1px solid ${border || 'transparent'}`,
    }}>{children}</span>
  );
}

function EmptyState({ icon = '◎', text }) {
  return (
    <div style={{ textAlign: 'center', color: '#bbb', padding: '3rem', fontSize: 13 }}>
      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      {text}
    </div>
  );
}

const STATUS_PILL = {
  Pending:    { bg: '#fff8ee', color: '#a05800',  border: '#fac77544' },
  Processing: { bg: '#eef4ff', color: '#0f3460',  border: '#b5d4f444' },
  Cleared:    { bg: '#eafaf1', color: '#1b4332',  border: '#2d6a4f44' },
  Flagged:    { bg: '#fff0f3', color: '#e94560',  border: '#e9456033' },
  Unpaid:     { bg: '#fff0f3', color: '#e94560',  border: '#e9456033' },
  Partial:    { bg: '#fff8ee', color: '#a05800',  border: '#fac77544' },
  Paid:       { bg: '#eafaf1', color: '#1b4332',  border: '#2d6a4f44' },
  Ready:      { bg: '#eeedfe', color: '#3c3489',  border: '#afa9ec44' },
  Released:   { bg: '#eafaf1', color: '#1b4332',  border: '#2d6a4f44' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLEARANCE MODULE
// ─────────────────────────────────────────────────────────────────────────────

export function ClearanceModule({ notify }) {
  const { profile, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(isAdmin ? null : profile?.id);
  const [clearance, setClearance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  // Load students list (admin) or self (student)
  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('id,name,email,course,year,section,avatar').eq('role', 'Student')
        .then(({ data }) => setStudents(data || []));
    } else {
      setSelectedStudent(profile?.id);
    }
  }, [isAdmin, profile]);

  // Load clearance for selected student
  useEffect(() => {
    if (!selectedStudent) return;
    setLoading(true);
    supabase.from('clearance').select('*').eq('student_id', selectedStudent)
      .then(({ data }) => {
        // Bootstrap missing offices
        const existing = (data || []).map(c => c.office);
        const missing = CLEARANCE_OFFICES.filter(o => !existing.includes(o));
        setClearance([
          ...(data || []),
          ...missing.map(office => ({ id: `pending-${office}`, student_id: selectedStudent, office, status: 'Pending', notes: '', cleared_by: '' })),
        ]);
        setLoading(false);
      });
  }, [selectedStudent]);

  const updateStatus = async (office, newStatus) => {
    if (!isAdmin) return;
    const rec = clearance.find(c => c.office === office);
    if (!rec) return;

    if (rec.id.startsWith('pending-')) {
      // Insert new record
      const { data, error } = await supabase.from('clearance').insert({
        student_id: selectedStudent,
        office,
        status: newStatus,
        cleared_by: profile?.name || 'Admin',
        cleared_at: newStatus === 'Cleared' ? new Date().toISOString() : null,
        school_id: profile?.school_id,
      }).select().maybeSingle();
      if (!error && data) {
        setClearance(p => p.map(c => c.office === office ? data : c));
        notify(`${office} marked as ${newStatus}.`);
      }
    } else {
      const { data, error } = await supabase.from('clearance').update({
        status: newStatus,
        cleared_by: profile?.name || 'Admin',
        cleared_at: newStatus === 'Cleared' ? new Date().toISOString() : null,
      }).eq('id', rec.id).select().maybeSingle();
      if (!error && data) {
        setClearance(p => p.map(c => c.id === rec.id ? data : c));
        notify(`${office} marked as ${newStatus}.`);
      }
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  const cleared = clearance.filter(c => c.status === 'Cleared').length;
  const total   = clearance.length;

  const selectedStudentData = students.find(s => s.id === selectedStudent) || profile;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Clearance</h2>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>
          {isAdmin ? 'Track and update clearance per student' : 'Your clearance status per office'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '280px 1fr' : '1fr', gap: 16 }}>
        {/* Student list (admin only) */}
        {isAdmin && (
          <div style={T.card}>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search student..."
              style={{ ...T.input, marginBottom: 12 }}
            />
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {filteredStudents.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px',
                    borderRadius: 10, cursor: 'pointer', marginBottom: 2,
                    background: selectedStudent === s.id ? '#f5f4f0' : 'transparent',
                    border: selectedStudent === s.id ? '1.5px solid #e8e6e0' : '1.5px solid transparent',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 50, background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0f3460', flexShrink: 0 }}>
                    {s.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{s.course} · {s.section || s.year}</div>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && <p style={{ color: '#bbb', fontSize: 13 }}>No students found.</p>}
            </div>
          </div>
        )}

        {/* Clearance detail */}
        <div>
          {!selectedStudent ? (
            <div style={T.card}><EmptyState text="Select a student to view clearance." /></div>
          ) : (
            <>
              {selectedStudentData && (
                <div style={{ ...T.card, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 50, background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#0f3460', flexShrink: 0 }}>
                    {selectedStudentData.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{selectedStudentData.name}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{selectedStudentData.course} · {selectedStudentData.section || selectedStudentData.year}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: cleared === total ? '#1b4332' : '#a05800' }}>{cleared}/{total}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>Offices Cleared</div>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div style={{ ...T.card, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 6 }}>
                  <span>Clearance Progress</span>
                  <span style={{ fontWeight: 700, color: cleared === total ? '#1b4332' : '#a05800' }}>{total > 0 ? Math.round(cleared / total * 100) : 0}%</span>
                </div>
                <div style={{ height: 8, background: '#f0efeb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${total > 0 ? (cleared / total) * 100 : 0}%`, background: cleared === total ? '#1b4332' : '#ef9f27', borderRadius: 4, transition: 'width 0.4s ease' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {clearance.map(c => {
                  const sp = STATUS_PILL[c.status] || STATUS_PILL['Pending'];
                  return (
                    <div key={c.office} style={{ ...T.card, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{c.office}</span>
                        <Pill bg={sp.bg} color={sp.color} border={sp.border}>{c.status}</Pill>
                      </div>
                      {c.cleared_by && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#aaa' }}>By: {c.cleared_by}</p>}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['Cleared', 'Pending', 'Flagged'].map(s => (
                            <button
                              key={s}
                              onClick={() => updateStatus(c.office, s)}
                              disabled={c.status === s}
                              style={{
                                ...T.btn(s === 'Cleared' ? 'success' : s === 'Flagged' ? 'danger' : 'ghost'),
                                padding: '4px 10px', fontSize: 11,
                                opacity: c.status === s ? 0.4 : 1,
                              }}
                            >{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. FEES MODULE
// ─────────────────────────────────────────────────────────────────────────────

export function FeesModule({ notify }) {
  const { profile, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(isAdmin ? null : profile?.id);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('ledger');
  const [modal, setModal] = useState(null);  // 'add-fee' | 'add-payment'
  const [searchQ, setSearchQ] = useState('');
  const [payForm, setPayForm] = useState({ fee_id: '', amount: '', method: 'Cash', reference: '' });
  const [feeForm, setFeeForm] = useState({ fee_type: 'Tuition', amount: '', due_date: '', semester: CURRENT_SEMESTER, academic_year: CURRENT_AY });

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('id,name,email,course,year,section,avatar').eq('role', 'Student')
        .then(({ data }) => setStudents(data || []));
    } else {
      setSelectedStudent(profile?.id);
    }
  }, [isAdmin, profile]);

  useEffect(() => {
    if (!selectedStudent) return;
    supabase.from('fees').select('*').eq('student_id', selectedStudent)
      .then(({ data }) => setFees(data || []));
    supabase.from('payments').select('*').eq('student_id', selectedStudent)
      .order('paid_at', { ascending: false })
      .then(({ data }) => setPayments(data || []));
  }, [selectedStudent]);

  const totalDue     = fees.reduce((s, f) => s + (+f.amount || 0), 0);
  const totalPaid    = fees.reduce((s, f) => s + (+f.paid    || 0), 0);
  const totalBalance = totalDue - totalPaid;

  const recordPayment = async () => {
    if (!payForm.fee_id || !payForm.amount) return;
    const fee = fees.find(f => f.id === payForm.fee_id);
    if (!fee) return;
    const amt = +payForm.amount;
    const newPaid = Math.min(+fee.amount, (+fee.paid || 0) + amt);
    const newStatus = newPaid >= +fee.amount ? 'Paid' : newPaid > 0 ? 'Partial' : 'Unpaid';

    // Insert payment record
    await supabase.from('payments').insert({
      fee_id: payForm.fee_id,
      student_id: selectedStudent,
      amount: amt,
      method: payForm.method,
      reference: payForm.reference,
      recorded_by: profile?.name || 'Admin',
    });

    // Update fee
    const { data } = await supabase.from('fees').update({ paid: newPaid, status: newStatus })
      .eq('id', payForm.fee_id).select().maybeSingle();
    if (data) setFees(p => p.map(f => f.id === data.id ? data : f));
    setPayments(p => [{
      id: Date.now(), fee_id: payForm.fee_id, student_id: selectedStudent,
      amount: amt, method: payForm.method, reference: payForm.reference,
      paid_at: new Date().toISOString(),
    }, ...p]);
    notify('Payment recorded.');
    setModal(null);
    setPayForm({ fee_id: '', amount: '', method: 'Cash', reference: '' });
  };

  const addFee = async () => {
    if (!feeForm.fee_type || !feeForm.amount || !selectedStudent) return;
    const { data } = await supabase.from('fees').insert({
      ...feeForm,
      student_id: selectedStudent,
      school_id: profile?.school_id,
      amount: +feeForm.amount,
      paid: 0,
      status: 'Unpaid',
    }).select().maybeSingle();
    if (data) { setFees(p => [...p, data]); notify('Fee added.'); }
    setModal(null);
    setFeeForm({ fee_type: 'Tuition', amount: '', due_date: '', semester: CURRENT_SEMESTER, academic_year: CURRENT_AY });
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Fees & Payments</h2>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>
          {isAdmin ? 'Manage student fee ledgers and record payments' : 'Your fee balance and payment history'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '280px 1fr' : '1fr', gap: 16 }}>
        {isAdmin && (
          <div style={T.card}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search student..." style={{ ...T.input, marginBottom: 12 }} />
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {filteredStudents.map(s => (
                <div key={s.id} onClick={() => setSelectedStudent(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', marginBottom: 2, background: selectedStudent === s.id ? '#f5f4f0' : 'transparent', border: selectedStudent === s.id ? '1.5px solid #e8e6e0' : '1.5px solid transparent' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 50, background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0f3460', flexShrink: 0 }}>{s.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>{s.course} · {s.year}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          {!selectedStudent ? (
            <div style={T.card}><EmptyState text="Select a student to view fees." /></div>
          ) : (
            <>
              {/* Balance summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
                {[
                  ['Total Due', `₱${totalDue.toLocaleString()}`, '#1a1a2e'],
                  ['Total Paid', `₱${totalPaid.toLocaleString()}`, '#1b4332'],
                  ['Balance', `₱${totalBalance.toLocaleString()}`, totalBalance > 0 ? '#e94560' : '#1b4332'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ ...T.card, padding: '1rem' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{k}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, background: '#f5f4f0', borderRadius: 10, padding: 4, marginBottom: 12, maxWidth: 360 }}>
                {['ledger', 'history'].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1a1a2e' : '#aaa' }}>
                    {t === 'ledger' ? 'Fee Ledger' : 'Payment History'}
                  </button>
                ))}
              </div>

              {tab === 'ledger' && (
                <div style={T.card}>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button onClick={() => setModal('add-fee')} style={{ ...T.btn('primary'), fontSize: 12, padding: '6px 14px' }}>+ Add Fee</button>
                      <button onClick={() => setModal('add-payment')} disabled={fees.length === 0} style={{ ...T.btn('success'), fontSize: 12, padding: '6px 14px', opacity: fees.length === 0 ? 0.5 : 1 }}>Record Payment</button>
                    </div>
                  )}
                  {fees.length === 0 ? <EmptyState text="No fees on record." /> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f0efeb' }}>
                          {['Type', 'Amount', 'Paid', 'Balance', 'Due Date', 'Semester', 'Status'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map(f => {
                          const balance = +f.amount - (+f.paid || 0);
                          const sp = STATUS_PILL[f.status] || STATUS_PILL['Unpaid'];
                          return (
                            <tr key={f.id} style={{ borderBottom: '1px solid #f9f8f5' }}>
                              <td style={{ padding: '10px 10px', fontWeight: 600 }}>{f.fee_type}</td>
                              <td style={{ padding: '10px 10px' }}>₱{(+f.amount).toLocaleString()}</td>
                              <td style={{ padding: '10px 10px', color: '#1b4332' }}>₱{(+f.paid || 0).toLocaleString()}</td>
                              <td style={{ padding: '10px 10px', color: balance > 0 ? '#e94560' : '#1b4332', fontWeight: 700 }}>₱{balance.toLocaleString()}</td>
                              <td style={{ padding: '10px 10px', color: '#888' }}>{f.due_date || '—'}</td>
                              <td style={{ padding: '10px 10px', color: '#888', fontSize: 11 }}>{f.semester}</td>
                              <td style={{ padding: '10px 10px' }}><Pill bg={sp.bg} color={sp.color} border={sp.border}>{f.status}</Pill></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div style={T.card}>
                  {payments.length === 0 ? <EmptyState text="No payment history yet." /> : payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f4f0' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{fees.find(f => f.id === p.fee_id)?.fee_type || 'Fee'}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{p.method} {p.reference ? `· Ref: ${p.reference}` : ''} · {new Date(p.paid_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1b4332' }}>₱{(+p.amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Fee Modal */}
      {modal === 'add-fee' && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...T.card, width: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 700 }}>Add Fee</h3>
            <Field label="Fee Type">
              <select style={{ ...T.select, width: '100%' }} value={feeForm.fee_type} onChange={e => setFeeForm(p => ({ ...p, fee_type: e.target.value }))}>
                {FEE_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Amount (₱)"><input style={T.input} type="number" value={feeForm.amount} onChange={e => setFeeForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></Field>
            <Field label="Due Date"><input style={T.input} type="date" value={feeForm.due_date} onChange={e => setFeeForm(p => ({ ...p, due_date: e.target.value }))} /></Field>
            <Field label="Semester">
              <select style={{ ...T.select, width: '100%' }} value={feeForm.semester} onChange={e => setFeeForm(p => ({ ...p, semester: e.target.value }))}>
                {['1st Semester', '2nd Semester'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={{ ...T.btn('ghost'), flex: 1 }}>Cancel</button>
              <button onClick={addFee} style={{ ...T.btn('primary'), flex: 1 }}>Add Fee</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {modal === 'add-payment' && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...T.card, width: 420 }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 700 }}>Record Payment</h3>
            <Field label="Apply to Fee">
              <select style={{ ...T.select, width: '100%' }} value={payForm.fee_id} onChange={e => setPayForm(p => ({ ...p, fee_id: e.target.value }))}>
                <option value="">— Select fee —</option>
                {fees.filter(f => f.status !== 'Paid').map(f => (
                  <option key={f.id} value={f.id}>{f.fee_type} (₱{(+f.amount - (+f.paid||0)).toLocaleString()} remaining)</option>
                ))}
              </select>
            </Field>
            <Field label="Amount Paid (₱)"><input style={T.input} type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></Field>
            <Field label="Payment Method">
              <select style={{ ...T.select, width: '100%' }} value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Reference / Receipt No."><input style={T.input} value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} placeholder="Optional" /></Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={{ ...T.btn('ghost'), flex: 1 }}>Cancel</button>
              <button onClick={recordPayment} style={{ ...T.btn('success'), flex: 1 }}>Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. DOCUMENT REQUEST MODULE
// ─────────────────────────────────────────────────────────────────────────────

const DOC_STATUS_FLOW = { Pending: 'Processing', Processing: 'Ready', Ready: 'Released' };

export function DocumentRequestModule({ notify }) {
  const { profile, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ doc_type: DOC_TYPES[0], purpose: DOC_PURPOSES[0], copies: 1, notes: '' });

  useEffect(() => {
    let q = supabase.from('document_requests').select('*, profiles(name,email,course,year,section)');
    if (!isAdmin) q = q.eq('student_id', profile?.id);
    q.order('requested_at', { ascending: false }).then(({ data }) => setRequests(data || []));
  }, [isAdmin, profile]);

  const submitRequest = async () => {
    if (!form.doc_type) return;
    const { data } = await supabase.from('document_requests').insert({
      student_id: profile?.id,
      school_id: profile?.school_id,
      ...form,
      status: 'Pending',
    }).select('*, profiles(name,email,course,year,section)').maybeSingle();
    if (data) { setRequests(p => [data, ...p]); notify('Document request submitted.'); }
    setModal(false);
    setForm({ doc_type: DOC_TYPES[0], purpose: DOC_PURPOSES[0], copies: 1, notes: '' });
  };

  const advanceStatus = async (req) => {
    const next = DOC_STATUS_FLOW[req.status];
    if (!next) return;
    const updates = {
      status: next,
      ...(next === 'Ready' ? { ready_at: new Date().toISOString() } : {}),
      ...(next === 'Released' ? { released_at: new Date().toISOString() } : {}),
    };
    const { data } = await supabase.from('document_requests').update(updates)
      .eq('id', req.id).select('*, profiles(name,email,course,year,section)').maybeSingle();
    if (data) { setRequests(p => p.map(r => r.id === data.id ? data : r)); notify(`Request marked as ${next}.`); }
  };

  const filtered = filterStatus === 'All' ? requests : requests.filter(r => r.status === filterStatus);

  const counts = { Pending: 0, Processing: 0, Ready: 0, Released: 0 };
  requests.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Document Requests</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>
            {isAdmin ? 'Process student document requests' : 'Request official school documents'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setModal(true)} style={{ ...T.btn('primary'), fontSize: 13 }}>+ Request Document</button>
        )}
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['All', 'Pending', 'Processing', 'Ready', 'Released'].map(s => {
          const sp = STATUS_PILL[s] || { bg: '#f5f4f0', color: '#888', border: '#e8e6e0' };
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              ...T.btn('ghost'), padding: '5px 14px', fontSize: 12, fontWeight: 700,
              background: filterStatus === s ? (s === 'All' ? '#1a1a2e' : sp.bg) : '#fff',
              color: filterStatus === s ? (s === 'All' ? '#fff' : sp.color) : '#888',
              borderColor: sp.border || '#e8e6e0',
            }}>
              {s} {s !== 'All' ? `(${counts[s] || 0})` : ''}
            </button>
          );
        })}
      </div>

      <div style={T.card}>
        {filtered.length === 0 ? <EmptyState text="No document requests found." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0efeb' }}>
                {[isAdmin && 'Student', 'Document', 'Purpose', 'Copies', 'Status', 'Requested', isAdmin && 'Action'].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const sp = STATUS_PILL[r.status] || STATUS_PILL['Pending'];
                const nextStatus = DOC_STATUS_FLOW[r.status];
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f9f8f5' }}>
                    {isAdmin && (
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.profiles?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{r.profiles?.course} · {r.profiles?.section || r.profiles?.year}</div>
                      </td>
                    )}
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.doc_type}</td>
                    <td style={{ padding: '10px 12px', color: '#888', fontSize: 12 }}>{r.purpose}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.copies}</td>
                    <td style={{ padding: '10px 12px' }}><Pill bg={sp.bg} color={sp.color} border={sp.border}>{r.status}</Pill></td>
                    <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 12 }}>{new Date(r.requested_at).toLocaleDateString()}</td>
                    {isAdmin && (
                      <td style={{ padding: '10px 12px' }}>
                        {nextStatus ? (
                          <button onClick={() => advanceStatus(r)} style={{ ...T.btn('primary'), padding: '4px 10px', fontSize: 11 }}>→ {nextStatus}</button>
                        ) : <span style={{ fontSize: 12, color: '#bbb' }}>—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Request Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...T.card, width: 460 }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 700 }}>Request Document</h3>
            <Field label="Document Type">
              <select style={{ ...T.select, width: '100%' }} value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))}>
                {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Purpose">
              <select style={{ ...T.select, width: '100%' }} value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}>
                {DOC_PURPOSES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Number of Copies">
              <input style={T.input} type="number" min={1} max={5} value={form.copies} onChange={e => setForm(p => ({ ...p, copies: +e.target.value }))} />
            </Field>
            <Field label="Additional Notes">
              <textarea style={{ ...T.input, height: 72, resize: 'vertical' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any special instructions..." />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModal(false)} style={{ ...T.btn('ghost'), flex: 1 }}>Cancel</button>
              <button onClick={submitRequest} style={{ ...T.btn('primary'), flex: 1 }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. BULK IMPORT MODULE (Admin only)
// ─────────────────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = [
  'name,email,role,course,year,section,contact,address',
  'Juan dela Cruz,juan2@school.edu,Student,BSIT,1st Year,BSIT-1A,09171234567,Manila',
  'Maria Santos,maria@school.edu,Student,BSCS,2nd Year,BSCS-2A,09181234567,Quezon City',
  'Dr. Elena Ramos,elena2@school.edu,Teacher,BSED,4th Year,None,09191234567,Makati',
].join('\n');

export function BulkImportModule({ notify }) {
  const { profile } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { setErrors(['CSV must have a header row and at least one data row.']); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['name', 'email', 'role', 'course', 'year'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) { setErrors([`Missing required columns: ${missing.join(', ')}`]); return; }

    const rows = [];
    const errs = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
      if (!row.name) { errs.push(`Row ${i + 1}: Missing name.`); continue; }
      if (!row.email || !row.email.includes('@')) { errs.push(`Row ${i + 1}: Invalid email.`); continue; }
      if (!['Admin', 'Teacher', 'Student', 'Applicant'].includes(row.role)) {
        errs.push(`Row ${i + 1}: Role must be Admin, Teacher, Student, or Applicant.`);
        continue;
      }
      rows.push({
        name: row.name,
        email: row.email,
        role: row.role,
        course: row.course || 'BSIT',
        year: row.year || '1st Year',
        section: row.section || 'None',
        contact: row.contact || '',
        address: row.address || '',
        avatar: row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        status: row.role === 'Applicant' ? 'Pending' : 'Active',
        school_id: profile?.school_id,
        joined: today(),
      });
    }
    setErrors(errs);
    setParsed(rows);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text) => {
    setCsvText(text);
    if (text.trim()) parseCSV(text);
    else { setParsed([]); setErrors([]); }
  };

  const runImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setResults(null);
    let success = 0, skipped = 0;

    for (const row of parsed) {
      // Check if email already exists
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', row.email).maybeSingle();
      if (existing) { skipped++; continue; }

      // We can't create auth users from the client without admin API.
      // Instead, we insert into profiles as a "pre-registered" record.
      // The user will need to register via AuthScreen with this email to activate.
      const { error } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(),  // temp ID — will be replaced on first auth sign-in via trigger
        ...row,
      });
      if (error) { skipped++; } else { success++; }
    }

    setResults({ success, skipped, total: parsed.length });
    if (success > 0) notify(`Imported ${success} user${success > 1 ? 's' : ''} successfully.`);
    setImporting(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Bulk User Import</h2>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>Import multiple users at once via CSV. Users will need to register via AuthScreen with their assigned email to activate login.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Input */}
        <div style={T.card}>
          <p style={T.label}>Upload CSV or Paste Data</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => fileRef.current.click()} style={{ ...T.btn('ghost'), fontSize: 12 }}>📁 Upload CSV</button>
            <button onClick={() => { setCsvText(CSV_TEMPLATE); parseCSV(CSV_TEMPLATE); }} style={{ ...T.btn('ghost'), fontSize: 12 }}>📋 Load Template</button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="import_template.csv" style={{ ...T.btn('ghost'), fontSize: 12, textDecoration: 'none' }}>⬇ Download Template</a>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
          <textarea
            value={csvText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Paste CSV data here or upload a file..."
            style={{ ...T.input, height: 240, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
          {errors.length > 0 && (
            <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff0f3', border: '1px solid #e9456033', borderRadius: 8 }}>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#e94560' }}>⚠ {e}</div>)}
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={T.card}>
          <p style={{ ...T.label, marginBottom: 12 }}>Preview — {parsed.length} valid row{parsed.length !== 1 ? 's' : ''}</p>
          {parsed.length === 0 ? (
            <EmptyState text="Paste CSV data or upload a file to preview." />
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0efeb' }}>
                    {['Name', 'Email', 'Role', 'Course', 'Year', 'Section'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f9f8f5' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '6px 8px', color: '#888' }}>{r.email}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#eef4ff', color: '#0f3460' }}>{r.role}</span>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#888' }}>{r.course}</td>
                      <td style={{ padding: '6px 8px', color: '#888' }}>{r.year}</td>
                      <td style={{ padding: '6px 8px', color: '#888' }}>{r.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: results.success > 0 ? '#eafaf1' : '#fff8ee', border: `1px solid ${results.success > 0 ? '#2d6a4f33' : '#fac77544'}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: results.success > 0 ? '#1b4332' : '#a05800' }}>
                Import complete: {results.success} added, {results.skipped} skipped (already exist or failed).
              </div>
            </div>
          )}

          <button
            onClick={runImport}
            disabled={parsed.length === 0 || importing}
            style={{ ...T.btn('primary'), width: '100%', opacity: parsed.length === 0 || importing ? 0.5 : 1 }}
          >
            {importing ? `Importing... (${parsed.length} rows)` : `Import ${parsed.length} User${parsed.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// 5. NOTICE BOARD MODULE
// ─────────────────────────────────────────────────────────────────────────────

const NOTICE_CATEGORIES = ['General', 'Academic', 'Events', 'Lost & Found', 'Jobs & Internships'];

const CAT_STYLE = {
  General:            { bg: '#f5f4f0', color: '#555',    border: '#e8e6e0' },
  Academic:           { bg: '#eef4ff', color: '#0f3460', border: '#b5d4f444' },
  Events:             { bg: '#eeedfe', color: '#3c3489', border: '#afa9ec44' },
  'Lost & Found':     { bg: '#fff8ee', color: '#a05800', border: '#fac77544' },
  'Jobs & Internships':{ bg: '#eafaf1', color: '#1b4332', border: '#2d6a4f33' },
};

export function NoticeBoardModule({ notify }) {
  const { profile, isAdmin, isTeacher } = useAuth();
  const canPost = isAdmin || isTeacher;
  const [notices, setNotices] = useState([]);
  const [filterCat, setFilterCat] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'General', target: 'All', pinned: false, expires_at: '' });

  useEffect(() => {
    let q = supabase.from('notices').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false });
    q.then(({ data }) => setNotices(data || []));
  }, []);

  const postNotice = async () => {
    if (!form.title.trim()) return;
    const { data } = await supabase.from('notices').insert({
      ...form,
      author_id: profile?.id,
      author_name: profile?.name,
      school_id: profile?.school_id,
      date: today(),
    }).select().maybeSingle();
    if (data) { setNotices(p => [data, ...p]); notify('Notice posted.'); }
    setModal(false);
    setForm({ title: '', body: '', category: 'General', target: 'All', pinned: false, expires_at: '' });
  };

  const togglePin = async (id, current) => {
    const { data } = await supabase.from('notices').update({ pinned: !current }).eq('id', id).select().maybeSingle();
    if (data) setNotices(p => p.map(n => n.id === id ? data : n).sort((a, b) => b.pinned - a.pinned || new Date(b.created_at) - new Date(a.created_at)));
  };

  const deleteNotice = async (id) => {
    await supabase.from('notices').delete().eq('id', id);
    setNotices(p => p.filter(n => n.id !== id));
    notify('Notice deleted.');
  };

  const filtered = notices.filter(n => {
    const mc = filterCat === 'All' || n.category === filterCat;
    const mq = !searchQ || n.title.toLowerCase().includes(searchQ.toLowerCase()) || n.body?.toLowerCase().includes(searchQ.toLowerCase());
    const notExpired = !n.expires_at || new Date(n.expires_at) >= new Date();
    return mc && mq && notExpired;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>Notice Board</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#aaa' }}>Community notices, events, lost & found, and opportunities</p>
        </div>
        {canPost && (
          <button onClick={() => setModal(true)} style={{ ...T.btn('primary'), fontSize: 13 }}>+ Post Notice</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search notices..." style={{ ...T.input, maxWidth: 220 }} />
        {['All', ...NOTICE_CATEGORIES].map(c => {
          const cs = CAT_STYLE[c] || { bg: '#f5f4f0', color: '#555', border: '#e8e6e0' };
          return (
            <button key={c} onClick={() => setFilterCat(c)} style={{
              ...T.btn('ghost'), padding: '5px 14px', fontSize: 12,
              background: filterCat === c ? (c === 'All' ? '#1a1a2e' : cs.bg) : '#fff',
              color: filterCat === c ? (c === 'All' ? '#fff' : cs.color) : '#888',
              borderColor: cs.border,
            }}>{c}</button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={T.card}><EmptyState icon="📋" text="No notices found." /></div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(n => {
            const cs = CAT_STYLE[n.category] || CAT_STYLE['General'];
            return (
              <div key={n.id} style={{ ...T.card, borderLeft: n.pinned ? '3px solid #1a1a2e' : '3px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      {n.pinned && <Pill bg="#f5f4f0" color="#1a1a2e" border="#e8e6e0">📌 Pinned</Pill>}
                      <Pill bg={cs.bg} color={cs.color} border={cs.border}>{n.category}</Pill>
                      {n.target !== 'All' && <Pill bg="#f5f4f0" color="#888" border="#e8e6e0">{n.target} only</Pill>}
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{n.title}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555', lineHeight: 1.6 }}>{n.body}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#aaa' }}>
                      <span>{n.author_name}</span>
                      <span>·</span>
                      <span>{n.date}</span>
                      {n.expires_at && <><span>·</span><span>Expires {n.expires_at}</span></>}
                    </div>
                  </div>
                  {canPost && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => togglePin(n.id, n.pinned)} style={{ ...T.btn('ghost'), padding: '4px 10px', fontSize: 11 }}>
                        {n.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      {isAdmin && (
                        <button onClick={() => deleteNotice(n.id)} style={{ ...T.btn('danger'), padding: '4px 10px', fontSize: 11 }}>Del</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Notice Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...T.card, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: 16, fontWeight: 700 }}>Post a Notice</h3>
            <Field label="Title"><input style={T.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Notice title..." /></Field>
            <Field label="Body">
              <textarea
                style={{ ...T.input, height: 100, resize: 'vertical' }}
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                placeholder="What's the notice about?"
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Category">
                <select style={{ ...T.select, width: '100%' }} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {NOTICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Visible To">
                <select style={{ ...T.select, width: '100%' }} value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}>
                  {['All', 'Students', 'Teachers'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Expiry Date (optional)"><input style={T.input} type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} /></Field>
            {isAdmin && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
                Pin this notice to the top
              </label>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(false)} style={{ ...T.btn('ghost'), flex: 1 }}>Cancel</button>
              <button onClick={postNotice} style={{ ...T.btn('primary'), flex: 1 }}>Post Notice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
