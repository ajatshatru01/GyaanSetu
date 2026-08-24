import { useState, useRef, useEffect } from 'react';
import { useDocuments } from '../context/DocumentContext';
import { documentService } from '../services/documentService';


const DEPARTMENT_SAMPLE_PROMPTS = {
  'All': [
    'What is the maximum permissible cant deficiency for 25kV traction line?',
    'Show me the CMRS safety clearance checklist for Line 2 extension',
    'Summarize penalty clauses for signaling vendor delay under GCC Section 4.2',
    'What are the monsoon standard operating procedures for track drainage?'
  ],
  'Rolling Stock': [
    'What is the maximum permissible cant deficiency for 25kV rolling stock?',
    'Explain pantograph carbon contact strip USFD testing intervals',
    'What are the electro-pneumatic emergency braking deceleration limits?'
  ],
  'Signaling': [
    'Summarize CBTC ATS server automatic emergency braking triggers',
    'What are the point machine throwing force and stroke duration standards?',
    'Explain dual-redundant axle counter fail-safe telemetry protocols'
  ],
  'Civil': [
    'What are the monsoon standard operating procedures for track drainage?',
    'Explain permissible differential settlement for elevated metro viaduct piers',
    'What is the maximum cant deficiency over 1 in 12 curved turnouts?'
  ],
  'Procurement': [
    'Summarize penalty and liquidated damage clauses for vendor milestone delay',
    'What are the Performance Bank Guarantee (PBG) defect liability requirements?',
    'Explain Price Variation Clause (PVC) eligibility under GCC 2026'
  ],
  'Safety & Compliance': [
    'Show me the CMRS statutory safety clearance checklist for Line 2',
    'What is the mandatory underground station evacuation time ceiling?',
    'What are the tunnel ventilation airflow velocity requirements in fire mode?'
  ],
  'Power & Traction': [
    'What is the permissible contact wire stagger on tangent and curved tracks?',
    'Explain numerical distance protection relay tripping thresholds for TSS',
    'What is the minimum OHE contact wire height in underground tunnels?'
  ]
};

