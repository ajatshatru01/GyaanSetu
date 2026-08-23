import { useState, useRef } from 'react';

const MOCK_CURRENT_ONLY_ANSWER = `Based on the active Metro Engineering Manuals (SOP-RS-2026-Rev3) and CMRS Safety Circular 14/2025:

### 1. Key Engineering Findings & Specifications
- **Permissible Cant Deficiency**: On mainline tracks under 25 kV AC OHE traction, the standard cant deficiency is capped at **100 mm** for standard BG/SG Metro rolling stock.
- **Speed & Turnout Limitations**: For operation over curved turnouts (1 in 12 or 1 in 8.5), the maximum allowable cant deficiency shall not exceed **75 mm** unless special dispensation is issued by RDSO.
- **Inspection Protocol**: Ultrasonic flaw detection (USFD) and pantograph contact force measurements must be performed bi-weekly during monsoon conditions.
- **Interlocking & Fail-Safe Integration**: All track circuit clearance telemetry must integrate with the CBTC ATS server to enforce automatic emergency braking (EB) upon threshold violation.`;

const MOCK_ALL_VERSIONS_ANSWER = `Based on a cross-comparison of both Current Active standards and Historical Revisions in the knowledge base:

### 1. Current Active Specification (2026 Release)
- **Current Cant Deficiency**: Strictly capped at **100 mm** for mainline 25 kV AC OHE tracks (**Pantograph_Inspection_2026_Rev3.pdf**, Section 4.2).
- **Turnout Speed Restrictions**: Reduced to **75 mm** on 1:12 turnouts to prevent excessive flange wear.

### 2. Historical & Superseded Rules (2024 Baseline)
- **Superseded Limit**: Previously allowed up to **110 mm** under older guideline (**Pantograph_Inspection_2024_Rev1.pdf**, Section 3.1). This was superseded to reduce pantograph carbon strip wear and harmonic vibration.
- **Legacy Turnout Tolerance**: Formerly permitted **85 mm** before the 2025 RDSO safety amendment.

> **Historical Audit Notice**: This query retrieved parameters across 2 active releases and 1 superseded revision for comparison.`;

const MOCK_CURRENT_SOURCES = [
  {
    docName: 'Pantograph_Inspection_2026_Rev3.pdf',
    department: 'Rolling Stock',
    version: 'v3.0',
    docStatus: 'Current',
    chunkId: 'Chunk #4 (Page 18)',
    relevance: '98.4% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Clause 4.2.3: For 25kV AC overhead equipment (OHE) mainline corridors, the maximum permissible cant deficiency for broad gauge (BG) and standard gauge (SG) rolling stock shall not exceed 100mm under normal operating speeds.'
  },
  {
    docName: 'Track_Drainage_Monsoon_SOP_Rev4.pdf',
    department: 'Civil',
    version: 'v4.0',
    docStatus: 'Current',
    chunkId: 'Chunk #12 (Page 9)',
    relevance: '94.8% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Table 3.1: Special speed restrictions over turnouts (1 in 12 and 1 in 8.5) mandate a reduced cant deficiency limit of 75mm during high-precipitation periods.'
  },
  {
    docName: 'CBTC_Signaling_Interlocking_Spec_2026.docx',
    department: 'Signaling',
    version: 'v2.1',
    docStatus: 'Current',
    chunkId: 'Chunk #7 (Page 34)',
    relevance: '91.2% Match',
    icon: 'description',
    iconColor: 'text-[#2B579A]',
    snippet: 'Appendix B: Automatic Train Supervision (ATS) safety profiles enforce immediate Emergency Brake (EB) triggers when cant deficiency telemetry thresholds are exceeded.'
  }
];

const MOCK_ALL_VERSIONS_SOURCES = [
  {
    docName: 'Pantograph_Inspection_2026_Rev3.pdf',
    department: 'Rolling Stock',
    version: 'v3.0',
    docStatus: 'Current',
    chunkId: 'Chunk #4 (Page 18)',
    relevance: '98.4% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Clause 4.2.3 (Current): Maximum permissible cant deficiency capped at 100mm under normal operating speeds.'
  },
  {
    docName: 'Pantograph_Inspection_2024_Rev1.pdf',
    department: 'Rolling Stock',
    version: 'v1.0',
    docStatus: 'Older Version',
    chunkId: 'Chunk #2 (Page 7)',
    relevance: '95.1% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-amber-700',
    snippet: 'Clause 3.1.2 (Superseded): Permissible cant deficiency up to 110mm permitted under 2024 operational schedule.'
  },
  {
    docName: 'Track_Drainage_Monsoon_SOP_Rev4.pdf',
    department: 'Civil',
    version: 'v4.0',
    docStatus: 'Current',
    chunkId: 'Chunk #12 (Page 9)',
    relevance: '92.4% Match',
    icon: 'picture_as_pdf',
    iconColor: 'text-error',
    snippet: 'Table 3.1 (Current): Mandatory turnout cant deficiency ceiling of 75mm during monsoon maintenance cycles.'
  }
];

