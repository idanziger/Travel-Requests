import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Archive, Check, Plus, RotateCcw, X } from 'lucide-react';
import type { EventItem, OptionItem } from '../types';
import { CITIES } from '../cities';

type ConfigPayload = {
  options: Record<string, OptionItem[]>;
  events: EventItem[];
};

const pickListGroups: { category: string; label: string; helper: string; placeholder: string }[] = [
  { category: 'department', label: 'Departments', helper: 'Owning team', placeholder: 'Add a department…' },
  { category: 'cost_center', label: 'Cost Centers', helper: 'Accounting bucket', placeholder: 'Add a cost center…' },
  { category: 'budget', label: 'Budget categories', helper: 'A category, not an amount', placeholder: 'Add a budget category…' },
  { category: 'daily_role', label: 'Daily-schedule roles', helper: 'Morning & evening options per day', placeholder: 'Add a role…' },
];

const statusGroups: { category: string; label: string; helper: string; placeholder: string }[] = [
  { category: 'data_status', label: 'Data Statuses', helper: 'Where a request sits in data collection — shown to the requester.', placeholder: 'Add data status…' },
  { category: 'approval_status', label: 'Approval Statuses', helper: 'The decision states an approver can set on a request.', placeholder: 'Add approval status…' },
];

const labelCell = 'font-mono-ui text-[10px] uppercase tracking-[.14em] text-placeholder';

