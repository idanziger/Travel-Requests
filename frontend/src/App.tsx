import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, FileText, Briefcase, DollarSign, Clock, CheckCircle2, AlertCircle, LayoutDashboard, PlusCircle, LogOut, CheckSquare } from 'lucide-react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';

// --- Helper to handle User Session ---
const useAuth = () => {
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userRole = params.get('userRole');

    if (userId && userName && userRole) {
      const newUser = { id: userId, name: userName, role: userRole };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      navigate('/', { replace: true });
    } else {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, [location]);

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return { user, logout };
};

// --- Form Component ---
function TravelForm({ userId }: { userId: string | undefined }) {
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
    if (!userId) {
      setStatus({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      // Map the checkboxes to readable names for the backend
      const requestedExpenses = [];
      if (expenses.airfare) requestedExpenses.push('✈️ Airfare');
      if (expenses.hotel) requestedExpenses.push('🏨 Accommodation');
      if (expenses.meals) requestedExpenses.push('🍲 Meals & Food');
      if (expenses.transport) requestedExpenses.push('🚗 Local Transport');

      await axios.post('http://localhost:3001/api/requests', { 
        ...formData, 
        requester_id: parseInt(userId),
        requested_expenses: requestedExpenses
      });

      setStatus({ type: 'success', message: 'Travel request submitted successfully!' });
      setTimeout(() => navigate('/dashboard'), 2000);
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
    <div className="w-full max-w-2xl bg-[#242645] rounded-xl shadow-2xl p-8 space-y-8 border border-slate-700">
      <header className="space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Create Travel Request</h2>
        <p className="text-slate-400 text-xs italic uppercase tracking-widest font-bold">New Submission</p>
      </header>

      {status.type && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Info Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Traveler Name *</label>
              <input required name="traveler_name" value={formData.traveler_name} onChange={handleInputChange} placeholder="Who is traveling?" className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Event / Purpose *</label>
              <input required name="event_name" value={formData.event_name} onChange={handleInputChange} placeholder="e.g. Sales Summit" className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Department *</label>
              <select required name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg px-4 py-2.5 outline-none appearance-none">
                <option value="">Select Dept</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Project / Cost Center *</label>
              <input required name="budget_code" value={formData.budget_code} onChange={handleInputChange} placeholder="e.g. BGT-2026" className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Expense Selection Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2"><CheckSquare size={14}/> Requested Expenses</h3>
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
                className={`p-3 rounded-lg border text-xs font-bold transition-all text-center ${
                  expenses[exp.id as keyof typeof expenses] 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-2">Travel Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Start Date *</label>
              <input required type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg px-4 py-2.5 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">End Date *</label>
              <input required type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg px-4 py-2.5 outline-none" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting || !userId} className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 ${isSubmitting || !userId ? 'opacity-50' : ''}`}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

// --- Main App Wrapper ---
function AppContent() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#1a1b2e] text-slate-200 p-8 flex flex-col items-center">
      <nav className="w-full max-w-6xl flex justify-between items-center mb-12">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-600/20"><FileText className="text-white" size={24} /></div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Travel Requests</h1>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={18}/> Board</Link>
          <Link to="/" className="text-sm font-bold text-slate-400 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"><PlusCircle size={18}/> New</Link>
          {user ? (
            <div className="flex items-center gap-4 ml-6 pl-6 border-l border-slate-700">
              <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/5 px-3 py-1.5 rounded-full border border-indigo-400/20 uppercase">Hi, {user.name}</span>
              <button onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors"><LogOut size={20} /></button>
            </div>
          ) : (
            <a href="http://localhost:3001/auth/google" className="bg-indigo-600 hover:bg-indigo-700 text-[11px] font-black py-2.5 px-6 rounded-lg transition-all ml-4 uppercase tracking-widest">Sign in with Google</a>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<TravelForm userId={user?.id} />} />
        <Route path="/dashboard" element={<Dashboard userId={user?.id} userRole={user?.role} />} />
      </Routes>
    </div>
  );
}

function App() { return <Router><AppContent /></Router>; }
export default App;
