
import React, { useState, useRef, useEffect } from 'react';
import { BMSIssue, Priority, IssueStatus, AuthUser } from '../types';
import { classifyIssue } from '../services/geminiService';
import * as XLSX from 'xlsx';

interface BMSManagerProps {
  issues: BMSIssue[];
  setIssues: React.Dispatch<React.SetStateAction<BMSIssue[]>>;
  user: AuthUser;
}

const BMSManager: React.FC<BMSManagerProps> = ({ issues, setIssues, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({ 
    title: '', 
    description: '', 
    location: '', 
    issueDate: new Date().toISOString().split('T')[0],
    issueEndDate: '',
    status: IssueStatus.OPEN,
    priority: Priority.MEDIUM
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const downloadIssues = () => {
    const data = issues.map(issue => ({
      ID: issue.id,
      Title: issue.title,
      Description: issue.description,
      Location: issue.location,
      Priority: issue.priority,
      Status: issue.status,
      'Reported Date': issue.issueDate,
      'Resolved Date': issue.issueEndDate || 'N/A',
      Category: issue.facilityCategory
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BMS Issues");
    XLSX.writeFile(workbook, `BMS_Issues_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    const initCamera = async () => {
      if (isCameraActive && !photo) {
        // Wait a bit to ensure videoRef is attached if it's not yet
        if (!videoRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!videoRef.current) return;

        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facingMode } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Video play failed", e));
          }
        } catch (err) {
          console.error("Camera access denied", err);
          // Try fallback without facingMode if it failed
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(e => console.error("Video play failed", e));
            }
          } catch (fallbackErr) {
            console.error("Fallback camera access denied", fallbackErr);
            setIsCameraActive(false);
          }
        }
      }
    };

    initCamera();

    return () => {
      stopCamera();
    };
  }, [isCameraActive, photo, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setPhoto(dataUrl);
        setIsCameraActive(false);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddIssue = async () => {
    if (!newIssue.title || !newIssue.description) return;

    setIsClassifying(true);
    const suggestion = await classifyIssue(newIssue.description);
    setIsClassifying(false);

    const validCategories = ['MEP Systems', 'Environmental Control', 'Life Safety', 'Critical Power', 'Civil & Structural'];
    const suggestedCategory = suggestion?.category || '';
    const category = validCategories.find(c => suggestedCategory.toLowerCase().includes(c.toLowerCase())) || 'Civil & Structural';

    const validPriorities = Object.values(Priority);
    const suggestedPriority = suggestion?.priority || '';
    const aiPriority = (validPriorities.find(p => suggestedPriority.toLowerCase() === p.toLowerCase()) as Priority);
    
    // Use user-selected priority if they changed it, otherwise use AI suggestion or default
    const priority = newIssue.priority || aiPriority || Priority.MEDIUM;

    const issue: BMSIssue = {
      id: `BMS-FAC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newIssue.title,
      description: newIssue.description,
      location: newIssue.location,
      priority: priority,
      status: newIssue.status,
      issueDate: newIssue.issueDate,
      issueEndDate: newIssue.status === IssueStatus.RESOLVED ? (newIssue.issueEndDate || new Date().toISOString().split('T')[0]) : undefined,
      facilityCategory: category as any,
      photo: photo || undefined
    };

    setIssues([issue, ...issues]);
    setNewIssue({ 
      title: '', 
      description: '', 
      location: '', 
      issueDate: new Date().toISOString().split('T')[0],
      issueEndDate: '',
      status: IssueStatus.OPEN,
      priority: Priority.MEDIUM
    });
    setPhoto(null);
    setIsModalOpen(false);
  };

  const updateIssueStatus = (id: string, newStatus: IssueStatus) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return {
          ...issue,
          status: newStatus,
          issueEndDate: newStatus === IssueStatus.RESOLVED ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return issue;
    }));
  };

  const filteredIssues = issues.filter(issue => {
    const priorityMatch = filterPriority === 'All' || issue.priority === filterPriority;
    const statusMatch = filterStatus === 'All' || issue.status === filterStatus;
    return priorityMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:gap-6">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">BMS Incident Log</h3>
        <div className="flex flex-wrap gap-3 md:gap-4 w-full sm:w-auto">
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <select 
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-3 py-2 outline-none cursor-pointer"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="w-px h-4 bg-slate-200 self-center"></div>
            <select 
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-3 py-2 outline-none cursor-pointer"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {user.role === 'admin' && (
            <button 
              onClick={downloadIssues}
              className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-emerald-700 transition flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-emerald-100/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none bg-indigo-950 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-black transition flex items-center justify-center gap-2 md:gap-3 shadow-2xl shadow-indigo-100/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M15 14h5l-8 8-8-8h5V4h6v10z"/></svg>
            New Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {filteredIssues.map((issue) => (
          <div key={issue.id} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div className="flex flex-col gap-1.5 md:gap-2">
                <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] px-2 md:px-3 py-1 md:py-1.5 rounded-full border w-fit ${
                  issue.priority === Priority.CRITICAL ? 'text-red-700 bg-red-50 border-red-100' : 'text-indigo-700 bg-indigo-50 border-indigo-100'
                }`}>
                  {issue.priority} Priority
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{issue.id}</span>
              </div>
              <div className="text-right">
                <select 
                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-1 outline-none cursor-pointer transition-colors ${
                    issue.status === IssueStatus.RESOLVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                  value={issue.status}
                  onChange={e => updateIssueStatus(issue.id, e.target.value as IssueStatus)}
                >
                  {Object.values(IssueStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-4 md:gap-6 mb-6">
              {issue.photo && (
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                  <img src={issue.photo} alt="Incident Evidence" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 text-base md:text-lg leading-tight mb-1 md:mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{issue.title}</h4>
                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">{issue.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50 mb-4">
              <div>
                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reported</p>
                <p className="text-[10px] md:text-xs font-bold text-slate-700">{issue.issueDate}</p>
              </div>
              {issue.issueEndDate && (
                <div>
                  <p className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Resolved</p>
                  <p className="text-[10px] md:text-xs font-bold text-emerald-700">{issue.issueEndDate}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 md:p-2 bg-slate-50 rounded-lg text-slate-400 border border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-3.5 md:h-3.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-600 tracking-tight truncate max-w-[100px] md:max-w-none">{issue.location}</span>
              </div>
              <div className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border ${
                issue.status === IssueStatus.RESOLVED ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
              }`}>
                 <span className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${issue.status === IssueStatus.RESOLVED ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                 <span className="text-[8px] md:text-[9px] font-black text-slate-900 uppercase tracking-widest">{issue.status === IssueStatus.RESOLVED ? 'Resolved' : 'Active'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-start md:items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto no-scrollbar">
          <div className="bg-white w-full max-w-5xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-4 md:p-12 relative animate-in zoom-in duration-300 my-4 md:my-8">
            <button 
              onClick={() => { setIsModalOpen(false); stopCamera(); }} 
              className="absolute top-3 right-3 md:top-10 md:right-10 text-slate-500 hover:text-white hover:bg-indigo-600 transition-all p-2 md:p-3 rounded-xl md:rounded-2xl z-50 bg-white shadow-xl border border-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div className="flex flex-col lg:flex-row gap-8 md:gap-12">
              <div className="flex-1 space-y-6 md:space-y-8">
                <div className="pr-10 md:pr-0">
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 mb-1 md:mb-2 tracking-tight leading-tight">Report BMS Issue</h3>
                  <p className="text-slate-500 text-xs md:text-base font-medium tracking-tight">Enterprise facility incident documentation & timeline tracking</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Incident Headline</label>
                    <input type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold text-lg focus:border-indigo-600 transition-colors" placeholder="e.g. AC Failure in Server Room" value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technical Description</label>
                    <textarea rows={3} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors" placeholder="Explain the functional failure..." value={newIssue.description} onChange={e => setNewIssue({...newIssue, description: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reported Date</label>
                      <input type="date" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors" value={newIssue.issueDate} onChange={e => setNewIssue({...newIssue, issueDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precise Campus Location</label>
                      <input type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors" placeholder="Floor / Zone / Unit" value={newIssue.location} onChange={e => setNewIssue({...newIssue, location: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Incident Priority</label>
                      <select 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors cursor-pointer"
                        value={newIssue.priority}
                        onChange={e => setNewIssue({...newIssue, priority: e.target.value as Priority})}
                      >
                        {Object.values(Priority).map(p => (
                          <option key={p} value={p}>{p} Priority</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolution Status</label>
                      <select 
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors cursor-pointer"
                        value={newIssue.status}
                        onChange={e => setNewIssue({...newIssue, status: e.target.value as IssueStatus})}
                      >
                        <option value={IssueStatus.OPEN}>Open (Action Required)</option>
                        <option value={IssueStatus.IN_PROGRESS}>In Progress</option>
                        <option value={IssueStatus.RESOLVED}>Resolved (Completed)</option>
                      </select>
                    </div>
                    <div className={`space-y-2 transition-opacity duration-300 ${newIssue.status === IssueStatus.RESOLVED ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Resolution Date</label>
                      <input type="date" className="w-full px-6 py-4 rounded-2xl bg-emerald-50 border border-emerald-100 outline-none font-bold text-emerald-900 focus:border-emerald-600 transition-colors" value={newIssue.issueEndDate} onChange={e => setNewIssue({...newIssue, issueEndDate: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:w-80 space-y-6">
                <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 overflow-hidden relative group min-h-[300px] flex flex-col justify-center items-center text-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 absolute top-6 left-6">Site Evidence</label>
                  
                  {isCameraActive ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="relative mb-4">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover rounded-2xl border border-indigo-200 shadow-inner" />
                        <button 
                          type="button" 
                          onClick={toggleCamera}
                          className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-100 text-indigo-600 hover:bg-white transition-all active:scale-95"
                          title="Switch Camera"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M21 12c0-1.66-4-3-9-3s-9 1.34-9 3"/><path d="M3 5c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                        </button>
                      </div>
                      <button onClick={capturePhoto} className="bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition">Capture Snapshot</button>
                    </div>
                  ) : photo ? (
                    <div className="w-full h-full relative group">
                      <img src={photo} alt="Evidence" className="w-full h-48 object-cover rounded-2xl border border-indigo-100" />
                      <button onClick={() => setPhoto(null)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                      <p className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white border border-indigo-50 px-3 py-2 rounded-xl">Document Attached</p>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-300 mx-auto group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setIsCameraActive(true)} className="text-[10px] font-black text-indigo-950 uppercase tracking-widest hover:text-indigo-600 transition">Open System Camera</button>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">or</span>
                        <label className="text-[10px] font-black text-indigo-950 uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition">
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          Upload Evidence File
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white flex-shrink-0">i</div>
                    <p className="text-[10px] font-bold text-indigo-900 leading-relaxed">
                      AI analysis will suggest categorization and priority levels based on your technical description and photo evidence.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleAddIssue}
                    disabled={isClassifying}
                    className="w-full bg-indigo-950 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition shadow-2xl shadow-indigo-100 disabled:opacity-50"
                  >
                    {isClassifying ? 'Analyzing Dispatch...' : 'Authorize Dispatch'}
                  </button>
                  <button 
                    onClick={() => { setIsModalOpen(false); stopCamera(); }}
                    className="w-full bg-white text-slate-400 py-4 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:text-slate-600 transition"
                  >
                    Cancel Report
                  </button>
                </div>
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BMSManager;
