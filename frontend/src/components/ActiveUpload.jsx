import React from 'react';
import { useDocuments } from '../context/DocumentContext';

export default function ActiveUpload() {
  const { activeUpload } = useDocuments();

  if (!activeUpload) {
    return (
      <div className="bg-surface-container rounded-xl p-4 md:p-md flex flex-col shadow-sm border-l-4 border-outline-variant/60">
        <div className="flex items-center justify-between mb-sm">
          <span className="text-label-md font-label-md text-on-surface-variant font-semibold uppercase tracking-wider">Ingestion Pipeline</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#107C41] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#107C41]"></span>
          </span>
        </div>
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-secondary text-[20px]">smart_toy</span>
          <span className="text-body-sm font-body-sm text-on-surface-variant">RAG &amp; Vector Indexer Idle — Ready for Upload</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-xl p-4 md:p-md flex flex-col shadow-sm border-l-4 border-[#F9AC00] animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-sm">
        <span className="text-label-md font-label-md text-on-surface font-semibold uppercase tracking-wider">Active Upload</span>
        <span className="material-symbols-outlined text-[#F9AC00] text-[18px] animate-spin">sync</span>
      </div>
      <div className="flex items-center gap-sm mb-xs">
        <span className={`material-symbols-outlined ${activeUpload.fileInfo?.color || 'text-error'} text-[20px]`}>
          {activeUpload.fileInfo?.icon || 'picture_as_pdf'}
        </span>
        <span className="text-body-sm font-body-sm text-on-surface truncate font-medium max-w-[150px] sm:max-w-xs" title={activeUpload.name}>
          {activeUpload.name}
        </span>
        <span className="text-label-sm font-label-sm text-on-surface-variant ml-auto whitespace-nowrap">
          {activeUpload.size}
        </span>
      </div>
      <div className="w-full bg-surface-variant rounded-full h-1.5 mt-sm mb-xs overflow-hidden">
        <div 
          className="bg-[#F9AC00] h-1.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${activeUpload.progress}%` }}
        ></div>
      </div>
      <div className="flex justify-between items-center text-label-sm font-label-sm text-on-surface-variant">
        <span className="truncate mr-2">{activeUpload.stage}</span>
        <span className="font-bold text-[#F9AC00] whitespace-nowrap">{activeUpload.progress}%</span>
      </div>
    </div>
  );
}
