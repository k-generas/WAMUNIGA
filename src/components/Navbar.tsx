import { Award, Home, Music2, Scissors, Shield, ShoppingBag } from 'lucide-react';

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

const MOBILE_TABS: { route: AppRoute; label: string; icon: typeof Home }[] = [
  { route: 'home', label: 'Home', icon: Home },
  { route: 'book', label: 'Book', icon: Scissors },
  { route: 'club', label: 'Stamps', icon: Award },
  { route: 'music', label: 'Music', icon: Music2 },
  { route: 'shop', label: 'Shop', icon: ShoppingBag },
];

export function Navbar({ activeRoute, onNavigate }: NavbarProps) {
  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E5E1D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#18191B] hover:text-[#14532D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          WAMUNIGGA
        </button>

        {/* Zone 2: 5 concise single-line text nav links (Tablet & Desktop) */}
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

        {/* Zone 3: Desktop primary action & Mobile Owner shortcut */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('book')}
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Book Chair
          </button>

          <button
            type="button"
            onClick={() => handleSelect('admin')}
            className={`md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRoute === 'admin'
                ? 'bg-[#14532D] border-[#14532D] text-white'
                : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#18191B] hover:border-[#14532D]'
            }`}
            aria-label="Open Owner Portal"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Owner</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav({ activeRoute, onNavigate }: NavbarProps) {
  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E5E1D8] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeRoute === tab.route;
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => handleSelect(tab.route)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#14532D] bg-[#F4F8F5]/70'
                  : 'text-[#5A5C63] hover:text-[#18191B]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-3 right-3 h-0.5 bg-[#14532D]" />
              )}
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
              <span className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
