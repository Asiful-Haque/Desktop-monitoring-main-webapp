"use client";
import React, { useState } from "react";

export default function JiraMappingModal({ project, localList, onComplete, onClose, currentIndex, total }) {
  const [selection, setSelection] = useState("NEW");

  const safeLocalList = Array.isArray(localList) ? localList : [];

  const handleConfirm = () => {
    // We do NOT fetch here. We just pass the choice to the parent.
    onComplete({
      mode: selection === "NEW" ? "CREATE_NEW" : "LINK_EXISTING",
      localProjectId: selection === "NEW" ? null : selection,
      jiraId: project?.id,
      jiraKey: project?.key,
      jiraName: project?.name,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative transform animate-in slide-in-from-bottom-8 duration-500">
        
        <div className="flex justify-between items-center mb-6">
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold uppercase tracking-widest rounded-full">
            Project {currentIndex + 1} of {total}
          </span>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2">Link Jira Project</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          How should we handle <b>{project?.name}</b> ({project?.key})?
        </p>

        <div className="space-y-4 mb-8">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Destination</label>
          <select 
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none"
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
          >
            <option value="NEW">Create as New Project</option>
            {safeLocalList.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                Link to: {p.project_name}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleConfirm}
          className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          {currentIndex + 1 === total ? "Finalize All Mappings" : "Next Project"}
        </button>
      </div>
    </div>
  );
}