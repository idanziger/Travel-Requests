import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle, ChevronDown, ChevronRight, Info, RefreshCw, Save, Search, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { AuthUser, RequestDay, TravelRequest } from '../types';

type StatusKey = 'all' | 'awaiting' | 'needInfo' | 'approved' | 'notApproved';

type StatusMeta = {
  key: Exclude<StatusKey, 'all'>;
  label: string;
  backend: string;
  bg: string;
  fg: string;
  dot: string;
  border: string;
};

const statusMetas: StatusMeta[] = [
  {
    key: 'awaiting',
    label: 'Awaiting Response',
    backend: 'Awaiting Response',
    bg: 'bg-[#E7F0F6]',
    fg: 'text-[#2F6F99]',
    dot: 'bg-[#2F6F99]',
    border: 'border-[#C8DDEB]',
  },
  {
    key: 'needInfo',
    label: 'Need More Info',
    backend: 'Need More Info',
    bg: 'bg-[#F6EAD6]',
    fg: 'text-[#B07A2E]',
    dot: 'bg-[#D99A4E]',
    border: 'border-[#EAD4AF]',
  },
  {
    key: 'approved',
    label: 'Approved',
    backend: 'Approved',
    bg: 'bg-[#E6F0E4]',
    fg: 'text-[#4E7A52]',
    dot: 'bg-[#6E9E72]',
    border: 'border-[#CFDEC9]',
  },
  {
    key: 'notApproved',
    label: 'Not Approved',
    backend: 'Not Approved',
    bg: 'bg-[#F3E7E1]',
    fg: 'text-[#A8694E]',
    dot: 'bg-[#B0795C]',
    border: 'border-[#E5D0C6]',
  },
];

const getStatusMeta = (status?: string | null) => {
  const normalized = status || 'Awaiting Response';
  return statusMetas.find((item) => item.backend === normalized) || statusMetas[0];
};

const filters: Array<{ key: StatusKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'needInfo', label: 'Need info' },
  { key: 'approved', label: 'Approved' },
  { key: 'notApproved', label: 'Not approved' },
];

const parseDate = (value?: string | null) => (value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null);

const formatDate = (value?: string | null, pattern = 'MMM d, yyyy') => {
  const date = parseDate(value);
  return date ? format(date, pattern) : 'Not set';
};

