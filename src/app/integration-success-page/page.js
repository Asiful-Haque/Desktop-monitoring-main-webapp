"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import JiraMappingModal from "@/components/JiraMappingModal";

export default function IntegrationSuccess() {
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [taskCount, setTaskCount] = useState(0);

  // Mapping State
  const [unmappedQueue, setUnmappedQueue] = useState([]);
  const [localProjects, setLocalProjects] = useState([]);
  const [totalToMap, setTotalToMap] = useState(0);
  
  // NEW: Holds mappings in memory until the very end
  const [pendingMappings, setPendingMappings] = useState([]);

  const performInitialSync = async () => {
    try {
      setSyncStatus("syncing");
      const response = await fetch("/api/auth/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresMapping && result.unmappedProjects?.length > 0) {
          setUnmappedQueue(result.unmappedProjects);
          setTotalToMap(result.unmappedProjects.length);
          setPendingMappings([]); // Reset pending on start

          const projRes = await fetch("/api/projects");
          const projData = await projRes.json();
          setLocalProjects(projData.allprojects || []);

          setSyncStatus("mapping");
        } else {
          setTaskCount(result.syncedCount || 0);
          setSyncStatus("success");
        }
      } else {
        setSyncStatus("error");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus("error");
    }
  };

  useEffect(() => {
    performInitialSync();
  }, []);

  // UPDATED: Receives data from modal but doesn't fetch yet
  const handleMappingStepComplete = async (newMapping) => {
    const updatedPending = [...pendingMappings, newMapping];
    setPendingMappings(updatedPending);

    const nextQueue = unmappedQueue.slice(1);
    setUnmappedQueue(nextQueue);

    // ALL OR NOTHING: Only save when the queue is empty
    if (nextQueue.length === 0) {
      setSyncStatus("syncing");
      try {
        const res = await fetch("/api/projects/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings: updatedPending }),
        });

        if (res.ok) {
          // Final sync to pull tasks now that projects are linked
          performInitialSync();
        } else {
          setSyncStatus("error");
        }
      } catch (err) {
        setSyncStatus("error");
      }
    }
  };

  const handleModalClose = () => {
    setUnmappedQueue([]); 
    setPendingMappings([]); // CLEAR EVERYTHING: Nothing is saved
    setSyncStatus("error"); 
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden p-6 font-sans">
      
      {syncStatus === "mapping" && unmappedQueue.length > 0 && (
        <JiraMappingModal
          project={unmappedQueue[0]}
          localList={localProjects}
          onComplete={handleMappingStepComplete}
          onClose={handleModalClose}
          currentIndex={totalToMap - unmappedQueue.length}
          total={totalToMap}
        />
      )}

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      ></div>

      <div className="bg-white overflow-hidden rounded-3xl shadow-2xl relative z-10 w-full max-w-4xl">
        <div className="p-10 md:p-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-14">
            <div className="text-center md:text-left">
              <h1 className="text-[2.8rem] font-black text-slate-900 leading-[1.1] tracking-tight mb-5">
                {syncStatus === "error" ? "Sync Paused" : (syncStatus === "syncing" || syncStatus === "mapping" ? "Processing..." : "Success!")}
                <br />
                <span className={syncStatus === "error" ? "text-red-500" : "text-blue-600"}>
                  {syncStatus === "error" ? "Action Required" : (syncStatus === "syncing" ? "Fetching Data" : "You’re All Set!")}
                </span>
              </h1>
              <p className="text-slate-500 text-base font-medium leading-relaxed max-w-[320px] mx-auto md:mx-0">
                {syncStatus === "error"
                  ? "Import was interrupted. No changes were saved. You must complete the mapping to sync tasks."
                  : syncStatus === "syncing"
                    ? "Finalizing your project connections and importing tasks..."
                    : syncStatus === "mapping"
                      ? `Mapping project ${totalToMap - unmappedQueue.length + 1} of ${totalToMap}...`
                      : `Successfully imported ${taskCount} tasks from your Jira Cloud account.`}
              </p>
            </div>

            <div className="relative group">
              <div className={`relative w-36 h-36 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:rotate-3 shadow-lg 
                ${syncStatus === "error" ? "bg-red-50" : (syncStatus === "success" ? "bg-[#FFD700]" : "bg-blue-50")}`}>
                
                {syncStatus === "error" ? (
                  <svg className="w-16 h-16 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : syncStatus === "success" ? (
                  <svg className="w-16 h-16 text-green-600 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
                  Status: {syncStatus === "success" ? "Active" : syncStatus === "error" ? "Action Needed" : "Processing"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {syncStatus === "success" ? (
                <Link
                  href="/adminDashboard"
                  className="group relative py-5 bg-slate-900 text-white font-bold rounded-2xl overflow-hidden transition-all active:scale-95 text-center"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Go to Dashboard
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              ) : (
                <button
                  onClick={performInitialSync}
                  disabled={syncStatus === "syncing" || syncStatus === "mapping"}
                  className="group relative py-5 bg-blue-600 text-white font-bold rounded-2xl overflow-hidden transition-all active:scale-95 text-center disabled:opacity-70"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {syncStatus === "error" ? "Retry Mapping" : "Processing..."}
                  </span>
                </button>
              )}

              <Link
                href="/settings"
                className="py-5 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-center shadow-sm"
              >
                Review Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}