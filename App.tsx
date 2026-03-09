import React, { useState, useEffect } from 'react';
import { View, Asset, Vendor, BMSIssue, Visitor, Priority, IssueStatus, AuthUser } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AssetTracker from './components/AssetTracker';
import VendorManager from './components/VendorManager';
import BMSManager from './components/BMSManager';
import VisitorManager from './components/VisitorManager';
import Login from './components/Login';
import { useRegisterSW } from 'virtual:pwa-register/react';

const INITIAL_ASSETS: Asset[] = [
  { 
    id: 'ADM-FUR-001', 
    name: 'Executive Mesh Chair (Aeron)', 
    warrantyStart: '2023-01-01', 
    warrantyEnd: '2028-01-01', 
    employeeName: 'Sarah Chen', 
    employeeId: 'GTS-201', 
    location: 'Singapore Innovation Center - Floor 4', 
    status: 'Active',
    history: [
      { id: 'H-001', date: '2023-01-01', type: 'Warranty Start', description: 'Initial Procurement & Asset Tagging', performer: 'Admin System' },
      { id: 'H-002', date: '2024-02-15', type: 'Repair', description: 'Replaced hydraulic cylinder due to pressure loss', performer: 'Steelcase Service' }
    ]
  },
  { 
    id: 'ADM-SAF-102', 
    name: 'Ceiling Fire Extinguisher (5KG)', 
    warrantyStart: '2024-02-15', 
    warrantyEnd: '2025-02-15', 
    employeeName: 'Safety Team', 
    employeeId: 'SAF-01', 
    location: 'Main Pantry Area', 
    status: 'Active',
    history: [
      { id: 'H-101', date: '2024-02-15', type: 'Warranty Start', description: 'Safety Protocol Activation', performer: 'Fire Marshall' }
    ]
  },
  { 
    id: 'ADM-SEC-201', 
    name: 'Door Controller (Biometric)', 
    warrantyStart: '2022-06-20', 
    warrantyEnd: '2026-06-20', 
    employeeName: 'Security Admin', 
    employeeId: 'SEC-001', 
    location: 'Main Entrance HQ', 
    status: 'Active',
    history: [
      { id: 'H-201', date: '2022-06-20', type: 'Warranty Start', description: 'Installation & Biometric Calibration', performer: 'ZKTeco Expert' },
      { id: 'H-202', date: '2023-08-10', type: 'Maintenance', description: 'Firmware Update & Sensor Cleaning', performer: 'IT Dept' },
      { id: 'H-203', date: '2024-01-05', type: 'Repair', description: 'Reader module replaced after circuit surge', performer: 'Vendor Team' }
    ]
  },
];

const INITIAL_VENDORS: Vendor[] = [
  { id: 'VEN-UTL-001', name: 'Bisleri Water Solutions', contactPerson: 'Arun Kumar', email: 'support@bisleri.in', phone: '+91 98765 43210', serviceType: 'Bisleri & Water Supply', rating: 4.8, tier: 'Strategic', sla: 99.5, riskProfile: 'Low', isCompliant: true },
  { id: 'VEN-FAC-002', name: 'Reliable Facility Pros', contactPerson: 'John Smith', email: 'john.smith@reliable.com', phone: '+1 555 123 4567', serviceType: 'Electrician Services', rating: 4.5, tier: 'Preferred', sla: 92.0, riskProfile: 'Medium', isCompliant: true },
  { id: 'VEN-ADV-003', name: 'Premium Signage & Awards', contactPerson: 'Lisa Ray', email: 'awards@premiumsign.com', phone: '+44 20 7123 4567', serviceType: 'Sign Boards & Branding', rating: 4.7, tier: 'Tactical', sla: 95.0, riskProfile: 'Low', isCompliant: true },
];

const INITIAL_ISSUES: BMSIssue[] = [
  { id: 'BMS-FAC-101', title: 'Pantry Water Supply Interrupted', description: 'Main inlet valve for Bisleri dispenser showing low pressure.', location: 'HQ Pantry - Floor 2', priority: Priority.MEDIUM, status: IssueStatus.OPEN, issueDate: '2024-05-12', facilityCategory: 'MEP Systems' },
];

const INITIAL_VISITORS: Visitor[] = [
  { id: 'VIS-GBL-901', name: 'Robert DeNiro', idProofType: 'Global ID', idProof: '8812', purpose: 'Board Strategy Session', hostName: 'Jessica Alba', checkIn: '2024-05-15 09:00', type: 'General' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [issues, setIssues] = useState<BMSIssue[]>(INITIAL_ISSUES);
  const [visitors, setVisitors] = useState<Visitor[]>(INITIAL_VISITORS);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (user && user.role === 'user' && (currentView === 'dashboard' || currentView === 'assets' || currentView === 'vendors')) {
      setCurrentView('bms');
    }
  }, [user, currentView]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard assets={assets} vendors={vendors} issues={issues} visitors={visitors} />;
      case 'assets':
        return <AssetTracker assets={assets} setAssets={setAssets} />;
      case 'vendors':
        return <VendorManager vendors={vendors} setVendors={setVendors} user={user} />;
      case 'bms':
        return <BMSManager issues={issues} setIssues={setIssues} user={user} />;
      case 'visitors':
        return <VisitorManager visitors={visitors} setVisitors={setVisitors} user={user} />;
      default:
        return <Dashboard assets={assets} vendors={vendors} issues={issues} visitors={visitors} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 no-scrollbar pt-20 pb-24 md:pt-8 md:pb-8">
        <header className="hidden md:flex justify-between items-center mb-8">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
              {currentView === 'bms' ? 'BMS Issues' : currentView === 'assets' ? 'Assets' : currentView}
            </h1>
            <p className="text-slate-500 text-sm font-medium tracking-tight">Enterprise Infrastructure & Support</p>
          </div>
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="flex flex-col items-end mr-2 hidden sm:flex">
              <span className="text-sm font-bold text-slate-900">{user.fullName}</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                user.role === 'admin' ? 'text-emerald-600 bg-emerald-50' : 'text-indigo-600 bg-indigo-50'
              }`}>
                {user.role === 'admin' ? 'Global Access' : 'Facility Access'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-950 flex items-center justify-center text-white font-bold border-2 border-indigo-900 shadow-xl group hover:scale-105 transition cursor-pointer">
              {user.username.substring(0, 3).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {renderView()}
        </div>

        {(offlineReady || needRefresh) && (
          <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[200] animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-950 text-white p-6 rounded-3xl shadow-2xl border border-indigo-800 backdrop-blur-xl flex flex-col gap-4 max-w-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight uppercase">
                    {offlineReady ? 'App Ready Offline' : 'Update Available'}
                  </p>
                  <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                    {offlineReady ? 'System is cached' : 'New version detected'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {needRefresh && (
                  <button 
                    onClick={() => updateServiceWorker(true)}
                    className="flex-1 bg-white text-indigo-950 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-indigo-50 transition shadow-lg"
                  >
                    Update
                  </button>
                )}
                <button 
                  onClick={close}
                  className="flex-1 bg-indigo-900/50 text-indigo-200 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-indigo-900 transition border border-indigo-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

