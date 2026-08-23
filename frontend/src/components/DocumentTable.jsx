import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';
import TagModal from './TagModal';

export default function DocumentTable() {
  const {
    documents,
    tags,
    searchQuery,
    setSearchQuery,
    selectedDepartment,
    setSelectedDepartment,
    selectedTagsFilter,
    toggleTagFilter,
    clearTagFilters,
    handleDeleteDocument,
    handleUpdateDocumentVersion,
    handleUpdateDocumentTags,
  } = useDocuments();

  const [showTagModal, setShowTagModal] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editingVersionValue, setEditingVersionValue] = useState('');
  const [versionError, setVersionError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Inline Tag Assignment Popover State
  const [activeTagPopoverDocId, setActiveTagPopoverDocId] = useState(null);
  const tagPopoverRef = useRef(null);

  // Delete Confirmation & Fake RAG Purge States (~2s)
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeStage, setPurgeStage] = useState('');

  // Date Filter States
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | '7days' | '30days' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);

  // Close date picker dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (tagPopoverRef.current && !tagPopoverRef.current.contains(e.target)) {
        setActiveTagPopoverDocId(null);
      }
    }
    if (showDatePicker || activeTagPopoverDocId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker, activeTagPopoverDocId]);

  // Primary Department tabs matching standard metro engineering departments
  const CORE_DEPT_TABS = ['All', 'Rolling Stock', 'Signaling', 'Civil', 'Procurement', 'Safety & Compliance', 'Power & Traction'];

  // Count items for each tab
  const getTabCount = (tab) => {
    if (tab === 'All') return documents.length;
    return documents.filter(doc => (doc.department || '').toLowerCase().includes(tab.toLowerCase())).length;
  };

  // Helper to format ISO timestamp into readable Date & Time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: 'Initial Release', time: '—' };
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return { date: 'Initial Release', time: '—' };

    const dateStr = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return { date: dateStr, time: timeStr };
  };

  // Filter documents based on Search, Department tab, Multi-Tags, and Date Filter
  const filteredDocuments = documents.filter(doc => {
    // 1. Department filter
    if (selectedDepartment !== 'All') {
      const matchDept = (doc.department || '').toLowerCase().includes(selectedDepartment.toLowerCase());
      if (!matchDept) return false;
    }

    // 2. Multi-Tag filter (AND logic: match documents having ALL selected tags)
    if (selectedTagsFilter && selectedTagsFilter.length > 0) {
      const docTags = doc.tags || [];
      const matchesAllSelectedTags = selectedTagsFilter.every(tagFilter =>
        docTags.some(t => t.id === tagFilter || t.label === tagFilter || t.label?.toLowerCase() === tagFilter?.toLowerCase())
      );
      if (!matchesAllSelectedTags) return false;
    }

    // 3. Search query (Keyword / Multi-term token matching)
    if (searchQuery.trim()) {
      const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const docName = (doc.name || '').toLowerCase();
      const docDept = (doc.department || '').toLowerCase();
      const docVersion = (doc.version || '').toLowerCase();
      const docTags = (doc.tags || []).map(t => (t.label || '').toLowerCase()).join(' ');

      const combinedText = `${docName} ${docDept} ${docVersion} ${docTags}`;

      const matchesAllTokens = tokens.every(token => combinedText.includes(token));
      if (!matchesAllTokens) return false;
    }

    // 4. Date Filter
    if (datePreset !== 'all') {
      const docDate = doc.uploadedAt ? new Date(doc.uploadedAt) : null;
      if (!docDate || isNaN(docDate.getTime())) return false;

      const now = new Date();
      if (datePreset === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (docDate < todayStart) return false;
      } else if (datePreset === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (docDate < sevenDaysAgo) return false;
      } else if (datePreset === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (docDate < thirtyDaysAgo) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (docDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (docDate > end) return false;
        }
      }
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocs = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const startEditVersion = (doc) => {
    setEditingVersionId(doc.id);
    setEditingVersionValue((doc.version || 'v1.0').replace(/^v/i, ''));
    setVersionError('');
  };

  const saveEditVersion = async (docId) => {
    const clean = editingVersionValue.trim().replace(/^v/i, '') || '1.0';
    const res = await handleUpdateDocumentVersion(docId, `v${clean}`);
    if (res && !res.success) {
      setVersionError(res.error);
      setTimeout(() => setVersionError(''), 4000);
    } else {
      setEditingVersionId(null);
      setVersionError('');
    }
  };

  // Toggle tag for a specific document inline
  const toggleDocTag = async (doc, tag) => {
    const currentTags = doc.tags || [];
    const exists = currentTags.some(t => t.id === tag.id);
    const newTags = exists
      ? currentTags.filter(t => t.id !== tag.id)
      : [...currentTags, tag];
    await handleUpdateDocumentTags(doc.id, newTags);
  };

  // Delete Confirmation and RAG Purge Handlers
  const initiateDelete = (doc) => {
    setDeletingDoc(doc);
    setIsPurging(false);
    setPurgeStage('');
  };

  const handleConfirmPurgeDelete = async () => {
    if (!deletingDoc) return;
    setIsPurging(true);
    setPurgeStage('Unlinking document chunks from OCR layout cache...');

    setTimeout(() => {
      setPurgeStage('Flushing vector embeddings from pgvector database...');
    }, 900);

    setTimeout(async () => {
      await handleDeleteDocument(deletingDoc.id);
      setIsPurging(false);
      setDeletingDoc(null);
      setPurgeStage('');
    }, 2000);
  };

  const getDateFilterLabel = () => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === '7days') return 'Last 7 Days';
    if (datePreset === '30days') return 'Last 30 Days';
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} → ${customEndDate}`;
      if (customStartDate) return `From ${customStartDate}`;
      if (customEndDate) return `Until ${customEndDate}`;
      return 'Custom Range';
    }
    return 'Filter by Date';
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 lg:col-span-8 w-full min-w-0">
      {/* Filter Toolbar Card with generous padding & breathing room */}
      <div className="bg-surface-container rounded-2xl p-5 md:p-6 lg:p-7 flex flex-col gap-5 md:gap-6 shadow-sm border border-outline-variant/30 shrink-0">
        {/* Row 1: Search Input & Department Tabs */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 xl:gap-6">
          <div className="relative w-full xl:w-2/5 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px] z-10 pointer-events-none">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-10 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-md font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/60 cursor-text shadow-2xs"
              placeholder="Filter by file name or tag..."
              type="text"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-full cursor-pointer flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto hide-scrollbar w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-max pb-1 border-b border-outline-variant/40">
              {CORE_DEPT_TABS.map((tab) => {
                const count = getTabCount(tab);
                const isActive = selectedDepartment === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setSelectedDepartment(tab); setCurrentPage(1); }}
                    className={`px-3.5 py-2 text-label-md font-label-md border-b-2 transition-all cursor-pointer rounded-t-lg ${
                      isActive
                        ? 'border-primary text-primary font-bold bg-primary/5'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Tag Filter Pills & Stacked Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Left: Tag filter chips */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] hidden sm:block mr-1">
              local_offer
            </span>

            <button
              onClick={() => { clearTagFilters(); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-label-sm font-label-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedTagsFilter.length === 0
                  ? 'bg-surface border-2 border-black text-black font-bold shadow-xs'
                  : 'bg-surface border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              All Tags
            </button>

            {tags.map((tag) => {
              const isSelected = selectedTagsFilter.includes(tag.id) || selectedTagsFilter.includes(tag.label);
              const tagHex = tag.hex || '#016879';
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => { toggleTagFilter(tag.id); setCurrentPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-label-sm font-semibold flex items-center gap-2 transition-all cursor-pointer select-none bg-surface-container text-on-surface ${
                    isSelected
                      ? 'border-2 shadow-xs scale-105 font-bold ring-2 ring-black/10'
                      : 'border opacity-90 hover:opacity-100 hover:scale-[1.02] hover:bg-surface-container-high'
                  }`}
                  style={{
                    borderColor: tagHex,
                    borderWidth: isSelected ? '2px' : '1.5px',
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tagHex }}></span>
                  <span className="text-on-surface">{tag.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px] font-bold text-on-surface">check</span>
                  )}
                </button>
              );
            })}

            {selectedTagsFilter.length > 1 && (
              <button
                type="button"
                onClick={() => { clearTagFilters(); setCurrentPage(1); }}
                className="text-xs text-on-surface-variant hover:text-error underline cursor-pointer px-2 py-1"
              >
                Clear Tags ({selectedTagsFilter.length})
              </button>
            )}
          </div>

          {/* Right: Vertically Stacked Manage Tags (Top) and Filter by Date (Bottom) */}
          <div className="flex flex-col items-end gap-2 shrink-0 ml-auto">
            {/* 1. Manage Tags Button (Top) */}
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="px-3.5 py-1.5 border border-dashed border-outline-variant/80 text-on-surface-variant rounded-full text-label-sm font-semibold flex items-center gap-1.5 hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Manage Tags
            </button>

            {/* 2. Date Filter Dropdown */}
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-3.5 py-1.5 border border-dashed border-outline-variant/80 text-on-surface-variant rounded-full text-label-sm font-semibold flex items-center gap-1.5 hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer whitespace-nowrap shadow-2xs ${
                  datePreset !== 'all'
                    ? 'border-primary text-primary font-bold bg-primary/5 border-solid'
                    : ''
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>{getDateFilterLabel()}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
              </button>

              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface rounded-2xl border border-outline-variant shadow-2xl p-5 z-50 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                    <span className="text-label-md font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">date_range</span>
                      Filter by Upload Date
                    </span>
                    {datePreset !== 'all' && (
                      <button
                        type="button"
                        onClick={() => { setDatePreset('all'); setCustomStartDate(''); setCustomEndDate(''); setCurrentPage(1); setShowDatePicker(false); }}
                        className="text-xs text-error hover:underline cursor-pointer font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Preset Options */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'all', label: 'All Dates' },
                      { id: 'today', label: 'Today' },
                      { id: '7days', label: 'Last 7 Days' },
                      { id: '30days', label: 'Last 30 Days' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDatePreset(opt.id);
                          setCurrentPage(1);
                          if (opt.id !== 'custom') setShowDatePicker(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                          datePreset === opt.id
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Range */}
                  <div className="pt-3 border-t border-outline-variant/40 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-on-surface-variant">Custom Range:</span>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-on-surface-variant/80 block mb-1">From</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => {
                            setCustomStartDate(e.target.value);
                            setDatePreset('custom');
                            setCurrentPage(1);
                          }}
                          className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-on-surface-variant/80 block mb-1">To</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => {
                            setCustomEndDate(e.target.value);
                            setDatePreset('custom');
                            setCurrentPage(1);
                          }}
                          className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:border-secondary"
                        />
                      </div>
                    </div>
                    {datePreset === 'custom' && (
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="w-full mt-1.5 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                      >
                        Apply Custom Range
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {versionError && (
        <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-error text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{versionError}</span>
        </div>
      )}

      {/* Data Table Container */}
      <div className="bg-surface-container rounded-2xl flex flex-col shadow-sm border border-outline-variant/30 overflow-hidden flex-1 min-w-0">
        <div className="overflow-auto flex-1 w-full hide-scrollbar min-h-[340px]">
          <table className="w-full text-left min-w-[1020px] border-collapse relative">
            <thead className="sticky top-0 z-10 bg-surface-container-high/90 backdrop-blur-md">
              <tr className="border-b border-outline-variant text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold w-[28%]">Document Name</th>
                <th className="px-5 py-4 font-semibold w-[10%]">Version</th>
                <th className="px-5 py-4 font-semibold w-[12%]">Status</th>
                <th className="px-5 py-4 font-semibold w-[14%]">Department</th>
                <th className="px-5 py-4 font-semibold w-[14%]">Uploaded On</th>
                <th className="px-5 py-4 font-semibold w-[14%]">Tags</th>
                <th className="px-6 py-4 font-semibold w-[8%] text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="text-body-sm font-body-sm text-on-surface divide-y divide-outline-variant/20">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-outline text-[44px]">folder_off</span>
                      <p className="font-semibold text-body-lg text-primary">No documents found</p>
                      <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
                        {datePreset !== 'all'
                          ? 'No documents matched the selected date filter. Try clearing or broadening the date filter.'
                          : 'Upload a PDF, Excel, or Word document to populate the knowledge hub.'}
                      </p>
                      {datePreset !== 'all' && (
                        <button
                          type="button"
                          onClick={() => { setDatePreset('all'); setCustomStartDate(''); setCustomEndDate(''); }}
                          className="mt-2 text-xs font-bold text-secondary hover:underline cursor-pointer px-3 py-1 bg-surface rounded-lg border border-outline-variant"
                        >
                          Clear Date Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc, idx) => {
                  const isOlderVersion = doc.docStatus === 'Older Version' || doc.docStatus === 'Superseded';
                  const isEditingThisVersion = editingVersionId === doc.id;
                  const { date, time } = formatDateTime(doc.uploadedAt);

                  return (
                    <tr
                      key={doc.id || idx}
                      className={`hover:bg-surface-container-highest/60 transition-all group ${
                        isOlderVersion ? 'bg-surface-container-low/40 opacity-75 hover:opacity-100 grayscale-[40%] hover:grayscale-0' : ''
                      }`}
                    >
                      {/* 1. Document Name */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center border border-outline-variant/40 shrink-0 shadow-2xs">
                            <span className={`material-symbols-outlined ${doc.icon?.color || 'text-error'} text-[22px]`}>
                              {doc.icon?.name || 'picture_as_pdf'}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-primary truncate max-w-[180px] sm:max-w-[240px] text-body-sm" title={doc.name}>
                              {doc.name}
                            </span>
                            {doc.size && <span className="text-[11px] text-on-surface-variant/80 mt-0.5">{doc.size}</span>}
                          </div>
                        </div>
                      </td>

                      {/* 2. Editable Version Column */}
                      <td className="px-5 py-4.5">
                        {isEditingThisVersion ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-surface border border-secondary rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-secondary/30 shadow-xs">
                              <span className="text-xs font-mono font-bold text-on-surface-variant select-none pr-0.5">v</span>
                              <input
                                type="text"
                                value={editingVersionValue}
                                onChange={(e) => setEditingVersionValue(e.target.value.replace(/^v/i, ''))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditVersion(doc.id);
                                  if (e.key === 'Escape') setEditingVersionId(null);
                                }}
                                autoFocus
                                className="w-10 text-xs font-mono font-bold bg-transparent text-primary focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => saveEditVersion(doc.id)}
                              className="p-1 rounded-lg text-secondary hover:bg-secondary/15 cursor-pointer flex items-center justify-center"
                              title="Save version"
                            >
                              <span className="material-symbols-outlined text-[15px] block font-bold">check</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditVersion(doc)}
                            title="Click to edit version"
                            className="group/ver inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/60 font-mono text-xs font-semibold text-primary hover:border-secondary hover:bg-secondary/5 transition-all cursor-pointer shadow-2xs"
                          >
                            <span>{doc.version || 'v1.0'}</span>
                            <span className="material-symbols-outlined text-[13px] opacity-0 group-hover/ver:opacity-100 text-secondary transition-opacity">
                              edit
                            </span>
                          </button>
                        )}
                      </td>

                      {/* 3. Status Column (Current vs Older Version) */}
                      <td className="px-5 py-4.5">
                        {isOlderVersion ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
                            <span className="material-symbols-outlined text-[14px] text-amber-600">history</span>
                            Older Version
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Current
                          </span>
                        )}
                      </td>

                      {/* 4. Department */}
                      <td className="px-5 py-4.5 text-on-surface-variant font-medium whitespace-nowrap text-body-sm">
                        {doc.department}
                      </td>

                      {/* 5. Date & Time Column */}
                      <td className="px-5 py-4.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium text-primary text-xs flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">event</span>
                            {date}
                          </span>
                          <span className="text-[11px] text-on-surface-variant/80 font-mono pl-5">
                            {time}
                          </span>
                        </div>
                      </td>

                      {/* 6. Tags (Interactive Inline Assignment & Display) */}
                      <td className="px-5 py-4.5">
                        <div className="relative" ref={activeTagPopoverDocId === doc.id ? tagPopoverRef : null}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {doc.tags && doc.tags.length > 0 ? (
                              doc.tags.map((t, tIdx) => {
                                const tagHex = t.hex || '#016879';
                                return (
                                  <span
                                    key={t.id || tIdx}
                                    className="px-2.5 py-0.5 border rounded-full text-xs whitespace-nowrap select-none font-semibold flex items-center gap-1.5 bg-surface-container text-on-surface shadow-2xs"
                                    style={{
                                      borderColor: tagHex,
                                    }}
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tagHex }}></span>
                                    <span className="text-on-surface">{t.label}</span>
                                  </span>
                                );
                              })
                            ) : null}

                            {/* Inline Add / Edit Tag Button */}
                            <button
                              type="button"
                              onClick={() => setActiveTagPopoverDocId(activeTagPopoverDocId === doc.id ? null : doc.id)}
                              title="Add or edit tags for this document"
                              className="group/tagbtn inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface border border-dashed border-outline-variant/80 text-on-surface-variant hover:border-secondary hover:text-secondary hover:bg-secondary/5 transition-all text-xs font-semibold cursor-pointer shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {activeTagPopoverDocId === doc.id ? 'close' : 'add'}
                              </span>
                              <span>{doc.tags && doc.tags.length > 0 ? 'Tag' : 'Tag'}</span>
                            </button>
                          </div>

                          {/* Inline Tag Popover Dropdown */}
                          {activeTagPopoverDocId === doc.id && (
                            <div className="absolute left-0 top-full mt-2 w-64 bg-surface rounded-2xl border border-outline-variant shadow-2xl p-3.5 z-40 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
                                <span className="text-label-sm font-bold text-primary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px]">label</span>
                                  Assign Tags
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveTagPopoverDocId(null)}
                                  className="text-on-surface-variant hover:text-on-surface p-0.5 rounded-md hover:bg-surface-container"
                                >
                                  <span className="material-symbols-outlined text-[16px] block">close</span>
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto py-1">
                                {tags.map((tag) => {
                                  const isAssigned = (doc.tags || []).some(t => t.id === tag.id);
                                  const tagHex = tag.hex || '#016879';
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => toggleDocTag(doc, tag)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none bg-surface-container ${
                                        isAssigned
                                          ? 'border-2 ring-1 ring-black/20 shadow-xs font-bold'
                                          : 'opacity-70 hover:opacity-100 hover:bg-surface-container-high'
                                      }`}
                                      style={{
                                        borderColor: tagHex,
                                        color: '#1e293b'
                                      }}
                                    >
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tagHex }}></span>
                                      <span>{tag.label}</span>
                                      {isAssigned && (
                                        <span className="material-symbols-outlined text-[12px] font-bold text-emerald-700">check</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="pt-2 border-t border-outline-variant/40 flex justify-between items-center text-xs">
                                <button
                                  type="button"
                                  onClick={() => { setActiveTagPopoverDocId(null); setShowTagModal(true); }}
                                  className="text-secondary hover:text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[13px]">tune</span>
                                  Manage System Tags
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions (Delete with Confirmation Modal & RAG Purge) */}
                      <td className="px-6 py-4.5 text-right">
                        <button
                          type="button"
                          title="Delete Document"
                          onClick={() => initiateDelete(doc)}
                          className="text-on-surface-variant/60 hover:text-error transition-colors p-2 rounded-xl hover:bg-error/10 cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-error/20"
                        >
                          <span className="material-symbols-outlined text-[20px] block">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination with comfortable padding */}
        <div className="bg-surface border-t border-outline-variant/40 px-6 py-4 md:px-7 md:py-4.5 flex items-center justify-between shrink-0">
          <div className="text-body-sm font-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-1">
            <span>
              Showing {filteredDocuments.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredDocuments.length)} of {filteredDocuments.length} records
            </span>
            <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-on-surface-variant">chevron_left</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-lg text-label-md font-label-md transition-colors cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-primary text-on-primary font-bold shadow-2xs'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg hover:bg-surface-container-high disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {showTagModal && (
        <TagModal onClose={() => setShowTagModal(false)} />
      )}

      {/* Delete Confirmation & RAG Purge Simulation Modal */}
      {deletingDoc && createPortal(
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => { if (!isPurging) setDeletingDoc(null); }}
        >
          <div
            className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-[480px] p-6 relative my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Warning Icon */}
            <div className="flex items-start gap-3.5 pb-3 border-b border-outline-variant/60">
              <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0 border border-error/20">
                <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-title-lg font-bold text-on-surface">Delete Document?</h3>
                <p className="text-body-sm text-on-surface-variant">
                  This will permanently remove the document and purge its vector embeddings from the local RAG store.
                </p>
              </div>
            </div>

            {/* Document Target Card */}
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-outline-variant/40 shadow-2xs">
                <span className={`material-symbols-outlined text-[22px] ${deletingDoc.icon?.color || 'text-error'}`}>
                  {deletingDoc.icon?.name || 'picture_as_pdf'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-body-sm font-semibold text-primary truncate" title={deletingDoc.name}>
                  {deletingDoc.name}
                </span>
                <span className="text-xs text-on-surface-variant font-mono">
                  {deletingDoc.version || 'v1.0'} • {deletingDoc.department} • {deletingDoc.size || 'Standard'}
                </span>
              </div>
            </div>

            {/* RAG Purge Progress State (~2 seconds) */}
            {isPurging ? (
              <div className="p-4 bg-error/5 border border-error/20 rounded-xl flex flex-col gap-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-error">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Purging Knowledge Base &amp; Embeddings...
                  </span>
                  <span className="font-mono text-[11px]">RAG Pipeline</span>
                </div>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-error/20">
                  <div className="bg-error h-2 rounded-full animate-pulse transition-all duration-700" style={{ width: '90%' }}></div>
                </div>
                <span className="text-[11px] text-on-surface-variant italic font-mono">{purgeStage}</span>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">warning</span>
                <span>
                  <strong>Knowledge Base Notice:</strong> SetuSearch queries will no longer retrieve chunks or answers from this document once deleted.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container font-semibold text-body-sm transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={handleConfirmPurgeDelete}
                className="px-5 py-2.5 rounded-xl bg-error hover:bg-error/90 disabled:opacity-60 text-white font-semibold text-body-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isPurging ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Purging from RAG...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Confirm &amp; Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