// Helper to clean any page references, source citations, note sections, and 'Source X' mentions from generated answer text
function sanitizeAnswerText(text) {
  if (!text) return '';
  return text
    // 1. Remove trailing Sources/References/Notes section if present at the end
    .replace(/\n*###?\s*(?:Sources?|References?|Citations?|Notes?|Observations?)\s*[:\n][\s\S]*$/gi, '')
    // 2. Remove Blockquote Note lines (> **Note**:, > Note:, etc.)
    .replace(/^\s*>\s*(?:\*\*Note\*\*|\*Note\*|Note)?:?.*$/gim, '')
    // 3. Remove standalone **Note:** or Note: lines
    .replace(/^\s*(?:\*\*Note\*\*|\*Note\*|Note)\s*:\s*.*$/gim, '')
    // 4. Remove Bracketed/Parenthetical Sources: [Source 1], (Source 2), [Source 1, 2], [Sources: 1, 2]
    .replace(/\[\s*Sources?[:\s]*[\d\s,;&\-and]+\]/gi, '')
    .replace(/\(\s*Sources?[:\s]*[\d\s,;&\-and]+\)/gi, '')
    // 5. Remove phrases like 'According to Source 1,', 'From Source 2:', 'In Source 3,'
    .replace(/\b(?:according to|as per|as stated in|from|in|per)\s+Source\s*\d+\s*[,:]?\s*/gi, '')
    // 6. Remove standalone 'Source 1:', 'Source 2,', '(Source 1)'
    .replace(/\bSource\s*\d+[\s,:]*/gi, '')
    // 7. Remove Page references: (Page 18), Page 1:, on Page 4
    .replace(/\s*\(\s*Page\s*\d+\s*\)/gi, '')
    .replace(/,\s*Page\s*\d+/gi, '')
    .replace(/\b(?:on|in|at)?\s*Page\s*\d+[\s,:]*/gi, '')
    .replace(/\|\s*Page\s*\d+\s*\|/gi, '|')
    // 8. Clean dangling punctuation / empty brackets
    .replace(/\(\s*,\s*/g, '(')
    .replace(/,\s*\)/g, ')')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/[ \t]+/g, ' ')
    // 9. Capitalize first letter if source removal left leading lowercase
    .replace(/(^|\n|-\s*|\*\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    .trim();
}

// Helper to clean page suffix from chunk labels (e.g. 'Chunk #1 (Page 1)' -> 'Chunk #1')
function cleanChunkId(chunkId, fallbackIdx = 1) {
  if (!chunkId) return `Chunk #${fallbackIdx}`;
  return chunkId.replace(/\s*\([^)]*Page[^)]*\)/gi, '').trim() || `Chunk #${fallbackIdx}`;
}

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
  const sanitized = sanitizeAnswerText(content);
  const lines = sanitized.split('\n');

  return (
    <div className="flex flex-col gap-2.5 text-body-md text-on-surface leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Skip Note sections / Callouts
        if (trimmed.startsWith('> ') || /^###?\s*Notes?[:\s]*/i.test(trimmed) || /^(?:\*\*Note\*\*|\*Note\*|Note)[:\s]*/i.test(trimmed)) {
          return null;
        }

        // Subheading (### Title)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-body-lg font-bold text-primary mt-2 mb-1">
              {renderFormattedInlineText(trimmed.replace(/^###\s+/, ''))}
            </h4>
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

const STORAGE_KEY_THREAD = 'gyaansetu_search_thread';

export default function SetuSearchPage() {
  const { documents, departments, isAnyIngesting, ingestingDocs } = useDocuments();
  const [query, setQuery] = useState('');
  const [thread, setThread] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THREAD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Normalize so restored messages don't retain streaming flags
          return parsed.map(item => ({ ...item, isStreaming: false }));
        }
      }
    } catch (e) {
      console.error('Failed to restore search thread from localStorage:', e);
    }
    return [];
  });
  const [activeStreamingId, setActiveStreamingId] = useState(null);
  const [includeOlderVersions, setIncludeOlderVersions] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const inputRef = useRef(null);
  const latestMessageRef = useRef(null);

  // Sync thread changes to localStorage
  useEffect(() => {
    try {
      if (thread.length > 0) {
        const cleanThread = thread.map(item => ({ ...item, isStreaming: false }));
        localStorage.setItem(STORAGE_KEY_THREAD, JSON.stringify(cleanThread));
      } else {
        localStorage.removeItem(STORAGE_KEY_THREAD);
      }
    } catch (e) {
      console.error('Failed to save search thread to localStorage:', e);
    }
  }, [thread]);

  const availableDepartments = [
    'All',
    ...(departments && departments.length > 0
      ? departments
      : ['Rolling Stock', 'Signaling', 'Civil', 'Procurement', 'Safety & Compliance', 'Power & Traction'])
  ];

  const activeSamplePrompts = DEPARTMENT_SAMPLE_PROMPTS[selectedDepartment] || DEPARTMENT_SAMPLE_PROMPTS['All'];

  const handleSearch = async (searchQuery) => {
    const textToSearch = (typeof searchQuery === 'string' ? searchQuery : query).trim();
    if (!textToSearch || activeStreamingId) return;

    const newId = 'query_' + Date.now();
    const isHistorical = includeOlderVersions;
    const currentDepartment = selectedDepartment;

    const newEntry = {
      id: newId,
      query: textToSearch,
      answer: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      sources: [],
      includeOlderVersions: isHistorical,
      department: currentDepartment,
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

    try {
      const response = await documentService.queryKnowledgeBase(textToSearch, isHistorical, currentDepartment);

      const fullText = response.answer;
      const sourcesToUse = response.sources;

      // Update sources immediately
      setThread(prev => prev.map(item => item.id === newId ? { ...item, sources: sourcesToUse } : item));

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
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setThread(prev => prev.map(item => item.id === newId ? {
        ...item,
        answer: "Sorry, I encountered an error while trying to process your request. Please try again.",
        isStreaming: false
      } : item));
      setActiveStreamingId(null);
    }
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
    try {
      localStorage.removeItem(STORAGE_KEY_THREAD);
    } catch (e) {
      console.error(e);
    }
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="flex flex-col w-full gap-6 md:gap-8 max-w-[1400px] mx-auto pb-20 min-w-0 overflow-x-hidden">
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

      {/* Live Background Ingestion Pipeline Status Alert */}
      {isAnyIngesting && ingestingDocs && ingestingDocs.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-900">
                  Document Ingestion &amp; Vector Indexing in Progress
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30 font-mono">
                  {ingestingDocs.length} {ingestingDocs.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <p className="text-xs text-amber-900/80 truncate mt-0.5">
                {ingestingDocs.map(d => `${d.name} (${d.status?.label || 'Processing...'})`).join(' • ')}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0 text-right">
            <span className="text-[11px] font-semibold text-amber-800 bg-white/70 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-2xs">
              Knowledge base updating live
            </span>
          </div>
        </div>
      )}

      {/* Hero Search Box (When Thread is Empty) */}
      {thread.length === 0 && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm flex flex-col gap-5">

            {/* Integrated Search Bar with Embedded Department Selector */}
            <div className="relative w-full flex items-stretch bg-surface border border-outline-variant rounded-2xl shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all overflow-hidden">

              {/* Department Dropdown inside the search bar */}
              <div className="flex items-center shrink-0 border-r border-outline-variant/60 bg-surface-container-low/50 px-3.5 hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-secondary text-[20px] mr-2 pointer-events-none">
                  domain
                </span>
                <div className="relative flex items-center">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer pr-5 py-3 appearance-none select-none tracking-tight"
                    title="Filter search by department"
                  >
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept} className="text-on-surface bg-surface font-medium text-xs">
                        {dept === 'All' ? 'All Departments' : dept}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                    arrow_drop_down
                  </span>
                </div>
              </div>

              {/* Main Query Input */}
              <div className="relative flex-1 flex items-center min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedDepartment === 'All'
                      ? "Ask anything across all Metro specifications, SOPs, RDSO standards..."
                      : `Ask anything in ${selectedDepartment}...`
                  }
                  className="w-full pl-4 pr-52 py-4 bg-transparent border-none text-body-md font-medium text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
                  autoFocus
                />

                {/* Right Action Controls */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {/* Historical Toggle */}
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
                    className="px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none text-on-primary rounded-xl font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">search</span>
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested Queries */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider text-[11px]">
                  Suggested Queries {selectedDepartment !== 'All' && `for ${selectedDepartment}`}
                </span>
                {selectedDepartment !== 'All' && (
                  <span className="text-[11px] text-secondary font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                    Scoped to {selectedDepartment}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {activeSamplePrompts.map((prompt, idx) => (
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
        <div className="flex flex-col gap-6 w-full min-w-0 max-w-full">
          {thread.map((item, idx) => (
            <div
              key={item.id}
              ref={idx === thread.length - 1 ? latestMessageRef : null}
              className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 scroll-mt-6 w-full min-w-0 max-w-full"
            >
              {/* User Query Bubble */}
              <div className="flex items-start justify-end gap-3 w-full min-w-0">
                <div className="bg-primary text-on-primary rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-2xl shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/20 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      You
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-white/70">
                      <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border border-white/30">
                        <span className="material-symbols-outlined text-[12px]">domain</span>
                        {item.department === 'All' ? 'All Departments' : item.department}
                      </span>
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
              <div className="flex items-start gap-3.5 w-full min-w-0 max-w-full">
                <div className="w-10 h-10 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>

                <div className="flex-1 min-w-0 max-w-full bg-surface-container rounded-2xl rounded-tl-sm p-6 md:p-7 border border-outline-variant/40 shadow-sm flex flex-col gap-5 overflow-hidden">
                  {/* Scope indicator banner */}
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface border border-outline-variant/60 text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-secondary">domain</span>
                      Scope: {item.department === 'All' ? 'Cross-Department' : item.department}
                    </span>
                  </div>

                  {/* Clean Rendered Formatted Answer */}
                  <FormattedAnswer content={item.answer} isStreaming={item.isStreaming} />

                  {/* Dedicated Retrieved Sources & Chunks Section */}
                  {item.sources && item.sources.length > 0 && !item.isStreaming && (
                    <div className="flex flex-col gap-3 pt-4 border-t border-outline-variant/50 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-label-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[17px] text-secondary">source</span>
                          Retrieved Sources &amp; Knowledge Chunks ({item.sources.length})
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
                          {item.sources.length > 3 && (
                            <span className="hidden sm:inline-flex items-center gap-0.5 text-secondary mr-1">
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </span>
                          )}
                          <span>{item.department === 'All' ? 'All indexed departments' : `${item.department} vault`}</span>
                        </span>
                      </div>

                      {/* Horizontal Scrolling Chunk Carousel (3 visible per row by default) */}
                      <div className="w-full min-w-0 max-w-full flex items-stretch gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-outline-variant/60 hover:scrollbar-thumb-outline-variant snap-x">
                        {item.sources.map((src, sIdx) => {
                          const isOlder = src.docStatus === 'Older Version';
                          return (
                            <div
                              key={sIdx}
                              className={`w-full min-w-[280px] sm:min-w-[320px] md:min-w-[calc(33.333%-10px)] max-w-[420px] shrink-0 snap-start bg-surface rounded-xl p-3.5 border shadow-2xs transition-all flex flex-col justify-between gap-2.5 group ${
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
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-xs font-bold text-primary truncate" title={src.docName}>
                                      {src.docName}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant mt-1">
                                    <span className="px-1.5 py-0.2 rounded font-semibold text-[9.5px] inline-flex items-center gap-0.5 bg-secondary/10 text-secondary border border-secondary/20">
                                      <span className="material-symbols-outlined text-[11px]">domain</span>
                                      {src.department}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] inline-flex items-center gap-1.5 ${
                                      isOlder
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 min-w-[6px] min-h-[6px] aspect-square rounded-full shrink-0 ${isOlder ? 'bg-amber-600' : 'bg-emerald-600'}`}></span>
                                      <span>{isOlder ? 'Replaced' : 'Active'}</span>
                                    </span>
                                    <span className="font-mono text-secondary font-semibold">{cleanChunkId(src.chunkId, sIdx + 1)}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold">{src.relevance}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Chunk Text Snippet */}
                              <p className="text-[11.5px] text-on-surface-variant/90 leading-snug bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/30 italic flex-1">
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

              {/* Integrated Bottom Search Bar with Embedded Department Selector */}
              <div className="relative w-full flex items-stretch bg-surface border border-outline-variant rounded-2xl shadow-xs focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all overflow-hidden">

                {/* Department Dropdown inside the bottom search bar */}
                <div className="flex items-center shrink-0 border-r border-outline-variant/60 bg-surface-container-low/50 px-3 hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined text-secondary text-[18px] mr-1.5 pointer-events-none">
                    domain
                  </span>
                  <div className="relative flex items-center">
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      disabled={Boolean(activeStreamingId)}
                      className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer pr-5 py-2.5 appearance-none select-none tracking-tight"
                      title="Filter search by department"
                    >
                      {availableDepartments.map((dept) => (
                        <option key={dept} value={dept} className="text-on-surface bg-surface font-medium text-xs">
                          {dept === 'All' ? 'All Departments' : dept}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                      arrow_drop_down
                    </span>
                  </div>
                </div>

                {/* Main Query Input */}
                <div className="relative flex-1 flex items-center min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={Boolean(activeStreamingId)}
                    placeholder={
                      activeStreamingId
                        ? "Synthesizing answer..."
                        : selectedDepartment === 'All'
                          ? "Ask another question across Metro manuals (Press Enter)..."
                          : `Ask another question in ${selectedDepartment}...`
                    }
                    className="w-full pl-3.5 pr-52 py-3.5 bg-transparent border-none text-body-md font-medium text-on-surface focus:outline-none placeholder:text-on-surface-variant/60"
                    autoFocus
                  />

                  {/* Right Action Controls */}
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {/* Historical Toggle */}
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
                      className="px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none text-on-primary rounded-xl font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Search
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Sample Follow-ups */}
              <div className="flex flex-col gap-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider text-[11px]">
                  Suggested Follow-ups {selectedDepartment !== 'All' && `for ${selectedDepartment}`}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {activeSamplePrompts.map((prompt, idx) => (
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
