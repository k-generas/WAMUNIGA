import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type AppRoute = 'home' | 'book' | 'club' | 'music' | 'shop' | 'admin';

interface NavbarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const NAV_LINKS: { route: AppRoute; label: string }[] = [
  { route: 'book', label: 'Book a Cut' },
  { route: 'club', label: 'Loyalty Club' },
  { route: 'music', label: 'Music & EPK' },
  { route: 'shop', label: 'Merch Shop' },
  { route: 'admin', label: 'Owner Portal' },
];

export function Navbar({ activeRoute, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E5E1D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#18191B] hover:text-[#14532D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          WAMUNIGGA
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Primary navigation">
          {NAV_LINKS.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleSelect(item.route)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#14532D] border-[#14532D] font-semibold'
                    : 'text-[#5A5C63] border-transparent hover:text-[#18191B] hover:border-[#D5D0C5]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('book')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Book Chair
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E5E1D8] text-[#18191B] hover:bg-[#F1EFE9] transition-colors"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E1D8] bg-[#FFFFFF] px-4 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleSelect('home')}
            className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeRoute === 'home' ? 'bg-[#F1EFE9] text-[#14532D] font-semibold' : 'text-[#18191B] hover:bg-[#F1EFE9]'
            }`}
          >
            Home
          </button>
          {NAV_LINKS.map((item) => (
            <button
              key={item.route}
              type="button"
              onClick={() => handleSelect(item.route)}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeRoute === item.route ? 'bg-[#F1EFE9] text-[#14532D] font-semibold' : 'text-[#18191B] hover:bg-[#F1EFE9]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
