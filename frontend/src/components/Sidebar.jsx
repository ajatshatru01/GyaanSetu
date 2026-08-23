import React from 'react';
import { useRouter } from '../context/RouterContext';

export default function Sidebar({ collapsed, onCloseMobile }) {
  const { currentPath, navigate } = useRouter();

  const navItems = [
    { label: 'Document Hub', path: '/document-hub', icon: 'folder_open' },
    { label: 'SetuSearch', path: '/setusearch', icon: 'manage_search' },
    { label: 'Document Versions', path: '/document-versions', icon: 'history' },
    { label: 'System Diagnostics', path: '/system-diagnostics', icon: 'settings_suggest' },
  ];

  const handleNav = (path) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`absolute left-0 md:left-5 top-0 md:top-5 z-40 w-56 flex flex-col sidebar-transition h-full md:h-auto md:max-h-[calc(100%-2.5rem)] ${
        collapsed ? 'transform -translate-x-full md:-translate-x-[150%]' : 'transform translate-x-0'
      }`}
    >
      <div className="bg-primary-container/95 md:bg-primary-container/40 backdrop-blur-xl md:rounded-[1.75rem] shadow-lg border border-primary/10 overflow-hidden flex flex-col py-4 h-full">
        <nav className="px-2 space-y-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (currentPath === '/' && item.path === '/document-hub');
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-2.5 px-3.5 transition-all rounded-full py-2.5 text-left cursor-pointer ${
                  isActive
                    ? 'bg-secondary text-on-secondary shadow-xs font-semibold'
                    : 'text-on-primary/90 hover:bg-on-primary/10 hover:text-on-primary font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[19px] shrink-0 font-semibold">{item.icon}</span>
                <span className="text-body-sm font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
