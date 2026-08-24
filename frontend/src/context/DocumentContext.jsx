import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { documentService } from '../services/documentService';

const DocumentContext = createContext(null);

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Upload / Indexing state
  const [activeUpload, setActiveUpload] = useState(null);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedTagsFilter, setSelectedTagsFilter] = useState([]); // Multi-tag filter state

  // Modals state
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    async function initData() {
      setLoading(true);
      const [storedDocs, storedTags, storedDepts] = await Promise.all([
        documentService.getDocuments(),
        documentService.getTags(),
        documentService.getDepartments(),
      ]);

      // Ensure all stored docs have docStatus, version, and lineageId initialized
      // Group documents by existing lineageId or filename so revisions share the same lineage
      const nameToLineage = {};
      storedDocs.forEach(d => {
        const cleanName = (d.name || '').trim().toLowerCase();
        if (d.lineageId) {
          nameToLineage[cleanName] = d.lineageId;
        }
      });

      const normalizedDocs = storedDocs.map(d => {
        const cleanName = (d.name || '').trim().toLowerCase();
        const lineageId = d.lineageId || nameToLineage[cleanName] || d.id;
        nameToLineage[cleanName] = lineageId;
        return {
          ...d,
          lineageId,
          docStatus: (d.docStatus === 'Superseded' || d.docStatus === 'Older Version') ? 'Older Version' : 'Current',
          version: d.version || 'v1.0',
          uploadedAt: d.uploadedAt || new Date().toISOString(),
        };
      });

      setDocuments(normalizedDocs);
      setTags(storedTags);
      setDepartments(storedDepts || []);
      setLoading(false);
    }
    initData();
  }, []);

  // Determine file type helper
  const getFileTypeInfo = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return { type: 'pdf', icon: 'picture_as_pdf', color: 'text-error', defaultIndex: 'Indexed (OCR)' };
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return { type: 'excel', icon: 'table', color: 'text-[#107C41]', defaultIndex: 'Indexed (Tables)' };
    } else if (['docx', 'doc'].includes(ext)) {
      return { type: 'word', icon: 'description', color: 'text-[#2B579A]', defaultIndex: 'Indexed (Docs)' };
    }
    return { type: 'other', icon: 'draft', color: 'text-primary', defaultIndex: 'Indexed' };
  };

  // Check if ANY document with this exact filename already exists anywhere in the system
  const hasDuplicateFileName = useCallback((filename, excludeDocId = null) => {
    if (!filename) return false;
    const clean = filename.trim().toLowerCase();
    return documents.some(doc =>
      doc.id !== excludeDocId &&
      doc.name.trim().toLowerCase() === clean
    );
  }, [documents]);

  // Backward compatible aliases
  const hasActiveDuplicate = hasDuplicateFileName;
  const isDuplicateFileName = hasDuplicateFileName;

  // Check if a document with the same filename AND same version already exists
  const hasSameNameAndVersion = useCallback((filename, version, excludeDocId = null) => {
    if (!filename || !version) return false;
    const formattedVer = version.startsWith('v') ? version.toLowerCase() : `v${version.toLowerCase()}`;
    return documents.some(doc =>
      doc.id !== excludeDocId &&
      doc.name.trim().toLowerCase() === filename.trim().toLowerCase() &&
      (doc.version || 'v1.0').toLowerCase() === formattedVer
    );
  }, [documents]);

  // Toggle a tag in the multi-select filter
  const toggleTagFilter = (tagIdOrLabel) => {
    setSelectedTagsFilter(prev => {
      if (prev.includes(tagIdOrLabel)) {
        return prev.filter(t => t !== tagIdOrLabel);
      } else {
        return [...prev, tagIdOrLabel];
      }
    });
  };

  const clearTagFilters = () => {
    setSelectedTagsFilter([]);
  };

  // Start upload & indexing process
  const startDocumentUpload = useCallback((file, { department, selectedTags, version, lineageId, onComplete }) => {
    setIsUploadModalOpen(false);
    setPendingUploadFile(null);

    const fileInfo = getFileTypeInfo(file.name);
    const formattedSize = documentService.formatFileSize(file.size);

    const newDocId = 'doc_' + Date.now();
    const docVersion = version ? (version.startsWith('v') ? version : `v${version}`) : 'v1.0';
    const effectiveLineageId = lineageId || newDocId;

    // Set active upload state
    setActiveUpload({
      id: newDocId,
      name: file.name,
      size: formattedSize,
      progress: 5,
      stage: 'Extracting Layout & Entities...',
      fileInfo,
      department,
      selectedTags: selectedTags || [],
      version: docVersion,
      lineageId: effectiveLineageId,
    });

    // Simulate multi-stage RAG ingestion pipeline
    let currentProgress = 5;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 10;

      if (currentProgress < 40) {
        setActiveUpload(prev => prev ? { ...prev, progress: currentProgress, stage: 'Extracting Layout & Tables...' } : null);
      } else if (currentProgress < 75) {
        setActiveUpload(prev => prev ? { ...prev, progress: currentProgress, stage: 'Generating Chunks & OCR Embeddings...' } : null);
      } else if (currentProgress < 100) {
        setActiveUpload(prev => prev ? { ...prev, progress: currentProgress, stage: 'Syncing with Vector Store...' } : null);
      } else {
        clearInterval(interval);
        setActiveUpload(prev => prev ? { ...prev, progress: 100, stage: 'Indexing Complete!' } : null);

        const newDoc = {
          id: newDocId,
          lineageId: effectiveLineageId,
          name: file.name,
          department: department || 'General Engineering',
          tags: selectedTags && selectedTags.length > 0 ? selectedTags : [],
          docStatus: 'Current', // Default Current
          version: docVersion,
          status: {
            label: fileInfo.defaultIndex,
            type: 'secondary',
          },
          action: 'Re-index',
          actionColor: 'text-secondary hover:text-primary',
          icon: { name: fileInfo.icon, color: fileInfo.color },
          uploadedAt: new Date().toISOString(),
          size: formattedSize,
        };

        // Persist to document service
        documentService.saveDocument(newDoc).then((savedDoc) => {
          setDocuments(prev => [savedDoc, ...prev]);
          if (onComplete) onComplete(savedDoc);
          setTimeout(() => {
            setActiveUpload(null);
          }, 1200);
        });
      }
    }, 350);
  }, []);

  // Update document status handler ('Current' | 'Older Version')
  // Automatically ensures only ONE document in the same lineage is Current
  const handleUpdateDocumentStatus = async (id, newStatus) => {
    const updatedDocs = await documentService.updateDocumentStatus(id, newStatus);
    if (updatedDocs) {
      setDocuments(updatedDocs);
    } else {
      setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, docStatus: newStatus } : doc));
    }
  };

  // Update document version with duplicate version validation
  const handleUpdateDocumentVersion = async (id, newVersion) => {
    const formatted = newVersion ? (newVersion.startsWith('v') ? newVersion : `v${newVersion}`) : 'v1.0';
    const targetDoc = documents.find(d => d.id === id);
    if (targetDoc && hasSameNameAndVersion(targetDoc.name, formatted, id)) {
      return { success: false, error: `A document named "${targetDoc.name}" with version "${formatted}" already exists.` };
    }

    await documentService.updateDocument(id, { version: formatted });
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, version: formatted } : doc));
    return { success: true };
  };

  // Supersede an existing document and upload a replacement version
  // Propagates the same lineageId across revisions even if filenames differ
  const handleSupersedeWithNewVersion = async (oldDocId, newFile, { department, selectedTags, version }) => {
    const oldDoc = documents.find(d => d.id === oldDocId);
    const lineageId = oldDoc ? (oldDoc.lineageId || oldDoc.id) : oldDocId;

    // 1. Mark old doc and all documents in its lineage as Older Version
    const docs = await documentService.getDocuments();
    const updatedDocs = docs.map(d => {
      const isTarget = d.id === oldDocId;
      const isSameLineage = oldDoc && ((d.lineageId && d.lineageId === lineageId) || (d.name?.trim().toLowerCase() === oldDoc.name?.trim().toLowerCase()));
      if (isTarget || isSameLineage) {
        return { ...d, lineageId, docStatus: 'Older Version' };
      }
      return d;
    });

    localStorage.setItem('gyaansetu_documents_v1', JSON.stringify(updatedDocs));
    setDocuments(updatedDocs);

    // 2. Start upload of new replacement version with the SAME lineageId
    startDocumentUpload(newFile, {
      department,
      selectedTags,
      version,
      lineageId,
    });
  };

  // Create tag handler
  const handleCreateTag = async (tagData) => {
    const created = await documentService.createTag(tagData);
    setTags(prev => {
      if (prev.some(t => t.id === created.id)) return prev;
      return [...prev, created];
    });
    setIsTagModalOpen(false);
    return created;
  };

  // Delete tag handler
  const handleDeleteTag = async (tagId) => {
    await documentService.deleteTag(tagId);
    setTags(prev => prev.filter(t => t.id !== tagId));
    setDocuments(prev => prev.map(doc => {
      if (doc.tags && doc.tags.some(t => t.id === tagId)) {
        return {
          ...doc,
          tags: doc.tags.filter(t => t.id !== tagId)
        };
      }
      return doc;
    }));
    setSelectedTagsFilter(prev => prev.filter(t => t !== tagId));
  };

  // Update document tags handler
  const handleUpdateDocumentTags = async (docId, newTags) => {
    const success = await documentService.updateDocumentTags(docId, newTags);
    if (success) {
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, tags: newTags } : d));
      return { success: true };
    }
    return { success: false, error: 'Failed to update tags' };
  };

  // Update document department handler
  const handleUpdateDocumentDepartment = async (docId, newDepartment) => {
    const success = await documentService.updateDocumentDepartment(docId, newDepartment);
    if (success) {
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, department: newDepartment } : d));
      return { success: true };
    }
    return { success: false, error: 'Failed to update department' };
  };

  // Create department handler
  const handleCreateDepartment = async (newDeptName) => {
    const created = await documentService.createDepartment(newDeptName);
    if (created) {
      setDepartments(prev => {
        if (prev.some(d => d.toLowerCase() === created.toLowerCase())) return prev;
        return [...prev, created];
      });
      return created;
    }
    return null;
  };

  // Delete department handler (prevented if documents exist)
  const handleDeleteDepartment = async (deptName) => {
    const trimmed = (deptName || '').trim().toLowerCase();
    const count = documents.filter(d => (d.department || '').trim().toLowerCase() === trimmed).length;
    if (count > 0) {
      return {
        success: false,
        error: `Cannot delete "${deptName}": ${count} document(s) (including older revisions) are currently associated with it.`
      };
    }
    const result = await documentService.deleteDepartment(deptName);
    if (result.success) {
      setDepartments(prev => prev.filter(d => d.trim().toLowerCase() !== trimmed));
      if (selectedDepartment.trim().toLowerCase() === trimmed) {
        setSelectedDepartment('All');
      }
      return { success: true };
    }
    return result;
  };

  // Delete document handler
  const handleDeleteDocument = async (id) => {
    await documentService.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Reorder documents handler (for manual drag-and-drop lineage sorting)
  const handleReorderDocuments = async (reorderedDocs) => {
    setDocuments(reorderedDocs);
    localStorage.setItem('gyaansetu_documents_v1', JSON.stringify(reorderedDocs));
  };

  // Handle initiate file selection
  const handleSelectFile = (file) => {
    if (!file) return;
    setPendingUploadFile(file);
    setIsUploadModalOpen(true);
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        tags,
        departments,
        loading,
        activeUpload,
        searchQuery,
        setSearchQuery,
        selectedDepartment,
        setSelectedDepartment,
        selectedTagsFilter,
        setSelectedTagsFilter,
        toggleTagFilter,
        clearTagFilters,
        pendingUploadFile,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isTagModalOpen,
        setIsTagModalOpen,
        handleSelectFile,
        startDocumentUpload,
        handleUpdateDocumentStatus,
        handleUpdateDocumentVersion,
        handleUpdateDocumentTags,
        handleUpdateDocumentDepartment,
        handleCreateDepartment,
        handleDeleteDepartment,
        handleSupersedeWithNewVersion,
        handleCreateTag,
        handleDeleteTag,
        handleDeleteDocument,
        handleReorderDocuments,
        isDuplicateFileName,
        hasDuplicateFileName,
        hasActiveDuplicate,
        hasSameNameAndVersion,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}
