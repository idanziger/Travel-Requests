import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, FilePlus2, Luggage, LogOut, Settings, Stamp } from 'lucide-react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import Events from './pages/Events';
import SettingsPage from './pages/Settings';
import { SsvLogo } from './components/SsvLogo';
import { API_BASE_URL } from './config';
import type { AuthUser } from './types';

const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const logout = async () => {
    await axios.post('/auth/logout');
    setUser(null);
  };

  return { user, loading, refreshUser, logout };
};

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.47a5.54 5.54 0 0 1-2.4 3.64v2.97h3.88c2.27-2.09 3.57-5.17 3.57-8.63z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-2.97c-1.08.72-2.45 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.95H1.26v3.06A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.32a7.2 7.2 0 0 1 0-4.64V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.06z" />
      <path fill="#EA4335" d="M12 4.73c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.55 11.55 0 0 0 12 0 12 12 0 0 0 1.26 6.62l4.01 3.06C6.22 6.84 8.87 4.73 12 4.73z" />
    </svg>
  );
}

function LandingPage() {
  const [descending, setDescending] = useState(false);
  const authUrl = `${API_BASE_URL}/auth/google`;

  const continueWithGoogle = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      window.location.href = authUrl;
      return;
    }

    setDescending(true);
    window.setTimeout(() => {
      window.location.href = authUrl;
    }, 1150);
  };

  return (
    <div className={`relative h-screen w-full overflow-hidden bg-[#CFE7F2] text-ink ${descending ? 'login-descent' : ''}`}>
      {/* full-screen sky */}
      <div className="login-sky-plane login-sky absolute inset-0 origin-center" />

      {/* drifting clouds */}
      <div className="login-sky-plane absolute inset-0 origin-center">
        <div className="cloud-blob animate-cloud-drift absolute left-[-6%] top-[18%] h-[11vh] w-[30vw] rounded-full bg-white/90 blur-2xl" />
        <div className="cloud-blob animate-cloud-drift-slow absolute left-[40%] top-[11%] h-[13vh] w-[36vw] rounded-full bg-white/80 blur-3xl" />
        <div className="cloud-blob animate-cloud-drift absolute left-[70%] top-[30%] h-[10vh] w-[26vw] rounded-full bg-white/80 blur-2xl" />
        <div className="cloud-blob animate-cloud-drift-slow absolute left-[8%] top-[62%] h-[12vh] w-[32vw] rounded-full bg-white/70 blur-3xl" />
        <div className="cloud-blob animate-cloud-drift absolute left-[58%] top-[72%] h-[11vh] w-[28vw] rounded-full bg-white/65 blur-3xl" />
      </div>

      {/* top sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,.22),rgba(255,255,255,0)_32%)]" />

      {/* brand mark — top left */}
      <div className="absolute left-6 top-7 flex items-center gap-3.5 sm:left-11 sm:top-9">
        <SsvLogo className="h-[30px] sm:h-[34px]" />
        <span className="h-5 w-px bg-[rgba(3,58,93,.22)]" />
        <span className="font-mono-ui text-[11px] uppercase tracking-[.2em] text-[#3f5a6b]">Travel</span>
      </div>

      {/* boarding pass — centered */}
      <div className="absolute left-1/2 top-1/2 w-[468px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-[18px] border border-[rgba(44,40,31,.07)] bg-[#FCFAF5] p-7 shadow-[0_40px_80px_-30px_rgba(40,33,24,.5),0_8px_22px_-10px_rgba(40,33,24,.3)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-[9px] w-[9px] rotate-45 rounded-[1px] bg-gold" />
              <span className="text-[15px] font-semibold tracking-[.01em] text-ink">SSV Labs</span>
            </div>
            <span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Boarding</span>
          </div>

          <div className="mt-5 flex items-end justify-between gap-6">
            <h1 className="font-display text-[34px] leading-[1.05] text-ink">Clear skies<br />ahead<span className="text-gold">.</span></h1>
            <p className="max-w-[172px] pb-1 text-sm leading-[1.55] text-muted">Sign in with your SSV Labs account to start a new request.</p>
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            className="mt-6 flex h-[50px] w-full items-center justify-center gap-3 rounded-button border border-[#E4DCCE] bg-white text-[15px] font-medium text-ink shadow-card transition duration-150 ease-window hover:border-[#d8cfbd] hover:bg-[#F4EFE6] focus:outline-none focus:ring-4 focus:ring-[rgba(47,111,153,.16)]"
          >
            <GoogleLogo />
            Continue with Google
          </button>

          <div className="mt-[22px] border-t border-dashed border-[rgba(44,40,31,.18)]" />
          <div className="mt-3.5 flex justify-between font-mono-ui text-[10px] uppercase tracking-[.14em] text-placeholder">
            <span>Window Seat</span>
            <span>SSV Labs · Travel</span>
          </div>
        </div>
      </div>

      {/* descent whiteout */}
      <div className="whiteout invisible absolute inset-0 z-20 flex items-center justify-center bg-white/95 opacity-0">
        <div className="text-center">
          <p className="eyebrow text-gold-deep">Welcome aboard</p>
          <p className="mt-3 font-display text-4xl text-ink">Preparing your dashboard…</p>
        </div>
      </div>
    </div>
  );
}

