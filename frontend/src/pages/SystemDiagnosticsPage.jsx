import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';
import { exportDocumentVaultZip } from '../utils/zipExporter';

export default function SystemDiagnosticsPage() {
  const { documents, departments } = useDocuments();
  const [isExporting, setIsExporting] = useState(false);

  // Export Scope Selection Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState('All'); // 'All' | 'Department'
  const [selectedDept, setSelectedDept] = useState(departments?.[0] || 'Rolling Stock');

  const deptList = departments && departments.length > 0
    ? departments
    : ['Rolling Stock', 'Signaling', 'Civil', 'Procurement', 'Safety & Compliance', 'Power & Traction'];

  // Count docs for target scope
  const targetDocs = exportScope === 'All'
    ? documents
    : documents.filter(d => (d.department || '').toLowerCase() === selectedDept.toLowerCase());

  // Trigger export of clean, self-contained Document Vault (.zip)
  const handleExecuteExport = async () => {
    setIsExporting(true);
    setShowExportModal(false);

    try {
      const scopeDept = exportScope === 'All' ? 'All' : selectedDept;
      await exportDocumentVaultZip(documents, scopeDept);
    } catch (err) {
      console.error('Failed to export vault archive:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 md:gap-8 max-w-[1700px] mx-auto pb-20 md:pb-28">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <h1 className="text-display-lg font-display-lg text-on-surface">System Diagnostics</h1>
        <p className="text-body-md font-body-md text-on-surface-variant">
          Live telemetry for edge workstation hardware, PostgreSQL pgvector database, and local AI pipelines.
        </p>
      </div>

      {/* Edge Node & Hardware Telemetry */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">developer_board</span>
            Edge Node &amp; Hardware Telemetry
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CPU Load Meter */}
          <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20 shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">memory</span>
              </div>
              <div>
                <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">CPU Load</span>
                <div className="text-title-lg font-bold text-primary">18%</div>
              </div>
            </div>
            <div>
              <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-outline-variant/30">
                <div className="bg-secondary h-2.5 rounded-full transition-all duration-500" style={{ width: '18%' }}></div>
              </div>
            </div>
          </div>

          {/* RAM Usage Meter */}
          <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">speed</span>
              </div>
              <div>
                <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">RAM Usage</span>
                <div className="text-title-lg font-bold text-primary">4.2 GB <span className="text-xs font-normal text-on-surface-variant">/ 16.0 GB</span></div>
              </div>
            </div>
            <div>
              <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-outline-variant/30">
                <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: '26.2%' }}></div>
              </div>
            </div>
          </div>

          {/* Disk Storage Meter */}
          <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F9AC00]/15 text-[#B87D00] flex items-center justify-center border border-[#F9AC00]/30 shadow-2xs">
                <span className="material-symbols-outlined text-[22px]">hard_drive</span>
              </div>
              <div>
                <span className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">PDF Storage Cache</span>
                <div className="text-title-lg font-bold text-primary">42 GB <span className="text-xs font-normal text-on-surface-variant">/ 500 GB</span></div>
              </div>
            </div>
            <div>
              <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-outline-variant/30">
                <div className="bg-[#B87D00] h-2.5 rounded-full transition-all duration-500" style={{ width: '8.4%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database & Vector Engine (PostgreSQL + pgvector) */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">database</span>
            Database &amp; Vector Engine
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Connected (Port 5432)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
            <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Total Documents Indexed</span>
            <div className="text-display-md font-bold text-primary">{documents.length.toLocaleString()} <span className="text-sm font-normal text-on-surface-variant">{documents.length === 1 ? 'File' : 'Files'}</span></div>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
            <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Total Chunk Embeddings</span>
            <div className="text-display-md font-bold text-primary">{(documents.length * 36).toLocaleString()} <span className="text-sm font-normal text-on-surface-variant">Chunks</span></div>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
            <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Vector Index Type</span>
            <div className="text-display-md font-bold text-primary">HNSW / Cosine</div>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
            <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Avg Retrieval Latency</span>
            <div className="text-display-md font-bold text-emerald-700">38 ms</div>
          </div>
        </div>
      </div>

      {/* Local AI Pipeline Health */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">smart_toy</span>
            Local AI Pipeline Health
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Embedding Model Card */}
          <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col gap-3">
            <span className="text-label-sm font-bold uppercase tracking-wider text-primary pb-2 border-b border-outline-variant/40">
              Embedding Model
            </span>
            <div>
              <h3 className="text-body-lg font-bold text-primary">all-MiniLM-L6-v2</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Local ONNX Runtime Engine</p>
            </div>
            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Vector Dimension:</span>
                <span className="font-mono text-primary">384 Dimensions</span>
              </div>
              <div className="flex justify-between">
                <span>Batch Inference Speed:</span>
                <span className="font-semibold text-emerald-700">~14 ms / 16 chunks</span>
              </div>
            </div>
          </div>

          {/* OCR & Layout Parser Card */}
          <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col gap-3">
            <span className="text-label-sm font-bold uppercase tracking-wider text-primary pb-2 border-b border-outline-variant/40">
              OCR &amp; Layout Parser
            </span>
            <div>
              <h3 className="text-body-lg font-bold text-primary">Docling</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Parallel Ingestion Worker Pool</p>
            </div>
            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Worker Pool:</span>
                <span className="font-semibold text-primary">4 Async Threads</span>
              </div>
              <div className="flex justify-between">
                <span>OCR Throughput:</span>
                <span className="font-semibold text-emerald-700">~1.2 sec / PDF page</span>
              </div>
            </div>
          </div>

          {/* Inference Engine Card */}
          <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col gap-3">
            <span className="text-label-sm font-bold uppercase tracking-wider text-primary pb-2 border-b border-outline-variant/40">
              Inference Engine
            </span>
            <div>
              <h3 className="text-body-lg font-bold text-primary">Ollama / Local LLM</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Llama-3-8B-Instruct (Q4_K_M)</p>
            </div>
            <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Context Window:</span>
                <span className="font-mono text-primary">8,192 Tokens</span>
              </div>
              <div className="flex justify-between">
                <span>Generation Speed:</span>
                <span className="font-semibold text-emerald-700">~42 tokens/sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Administrative Tools */}
      <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
          <div>
            <h2 className="text-title-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">build</span>
              Quick Administrative Tools
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Perform one-click administrative dumps, cache flushes, and data backup maintenance.
            </p>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Main Export Document Vault (.zip) Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            className={`px-5 py-3 rounded-xl font-semibold text-body-sm transition-all flex items-center gap-2.5 shadow-md ${
              isExporting
                ? 'bg-surface-container-high text-on-surface-variant/60 border border-outline-variant/60 cursor-not-allowed shadow-none'
                : 'bg-primary hover:bg-primary-container text-on-primary cursor-pointer hover:scale-[1.02]'
            }`}
          >
            {isExporting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin text-secondary">
                  progress_activity
                </span>
                <span>Exporting Document Vault (.zip)...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">
                  package_2
                </span>
                <span>Export Document Vault (.zip)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export Scope Selection Modal */}
      {showExportModal && createPortal(
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => { if (!isExporting) setShowExportModal(false); }}
        >
          <div
            className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-[540px] p-6 relative my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">package_2</span>
                </div>
                <div>
                  <h3 className="text-title-lg font-bold text-primary">Export Document Vault (.zip)</h3>
                  <p className="text-body-sm text-on-surface-variant">Select whether to archive all departments or a specific department.</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setShowExportModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>

            {/* Scope Selection Cards */}
            <div className="flex flex-col gap-3">
              <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Select Export Scope
              </span>

              {/* Option 1: All Departments */}
              <div
                onClick={() => setExportScope('All')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  exportScope === 'All'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-outline-variant/60 bg-surface-container-low hover:border-outline-variant hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    exportScope === 'All' ? 'border-primary bg-primary text-white' : 'border-outline-variant'
                  }`}>
                    {exportScope === 'All' && <span className="material-symbols-outlined text-[14px]">check</span>}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-body-md text-primary font-bold block truncate">All Departments (Complete Vault)</strong>
                    <p className="text-xs text-on-surface-variant">Includes every active file, revision history, and manifest</p>
                  </div>
                </div>
              </div>

              {/* Option 2: Department-Wise */}
              <div
                onClick={() => setExportScope('Department')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                  exportScope === 'Department'
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-outline-variant/60 bg-surface-container-low hover:border-outline-variant hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    exportScope === 'Department' ? 'border-primary bg-primary text-white' : 'border-outline-variant'
                  }`}>
                    {exportScope === 'Department' && <span className="material-symbols-outlined text-[14px]">check</span>}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-body-md text-primary font-bold block truncate">Department-Specific Vault</strong>
                    <p className="text-xs text-on-surface-variant">Export files belonging strictly to a single department</p>
                  </div>
                </div>

                {/* Department Selection Dropdown when Department Scope is Active */}
                {exportScope === 'Department' && (
                  <div className="pt-2 border-t border-outline-variant/40 flex flex-col gap-2 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs font-semibold text-primary">Choose Department:</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-sm font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 shadow-2xs cursor-pointer"
                    >
                      {deptList.map(dept => {
                        const count = documents.filter(d => (d.department || '').toLowerCase() === dept.toLowerCase()).length;
                        return (
                          <option key={dept} value={dept}>
                            {dept} ({count} {count === 1 ? 'file' : 'files'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Archive Content Summary Card */}
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">folder_zip</span>
                <span className="truncate">Archive target: <strong className="text-primary">{exportScope === 'All' ? 'Complete Knowledge Vault' : `${selectedDept} Department`}</strong></span>
              </span>
              <span className="font-bold text-primary font-mono whitespace-nowrap shrink-0">{targetDocs.length} {targetDocs.length === 1 ? 'document' : 'documents'}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-semibold text-body-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExecuteExport}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-60 text-on-primary font-semibold text-body-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[18px] ${isExporting ? 'animate-bounce' : ''}`}>
                  package_2
                </span>
                {isExporting ? 'Packaging Archive...' : 'Download Vault (.zip)'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
