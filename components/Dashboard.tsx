
import React from 'react';
import { Asset, Vendor, BMSIssue, Visitor } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  assets: Asset[];
  vendors: Vendor[];
  issues: BMSIssue[];
  visitors: Visitor[];
}

const Dashboard: React.FC<DashboardProps> = ({ assets, vendors, issues, visitors }) => {
  const stats = [
    { label: 'Enterprise Assets', value: assets.length, icon: '📦' },
    { label: 'Service Classes', value: new Set(vendors.map(v => v.serviceType)).size, icon: '🏷️' },
    { label: 'Active Vendors', value: vendors.length, icon: '🤝' },
    { label: 'Lobby Traffic', value: visitors.filter(v => !v.checkOut).length, icon: '🛂' },
  ];

  // Group vendors by Service Classification for the Admin Role
  const serviceClassifications = vendors.reduce((acc: any, vendor) => {
    const type = vendor.serviceType || 'Unclassified';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const serviceData = Object.keys(serviceClassifications).map(key => ({
    name: key,
    value: serviceClassifications[key]
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#818cf8'];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900">{stat.value}</h3>
              </div>
              <div className="text-xl md:text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
             <h4 className="text-base md:text-lg font-black text-slate-900 tracking-tight">Service Portfolio Analysis</h4>
             <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Admin Insight</span>
           </div>
           <div className="h-64 md:h-72">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={serviceData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                 <Bar dataKey="value" fill="#1e1b4b" radius={[6, 6, 0, 0]}>
                   {serviceData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
