import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';
import SupersedeModal from '../components/SupersedeModal';
import DepartmentModal from '../components/DepartmentModal';

export default function DocumentVersionsPage() {
  const {
    documents,
    tags,
    departments,
    activeUpload,
    isAnyIngesting,
    ingestingDocs,
    handleUpdateDocumentStatus,
    handleReorderDocuments,
    handleCreateDepartment,
    handleDeleteDepartment,
  } = useDocuments();

  const [supersedingDoc, setSupersedingDoc] = useState(null);
  const [targetDocForRevision, setTargetDocForRevision] = useState(null);
  const [revisionInitialFile, setRevisionInitialFile] = useState(null);
  const fileInputRef = useRef(null);

  // Department toast error state for invalid deletions
  const [deptToastError, setDeptToastError] = useState('');
  const showDeptToast = (msg) => {
    setDeptToastError(msg);
    setTimeout(() => setDeptToastError(''), 4000);
  };

  // Add Department Modal States
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);

  const handleTriggerUploadRevision = (doc) => {
    setTargetDocForRevision(doc);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleRevisionFileSelected = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setRevisionInitialFile(file);
      setSupersedingDoc(targetDocForRevision);
    }
  };

  // Drag & Drop State for Replaced/Historical Versions
  const [draggedDocId, setDraggedDocId] = useState(null);
  const [dragOverDocId, setDragOverDocId] = useState(null);

  const handleDragStart = (e, doc) => {
    if (doc.docStatus === 'Current' || doc.docStatus === 'Active') {
      e.preventDefault();
      return;
    }
    setDraggedDocId(doc.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', doc.id);
  };

  const handleDragOver = (e, targetDoc) => {
    e.preventDefault();
    if (targetDoc.docStatus === 'Current' || targetDoc.docStatus === 'Active') return;
    if (dragOverDocId !== targetDoc.id) {
      setDragOverDocId(targetDoc.id);
    }
  };

  const handleDragLeave = () => {
    setDragOverDocId(null);
  };

  const handleDrop = (e, targetDoc, groupDocs) => {
    e.preventDefault();
    if (!draggedDocId || draggedDocId === targetDoc.id) {
      setDraggedDocId(null);
      setDragOverDocId(null);
      return;
    }
    if (targetDoc.docStatus === 'Current' || targetDoc.docStatus === 'Active') {
      setDraggedDocId(null);
      setDragOverDocId(null);
      return;
    }

    const replaced = groupDocs.filter(d => d.docStatus !== 'Current' && d.docStatus !== 'Active');
    const fromIndex = replaced.findIndex(d => d.id === draggedDocId);
    const toIndex = replaced.findIndex(d => d.id === targetDoc.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updatedReplaced = [...replaced];
      const [movedItem] = updatedReplaced.splice(fromIndex, 1);
      updatedReplaced.splice(toIndex, 0, movedItem);

      const active = groupDocs.find(d => d.docStatus === 'Current' || d.docStatus === 'Active');
      const targetGroupKey = targetDoc.lineageId || targetDoc.name.trim().toLowerCase();

      const otherDocs = documents.filter(d => {
        const dKey = d.lineageId || d.name.trim().toLowerCase();
        return dKey !== targetGroupKey;
      });

      const reorderedGroup = active ? [active, ...updatedReplaced] : updatedReplaced;
      const finalDocs = [...reorderedGroup, ...otherDocs];

      handleReorderDocuments(finalDocs);
    }

    setDraggedDocId(null);
    setDragOverDocId(null);
  };

  const handleDragEnd = () => {
    setDraggedDocId(null);
    setDragOverDocId(null);
  };

  // Search & Filter States (matching Doc Hub)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedTagsFilter, setSelectedTagsFilter] = useState([]);
  const [datePreset, setDatePreset] = useState('all');
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
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const CORE_DEPT_TABS = [
    'All',
    ...(departments || [])
  ];

  const toggleTagFilter = (tagId) => {
    setSelectedTagsFilter(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const clearTagFilters = () => {
    setSelectedTagsFilter([]);
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

  // 1. Group documents by lineageId or clean name
  const lineageGroups = {};
  documents.forEach((doc) => {
    const key = doc.lineageId || doc.name.trim().toLowerCase();
    if (!lineageGroups[key]) {
      lineageGroups[key] = [];
    }
    lineageGroups[key].push(doc);
  });

  // Sort documents inside each group: Current active first, then preserve relative user order for replaced docs
  Object.keys(lineageGroups).forEach((key) => {
    const group = lineageGroups[key];
    const active = group.filter(d => d.docStatus === 'Current' || d.docStatus === 'Active');
    const replaced = group.filter(d => d.docStatus !== 'Current' && d.docStatus !== 'Active');
    lineageGroups[key] = [...active, ...replaced];
  });

  // Count tab matches across groups
  const getTabCount = (tab) => {
    if (tab === 'All') return Object.keys(lineageGroups).length;
    return Object.keys(lineageGroups).filter(key => {
      const groupDocs = lineageGroups[key];
      return groupDocs.some(d => (d.department || '').toLowerCase().includes(tab.toLowerCase()));
    }).length;
  };

  // 2. Filter groups based on search & filters (Matching any document in the group returns the FULL group)
  const filteredGroupKeys = Object.keys(lineageGroups).filter((groupKey) => {
    const groupDocs = lineageGroups[groupKey];

    // Department Filter: group matches if ANY doc in group matches selectedDepartment
    if (selectedDepartment !== 'All') {
      const matchDept = groupDocs.some(doc =>
        (doc.department || '').toLowerCase().includes(selectedDepartment.toLowerCase())
      );
      if (!matchDept) return false;
    }

    // Multi-Tag Filter (AND logic): group must contain all selected tags across its documents
    if (selectedTagsFilter && selectedTagsFilter.length > 0) {
      const allGroupTags = groupDocs.flatMap(d => d.tags || []);
      const matchesAllSelectedTags = selectedTagsFilter.every(tagFilter =>
        allGroupTags.some(t => t.id === tagFilter || t.label === tagFilter || t.label?.toLowerCase() === tagFilter?.toLowerCase())
      );
      if (!matchesAllSelectedTags) return false;
    }

    // Search Query (Keyword token matching): check if tokens match across any document in group
    if (searchQuery.trim()) {
      const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const combinedGroupText = groupDocs.map(d => {
        const docName = (d.name || '').toLowerCase();
        const docDept = (d.department || '').toLowerCase();
        const docVersion = (d.version || '').toLowerCase();
        const docTags = (d.tags || []).map(t => (t.label || '').toLowerCase()).join(' ');
        return `${docName} ${docDept} ${docVersion} ${docTags}`;
      }).join(' ');

      const matchesAllTokens = tokens.every(token => combinedGroupText.includes(token));
      if (!matchesAllTokens) return false;
    }

    // Date Filter: group matches if ANY document in group falls within date range
    if (datePreset !== 'all') {
      const matchDate = groupDocs.some(doc => {
        const docDate = doc.uploadedAt ? new Date(doc.uploadedAt) : null;
        if (!docDate || isNaN(docDate.getTime())) return false;

        const now = new Date();
        if (datePreset === 'today') {
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return docDate >= todayStart;
        } else if (datePreset === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return docDate >= sevenDaysAgo;
        } else if (datePreset === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return docDate >= thirtyDaysAgo;
        } else if (datePreset === 'custom') {
          if (customStartDate && docDate < new Date(customStartDate)) return false;
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (docDate > end) return false;
          }
          return true;
        }
        return true;
      });
      if (!matchDate) return false;
    }

    return true;
  });

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

  const totalDocs = documents.length;
  const currentDocs = documents.filter((d) => d.docStatus === 'Current' || d.docStatus === 'Active').length;
  const olderDocs = documents.filter((d) => d.docStatus === 'Older Version' || d.docStatus === 'Superseded').length;

  return (
    <div className="flex flex-col w-full gap-6 md:gap-8 max-w-[1700px] mx-auto pb-16 md:pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-lg font-display-lg text-on-surface">Document Versions</h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Full version lineages and superseded amendment records grouped by document series.
          </p>
        </div>
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
                  Document Ingestion &amp; Version Indexing in Progress
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30 font-mono">
                  {ingestingDocs.length} {ingestingDocs.length === 1 ? 'file processing' : 'files processing'}
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
          <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Total Tracked Files</span>
          <div className="text-display-lg font-bold text-primary">{totalDocs}</div>
          <span className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">inventory_2</span>
            Across {Object.keys(lineageGroups).length} connected document groups
          </span>
        </div>

        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
          <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Current Active Releases</span>
          <div className="text-display-lg font-bold text-emerald-700">{currentDocs}</div>
          <span className="text-label-sm text-emerald-700 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Active in semantic RAG retrieval
          </span>
        </div>

        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex flex-col gap-1">
          <span className="text-label-sm font-semibold uppercase text-on-surface-variant tracking-wider">Archived / Replaced Revisions</span>
          <div className="text-display-lg font-bold text-[#B87D00]">{olderDocs}</div>
          <span className="text-label-sm text-[#B87D00] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">history</span>
            Preserved for compliance audit trail
          </span>
        </div>
      </div>

      {/* Filter Toolbar (Identical to Document Hub with generous padding) */}
      <div className="bg-surface-container rounded-2xl p-5 md:p-6 lg:p-7 flex flex-col gap-5 md:gap-6 shadow-sm border border-outline-variant/30 shrink-0">
        {/* Row 1: Search & Department Tabs */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 xl:gap-6">
          <div className="relative w-full xl:w-2/5 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[22px] z-10 pointer-events-none">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-surface border border-outline-variant rounded-xl text-body-md font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/60 cursor-text shadow-2xs"
              placeholder="Search by file name, keyword, or version across all groups..."
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
              {/* Add Department Button at the Start */}
              <button
                type="button"
                onClick={() => setShowAddDeptModal(true)}
                title="Create a new department category"
                className="px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary hover:bg-secondary/10 border border-secondary/30 hover:border-secondary rounded-lg flex items-center gap-1 transition-all cursor-pointer shrink-0 self-center shadow-2xs mr-1"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Dept</span>
              </button>

              {CORE_DEPT_TABS.map((tab) => {
                const count = getTabCount(tab);
                const isActive = selectedDepartment === tab;
                const isDeletable = tab !== 'All' && count === 0;

                return (
                  <div
                    key={tab}
                    className={`group/tab relative inline-flex items-center border-b-2 transition-all rounded-t-lg select-none ${
                      isActive
                        ? 'border-primary text-primary font-bold bg-primary/5'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDepartment(tab)}
                      className="pl-3.5 pr-2 py-2 text-label-md font-label-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{tab}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-primary/15 text-primary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {count}
                      </span>
                    </button>

                    {/* Delete button next to department tab in filter */}
                    {tab !== 'All' && (
                      isDeletable ? (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleDeleteDepartment(tab);
                          }}
                          title={`Delete empty department "${tab}"`}
                          className="mr-2 p-1 rounded-md text-on-surface-variant/40 hover:text-error hover:bg-error/15 opacity-0 group-hover/tab:opacity-100 transition-all cursor-pointer flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[15px] block">delete</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showDeptToast(`To delete the "${tab}" department, you'll have to delete all files from it first (including older versions).`);
                          }}
                          title={`To delete "${tab}", delete all ${count} associated file(s) first`}
                          className="mr-2 p-1 rounded-md text-on-surface-variant/30 hover:text-error/70 hover:bg-error/10 opacity-30 hover:opacity-100 transition-all cursor-pointer flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[15px] block">delete</span>
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Department Deletion Warning Banner */}
        {deptToastError && (
          <div className="mx-1 my-1 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 text-xs font-medium flex items-center justify-between animate-in fade-in duration-150 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
              <span>{deptToastError}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeptToastError('')}
              className="p-1 text-amber-800 hover:text-amber-950 rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] block">close</span>
            </button>
          </div>
        )}

        {/* Row 2: Tag Filter Bar & Date Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Left: Tags */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] hidden sm:block mr-1">
              local_offer
            </span>

            <button
              onClick={clearTagFilters}
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
                  onClick={() => toggleTagFilter(tag.id)}
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
                onClick={clearTagFilters}
                className="text-xs text-on-surface-variant hover:text-error underline cursor-pointer px-2 py-1"
              >
                Clear Tags ({selectedTagsFilter.length})
              </button>
            )}
          </div>

          {/* Right: Date Filter */}
          <div className="flex items-center gap-3 shrink-0 ml-auto" ref={datePickerRef}>
            <div className="relative">
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
                        onClick={() => { setDatePreset('all'); setCustomStartDate(''); setCustomEndDate(''); setShowDatePicker(false); }}
                        className="text-xs text-error hover:underline cursor-pointer font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>

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

      {/* Version Groups List */}
      <div className="flex flex-col gap-7">
        {filteredGroupKeys.length === 0 ? (
          <div className="bg-surface-container rounded-2xl p-16 text-center text-on-surface-variant border border-outline-variant/40">
            <span className="material-symbols-outlined text-[54px] text-outline">history_toggle_off</span>
            <h3 className="text-title-lg font-bold text-primary mt-3">No Matching Document Groups Found</h3>
            <p className="text-body-sm text-on-surface-variant max-w-md mx-auto mt-1">
              Try adjusting or clearing your search keywords, department tabs, tag filters, or date range.
            </p>
          </div>
        ) : (
          filteredGroupKeys.map((groupKey) => {
            const groupDocs = lineageGroups[groupKey];
            const activeDoc = groupDocs.find((d) => d.docStatus === 'Current' || d.docStatus === 'Active') || groupDocs[0];
            const groupTitle = (activeDoc.name || '').replace(/\.[^/.]+$/, '');

            return (
              <div
                key={groupKey}
                className="bg-surface-container rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md"
              >
                {/* 1. Header Box matching requested wireframe */}
                <div className="p-5 md:p-6 bg-surface-container-high/70 border-b border-outline-variant/60 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center border border-outline-variant/40 shrink-0 shadow-2xs">
                        <span className={`material-symbols-outlined text-[24px] ${activeDoc.icon?.color || 'text-primary'}`}>
                          {activeDoc.icon?.name || 'description'}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h2 className="text-title-md sm:text-title-lg font-bold text-primary truncate max-w-lg md:max-w-2xl" title={groupTitle}>
                          {groupTitle}
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTriggerUploadRevision(activeDoc)}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-transform hover:scale-[1.02] shrink-0"
                    >
                      <span className="material-symbols-outlined text-[17px]">upgrade</span>
                      Upload New Revision
                    </button>
                  </div>

                  {/* Subtitle meta details bar */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-label-md text-on-surface-variant pt-2 border-t border-outline-variant/30">
                    <span className="flex items-center gap-1.5">
                      <strong className="text-on-surface font-semibold">Department:</strong> {activeDoc.department}
                    </span>
                    <span className="hidden sm:inline-block text-outline-variant">•</span>
                    <span className="flex items-center gap-1.5">
                      <strong className="text-on-surface font-semibold">Total Revisions:</strong>
                      <span className="font-bold text-primary px-2 py-0.5 bg-surface rounded-md border border-outline-variant/50 text-xs">
                        {groupDocs.length} {groupDocs.length === 1 ? 'File' : 'Files'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2. Timeline Tree Body matching wireframe */}
                <div className="p-6 md:p-8 flex flex-col">
                  {/* Realtime Ingestion Progress Card when a new revision is being uploaded/processed for this group */}
                  {(() => {
                    const processingDocInGroup = groupDocs.find(d => d.status?.type === 'processing' || (d.status?.label || '').includes('...'));
                    const isGroupActiveUpload = activeUpload && (
                      (activeUpload.lineageId && activeUpload.lineageId === groupKey) ||
                      (activeDoc.lineageId && activeUpload.lineageId === activeDoc.lineageId) ||
                      (activeUpload.name && activeDoc.name && activeUpload.name.trim().toLowerCase() === activeDoc.name.trim().toLowerCase())
                    );

                    if (!isGroupActiveUpload && !processingDocInGroup) return null;

                    const displayDocName = isGroupActiveUpload ? activeUpload.name : processingDocInGroup.name;
                    const displayVersion = isGroupActiveUpload ? activeUpload.version : (processingDocInGroup.version || 'v1.1');
                    const displayProgress = isGroupActiveUpload ? activeUpload.progress : (processingDocInGroup.status?.percentage || 65);
                    const displayStage = isGroupActiveUpload ? (activeUpload.stage || 'Extracting Layout & Text Layers...') : (processingDocInGroup.status?.label || 'Creating Chunks & Generating Embeddings...');

                    return (
                      <div className="flex flex-col mb-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 sm:gap-5">
                          <div className="flex flex-col items-center shrink-0 pt-0.5">
                            <div className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-full bg-secondary/15 border-2 border-secondary text-secondary flex items-center justify-center shadow-xs shrink-0">
                              <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                            </div>
                          </div>
                          <div className="flex-1 p-4 sm:p-5 rounded-2xl border border-secondary/40 bg-secondary/5 shadow-sm">
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary text-on-secondary animate-pulse flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                    Ingesting New Revision
                                  </span>
                                  <span className="font-bold text-primary text-body-md truncate">{displayDocName}</span>
                                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface border border-outline-variant/60 font-bold text-primary">
                                    {displayVersion}
                                  </span>
                                </div>
                                <span className="font-mono text-xs font-bold text-secondary">{displayProgress}%</span>
                              </div>
                              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden border border-outline-variant/30">
                                <div
                                  className="bg-secondary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${displayProgress}%` }}
                                ></div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px] text-secondary animate-spin">sync</span>
                                  {displayStage}
                                </span>
                                <span className="italic">Embedding into vector store...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Upward connector line */}
                        <div className="flex items-center gap-4 sm:gap-5 my-1">
                          <div className="w-7 flex flex-col items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-secondary -mb-1 font-bold animate-bounce">
                              arrow_upward
                            </span>
                            <div className="w-0.5 h-6 bg-secondary/60"></div>
                          </div>
                          <div className="text-[11px] text-secondary font-mono font-medium pl-1">
                            Superseding previous version below
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {groupDocs.map((doc, idx) => {
                    const isCurrent = doc.docStatus === 'Current' || doc.docStatus === 'Active';
                    const isProcessing = doc.status?.type === 'processing' || (doc.status?.label || '').includes('...');
                    const { date, time } = formatDateTime(doc.uploadedAt);
                    const isLastItem = idx === groupDocs.length - 1;
                    const isDragging = draggedDocId === doc.id;
                    const isDragOver = dragOverDocId === doc.id && !isCurrent;

                    return (
                      <div
                        key={doc.id || idx}
                        className={`flex flex-col transition-all duration-150 ${
                          isDragging ? 'opacity-40 scale-[0.98]' : ''
                        }`}
                        draggable={!isCurrent && !isProcessing}
                        onDragStart={(e) => handleDragStart(e, doc)}
                        onDragOver={(e) => handleDragOver(e, doc)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, doc, groupDocs)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* Node Row */}
                        <div className="flex items-start gap-4 sm:gap-5">
                          {/* Left Status Icon Node */}
                          <div className="flex flex-col items-center shrink-0 pt-0.5">
                            {isProcessing ? (
                              <div className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-full bg-secondary/15 border-2 border-secondary text-secondary flex items-center justify-center shadow-xs shrink-0">
                                <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                              </div>
                            ) : isCurrent ? (
                              <div className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-full bg-emerald-500/15 border-2 border-emerald-600 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
                                <span className="w-2.5 h-2.5 min-w-[10px] min-h-[10px] aspect-square rounded-full bg-emerald-600 shrink-0"></span>
                              </div>
                            ) : (
                              <div className="w-7 h-7 min-w-[28px] min-h-[28px] aspect-square rounded-full bg-surface border-2 border-outline-variant/80 text-on-surface-variant flex items-center justify-center shadow-2xs shrink-0">
                                <span className="w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-on-surface-variant/60 shrink-0"></span>
                              </div>
                            )}
                          </div>

                          {/* File Content Card */}
                          <div className={`flex-1 p-4 sm:p-5 rounded-2xl border transition-all ${
                            isProcessing
                              ? 'bg-surface border-secondary/50 shadow-sm ring-1 ring-secondary/20'
                              : isCurrent
                              ? 'bg-surface border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                              : isDragOver
                              ? 'bg-secondary/10 border-2 border-secondary ring-2 ring-secondary/20 shadow-md'
                              : 'bg-surface-container-low/40 border-dashed border-outline-variant/60 opacity-80 hover:opacity-100 grayscale-[40%] hover:grayscale-0 hover:bg-surface'
                          }`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-col min-w-0">
                                {/* Title Line with Version badge */}
                                <div className="flex flex-wrap items-center gap-2.5">
                                  {/* Drag Handle Indicator (Only for draggable replaced revisions) */}
                                  {!isCurrent && !isProcessing && (
                                    <div
                                      className="cursor-grab active:cursor-grabbing text-on-surface-variant/50 hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors flex items-center shrink-0"
                                      title="Drag to reorder precedence of this historical version"
                                    >
                                      <span className="material-symbols-outlined text-[18px] block">drag_indicator</span>
                                    </div>
                                  )}

                                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5 ${
                                    isProcessing
                                      ? 'bg-secondary/10 text-secondary border border-secondary/30 animate-pulse'
                                      : isCurrent
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}>
                                    {isProcessing ? (
                                      <>
                                        <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                                        <span>{doc.status?.label || 'Indexing...'}</span>
                                      </>
                                    ) : isCurrent ? (
                                      <>
                                        <span className="w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-emerald-600 shrink-0"></span>
                                        <span>Current Active</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-amber-500 shrink-0"></span>
                                        <span>Replaced</span>
                                      </>
                                    )}
                                  </span>

                                  <h3 className="text-body-md font-bold text-primary truncate max-w-md sm:max-w-xl" title={doc.name}>
                                    {doc.name}
                                  </h3>
                                </div>

                                {/* Meta details: Version, Date, Size */}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-on-surface-variant mt-2">
                                  <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-surface border border-outline-variant/60 text-xs">
                                    {doc.version || 'v1.0'}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-medium">
                                    <span className="material-symbols-outlined text-[15px] text-on-surface-variant">event</span>
                                    {date} at {time}
                                  </span>
                                  <span>•</span>
                                  <span>{doc.size || 'Standard'}</span>
                                </div>

                                {/* Specific document's own tags with circular color dots */}
                                {doc.tags && doc.tags.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                    {doc.tags.map((t, tIdx) => {
                                      const tagHex = t.hex || '#016879';
                                      return (
                                        <span
                                          key={t.id || tIdx}
                                          className="px-2.5 py-0.5 rounded-full text-xs whitespace-nowrap select-none font-semibold flex items-center gap-1.5 bg-surface-container text-on-surface shadow-2xs"
                                          style={{
                                            borderColor: tagHex,
                                            borderWidth: '1.5px',
                                            borderStyle: 'solid',
                                          }}
                                        >
                                          <span className="w-2 h-2 min-w-[8px] min-h-[8px] rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: tagHex }}></span>
                                          <span className="text-on-surface">{t.label}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              {!isCurrent && (
                                <button
                                  type="button"
                                  title="Promote this older version back to the Current Active release"
                                  onClick={() => handleUpdateDocumentStatus(doc.id, 'Current')}
                                  className="px-3.5 py-1.5 rounded-lg bg-surface border border-outline-variant hover:border-emerald-600/50 hover:bg-emerald-600/10 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap self-center sm:self-auto"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                  Set as Current
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Upward Connector Line & Arrow */}
                        {!isLastItem && (
                          <div className="flex items-center gap-4 sm:gap-5 my-1">
                            <div className="w-7 flex flex-col items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[14px] text-outline-variant -mb-1 font-bold">
                                arrow_upward
                              </span>
                              <div className="w-0.5 h-6 bg-outline-variant/80"></div>
                            </div>
                            <div className="text-[11px] text-on-surface-variant/70 italic font-mono pl-1">
                              Replaced by revision
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Hidden file input to immediately trigger native OS file explorer */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRevisionFileSelected}
        accept=".pdf,.xlsx,.xls,.docx,.doc"
        className="hidden"
      />

      {supersedingDoc && (
        <SupersedeModal
          doc={supersedingDoc}
          initialFile={revisionInitialFile}
          onClose={() => {
            setSupersedingDoc(null);
            setRevisionInitialFile(null);
            setTargetDocForRevision(null);
          }}
        />
      )}

      {/* Manage / Add Department Modal */}
      {showAddDeptModal && (
        <DepartmentModal
          onClose={() => setShowAddDeptModal(false)}
          onCreated={(created) => setSelectedDepartment(created)}
        />
      )}
    </div>
  );
}
