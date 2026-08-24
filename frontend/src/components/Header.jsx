import { useState, useEffect } from 'react';
import { documentService } from '../services/documentService';

export default function Header({ toggleSidebar }) {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const data = await documentService.getDiagnostics();
        if (isMounted && data?.hardware) {
          setMetrics({
            cpu_percent: data.hardware.cpu_percent,
            ram_used_gb: data.hardware.ram_used_gb,
            ram_total_gb: data.hardware.ram_total_gb,
          });
        }
      } catch (err) {
        console.error('Failed to load header metrics:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant z-50 flex items-center px-6 justify-between shrink-0">
      {/* Left side: Menu & Logo */}
      <div className="flex items-center gap-4">
        <button
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface cursor-pointer"
          onClick={toggleSidebar}
          title="Toggle Navigation Sidebar"
        >
          <span className="material-symbols-outlined text-[22px] block">menu</span>
        </button>
        <div className="flex items-center gap-2.5">
          <img
            alt="GyaanSetu Metro Logo"
            className="h-15 w-auto object-contain"
            src="/logo.jpg"
          />
        </div>
      </div>

      {/* Scoped ECG Heartbeat wave animation */}
      <style>{`
        @keyframes ecgPulseWave {
          0% {
            stroke-dashoffset: 36;
            opacity: 0.3;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -36;
            opacity: 0.3;
          }
        }
      `}</style>

      {/* Right side: CPU Used & RAM Allocation */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="flex flex-col text-right justify-center">
          <div className="flex items-center justify-end gap-1.5 h-4">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider leading-none">
              CPU Used
            </span>
            {/* Frameless moving heartbeat ECG wave */}
            <div className="relative w-5 h-3 flex items-center shrink-0">
              <svg className="w-5 h-3 text-emerald-600 overflow-visible" viewBox="0 0 24 14" fill="none">
                x<path
                  d="M1 7h4.5l2-5 3 10 3-8 2 5h7.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-25"
                />
                <path
                  d="M1 7h4.5l2-5 3 10 3-8 2 5h7.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="36"
                  style={{
                    animation: 'ecgPulseWave 1.6s ease-in-out infinite',
                  }}
                />
              </svg>
            </div>
          </div>
          <span className="text-body-sm font-semibold text-primary font-mono leading-tight mt-1">
            {metrics ? `${metrics.cpu_percent}%` : '...'}
          </span>
        </div>

        <div className="flex flex-col border-l border-outline-variant pl-6 text-right justify-center">
          <div className="flex items-center justify-end h-4">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider leading-none">
              RAM Allocation
            </span>
          </div>
          <span className="text-body-sm font-semibold text-primary font-mono leading-tight mt-1">
            {metrics ? `${metrics.ram_used_gb} GB / ${metrics.ram_total_gb} GB` : '...'}
          </span>
        </div>
      </div>
    </header>
  );
}


