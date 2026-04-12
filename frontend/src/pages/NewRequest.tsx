import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Calendar, CalendarDays, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AuthUser, EventItem, OptionItem, RequestDay } from '../types';

type ConfigPayload = {
  options: Record<string, OptionItem[]>;
  events: EventItem[];
};

type DirectoryUser = {
  email: string;
  name: string;
};

const scheduleHelpText =
  'Travel dates should reflect the professional days the traveler needs to be present at the destination. Travel logistics and layovers are handled separately.';

const buildDays = (startDate: string, endDate: string, existingDays: RequestDay[] = []) => {
  if (!startDate || !endDate) {
    return [];
  }

  const existingByDate = new Map(existingDays.map((day) => [day.day_date, day]));
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: RequestDay[] = [];
  let cursor = new Date(start);
  let index = 1;

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const existing = existingByDate.get(key);
    days.push({
      id: existing?.id,
      day_index: index,
      day_date: key,
      morning_role: existing?.morning_role || '',
      evening_role: existing?.evening_role || '',
    });
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }

  return days;
};

function NewRequest({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [travelerQuery, setTravelerQuery] = useState('');
  const [travelerMatches, setTravelerMatches] = useState<DirectoryUser[]>([]);
  const [showTravelerMatches, setShowTravelerMatches] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    traveler_name: '',
    traveler_email: '',
    event_id: '',
    department: '',
    cost_center: '',
    budget: '',
    notes: '',
    start_date: '',
    end_date: '',
  });
  const [days, setDays] = useState<RequestDay[]>([]);

  const canSubmit = ['admin', 'manager', 'coordinator'].includes(user.role);

  useEffect(() => {
    const loadConfig = async () => {
      const response = await axios.get('/api/config');
      setConfig(response.data);
    };

    void loadConfig();
  }, []);

  useEffect(() => {
    setDays((current) => buildDays(formData.start_date, formData.end_date, current));
  }, [formData.start_date, formData.end_date]);

  useEffect(() => {
    if (travelerQuery.trim().length < 2) {
      setTravelerMatches([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const response = await axios.get('/api/users/search', {
          params: { q: travelerQuery.trim() },
        });
        setTravelerMatches(Array.isArray(response.data) ? response.data : []);
        setShowTravelerMatches(true);
      } catch {
        setTravelerMatches([]);
      }
    }, 180);

    return () => window.clearTimeout(handle);
  }, [travelerQuery]);

  const selectedEvent = useMemo(
    () => config?.events.find((event) => String(event.id) === formData.event_id) || null,
    [config, formData.event_id]
  );

  const roleOptions = config?.options.daily_role || [];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatus({ type: 'error', message: 'Only managers, coordinators, and admins can submit requests.' });
      return;
    }

    if (!formData.traveler_name || !formData.traveler_email) {
      setStatus({ type: 'error', message: 'Please select the traveler from the workspace directory.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      await axios.post('/api/requests', {
        ...formData,
        event_id: Number(formData.event_id),
        days,
      });
      setStatus({ type: 'success', message: 'Travel request submitted successfully.' });
      window.setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to submit request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl grid gap-8 xl:grid-cols-[1.1fr_0.75fr]">
      <form onSubmit={handleSubmit} className="space-y-8 rounded-[28px] border border-white/10 bg-[#0f1729]/90 p-8 shadow-[0_40px_120px_rgba(7,12,28,0.45)] backdrop-blur-xl">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/80">Travel Intake</p>
              <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>
                Create Travel Request
              </h2>
            </div>
            <div className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-300">
              Signed in as {user.name}
            </div>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-slate-400">{scheduleHelpText}</p>
        </header>

        {status.type && (
          <div className={`flex items-center gap-3 rounded-2xl border p-4 ${status.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/20 bg-rose-500/10 text-rose-300'}`}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm">{status.message}</span>
          </div>
        )}

        <section className="space-y-4">
          <h3 className="border-b border-white/10 pb-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">People</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 relative">
              <label className="text-[11px] font-bold uppercase text-slate-400">Requester</label>
              <div className="rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white">{user.name}</div>
            </div>
            <div className="space-y-2 relative">
              <label className="text-[11px] font-bold uppercase text-slate-400">Traveler *</label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-500" size={16} />
                <input
                  required
                  value={travelerQuery}
                  onChange={(e) => setTravelerQuery(e.target.value)}
                  onFocus={() => setShowTravelerMatches(true)}
                  placeholder="Search by traveler name or email"
                  className="w-full rounded-2xl border border-white/10 bg-[#08101d] py-3 pl-10 pr-4 text-white outline-none transition focus:border-cyan-400"
                />
              </div>
              {showTravelerMatches && travelerMatches.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-white/10 bg-[#08101d] p-2 shadow-2xl">
                  {travelerMatches.map((match) => (
                    <button
                      key={match.email}
                      type="button"
                      onClick={() => {
                        setFormData((current) => ({
                          ...current,
                          traveler_name: match.name,
                          traveler_email: match.email,
                        }));
                        setTravelerQuery(`${match.name} (${match.email})`);
                        setShowTravelerMatches(false);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/5"
                    >
                      <div className="text-sm text-white">{match.name}</div>
                      <div className="text-xs text-slate-500">{match.email}</div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500">{formData.traveler_email || 'Select a traveler from Google Workspace.'}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="border-b border-white/10 pb-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Trip Setup</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-400">Event *</label>
              <select
                required
                value={formData.event_id}
                onChange={(e) => setFormData((current) => ({ ...current, event_id: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="">Select an event</option>
                {config?.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-400">Event Location</label>
              <div className="rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white">
                {selectedEvent?.location || 'Location will be derived from the event'}
              </div>
            </div>
            {[
              { key: 'department', label: 'Department', category: 'department' },
              { key: 'cost_center', label: 'Cost Center', category: 'cost_center' },
              { key: 'budget', label: 'Budget', category: 'budget' },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-400">{field.label} *</label>
                <select
                  required
                  value={(formData as any)[field.key]}
                  onChange={(e) => setFormData((current) => ({ ...current, [field.key]: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">Select {field.label}</option>
                  {(config?.options[field.category] || []).map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <CalendarDays size={14} className="text-cyan-300" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Professional Presence Dates</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-400">Start Date *</label>
              <div className="date-input-wrap">
                <input
                  required
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((current) => ({ ...current, start_date: e.target.value }))}
                  className="date-input w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
                <Calendar size={16} className="date-input-icon" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-slate-400">End Date *</label>
              <div className="date-input-wrap">
                <input
                  required
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((current) => ({ ...current, end_date: e.target.value }))}
                  className="date-input w-full rounded-2xl border border-white/10 bg-[#08101d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
                <Calendar size={16} className="date-input-icon" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-2">
            <Sparkles size={14} className="text-cyan-300" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Daily Schedule</h3>
          </div>
          <div className="space-y-3">
            {days.map((day) => (
              <div key={day.day_date} className="grid gap-4 rounded-2xl border border-white/10 bg-[#08101d] p-4 md:grid-cols-[0.8fr_1fr_1fr]">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Day {day.day_index}</div>
                  <div className="mt-2 text-white">{day.day_date}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-400">Morning Role</label>
                  <select
                    value={day.morning_role}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setDays((current) =>
                        current.map((item) =>
                          item.day_date === day.day_date ? { ...item, morning_role: nextValue } : item
                        )
                      );
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">Select morning role</option>
                    {roleOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase text-slate-400">Evening Role</label>
                  <select
                    value={day.evening_role}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setDays((current) =>
                        current.map((item) =>
                          item.day_date === day.day_date ? { ...item, evening_role: nextValue } : item
                        )
                      );
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">Select evening role</option>
                    {roleOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {days.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#08101d] p-6 text-sm text-slate-500">
                Select the professional presence date range to generate one morning/evening block per day.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <label className="text-[11px] font-bold uppercase text-slate-400">Comments</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))}
            rows={4}
            placeholder="Add supporting details, context, or approver-facing notes."
            className="w-full rounded-2xl border border-white/10 bg-[#08101d] p-4 text-white outline-none focus:border-cyan-400"
          />
        </section>

        <button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-6 py-3.5 font-bold text-slate-950 shadow-[0_24px_48px_rgba(66,191,248,0.28)] transition ${isSubmitting || !canSubmit ? 'opacity-50' : 'hover:scale-[1.01]'}`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <aside className="space-y-6 rounded-[28px] border border-white/10 bg-[#0f1729]/90 p-8 shadow-[0_40px_120px_rgba(7,12,28,0.45)] backdrop-blur-xl">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/75">Submission Rules</div>
          <h3 className="mt-2 text-2xl text-white" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>
            What this request controls
          </h3>
        </div>
        <div className="space-y-4 text-sm leading-7 text-slate-400">
          <p>Requests are submitted by managers, coordinators, or admins on behalf of the traveler. Travelers receive visibility into anything created for them.</p>
          <p>Event, department, cost center, budget, and daily role values are controlled by admin settings so the workflow stays aligned with the Monday board.</p>
          <p>Yoav and Tamar receive submission lifecycle notifications, while backup approvers retain board access without the routine alert stream.</p>
        </div>
      </aside>
    </div>
  );
}

export default NewRequest;