const SAMPLE_PROMPTS = [
  'What is the maximum permissible cant deficiency for 25kV traction line?',
  'Show me the CMRS safety clearance checklist for Line 2 extension',
  'Summarize penalty clauses for signaling vendor delay under GCC Section 4.2',
  'What are the monsoon standard operating procedures for track drainage?'
];

// Helper to format inline bold markdown **text** into clean React nodes
function renderFormattedInlineText(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Markdown Formatter Component for rendering cleaned structured content
function FormattedAnswer({ content, isStreaming }) {
  const lines = content.split('\n');

  return (
    <div className="flex flex-col gap-2.5 text-body-md text-on-surface leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Subheading (### Title)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-body-lg font-bold text-primary mt-2 mb-1">
              {renderFormattedInlineText(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Callout (> Note)
        if (trimmed.startsWith('> ')) {
          return (
            <div key={idx} className="p-3.5 my-1.5 rounded-xl bg-surface border-l-4 border-secondary border border-outline-variant/40 text-on-surface-variant text-body-sm shadow-2xs">
              {renderFormattedInlineText(trimmed.replace(/^>\s+/, ''))}
            </div>
          );
        }

        // Bullet Point (- Item)
        if (trimmed.startsWith('- ')) {
          const bulletContent = trimmed.replace(/^-\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-2"></span>
              <span className="flex-1 text-on-surface">
                {renderFormattedInlineText(bulletContent)}
              </span>
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-on-surface">
            {renderFormattedInlineText(trimmed)}
          </p>
        );
      })}

      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle"></span>
      )}
    </div>
  );
}