const requestSearchText = (request: TravelRequest) =>
  [
    request.traveler_name,
    request.traveler_email,
    request.requester_name,
    request.requester_email,
    request.event_name,
    request.event_location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

function StatusChip({ status }: { status?: string | null }) {
  const meta = getStatusMeta(status);

  return (
    <span className={`inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.fg} ${meta.border}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-[rgba(44,40,31,.06)] py-2 last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function DayRow({ day }: { day: RequestDay }) {
  return (
    <div className="grid gap-3 rounded-field border border-[rgba(44,40,31,.08)] bg-white p-3 md:grid-cols-[.75fr_1fr_1fr]">
      <div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Day {day.day_index}</p>
        <p className="mt-1 font-semibold text-ink">{formatDate(day.day_date, 'EEE, MMM d')}</p>
      </div>
      <div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Morning</p>
        <p className="mt-1 text-sm text-muted">{day.morning_role || 'No role'}</p>
      </div>
      <div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Evening</p>
        <p className="mt-1 text-sm text-muted">{day.evening_role || 'No role'}</p>
      </div>
    </div>
  );
}

function Dashboard({ user }: { user: AuthUser }) {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusKey>('all');

  const canReview = user.role === 'admin';

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/requests');
      const rows = Array.isArray(response.data) ? response.data : [];
      setRequests(rows);
      setEditingNotes(
        rows.reduce((acc: Record<number, string>, request: TravelRequest) => {
          acc[request.id] = request.approver_notes || '';
          return acc;
        }, {})
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, [user.id]);

  const updateStatus = async (request: TravelRequest, status: string) => {
    await axios.patch(`/api/requests/${request.id}/status`, {
      status,
      approver_notes: editingNotes[request.id] || '',
    });
    await fetchRequests();
  };

  const saveApproverNotes = async (request: TravelRequest) => {
    await axios.patch(`/api/requests/${request.id}/status`, {
      status: request.status || 'Awaiting Response',
      approver_notes: editingNotes[request.id] || '',
    });
    await fetchRequests();
  };

  const searchedRequests = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return requests;

    return requests.filter((request) => requestSearchText(request).includes(needle));
  }, [query, requests]);

  const groupedRequests = useMemo(
    () =>
      statusMetas.map((meta) => ({
        meta,
        rows: searchedRequests.filter((request) => getStatusMeta(request.status).key === meta.key),
      })),
    [searchedRequests]
  );

  const visibleGroups = activeFilter === 'all' ? groupedRequests : groupedRequests.filter((group) => group.meta.key === activeFilter);
  const visibleCount = visibleGroups.reduce((sum, group) => sum + group.rows.length, 0);
  const totalCount = requests.length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{user.role === 'admin' ? 'All travel' : user.role === 'manager' ? 'My requests' : 'My travel'}</p>
          <h1 className="font-display mt-2 text-5xl leading-none text-ink">
            {user.role === 'admin' ? 'Travel requests' : user.role === 'manager' ? 'Where are we headed?' : 'My trips'}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void fetchRequests()}
          className="inline-flex w-fit items-center gap-2 rounded-button border border-[rgba(44,40,31,.08)] bg-white px-4 py-2.5 text-sm font-semibold text-sky shadow-card transition duration-150 ease-window hover:border-[rgba(47,111,153,.26)] hover:bg-sky-tint"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      <section className="rounded-card border border-[rgba(44,40,31,.08)] bg-white/74 p-4 shadow-card backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search traveler, requester, event, or location"
              className="field"
              style={{ paddingLeft: '2.6rem' }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const count =
                filter.key === 'all'
                  ? searchedRequests.length
                  : groupedRequests.find((group) => group.meta.key === filter.key)?.rows.length || 0;
              const active = activeFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-pill border px-4 py-2 text-sm font-semibold transition duration-150 ease-window ${
                    active
                      ? 'border-[rgba(47,111,153,.25)] bg-sky text-white'
                      : 'border-[rgba(44,40,31,.08)] bg-shell text-muted hover:border-[rgba(47,111,153,.22)] hover:text-sky'
                  }`}
                >
                  {filter.label}
                  <span className={`ml-2 font-mono-ui text-[10px] ${active ? 'text-white/80' : 'text-faint'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 text-sm text-muted">
        <CalendarDays size={16} className="text-gold-deep" />
        Showing {visibleCount} of {totalCount} request{totalCount === 1 ? '' : 's'}
      </div>

      <div className="space-y-6">
        {visibleGroups.map(({ meta, rows }) => {
          if (rows.length === 0 && activeFilter === 'all') return null;

          return (
            <section key={meta.key} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                  <h2 className="font-mono-ui text-xs font-medium uppercase tracking-[.2em] text-muted">{meta.label}</h2>
                </div>
                <span className="rounded-pill bg-shell px-3 py-1 font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">{rows.length}</span>
              </div>

              {rows.length === 0 ? (
                <div className="rounded-card border border-dashed border-[rgba(44,40,31,.16)] bg-white/54 p-8 text-center text-sm text-muted">
                  No requests match this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((request) => {
                    const expanded = expandedId === request.id;
                    const days = request.days || [];

                    return (
                      <article key={request.id} className="overflow-hidden rounded-card border border-[rgba(44,40,31,.08)] bg-white shadow-card">
                        <button
                          type="button"
                          onClick={() => setExpandedId((current) => (current === request.id ? null : request.id))}
                          className="flex w-full flex-col gap-4 p-4 text-left transition duration-150 ease-window hover:bg-[#fffdf9] md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-4">
                            <span className="mt-1 rounded-button border border-[rgba(44,40,31,.08)] bg-shell p-1.5 text-faint">
                              {expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="truncate text-lg font-semibold text-ink">{request.traveler_name}</h3>
                                <StatusChip status={request.status} />
                              </div>
                              <p className="mt-1 text-sm text-muted">
                                {request.event_name || 'No event'} {request.event_location ? `- ${request.event_location}` : ''}
                              </p>
                              <p className="mt-1 text-xs text-faint">
                                Requested by {request.requester_name || 'Unknown'} · Submitted {request.submitted_at ? formatDate(request.submitted_at) : formatDate(request.request_date)}
                              </p>
                            </div>
                          </div>
                          <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm md:text-right">
                            <div>
                              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Dates</p>
                              <p className="font-medium text-ink">{formatDate(request.start_date, 'MMM d')} - {formatDate(request.end_date, 'MMM d')}</p>
                            </div>
                            <div>
                              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-faint">Days</p>
                              <p className="font-medium text-ink">{request.total_days || days.length || 'Not set'}</p>
                            </div>
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t border-[rgba(44,40,31,.08)] bg-shell/75 p-4 md:p-5">
                            <div className="grid gap-5 xl:grid-cols-[1.25fr_.85fr]">
                              <div className="space-y-5">
                                <section className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <h4 className="label">Daily schedule</h4>
                                    <span className="text-xs text-faint">{days.length} day{days.length === 1 ? '' : 's'}</span>
                                  </div>
                                  <div className="space-y-2">
                                    {days.length > 0 ? (
                                      days.map((day) => <DayRow key={day.day_date || day.day_index} day={day} />)
                                    ) : (
                                      <div className="rounded-field border border-dashed border-[rgba(44,40,31,.14)] bg-white p-4 text-sm text-muted">
                                        No daily schedule was saved with this request.
                                      </div>
                                    )}
                                  </div>
                                </section>

                                <section className="rounded-field border border-[rgba(44,40,31,.08)] bg-white p-4">
                                  <h4 className="label">Submitter notes</h4>
                                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{request.notes || 'No submitter notes.'}</p>
                                </section>
                              </div>

                              <div className="space-y-5">
                                <section className="rounded-field border border-[rgba(44,40,31,.08)] bg-white p-4 text-sm">
                                  <h4 className="label">Request details</h4>
                                  <div className="mt-3">
                                    <DetailLine label="Date range" value={`${formatDate(request.start_date)} - ${formatDate(request.end_date)}`} />
                                    <DetailLine label="Total days" value={request.total_days || days.length || null} />
                                    <DetailLine label="Department" value={request.department} />
                                    <DetailLine label="Budget" value={request.budget} />
                                    <DetailLine label="Cost center" value={request.cost_center} />
                                    <DetailLine label="Data status" value={request.data_status} />
                                  </div>
                                </section>

                                <section className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <h4 className="label">Approver notes</h4>
                                    {canReview && (
                                      <button
                                        type="button"
                                        onClick={() => void saveApproverNotes(request)}
                                        className="inline-flex items-center gap-1.5 rounded-button border border-[rgba(47,111,153,.18)] bg-white px-3 py-1.5 text-xs font-semibold text-sky transition duration-150 ease-window hover:bg-sky-tint"
                                      >
                                        <Save size={13} />
                                        Save
                                      </button>
                                    )}
                                  </div>
                                  <textarea
                                    value={canReview ? editingNotes[request.id] || '' : request.approver_notes || ''}
                                    readOnly={!canReview}
                                    onChange={(event) => setEditingNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                                    rows={5}
                                    placeholder="Add reviewer context for the requester."
                                    className={`field min-h-[136px] resize-y ${canReview ? '' : 'bg-white/70 italic text-muted'}`}
                                  />
                                </section>

                                {canReview && (
                                  <div className="grid gap-2 sm:grid-cols-3">
                                    <button
                                      type="button"
                                      onClick={() => void updateStatus(request, 'Approved')}
                                      className="inline-flex items-center justify-center gap-2 rounded-button bg-[#4E7A52] px-3 py-2.5 text-sm font-semibold text-white transition duration-150 ease-window hover:bg-[#446E48]"
                                    >
                                      <CheckCircle size={16} />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void updateStatus(request, 'Need More Info')}
                                      className="inline-flex items-center justify-center gap-2 rounded-button bg-gold px-3 py-2.5 text-sm font-semibold text-ink transition duration-150 ease-window hover:bg-gold-deep hover:text-white"
                                    >
                                      <Info size={16} />
                                      Need info
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void updateStatus(request, 'Not Approved')}
                                      className="inline-flex items-center justify-center gap-2 rounded-button bg-[#A8694E] px-3 py-2.5 text-sm font-semibold text-white transition duration-150 ease-window hover:bg-[#965B42]"
                                    >
                                      <XCircle size={16} />
                                      Decline
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {visibleCount === 0 && activeFilter === 'all' && (
        <div className="rounded-card border border-dashed border-[rgba(44,40,31,.16)] bg-white/60 p-10 text-center text-sm text-muted">
          No requests match the current search.
        </div>
      )}
    </div>
  );
}

export default Dashboard;
