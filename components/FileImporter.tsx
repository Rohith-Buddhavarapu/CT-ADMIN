
import React, { useState } from 'react';
import { Asset, Vendor } from '../types';

interface FileImporterProps {
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
}

const FileImporter: React.FC<FileImporterProps> = ({ setAssets, setVendors }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setSuccess(null);

    // Simulating file processing delay
    setTimeout(() => {
      const fileName = file.name.toLowerCase();
      
      if (fileName.includes('asset')) {
        const newAsset: Asset = {
          id: `AST-${Math.floor(Math.random() * 1000)}`,
          name: `Imported Asset (${file.name})`,
          warrantyStart: '2024-01-01',
          warrantyEnd: '2025-01-01',
          employeeName: 'New Hire',
          employeeId: 'EMP-999',
          location: 'Global Hub',
          status: 'Active'
        };
        setAssets(prev => [newAsset, ...prev]);
        setSuccess(`Successfully imported asset data from ${file.name}`);
      } else if (fileName.includes('vendor')) {
        const newVendor: Vendor = {
          id: `VEN-${Math.floor(Math.random() * 1000)}`,
          name: `Imported Vendor (${file.name})`,
          contactPerson: 'Import Bot',
          email: 'import@example.com',
          phone: '000-0000',
          serviceType: 'Consulting',
          rating: 5.0,
          tier: 'Tactical',
          sla: 99.0,
          riskProfile: 'Low',
          isCompliant: true,
        };
        setVendors(prev => [newVendor, ...prev]);
        setSuccess(`Successfully imported vendor data from ${file.name}`);
      } else {
        setSuccess(`File ${file.name} received. Standard data structures were appended.`);
      }
      
      setIsImporting(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Administrative Data</h3>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Import your Assets, Vendors, or Maintenance records using Excel, Word, or PDF files.
        </p>
        
        <label className="block w-full cursor-pointer">
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx,.xls,.doc,.docx,.pdf"
            onChange={handleFileUpload}
            disabled={isImporting}
          />
          <div className={`border-2 border-dashed border-gray-200 rounded-2xl p-12 transition ${
            isImporting ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-indigo-50'
          }`}>
            {isImporting ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-indigo-600">Parsing document...</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold text-gray-700">Click to browse or drag & drop</p>
                <p className="text-sm text-gray-400 mt-2">XLSX, DOCX, or PDF (Max 10MB)</p>
              </div>
            )}
          </div>
        </label>

        {success && (
          <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-medium animate-in fade-in slide-in-from-top-4">
            {success}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h4 className="font-bold mb-1">Excel (XLSX)</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Best for bulk asset updates and warranty lists.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
          </div>
          <h4 className="font-bold mb-1">Word (DOCX)</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Ideal for importing vendor contracts and service terms.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h3a2 2 0 0 0 2-2 2 2 0 0 0-2-2H9v6z"/></svg>
          </div>
          <h4 className="font-bold mb-1">PDF</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Securely extract data from receipts and visitor IDs.</p>
        </div>
      </div>
    </div>
  );
};

export default FileImporter;
