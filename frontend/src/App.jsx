import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UploadModal from './components/UploadModal';
import { RouterProvider, useRouter } from './context/RouterContext';
import { DocumentProvider, useDocuments } from './context/DocumentContext';

import DocumentHubPage from './pages/DocumentHubPage';
import SetuSearchPage from './pages/SetuSearchPage';
import DocumentVersionsPage from './pages/DocumentVersionsPage';
import SystemDiagnosticsPage from './pages/SystemDiagnosticsPage';

function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentPath } = useRouter();
  const { isUploadModalOpen, setIsUploadModalOpen, pendingUploadFile } = useDocuments();

  // Dynamic route dispatcher
  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/setusearch':
        return <SetuSearchPage />;
      case '/document-versions':
      case '/circular-tracker':
        return <DocumentVersionsPage />;
      case '/system-diagnostics':
        return <SystemDiagnosticsPage />;
      case '/document-hub':
      case '/':
      default:
        return <DocumentHubPage />;
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface flex flex-col h-screen overflow-hidden">
      <Header toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex flex-1 overflow-hidden relative w-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCloseMobile={() => setSidebarCollapsed(true)}
        />

        {/* Main Content Area: Responsive spacing & increased horizontal margin when sidebar is hidden */}
        <main
          className={`flex-1 overflow-y-auto bg-background main-transition w-full ${
            sidebarCollapsed
              ? 'ml-0 px-6 sm:px-12 md:px-20 lg:px-28 py-6 md:py-10 pb-20'
              : 'md:ml-[15.5rem] ml-0 p-4 md:p-[32px] md:pb-20 pb-16'
          }`}
          id="main-content"
        >
          {renderCurrentPage()}
        </main>
      </div>

      {isUploadModalOpen && (
        <UploadModal
          file={pendingUploadFile}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <DocumentProvider>
        <MainLayout />
      </DocumentProvider>
    </RouterProvider>
  );
}
