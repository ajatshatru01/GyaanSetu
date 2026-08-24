import { useDocuments } from '../context/DocumentContext';

function getStageProgress(statusLabel) {
  const l = (statusLabel || '').toLowerCase();
  if (l.includes('parsing')) return 25;
  if (l.includes('chunk')) return 50;
  if (l.includes('embed')) return 75;
  if (l.includes('vector') || l.includes('saving') || l.includes('indexing')) return 90;
  if (l.includes('indexed') || l.includes('processed')) return 100;
  return 15;
}

export default function ActiveUpload() {
  const { activeUpload, isAnyIngesting, ingestingDocs } = useDocuments();

  // Deduplicate ingestingDocs if activeUpload is in it
  const queueDocs = ingestingDocs.filter(d => !activeUpload || (d.id !== activeUpload.id && d.name !== activeUpload.name));
  const totalInQueue = (activeUpload ? 1 : 0) + queueDocs.length;

  if (totalInQueue === 0) {
    return (
      <div className="bg-surface-container rounded-2xl p-5 md:p-6 flex flex-col gap-3 shadow-sm border-l-4 border-[#107C41] border border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">smart_toy</span>
            <span className="text-label-md font-semibold text-on-surface uppercase tracking-wider">
              Ingestion Pipeline
            </span>
          </div>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#107C41] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#107C41]"></span>
            </span>
            Idle
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          RAG &amp; Vector Indexer is idle. Ready to parse and vectorize new documents.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-2xl p-5 md:p-6 flex flex-col gap-4 shadow-sm border-l-4 border-amber-500 border border-outline-variant/30 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[22px] animate-spin">
            progress_activity
          </span>
          <div className="flex flex-col">
            <span className="text-label-md font-bold text-on-surface uppercase tracking-wider">
              Ingestion Pipeline
            </span>
            <span className="text-[11px] text-on-surface-variant font-medium">
              {totalInQueue} document{totalInQueue > 1 ? 's' : ''} in queue / processing
            </span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 text-[11px] font-bold uppercase tracking-wider font-mono">
          pgvector sync
        </span>
      </div>

      {/* Vertical Queue List */}
      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
        {/* 1. Active File Upload (if in progress) */}
        {activeUpload && (
          <div className="bg-surface rounded-xl p-3.5 border border-amber-500/30 flex flex-col gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <span className={`material-symbols-outlined ${activeUpload.fileInfo?.color || 'text-error'} text-[18px]`}>
                  {activeUpload.fileInfo?.icon || 'picture_as_pdf'}
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-body-sm font-semibold text-primary truncate" title={activeUpload.name}>
                  {activeUpload.name}
                </span>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  {activeUpload.size || 'Uploading'} • {activeUpload.department || 'General'}
                </span>
              </div>
              <span className="text-xs font-bold text-amber-600 font-mono shrink-0">
                {activeUpload.progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${activeUpload.progress}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
              <span className="truncate mr-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] animate-spin text-amber-600">sync</span>
                {activeUpload.stage}
              </span>
              <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                Uploading
              </span>
            </div>
          </div>
        )}

        {/* 2. Documents Indexing in Background */}
        {queueDocs.map((doc, idx) => {
          const progress = getStageProgress(doc.status?.label);
          return (
            <div
              key={doc.id || idx}
              className="bg-surface rounded-xl p-3.5 border border-outline-variant/40 flex flex-col gap-2.5 shadow-2xs hover:border-amber-500/40 transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/30">
                  <span className={`material-symbols-outlined ${doc.icon?.color || 'text-error'} text-[18px]`}>
                    {doc.icon?.name || 'picture_as_pdf'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-body-sm font-semibold text-primary truncate" title={doc.name}>
                    {doc.name}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    {doc.version || 'v1.0'} • {doc.department || 'General'}
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-600 font-mono shrink-0">
                  {progress}%
                </span>
              </div>

              {/* Step Progress Bar */}
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-secondary h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Status / Stage Details */}
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                <span className="truncate mr-2 flex items-center gap-1 text-amber-700">
                  <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                  {doc.status?.label || 'Processing...'}
                </span>
                <span className="text-[10px] font-mono uppercase bg-surface-container text-on-surface-variant px-1.5 py-0.2 rounded font-bold">
                  Queue #{idx + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
