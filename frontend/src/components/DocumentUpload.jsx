import React, { useRef, useState } from 'react';
import { useDocuments } from '../context/DocumentContext';

export default function DocumentUpload() {
  const { handleSelectFile, activeUpload } = useDocuments();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const isBusy = Boolean(activeUpload);

  const onDragOver = (e) => {
    e.preventDefault();
    if (isBusy) return;
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleSelectFile(file);
    }
  };

  const onFileInputChange = (e) => {
    if (isBusy) return;
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleSelectFile(file);
      e.target.value = '';
    }
  };

  const handleClick = () => {
    if (isBusy) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="bg-surface-container rounded-2xl p-5 md:p-6 flex flex-col gap-4 shadow-sm border border-outline-variant/30 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
      <div className="flex items-center justify-between gap-2.5 mb-1 z-10 w-full min-w-0">
        <h2 className="text-title-md sm:text-title-lg font-bold text-on-surface flex items-center gap-2 min-w-0 truncate">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0">upload_file</span>
          <span className="truncate">Document Upload</span>
        </h2>
        {isBusy && (
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            Pipeline Busy
          </span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept=".pdf,.xlsx,.xls,.docx,.doc"
        className="hidden"
        disabled={isBusy}
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-6 md:p-xl flex flex-col items-center justify-center text-center transition-all z-10 ${
          isBusy
            ? 'opacity-60 cursor-not-allowed border-outline-variant/60 bg-surface'
            : isDragOver
              ? 'border-secondary bg-secondary/10 scale-[1.01] cursor-pointer'
              : 'border-outline-variant bg-surface hover:bg-surface-container-high hover:border-primary group-hover:border-primary cursor-pointer'
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-sm transition-transform ${
          isBusy ? 'bg-outline-variant/30' : 'bg-primary/10'
        }`}>
          <span className={`material-symbols-outlined text-[28px] ${isBusy ? 'text-on-surface-variant' : 'text-primary'}`}>
            {isBusy ? 'hourglass_top' : 'cloud_upload'}
          </span>
        </div>
        <span className="text-body-md font-body-md text-on-surface font-medium mb-sm">
          {isBusy ? 'Ingestion Pipeline Active...' : 'Select or Drop Documents'}
        </span>

        <div className="flex flex-wrap gap-2 mt-3 md:gap-md justify-center mt-sm">
          <div className="flex items-center gap-1 text-on-surface-variant bg-surface-container px-3 py-1.5 rounded border border-outline-variant/30 shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span>
            <span className="text-label-sm font-label-sm font-medium">PDF</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant bg-surface-container px-3 py-1.5 rounded border border-outline-variant/30 shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-[#107C41]">table</span>
            <span className="text-label-sm font-label-sm font-medium">Excel (.xlsx)</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant bg-surface-container px-3 py-1.5 rounded border border-outline-variant/30 shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-[#2B579A]">description</span>
            <span className="text-label-sm font-label-sm font-medium">Word (.docx)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
