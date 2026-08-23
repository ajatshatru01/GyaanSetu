import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';
import { documentService } from '../services/documentService';
import TagModal from './TagModal';

export default function SupersedeModal({ doc, onClose }) {
  const {
    departments,
    tags,
    handleUpdateDocumentStatus,
    handleSupersedeWithNewVersion,
    hasSameNameAndVersion,
    hasDuplicateFileName,
    activeUpload
  } = useDocuments();

  const [replacementFile, setReplacementFile] = useState(null);
  const [selectedDept, setSelectedDept] = useState(doc?.department || departments[0] || 'Rolling Stock');
  const [selectedTags, setSelectedTags] = useState(doc?.tags || []);
  const [versionNum, setVersionNum] = useState(() => {
    const next = documentService.getNextVersion(doc?.version || 'v1.0');
    return next.replace(/^v/i, '');
  });
  const [showTagModal, setShowTagModal] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!doc) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setError('');
      setReplacementFile(file);
    }
  };

  const handleJustMarkOlder = async () => {
    await handleUpdateDocumentStatus(doc.id, 'Older Version');
    onClose();
  };

  const handleUploadReplacement = (e) => {
    e.preventDefault();
    if (!replacementFile) {
      setError('Please select a replacement document');
      return;
    }

    const cleanNum = versionNum.trim().replace(/^v/i, '') || '1.1';
    const fullVer = `v${cleanNum}`;

    // Verify duplicate file name doesn't exist across the system
    const isDup = typeof hasDuplicateFileName === 'function' ? hasDuplicateFileName(replacementFile.name) : false;
    if (isDup) {
      setError(`A document named "${replacementFile.name}" already exists in the system. Please rename your file slightly (e.g. adding a version suffix like _v2 or year) before uploading.`);
      return;
    }

    // Verify same version doesn't already exist
    const isSameVer = typeof hasSameNameAndVersion === 'function' ? hasSameNameAndVersion(replacementFile.name, fullVer, doc.id) : false;
    if (isSameVer) {
      setError(`A document named "${replacementFile.name}" with version ${fullVer} already exists.`);
      return;
    }

    handleSupersedeWithNewVersion(doc.id, replacementFile, {
      department: doc.department || 'General Engineering',
      selectedTags: selectedTags,
      version: fullVer,
    });
    onClose();
  };

  const toggleTag = (tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileBadgeInfo = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return { icon: 'picture_as_pdf', color: 'text-error', label: 'PDF Document' };
    if (['xlsx', 'xls', 'csv'].includes(ext)) return { icon: 'table', color: 'text-[#107C41]', label: 'Spreadsheet' };
    if (['docx', 'doc'].includes(ext)) return { icon: 'description', color: 'text-[#2B579A]', label: 'Word Spec' };
    return { icon: 'draft', color: 'text-primary', label: 'Document' };
  };

  const fileInfo = replacementFile ? getFileBadgeInfo(replacementFile) : null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-[520px] p-6 relative my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4"
        style={{ minWidth: '320px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">upgrade</span>
            <div>
              <h3 className="text-title-lg font-title-lg text-on-surface">Upload New Revision</h3>
              <p className="text-label-sm text-on-surface-variant">Update current release ({doc.version || 'v1.0'}) or archive as older version</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] block">close</span>
          </button>
        </div>

        {/* Current Document Summary */}
        <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-outline-variant/30">
              <span className={`material-symbols-outlined text-[22px] ${doc.icon?.color || 'text-primary'}`}>
                {doc.icon?.name || 'description'}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-body-sm font-semibold text-primary truncate max-w-[200px]" title={doc.name}>
                  {doc.name}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface border border-outline-variant/50 font-mono text-on-surface-variant font-medium">
                  {doc.version || 'v1.0'}
                </span>
              </div>
              <span className="text-label-sm text-on-surface-variant">
                {doc.department} • {doc.size || 'Standard'}
              </span>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Current
          </span>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.xlsx,.xls,.docx,.doc"
          className="hidden"
        />

        {replacementFile && (typeof hasDuplicateFileName === 'function' ? hasDuplicateFileName(replacementFile.name) : false) ? (
          /* Duplicate File Warning Screen (matching UploadModal) */
          <div className="mt-2 flex flex-col items-center text-center gap-3 w-full animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[32px]">info</span>
            </div>
            <h4 className="text-title-lg font-bold text-on-surface">Duplicate File Name Detected</h4>
            <p className="text-body-sm text-on-surface-variant w-full text-center px-1 leading-relaxed">
              A document named <strong className="text-on-surface font-semibold">"{replacementFile.name}"</strong> already exists in the system. To avoid naming conflicts, please <strong>rename your file slightly</strong> (e.g. adding a version suffix or year like <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono text-xs">_v2</code> or <code className="bg-surface-container px-1 py-0.5 rounded text-primary font-mono text-xs">_2026</code>) before uploading.
            </p>
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 w-full text-left flex items-center gap-3 mt-1">
              <span className={`material-symbols-outlined ${fileInfo?.color || 'text-error'} text-[26px] shrink-0`}>
                {fileInfo?.icon || 'picture_as_pdf'}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-body-sm font-semibold text-primary truncate" title={replacementFile.name}>
                  {replacementFile.name}
                </span>
                <span className="text-label-sm text-on-surface-variant">{formatBytes(replacementFile.size)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between w-full gap-3 mt-4 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => { setReplacementFile(null); fileInputRef.current && fileInputRef.current.click(); }}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface text-body-sm font-semibold hover:bg-surface-container transition-all cursor-pointer"
              >
                Choose Another File
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : !replacementFile ? (
          /* Step 1: Option Selection (Upload New Version vs Already Uploaded) */
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Upload New Replacement */}
              <button
                type="button"
                disabled={Boolean(activeUpload)}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="p-4 rounded-xl border border-secondary/30 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all text-left flex flex-col justify-between gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">upload_file</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-[18px] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">arrow_forward</span>
                </div>
                <div>
                  <h4 className="text-body-sm font-bold text-primary">Upload New Revision</h4>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">Upload a revised file; current document will become an older version automatically.</p>
                </div>
              </button>

              {/* Option 2: Just Mark as Older Version */}
              <button
                type="button"
                onClick={handleJustMarkOlder}
                className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-amber-500/10 hover:border-amber-500/50 transition-all text-left flex flex-col justify-between gap-2 group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">history</span>
                  </div>
                  <span className="material-symbols-outlined text-amber-700 text-[18px] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">check</span>
                </div>
                <div>
                  <h4 className="text-body-sm font-bold text-primary">Already Uploaded</h4>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">Directly mark this document as an older version without uploading a new file.</p>
                </div>
              </button>
            </div>
            {error && <span className="text-error text-label-sm mt-1">{error}</span>}
          </div>
        ) : (
          /* Step 2: Upload Form - Exact same layout as standard UploadModal */
          <form onSubmit={handleUploadReplacement} className="flex flex-col gap-4">
            {/* Selected File Card */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-outline-variant/30">
                <span className={`material-symbols-outlined text-[24px] ${fileInfo.color}`}>{fileInfo.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-body-md font-semibold text-primary truncate" title={replacementFile.name}>
                    {replacementFile.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setReplacementFile(null)}
                    className="text-label-sm text-on-surface-variant hover:text-error cursor-pointer whitespace-nowrap"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-2 text-label-sm text-on-surface-variant mt-0.5">
                  <span>{formatBytes(replacementFile.size)}</span>
                  <span>•</span>
                  <span className="bg-surface px-2 py-0.5 rounded text-on-surface-variant font-medium border border-outline-variant/30">{fileInfo.label}</span>
                </div>
              </div>
            </div>

            {/* Version Input */}
            <div>
              <label className="block text-label-md font-label-md text-on-surface-variant mb-1">
                New Version
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
                    setError('');
                  }}
                  placeholder="1.1"
                  className="w-full py-2.5 pr-3 bg-transparent text-body-sm font-body-sm text-on-surface focus:outline-none font-mono font-bold text-primary"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-error/10 border border-error/30 rounded-lg text-error text-xs font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
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
                <span className="font-semibold text-primary">Automated Ingestion Pipeline:</span> New release will be indexed as <strong className="text-primary font-mono font-bold">v{versionNum || '1.1'}</strong> (Current). Previous document will be archived as Older Version.
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setReplacementFile(null)}
                className="px-4 py-2 rounded-lg text-body-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                Upload &amp; Set Current
              </button>
            </div>
          </form>
        )}

        {/* Modal Outer Footer for Option Chooser */}
        {!replacementFile && (
          <div className="flex items-center justify-end pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
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
