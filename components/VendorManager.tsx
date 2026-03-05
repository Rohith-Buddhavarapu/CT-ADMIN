
import React, { useState, useRef } from 'react';
import { Vendor, AuthUser } from '../types';
import * as XLSX from 'xlsx';

interface VendorManagerProps {
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  user: AuthUser;
}

const STANDARD_CLASSIFICATIONS = [
  'Electrician Services',
  'Plumber Services',
  'Carpenter Services',
  'AC Air Balance & HVAC',
  'Fire Extinguisher & Safety',
  'Door Controller & Access',
  'Furniture (Chairs/Tables)',
  'Sign Boards & Branding',
  'Photo Frames & Awards',
  'Bisleri & Water Supply',
  'BAGS & Stationery',
  'Systems & IT Support'
];

const VendorManager: React.FC<VendorManagerProps> = ({ vendors, setVendors, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterClass, setFilterClass] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<Omit<Vendor, 'id'>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    serviceType: 'Electrician Services',
    rating: 5.0,
    tier: 'Tactical',
    sla: 100.0,
    riskProfile: 'Low',
    isCompliant: true,
  });

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newVendors: Vendor[] = data.map((item, index) => ({
          id: `VEN-XL-${Math.floor(1000 + Math.random() * 9000)}-${index}`,
          name: item.Name || item.name || 'Unknown Vendor',
          contactPerson: item.Contact || item.contact || 'N/A',
          email: item.Email || item.email || '',
          phone: item.Phone || item.phone || '',
          serviceType: item.Service || item.service || 'Electrician Services',
          rating: Number(item.Rating || item.rating || 5.0),
          tier: (item.Tier || item.tier || 'Tactical') as any,
          sla: Number(item.SLA || item.sla || 100.0),
          riskProfile: (item.Risk || item.risk || 'Low') as any,
          isCompliant: Boolean(item.Compliant || item.compliant || true),
        }));

        setVendors(prev => [...newVendors, ...prev]);
      } catch (err) {
        console.error("Vendor import failed", err);
        alert("Failed to import vendors. Please check the file format.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(vendors);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "Vendors_Registry.xlsx");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    const newVendor: Vendor = {
      ...form,
      id: `VEN-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setVendors([newVendor, ...vendors]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      serviceType: 'Electrician Services',
      rating: 5.0,
      tier: 'Tactical',
      sla: 100.0,
      riskProfile: 'Low',
      isCompliant: true,
    });
  };

  const filteredVendors = vendors.filter(v => 
    (filterClass === 'All' || v.serviceType === filterClass)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filter Category:</span>
          <select 
            className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="All">All Registered Vendors</option>
            {STANDARD_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 md:gap-4 w-full lg:w-auto">
          {user.role === 'admin' && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelUpload} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 lg:flex-none bg-emerald-600 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-emerald-700 transition shadow-xl shadow-emerald-100/50 flex items-center justify-center gap-2 md:gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                Upload
              </button>
              <button 
                onClick={handleDownloadExcel}
                className="flex-1 lg:flex-none bg-blue-600 text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-blue-700 transition shadow-xl shadow-blue-100/50 flex items-center justify-center gap-2 md:gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Download
              </button>
            </>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full lg:w-auto bg-indigo-950 text-white px-6 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] hover:bg-black transition flex items-center justify-center gap-2 md:gap-3 shadow-2xl shadow-indigo-100/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[18px] md:h-[18px]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            New Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-2xl md:rounded-[1.5rem] border border-slate-100 flex items-center justify-center text-indigo-950 font-black text-xl md:text-2xl group-hover:bg-indigo-950 group-hover:text-white transition-all duration-500">
                  {vendor.name[0]}
                </div>
                <div>
                   <h4 className="font-black text-slate-900 text-base md:text-xl tracking-tight leading-none mb-1">{vendor.name}</h4>
                   <p className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">{vendor.serviceType}</p>
                </div>
              </div>
              {vendor.isCompliant && (
                <div className="bg-emerald-50 p-1.5 md:p-2 rounded-lg md:rounded-xl text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
              )}
            </div>
            
            <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100">
               <div className="flex flex-col gap-0.5 md:gap-1">
                 <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact Representative</span>
                 <span className="text-xs md:text-sm font-bold text-slate-900">{vendor.contactPerson}</span>
               </div>
               <div className="flex flex-col gap-0.5 md:gap-1">
                 <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Business Email</span>
                 <span className="text-xs md:text-sm font-bold text-indigo-600 truncate">{vendor.email}</span>
               </div>
               <div className="flex flex-col gap-0.5 md:gap-1">
                 <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Phone</span>
                 <span className="text-xs md:text-sm font-bold text-slate-700">{vendor.phone}</span>
               </div>
            </div>
            
            <button className="w-full bg-indigo-950 text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition shadow-xl shadow-indigo-100">
              Vendor Profile
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-12 relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 md:top-10 md:right-10 text-slate-500 hover:text-slate-900 transition p-3 hover:bg-slate-100 rounded-2xl z-50 bg-white/80 backdrop-blur-sm shadow-sm border border-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div className="mb-10 text-center">
              <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Vendor Onboarding</h3>
              <p className="text-slate-500 font-medium">Add service providers and utilities to the CT ADMIN registry.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Legal Name</label>
                  <input required type="text" placeholder="e.g. Bisleri, Star Plumbers" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-lg bg-slate-50/50" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Class</label>
                  <select className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-white font-bold" value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})}>
                    {STANDARD_CLASSIFICATIONS.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Status</label>
                  <button 
                    type="button"
                    onClick={() => setForm({...form, isCompliant: !form.isCompliant})}
                    className={`w-full py-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${
                      form.isCompliant ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                    }`}
                  >
                    {form.isCompliant ? 'Verified Compliant' : 'Mark as Pending'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Person</label>
                  <input required type="text" placeholder="Full Name" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Phone</label>
                  <input required type="tel" placeholder="+91 00000 00000" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Email</label>
                  <input required type="email" placeholder="official@vendor.com" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-950 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition shadow-2xl shadow-indigo-200">
                  Authorize Vendor Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManager;