// Event-location typeahead: type a city, pick from suggestions, country auto-fills as "City, Country".
// Free text is also allowed (committed on blur) so custom/unlisted locations still work.
function CityAutocomplete({
  value,
  inputCls,
  onCommit,
}: {
  value: string;
  inputCls: string;
  onCommit: (location: string) => void;
}) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Re-sync local text when the underlying event value changes externally (e.g. after a reload),
  // using the during-render "adjust state from prop" pattern instead of an effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  const matches = useMemo<readonly [string, string][]>(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    // CITIES is pre-sorted by population, so prefix matches surface the biggest cities first.
    const out: [string, string][] = [];
    for (const [city, country] of CITIES) {
      if (city.toLowerCase().startsWith(q)) {
        out.push([city, country]);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [text]);

  const commit = (location: string) => {
    setText(location);
    setOpen(false);
    onCommit(location);
  };

  const pick = (i: number) => {
    const m = matches[i];
    if (m) commit(`${m[0]}, ${m[1]}`);
  };

  return (
    <div className="relative">
      <input
        className={`${inputCls} w-full`}
        value={text}
        placeholder="Type a city…"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => text.trim() && setOpen(true)}
        onBlur={() => {
          // Delay so a suggestion click registers before we close/commit free text.
          window.setTimeout(() => {
            setOpen(false);
            if (text !== value) onCommit(text);
          }, 120);
        }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(active);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[9px] border border-[rgba(44,40,31,.14)] bg-white py-1 shadow-card">
          {matches.map(([city, country], i) => (
            <li key={`${city}|${country}`}>
              <button
                type="button"
                // Prevent the input's blur from firing before this click commits.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(`${city}, ${country}`)}
                className={`flex w-full items-baseline gap-1.5 px-3 py-1.5 text-left text-sm transition ${
                  i === active ? 'bg-sky-tint text-ink' : 'text-ink hover:bg-[#FAF6EF]'
                }`}
              >
                <span className="font-medium">{city}</span>
                <span className="text-[13px] text-faint">{country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Settings() {
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [newOption, setNewOption] = useState<Record<string, string>>({});

  const loadConfig = async () => {
    const response = await axios.get('/api/config');
    setConfig(response.data);
  };

  const loadEvents = async () => {
    const response = await axios.get('/api/events', { params: { view: 'all' } });
    setEvents(Array.isArray(response.data) ? response.data : []);
  };

  useEffect(() => {
    const load = async () => {
      const [configRes, eventsRes] = await Promise.all([
        axios.get('/api/config'),
        axios.get('/api/events', { params: { view: 'all' } }),
      ]);
      setConfig(configRes.data);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
    };
    void load();
  }, []);

  const createOption = async (category: string) => {
    const label = newOption[category]?.trim();
    if (!label) return;
    await axios.post(`/api/options/${category}`, { label, value: label });
    setNewOption((current) => ({ ...current, [category]: '' }));
    await loadConfig();
  };

  const saveOption = async (option: OptionItem) => {
    await axios.patch(`/api/options/item/${option.id}`, option);
    await loadConfig();
  };

  const archiveOption = async (id: number) => {
    await axios.delete(`/api/options/item/${id}`);
    await loadConfig();
  };

  const updateOptionLocal = (category: string, id: number, patch: Partial<OptionItem>) => {
    setConfig((current) =>
      current
        ? {
            ...current,
            options: {
              ...current.options,
              [category]: (current.options[category] || []).map((o) => (o.id === id ? { ...o, ...patch } : o)),
            },
          }
        : current
    );
  };

  const addEvent = async () => {
    await axios.post('/api/events', { name: 'New event', location: '', event_status: 'Pre Event', start_date: null, end_date: null });
    await loadEvents();
  };
  const saveEvent = async (event: EventItem) => {
    await axios.patch(`/api/events/${event.id}`, event);
  };
  const archiveEvent = async (id: number) => {
    await axios.delete(`/api/events/${id}`);
    await loadEvents();
  };
  const restoreEvent = async (id: number) => {
    await axios.post(`/api/events/${id}/restore`);
    await loadEvents();
  };
  const updateEventLocal = (id: number, patch: Partial<EventItem>) => {
    setEvents((current) => current.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const cardCls = 'rounded-card border border-[rgba(44,40,31,.07)] bg-white p-6 shadow-card';
  const inputCls = 'h-[42px] rounded-[9px] border border-[rgba(44,40,31,.12)] bg-[#FDFBF6] px-3 text-sm text-ink outline-none transition focus:border-sky focus:shadow-[0_0_0_3px_rgba(47,111,153,.12)]';

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="font-display mt-1 text-4xl leading-none text-ink">Travel settings</h1>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[#6E9E72]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E6F0E4]">
            <Check size={11} />
          </span>
          Changes save automatically
        </div>
      </header>

      {/* EVENTS */}
      <section className={cardCls}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-ink">Events</div>
            <div className="mt-0.5 text-[13px] text-faint">
              The conferences and trips people can request travel for. Dates appear as a hint on the request form.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void addEvent()}
            className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[9px] border border-[rgba(44,40,31,.14)] bg-white px-3.5 text-[13px] font-semibold text-ink transition hover:border-[rgba(47,111,153,.3)]"
          >
            <Plus size={15} /> Add event
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[1.9fr_1.3fr_150px_150px_34px] gap-2.5 px-0.5">
          <div className={labelCell}>Event</div>
          <div className={labelCell}>Location</div>
          <div className={labelCell}>Starts</div>
          <div className={labelCell}>Ends</div>
          <div />
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {events.filter((event) => !event.archived).map((event) => {
            return (
            <div key={event.id} className="grid grid-cols-[1.9fr_1.3fr_150px_150px_34px] items-center gap-2.5">
              <input
                className={`${inputCls} font-medium`}
                value={event.name}
                placeholder="Event name"
                onChange={(e) => updateEventLocal(event.id, { name: e.target.value })}
                onBlur={() => void saveEvent(event)}
              />
              <CityAutocomplete
                value={event.location || ''}
                inputCls={inputCls}
                onCommit={(location) => {
                  updateEventLocal(event.id, { location });
                  void saveEvent({ ...event, location });
                }}
              />
              <input
                type="date"
                className={`${inputCls} text-[13px]`}
                value={(event.start_date || '').slice(0, 10)}
                onChange={(e) => updateEventLocal(event.id, { start_date: e.target.value })}
                onBlur={() => void saveEvent(event)}
              />
              <input
                type="date"
                className={`${inputCls} text-[13px]`}
                value={(event.end_date || '').slice(0, 10)}
                onChange={(e) => updateEventLocal(event.id, { end_date: e.target.value })}
                onBlur={() => void saveEvent(event)}
              />
              <button
                type="button"
                title="Archive event"
                aria-label="Archive event"
                onClick={() => {
                  if (window.confirm(`Archive "${event.name}"? It stays viewable under Archived (with its requests) and can be restored.`)) {
                    void archiveEvent(event.id);
                  }
                }}
                className="flex h-[42px] w-[34px] items-center justify-center rounded-[9px] border border-[rgba(44,40,31,.12)] bg-white text-faint transition hover:border-[#e6d8bf] hover:bg-[#F6EAD6] hover:text-[#B07A2E]"
              >
                <Archive size={15} />
              </button>
            </div>
            );
          })}
          {events.filter((event) => !event.archived).length === 0 && (
            <div className="rounded-[11px] border border-dashed border-[rgba(44,40,31,.16)] p-6 text-center text-sm text-faint">
              No active events — add one above.
            </div>
          )}
        </div>

        {events.some((event) => event.archived) && (
          <div className="mt-6 border-t border-[rgba(44,40,31,.08)] pt-5">
            <div className="label">Archived</div>
            <div className="mt-0.5 text-[13px] text-faint">Past events and manually-archived ones. Their requests stay viewable for history.</div>
            <div className="mt-3 flex flex-col gap-2">
              {events.filter((event) => event.archived).map((event) => {
                const manual = event.is_active === false;
                return (
                  <div key={event.id} className="flex items-center gap-3 rounded-[9px] border border-[rgba(44,40,31,.08)] bg-[#FAF6EF] px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{event.name}</div>
                      <div className="truncate text-xs text-faint">
                        {event.location || '—'}{event.end_date ? ` · ended ${event.end_date.slice(0, 10)}` : ''}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.04em]"
                      style={{ background: manual ? '#F6EAD6' : '#ECE6DA', color: manual ? '#B07A2E' : '#9a9082' }}
                    >
                      {manual ? 'Archived' : 'Past'}
                    </span>
                    {manual && (
                      <button
                        type="button"
                        onClick={() => void restoreEvent(event.id)}
                        className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-[rgba(47,111,153,.22)] bg-white px-3 py-1.5 text-[13px] font-semibold text-sky transition hover:bg-sky-tint"
                      >
                        <RotateCcw size={13} /> Restore
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* STATUS LISTS */}
      {statusGroups.map((group) => (
        <section key={group.category} className={cardCls}>
          <div className="text-base font-semibold text-ink">{group.label}</div>
          <div className="mt-0.5 text-[13px] text-faint">{group.helper}</div>

          <div className="mt-5 grid grid-cols-[1fr_120px_34px] gap-2.5 px-0.5">
            <div className={labelCell}>Status</div>
            <div className={labelCell}>Order</div>
            <div />
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {(config?.options[group.category] || []).map((option) => (
              <div key={option.id} className="grid grid-cols-[1fr_120px_34px] items-center gap-2.5">
                <input
                  className={`${inputCls} font-medium`}
                  value={option.label}
                  onChange={(e) => updateOptionLocal(group.category, option.id, { label: e.target.value, value: e.target.value })}
                  onBlur={() => void saveOption(option)}
                />
                <input
                  className={`${inputCls} font-mono-ui`}
                  inputMode="numeric"
                  value={option.position}
                  onChange={(e) => updateOptionLocal(group.category, option.id, { position: Number(e.target.value) || 0 })}
                  onBlur={() => void saveOption(option)}
                />
                <button
                  type="button"
                  aria-label="Remove status"
                  onClick={() => void archiveOption(option.id)}
                  className="flex h-[42px] w-[34px] items-center justify-center rounded-[9px] border border-[rgba(44,40,31,.12)] bg-white text-faint transition hover:border-[#e6cdbf] hover:bg-[#F3E7E1] hover:text-[#A8694E]"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            <input
              className={`${inputCls} flex-1 border-dashed`}
              placeholder={group.placeholder}
              value={newOption[group.category] || ''}
              onChange={(e) => setNewOption((c) => ({ ...c, [group.category]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void createOption(group.category);
                }
              }}
            />
            <button
              type="button"
              onClick={() => void createOption(group.category)}
              className="h-[42px] shrink-0 rounded-[9px] bg-sky px-4 text-sm font-semibold text-white transition hover:bg-sky-hover"
            >
              Add
            </button>
          </div>
        </section>
      ))}

      {/* PICK-LISTS */}
      <section className={cardCls}>
        <div className="text-base font-semibold text-ink">Pick-lists</div>
        <div className="mt-0.5 text-[13px] text-faint">
          The fixed options that appear in request-form dropdowns. Add or retire options as the team changes.
        </div>

        {pickListGroups.map((group) => (
          <div key={group.category} className="border-t border-[rgba(44,40,31,.08)] py-5 first:border-t-0 first:pt-5">
            <div className="flex items-baseline gap-2.5">
              <div className="text-sm font-semibold text-ink">{group.label}</div>
              <div className="text-xs text-placeholder">{group.helper}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(config?.options[group.category] || []).map((option) => (
                <span
                  key={option.id}
                  className="flex h-[34px] items-center gap-2 rounded-pill border border-[rgba(44,40,31,.1)] bg-[#F2EDE3] py-0 pl-3.5 pr-1.5 text-[13.5px] font-medium text-ink"
                >
                  {option.label}
                  <button
                    type="button"
                    aria-label={`Remove ${option.label}`}
                    onClick={() => void archiveOption(option.id)}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E7DECF] text-faint transition hover:bg-[#e6cdbf] hover:text-[#A8694E]"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {(config?.options[group.category] || []).length === 0 && (
                <span className="py-1.5 text-[13px] text-placeholder">No options yet.</span>
              )}
            </div>
            <div className="mt-3 flex max-w-md gap-2">
              <input
                className={`${inputCls} h-[40px] flex-1`}
                placeholder={group.placeholder}
                value={newOption[group.category] || ''}
                onChange={(e) => setNewOption((c) => ({ ...c, [group.category]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void createOption(group.category);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void createOption(group.category)}
                className="h-[40px] shrink-0 rounded-[9px] border border-[rgba(44,40,31,.14)] bg-white px-4 text-sm font-semibold text-ink transition hover:border-[rgba(47,111,153,.3)]"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Settings;
