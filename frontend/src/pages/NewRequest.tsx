import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import axios from 'axios';
import { AlertCircle, Calendar, CheckCircle2, Luggage, Search, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { AuthUser, EventItem, OptionItem, RequestDay } from '../types';

type ConfigPayload = {
  options: Record<string, OptionItem[]>;
  events: EventItem[];
  approvalStatuses?: string[];
};

type DirectoryUser = {
  email: string;
  name: string;
};

type FormData = {
  traveler_name: string;
  traveler_email: string;
  event_id: string;
  department: string;
  cost_center: string;
  budget: string;
  notes: string;
  start_date: string;
  end_date: string;
};

type SelectField = {
  key: 'department' | 'cost_center' | 'budget';
  label: string;
  category: 'department' | 'cost_center' | 'budget';
};

const selectFields: SelectField[] = [
  { key: 'department', label: 'Department', category: 'department' },
  { key: 'cost_center', label: 'Cost Center', category: 'cost_center' },
  { key: 'budget', label: 'Budget', category: 'budget' },
];

const emptyForm: FormData = {
  traveler_name: '',
  traveler_email: '',
  event_id: '',
  department: '',
  cost_center: '',
  budget: '',
  notes: '',
  start_date: '',
  end_date: '',
};

const parseInputDate = (value: string): Date | null => {
  if (!value) return null;
  // Accept both "yyyy-MM-dd" (date inputs) and full ISO timestamps (backend event dates).
  const iso = value.includes('T') ? value : `${value}T00:00:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatInputDate = (value: string, pattern = 'MMM d, yyyy') => {
  const parsed = parseInputDate(value);
  return parsed ? format(parsed, pattern) : 'Not set';
};

const buildDays = (startDate: string, endDate: string, existingDays: RequestDay[] = []) => {
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (!start || !end || start > end) {
    return [];
  }

  const existingByDate = new Map(existingDays.map((day) => [day.day_date, day]));
  const days: RequestDay[] = [];
  const cursor = new Date(start);
  let index = 1;

  while (cursor <= end) {
    const key = format(cursor, 'yyyy-MM-dd');
    const existing = existingByDate.get(key);
    days.push({
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

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="label">{children}</label>;
}

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
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [days, setDays] = useState<RequestDay[]>([]);

  const canSubmit = user.role === 'admin' || user.role === 'manager';

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

  const eventHint = selectedEvent
    ? `${selectedEvent.name} runs ${formatInputDate(selectedEvent.start_date || '')} - ${formatInputDate(selectedEvent.end_date || '')} - travel a little early or stay later.`
    : 'Choose a project or event to see its destination and dates.';

  const updateForm = (patch: Partial<FormData>) => {
    setFormData((current) => ({ ...current, ...patch }));
  };

  const saveDraft = () => {
    window.localStorage.setItem(
      'travel-request-draft',
      JSON.stringify({
        formData,
        travelerQuery,
        days,
        savedAt: new Date().toISOString(),
      })
    );
    setStatus({ type: 'success', message: 'Draft saved in this browser.' });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatus({ type: 'error', message: 'Only admins and managers can submit requests.' });
      return;
    }

    if (!formData.traveler_name || !formData.traveler_email) {
      setStatus({ type: 'error', message: 'Select the traveler from the workspace directory.' });
      return;
    }

    if (!formData.start_date || !formData.end_date || days.length === 0) {
      setStatus({ type: 'error', message: 'Choose a valid start and end date.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      await axios.post('/api/requests', {
        traveler_name: formData.traveler_name,
        traveler_email: formData.traveler_email,
        event_id: Number(formData.event_id),
        department: formData.department,
        cost_center: formData.cost_center,
        budget: formData.budget,
        notes: formData.notes,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days: days.map((day) => ({
          day_index: day.day_index,
          day_date: day.day_date,
          morning_role: day.morning_role,
          evening_role: day.evening_role,
        })),
      });
      setSubmitted(true);
      setStatus({ type: 'success', message: 'Travel request submitted.' });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) && error.response?.data?.error
        ? String(error.response.data.error)
        : 'Failed to submit request.';
      setStatus({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center">
        <section className="w-full rounded-card border border-[rgba(44,40,31,.08)] bg-white p-8 text-center shadow-raised">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-sky">
            <Luggage size={25} />
          </div>
          <p className="eyebrow mt-6">Submitted</p>
          <h1 className="font-display mt-2 text-5xl text-ink">Bon voyage.</h1>
          <p className="mx-auto mt-4 max-w-md text-muted">
            The request is on the board with the daily schedule attached.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-7 rounded-button bg-sky px-5 py-3 text-sm font-semibold text-white transition duration-150 ease-window hover:bg-sky-hover"
          >
            View dashboard
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header>
        <p className="eyebrow">Travel intake</p>
        <h1 className="font-display mt-2 text-5xl leading-none text-ink">Where are we headed?</h1>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {status.type && (
            <div className={`flex items-center gap-3 rounded-card border p-4 text-sm ${
              status.type === 'success'
                ? 'border-[#CFDEC9] bg-[#E6F0E4] text-[#4E7A52]'
                : 'border-[#E5D0C6] bg-[#F3E7E1] text-[#A8694E]'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
              <span>{status.message}</span>
            </div>
          )}

          <section className="rounded-card border border-[rgba(44,40,31,.08)] bg-white p-5 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <span className="diamond" />
              <div>
                <p className="eyebrow">Trip details</p>
                <h2 className="text-xl font-semibold text-ink">Traveler and destination</h2>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Requester</FieldLabel>
                <div className="field bg-shell">{user.name}</div>
              </div>

              <div className="relative space-y-2">
                <FieldLabel>Traveler *</FieldLabel>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={17} />
                  <input
                    required
                    value={travelerQuery}
                    onChange={(event) => {
                      setTravelerQuery(event.target.value);
                      updateForm({ traveler_name: '', traveler_email: '' });
                    }}
                    onFocus={() => setShowTravelerMatches(true)}
                    placeholder="Search by name or email"
                    className="field"
                    style={{ paddingLeft: '2.6rem' }}
                  />
                </div>
                {showTravelerMatches && travelerMatches.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-card border border-[rgba(44,40,31,.08)] bg-white p-2 shadow-raised">
                    {travelerMatches.map((match) => (
                      <button
                        key={match.email}
                        type="button"
                        onClick={() => {
                          updateForm({
                            traveler_name: match.name,
                            traveler_email: match.email,
                          });
                          setTravelerQuery(`${match.name} (${match.email})`);
                          setShowTravelerMatches(false);
                        }}
                        className="w-full rounded-field px-3 py-2 text-left transition duration-150 ease-window hover:bg-shell"
                      >
                        <div className="text-sm font-semibold text-ink">{match.name}</div>
                        <div className="text-xs text-muted">{match.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted">{formData.traveler_email || 'Select a traveler from Google Workspace.'}</p>
              </div>

              <div className="space-y-2">
                <FieldLabel>Project / Event *</FieldLabel>
                <select
                  required
                  value={formData.event_id}
                  onChange={(event) => updateForm({ event_id: event.target.value })}
                  className="field"
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
                <FieldLabel>Destination</FieldLabel>
                <input
                  readOnly
                  value={selectedEvent?.location || ''}
                  placeholder="Derived from selected event"
                  className="field"
                />
              </div>

              <div className="rounded-field border border-[rgba(47,111,153,.14)] bg-sky-tint p-4 text-sm leading-6 text-sky md:col-span-2">
                {eventHint}
              </div>

              {selectFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <FieldLabel>{field.label} *</FieldLabel>
                  <select
                    required
                    value={formData[field.key]}
                    onChange={(event) => updateForm({ [field.key]: event.target.value })}
                    className="field"
                  >
                    <option value="">Select {field.label}</option>
                    {(config?.options[field.category] || []).map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {field.key === 'budget' && (
                    <p className="text-xs text-muted">Budget is a category, not an amount - no costs are tracked here.</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-[rgba(44,40,31,.08)] bg-white p-5 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <Calendar size={18} className="text-gold-deep" />
              <div>
                <p className="eyebrow">Travel dates</p>
                <h2 className="text-xl font-semibold text-ink">Daily schedule</h2>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Start Date *</FieldLabel>
                <input
                  required
                  type="date"
                  value={formData.start_date}
                  onChange={(event) => updateForm({ start_date: event.target.value })}
                  className="field"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>End Date *</FieldLabel>
                <input
                  required
                  type="date"
                  value={formData.end_date}
                  onChange={(event) => updateForm({ end_date: event.target.value })}
                  className="field"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {days.length > 0 ? (
                days.map((day) => (
                  <div key={day.day_date} className="grid gap-4 rounded-field border border-[rgba(44,40,31,.08)] bg-shell p-4 md:grid-cols-[.78fr_1fr_1fr]">
                    <div>
                      <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Day {day.day_index}</p>
                      <p className="mt-1 font-semibold text-ink">{formatInputDate(day.day_date, 'EEE, MMM d')}</p>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Morning role</FieldLabel>
                      <select
                        value={day.morning_role}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setDays((current) =>
                            current.map((item) =>
                              item.day_date === day.day_date ? { ...item, morning_role: nextValue } : item
                            )
                          );
                        }}
                        className="field"
                      >
                        <option value="">No role</option>
                        {roleOptions.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>Evening role</FieldLabel>
                      <select
                        value={day.evening_role}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setDays((current) =>
                            current.map((item) =>
                              item.day_date === day.day_date ? { ...item, evening_role: nextValue } : item
                            )
                          );
                        }}
                        className="field"
                      >
                        <option value="">No role</option>
                        {roleOptions.map((option) => (
                          <option key={option.id} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-field border border-dashed border-[rgba(44,40,31,.16)] bg-shell p-5 text-sm text-muted">
                  Select both dates to generate one morning and evening role row per day.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-card border border-[rgba(44,40,31,.08)] bg-white p-5 shadow-card">
            <div className="space-y-2">
              <FieldLabel>Notes</FieldLabel>
              <textarea
                value={formData.notes}
                onChange={(event) => updateForm({ notes: event.target.value })}
                rows={5}
                placeholder="Add context for the approver."
                className="field resize-y"
              />
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-card border border-[rgba(44,40,31,.08)] bg-linen p-5 shadow-card xl:sticky xl:top-8">
          <div className="mb-5 flex items-center gap-3">
            <Sparkles size={17} className="text-gold-deep" />
            <div>
              <p className="eyebrow">Trip summary</p>
              <h2 className="text-xl font-semibold text-ink">Facts</h2>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-field bg-white p-3">
              <p className="label">Traveler</p>
              <p className="mt-1 font-semibold text-ink">{formData.traveler_name || 'Not selected'}</p>
              <p className="text-xs text-muted">{formData.traveler_email || 'Workspace user required'}</p>
            </div>
            <div className="rounded-field bg-white p-3">
              <p className="label">Destination</p>
              <p className="mt-1 font-semibold text-ink">{selectedEvent?.location || 'Not selected'}</p>
              <p className="text-xs text-muted">{selectedEvent?.name || 'Choose an event'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-field bg-white p-3">
                <p className="label">Start</p>
                <p className="mt-1 font-semibold text-ink">{formatInputDate(formData.start_date, 'MMM d')}</p>
              </div>
              <div className="rounded-field bg-white p-3">
                <p className="label">End</p>
                <p className="mt-1 font-semibold text-ink">{formatInputDate(formData.end_date, 'MMM d')}</p>
              </div>
            </div>
            <div className="rounded-field bg-white p-3">
              <p className="label">Days count</p>
              <p className="mt-1 font-semibold text-ink">{days.length || 'Not set'}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="rounded-button bg-sky px-5 py-3 text-sm font-semibold text-white transition duration-150 ease-window hover:bg-sky-hover disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit request'}
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-button border border-[rgba(44,40,31,.1)] bg-white px-5 py-3 text-sm font-semibold text-muted transition duration-150 ease-window hover:border-[rgba(47,111,153,.22)] hover:text-sky"
            >
              Save draft
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}

export default NewRequest;
