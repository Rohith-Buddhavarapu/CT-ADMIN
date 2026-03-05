
import React, { useState } from 'react';
import { UserRole, AuthUser } from '../types';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const admins = [
      { username: 'admin', password: 'admin123', fullName: 'Chief Administrator' },
      { username: 'admin_sarah', password: 'admin123', fullName: 'Sarah Chen' },
      { username: 'admin_john', password: 'admin123', fullName: 'John Smith' },
      { username: 'admin_lisa', password: 'admin123', fullName: 'Lisa Ray' },
      { username: 'admin_arun', password: 'admin123', fullName: 'Arun Kumar' },
      { username: 'admin_jessica', password: 'admin123', fullName: 'Jessica Alba' },
      { username: 'admin_robert', password: 'admin123', fullName: 'Robert DeNiro' },
    ];

    const foundAdmin = admins.find(a => a.username === username && a.password === password);

    if (foundAdmin) {
      onLogin({ username: foundAdmin.username, role: 'admin', fullName: foundAdmin.fullName });
    } else if (username === 'user' && password === 'user123') {
      onLogin({ username: 'user', role: 'user', fullName: 'Facility Coordinator' });
    } else {
      setError('Invalid credentials. Check admin list or use user/user123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-500">
        <div className="bg-indigo-950 p-12 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-950 font-black text-3xl shadow-2xl mx-auto mb-6">CT</div>
            <h2 className="text-3xl font-black tracking-tight mb-2">Enterprise Access</h2>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Administrative Management Suite</p>
          </div>
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl"></div>
        </div>
        
        <form onSubmit={handleLogin} className="p-12 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
            <input 
              type="text" 
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors" 
              placeholder="admin or user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-bold focus:border-indigo-600 transition-colors" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-indigo-950 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all shadow-xl shadow-indigo-100 mt-4"
          >
            Authenticate Session
          </button>
          
          <div className="pt-4 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secure Enterprise Gateway</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
