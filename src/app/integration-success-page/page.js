'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function IntegrationSuccess() {
  const [syncStatus, setSyncStatus] = useState('syncing'); 
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const performInitialSync = async () => {
      try {
        const response = await fetch('/api/auth/jira/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();

        if (response.ok) {
          console.log("--- JIRA SYNC SUCCESS ---");
          console.log("Total Count:", result.count);
          console.log("Issues Data:", result.data);
          setTaskCount(result.count);
          setSyncStatus('success');
        } else {
          setSyncStatus('error');
        }
      } catch (error) {
        console.error("Sync failed:", error);
        setSyncStatus('error');
      }
    };

    performInitialSync();
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden p-6 font-sans">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      <div className="bg-white overflow-hidden rounded-3xl shadow-2xl relative z-10">
        <div className="p-10 md:p-16">

          <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-14">
            <div className="text-center md:text-left">
              <h1 className="text-[2.8rem] font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                {syncStatus === 'syncing' ? "Syncing..." : "Success!"}<br />
                <span className="text-blue-600">
                  {syncStatus === 'syncing' ? "Fetching Data" : "You’re All Set!"}
                </span>
              </h1>
              <p className="text-slate-500 text-base font-medium leading-relaxed max-w-[300px] mx-auto md:mx-0">
                {syncStatus === 'syncing' 
                  ? "We are currently importing your Jira projects and tasks. Please wait..."
                  : syncStatus === 'error'
                  ? "Connection established, but we couldn't fetch tasks. You can retry from settings."
                  : `Successfully imported ${taskCount} tasks from your Jira Cloud account.`}
              </p>
            </div>

            {/* FLOATING ICON BOX */}
            <div className="relative group">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-blue-400 animate-bounce scale-150">▾</div>
              
              <div className={`relative w-36 h-36 rounded-[2.5rem] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 shadow-lg 
                ${syncStatus === 'syncing' ? 'bg-blue-50' : 'bg-[#FFD700]'}`}>
                
                {syncStatus === 'syncing' ? (
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <div className="absolute inset-2 border-2 border-white/30 rounded-[2rem]"></div>
                    <svg className="w-16 h-16 text-green-600 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-[2.5rem] p-8 border border-slate-100 relative">
            <div className="flex justify-center md:justify-between items-center mb-8">
              <div className="hidden md:flex gap-3">
                  <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                  <span className="w-3 h-3 rounded-full bg-slate-200"></span>
              </div>
              <div className="flex gap-2">
                <span className="px-4 py-1.5 bg-white text-slate-600 text-[11px] font-bold uppercase tracking-tighter rounded-full border border-slate-200 shadow-sm">
                   Status: {syncStatus === 'syncing' ? 'Processing' : 'Active'}
                </span>
                <span className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-tighter rounded-full border shadow-sm ${syncStatus === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {syncStatus === 'success' ? 'Sync Complete' : 'Ready to Sync'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Link href="/adminDashboard" className="group relative py-5 bg-slate-900 text-white font-bold rounded-2xl overflow-hidden transition-all active:scale-95 text-center">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Go to Dashboard
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <Link href="/settings" className="py-5 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-center shadow-sm">
                Review Settings
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Authorized By</span>
              <div className="flex -space-x-2">
                 <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">TL</div>
                 <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">JR</div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center gap-2 text-slate-800">
              <span className="font-black italic tracking-tighter text-sm">TrackLively <span className="font-normal text-slate-400 not-italic">Integration</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}