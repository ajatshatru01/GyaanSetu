import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';
import TagModal from './TagModal';

export default function UploadModal({ file, onClose }) {
  const { tags, departments, startDocumentUpload, hasActiveDuplicate, hasSameNameAndVersion } = useDocuments();
  const [selectedDept, setSelectedDept] = useState(departments[0] || 'Rolling Stock');
  const [selectedTags, setSelectedTags] = useState([]);
  const [versionNum, setVersionNum] = useState('1.0');
  const [showTagModal, setShowTagModal] = useState(false);
  const [formError, setFormError] = useState('');

  if (!file) return null;

  const isDuplicateActive = hasActiveDuplicate(file.name);

  const ext = file.name.split('.').pop().toLowerCase();
  let fileIcon = 'draft';
  let fileColor = 'text-primary';
  let badgeLabel = 'Document';

  if (ext === 'pdf') {
    fileIcon = 'picture_as_pdf';
    fileColor = 'text-error';
    badgeLabel = 'PDF Document';
  } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
    fileIcon = 'table';
    fileColor = 'text-[#107C41]';
    badgeLabel = 'Spreadsheet';
  } else if (['docx', 'doc'].includes(ext)) {
    fileIcon = 'description';
    fileColor = 'text-[#2B579A]';
    badgeLabel = 'Word Spec';
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const toggleTag = (tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (isDuplicateActive) return;

    const cleanNum = versionNum.trim().replace(/^v/i, '') || '1.0';
    const fullVer = `v${cleanNum}`;

    if (hasSameNameAndVersion(file.name, fullVer)) {
      setFormError(`A document named "${file.name}" with version ${fullVer} already exists.`);
      return;
    }

    startDocumentUpload(file, {
      department: selectedDept,
      selectedTags: selectedTags,
      version: fullVer,
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-[520px] p-6 relative my-auto animate-in fade-in zoom-in-95 duration-150"
        style={{ minWidth: '320px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">upload_file</span>
            <h3 className="text-title-lg font-title-lg text-on-surface">Upload &amp; Index Document</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] block">close</span>
          </button>
        </div>

        {isDuplicateActive ? (
          /* Duplicate File Warning Screen */
          <div className="mt-5 flex flex-col items-center text-center gap-3 w-full">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[32px]">info</span>
            </div>
            <h4 className="text-title-lg font-bold text-on-surface">Duplicate File Name Detected</h4>
            <p className="text-body-sm text-on-surface-variant w-full text-center px-1 leading-relaxed">
              A document named <strong className="text-on-surface font-semibold">"{file.name}"</strong> already exists in the system. To avoid naming conflicts, please <strong>rename your file slightly</strong> (e.g. adding a version suffix or year like <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono text-xs">_v2</code> or <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono text-xs">_2026</code>) before uploading.
            </p>
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 w-full text-left flex items-center gap-3 mt-1">
              <span className={`material-symbols-outlined ${fileColor} text-[26px] shrink-0`}>{fileIcon}</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-body-sm font-semibold text-primary truncate" title={file.name}>{file.name}</span>
                <span className="text-label-sm text-on-surface-variant">{formatBytes(file.size)}</span>
              </div>
            </div>
            <div className="flex items-center justify-end w-full gap-3 mt-4 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold transition-all cursor-pointer"
              >
                Close &amp; Choose Another File
              </button>
            </div>
          </div>
        ) : (
          /* Normal Upload Form */
          <form onSubmit={handleUploadSubmit} className="mt-4 flex flex-col gap-4">
            {/* Selected File Card */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-outline-variant/30">
                <span className={`material-symbols-outlined text-[24px] ${fileColor}`}>{fileIcon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-body-md font-semibold text-primary truncate" title={file.name}>{file.name}</h4>
                <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span className="bg-surface px-2 py-0.5 rounded text-on-surface-variant font-medium border border-outline-variant/30">{badgeLabel}</span>
                </div>
              </div>
            </div>

            {/* Department & Version Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-label-md font-label-md text-on-surface-variant mb-1">
                  Engineering Department / Sector
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 cursor-pointer"
                >
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-md font-label-md text-on-surface-variant mb-1">
                  Version
                </label>
                <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-lg focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 overflow-hidden">
                  <span className="pl-3 pr-0.5 text-body-sm font-mono font-bold text-on-surface-variant select-none">
                    v
                  </span>
                  <input
                    type="text"
                    value={versionNum}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/^v/i, '');
                      setVersionNum(clean);
                      setFormError('');
                    }}
                    placeholder="1.0"
                    className="w-full py-2.5 pr-3 bg-transparent text-body-sm font-body-sm text-on-surface focus:outline-none font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-error/10 border border-error/30 rounded-lg text-error text-xs font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Tags Selection (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-label-md font-label-md text-on-surface-variant">
                  Assign Categorization Tags <span className="text-label-sm text-on-surface-variant/70 font-normal">(Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  className="text-label-sm text-secondary hover:text-primary font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <span className="material-symbols-outlined text-[15px]">tune</span>
                  Manage Tags
                </button>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 min-h-[50px] max-h-36 overflow-y-auto">
                {tags.map((tag) => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  const tagHex = tag.hex || '#016879';
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-label-sm flex items-center gap-1.5 border transition-all cursor-pointer select-none bg-surface text-on-surface ${
                        isSelected
                          ? 'border-2 font-bold shadow-xs scale-105 ring-2 ring-black/10'
                          : 'border font-medium opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        borderColor: tagHex,
                        borderWidth: isSelected ? '2px' : '1.5px',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tagHex }}></span>
                      <span className="text-on-surface">{tag.label}</span>
                      {isSelected && <span className="material-symbols-outlined text-[13px] font-bold text-on-surface">check</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pipeline Notice */}
            <div className="bg-secondary-fixed/10 border border-secondary-fixed/30 rounded-xl p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">neurology</span>
              <div className="text-label-sm text-on-surface-variant">
                <span className="font-semibold text-primary">Automated Ingestion Pipeline:</span> Multi-page OCR, table layout extraction, and vector chunking will run automatically.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-body-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                Upload &amp; Index Document
              </button>
            </div>
          </form>
        )}
      </div>

      {showTagModal && (
        <TagModal
          onClose={() => setShowTagModal(false)}
          onCreated={(newTag) => {
            setSelectedTags(prev => [...prev, newTag]);
            setShowTagModal(false);
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
