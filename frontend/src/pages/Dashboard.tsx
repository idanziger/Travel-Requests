import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, ChevronDown, ChevronRight, Info, RefreshCw, Save, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { AuthUser, TravelRequest } from '../types';

const statusGroups = [
  { name: 'Awaiting Response', status: 'Awaiting Response' },
  { name: 'Need More Information', status: 'Need More Information' },
  { name: 'Approved', status: 'Approved' },
  { name: 'Not Approved', status: 'Not Approved' },
];

function Dashboard({ user }: { user: AuthUser }) {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  const canAct = user.role === 'admin';

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

  const updateStatus = async (id: number, status: string) => {
    await axios.patch(`/api/requests/${id}/status`, {
      status,
      approver_notes: editingNotes[id],
    });
    await fetchRequests();
  };

  const saveApproverNotes = async (id: number) => {
    await axios.patch(`/api/requests/${id}/status`, {
      approver_notes: editingNotes[id],
    });
    await fetchRequests();
  };

  return (
    <div className="w-full max-w-7xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/75">Live Queue</div>
          <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif' }}>
            Travel Board
          </h1>
        </div>
        <button onClick={() => void fetchRequests()} className="flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-2.5 font-bold text-cyan-100">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {statusGroups.map((group) => {
        const rows = requests.filter((request) => (request.status || 'Awaiting Response') === group.status);
        if (rows.length === 0 && group.status !== 'Awaiting Response') {
          return null;
        }

        return (
          <section key={group.status} className="space-y-4">
            <h2 className="px-2 text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">{group.name} ({rows.length})</h2>
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1729]/85 shadow-[0_40px_120px_rgba(7,12,28,0.45)]">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 bg-[#09101f] text-[9px] uppercase text-slate-500">
                  <tr>
                    <th className="w-10 p-4"></th>
                    <th className="px-6 py-4">Traveler</th>
                    <th className="px-6 py-4">Requester</th>
                    <th className="px-6 py-4">Event / Controls</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    {canAct && <th className="px-6 py-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((request) => (
                    <React.Fragment key={request.id}>
                      <tr className="hover:bg-white/3">
                        <td className="p-4">
                          <button onClick={() => setExpandedId((current) => current === request.id ? null : request.id)} className="text-slate-500 hover:text-white">
                            {expandedId === request.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{request.traveler_name}</div>
                          <div className="text-[10px] text-slate-500">{request.traveler_email || 'No traveler email stored'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          <div>{request.requester_name || 'Unknown'}</div>
                          <div className="mt-1 text-[10px] text-slate-500">{request.requester_email || ''}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <div>{request.event_name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {request.event_location && <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200">{request.event_location}</span>}
                            {request.department && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.24em] text-slate-300">{request.department}</span>}
                            {request.cost_center && <span className="text-[10px] text-slate-500">{request.cost_center}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {request.submitted_at ? format(new Date(request.submitted_at), 'MMM d, yyyy') : request.request_date ? format(new Date(request.request_date), 'MMM d, yyyy') : '---'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.28em] ${
                            request.status === 'Approved'
                              ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300'
                              : request.status === 'Not Approved'
                                ? 'border-rose-400/20 bg-rose-400/5 text-rose-300'
                                : request.status === 'Need More Information'
                                  ? 'border-amber-400/20 bg-amber-400/5 text-amber-300'
                                  : 'border-cyan-300/20 bg-cyan-300/5 text-cyan-200'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        {canAct && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => void updateStatus(request.id, 'Approved')} className="rounded border border-emerald-500/20 p-1 text-emerald-500 hover:bg-emerald-500 hover:text-white"><CheckCircle size={16} /></button>
                              <button onClick={() => void updateStatus(request.id, 'Need More Information')} className="rounded border border-amber-500/20 p-1 text-amber-500 hover:bg-amber-500 hover:text-white"><Info size={16} /></button>
                              <button onClick={() => void updateStatus(request.id, 'Not Approved')} className="rounded border border-rose-500/20 p-1 text-rose-500 hover:bg-rose-500 hover:text-white"><XCircle size={16} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {expandedId === request.id && (
                        <tr className="bg-[#09101f]/55">
                          <td colSpan={canAct ? 7 : 6} className="p-8">
                            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                              <div className="space-y-6">
                                <div>
                                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Daily Schedule</div>
                                  <div className="space-y-3">
                                    {request.days.map((day) => (
                                      <div key={day.day_index} className="grid gap-3 rounded-2xl border border-white/10 bg-[#0f1729] p-4 md:grid-cols-[0.7fr_1fr_1fr]">
                                        <div>
                                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Day {day.day_index}</div>
                                          <div className="mt-2 text-white">{format(new Date(day.day_date), 'MMM d, yyyy')}</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Morning</div>
                                          <div className="mt-2 text-sm text-white">{day.morning_role || 'Not set'}</div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Evening</div>
                                          <div className="mt-2 text-sm text-white">{day.evening_role || 'Not set'}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-[#0f1729] p-4">
                                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Submitter Notes</div>
                                  <div className="whitespace-pre-wrap text-sm text-slate-400">{request.notes || 'No submitter notes.'}</div>
                                </div>
                              </div>
                              <div className="space-y-6">
                                <div className="rounded-2xl border border-white/10 bg-[#0f1729] p-4">
                                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Request Details</div>
                                  <div className="space-y-2 text-sm text-slate-400">
                                    <div><span className="text-slate-500">Date range:</span> {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}</div>
                                    <div><span className="text-slate-500">Total days:</span> {request.total_days || request.days.length}</div>
                                    {request.budget && <div><span className="text-slate-500">Budget:</span> {request.budget}</div>}
                                    {request.cost_center && <div><span className="text-slate-500">Cost Center:</span> {request.cost_center}</div>}
                                    {request.data_status && <div><span className="text-slate-500">Status of data:</span> {request.data_status}</div>}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Approver / Internal Notes</div>
                                    {canAct && (
                                      <button onClick={() => void saveApproverNotes(request.id)} className="flex items-center gap-1 text-cyan-300 transition hover:text-white">
                                        <Save size={12} /> Save
                                      </button>
                                    )}
                                  </div>
                                  {canAct ? (
                                    <textarea
                                      value={editingNotes[request.id] || ''}
                                      onChange={(e) => setEditingNotes((current) => ({ ...current, [request.id]: e.target.value }))}
                                      className="min-h-[160px] w-full rounded-2xl border border-white/10 bg-[#08101d] p-4 text-sm text-slate-300 outline-none focus:border-cyan-400"
                                    />
                                  ) : (
                                    <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-sm italic text-cyan-100">
                                      {request.approver_notes || 'No approver notes yet.'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default Dashboard;