function AuthCallbackPage({ refreshUser }: { refreshUser: () => Promise<void> }) {
  const navigate = useNavigate();

  useEffect(() => {
    const complete = async () => {
      await refreshUser();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => navigate('/dashboard', { replace: true }), prefersReducedMotion ? 100 : 1500);
    };

    void complete();
  }, [navigate, refreshUser]);

  // The "landing" — after Google sign-in we descend through the clouds into the app.
  return (
    <div className="login-sky login-descent relative min-h-screen overflow-hidden text-ink">
      <div className="login-sky-plane absolute inset-0 origin-center">
        <div className="cloud-blob absolute left-[10%] top-[18%] h-28 w-72 rounded-full bg-white/60 blur-2xl" />
        <div className="cloud-blob absolute right-[12%] top-[26%] h-24 w-64 rounded-full bg-white/50 blur-2xl" />
        <div className="cloud-blob absolute bottom-[24%] left-[20%] h-24 w-72 rounded-full bg-white/45 blur-2xl" />
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center text-center">
        <div>
          <p className="eyebrow text-gold-deep">Arriving</p>
          <p className="mt-3 font-display text-5xl text-ink">Welcome aboard.</p>
          <p className="mt-3 text-muted">Preparing your dashboard…</p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({
  user,
  loading,
  children,
}: {
  user: AuthUser | null;
  loading: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return <div className="min-h-screen canvas-tint" />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const initialsFor = (name: string, email: string) => {
  const source = name.trim() || email.split('@')[0] || 'U';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const roleLabel = (role: AuthUser['role']) => {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Submitter';
  return 'Traveler';
};

function AppShell({ user, logout }: { user: AuthUser; logout: () => Promise<void> }) {
  const canSubmit = user.role === 'admin' || user.role === 'manager';
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('travel-nav-collapsed') === '1'
  );
  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('travel-nav-collapsed', next ? '1' : '0');
      return next;
    });

  const navItems = useMemo(() => {
    if (user.role === 'admin') {
      return [
        { to: '/dashboard', label: 'Approvals', icon: Stamp },
        { to: '/new', label: 'New request', icon: FilePlus2 },
        { to: '/events', label: 'Events', icon: CalendarDays },
        { to: '/settings', label: 'Settings', icon: Settings },
      ];
    }

    if (user.role === 'manager') {
      return [
        { to: '/dashboard', label: 'My requests', icon: Stamp },
        { to: '/new', label: 'New request', icon: FilePlus2 },
      ];
    }

    return [{ to: '/dashboard', label: 'My trips', icon: Luggage }];
  }, [user.role]);

  return (
    <div className="min-h-screen bg-sand text-ink">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={`flex w-full flex-col border-b border-[rgba(44,40,31,.08)] bg-linen px-4 py-5 transition-[width] duration-200 ease-window lg:fixed lg:inset-y-0 lg:border-b-0 lg:border-r lg:py-6 ${
            collapsed ? 'lg:w-[74px] lg:px-3' : 'lg:w-[248px] lg:px-5'
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
              {collapsed ? (
                <span className="diamond shrink-0" style={{ width: 14, height: 14 }} />
              ) : (
                <>
                  <SsvLogo className="h-[26px]" />
                  <span className="h-[18px] w-px bg-[rgba(3,58,93,.2)]" />
                  <span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-[#3f5a6b]">Travel</span>
                </>
              )}
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-button text-faint transition duration-150 ease-window hover:bg-shell hover:text-ink lg:flex"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="mt-7 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex min-w-fit items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium transition duration-150 ease-window ${
                    collapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${isActive ? 'bg-sand text-ink' : 'text-muted hover:bg-shell/60 hover:text-ink'}`
                }
              >
                {({ isActive }) =>
                  collapsed ? (
                    <item.icon size={18} className={`shrink-0 ${isActive ? 'text-ink' : 'text-faint'}`} />
                  ) : (
                    <>
                      <span
                        className="h-[7px] w-[7px] shrink-0 rotate-45 rounded-[2px]"
                        style={{ background: isActive ? '#D99A4E' : '#cfc5b4' }}
                      />
                      <span className="flex-1">{item.label}</span>
                    </>
                  )
                }
              </NavLink>
            ))}
          </nav>

          <div
            className={`mt-5 flex items-center gap-3 rounded-card border border-[rgba(44,40,31,.08)] bg-shell p-3 lg:mt-auto ${
              collapsed ? 'lg:flex-col lg:gap-2 lg:p-2' : 'justify-between'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-tint font-mono-ui text-xs font-medium uppercase tracking-[.1em] text-sky">
                {initialsFor(user.name, user.email)}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                  <p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-faint">{roleLabel(user.role)}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Log out"
              className="shrink-0 rounded-button border border-[rgba(44,40,31,.08)] bg-white p-2 text-muted transition duration-150 ease-window hover:border-[rgba(168,105,78,.24)] hover:text-[#A8694E]"
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>

        <main
          className={`canvas-tint min-h-screen flex-1 px-5 py-6 transition-[margin] duration-200 ease-window lg:px-8 lg:py-8 ${
            collapsed ? 'lg:ml-[74px]' : 'lg:ml-[248px]'
          }`}
        >
          <Routes>
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/new" element={canSubmit ? <NewRequest user={user} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/events" element={user.role === 'admin' ? <Events /> : <Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={user.role === 'admin' ? <SettingsPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, refreshUser, logout } = useAuth();

  return (
    <Routes>
      <Route path="/" element={loading ? <div className="min-h-screen canvas-tint" /> : user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage refreshUser={refreshUser} />} />
      <Route path="/*" element={<ProtectedRoute user={user} loading={loading}>{user ? <AppShell user={user} logout={logout} /> : null}</ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return <Router><AppContent /></Router>;
}

export default App;
