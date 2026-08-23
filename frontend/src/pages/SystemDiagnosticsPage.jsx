import React, { useState } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { exportDocumentVaultZip } from '../utils/zipExporter';

export default function SystemDiagnosticsPage() {
  const { documents } = useDocuments();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Trigger export of clean, self-contained Document Vault (.zip)
  const handleExportVault = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      await exportDocumentVaultZip(documents);
      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 6000);
    } catch (err) {
      console.error('Failed to export vault archive:', err);
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
            Database &amp; Vector Engine (PostgreSQL + pgvector)
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
            <div className="text-display-md font-bold text-primary">1,280 <span className="text-sm font-normal text-on-surface-variant">Files</span></div>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
            <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Total Chunk Embeddings</span>
            <div className="text-display-md font-bold text-primary">45,210 <span className="text-sm font-normal text-on-surface-variant">Chunks</span></div>
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
            onClick={handleExportVault}
            disabled={isExporting}
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-semibold text-body-sm transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-[1.02]"
          >
            <span className={`material-symbols-outlined text-[20px] ${isExporting ? 'animate-bounce' : ''}`}>
              package_2
            </span>
            {isExporting ? 'Generating Document Vault (.zip)...' : 'Export Document Vault (.zip)'}
          </button>

        </div>

        {/* Export Feedback Banner */}
        {exportSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-body-sm flex items-center gap-3 animate-in fade-in">
            <span className="material-symbols-outlined text-[22px] text-emerald-600">check_circle</span>
            <div>
              <strong className="font-semibold">Document Vault (.zip) Exported Successfully!</strong>
              <p className="text-xs text-emerald-700 mt-0.5">
                A clean, self-contained archive with <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">catalog_manifest.csv</code> (Excel-ready), <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">replacement_lineage.json</code>, and all active/historical documents organized by department has been saved to your downloads.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
