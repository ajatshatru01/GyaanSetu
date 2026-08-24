/**
 * Document Service Layer
 *
 * Centralized service managing Document Hub data.
 * Now connected to the FastAPI backend!
 */

const API_BASE = '/api';

export const documentService = {
  // Fetch all documents
  async getDocuments() {
    try {
      const res = await fetch(`${API_BASE}/documents/`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      return await res.json();
    } catch (err) {
      console.error('Error loading documents:', err);
      return [];
    }
  },

  // Upload a new document (used by startDocumentUpload in context)
  async uploadDocument(file, formDataObj) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      for (const [key, value] of Object.entries(formDataObj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        }
      }

      const res = await fetch(`${API_BASE}/documents/`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to upload document: ${errorText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Error uploading document:', err);
      throw err;
    }
  },

  // (Deprecated for direct use: now using uploadDocument for real API)
  async saveDocument(doc) {
    // Left for fallback if needed, but Context will be updated to use uploadDocument
    return doc;
  },

  // Delete a document by ID
  async deleteDocument(id) {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}?force=true`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error('Error deleting document:', err);
      return false;
    }
  },

  // Update a document by ID
  async updateDocument(id, updates) {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update document');
      return await res.json();
    } catch (err) {
      console.error('Error updating document:', err);
      return null;
    }
  },

  // Update status of document ('Current' | 'Older Version')
  async updateDocumentStatus(id, status) {
    try {
      const targetStatus = (status === 'Active' || status === 'Current') ? 'Current' : 'Older Version';
      const res = await fetch(`${API_BASE}/documents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return await res.json(); // Backend returns the full list of updated docs
    } catch (err) {
      console.error('Error updating document status:', err);
      return null;
    }
  },

  // Reorder multiple documents
  async reorderDocuments(documents) {
    try {
      const res = await fetch(`${API_BASE}/documents/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: documents.map((d, index) => ({
            id: d.id,
            order_index: index,
          }))
        }),
      });
      if (!res.ok) throw new Error('Failed to reorder documents');
      return await res.json();
    } catch (err) {
      console.error('Error reordering documents:', err);
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

  // Fetch all tags
  async getTags() {
    try {
      const res = await fetch(`${API_BASE}/tags/`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      return await res.json();
    } catch (err) {
      console.error('Error loading tags:', err);
      return [];
    }
  },

  // Create a new custom tag
  async createTag(newTag) {
    try {
      const res = await fetch(`${API_BASE}/tags/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      });
      if (!res.ok) throw new Error('Failed to create tag');
      return await res.json();
    } catch (err) {
      console.error('Error creating tag:', err);
      return newTag;
    }
  },

  // Delete a tag by ID
  async deleteTag(tagId) {
    try {
      const res = await fetch(`${API_BASE}/tags/${tagId}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.error('Error deleting tag:', err);
      return false;
    }
  },

  // Update document tags
  async updateDocumentTags(docId, newTags) {
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating document tags:', err);
      return false;
    }
  },

  // Update document department
  async updateDocumentDepartment(docId, newDepartment) {
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: newDepartment }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating document department:', err);
      return false;
    }
  },

  // Get list of departments (mapping objects to string names for backward compatibility)
  async getDepartments() {
    try {
      const res = await fetch(`${API_BASE}/departments/`);
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      // Keep a hidden map to translate names to IDs for deletion
      this._departmentsCache = data;
      return data.map(d => d.name);
    } catch (err) {
      console.error('Error loading departments:', err);
      return [];
    }
  },

  // Create a new department
  async createDepartment(newDeptName) {
    try {
      const res = await fetch(`${API_BASE}/departments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName, description: '' }),
      });
      if (!res.ok) throw new Error('Failed to create department');
      const data = await res.json();
      return data.name;
    } catch (err) {
      console.error('Error creating department:', err);
      return newDeptName;
    }
  },

  // Delete department if no files belong to it
  async deleteDepartment(deptName) {
    try {
      // Find the ID of the department
      const cache = this._departmentsCache || [];
      const deptObj = cache.find(d => d.name.trim().toLowerCase() === deptName.trim().toLowerCase());

      if (!deptObj) {
        return { success: false, error: 'Department not found in cache' };
      }

      const res = await fetch(`${API_BASE}/departments/${deptObj.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, error: errorData.detail || 'Failed to delete department (might be in use)' };
      }
      return { success: true };
    } catch (err) {
      console.error('Error deleting department:', err);
      return { success: false, error: 'Failed to delete department' };
    }
  },

  // Format file sizes helper
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  async queryKnowledgeBase(query, includeOlderVersions = false, department = null) {
    try {
      const payload = {
        query,
        include_older_versions: includeOlderVersions,
      };
      if (department && department !== 'All') {
        payload.department = department;
      }

      const res = await fetch(`${API_BASE}/query/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Failed to fetch query response');
      }
      return await res.json();
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      throw error;
    }
  },

  // Fetch live system diagnostics telemetry
  async getDiagnostics() {
    try {
      const res = await fetch(`${API_BASE}/diagnostics/`);
      if (!res.ok) throw new Error('Failed to fetch system diagnostics');
      return await res.json();
    } catch (err) {
      console.error('Error loading diagnostics:', err);
      return null;
    }
  }
};

export default documentService;
