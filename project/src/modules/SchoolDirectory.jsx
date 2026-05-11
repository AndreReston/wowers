import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { T } from '../lib/styles';
import { SCHOOL_LEVELS, SCHOOL_TYPES, LEVEL_META } from '../lib/constants';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function Badge({ children, bg = '#eef4ff', color = '#0f3460', border = '#b5d4f4' }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: bg, color, border: `1px solid ${border}`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

function StatusDot({ open, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: open ? '#22c55e' : '#d1d5db', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: open ? '#15803d' : '#9ca3af', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ─── SCHOOL CARD ──────────────────────────────────────────────────────────────

function SchoolCard({ school, onClick }) {
  const lm = LEVEL_META[school.level] || LEVEL_META['College'];
  return (
    <div
      onClick={() => onClick(school)}
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e8e6e0',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'box-shadow 0.18s, transform 0.18s',
        boxShadow: '0 1px 4px #00000008',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px #00000014'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px #00000008'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Cover */}
      <div style={{ height: 140, background: school.cover_url ? `url(${school.cover_url}) center/cover no-repeat` : lm.gradient, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        {/* Logo */}
        <div style={{
          position: 'absolute', bottom: -20, left: 16,
          width: 44, height: 44, borderRadius: 10,
          background: school.logo_url ? `url(${school.logo_url}) center/cover` : '#fff',
          border: '2.5px solid #fff', boxShadow: '0 2px 8px #00000020',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {!school.logo_url && lm.icon}
        </div>
        {/* Status badges top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {school.enrollment_open && <Badge bg='#dcfce7' color='#15803d' border='#86efac'>Enrollment Open</Badge>}
          {school.hiring_open    && <Badge bg='#fef9c3' color='#854d0e' border='#fde047'>Now Hiring</Badge>}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 16px 16px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <Badge bg={lm.bg} color={lm.color} border={lm.border}>{school.level}</Badge>
          <Badge bg='#f1efea' color='#555' border='#d1cfc8'>{school.school_type}</Badge>
        </div>
        <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{school.name}</p>
        {school.tagline && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#888', lineHeight: 1.4 }}>{school.tagline}</p>}
        {(school.city || school.province) && (
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#aaa' }}>
            📍 {[school.city, school.province].filter(Boolean).join(', ')}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <StatusDot open={school.enrollment_open} label='Enrollment' />
          <StatusDot open={school.hiring_open}     label='Hiring' />
        </div>
      </div>
    </div>
  );
}

// ─── SCHOOL TOUR (detail view) ────────────────────────────────────────────────

function SchoolTour({ school, onBack, onApply }) {
  const [tab, setTab] = useState('about');
  const lm = LEVEL_META[school.level] || LEVEL_META['College'];
  const gallery = Array.isArray(school.gallery) ? school.gallery : [];
  const facilities = Array.isArray(school.facilities) ? school.facilities : [];
  const programs = Array.isArray(school.programs) ? school.programs : [];
  const [galleryIdx, setGalleryIdx] = useState(0);

  const tabs = [
    { id: 'about',      label: '🏫 About'      },
    { id: 'programs',   label: '📚 Programs'    },
    { id: 'facilities', label: '🏛 Facilities'  },
    { id: 'gallery',    label: '🖼 Gallery'     },
    { id: 'contact',    label: '📞 Contact'     },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={onBack} style={{ ...T.btn('ghost'), marginBottom: '1rem', fontSize: 12, padding: '6px 14px' }}>
        ← Back to Directory
      </button>

      {/* Hero */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', marginBottom: '1.5rem',
        background: school.cover_url ? `url(${school.cover_url}) center/cover no-repeat` : lm.gradient,
        minHeight: 260, position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,15,40,0.85) 0%, rgba(15,15,40,0.2) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 14,
              background: school.logo_url ? `url(${school.logo_url}) center/cover` : 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0,
            }}>
              {!school.logo_url && lm.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <Badge bg='rgba(255,255,255,0.15)' color='#fff' border='rgba(255,255,255,0.3)'>{school.level}</Badge>
                <Badge bg='rgba(255,255,255,0.15)' color='#fff' border='rgba(255,255,255,0.3)'>{school.school_type}</Badge>
                {school.enrollment_open && <Badge bg='#dcfce7' color='#15803d' border='#86efac'>Enrollment Open</Badge>}
                {school.hiring_open    && <Badge bg='#fef9c3' color='#854d0e' border='#fde047'>Now Hiring</Badge>}
              </div>
              <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: "'Fraunces', Georgia, serif", lineHeight: 1.2 }}>{school.name}</h1>
              {school.tagline && <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{school.tagline}</p>}
              {(school.city || school.province) && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  📍 {[school.address, school.city, school.province, school.region].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA bar */}
      {(school.enrollment_open || school.hiring_open) && (
        <div style={{ ...T.card, marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {school.enrollment_open && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>🎓 Enrollment is Open</p>
              {school.enrollment_note && <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{school.enrollment_note}</p>}
            </div>
          )}
          {school.hiring_open && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#854d0e' }}>💼 We're Hiring</p>
              {school.hiring_note && <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{school.hiring_note}</p>}
            </div>
          )}
          {school.enrollment_open && (
            <button onClick={() => onApply(school)} style={{ ...T.btn('success'), whiteSpace: 'nowrap' }}>
              Apply / Enroll →
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#f5f4f0', borderRadius: 12, padding: 4, marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, minWidth: 90, padding: '8px 12px', borderRadius: 9, border: 'none',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            background: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? '#1a1a2e' : '#888',
            boxShadow: tab === t.id ? '0 1px 4px #00000012' : 'none',
            whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'about' && (
        <div style={T.card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>About {school.name}</h3>
          {school.description
            ? <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.8 }}>{school.description}</p>
            : <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>No description provided yet.</p>
          }
        </div>
      )}

      {tab === 'programs' && (
        <div style={T.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Programs Offered</h3>
          {programs.length === 0
            ? <p style={{ color: '#aaa', fontSize: 13 }}>No programs listed yet.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {programs.map((p, i) => (
                  <div key={i} style={{ background: '#f9f8f5', borderRadius: 10, padding: '12px 16px', border: '1px solid #eeece6' }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>📖</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{typeof p === 'string' ? p : p.name}</div>
                    {typeof p === 'object' && p.desc && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{p.desc}</div>}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {tab === 'facilities' && (
        <div style={T.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Facilities & Amenities</h3>
          {facilities.length === 0
            ? <p style={{ color: '#aaa', fontSize: 13 }}>No facilities listed yet.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {facilities.map((f, i) => (
                  <div key={i} style={{ background: '#f9f8f5', borderRadius: 12, padding: '16px', border: '1px solid #eeece6', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon || '🏢'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{f.label}</div>
                    {f.desc && <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{f.desc}</div>}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {tab === 'gallery' && (
        <div style={T.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Photo Gallery</h3>
          {gallery.length === 0
            ? <p style={{ color: '#aaa', fontSize: 13 }}>No photos uploaded yet.</p>
            : (
              <div>
                {/* Main viewer */}
                <div style={{
                  width: '100%', height: 340, borderRadius: 12, overflow: 'hidden',
                  background: `url(${gallery[galleryIdx]}) center/cover no-repeat #f5f4f0`,
                  marginBottom: 12, border: '1px solid #e8e6e0',
                }} />
                {/* Thumbnails */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {gallery.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      style={{
                        width: 80, height: 60, flexShrink: 0, borderRadius: 8, cursor: 'pointer',
                        background: `url(${url}) center/cover no-repeat #f5f4f0`,
                        border: i === galleryIdx ? '2.5px solid #1a1a2e' : '2.5px solid transparent',
                        opacity: i === galleryIdx ? 1 : 0.65,
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          }
        </div>
      )}

      {tab === 'contact' && (
        <div style={T.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Contact & Location</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {school.address  && <ContactRow icon='📍' label='Address'  val={[school.address, school.city, school.province, school.region].filter(Boolean).join(', ')} />}
            {school.email    && <ContactRow icon='✉️'  label='Email'    val={school.email}   href={`mailto:${school.email}`} />}
            {school.phone    && <ContactRow icon='📞' label='Phone'    val={school.phone}   href={`tel:${school.phone}`} />}
            {school.website  && <ContactRow icon='🌐' label='Website'  val={school.website} href={school.website} />}
            {school.facebook && <ContactRow icon='📘' label='Facebook' val={school.facebook} href={school.facebook} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactRow({ icon, label, val, href }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f4f0' }}>
      <span style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 1 }}>{label}</div>
        {href
          ? <a href={href} target='_blank' rel='noreferrer' style={{ fontSize: 13, color: '#1565c0', textDecoration: 'none' }}>{val}</a>
          : <div style={{ fontSize: 13, color: '#333' }}>{val}</div>
        }
      </div>
    </div>
  );
}

// ─── MAIN DIRECTORY COMPONENT ─────────────────────────────────────────────────

export default function SchoolDirectory({ onApply, onCreateSchool, currentUser }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');  // All | Enrolling | Hiring

  useEffect(() => {
    supabase.from('schools').select('*').eq('is_published', true).then(({ data }) => {
      setSchools(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = schools.filter(s => {
    const mq = s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
               (s.city || '').toLowerCase().includes(searchQ.toLowerCase()) ||
               (s.tagline || '').toLowerCase().includes(searchQ.toLowerCase());
    const ml = filterLevel === 'All' || s.level === filterLevel;
    const ms = filterStatus === 'All' ||
               (filterStatus === 'Enrolling' && s.enrollment_open) ||
               (filterStatus === 'Hiring' && s.hiring_open);
    return mq && ml && ms;
  });

  if (selected) {
    return <SchoolTour school={selected} onBack={() => setSelected(null)} onApply={onApply} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '0 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <div style={{ fontSize: 18, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1a1a2e', flex: 1 }}>
            SchoolOS <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', fontFamily: 'inherit' }}>Directory</span>
          </div>
          {onCreateSchool && (
            <button onClick={onCreateSchool} style={{ ...T.btn('ghost'), fontSize: 12, padding: '6px 14px' }}>
              + Register Your School
            </button>
          )}
          {currentUser ? (
            <button onClick={() => window.location.reload()} style={{ ...T.btn('primary'), fontSize: 12, padding: '6px 14px' }}>
              Go to Dashboard
            </button>
          ) : (
            <button onClick={onApply} style={{ ...T.btn('primary'), fontSize: 12, padding: '6px 14px' }}>
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 60%, #1b4332 100%)',
        padding: '3rem 2rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>School Directory</p>
          <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, color: '#fff', fontFamily: "'Fraunces', Georgia, serif", lineHeight: 1.2 }}>
            Find Your School
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            Browse schools, explore programs, check enrollment & hiring status, and take a virtual tour — all in one place.
          </p>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: 480, margin: '0 auto' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#aaa', pointerEvents: 'none' }}>🔍</span>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search by school name, city, or keyword…"
              style={{ ...T.input, paddingLeft: 40, borderRadius: 12, fontSize: 14, border: 'none', boxShadow: '0 4px 20px #00000020' }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '0.75rem 2rem', overflowX: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4 }}>Level:</span>
          {['All', ...SCHOOL_LEVELS].map(l => (
            <button key={l} onClick={() => setFilterLevel(l)} style={{
              ...T.btn(filterLevel === l ? 'primary' : 'ghost'),
              padding: '5px 12px', fontSize: 11, borderRadius: 20,
            }}>{l}</button>
          ))}
          <div style={{ width: 1, height: 20, background: '#e8e6e0', margin: '0 4px' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4 }}>Status:</span>
          {[['All', 'All'], ['Enrolling', 'Enrolling'], ['Hiring', 'Hiring']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterStatus(val)} style={{
              ...T.btn(filterStatus === val ? 'primary' : 'ghost'),
              padding: '5px 12px', fontSize: 11, borderRadius: 20,
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            {loading ? 'Loading schools…' : `${filtered.length} school${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>Loading directory…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...T.card, textAlign: 'center', padding: '4rem', color: '#aaa' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏫</div>
            <p style={{ margin: 0, fontSize: 14 }}>No schools match your search.</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Try a different keyword or filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filtered.map(s => (
              <SchoolCard key={s.id} school={s} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
