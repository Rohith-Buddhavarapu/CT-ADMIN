
import React, { useState, useRef, useEffect } from 'react';
import { Visitor, VisitorType, AuthUser } from '../types';
import * as XLSX from 'xlsx';

interface VisitorManagerProps {
  visitors: Visitor[];
  setVisitors: React.Dispatch<React.SetStateAction<Visitor[]>>;
  user: AuthUser;
}

const ID_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'Voter ID',
  'Employee ID',
  'Other Corporate ID',
  'Forgot ID Card'
];

const VisitorManager: React.FC<VisitorManagerProps> = ({ visitors, setVisitors, user }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [photo, setPhoto] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  
  const [newVis, setNewVis] = useState<{
    name: string, 
    purpose: string, 
    hostName: string, 
    idProofType: string,
    idProof: string, 
    type: VisitorType
  }>({ 
    name: '', 
    purpose: '', 
    hostName: '', 
    idProofType: 'Aadhaar Card',
    idProof: '', 
    type: 'General'
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const downloadVisitors = () => {
    const data = visitors.map(v => ({
      ID: v.id,
      Name: v.name,
      'ID Type': v.idProofType,
      'ID Number': v.idProof,
      Purpose: v.purpose,
      Host: v.hostName,
      'Check-In': v.checkIn,
      'Check-Out': v.checkOut || 'Active',
      Type: v.type
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Visitors");
    XLSX.writeFile(workbook, `Visitor_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    const initCamera = async () => {
      if (isCameraActive && !photo) {
        // Wait a bit to ensure videoRef is attached if it's not yet
        let attempts = 0;
        while (!videoRef.current && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!videoRef.current || !isCameraActive) return;

        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not available");
          }
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        setIsCameraActive(false);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeName(file.name);
    }
  };

  const handleCheckIn = () => {
    if (!newVis.name) return;
    const now = new Date();
    const v: Visitor = {
      id: `VIS-${Math.floor(Math.random() * 10000)}`,
      ...newVis,
      checkIn: now.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }),
      photo: photo || undefined,
      resume: resumeName || undefined
    };
    setVisitors([v, ...visitors]);
    resetForm();
    setShowAddForm(false);
  };

  const resetForm = () => {
    setNewVis({ name: '', purpose: '', hostName: '', idProofType: 'Aadhaar Card', idProof: '', type: 'General' });
    setPhoto(null);
    setResumeName(null);
    setIsCameraActive(false);
    stopCamera();
  };

  const handleCheckOut = (id: string) => {
    const now = new Date();
    setVisitors(visitors.map(v => v.id === id ? { ...v, checkOut: now.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }) } : v));
  };

  const getTypeColor = (type: VisitorType) => {
    switch (type) {
      case 'Vendor': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Interview': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:gap-6">
        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Enterprise Lobby Registry</h3>
        <div className="flex flex-wrap gap-3 md:gap-4 w-full sm:w-auto">
          {user.role === 'admin' && (
            <button 
              onClick={downloadVisitors}
              className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-emerald-700 transition flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-emerald-100/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          )}
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex-1 sm:flex-none bg-indigo-950 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-black transition flex items-center justify-center gap-2 md:gap-3 shadow-2xl shadow-indigo-100/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            Check-in
          </button>
        </div>
      </div>

      {/* Visitors List - Responsive Table/Cards */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile & ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Host & Purpose</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry / Exit Log</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitors.map((v) => (
                <tr key={v.id} className="hover:bg-indigo-50/30 transition duration-150">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {v.photo ? (
                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                          <img src={v.photo} alt={v.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold">
                          {v.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{v.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                          {v.idProofType}: {v.idProof}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border w-fit ${getTypeColor(v.type)}`}>
                        {v.type}
                      </span>
                      {v.resume && (
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span className="text-[9px] font-black uppercase">Resume Attached</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-700 leading-tight">{v.purpose}</p>
                    <p className="text-[10px] text-indigo-600 font-medium mt-1 uppercase tracking-tight">Host: {v.hostName}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Entry</span>
                        <span className="text-xs font-bold text-slate-600">{v.checkIn}</span>
                      </div>
                      {v.checkOut && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Exit</span>
                          <span className="text-xs font-bold text-slate-400">{v.checkOut}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {!v.checkOut ? (
                      <button 
                        onClick={() => handleCheckOut(v.id)}
                        className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition border border-transparent hover:border-red-100"
                      >
                        Process Exit
                      </button>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-widest">Access Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {visitors.map((v) => (
            <div key={v.id} className="p-6 active:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {v.photo ? (
                    <div className="w-14 h-14 rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                      <img src={v.photo} alt={v.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-xl">
                      {v.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-slate-900 leading-tight text-base tracking-tight mb-1">{v.name}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {v.idProofType}: {v.idProof}
                    </p>
                  </div>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${getTypeColor(v.type)}`}>
                  {v.type}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Host & Purpose</p>
                  <p className="text-xs font-black text-slate-800 tracking-tight leading-tight mb-1">{v.purpose}</p>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase">Host: {v.hostName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Entry Log</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">In</span>
                    <span className="text-[10px] font-bold text-slate-600">{v.checkIn}</span>
                  </div>
                  {v.checkOut && (
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-1 py-0.5 rounded border border-slate-100">Out</span>
                      <span className="text-[10px] font-bold text-slate-400">{v.checkOut}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {!v.checkOut ? (
                  <button 
                    onClick={() => handleCheckOut(v.id)}
                    className="flex-1 bg-rose-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition"
                  >
                    Authorize Exit
                  </button>
                ) : (
                  <div className="flex-1 bg-emerald-50 text-emerald-600 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-emerald-100">
                    Session Terminated
                  </div>
                )}
                {v.resume && (
                  <button className="px-5 bg-indigo-50 text-indigo-600 py-3.5 rounded-2xl transition active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[150] flex items-start md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
           <div className="bg-white w-full max-w-4xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-4 md:p-12 relative animate-in zoom-in duration-300 my-4 md:my-8">
             <button 
               onClick={() => { setShowAddForm(false); resetForm(); }} 
               className="absolute top-4 right-4 md:top-10 md:right-10 text-slate-500 hover:text-slate-900 transition p-2 md:p-3 hover:bg-slate-100 rounded-2xl z-50 bg-white/80 backdrop-blur-sm shadow-sm border border-slate-100"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>

             <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
               <div className="flex-1 space-y-6 md:space-y-8">
                 <div>
                   <h3 className="text-2xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight leading-none">Arrival Check-in</h3>
                   <p className="text-slate-500 font-medium tracking-tight">Enterprise Lobby Security Clearance</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visitor Classification</label>
                     <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-2xl">
                        {(['General', 'Vendor', 'Interview'] as VisitorType[]).map(type => (
                          <button 
                            key={type}
                            type="button"
                            onClick={() => setNewVis({...newVis, type})}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              newVis.type === type ? 'bg-indigo-950 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                     <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" placeholder="Visitor Name" value={newVis.name} onChange={e => setNewVis({...newVis, name: e.target.value})} />
                   </div>

                   <div className="space-y-2">
                     <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Proof Type</label>
                       <button 
                         type="button"
                         onClick={() => setNewVis({...newVis, idProofType: 'Forgot ID Card', idProof: 'PENDING_VERIFICATION'})}
                         className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                       >
                         Forgot ID?
                       </button>
                     </div>
                     <select 
                       className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold appearance-none cursor-pointer"
                       value={newVis.idProofType}
                       onChange={e => setNewVis({...newVis, idProofType: e.target.value})}
                     >
                       {ID_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                     </select>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID Number / Reference</label>
                     <input 
                       className={`w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold ${newVis.idProofType === 'Forgot ID Card' ? 'opacity-50' : ''}`} 
                       placeholder={newVis.idProofType === 'Forgot ID Card' ? 'Verification Required' : 'Reference Number'} 
                       value={newVis.idProof} 
                       onChange={e => setNewVis({...newVis, idProof: e.target.value})}
                       disabled={newVis.idProofType === 'Forgot ID Card'}
                     />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Host Representative</label>
                     <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" placeholder="Internal Employee" value={newVis.hostName} onChange={e => setNewVis({...newVis, hostName: e.target.value})} />
                   </div>

                   <div className="md:col-span-2 space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose of Visit</label>
                     <input className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold" placeholder="Meeting / Delivery / Support" value={newVis.purpose} onChange={e => setNewVis({...newVis, purpose: e.target.value})} />
                   </div>

                   {newVis.type === 'Interview' && (
                     <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Resume / Portfolio Upload</label>
                        <label className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 cursor-pointer group hover:bg-indigo-100/50 transition-all">
                           <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                           </div>
                           <div className="flex-1">
                             <p className="text-sm font-bold text-indigo-900">{resumeName || "Attach Digital CV"}</p>
                             <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">PDF or Word Documents</p>
                           </div>
                        </label>
                     </div>
                   )}
                 </div>
               </div>

               <div className="lg:w-80 space-y-6">
                 <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 relative group min-h-[300px] flex flex-col justify-center items-center text-center overflow-hidden">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 absolute top-6 left-6 z-10">Visual ID Capture</label>
                   
                   {isCameraActive ? (
                     <div className="w-full space-y-4">
                        <div className="relative">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-56 object-cover rounded-2xl border-4 border-white shadow-2xl" />
                          <button 
                            type="button" 
                            onClick={toggleCamera}
                            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-slate-100 text-indigo-600 hover:bg-white transition-all active:scale-95"
                            title="Switch Camera"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                          </button>
                        </div>
                        <button onClick={capturePhoto} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg">Take Snapshot</button>
                     </div>
                   ) : photo ? (
                     <div className="w-full relative group">
                       <img src={photo} alt="Visitor Snapshot" className="w-full h-56 object-cover rounded-2xl border-4 border-white shadow-2xl" />
                       <button onClick={() => setPhoto(null)} className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                       </button>
                       <div className="mt-4 inline-flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Image Verified</span>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-6 w-full">
                        <div className="w-20 h-20 bg-white rounded-[2rem] border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm mx-auto">
                           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        </div>
                        <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => setIsCameraActive(true)} 
                            className="w-full bg-indigo-950/5 hover:bg-indigo-950 hover:text-white text-indigo-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                          >
                            Activate Security Cam
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-200"></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">OR</span>
                            <div className="flex-1 h-px bg-slate-200"></div>
                          </div>

                          <label className="w-full bg-indigo-950/5 hover:bg-indigo-950 hover:text-white text-indigo-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer text-center">
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                            Upload Photo File
                          </label>
                        </div>
                     </div>
                   )}
                 </div>

                 <div className="bg-indigo-950 p-8 rounded-[2.5rem] shadow-2xl text-white space-y-4">
                    <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Security Protocol</p>
                    <p className="text-sm font-medium leading-relaxed">
                      Lobby management automatically logs precise entry/exit timestamps. Ensure identity proof matches the selected type.
                    </p>
                 </div>

                 <button 
                   onClick={handleCheckIn}
                   className="w-full bg-indigo-950 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition shadow-2xl shadow-indigo-100"
                 >
                   Authorize Entry
                 </button>
               </div>
             </div>

             <canvas ref={canvasRef} className="hidden" />
           </div>
        </div>
      )}
    </div>
  );
};

export default VisitorManager;
