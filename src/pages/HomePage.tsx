import { ArrowRight, MapPin, Phone, Scissors, Music2, Crown, Star, ExternalLink } from 'lucide-react';
import { AppRoute } from '../components/Navbar';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/StoreContext';
import { SHOP_INFO } from '../data/catalog';
import { buildWhatsAppUrl, formatRwf, normalizePhoneKey } from '../utils/format';

interface HomePageProps {
  onNavigate: (route: AppRoute, preselectServiceId?: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { services, barbers, reviews, siteConfig } = useStore();

  const activeServices = services.filter((s) => s.active !== false);
  const activeBarbers = barbers.filter((b) => b.active !== false);
  const activeReviews = reviews.filter((r) => r.active !== false);
  const featuredServices = activeServices.slice(0, 3);
  const vipHomeService =
    activeServices.find((s) => s.id === 'svc_vip_home') ||
    activeServices.find((s) => s.category === 'VIP') ||
    activeServices[0];

  const primaryRaw = normalizePhoneKey(siteConfig.primaryPhone) || SHOP_INFO.phones[0].raw;
  const bookingRaw = normalizePhoneKey(siteConfig.bookingPhone) || SHOP_INFO.phones[1].raw;
  const vipRaw = normalizePhoneKey(siteConfig.vipPhone) || SHOP_INFO.phones[2].raw;

  const phoneLines = [
    { label: 'Main Shop & WhatsApp', display: siteConfig.primaryPhone, raw: primaryRaw },
    { label: 'Booking Desk', display: siteConfig.bookingPhone, raw: bookingRaw },
    { label: 'VIP & Management', display: siteConfig.vipPhone, raw: vipRaw },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Split Hero Section */}
      <section className="border-b border-[#E5E1D8] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Proposition */}
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5C63]">
                  <span className="text-[#14532D] font-semibold">{siteConfig.brandName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{siteConfig.address}</span>
                  <span aria-hidden="true">·</span>
                  <span>{siteConfig.hours}</span>
                </div>

                <h1 className="font-display text-[clamp(2.25rem,4vw,3.75rem)] font-bold leading-[1.06] tracking-tight text-[#18191B] [text-wrap:balance]">
                  {siteConfig.heroHeadline}
                </h1>

                <p className="text-base sm:text-lg text-[#5A5C63] leading-relaxed max-w-xl">
                  {siteConfig.heroSubheadline}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('book')}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#14532D] text-white font-semibold text-sm sm:text-base rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Scissors className="w-4 h-4" />
                    Book a Cut
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('music')}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#F9F8F5] text-[#18191B] border border-[#E5E1D8] font-semibold text-sm sm:text-base rounded-lg hover:border-[#14532D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Music2 className="w-4 h-4 text-[#B48222]" />
                    Music &amp; Brand
                  </button>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-[#E5E1D8] flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm text-[#5A5C63]">
                <a
                  href={siteConfig.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#18191B] font-medium hover:text-[#14532D] transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#14532D]" />
                  Directions to Studio
                </a>
                <a
                  href={`tel:+${primaryRaw}`}
                  className="inline-flex items-center gap-2 hover:text-[#18191B] transition-colors font-mono tabular-nums"
                >
                  <Phone className="w-4 h-4 text-[#14532D]" />
                  {siteConfig.primaryPhone}
                </a>
                <a
                  href={buildWhatsAppUrl(
                    primaryRaw,
                    `Hello ${siteConfig.brandName}! I want to inquire about a haircut slot.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#14532D] font-semibold hover:underline"
                >
                  WhatsApp Desk
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Right Dominant Media */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[340px] lg:min-h-[480px] rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#F1EFE9]">
                <ResilientImage
                  src="/src/assets/images/hero_barbershop_kigali_1795550995457.jpg"
                  alt="Wamunigga Didier crafting a sharp skin fade inside Kigali Clipper Zone barbershop"
                  className="w-full h-full lg:h-full object-cover"
                  fallbackLabel={siteConfig.brandName}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#E5C158] mb-1">Flagship Chair · Kigali</p>
                    <p className="font-display text-lg sm:text-xl font-semibold text-white">
                      {siteConfig.brandName} Barbershop
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('book', 'svc_master_wamunigga')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#18191B] text-xs font-semibold rounded-lg hover:bg-[#F1EFE9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Reserve Master Chair
                    <ArrowRight className="w-3.5 h-3.5 text-[#14532D]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column Proof Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6">
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#18191B] tabular-nums">
              {siteConfig.igShopCount}
            </p>
            <p className="text-xs sm:text-sm text-[#5A5C63] mt-1.5">Followers on @wamunigga_cuts</p>
          </div>
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6">
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#18191B] tabular-nums">
              {siteConfig.igPersonalCount}
            </p>
            <p className="text-xs sm:text-sm text-[#5A5C63] mt-1.5">Fans on @wamunigga_original</p>
          </div>
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6">
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#14532D] tabular-nums">5 + 1</p>
            <p className="text-xs sm:text-sm text-[#5A5C63] mt-1.5">Stamps for a free cut or beard trim</p>
          </div>
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6">
            <p className="font-mono text-2xl sm:text-3xl font-semibold text-[#B48222] tabular-nums">MoMo</p>
            <p className="text-xs sm:text-sm text-[#5A5C63] mt-1.5">MTN MoMo &amp; Airtel Money ready</p>
          </div>
        </div>
      </section>

      {/* Signature Haircut Portfolio */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E1D8] pb-6">
          <div>
            <p className="text-xs font-semibold text-[#14532D] mb-2">01. Signature Craft · @wamunigga_cuts</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#18191B]">
              Select a Signature Style to Book
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('book')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#14532D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View all {activeServices.length} services with photos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {featuredServices.map((svc) => (
            <div
              key={svc.id}
              className="group bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden flex flex-col hover:border-[#14532D]/60 transition-colors"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#F1EFE9]">
                <ResilientImage
                  src={svc.image}
                  alt={svc.name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#5A5C63]">
                    <span className="font-mono font-semibold text-[#14532D] tabular-nums">
                      {formatRwf(svc.priceRwf)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{svc.durationMin} min</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#18191B]">{svc.name}</h3>
                  <p className="text-sm text-[#5A5C63] leading-relaxed">{svc.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('book', svc.id)}
                  className="w-full py-2.5 px-4 bg-[#F1EFE9] hover:bg-[#14532D] text-[#18191B] hover:text-white border border-[#E5E1D8] hover:border-[#14532D] text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Book This Style
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Meet Our Barbers Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E1D8] pb-6">
          <div>
            <p className="text-xs font-semibold text-[#14532D] mb-2">02. The Barbers at {siteConfig.brandName}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#18191B]">
              Choose Your Specialist Directly
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('book')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#14532D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Check live open slots
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeBarbers.map((barber) => (
            <div
              key={barber.id}
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-square bg-[#F1EFE9] overflow-hidden">
                <ResilientImage
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <p className="text-xs font-medium text-[#B48222]">{barber.tier} Tier</p>
                  <h3 className="font-display text-base font-bold text-[#18191B] mt-0.5">{barber.name}</h3>
                  <p className="text-xs text-[#5A5C63] mt-0.5">{barber.role}</p>
                  <p className="text-xs text-[#5A5C63] mt-2 leading-relaxed">{barber.specialty}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('book')}
                  className="w-full py-2 px-3 bg-[#F9F8F5] border border-[#E5E1D8] hover:border-[#14532D] hover:text-[#14532D] text-xs font-semibold text-[#18191B] rounded-lg transition-colors cursor-pointer"
                >
                  Book with {barber.name.split(' ')[0]}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VIP Home Service + Shop Location */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#B48222]">
                <Crown className="w-4 h-4" />
                <span>VIP &amp; Executive House Calls</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B] [text-wrap:balance]">
                Private Barbershop Service Anywhere in Kigali
              </h2>
              <p className="text-sm sm:text-base text-[#5A5C63] leading-relaxed max-w-xl">
                Designed for wedding groomsmen, touring artists, corporate executives, and late-night
                schedules. Book a private home or hotel call with guaranteed MoMo slot reservation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {vipHomeService && (
                <button
                  type="button"
                  onClick={() => onNavigate('book', vipHomeService.id)}
                  className="px-5 py-2.5 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Book {vipHomeService.name.split('(')[0].trim()} · {formatRwf(vipHomeService.priceRwf)}
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('club')}
                className="px-5 py-2.5 bg-[#F9F8F5] border border-[#E5E1D8] text-[#18191B] text-sm font-semibold rounded-lg hover:border-[#14532D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explore Monthly Passes
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-8 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#14532D]">03. Visit Our Studio</p>
              <h3 className="font-display text-xl font-bold text-[#18191B]">Direct Shop Contacts</h3>
              <p className="text-sm text-[#5A5C63]">
                {siteConfig.address}
                <br />
                {siteConfig.hours}
              </p>
            </div>
            <div className="space-y-2.5 border-t border-[#E5E1D8] pt-4">
              {phoneLines.map((p) => (
                <div key={p.label} className="flex items-center justify-between text-sm">
                  <span className="text-[#5A5C63]">{p.label}</span>
                  <a
                    href={`tel:+${p.raw}`}
                    className="font-mono font-medium text-[#18191B] hover:text-[#14532D] tabular-nums transition-colors"
                  >
                    {p.display}
                  </a>
                </div>
              ))}
            </div>
            <a
              href={siteConfig.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F1EFE9] border border-[#E5E1D8] rounded-lg text-sm font-semibold text-[#18191B] hover:border-[#14532D] transition-colors"
            >
              <MapPin className="w-4 h-4 text-[#14532D]" />
              Open in Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* Client Social Proof */}
      {activeReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="border-b border-[#E5E1D8] pb-5">
            <p className="text-xs font-semibold text-[#14532D] mb-2">04. Client Proof</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B]">
              Why Kigali Regulars Book Directly Here
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeReviews.map((review) => (
              <div key={review.id || review.name} className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 flex flex-col justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[#B48222]" aria-label="5 out of 5 stars">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <p className="text-sm text-[#18191B] leading-relaxed">“{review.quote}”</p>
                </div>
                <div className="border-t border-[#E5E1D8] pt-4">
                  <p className="text-sm font-semibold text-[#18191B]">{review.name}</p>
                  <p className="text-xs text-[#5A5C63] mt-0.5">
                    {review.role} · <span className="text-[#14532D] font-medium">{review.outcome}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
