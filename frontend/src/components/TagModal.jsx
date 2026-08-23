import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDocuments } from '../context/DocumentContext';

const PRESET_COLORS = [
  { name: 'Sky Cyan', bgClass: 'bg-transparent', borderClass: 'border-[#016879]', textClass: 'text-[#016879]', hex: '#016879' },
  { name: 'Soft Blue', bgClass: 'bg-transparent', borderClass: 'border-[#00629e]', textClass: 'text-[#00629e]', hex: '#00629e' },
  { name: 'Amber Gold', bgClass: 'bg-transparent', borderClass: 'border-[#b87d00]', textClass: 'text-[#b87d00]', hex: '#b87d00' },
  { name: 'Peach Orange', bgClass: 'bg-transparent', borderClass: 'border-[#8a5100]', textClass: 'text-[#8a5100]', hex: '#8a5100' },
  { name: 'Ruby Crimson', bgClass: 'bg-transparent', borderClass: 'border-[#ba1a1a]', textClass: 'text-[#ba1a1a]', hex: '#ba1a1a' },
  { name: 'Emerald Green', bgClass: 'bg-transparent', borderClass: 'border-[#107C41]', textClass: 'text-[#107C41]', hex: '#107C41' },
  { name: 'Royal Purple', bgClass: 'bg-transparent', borderClass: 'border-[#7c3aed]', textClass: 'text-[#7c3aed]', hex: '#7c3aed' },
  { name: 'Deep Indigo', bgClass: 'bg-transparent', borderClass: 'border-[#4338ca]', textClass: 'text-[#4338ca]', hex: '#4338ca' },
  { name: 'Rose Pink', bgClass: 'bg-transparent', borderClass: 'border-[#e11d48]', textClass: 'text-[#e11d48]', hex: '#e11d48' },
];

export default function TagModal({ onClose, onCreated }) {
  const { tags, handleCreateTag, handleDeleteTag } = useDocuments();
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!tagName.trim()) {
      setError('Please enter a tag name');
      return;
    }

    const newTag = {
      id: 'tag_' + tagName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
      label: tagName.trim(),
      bgClass: selectedColor.bgClass,
      borderClass: selectedColor.borderClass,
      textClass: selectedColor.textClass,
      hex: selectedColor.hex,
    };

    const created = await handleCreateTag(newTag);
    setTagName('');
    setError('');
    if (onCreated) {
      onCreated(created);
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
            <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
            <h3 className="text-title-lg font-title-lg text-on-surface">Manage Tags</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] block">close</span>
          </button>
        </div>

        {/* Existing Tags Section */}
        <div className="flex flex-col gap-2">
          <label className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
            Existing Tags ({tags.length})
          </label>

          <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/40 max-h-36 overflow-y-auto">
            {tags.length === 0 ? (
              <span className="text-body-sm text-on-surface-variant/60 italic py-1">No tags created yet.</span>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="px-3 py-1 rounded-full text-label-sm font-medium flex items-center gap-2 border bg-surface-container text-on-surface shadow-2xs"
                  style={{
                    borderColor: tag.hex || '#016879',
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.hex || '#016879' }}></span>
                  <span className="font-semibold text-on-surface">{tag.label}</span>
                  <button
                    type="button"
                    title={`Delete "${tag.label}"`}
                    onClick={() => handleDeleteTag(tag.id)}
                    className="w-4 h-4 rounded-full hover:bg-black/15 text-error opacity-60 hover:opacity-100 hover:text-error transition-all cursor-pointer flex items-center justify-center -mr-1"
                  >
                    <span className="material-symbols-outlined text-[13px] block">close</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add New Tag Section */}
        <form onSubmit={handleAddTag} className="flex flex-col gap-4 pt-2 border-t border-outline-variant/50">
          <span className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
            Create New Tag
          </span>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">
              Tag Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagName}
                onChange={(e) => { setTagName(e.target.value); setError(''); }}
                placeholder="e.g. Signaling Safety, Phase 2 GCC"
                className="flex-1 px-3.5 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold transition-all flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Tag
              </button>
            </div>
            {error && <span className="text-error text-label-sm mt-1 block">{error}</span>}
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1.5">
              Theme Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`p-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                    selectedColor.name === color.name
                      ? 'border-2 border-black bg-surface-container-high font-bold shadow-xs'
                      : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: color.hex }}></span>
                  <span className="text-label-sm text-on-surface truncate">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant">Badge Preview:</span>
            <span
              className="px-3 py-0.5 border rounded-full text-xs font-semibold bg-surface-container text-on-surface flex items-center gap-1.5 shadow-2xs"
              style={{
                borderColor: selectedColor.hex,
              }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedColor.hex }}></span>
              <span className="text-on-surface">{tagName.trim() || 'Sample Tag'}</span>
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-outline-variant/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold transition-colors cursor-pointer border border-outline-variant/60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
