import { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Trash2, PlusCircle } from 'lucide-react';
import type { EventItem, OptionItem } from '../types';

type ConfigPayload = {
  options: Record<string, OptionItem[]>;
  events: EventItem[];
};

const categoryLabels: Record<string, string> = {
  department: 'Departments',
  cost_center: 'Cost Centers',
  budget: 'Budgets',
  daily_role: 'Daily Roles',
  data_status: 'Data Statuses',
  approval_status: 'Approval Statuses',
};

function Settings() {
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [newOption, setNewOption] = useState<Record<string, string>>({});
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    event_status: 'Pre Event',
    start_date: '',
    end_date: '',
  });

  const loadConfig = async () => {
    const response = await axios.get('/api/config');
    setConfig(response.data);
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveOption = async (option: OptionItem) => {
    await axios.patch(`/api/options/item/${option.id}`, option);
    await loadConfig();
  };

  const archiveOption = async (id: number) => {
    await axios.delete(`/api/options/item/${id}`);
    await loadConfig();
  };

  const createOption = async (category: string) => {
    const label = newOption[category]?.trim();
    if (!label) return;
    await axios.post(`/api/options/${category}`, { label, value: label });
    setNewOption((current) => ({ ...current, [category]: '' }));
    await loadConfig();
  };

  const saveEvent = async (event: EventItem) => {
    await axios.patch(`/api/events/${event.id}`, event);
    await loadConfig();
  };

  const archiveEvent = async (id: number) => {
    await axios.delete(`/api/events/${id}`);
    await loadConfig();
  };

  const createEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.location.trim()) return;
    await axios.post('/api/events', newEvent);
    setNewEvent({ name: '', location: '', event_status: 'Pre Event', start_date: '', end_date: '' });
    await loadConfig();
  };

  return (
    <div className="w-full max-w-7xl space-y-8">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300/75">Admin Settings</div>
        <h1 className="mt-2 text-3xl font-semibold text-white" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>
          Workflow Configuration
        </h1>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-[#0f1729]/90 p-8 shadow-[0_40px_120px_rgba(7,12,28,0.45)] backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl text-white">Events</h2>
          <div className="text-sm text-slate-500">Event location is derived directly from the event record.</div>
        </div>
        <div className="space-y-4">
          {config?.events.map((event) => (
            <div key={event.id} className="grid gap-4 rounded-2xl border border-white/10 bg-[#08101d] p-4 lg:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_auto]">
              <input value={event.name} onChange={(e) => setConfig((current) => current ? ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, name: e.target.value } : item) }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
              <input value={event.location} onChange={(e) => setConfig((current) => current ? ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, location: e.target.value } : item) }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
              <input value={event.event_status || ''} onChange={(e) => setConfig((current) => current ? ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, event_status: e.target.value } : item) }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
              <input type="date" value={event.start_date || ''} onChange={(e) => setConfig((current) => current ? ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, start_date: e.target.value } : item) }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
              <input type="date" value={event.end_date || ''} onChange={(e) => setConfig((current) => current ? ({ ...current, events: current.events.map((item) => item.id === event.id ? { ...item, end_date: e.target.value } : item) }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
              <div className="flex gap-2">
                <button onClick={() => void saveEvent(event)} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200"><Save size={16} /></button>
                <button onClick={() => void archiveEvent(event.id)} className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-rose-200"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          <div className="grid gap-4 rounded-2xl border border-dashed border-white/10 bg-[#08101d] p-4 lg:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.7fr_auto]">
            <input value={newEvent.name} onChange={(e) => setNewEvent((current) => ({ ...current, name: e.target.value }))} placeholder="New event name" className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
            <input value={newEvent.location} onChange={(e) => setNewEvent((current) => ({ ...current, location: e.target.value }))} placeholder="Location" className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
            <input value={newEvent.event_status} onChange={(e) => setNewEvent((current) => ({ ...current, event_status: e.target.value }))} placeholder="Status" className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
            <input type="date" value={newEvent.start_date} onChange={(e) => setNewEvent((current) => ({ ...current, start_date: e.target.value }))} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
            <input type="date" value={newEvent.end_date} onChange={(e) => setNewEvent((current) => ({ ...current, end_date: e.target.value }))} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
            <button onClick={() => void createEvent()} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200"><PlusCircle size={16} /></button>
          </div>
        </div>
      </section>

      {Object.entries(categoryLabels).map(([category, label]) => (
        <section key={category} className="rounded-[28px] border border-white/10 bg-[#0f1729]/90 p-8 shadow-[0_40px_120px_rgba(7,12,28,0.45)] backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl text-white">{label}</h2>
          </div>
          <div className="space-y-4">
            {(config?.options[category] || []).map((option) => (
              <div key={option.id} className="grid gap-4 rounded-2xl border border-white/10 bg-[#08101d] p-4 md:grid-cols-[1fr_0.7fr_auto]">
                <input value={option.label} onChange={(e) => setConfig((current) => current ? ({ ...current, options: { ...current.options, [category]: current.options[category].map((item) => item.id === option.id ? { ...item, label: e.target.value, value: e.target.value } : item) } }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
                <input type="number" value={option.position} onChange={(e) => setConfig((current) => current ? ({ ...current, options: { ...current.options, [category]: current.options[category].map((item) => item.id === option.id ? { ...item, position: Number(e.target.value) } : item) } }) : current)} className="rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => void saveOption(option)} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200"><Save size={16} /></button>
                  <button onClick={() => void archiveOption(option.id)} className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-rose-200"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            <div className="flex gap-3 rounded-2xl border border-dashed border-white/10 bg-[#08101d] p-4">
              <input value={newOption[category] || ''} onChange={(e) => setNewOption((current) => ({ ...current, [category]: e.target.value }))} placeholder={`Add ${label.slice(0, -1)}`} className="flex-1 rounded-2xl border border-white/10 bg-[#0f1729] px-4 py-3 text-white outline-none" />
              <button onClick={() => void createOption(category)} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200"><PlusCircle size={16} /></button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default Settings;
