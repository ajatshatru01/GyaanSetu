import React from 'react';
import DocumentUpload from '../components/DocumentUpload';
import ActiveUpload from '../components/ActiveUpload';
import DocumentTable from '../components/DocumentTable';

export default function DocumentHubPage() {
  return (
    <div className="flex flex-col w-full gap-6 md:gap-8 max-w-[1700px] mx-auto pb-14 md:pb-20">
      {/* Header / Breadcrumb */}
      <div className="flex flex-col justify-between w-full mb-1 md:mb-3 shrink-0">
        <div>
          <h1 className="text-display-lg font-display-lg text-on-surface mb-1">Document Hub</h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Central upload and indexing portal for all Metro engineering documents.
          </p>
        </div>
      </div>

      {/* Main Grid Container (Side-by-side on lg: 1024px+) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full">
        {/* Left Column: Upload Area & Active Upload Status (4 Cols) */}
        <div className="flex flex-col gap-6 lg:gap-7 lg:col-span-4 shrink-0 overflow-y-auto pr-0 lg:pr-2">
          <DocumentUpload />
          <ActiveUpload />
        </div>

        {/* Right Column: Filter & Data Table (8 Cols) */}
        <DocumentTable />
      </div>
    </div>
  );
}