export default function SetuSearchPage() {
  const [query, setQuery] = useState('');
  const [thread, setThread] = useState([]);
  const [activeStreamingId, setActiveStreamingId] = useState(null);
  const [includeOlderVersions, setIncludeOlderVersions] = useState(false);
  const inputRef = useRef(null);
  const latestMessageRef = useRef(null);

  const handleSearch = (searchQuery) => {
    const textToSearch = (typeof searchQuery === 'string' ? searchQuery : query).trim();
    if (!textToSearch || activeStreamingId) return;

    const newId = 'query_' + Date.now();
    const isHistorical = includeOlderVersions;
    const sourcesToUse = isHistorical ? MOCK_ALL_VERSIONS_SOURCES : MOCK_CURRENT_SOURCES;
    const fullText = isHistorical ? MOCK_ALL_VERSIONS_ANSWER : MOCK_CURRENT_ONLY_ANSWER;

    const newEntry = {
      id: newId,
      query: textToSearch,
      answer: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      sources: sourcesToUse,
      includeOlderVersions: isHistorical,
    };

    setThread(prev => [...prev, newEntry]);
    setQuery('');
    setActiveStreamingId(newId);

    // Smoothly focus on the new question & streaming answer once on submit
    setTimeout(() => {
      if (latestMessageRef.current) {
        latestMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    // Stream word-by-word with clean chunk updates
    let currentIndex = 0;
    const chunkSize = 8;

    const streamInterval = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= fullText.length) {
        clearInterval(streamInterval);
        setThread(prev => prev.map(item => item.id === newId ? { ...item, answer: fullText, isStreaming: false } : item));
        setActiveStreamingId(null);
      } else {
        const currentText = fullText.slice(0, currentIndex);
        setThread(prev => prev.map(item => item.id === newId ? { ...item, answer: currentText } : item));
      }
    }, 18);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleClearThread = () => {
    setThread([]);
    setQuery('');
    setActiveStreamingId(null);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="flex flex-col w-full gap-6 md:gap-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-lg font-display-lg text-on-surface">SetuSearch</h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Natural Language Semantic Search &amp; RAG Question Answering across all indexed Metro manuals.
          </p>
        </div>

        {thread.length > 0 && (
          <button
            type="button"
            onClick={handleClearThread}
            className="px-4 py-2 rounded-xl bg-surface border border-outline-variant hover:border-error/50 hover:bg-error/10 text-on-surface-variant hover:text-error text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            New Conversation
          </button>
        )}
      </div>

      {/* Hero Search Box (When Thread is Empty) */}
      {thread.length === 0 && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm flex flex-col gap-5">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-[24px] pointer-events-none">
                psychology
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything across Metro specifications, SOPs, RDSO standards, or contracts..."
                className="w-full pl-12 pr-36 py-4 bg-surface border border-outline-variant rounded-xl text-body-md font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 shadow-xs placeholder:text-on-surface-variant/60"
                autoFocus
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {/* Native HTML title tooltip */}
                <button
                  type="button"
                  onClick={() => setIncludeOlderVersions(!includeOlderVersions)}
                  title={includeOlderVersions
                    ? "Older editions included (Click to search active only)"
                    : "Include older editions & superseded revisions in search"}
                  className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    includeOlderVersions
                      ? 'text-amber-700 bg-amber-100 ring-1 ring-amber-400'
                      : 'text-on-surface-variant hover:text-amber-700 hover:bg-amber-50/70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {includeOlderVersions ? 'history_toggle_off' : 'history'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={!query.trim()}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none text-on-primary rounded-lg font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                  Search
                </button>
              </div>
            </div>

            {/* Suggested Queries */}
            <div className="flex flex-col gap-2.5">
              <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Suggested Queries</span>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSearch(prompt)}
                    className="px-3.5 py-2 bg-surface hover:bg-surface-container-high border border-outline-variant/60 rounded-xl text-body-sm text-on-surface text-left transition-all cursor-pointer flex items-center gap-2 shadow-2xs hover:border-secondary/60 shrink-0 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">help_outline</span>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversational Stream Thread */}
      {thread.length > 0 && (
        <div className="flex flex-col gap-6">
          {thread.map((item, idx) => (
            <div
              key={item.id}
              ref={idx === thread.length - 1 ? latestMessageRef : null}
              className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 scroll-mt-6"
            >
              {/* User Query Bubble */}
              <div className="flex items-start justify-end gap-3">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-2xl shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/20 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      You
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-white/70">
                      {item.includeOlderVersions && (
                        <span className="bg-amber-400/30 text-amber-100 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-amber-300/40">
                          Included Older Versions
                        </span>
                      )}
                      <span className="font-mono">{item.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-body-md font-medium">{item.query}</p>
                </div>
              </div>

              {/* AI Clean Answer Card */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>

                <div className="flex-1 bg-surface-container rounded-2xl rounded-tl-sm p-6 md:p-7 border border-outline-variant/40 shadow-sm flex flex-col gap-5">
                  {/* Clean Rendered Formatted Answer */}
                  <FormattedAnswer content={item.answer} isStreaming={item.isStreaming} />

                  {/* Dedicated Retrieved Sources & Chunks Section */}
                  {item.sources && item.sources.length > 0 && !item.isStreaming && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/50 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[17px] text-secondary">source</span>
                          Retrieved Sources &amp; Knowledge Chunks ({item.sources.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {item.sources.map((src, sIdx) => {
                          const isOlder = src.docStatus === 'Older Version';
                          return (
                            <div
                              key={sIdx}
                              className={`bg-surface rounded-xl p-3.5 border shadow-2xs transition-all flex flex-col gap-2 group ${
                                isOlder
                                  ? 'border-amber-300/70 bg-amber-50/20 hover:border-amber-400'
                                  : 'border-outline-variant/60 hover:shadow-xs'
                              }`}
                            >
                              {/* Document Header */}
                              <div className="flex items-start gap-2 min-w-0">
                                <span className={`material-symbols-outlined ${src.iconColor} text-[20px] shrink-0 mt-0.5`}>
                                  {src.icon}
                                </span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-primary truncate" title={src.docName}>
                                      {src.docName}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant mt-1">
                                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] inline-flex items-center gap-1.5 ${
                                      isOlder
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 min-w-[6px] min-h-[6px] aspect-square rounded-full shrink-0 ${isOlder ? 'bg-amber-600' : 'bg-emerald-600'}`}></span>
                                      <span>{isOlder ? 'Replaced Revision' : 'Current Active'}</span>
                                    </span>
                                    <span className="font-mono text-secondary font-semibold">{src.chunkId}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold">{src.relevance}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Chunk Text Snippet */}
                              <p className="text-[11.5px] text-on-surface-variant/90 leading-snug bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/30 italic">
                                "{src.snippet}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Inline Bottom Search Input for Consecutive Questions */}
          <div className="w-full pt-2">
            <div className="bg-surface-container rounded-2xl p-5 md:p-6 border border-outline-variant/40 shadow-sm flex flex-col gap-4">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-[24px] pointer-events-none">
                  psychology
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={Boolean(activeStreamingId)}
                  placeholder={activeStreamingId ? "Synthesizing answer..." : "Ask another question across Metro manuals (Press Enter)..."}
                  className="w-full pl-12 pr-36 py-3.5 bg-surface border border-outline-variant rounded-xl text-body-md font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 shadow-xs placeholder:text-on-surface-variant/60"
                  autoFocus
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {/* Native HTML title tooltip */}
                  <button
                    type="button"
                    disabled={Boolean(activeStreamingId)}
                    onClick={() => setIncludeOlderVersions(!includeOlderVersions)}
                    title={includeOlderVersions
                      ? "Older editions included (Click to search active only)"
                      : "Include older editions & superseded revisions in search"}
                    className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      includeOlderVersions
                        ? 'text-amber-700 bg-amber-100 ring-1 ring-amber-400'
                        : 'text-on-surface-variant hover:text-amber-700 hover:bg-amber-50/70'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {includeOlderVersions ? 'history_toggle_off' : 'history'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={!query.trim() || Boolean(activeStreamingId)}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none text-on-primary rounded-lg font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Search
                  </button>
                </div>
              </div>

              {/* Quick Sample Follow-ups */}
              <div className="flex flex-col gap-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Suggested Follow-ups</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {SAMPLE_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(activeStreamingId)}
                      onClick={() => handleSearch(prompt)}
                      className="px-3.5 py-1.5 bg-surface hover:bg-surface-container-high border border-outline-variant/60 rounded-xl text-body-sm text-on-surface text-left transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:border-secondary/60 shrink-0 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">help_outline</span>
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
