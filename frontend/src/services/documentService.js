/**
 * Document Service Layer
 *
 * Centralized service managing Document Hub data.
 * Currently uses localStorage for local persistence.
 *
 * SCALABILITY NOTE:
 * When connecting to your FastAPI / Node / Django / VectorDB backend:
 * simply replace the localStorage logic inside these functions with
 * fetch('/api/documents') or axios calls. The React UI components will remain unchanged.
 */

const STORAGE_KEYS = {
  DOCUMENTS: 'gyansetu_documents_v1',
  TAGS: 'gyansetu_tags_v1',
};

const DEFAULT_TAGS = [
  { id: 'tender_gcc', label: 'Tender / GCC', bgClass: 'bg-transparent', borderClass: 'border-[#00629e]', textClass: 'text-[#00629e]', hex: '#00629e' },
  { id: 'cmrs_safety', label: 'CMRS Safety', bgClass: 'bg-transparent', borderClass: 'border-[#016879]', textClass: 'text-[#016879]', hex: '#016879' },
  { id: 'high_priority', label: 'High Priority', bgClass: 'bg-transparent', borderClass: 'border-[#ba1a1a]', textClass: 'text-[#ba1a1a]', hex: '#ba1a1a' },
  { id: 'monsoon_sop', label: 'Monsoon SOP', bgClass: 'bg-transparent', borderClass: 'border-[#b87d00]', textClass: 'text-[#b87d00]', hex: '#b87d00' },
  { id: 'vendor_sla', label: 'Vendor SLA', bgClass: 'bg-transparent', borderClass: 'border-[#8a5100]', textClass: 'text-[#8a5100]', hex: '#8a5100' },
];

const DEPARTMENTS = [
  'Rolling Stock',
  'Signaling',
  'Civil',
  'Procurement',
  'Safety & Compliance',
  'Power & Traction',
];

const DEFAULT_DOCUMENTS = [
  {
    id: 'doc_pantograph_v3',
    lineageId: 'lineage_pantograph',
    name: 'Pantograph_Inspection_2026_Rev3.pdf',
    department: 'Rolling Stock',
    version: 'v3.0',
    docStatus: 'Current',
    tags: [
      { id: 'cmrs_safety', label: 'CMRS Safety', bgClass: 'bg-transparent', borderClass: 'border-[#016879]', textClass: 'text-[#016879]', hex: '#016879' },
      { id: 'high_priority', label: 'High Priority', bgClass: 'bg-transparent', borderClass: 'border-[#ba1a1a]', textClass: 'text-[#ba1a1a]', hex: '#ba1a1a' }
    ],
    status: { label: 'Indexed (OCR)', type: 'secondary' },
    icon: { name: 'picture_as_pdf', color: 'text-error' },
    uploadedAt: '2026-01-10T10:30:00.000Z',
    size: '4.2 MB',
    supersedes: 'doc_pantograph_v2'
  },
  {
    id: 'doc_pantograph_v2',
    lineageId: 'lineage_pantograph',
    name: 'Pantograph_Inspection_2024_Rev2.pdf',
    department: 'Rolling Stock',
    version: 'v2.0',
    docStatus: 'Older Version',
    tags: [
      { id: 'cmrs_safety', label: 'CMRS Safety', bgClass: 'bg-transparent', borderClass: 'border-[#016879]', textClass: 'text-[#016879]', hex: '#016879' }
    ],
    status: { label: 'Indexed (OCR)', type: 'secondary' },
    icon: { name: 'picture_as_pdf', color: 'text-error' },
    uploadedAt: '2024-03-14T14:15:00.000Z',
    size: '3.8 MB',
    supersedes: 'doc_pantograph_v1'
  },
  {
    id: 'doc_pantograph_v1',
    lineageId: 'lineage_pantograph',
    name: 'SOP_Rolling_Stock_Pantograph_2022.pdf',
    department: 'Rolling Stock',
    version: 'v1.0',
    docStatus: 'Older Version',
    tags: [
      { id: 'cmrs_safety', label: 'CMRS Safety', bgClass: 'bg-transparent', borderClass: 'border-[#016879]', textClass: 'text-[#016879]', hex: '#016879' }
    ],
    status: { label: 'Indexed (OCR)', type: 'secondary' },
    icon: { name: 'picture_as_pdf', color: 'text-error' },
    uploadedAt: '2022-08-05T09:00:00.000Z',
    size: '3.1 MB'
  },
  {
    id: 'doc_cbtc_sig_v2',
    lineageId: 'lineage_cbtc_sig',
    name: 'CBTC_Signaling_Interlocking_Spec_2026.docx',
    department: 'Signaling',
    version: 'v2.1',
    docStatus: 'Current',
    tags: [
      { id: 'tender_gcc', label: 'Tender / GCC', bgClass: 'bg-transparent', borderClass: 'border-[#00629e]', textClass: 'text-[#00629e]', hex: '#00629e' }
    ],
    status: { label: 'Indexed (Docs)', type: 'secondary' },
    icon: { name: 'description', color: 'text-[#2B579A]' },
    uploadedAt: '2026-02-01T11:45:00.000Z',
    size: '2.4 MB'
  },
  {
    id: 'doc_cbtc_sig_v1',
    lineageId: 'lineage_cbtc_sig',
    name: 'Signaling_Interlocking_Baseline_2023.docx',
    department: 'Signaling',
    version: 'v1.0',
    docStatus: 'Older Version',
    tags: [
      { id: 'tender_gcc', label: 'Tender / GCC', bgClass: 'bg-transparent', borderClass: 'border-[#00629e]', textClass: 'text-[#00629e]', hex: '#00629e' }
    ],
    status: { label: 'Indexed (Docs)', type: 'secondary' },
    icon: { name: 'description', color: 'text-[#2B579A]' },
    uploadedAt: '2023-11-20T16:20:00.000Z',
    size: '1.9 MB'
  }
];

