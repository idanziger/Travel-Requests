import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, Briefcase, ChevronLeft, RefreshCw, Clock, CheckCircle, XCircle, Info, UserCircle, ChevronDown, ChevronRight, FileText, PlusCircle, Check, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: number;
  task_name: string;
  status: string;
}

interface TravelRequest {
  id: number;
  traveler_name: string;
  event_name: string;
  department: string;
  budget_code: string;
  notes: string;
  approver_notes?: string;
  request_date: string;
  start_date: string;
  end_date: string;
  status: string;
  requester_name?: string;
  requester_email?: string;
  tasks?: Task[];
}

function Dashboard({ userId, userRole }: { userId?: string, userRole?: string }) {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingNotes, setEditingNotes] = useState<{ [key: number]: string }>({});
  const isManager = userRole === 'manager' || userRole === 'admin';

  const fetchRequests = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/requests?userId=${userId}`);
      const data = Array.isArray(response.data) ? response.data : [];
      const withTasks = await Promise.all(data.map(async (req: any) => {
        try {
          const tasksRes = await axios.get(`http://localhost:3001/api/requests/${req.id}/tasks`);
          return { ...req, tasks: tasksRes.data };
        } catch (e) { return { ...req, tasks: [] }; }
      }));
      setRequests(withTasks);
      
      // Initialize editing notes
      const notesMap: any = {};
      withTasks.forEach(r => { notesMap[r.id] = r.approver_notes || ''; });
      setEditingNotes(notesMap);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`http://localhost:3001/api/requests/${id}/status`, { 
        status, 
        managerId: userId,
        approver_notes: editingNotes[id]
      });
      fetchRequests();
    } catch (e) { alert('Update failed'); }
  };

  const saveApproverNotes = async (id: number) => {
    try {
      await axios.patch(`http://localhost:3001/api/requests/${id}/status`, { 
        managerId: userId,
        approver_notes: editingNotes[id]
      });
      alert('Notes saved successfully');
    } catch (e) { alert('Failed to save notes'); }
  };

  const toggleTask = async (reqId: number, taskId: number, current: string) => {
    const status = current === 'Done' ? 'Not Started' : 'Done';
    try {
      await axios.patch(`http://localhost:3001/api/tasks/${taskId}`, { status });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, tasks: r.tasks?.map(t => t.id === taskId ? { ...t, status } : t) } : r));
    } catch (e) {}
  };

  const addCustomTask = async (reqId: number) => {
    if (!newTaskName.trim()) return;
    try {
      const res = await axios.post(`http://localhost:3001/api/requests/${reqId}/tasks`, { task_name: newTaskName });
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, tasks: [...(r.tasks || []), res.data] } : r));
      setNewTaskName('');
    } catch (e) { alert('Failed to add expense'); }
  };

  useEffect(() => { fetchRequests(); }, [userId]);

  const groups = [
    { name: 'New Requests', status: 'Pending', color: 'indigo' },
    { name: 'Need More Information', status: 'Need More Info', color: 'amber' },
    { name: 'Approved', status: 'Approved', color: 'emerald' },
    { name: 'Rejected', status: 'Rejected', color: 'rose' },
  ];

  return (
    <div className="min-h-screen bg-[#1a1b2e] text-slate-200 p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <a href="/" className="bg-slate-800 p-2 rounded-lg border border-slate-700"><ChevronLeft size={20} /></a>
          <h1 className="text-2xl font-bold text-white tracking-tight">Travel Board</h1>
        </div>
        <button onClick={fetchRequests} className="bg-indigo-600 hover:bg-indigo-700 font-bold py-2 px-6 rounded-lg flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="w-full max-w-7xl space-y-10">
        {groups.map(group => {
          const groupReqs = requests.filter(r => (r.status || 'Pending') === group.status);
          if (groupReqs.length === 0 && group.status !== 'Pending') return null;

          return (
            <div key={group.name} className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{group.name} ({groupReqs.length})</h3>
              <div className="bg-[#242645] rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#1a1b2e] text-[9px] text-slate-500 uppercase font-bold border-b border-slate-700">
                    <tr>
                      <th className="p-4 w-10"></th>
                      <th className="px-6 py-4">Traveler</th>
                      {isManager && <th className="px-6 py-4">Requester</th>}
                      <th className="px-6 py-4">Event / Cost Center</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      {isManager && <th className="px-6 py-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {groupReqs.map(req => (
                      <React.Fragment key={req.id}>
                        <tr className="hover:bg-slate-700/20">
                          <td className="p-4">
                            <button onClick={() => setExpandedId(expandedId === req.id ? null : req.id)} className="text-slate-500 hover:text-white">
                              {expandedId === req.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{req.traveler_name}</div>
                            <div className="text-[10px] text-slate-500">{req.request_date ? format(new Date(req.request_date), 'MMM d, yyyy') : '---'}</div>
                          </td>
                          {isManager && <td className="px-6 py-4 text-xs text-slate-400">{req.requester_name || 'System'}</td>}
                          <td className="px-6 py-4 text-sm text-slate-300">
                            <div>{req.event_name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-indigo-400/20">{req.department}</span>
                              <span className="text-[10px] font-bold text-slate-500">{req.budget_code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${
                              group.status === 'Approved' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                              group.status === 'Rejected' ? 'text-rose-400 border-rose-400/20 bg-rose-400/5' :
                              group.status === 'Need More Info' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-indigo-400 border-indigo-400/20 bg-indigo-400/5'
                            }`}>{req.status}</span>
                          </td>
                          {isManager && (
                            <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2">
                              <button onClick={() => updateStatus(req.id, 'Approved')} className="p-1 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded border border-emerald-500/20" title="Approve"><CheckCircle size={16} /></button>
                              <button onClick={() => updateStatus(req.id, 'Need More Info')} className="p-1 text-amber-500 hover:bg-amber-500 hover:text-white rounded border border-amber-500/20" title="Need Info"><Info size={16} /></button>
                              <button onClick={() => updateStatus(req.id, 'Rejected')} className="p-1 text-rose-500 hover:bg-rose-500 hover:text-white rounded border border-rose-500/20" title="Reject"><XCircle size={16} /></button>
                            </div></td>
                          )}
                        </tr>
                        {expandedId === req.id && (
                          <tr className="bg-[#1a1b2e]/60">
                            <td colSpan={isManager ? 6 : 4} className="p-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested Expenses</h4>
                                    <div className="space-y-2">
                                      {(req.tasks || []).map(task => (
                                        <button key={task.id} onClick={() => toggleTask(req.id, task.id, task.status)} className="w-full flex items-center justify-between p-3 bg-[#242645] rounded-lg border border-slate-700/50 hover:border-slate-500 transition-all">
                                          <span className="text-sm">{task.task_name}</span>
                                          {task.status === 'Done' ? <CheckCircle size={18} className="text-emerald-500" /> : <Clock size={18} className="text-slate-600" />}
                                        </button>
                                      ))}
                                      <div className="flex gap-2 mt-4">
                                        <input type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Add custom expense..." className="flex-1 bg-[#1a1b2e] border border-slate-700 rounded-lg px-3 py-2 text-xs outline-none" />
                                        <button onClick={() => addCustomTask(req.id)} className="bg-slate-700 p-2 rounded-lg hover:bg-indigo-600"><PlusCircle size={18} /></button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Submitter Notes</h4>
                                    <div className="text-sm text-slate-400 bg-[#242645] p-4 rounded-lg border border-slate-700/50 italic leading-relaxed whitespace-pre-wrap min-h-[80px]">
                                      {req.notes || 'No notes provided by submitter.'}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
                                      Approver / Internal Notes
                                      {isManager && (
                                        <button onClick={() => saveApproverNotes(req.id)} className="text-indigo-400 hover:text-white flex items-center gap-1 transition-colors">
                                          <Save size={12} /> Save Notes
                                        </button>
                                      )}
                                    </h4>
                                    {isManager ? (
                                      <textarea 
                                        value={editingNotes[req.id] || ''}
                                        onChange={(e) => setEditingNotes({...editingNotes, [req.id]: e.target.value})}
                                        placeholder="Add internal notes or requirements for more info..."
                                        className="w-full bg-[#1a1b2e] border border-slate-700 rounded-lg p-4 text-sm text-slate-300 outline-none focus:border-indigo-500 min-h-[100px] transition-all"
                                      />
                                    ) : (
                                      <div className="text-sm text-indigo-300 bg-indigo-500/5 p-4 rounded-lg border border-indigo-500/20 italic leading-relaxed whitespace-pre-wrap min-h-[80px]">
                                        {req.approver_notes || 'No approver notes yet.'}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
