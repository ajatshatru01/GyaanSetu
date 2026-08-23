import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';

export default function DepartmentModal({ onClose, onCreated }) {
  const { documents, departments, handleCreateDepartment, handleDeleteDepartment } = useDocuments();
  const [deptName, setDeptName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) {
      setError('Please enter a department name');
      return;
    }

    const created = await handleCreateDepartment(deptName.trim());
    if (created) {
      setDeptName('');
      setError('');
      setSuccessMsg(`Department "${created}" added successfully`);
      setTimeout(() => setSuccessMsg(''), 2500);
      if (onCreated) {
        onCreated(created);
      }
    }
  };

  const handleDelete = async (dept) => {
    setError('');
    const count = documents.filter(
      d => (d.department || '').trim().toLowerCase() === dept.trim().toLowerCase()
    ).length;

    if (count > 0) {
      setError(`To delete the "${dept}" department, you'll have to delete all files from it first (including older versions).`);
      return;
    }

    const result = await handleDeleteDepartment(dept);
    if (!result.success) {
      setError(result.error);
    } else {
      setSuccessMsg(`Department "${dept}" deleted`);
      setTimeout(() => setSuccessMsg(''), 2500);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-outline-variant shadow-2xl w-full max-w-[500px] p-6 relative my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-5"
        style={{ minWidth: '320px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">domain</span>
            <h3 className="text-title-lg font-bold text-on-surface">Manage Departments</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] block">close</span>
          </button>
        </div>

        {/* Success / Error Messages */}
        {error && (
          <div className="p-3 bg-error-container/40 border border-error/30 rounded-xl text-error text-xs flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Existing Departments Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
              Departments ({departments.length})
            </label>
            <span className="text-[11px] text-on-surface-variant/70 italic">
              Non-empty departments cannot be deleted
            </span>
          </div>

          <div className="flex flex-col gap-1.5 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 max-h-52 overflow-y-auto">
            {departments.length === 0 ? (
              <span className="text-body-sm text-on-surface-variant/60 italic py-1">No departments available.</span>
            ) : (
              departments.map((dept) => {
                const count = documents.filter(
                  d => (d.department || '').trim().toLowerCase() === dept.trim().toLowerCase()
                ).length;
                const hasDocs = count > 0;

                return (
                  <div
                    key={dept}
                    className="px-3 py-2 rounded-xl text-body-sm font-medium flex items-center justify-between border bg-surface border-outline-variant/40 shadow-2xs hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">apartment</span>
                      <span className="font-semibold text-on-surface truncate">{dept}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant/60">
                        {count} file{count !== 1 ? 's' : ''}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(dept)}
                        title={hasDocs ? `To delete "${dept}", delete all ${count} associated file(s) first` : `Delete empty department "${dept}"`}
                        className={`w-7 h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                          hasDocs
                            ? 'text-on-surface-variant/30 hover:text-error/70 hover:bg-error/10'
                            : 'hover:bg-error/15 text-error'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] block">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add New Department Form */}
        <form onSubmit={handleAddDept} className="flex flex-col gap-3 pt-3 border-t border-outline-variant/60">
          <div>
            <label className="block text-label-md font-semibold text-on-surface mb-1.5">
              Add New Department
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={deptName}
                onChange={(e) => { setDeptName(e.target.value); setError(''); }}
                placeholder="e.g. Telecom & SCADA, Track Systems..."
                className="flex-1 px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-sm font-medium text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 shadow-2xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-outline-variant/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-body-sm font-semibold text-on-surface transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

