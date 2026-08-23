export default function Header({ toggleSidebar }) {
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
            alt="GyanSetu Metro Logo"
            className="h-15 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6RIelR4h-sjXHS-CVqoFB1HJ1CGzUrRkeL0MzVZTdufgJhfXUO0MWbLAfPa1xOyVkTkagXmW05Mc3hzAAAG3Uzpu0DCZOF2DYKKEhhFzRWUJXitxCd-ruBw8uz5_D7zqLqUq6I1nGLIx5wnh5KwLT5PxkK1GjRo_9FOcYkGr3ZvTwZRN65X6gNdfPGCUOA11QIBEimo1tf0CJUDizyL00O_G5WX1nis0EKpYebbS0XpsvVALDE7AH0g"
          />
        </div>
      </div>

      {/* Right side: CPU Used & RAM Allocation */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="flex flex-col text-right">
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">CPU Used</span>
          <span className="text-body-sm font-semibold text-primary">18%</span>
        </div>
        <div className="flex flex-col border-l border-outline-variant pl-6 text-right">
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">RAM Allocation</span>
          <span className="text-body-sm font-semibold text-primary">4.2 GB / 16.0 GB</span>
        </div>
      </div>
    </header>
  );
}
