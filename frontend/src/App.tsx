import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertCircle, LayoutDashboard, PlusCircle, LogOut, CheckSquare, ShieldCheck, Send, Users, Sparkles, Building2 } from 'lucide-react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import { API_BASE_URL } from './config';

type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: 'employee' | 'admin';
};

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

function TravelForm({ user }: { user: AuthUser }) {
  const [formData, setFormData] = useState({
    traveler_name: '',
    event_name: '',
    department: '',
    budget_code: '',
    notes: '',
    start_date: '',
    end_date: ''
  });

  const [expenses, setExpenses] = useState({
    airfare: true,
    hotel: true,
    meals: true,
    transport: false
  });

  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      // Map the checkboxes to readable names for the backend
      const requestedExpenses = [];
      if (expenses.airfare) requestedExpenses.push('✈️ Airfare');
      if (expenses.hotel) requestedExpenses.push('🏨 Accommodation');
      if (expenses.meals) requestedExpenses.push('🍲 Meals & Food');
      if (expenses.transport) requestedExpenses.push('🚗 Local Transport');

      await axios.post('/api/requests', { 
        ...formData, 
        requested_expenses: requestedExpenses
      });

      setStatus({ type: 'success', message: 'Travel request submitted successfully!' });
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (error: any) {
      setStatus({ type: 'error', message: 'Failed to submit request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleExpense = (key: keyof typeof expenses) => {
    setExpenses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full max-w-3xl bg-[#0f1729]/90 rounded-[28px] shadow-[0_40px_120px_rgba(7,12,28,0.45)] p-8 md:p-10 space-y-8 border border-white/10 backdrop-blur-xl">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-black text-cyan-300/80 uppercase tracking-[0.35em]">Executive Travel Desk</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>Create Travel Request</h2>
          </div>
          <div className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-300">
            Signed in as {user.name}
          </div>
        </div>
      </header>

      {status.type && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.35em] border-b border-white/10 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Traveler Name *</label>
              <input required name="traveler_name" value={formData.traveler_name} onChange={handleInputChange} placeholder="Who is traveling?" className="w-full bg-[#09101f] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Event / Purpose *</label>
              <input required name="event_name" value={formData.event_name} onChange={handleInputChange} placeholder="e.g. Leadership Summit" className="w-full bg-[#09101f] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Department *</label>
              <select required name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-[#09101f] border border-white/10 rounded-2xl px-4 py-3 outline-none appearance-none">
                <option value="">Select Dept</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Project / Cost Center *</label>
              <input required name="budget_code" value={formData.budget_code} onChange={handleInputChange} placeholder="e.g. EXEC-2026" className="w-full bg-[#09101f] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400 transition-all" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.35em] border-b border-white/10 pb-2 flex items-center gap-2"><CheckSquare size={14}/> Requested Expenses</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'airfare', label: '✈️ Airfare' },
              { id: 'hotel', label: '🏨 Hotel' },
              { id: 'meals', label: '🍲 Meals & Food' },
              { id: 'transport', label: '🚗 Transport' }
            ].map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => toggleExpense(exp.id as keyof typeof expenses)}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                  expenses[exp.id as keyof typeof expenses] 
                    ? 'bg-cyan-400/15 border-cyan-300/35 text-white shadow-[0_18px_40px_rgba(66,191,248,0.18)]' 
                    : 'bg-[#09101f] border-white/10 text-slate-500'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.35em] border-b border-white/10 pb-2">Travel Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Start Date *</label>
              <input required type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="w-full bg-[#09101f] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">End Date *</label>
              <input required type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full bg-[#09101f] border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase">Additional Notes (Optional)</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Provide any extra details about the trip or requirements..."
            rows={3}
            className="w-full bg-[#09101f] border border-white/10 rounded-2xl p-4 text-sm text-slate-300 outline-none focus:border-cyan-400 transition-all resize-none"
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={`w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 text-slate-950 font-bold py-3.5 px-6 rounded-2xl transition-all shadow-[0_24px_48px_rgba(66,191,248,0.28)] flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50' : 'hover:scale-[1.01]'}`}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

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
                Premium travel approvals for a fast-moving leadership team.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                SSV Labs Travel Desk centralizes employee requests, executive approvals, and operational follow-through in one secure internal workflow powered by Google Workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href={`${API_BASE_URL}/auth/google`} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 px-7 py-4 text-sm font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_30px_70px_rgba(66,191,248,0.28)] transition hover:scale-[1.01]">
                Enter Travel Desk
                <ArrowRight size={18} />
              </a>
              <div className="rounded-full border border-white/10 px-5 py-4 text-sm text-slate-400">
                Access restricted to <span className="font-semibold text-white">@ssvlabs.io</span> Google Workspace users
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Workspace-Verified Access', copy: 'Google sign-in, group-based authorization, and secure server-issued sessions.' },
                { icon: Send, title: 'Approval Routing', copy: 'New submissions notify the admin group immediately without manual forwarding.' },
                { icon: Users, title: 'Clear Roles', copy: 'Admins manage the full board while employees see only their own requests.' },
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
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200/75">Approval Board</div>
                  <div className="mt-2 text-2xl text-white" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>Travel oversight, without the chaos.</div>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200">
                  Internal
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ['Executive Summit', 'Pending Review', 'Finance / London'],
                  ['Board Strategy Offsite', 'Approved', 'Leadership / Paris'],
                  ['Partner Visit', 'Need More Info', 'Sales / New York'],
                ].map(([title, status, meta]) => (
                  <div key={title} className="rounded-[24px] border border-white/10 bg-[#081120]/80 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{meta}</div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] ${
                        status === 'Approved'
                          ? 'bg-emerald-300/10 text-emerald-200'
                          : status === 'Need More Info'
                            ? 'bg-amber-300/10 text-amber-200'
                            : 'bg-cyan-300/10 text-cyan-200'
                      }`}>
                        {status}
                      </div>
                    </div>
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
    const completeLogin = async () => {
      await refreshUser();
      navigate('/dashboard', { replace: true });
    };

    void completeLogin();
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-[#06101d] text-white flex items-center justify-center">
      <div className="rounded-[28px] border border-white/10 bg-white/5 px-8 py-10 text-center backdrop-blur-xl">
        <div className="mb-3 text-[11px] font-black uppercase tracking-[0.32em] text-cyan-200/75">Authenticating</div>
        <div className="text-2xl" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>Completing secure sign-in</div>
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
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06101d] text-white flex items-center justify-center">
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-8 py-10 backdrop-blur-xl">
          Loading secure workspace session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppShell({
  user,
  logout,
}: {
  user: AuthUser;
  logout: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-[#06101d] text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,_rgba(66,191,248,0.11),_transparent_25%),radial-gradient(circle_at_82%_0%,_rgba(104,132,255,0.1),_transparent_24%)]" />
      <div className="relative p-6 md:p-8 flex flex-col items-center">
        <nav className="w-full max-w-7xl flex justify-between items-center mb-10 flex-wrap gap-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/5 shadow-[0_18px_40px_rgba(66,191,248,0.16)]"><Building2 className="text-cyan-300" size={22} /></div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-200/70">SSV Labs</div>
              <h1 className="text-2xl font-semibold text-white tracking-tight" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>Travel Desk</h1>
            </div>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/dashboard" className="text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-[0.22em] flex items-center gap-2 rounded-full border border-white/10 px-4 py-2"><LayoutDashboard size={18}/> Board</Link>
            <Link to="/new" className="text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-[0.22em] flex items-center gap-2 rounded-full border border-white/10 px-4 py-2"><PlusCircle size={18}/> New</Link>
            <div className="flex items-center gap-3 ml-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="text-[10px] font-black text-cyan-200 uppercase tracking-[0.28em]">{user.role === 'admin' ? 'Admin' : 'Employee'}</span>
              <span className="text-sm text-white">{user.name}</span>
              <button onClick={() => void logout()} className="text-slate-500 hover:text-rose-300 transition-colors"><LogOut size={18} /></button>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/new" element={<TravelForm user={user} />} />
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
      <Route
        path="/"
        element={
          loading
            ? <div className="min-h-screen bg-[#06101d]" />
            : user
              ? <Navigate to="/dashboard" replace />
              : <LandingPage />
        }
      />
      <Route path="/auth/callback" element={<AuthCallbackPage refreshUser={refreshUser} />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute user={user} loading={loading}>
            {user ? <AppShell user={user} logout={logout} /> : null}
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() { return <Router><AppContent /></Router>; }
export default App;
