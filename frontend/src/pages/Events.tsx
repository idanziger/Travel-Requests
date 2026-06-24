import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import type { EventItem, TravelRequest } from '../types';

type FilterKey = 'upcoming' | 'past' | 'all';

const parseISO = (value?: string | null): Date | null => {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value}T00:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtShort = (value?: string | null) =>
  parseISO(value)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? '—';
const initials = (name: string) =>
  (name || '').split(/\s+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '—';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  'Awaiting Response': { label: 'Awaiting', bg: '#E7F0F6', fg: '#2F6F99' },
  'Need More Info': { label: 'Need Info', bg: '#F6EAD6', fg: '#B07A2E' },
  Approved: { label: 'Approved', bg: '#E6F0E4', fg: '#4E7A52' },
  'Not Approved': { label: 'Not Approved', bg: '#F3E7E1', fg: '#A8694E' },
};
const statusMeta = (s: string) => STATUS[s] || STATUS['Awaiting Response'];

function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('upcoming');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const [config, reqs] = await Promise.all([axios.get('/api/config'), axios.get('/api/requests')]);
      setEvents(Array.isArray(config.data?.events) ? config.data.events : []);
      setRequests(Array.isArray(reqs.data) ? reqs.data : []);
    };
    void load();
  }, []);

  const rosterByEvent = useMemo(() => {
    const map = new Map<number, TravelRequest[]>();
    requests.forEach((r) => {
      const key = Number(r.event_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [requests]);

  const decorated = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query.trim().toLowerCase();
    return events
      .filter((ev) => !q || `${ev.name} ${ev.location ?? ''}`.toLowerCase().includes(q))
      .map((ev) => {
        const start = parseISO(ev.start_date);
        const upcoming = start ? start >= today : true;
        const roster = rosterByEvent.get(Number(ev.id)) || [];
        return { ev, start, upcoming, roster };
      })
      .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  }, [events, rosterByEvent, query]);

  const upCount = decorated.filter((d) => d.upcoming).length;
  const pastCount = decorated.filter((d) => !d.upcoming).length;
  const list = decorated.filter((d) => (filter === 'all' ? true : filter === 'upcoming' ? d.upcoming : !d.upcoming));

  const pills: { key: FilterKey; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upCount },
    { key: 'past', label: 'Past', count: pastCount },
    { key: 'all', label: 'All', count: decorated.length },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <p className="eyebrow">Planning</p>
          <h1 className="font-display mt-1 text-4xl leading-none text-ink">Events</h1>
        </div>
        <label className="relative block w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events"
            className="field"
            style={{ paddingLeft: '2.6rem' }}
          />
        </label>
        <Link
          to="/settings"
          className="flex h-[46px] items-center rounded-button border border-[rgba(44,40,31,.14)] bg-white px-4 text-sm font-semibold text-ink transition duration-150 ease-window hover:border-[rgba(47,111,153,.3)]"
        >
          Manage in settings →
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {pills.map((p) => {
          const active = filter === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilter(p.key)}
              className={`flex h-9 items-center gap-2 rounded-pill border px-3.5 text-[13px] font-medium transition duration-150 ease-window ${
                active ? 'border-ink bg-ink text-white' : 'border-[rgba(44,40,31,.12)] bg-white text-muted hover:text-ink'
              }`}
            >
              {p.label}
              <span className="font-mono-ui text-[11px] opacity-80">{p.count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {list.map(({ ev, start, upcoming, roster }) => {
          const isOpen = !!expanded[ev.id];
          const approved = roster.filter((r) => r.status === 'Approved').length;
          return (
            <div key={ev.id} className="overflow-hidden rounded-card border border-[rgba(44,40,31,.07)] bg-white shadow-card">
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                className="flex w-full items-center gap-5 px-5 py-4 text-left"
              >
                <div
                  className="w-[54px] shrink-0 rounded-field border py-2 text-center"
                  style={{
                    background: upcoming ? '#EAF2F6' : '#F2EDE3',
                    borderColor: upcoming ? '#d4e4ee' : 'rgba(44,40,31,.08)',
                  }}
                >
                  <div
                    className="font-mono-ui text-[10px] uppercase tracking-[.1em]"
                    style={{ color: upcoming ? '#2F6F99' : '#a99f8e' }}
                  >
                    {start ? start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '—'}
                  </div>
                  <div className="font-display text-2xl leading-none text-ink">{start ? start.getDate() : '—'}</div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate text-base font-semibold text-ink">{ev.name}</span>
                    <span
                      className="shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.04em]"
                      style={{
                        background: upcoming ? '#E7F0F6' : '#ECE6DA',
                        color: upcoming ? '#2F6F99' : '#9a9082',
                      }}
                    >
                      {upcoming ? 'Upcoming' : 'Past'}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] text-faint">
                    {ev.location || '—'} · {fmtShort(ev.start_date)} – {fmtShort(ev.end_date)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-5">
                  {roster.length > 0 && (
                    <div className="text-right">
                      <div className="text-lg font-semibold leading-none tabular-nums text-ink">
                        {approved}
                        <span className="text-[13px] font-normal text-placeholder">/{roster.length}</span>
                      </div>
                      <div className="font-mono-ui mt-0.5 text-[9px] uppercase tracking-[.12em] text-placeholder">Confirmed</div>
                    </div>
                  )}
                  <div className="flex items-center">
                    {roster.slice(0, 4).map((r, i) => {
                      const m = statusMeta(r.status);
                      return (
                        <span
                          key={r.id}
                          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white text-[12px] font-semibold"
                          style={{ background: m.bg, color: m.fg, marginLeft: i === 0 ? 0 : '-10px' }}
                        >
                          {initials(r.traveler_name)}
                        </span>
                      );
                    })}
                    {roster.length === 0 && <span className="text-[13px] text-placeholder">No travelers yet</span>}
                  </div>
                  <ChevronRight
                    size={17}
                    className="text-faint transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-dashed border-[rgba(44,40,31,.14)] px-5 pb-5 pt-1">
                  {roster.length > 0 ? (
                    <>
                      <div className="grid grid-cols-[1.6fr_1.2fr_auto] gap-3 px-2 pb-2 pt-4">
                        <div className="label">Traveler</div>
                        <div className="label">Dates at destination</div>
                        <div className="label text-right">Status</div>
                      </div>
                      <div className="flex flex-col">
                        {roster.map((r) => {
                          const m = statusMeta(r.status);
                          return (
                            <div
                              key={r.id}
                              className="grid grid-cols-[1.6fr_1.2fr_auto] items-center gap-3 border-t border-[rgba(44,40,31,.06)] px-2 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span
                                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                                  style={{ background: m.bg, color: m.fg }}
                                >
                                  {initials(r.traveler_name)}
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-ink">{r.traveler_name}</div>
                                  <div className="text-xs text-faint">{r.department || '—'}</div>
                                </div>
                              </div>
                              <div className="text-[13px] text-muted">
                                {fmtShort(r.start_date)} – {fmtShort(r.end_date)}
                              </div>
                              <span
                                className="justify-self-end rounded-pill px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.03em]"
                                style={{ background: m.bg, color: m.fg }}
                              >
                                {m.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <Link to="/dashboard" className="mt-3 inline-block text-[13px] font-semibold text-sky hover:text-sky-hover">
                        Review these requests on the board →
                      </Link>
                    </>
                  ) : (
                    <div className="py-6 text-center text-faint">
                      <div className="text-sm">No one has requested travel for this event yet.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="py-20 text-center">
            <div className="font-display text-2xl text-ink">No events here.</div>
            <div className="mt-1 text-sm text-faint">Nothing matches "{query}".</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Events;
