import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { T } from './lib/styles';
import { ROLE_META } from './lib/constants';
import { Notification } from './components/UI';
import AuthScreen from './modules/AuthScreen';
import SchoolDirectory from './modules/SchoolDirectory';
import SchoolAdmin from './modules/SchoolAdmin';
import {
  AdminDashboard, StudentDashboard,
  UsersModule, RoomsModule, EnrollmentModule,
  ScheduleModule, GradebookModule, AttendanceModule,
  LibraryModule, AnnouncementsModule, ProfileModule, SearchModule,
} from './modules/Modules';
import {
  ClearanceModule, FeesModule, DocumentRequestModule,
  BulkImportModule, NoticeBoardModule,
} from './modules/ExtraModules';
const NAV = [
  { id: 'dashboard',     label: 'Dashboard',    icon: '⬡', roles: ['Admin', 'Teacher', 'Student', 'Applicant'] },
  { id: 'users',         label: 'Users',         icon: '◈', roles: ['Admin'] },
  { id: 'enrollment',    label: 'Enrollment',    icon: '◎', roles: ['Admin', 'Applicant'] },
  { id: 'schedule',      label: 'Schedule',      icon: '◫', roles: ['Admin', 'Teacher', 'Student'] },
  { id: 'gradebook',     label: 'Gradebook',     icon: '▣', roles: ['Admin', 'Teacher', 'Student'] },
  { id: 'attendance',    label: 'Attendance',    icon: '◉', roles: ['Admin', 'Teacher', 'Student'] },
  { id: 'rooms',         label: 'Rooms',         icon: '⬡', roles: ['Admin'] },
  { id: 'library',       label: 'Library',       icon: '▣', roles: ['Admin', 'Teacher', 'Student'] },
  { id: 'announcements', label: 'Announcements', icon: '◈', roles: ['Admin', 'Teacher', 'Student'] },
  { id: 'search',        label: 'Search',        icon: '◈', roles: ['Admin', 'Teacher', 'Student'] },
  { id: 'school',        label: 'My School',     icon: '🏫', roles: ['Admin'] },
  { id: 'directory',     label: 'Directory',     icon: '🌐', roles: ['Admin', 'Teacher', 'Student', 'Applicant'] },
  { id: 'profile',       label: 'Profile',       icon: '◎', roles: ['Admin', 'Teacher', 'Student', 'Applicant'] },
  { id: 'clearance',   label: 'Clearance',    icon: '✔', roles: ['Admin', 'Student'] },
  { id: 'fees',        label: 'Fees',          icon: '◈', roles: ['Admin', 'Student'] },
  { id: 'docrequests', label: 'Doc Requests',  icon: '▣', roles: ['Admin', 'Student'] },
  { id: 'bulkimport',  label: 'Bulk Import',   icon: '⬡', roles: ['Admin'] },
  { id: 'notices',     label: 'Notice Board',  icon: '◉', roles: ['Admin', 'Teacher', 'Student', 'Applicant'] },
];

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return mobile;
}

// ─── APP SHELL (authenticated) ────────────────────────────────────────────────

function AppShell() {
  const { user, profile, loading, signOut } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [note, setNote] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Show directory or auth screen state for unauthenticated users
  const [showAuth, setShowAuth] = useState(false);
  const mobile = useIsMobile();

  const notify = (msg, type = 'success') => {
    setNote({ msg, type });
    setTimeout(() => setNote(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ ...T.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: 28, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>SchoolOS</div>
          <p style={{ fontSize: 13 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // ── Not logged in: show directory (default) or auth screen ────────────────
  if (!user || !profile) {
    if (showAuth) return <AuthScreen onBack={() => setShowAuth(false)} />;
    return (
      <SchoolDirectory
        onApply={() => setShowAuth(true)}
        onCreateSchool={() => setShowAuth(true)}
        currentUser={null}
      />
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  const role = profile.role || 'Student';
  const visibleNav = NAV.filter(n => n.roles.includes(role));
  const meta = ROLE_META[role];

  const navigate = (id) => { setPage(id); setDrawerOpen(false); };

  const renderModule = () => {
    switch (page) {
      case 'dashboard':
        return role === 'Admin' || role === 'Teacher' ? <AdminDashboard /> : <StudentDashboard />;
      case 'users':         return <UsersModule notify={notify} />;
      case 'enrollment':    return <EnrollmentModule notify={notify} />;
      case 'schedule':      return <ScheduleModule notify={notify} />;
      case 'gradebook':     return <GradebookModule notify={notify} />;
      case 'attendance':    return <AttendanceModule notify={notify} />;
      case 'rooms':         return <RoomsModule notify={notify} />;
      case 'library':       return <LibraryModule notify={notify} />;
      case 'announcements': return <AnnouncementsModule notify={notify} />;
      case 'search':        return <SearchModule />;
      case 'school':        return <SchoolAdmin notify={notify} />;
      case 'profile':       return <ProfileModule notify={notify} />;
      case 'clearance':   return <ClearanceModule notify={notify} />;
      case 'fees':        return <FeesModule notify={notify} />;
      case 'docrequests': return <DocumentRequestModule notify={notify} />;
      case 'bulkimport':  return <BulkImportModule notify={notify} />;
      case 'notices':     return <NoticeBoardModule notify={notify} />;
      case 'directory':
        return (
          <SchoolDirectory
            onApply={() => navigate('enrollment')}
            currentUser={user}
          />
        );
      default: return <AdminDashboard />;
    }
  };

  const sidebar = (
    <nav style={{
      ...T.sideNav,
      ...(mobile ? {
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 1100,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
      } : {}),
    }}>
      <div style={{ padding: '0 20px', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1a1a2e' }}>SchoolOS</div>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#aaa' }}>Integrated School Management</p>
      </div>

      <div style={{ flex: 1 }}>
        {visibleNav.map(n => (
          <div key={n.id} onClick={() => navigate(n.id)} style={T.navItem(page === n.id)}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '1rem 20px', borderTop: '1px solid #e8e6e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 50, background: meta.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, fontWeight: 700, fontSize: 13 }}>
            {profile.avatar || profile.name?.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{role}</div>
          </div>
        </div>
        <button onClick={signOut} style={{ ...T.btn('ghost'), width: '100%', fontSize: 12, padding: '6px 12px' }}>Sign Out</button>
      </div>
    </nav>
  );

  // Directory page renders full-width (no sidebar)
  if (page === 'directory') {
    return (
      <div style={T.root}>
        <Notification note={note} />
        <SchoolDirectory
          onApply={() => navigate('enrollment')}
          onBack={() => navigate('dashboard')}
          currentUser={user}
          onGoBack={() => navigate('dashboard')}
        />
      </div>
    );
  }

  return (
    <div style={T.root}>
      <Notification note={note} />

      {mobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: '#00000055', zIndex: 1099 }} />
      )}

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {sidebar}

        <main style={{ flex: 1, padding: mobile ? '1rem' : '1.5rem', overflowY: 'auto', maxHeight: '100vh' }}>
          {mobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <button onClick={() => setDrawerOpen(true)}
                style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                &#9776;
              </button>
              <div style={{ fontSize: 16, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, color: '#1a1a2e' }}>SchoolOS</div>
              <div style={{ flex: 1 }} />
              <div style={{ width: 32, height: 32, borderRadius: 50, background: meta.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, fontWeight: 700, fontSize: 12 }}>
                {profile.avatar || profile.name?.charAt(0)}
              </div>
            </div>
          )}

          {renderModule()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}