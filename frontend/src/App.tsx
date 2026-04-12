import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Cog, LogOut, ShieldCheck, Sparkles, Users } from 'lucide-react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import Settings from './pages/Settings';
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

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06101d] text-slate-100 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(66,191,248,0.16),_transparent_38%),radial-gradient(circle_at_80%_20%,_rgba(104,132,255,0.16),_transparent_32%),linear-gradient(180deg,_#071120_0%,_#040811_100%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
      <div className="relative min-h-screen">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8 md:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 shadow-[0_18px_40px_rgba(66,191,248,0.14)]">
              <Building2 className="text-cyan-300" size={22} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.4em] text-cyan-200/70">SSV Labs</div>
              <div className="text-lg font-semibold text-white">Travel Desk</div>
            </div>
          </div>
          <a href={`${API_BASE_URL}/auth/google`} className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-xs font-black uppercase tracking-[0.28em] text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/10">
            Sign In With Google
          </a>
        </header>

        <main className="mx-auto grid max-w-7xl gap-14 px-6 pb-16 pt-4 md:grid-cols-[1.2fr_0.9fr] md:px-10 md:pb-24 md:pt-12">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
              <Sparkles size={14} />
              Internal Executive Operations
            </div>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] text-white md:text-7xl" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>
                Travel approvals aligned to your live Monday workflow.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Google-authenticated managers can submit requests, travelers can track trips created for them, and the admin team manages approvals and workflow configuration from one internal control surface.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a href={`${API_BASE_URL}/auth/google`} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 px-7 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_30px_70px_rgba(66,191,248,0.28)] transition hover:scale-[1.01]">
                Enter Travel Desk
                <ArrowRight size={18} />
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Role-Specific Access', copy: 'Admins act, coordinators oversee, managers submit, and travelers see requests created for them.' },
                { icon: Users, title: 'Workspace Lookup', copy: 'Traveler selection is driven by Google Workspace users instead of free-text entry.' },
                { icon: Cog, title: 'Admin Configurable', copy: 'Events, departments, cost centers, budgets, and daily roles are managed from an admin settings console.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <item.icon className="mb-5 text-cyan-300" size={20} />
                  <h3 className="mb-2 text-sm font-black uppercase tracking-[0.24em] text-white">{item.title}</h3>
                  <p className="text-sm leading-7 text-slate-400">{item.copy}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="relative">
            <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute right-0 top-32 h-28 w-28 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-7 shadow-[0_40px_120px_rgba(7,12,28,0.45)] backdrop-blur-2xl">
              <div className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/75">Approval board snapshot</div>
              <div className="space-y-4">
                {[
                  ['ETH CC', 'Awaiting Response', 'Manager submitted / traveler notified'],
                  ['Korea Blockchain Week', 'Approved', 'Event-linked schedule complete'],
                  ['Consensus Toronto', 'Need More Information', 'Admin returned for clarification'],
                ].map(([title, status, meta]) => (
                  <div key={title} className="rounded-[24px] border border-white/10 bg-[#081120]/80 p-5">
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{meta}</div>
                    <div className="mt-4 inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">{status}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function AuthCallbackPage({ refreshUser }: { refreshUser: () => Promise<void> }) {
  const navigate = useNavigate();

  useEffect(() => {
    const complete = async () => {
      await refreshUser();
      navigate('/dashboard', { replace: true });
    };

    void complete();
  }, [navigate, refreshUser]);

  return <div className="min-h-screen bg-[#06101d]" />;
}

function ProtectedRoute({
  user,
  loading,
  children,
}: {
  user: AuthUser | null;
  loading: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return <div className="min-h-screen bg-[#06101d]" />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppShell({ user, logout }: { user: AuthUser; logout: () => Promise<void> }) {
  const canSubmit = ['admin', 'manager', 'coordinator'].includes(user.role);

  return (
    <div className="min-h-screen bg-[#06101d] text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,_rgba(66,191,248,0.11),_transparent_25%),radial-gradient(circle_at_82%_0%,_rgba(104,132,255,0.1),_transparent_24%)]" />
      <div className="relative flex flex-col items-center p-6 md:p-8">
        <nav className="mb-10 flex w-full max-w-7xl items-center justify-between gap-4 flex-wrap">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 shadow-[0_18px_40px_rgba(66,191,248,0.16)]"><Building2 className="text-cyan-300" size={22} /></div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-200/70">SSV Labs</div>
              <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>Travel Desk</h1>
            </div>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-slate-400 transition hover:text-white">Board</Link>
            {canSubmit && (
              <Link to="/new" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-slate-400 transition hover:text-white">New</Link>
            )}
            {user.role === 'admin' && (
              <Link to="/settings" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.22em] text-slate-400 transition hover:text-white">Settings</Link>
            )}
            <div className="ml-2 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">{user.role}</span>
              <span className="text-sm text-white">{user.name}</span>
              <button onClick={() => void logout()} className="text-slate-500 transition-colors hover:text-rose-300"><LogOut size={18} /></button>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/new" element={canSubmit ? <NewRequest user={user} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={user.role === 'admin' ? <Settings /> : <Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, refreshUser, logout } = useAuth();

  return (
    <Routes>
      <Route path="/" element={loading ? <div className="min-h-screen bg-[#06101d]" /> : user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage refreshUser={refreshUser} />} />
      <Route path="/*" element={<ProtectedRoute user={user} loading={loading}>{user ? <AppShell user={user} logout={logout} /> : null}</ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return <Router><AppContent /></Router>;
}

export default App;
