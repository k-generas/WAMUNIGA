import { AppRoute } from './Navbar';
import { useStore } from '../context/StoreContext';
import { SHOP_INFO } from '../data/catalog';

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { siteConfig } = useStore();

  const go = (route: AppRoute) => {
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-[#E5E1D8] bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="space-y-2 md:col-span-2">
          <p className="font-display text-lg font-bold text-[#18191B]">WAMUNIGGA · {siteConfig.brandName}</p>
          <p className="text-[#5A5C63] max-w-md leading-relaxed">
            {siteConfig.address}. Official booking, loyalty club, merch store, and music hub for{' '}
            {siteConfig.founderName}.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#14532D] uppercase tracking-wider">Platform</p>
          <div className="flex flex-col items-start gap-1.5 text-[#5A5C63]">
            <button type="button" onClick={() => go('book')} className="hover:text-[#18191B] cursor-pointer">
              Book a Cut
            </button>
            <button type="button" onClick={() => go('club')} className="hover:text-[#18191B] cursor-pointer">
              Loyalty Club &amp; VIP Passes
            </button>
            <button type="button" onClick={() => go('music')} className="hover:text-[#18191B] cursor-pointer">
              Music &amp; EPK
            </button>
            <button type="button" onClick={() => go('shop')} className="hover:text-[#18191B] cursor-pointer">
              Merch &amp; Grooming Store
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#14532D] uppercase tracking-wider">Connect</p>
          <div className="flex flex-col items-start gap-1.5 text-[#5A5C63]">
            <a href={SHOP_INFO.instagramShop} target="_blank" rel="noopener noreferrer" className="hover:text-[#18191B]">
              IG @wamunigga_cuts
            </a>
            <a href={SHOP_INFO.instagramPersonal} target="_blank" rel="noopener noreferrer" className="hover:text-[#18191B]">
              IG @wamunigga_original
            </a>
            <a href={SHOP_INFO.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-[#18191B]">
              TikTok @wamuniggaa_original
            </a>
            <a href={siteConfig.mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#18191B]">
              Studio Map Pin
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E5E1D8] py-5 bg-[#F9F8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5A5C63]">
          <span>© {new Date().getFullYear()} {siteConfig.founderName} &amp; {siteConfig.brandName}.</span>
          <span>Kigali, Rwanda · {siteConfig.primaryPhone}</span>
        </div>
      </div>
    </footer>
  );
}
