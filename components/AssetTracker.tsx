
import React, { useState, useRef, useEffect } from 'react';
import { Asset, AssetHistoryItem } from '../types';
import * as XLSX from 'xlsx';

interface AssetTrackerProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

const STATUS_OPTIONS = ['Active', 'Under Repair', 'Repaired', 'Retired', 'Expired'];

const AssetTracker: React.FC<AssetTrackerProps> = ({ assets, setAssets }) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Asset>({
    id: '',
    name: '',
    location: '',
    warrantyStart: '',
    warrantyEnd: '',
    employeeName: '',
    employeeId: '',
    photo: '',
    status: 'Active',
    history: []
  });

  const [historyForm, setHistoryForm] = useState<Omit<AssetHistoryItem, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Repair',
    description: '',
    performer: ''
  });

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getWarrantyStatus = (endDate: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: '🚨', shadow: 'shadow-rose-100' };
    if (diffDays <= 30) return { label: 'Expiring Soon', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: '⚠️', shadow: 'shadow-amber-100' };
    return { label: 'In Warranty', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: '🛡️', shadow: 'shadow-emerald-100' };
  };

  const filteredAssets = assets.filter(asset => {
    const term = search.toLowerCase();
    return (
      asset.name.toLowerCase().includes(term) || 
      asset.id.toLowerCase().includes(term) ||
      asset.employeeName.toLowerCase().includes(term) ||
      asset.employeeId.toLowerCase().includes(term)
    );
  });

  const stats = {
    protected: assets.filter(a => getWarrantyStatus(a.warrantyEnd)?.label === 'In Warranty').length,
    expiring: assets.filter(a => getWarrantyStatus(a.warrantyEnd)?.label === 'Expiring Soon').length,
    expired: assets.filter(a => getWarrantyStatus(a.warrantyEnd)?.label === 'Expired').length,
  };

  const handleAddOrUpdateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.id) return;

    if (editingId) {
      setAssets(assets.map(a => a.id === editingId ? form : a));
    } else {
      const newAsset = {
        ...form,
        history: [
          { 
            id: `H-${Date.now()}`, 
            date: form.warrantyStart, 
            type: 'Warranty Start' as const, 
            description: 'Asset recorded and warranty activated in system.' 
          }
        ]
      };
      setAssets([newAsset, ...assets]);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddHistoryEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyAsset || !historyForm.description) return;

    const newEvent: AssetHistoryItem = {
      id: `H-${Date.now()}`,
      ...historyForm
    };

    const updatedAsset = {
      ...historyAsset,
      history: [...(historyAsset.history || []), newEvent].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    setAssets(assets.map(a => a.id === historyAsset.id ? updatedAsset : a));
    setHistoryAsset(updatedAsset);
    setHistoryForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Repair',
      description: '',
      performer: ''
    });
  };

  const handleEdit = (asset: Asset) => {
    setForm(asset);
    setEditingId(asset.id);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleViewHistory = (asset: Asset) => {
    setHistoryAsset(asset);
    setIsHistoryModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to retire this asset record?')) {
      setAssets(assets.filter(a => a.id !== id));
      setActiveMenuId(null);
    }
  };

  const handleExportExcel = () => {
    const data = filteredAssets.map(asset => ({
      'Asset ID': asset.id,
      'Asset Name': asset.name,
      'Assigned Employee': asset.employeeName,
      'Employee ID': asset.employeeId,
      'Warranty Start': asset.warrantyStart,
      'Warranty End': asset.warrantyEnd,
      'Status': asset.status,
      'Location': asset.location,
      'Total Repairs': (asset.history || []).filter(h => h.type === 'Repair').length
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(workbook, `CT_ADMIN_Assets_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUploadImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedAssets: Asset[] = data.map((item, index) => ({
          id: item['Asset ID'] || item.id || `IMP-AST-${Math.floor(Math.random() * 9000)}-${index}`,
          name: item['Asset Name'] || item.name || 'Imported Item',
          location: item.Location || item.location || 'Main Warehouse',
          warrantyStart: item['Warranty Start'] || item.warrantyStart || new Date().toISOString().split('T')[0],
          warrantyEnd: item['Warranty End'] || item.warrantyEnd || new Date().toISOString().split('T')[0],
          employeeName: item['Assigned Employee'] || item.employeeName || 'Inventory Admin',
          employeeId: item['Employee ID'] || item.employeeId || 'ADM-001',
          status: (item.Status || item.status || 'Active') as any,
          history: [{ id: `H-IMP-${Date.now()}-${index}`, date: new Date().toISOString().split('T')[0], type: 'Warranty Start', description: 'Bulk Import Migration' }]
        }));

        setAssets(prev => [...importedAssets, ...prev]);
        setIsImportModalOpen(false);
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to parse the file. Please ensure it's a valid Excel or CSV file.");
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      location: '',
      warrantyStart: '',
      warrantyEnd: '',
      employeeName: '',
      employeeId: '',
      photo: '',
      status: 'Active',
      history: []
    });
    setEditingId(null);
    setIsCameraActive(false);
    stopCamera();
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setIsCameraActive(false);
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
        setForm({ ...form, photo: dataUrl });
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      {/* Warranty Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">🛡️</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protected Assets</p>
            <h4 className="text-3xl font-black text-slate-900">{stats.protected}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiring Soon</p>
            <h4 className="text-3xl font-black text-slate-900">{stats.expiring}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-2xl">🚨</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expired Coverage</p>
            <h4 className="text-3xl font-black text-slate-900">{stats.expired}</h4>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            type="text"
            placeholder="Filter by ID, Name, or Assigned Employee..."
            className="w-full pl-12 pr-6 py-5 bg-white border border-slate-200 rounded-[1.8rem] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 focus:outline-none transition shadow-sm font-semibold text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3 md:gap-4 w-full md:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 md:flex-none bg-white text-emerald-700 border-2 border-emerald-100 px-4 md:px-7 py-4 md:py-5 rounded-2xl md:rounded-[1.8rem] text-[10px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-emerald-50 transition flex items-center justify-center gap-2 md:gap-3 shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Excel Export
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-none bg-white text-indigo-950 border-2 border-slate-200 px-4 md:px-7 py-4 md:py-5 rounded-2xl md:rounded-[1.8rem] text-[10px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-slate-50 transition flex items-center justify-center gap-2 md:gap-3 shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Bulk Import
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="w-full md:w-auto bg-indigo-950 text-white px-6 md:px-9 py-4 md:py-5 rounded-2xl md:rounded-[1.8rem] text-[10px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-black transition flex items-center justify-center gap-2 md:gap-3 shadow-2xl shadow-indigo-100 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            add asset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-visible overflow-x-auto no-scrollbar">
      {/* Assets List - Responsive Table/Cards */}
      <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Asset Item</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Employee Assignment</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Warranty Timeline</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Lifecycle Status</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => {
                const wStatus = getWarrantyStatus(asset.warrantyEnd);
                const repairs = (asset.history || []).filter(h => h.type === 'Repair').length;
                return (
                  <tr key={asset.id} className="hover:bg-indigo-50/20 transition-all duration-300 group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                          {asset.photo ? (
                            <img src={asset.photo} alt={asset.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-3xl opacity-20">📦</div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 leading-tight text-lg tracking-tight mb-1">{asset.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">ID: {asset.id}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{asset.status}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-base font-black text-slate-800 tracking-tight leading-none mb-1">{asset.employeeName}</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Ref: {asset.employeeId}</p>
                    </td>
                    <td className="px-10 py-8">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter w-8">Start</span>
                          <span className="text-xs font-bold text-slate-600">{asset.warrantyStart}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter w-8">End</span>
                          <span className="text-xs font-black text-slate-900">{asset.warrantyEnd}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-2">
                        <div className={`text-[10px] px-4 py-2 rounded-2xl font-black uppercase tracking-widest border inline-flex items-center gap-2.5 shadow-sm transition-transform group-hover:scale-105 w-fit ${wStatus?.color} ${wStatus?.shadow}`}>
                          <span className="text-lg">{wStatus?.icon}</span>
                          {wStatus?.label}
                        </div>
                        {repairs > 0 && (
                          <span className="text-[9px] font-black text-amber-600 uppercase tracking-[0.15em] ml-1">
                            🛠️ {repairs} Repair{repairs > 1 ? 's' : ''} logged
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center relative overflow-visible">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === asset.id ? null : asset.id)}
                        className={`w-10 h-10 rounded-2xl transition-all flex items-center justify-center mx-auto ${activeMenuId === asset.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:text-indigo-600 hover:bg-white hover:shadow-xl'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>

                      {activeMenuId === asset.id && (
                        <div ref={menuRef} className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <button 
                            onClick={() => handleViewHistory(asset)}
                            className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M9 20v-10M12 4v4M15 20v-4M3 20h18"/><path d="m3 12 4.5-4.5 4.5 4.5 4.5-4.5 4.5 4.5"/></svg>
                            <span className="text-xs font-black text-indigo-950 uppercase tracking-widest">History & Repairs</span>
                          </button>
                          <button 
                            onClick={() => handleEdit(asset)}
                            className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center gap-3 transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Edit Record</span>
                          </button>
                          <div className="h-px bg-slate-100 my-1 mx-3"></div>
                          <button 
                            onClick={() => handleDelete(asset.id)}
                            className="w-full px-5 py-3 text-left hover:bg-rose-50 flex items-center gap-3 transition group"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Retire Asset</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {filteredAssets.map((asset) => {
            const wStatus = getWarrantyStatus(asset.warrantyEnd);
            const repairs = (asset.history || []).filter(h => h.type === 'Repair').length;
            return (
              <div key={asset.id} className="p-6 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                      {asset.photo ? (
                        <img src={asset.photo} alt={asset.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="text-2xl opacity-20">📦</div>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 leading-tight text-sm md:text-base tracking-tight mb-1 line-clamp-2">{asset.name}</p>
                      <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">ID: {asset.id}</p>
                    </div>
                  </div>
                  <div className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase tracking-widest border ${wStatus?.color}`}>
                    {wStatus?.label}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned To</p>
                    <p className="text-sm font-black text-slate-800 tracking-tight">{asset.employeeName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Ref: {asset.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Warranty End</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight">{asset.warrantyEnd}</p>
                    {repairs > 0 && (
                      <p className="text-[9px] font-black text-amber-600 uppercase mt-1">🛠️ {repairs} Repair{repairs > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleViewHistory(asset)}
                    className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition"
                  >
                    View History
                  </button>
                  <button 
                    onClick={() => handleEdit(asset)}
                    className="px-5 bg-slate-50 text-slate-600 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(asset.id)}
                    className="px-5 bg-rose-50 text-rose-500 py-3.5 rounded-2xl active:scale-95 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        {filteredAssets.length === 0 && (
          <div className="py-24 text-center">
            <div className="text-6xl mb-6 opacity-20">🔍</div>
            <p className="text-slate-400 font-black uppercase tracking-widest">No active asset records found</p>
          </div>
        )}
      </div>

      {/* Lifecycle & History Modal */}
      {isHistoryModalOpen && historyAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 bg-slate-900/80 backdrop-blur-xl overflow-y-auto no-scrollbar">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-14 relative animate-in zoom-in slide-in-from-bottom-8 duration-500 my-4 md:my-8">
            <button 
              onClick={() => { setIsHistoryModalOpen(false); setHistoryAsset(null); }} 
              className="absolute top-3 right-3 md:top-10 md:right-10 text-slate-600 hover:text-white hover:bg-indigo-600 transition-all p-2 md:p-3 rounded-xl md:rounded-2xl z-[110] bg-white shadow-xl border border-slate-100 group"
              aria-label="Close Modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div className="mb-8 md:mb-14 pr-12 md:pr-0">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl">🏗️</div>
                <div>
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight">{historyAsset.name}</h3>
                  <p className="text-slate-500 font-bold tracking-tight mt-1 uppercase text-[10px] md:text-xs tracking-widest">Serial Ref: {historyAsset.id}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Repairs</p>
                  <p className="text-xl font-black text-amber-600">{(historyAsset.history || []).filter(h => h.type === 'Repair').length}</p>
                </div>
                <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Index</p>
                  <p className="text-xl font-black text-emerald-600">Optimal</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-7">
                <div className="relative">
                  <div className="absolute left-[23px] top-6 bottom-6 w-1 bg-slate-100 rounded-full"></div>
                  <div className="space-y-10 relative">
                    {(historyAsset.history || []).length === 0 && (
                      <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No historical events recorded</p>
                      </div>
                    )}
                    {(historyAsset.history || []).map((event, idx) => (
                      <div key={event.id} className="flex gap-10 items-start group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg z-10 transition-transform group-hover:scale-110 shadow-sm ${
                          event.type === 'Warranty Start' ? 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/50' :
                          event.type === 'Repair' ? 'bg-amber-50 text-amber-600 ring-4 ring-amber-50/50' :
                          'bg-indigo-50 text-indigo-600 ring-4 ring-indigo-50/50'
                        }`}>
                          {event.type === 'Warranty Start' ? '🛡️' : event.type === 'Repair' ? '🛠️' : '📝'}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{event.date}</span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">BY {event.performer || 'SYSTEM'}</span>
                          </div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight mb-2 tracking-tight">{event.type}</h4>
                          <p className="text-sm font-medium text-slate-500 leading-relaxed">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 self-start">
                <h4 className="text-xl font-black text-slate-900 mb-8 tracking-tight">Log Lifecycle Event</h4>
                <form onSubmit={handleAddHistoryEvent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Type</label>
                    <select 
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none font-black text-slate-900 cursor-pointer appearance-none"
                      value={historyForm.type}
                      onChange={e => setHistoryForm({...historyForm, type: e.target.value as any})}
                    >
                      <option value="Repair">Repair / Component Replacement</option>
                      <option value="Maintenance">Routine Maintenance</option>
                      <option value="Assigned">Re-assignment / Ownership Change</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Log Date</label>
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none font-bold"
                      value={historyForm.date}
                      onChange={e => setHistoryForm({...historyForm, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Details</label>
                    <textarea 
                      rows={3}
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none font-bold placeholder:text-slate-300"
                      placeholder="e.g. Replaced display panel..."
                      value={historyForm.description}
                      onChange={e => setHistoryForm({...historyForm, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Performer</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 outline-none font-bold"
                      placeholder="Vendor or Dept Name"
                      value={historyForm.performer}
                      onChange={e => setHistoryForm({...historyForm, performer: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-950 text-white py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition transform active:scale-95">
                    Append to Lifecycle
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 md:p-6 bg-slate-900/70 backdrop-blur-xl overflow-y-auto no-scrollbar">
          <div className="bg-white w-full max-w-5xl rounded-[2rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-14 relative animate-in zoom-in slide-in-from-bottom-8 duration-500 my-4 md:my-8">
            <button 
              onClick={() => { setIsModalOpen(false); resetForm(); }} 
              className="absolute top-3 right-3 md:top-10 md:right-10 text-slate-600 hover:text-white hover:bg-indigo-600 transition-all p-2 md:p-3 rounded-xl md:rounded-2xl z-[90] bg-white shadow-xl border border-slate-100"
              aria-label="Close Modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div className="mb-8 md:mb-12 pr-12 md:pr-0">
              <h3 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 md:mb-3 tracking-tighter leading-tight">{editingId ? 'edit asset' : 'add asset'}</h3>
              <p className="text-slate-500 font-bold text-sm md:text-lg tracking-tight">Enterprise Infrastructure Documentation & Warranty Registry</p>
            </div>
            
            <form onSubmit={handleAddOrUpdateAsset} className="grid grid-cols-1 lg:grid-cols-12 gap-14">
              <div className="lg:col-span-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Name</label>
                    <input type="text" placeholder="e.g. MacBook Pro 16\" required className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-black text-xl text-slate-900 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Unique Asset ID</label>
                    <input type="text" placeholder="CT-HW-9901" required disabled={!!editingId} className={`w-full px-7 py-5 rounded-[1.8rem] border outline-none font-black text-xl transition-all ${editingId ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-indigo-600 focus:border-indigo-600 focus:bg-white'}`} value={form.id} onChange={e => setForm({...form, id: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Owner / Employee Name</label>
                    <input type="text" placeholder="Jessica Alba" required className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-bold text-slate-800 focus:border-indigo-600 transition-all" value={form.employeeName} onChange={e => setForm({...form, employeeName: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee Reference ID</label>
                    <input type="text" placeholder="EMP-2025-09" required className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-bold text-slate-800 focus:border-indigo-600 transition-all" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Warranty Start Date</label>
                    <input type="date" required className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-black text-slate-900 focus:border-indigo-600 transition-all cursor-pointer" value={form.warrantyStart} onChange={e => setForm({...form, warrantyStart: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Warranty End Date</label>
                    <input type="date" required className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-black text-slate-900 focus:border-indigo-600 transition-all cursor-pointer" value={form.warrantyEnd} onChange={e => setForm({...form, warrantyEnd: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Status</label>
                    <select className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-black text-slate-900 focus:border-indigo-600 transition-all cursor-pointer appearance-none" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Campus Placement</label>
                    <input type="text" placeholder="Floor 10, Suite 5" className="w-full px-7 py-5 rounded-[1.8rem] bg-slate-50 border border-slate-200 outline-none font-bold text-slate-800 focus:border-indigo-600 transition-all" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <div className="bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[420px] transition-all hover:border-indigo-200 hover:bg-indigo-50/20">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 absolute top-10 left-10">Asset visual Proof</label>
                  
                  {isCameraActive ? (
                    <div className="w-full space-y-6">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-[2.5rem] border-4 border-white shadow-2xl" />
                      <button type="button" onClick={capturePhoto} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition transform active:scale-95">Snap Snapshot</button>
                    </div>
                  ) : form.photo ? (
                    <div className="w-full relative group">
                      <img src={form.photo} alt="Asset Visual" className="w-full h-72 object-cover rounded-[2.5rem] border-8 border-white shadow-2xl transition-transform group-hover:scale-[1.02]" />
                      <button type="button" onClick={() => setForm({...form, photo: ''})} className="absolute -top-5 -right-5 bg-rose-600 text-white p-3 rounded-full shadow-2xl hover:scale-110 transition border-4 border-white">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8 w-full">
                      <div className="w-24 h-24 bg-white rounded-[2.5rem] border border-slate-200 flex items-center justify-center text-slate-300 mx-auto shadow-sm group-hover:scale-110 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all duration-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                      <div className="flex flex-col gap-4">
                        <button type="button" onClick={startCamera} className="w-full bg-indigo-950 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:shadow-indigo-200 transition">Activate Camera</button>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-px bg-slate-200"></div>
                          <span className="text-[10px] font-black text-slate-300 tracking-tighter">OR</span>
                          <div className="flex-1 h-px bg-slate-200"></div>
                        </div>
                        <label className="w-full bg-white border-2 border-slate-100 text-indigo-950 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-50 hover:border-slate-200 transition text-center shadow-sm">
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          Upload Visual ID
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full py-8 bg-indigo-950 text-white font-black uppercase tracking-[0.3em] rounded-[3rem] shadow-2xl hover:bg-black transition transform active:scale-[0.97] text-sm">
                  {editingId ? 'update asset record' : 'finalize admin record'}
                </button>
              </div>
            </form>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-2xl">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-14 relative animate-in fade-in zoom-in duration-300">
            <button onClick={() => setIsImportModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-slate-900 transition p-3 hover:bg-slate-50 rounded-3xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div className="text-center mb-12">
              <h3 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">Bulk Asset Import</h3>
              <p className="text-slate-500 font-bold tracking-tight">Support for Excel (.xlsx), Word (.docx), and PDF formats.</p>
            </div>

            <div className="space-y-10">
              <label className="block w-full cursor-pointer group">
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.xls,.doc,.docx,.pdf"
                  onChange={handleFileUploadImport}
                  disabled={isImporting}
                />
                <div className={`border-4 border-dashed rounded-[2.5rem] p-16 transition-all duration-500 flex flex-col items-center justify-center text-center ${
                  isImporting 
                    ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60' 
                    : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/50 group-hover:scale-[1.01]'
                }`}>
                  {isImporting ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-black text-indigo-600 uppercase tracking-widest text-xs">Parsing Document Structures...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 mb-8 shadow-sm group-hover:text-indigo-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tight mb-2">Drag & Drop Documents</p>
                      <p className="text-sm font-bold text-slate-400">or click to browse local files</p>
                    </>
                  )}
                </div>
              </label>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">Excel</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
                  </div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">Word</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h3a2 2 0 0 0 2-2 2 2 0 0 0-2-2H9v6z"/></svg>
                  </div>
                  <p className="text-[10px] font-black text-slate-900 uppercase">PDF</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetTracker;
