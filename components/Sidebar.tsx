
import React from 'react';
import { View, AuthUser } from '../types';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  user: AuthUser;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Insights', fullLabel: 'Executive Insights', roles: ['admin'], icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
    )},
    { id: 'assets', label: 'Assets', fullLabel: 'Asset Registry', roles: ['admin'], icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    )},
    { id: 'vendors', label: 'Vendors', fullLabel: 'Vendor Manager', roles: ['admin'], icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )},
    { id: 'bms', label: 'BMS', fullLabel: 'BMS Issues', roles: ['admin', 'user'], icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
    )},
    { id: 'visitors', label: 'Lobby', fullLabel: 'Lobby Management', roles: ['admin', 'user'], icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
    )},
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-indigo-950 border-r border-indigo-900 flex-col h-screen sticky top-0 z-50 text-white shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-950 font-black text-xl shadow-lg">CT</div>
            <div>
              <span className="block text-lg font-black tracking-tighter leading-none">CT ADMIN</span>
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em]">Enterprise v4.0</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1.5">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as View)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                currentView === item.id 
                  ? 'bg-white text-indigo-950 font-black shadow-xl shadow-black/20 translate-x-1' 
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="text-sm tracking-tight">{item.fullLabel}</span>
            </button>
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span className="text-sm font-bold tracking-tight">Terminate Session</span>
          </button>
        </div>

        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-white/10 to-transparent p-5 rounded-3xl border border-white/10 relative overflow-hidden backdrop-blur-sm">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </div>
                <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">Corporate Division</p>
              </div>
              <p className="text-sm font-bold mb-3">Enterprise Systems Hub</p>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-600/30 rounded-full blur-3xl"></div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-indigo-950 border-t border-indigo-900 z-[100] px-1 py-3 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              currentView === item.id 
                ? 'text-white scale-110' 
                : 'text-indigo-400 opacity-60'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${currentView === item.id ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
        <button 
          onClick={onLogout}
          className="flex flex-col items-center gap-1 text-rose-400 opacity-60"
        >
          <div className="p-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter">Exit</span>
        </button>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-indigo-950 z-[100] px-6 py-4 flex justify-between items-center shadow-lg border-b border-indigo-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-indigo-950 font-black text-sm shadow-lg">CT</div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-tighter text-sm uppercase leading-none">
              {menuItems.find(i => i.id === currentView)?.label || currentView}
            </span>
            <span className="text-indigo-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">
              {user.fullName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-9 h-9 rounded-xl bg-indigo-800 flex items-center justify-center text-white text-[10px] font-bold border border-indigo-700 shadow-inner">
             {user.username.substring(0, 2).toUpperCase()}
           </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