export const documentService = {
  // Fetch all documents
  async getDocuments() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(DEFAULT_DOCUMENTS));
        return DEFAULT_DOCUMENTS;
      }
      return JSON.parse(data);
    } catch (err) {
      console.error('Error loading documents from storage:', err);
      return DEFAULT_DOCUMENTS;
    }
  },

  // Save or add a new document
  async saveDocument(doc) {
    try {
      const docs = await this.getDocuments();
      const updated = [doc, ...docs];
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      return doc;
    } catch (err) {
      console.error('Error saving document to storage:', err);
      return doc;
    }
  },

  // Delete a document by ID
  async deleteDocument(id) {
    try {
      const docs = await this.getDocuments();
      const updated = docs.filter(d => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      return false;
    }
  },

  // Update a document by ID
  async updateDocument(id, updates) {
    try {
      const docs = await this.getDocuments();
      const updated = docs.map(d => d.id === id ? { ...d, ...updates } : d);
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
      return updated.find(d => d.id === id);
    } catch (err) {
      console.error('Error updating document:', err);
      return null;
    }
  },

  // Update status of document ('Current' | 'Older Version')
  // Enforces that only ONE document in the same lineage (by lineageId OR by filename) can be Current at a time.
  async updateDocumentStatus(id, status) {
    try {
      const targetStatus = (status === 'Active' || status === 'Current') ? 'Current' : 'Older Version';
      const docs = await this.getDocuments();
      const targetDoc = docs.find(d => d.id === id);
      if (!targetDoc) return null;

      const targetLineageId = targetDoc.lineageId || targetDoc.id;
      const targetName = (targetDoc.name || '').trim().toLowerCase();

      const updatedDocs = docs.map(d => {
        if (d.id === id) {
          return { ...d, docStatus: targetStatus, lineageId: targetLineageId };
        }
        // If making targetDoc Current, any other document in the SAME lineage (same lineageId OR same filename) that is Current becomes Older Version
        if (targetStatus === 'Current') {
          const docLineageId = d.lineageId || d.id;
          const docName = (d.name || '').trim().toLowerCase();
          const isSameLineage = (targetLineageId && docLineageId === targetLineageId) || (targetName && docName === targetName);

          if (isSameLineage) {
            const isDocCurrent = d.docStatus === 'Current' || d.docStatus === 'Active';
            if (isDocCurrent) {
              return { ...d, docStatus: 'Older Version', lineageId: targetLineageId };
            }
          }
        }
        return d;
      });

      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updatedDocs));
      return updatedDocs;
    } catch (err) {
      console.error('Error updating document status:', err);
      return null;
    }
  },

  // Calculate next sequential version (1.0 -> 1.1 -> ... 1.9 -> 2.0)
  getNextVersion(currentVersion) {
    if (!currentVersion) return 'v1.1';
    const clean = currentVersion.replace(/^v/i, '').trim();
    const parts = clean.split('.');
    if (parts.length === 2) {
      let major = parseInt(parts[0], 10);
      let minor = parseInt(parts[1], 10);
      if (isNaN(major)) major = 1;
      if (isNaN(minor)) minor = 0;

      if (minor >= 9) {
        return `v${major + 1}.0`;
      } else {
        return `v${major}.${minor + 1}`;
      }
    }
    return 'v1.1';
  },

  // Check if a document with the same name AND same version exists
  hasDuplicateVersion(docs, filename, version, excludeId = null) {
    if (!filename || !version) return false;
    const formattedVer = version.startsWith('v') ? version.toLowerCase() : `v${version.toLowerCase()}`;
    return docs.some(d =>
      d.id !== excludeId &&
      d.name.trim().toLowerCase() === filename.trim().toLowerCase() &&
      (d.version || 'v1.0').toLowerCase() === formattedVer
    );
  },

  // Fetch all tags (predefined + user created)
  async getTags() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TAGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(DEFAULT_TAGS));
        return DEFAULT_TAGS;
      }
      return JSON.parse(data);
    } catch (err) {
      console.error('Error loading tags:', err);
      return DEFAULT_TAGS;
    }
  },

  // Create and persist a new custom tag
  async createTag(newTag) {
    try {
      const tags = await this.getTags();
      const tagExists = tags.some(t => t.label.toLowerCase() === newTag.label.toLowerCase());
      if (tagExists) return tags.find(t => t.label.toLowerCase() === newTag.label.toLowerCase());

      const updated = [...tags, newTag];
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updated));
      return newTag;
    } catch (err) {
      console.error('Error creating tag:', err);
      return newTag;
    }
  },

  // Delete a tag by ID and clean it up from storage and documents
  async deleteTag(tagId) {
    try {
      const tags = await this.getTags();
      const updatedTags = tags.filter(t => t.id !== tagId);
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(updatedTags));

      // Also clean up this tag from any existing documents
      const docs = await this.getDocuments();
      let changed = false;
      const updatedDocs = docs.map(doc => {
        if (doc.tags && doc.tags.some(t => t.id === tagId)) {
          changed = true;
          return {
            ...doc,
            tags: doc.tags.filter(t => t.id !== tagId)
          };
        }
        return doc;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updatedDocs));
      }

      return true;
    } catch (err) {
      console.error('Error deleting tag:', err);
      return false;
    }
  },

  // Get list of standard departments
  getDepartments() {
    return DEPARTMENTS;
  },

  // Format file sizes helper
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};
