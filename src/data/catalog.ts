export interface ServiceItem {
  id: string;
  name: string;
  durationMin: number;
  priceRwf: number;
  category: 'Signature' | 'Grooming' | 'VIP';
  description: string;
  image: string;
  requiresDeposit?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface AddonItem {
  id: string;
  name: string;
  priceRwf: number;
  tag: string;
  active?: boolean;
}

export interface BarberProfile {
  id: string;
  name: string;
  role: string;
  tier: 'Master' | 'Senior' | 'Stylist';
  surchargeRwf: number;
  commissionRate: number;
  specialty: string;
  avatar: string;
  active?: boolean;
}

export interface TimeSlot {
  time: string;
  isPeak: boolean;
  peakFeeRwf: number;
}

export interface VipPlan {
  id: string;
  name: string;
  audience: string;
  priceRwf: number;
  cutsIncluded: number;
  perks: string[];
  active?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  category: 'Apparel' | 'Grooming' | 'Bundle';
  priceRwf: number;
  stockNote: string;
  description: string;
  image: string;
  variants: string[];
  active?: boolean;
}

export interface MusicRelease {
  id: string;
  title: string;
  featuring?: string;
  releaseType: string;
  year: string;
  location: string;
  youtubeUrl: string;
  audiomackUrl: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  duration: string;
  highlight: string;
  active?: boolean;
}

export interface ClientReview {
  id: string;
  name: string;
  role: string;
  quote: string;
  outcome: string;
  active?: boolean;
}

export interface SiteConfig {
  brandName: string;
  founderName: string;
  address: string;
  hours: string;
  primaryPhone: string;
  bookingPhone: string;
  vipPhone: string;
  mapsUrl: string;
  momoPayCode: string;
  momoNumber: string;
  heroHeadline: string;
  heroSubheadline: string;
  motoDeliveryFeeRwf: number;
  standardDepositRwf: number;
  vipDepositRwf: number;
  igPersonalCount: string;
  igShopCount: string;
  blockedDates: string[];
  timeSlots: TimeSlot[];
}

export const SHOP_INFO = {
  brandName: 'Kigali Clipper Zone',
  founderName: 'Wamunigga Didier',
  address: 'La Bonne Adresse Building, 2nd Floor, Kigali',
  hours: 'Daily · 09:00 – 22:00 (VIP Late Slots to 23:00)',
  primaryPhone: '+250 787 792 446',
  phones: [
    { label: 'Main Shop & WhatsApp', display: '0787 792 446', raw: '250787792446' },
    { label: 'Booking Desk', display: '0794 776 989', raw: '250794776989' },
    { label: 'VIP & Management', display: '+250 788 295 833', raw: '250788295833' },
  ],
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=La+Bonne+Adresse+Building+Kigali+Rwanda',
  instagramPersonal: 'https://www.instagram.com/wamunigga_original/',
  instagramShop: 'https://www.instagram.com/wamunigga_cuts/',
  tiktok: 'https://www.tiktok.com/@wamuniggaa_original',
  youtube: 'https://www.youtube.com/results?search_query=Wamunigga',
  audiomack: 'https://audiomack.com/search?q=Wamunigga+Umuvandimwe',
  momoPayCode: '*182*8*1*078779#',
  momoNumber: '0787 792 446 (Wamunigga Didier)',
};

export const SERVICES: ServiceItem[] = [
  {
    id: 'svc_skin_fade',
    name: 'Signature Skin Fade & Line-Up',
    durationMin: 35,
    priceRwf: 5000,
    category: 'Signature',
    description: 'Precision zero-gap fade, razor hairline edge, and warm towel finish.',
    image: '/src/assets/images/portfolio_fade_cut_1795550995617.jpg',
  },
  {
    id: 'svc_fade_beard',
    name: 'Fade + Sculpted Beard & Razor',
    durationMin: 45,
    priceRwf: 8000,
    category: 'Signature',
    description: 'Full skin or taper fade paired with geometric beard sculpting and conditioning balm.',
    image: '/src/assets/images/svc_beard_sculpt_1795553010712.jpg',
  },
  {
    id: 'svc_master_wamunigga',
    name: 'Master Chair with Wamunigga Didier',
    durationMin: 60,
    priceRwf: 15000,
    category: 'VIP',
    description: 'Direct 1-on-1 session with Wamunigga including full cut, beard detail, and enhancements.',
    image: '/src/assets/images/hero_barbershop_kigali_1795550995457.jpg',
    requiresDeposit: true,
  },
  {
    id: 'svc_hair_dye',
    name: 'Black Enhancement, Dye & Waves',
    durationMin: 45,
    priceRwf: 10000,
    category: 'Grooming',
    description: 'Natural pigment enhancement, crisp razor contour, and 360-wave compression set.',
    image: '/src/assets/images/svc_hair_enhancement_1795553010410.jpg',
  },
  {
    id: 'svc_kids_cut',
    name: 'Kids Precision Cut',
    durationMin: 30,
    priceRwf: 4000,
    category: 'Signature',
    description: 'Clean, patient taper or fade cut for young clients in a welcoming chair.',
    image: '/src/assets/images/svc_kids_precision_1795553012939.jpg',
  },
  {
    id: 'svc_vip_home',
    name: 'VIP Executive Home Service (Kigali)',
    durationMin: 90,
    priceRwf: 35000,
    category: 'VIP',
    description: 'Private on-location grooming across Kigali for executives, artists, and wedding grooms.',
    image: '/src/assets/images/svc_vip_home_call_1795553013162.jpg',
    requiresDeposit: true,
  },
];

export const ADDONS: AddonItem[] = [
  { id: 'add_beard', name: 'Add Beard Sculpting & Razor', priceRwf: 3000, tag: 'Popular' },
  { id: 'add_mask', name: 'Add Black Mask & Facial Steam', priceRwf: 5000, tag: 'Skin Care' },
  { id: 'add_wash', name: 'Add Detox Hair Wash & Massage', priceRwf: 2500, tag: 'Refresh' },
  { id: 'add_durag', name: 'Pickup KCZ Silk Durag at Chair', priceRwf: 8000, tag: 'Merch' },
  { id: 'add_oil', name: 'Pickup Onyx Beard Oil 30ml', priceRwf: 12000, tag: 'Grooming' },
];

export const BARBERS: BarberProfile[] = [
  {
    id: 'barber_wamunigga',
    name: 'Wamunigga Didier',
    role: 'Founder & Master Barber',
    tier: 'Master',
    surchargeRwf: 5000,
    commissionRate: 1.0,
    specialty: 'Celebrity fades, enhancements & signature transformations',
    avatar: '/src/assets/images/barber_wamunigga_didier_1795553012688.jpg',
  },
  {
    id: 'barber_jeanluc',
    name: 'Jean-Luc K.',
    role: 'Senior Fade Specialist',
    tier: 'Senior',
    surchargeRwf: 0,
    commissionRate: 0.5,
    specialty: 'Skin fades, tapers & sponge twists',
    avatar: '/src/assets/images/barber_jean_luc_1795553014360.jpg',
  },
  {
    id: 'barber_patrick',
    name: 'Patrick N.',
    role: 'Beard & Razor Artist',
    tier: 'Senior',
    surchargeRwf: 0,
    commissionRate: 0.5,
    specialty: 'Sharp razor line-ups, beard geometry & hot towel shaves',
    avatar: '/src/assets/images/barber_patrick_n_1795553014532.jpg',
  },
  {
    id: 'barber_eric',
    name: 'Eric M.',
    role: 'Classic & Kids Stylist',
    tier: 'Stylist',
    surchargeRwf: 0,
    commissionRate: 0.45,
    specialty: 'Classic tapers, waves & youth precision cuts',
    avatar: '/src/assets/images/barber_eric_m_1795553014054.jpg',
  },
];

export const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', isPeak: false, peakFeeRwf: 0 },
  { time: '09:45', isPeak: false, peakFeeRwf: 0 },
  { time: '10:30', isPeak: false, peakFeeRwf: 0 },
  { time: '11:15', isPeak: false, peakFeeRwf: 0 },
  { time: '12:00', isPeak: false, peakFeeRwf: 0 },
  { time: '13:30', isPeak: false, peakFeeRwf: 0 },
  { time: '14:15', isPeak: false, peakFeeRwf: 0 },
  { time: '15:00', isPeak: false, peakFeeRwf: 0 },
  { time: '16:00', isPeak: false, peakFeeRwf: 0 },
  { time: '17:00', isPeak: false, peakFeeRwf: 0 },
  { time: '18:00', isPeak: false, peakFeeRwf: 0 },
  { time: '19:00', isPeak: false, peakFeeRwf: 0 },
  { time: '20:00', isPeak: true, peakFeeRwf: 2000 },
  { time: '21:00', isPeak: true, peakFeeRwf: 2000 },
  { time: '22:00', isPeak: true, peakFeeRwf: 2000 },
];

export const VIP_PLANS: VipPlan[] = [
  {
    id: 'fresh_fade_monthly',
    name: 'Fresh Fade Monthly Pass',
    audience: 'For regular Kigali professionals & students',
    priceRwf: 18000,
    cutsIncluded: 4,
    perks: [
      '4 Signature Skin Fades per month (save 2,000+ RWF)',
      'Unlimited quick hairline & neck line-ups between cuts',
      'Priority WhatsApp rescheduling at La Bonne Adresse',
      '10% off all KCZ grooming oils and apparel',
    ],
  },
  {
    id: 'executive_crown_vip',
    name: 'Executive Crown VIP Pass',
    audience: 'For artists, founders & high-visibility leaders',
    priceRwf: 45000,
    cutsIncluded: 4,
    perks: [
      '4 Master Chair sessions directly with Wamunigga Didier',
      '2 Black Mask facial steams + beard sculpting treatments',
      'Priority late-night VIP slots (20:00–22:00) at zero surcharge',
      '15% off home service bookings & complimentary silk durag on signup',
    ],
  },
];

export const PRODUCTS: ProductItem[] = [
  {
    id: 'prod_durag',
    name: 'KCZ Luxury Silk Durag',
    category: 'Apparel',
    priceRwf: 8000,
    stockNote: 'In Stock · Kigali',
    description: 'Double-wide compression straps, breathable satin interior for 360 waves and fresh cuts.',
    image: '/src/assets/images/merch_kcz_durag_kit_1795550995951.jpg',
    variants: ['Obsidian Black', 'Gold Trim Edition'],
  },
  {
    id: 'prod_beard_oil',
    name: 'Onyx & Oak Beard Elixir (30ml)',
    category: 'Grooming',
    priceRwf: 12000,
    stockNote: 'In Stock · Kigali',
    description: 'Cold-pressed jojoba, argan, and sandalwood-oud blend for soft, itch-free beard growth.',
    image: '/src/assets/images/merch_kcz_durag_kit_1795550995951.jpg',
    variants: ['30ml Dropper'],
  },
  {
    id: 'prod_pomade',
    name: 'Velvet Wave Firm Hold Pomade',
    category: 'Grooming',
    priceRwf: 10000,
    stockNote: 'In Stock · Kigali',
    description: 'Non-greasy water-soluble wave & texture pomade crafted for crisp definition all day.',
    image: '/src/assets/images/merch_kcz_durag_kit_1795550995951.jpg',
    variants: ['85g Brushed Tin'],
  },
  {
    id: 'prod_hoodie',
    name: 'KCZ Crown Heavyweight Hoodie',
    category: 'Apparel',
    priceRwf: 38000,
    stockNote: 'Limited Run',
    description: '420gsm obsidian combed cotton fleece with gold crown embroidery and tailored streetwear fit.',
    image: '/src/assets/images/merch_kcz_hoodie_1795550997430.jpg',
    variants: ['M', 'L', 'XL'],
  },
  {
    id: 'prod_tee',
    name: 'Kigali Clipper Zone Signature Tee',
    category: 'Apparel',
    priceRwf: 18000,
    stockNote: 'In Stock · Kigali',
    description: 'Heavyweight boxy crew neck with subtle chest crest and La Bonne Adresse back print.',
    image: '/src/assets/images/merch_kcz_hoodie_1795550997430.jpg',
    variants: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 'prod_bundle',
    name: 'Complete KCZ Grooming Box',
    category: 'Bundle',
    priceRwf: 26000,
    stockNote: 'Save 4,000 RWF',
    description: 'Includes KCZ Silk Durag + Onyx & Oak Beard Oil + Velvet Wave Pomade in gift box.',
    image: '/src/assets/images/merch_kcz_durag_kit_1795550995951.jpg',
    variants: ['Full 3-Piece Kit'],
  },
];

export const RELEASES: MusicRelease[] = [
  {
    id: 'rel_umuvandimwe',
    title: 'Umuvandimwe',
    featuring: 'feat. Fireman & Niyo Bosco',
    releaseType: 'Single · Official Audio & Video',
    year: '2025',
    location: 'Kigali, Rwanda',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Wamunigga+Umuvandimwe+Fireman+Niyo+Bosco',
    audiomackUrl: 'https://audiomack.com/search?q=Wamunigga+Umuvandimwe',
    spotifyUrl: 'https://open.spotify.com/search/Wamunigga%20Umuvandimwe',
    appleMusicUrl: 'https://music.apple.com/search?term=Wamunigga%20Umuvandimwe',
    duration: '3:42',
    highlight: 'Flagship collaboration blending Kigali street lyricism with soul vocals.',
  },
  {
    id: 'rel_worldwide',
    title: 'Rwanda to Ethiopia (Official Music Video)',
    releaseType: 'Visual Single',
    year: '2026',
    location: 'Shot in Rwanda & Ethiopia',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Wamunigga+official+music+video',
    audiomackUrl: 'https://audiomack.com/search?q=Wamunigga',
    spotifyUrl: 'https://open.spotify.com/search/Wamunigga',
    appleMusicUrl: 'https://music.apple.com/search?term=Wamunigga',
    duration: '3:18',
    highlight: 'Cross-border visual release taking East African sound & style worldwide.',
  },
  {
    id: 'rel_kcz_session',
    title: 'La Bonne Adresse Studio Cypher',
    releaseType: 'Live Studio Session',
    year: '2026',
    location: 'Kigali, Rwanda',
    youtubeUrl: 'https://www.youtube.com/results?search_query=Wamunigga+studio+session',
    audiomackUrl: 'https://audiomack.com/search?q=Wamunigga',
    spotifyUrl: 'https://open.spotify.com/search/Wamunigga',
    appleMusicUrl: 'https://music.apple.com/search?term=Wamunigga',
    duration: '4:05',
    highlight: 'Raw acoustic & studio bars recorded after hours at Kigali Clipper Zone.',
  },
];

export const PORTFOLIO_ITEMS = [
  {
    id: 'port_1',
    title: 'Zero-Gap Skin Fade & Razor Contour',
    serviceId: 'svc_skin_fade',
    priceRwf: 5000,
    duration: '35 min',
    image: '/src/assets/images/portfolio_fade_cut_1795550995617.jpg',
    caption: 'Precision temple blend with crisp matte line-up — our #1 booked cut at La Bonne Adresse.',
  },
  {
    id: 'port_2',
    title: 'Fade + Sculpted Beard & Razor',
    serviceId: 'svc_fade_beard',
    priceRwf: 8000,
    duration: '45 min',
    image: '/src/assets/images/svc_beard_sculpt_1795553010712.jpg',
    caption: 'Razor-sculpted beard geometry finished with warm towel compression and beard oil.',
  },
  {
    id: 'port_3',
    title: 'VIP Executive Home Service',
    serviceId: 'svc_vip_home',
    priceRwf: 35000,
    duration: '90 min',
    image: '/src/assets/images/svc_vip_home_call_1795553013162.jpg',
    caption: 'Private grooming delivered directly to your home, hotel, or wedding suite across Kigali.',
  },
];

export const CLIENT_REVIEWS: ClientReview[] = [
  {
    id: 'rev_kevin',
    name: 'Kevin Mugisha',
    role: 'Creative Director, Kigali',
    quote: 'Before booking online existed, I used to call twice during Friday rush. Now I lock my 18:00 slot with Jean-Luc in 20 seconds via MoMo and walk straight into the chair.',
    outcome: 'Booked 6 times in 3 months',
    active: true,
  },
  {
    id: 'rev_claude',
    name: 'Claude Nshimiye',
    role: 'Event Producer, Nyarugenge',
    quote: 'Booked the VIP Home Service for our wedding groomsmen team and picked up four KCZ durags. Sharpest line-ups in Kigali without leaving the hotel.',
    outcome: 'VIP Group & Grooming Order',
    active: true,
  },
  {
    id: 'rev_diane',
    name: 'Diane Uwase',
    role: 'Brand Partnerships Lead',
    quote: 'We discovered Wamunigga through Umuvandimwe and booked both a live appearance and studio content shoot right through his EPK portal.',
    outcome: 'Brand Campaign Partner',
    active: true,
  },
];

export const EPK_STATS = [
  { label: 'Instagram Personal (@wamunigga_original)', value: '94.2K+' },
  { label: 'Instagram Salon (@wamunigga_cuts)', value: '21.8K+' },
  { label: 'Published Visuals & Reels', value: '3,375+' },
  { label: 'Flagship Studio Location', value: 'Kigali, RW' },
];

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brandName: SHOP_INFO.brandName,
  founderName: SHOP_INFO.founderName,
  address: SHOP_INFO.address,
  hours: SHOP_INFO.hours,
  primaryPhone: '0787 792 446',
  bookingPhone: '0794 776 989',
  vipPhone: '+250 788 295 833',
  mapsUrl: SHOP_INFO.mapsUrl,
  momoPayCode: SHOP_INFO.momoPayCode,
  momoNumber: SHOP_INFO.momoNumber,
  heroHeadline: 'Sharp Cuts in Kigali. Sound & Culture Worldwide.',
  heroSubheadline:
    'Book your chair with Wamunigga Didier and the Kigali Clipper Zone team in 30 seconds, lock your time slot via MTN MoMo, earn free cuts with your phone number, or stream the latest music releases in one place.',
  motoDeliveryFeeRwf: 2000,
  standardDepositRwf: 3000,
  vipDepositRwf: 10000,
  igPersonalCount: '94.2K+',
  igShopCount: '21.8K+',
  blockedDates: [],
  timeSlots: TIME_SLOTS,
};

export const AVAILABLE_MEDIA_PRESETS = [
  { label: 'Master Chair Studio', url: '/src/assets/images/hero_barbershop_kigali_1795550995457.jpg' },
  { label: 'Signature Skin Fade', url: '/src/assets/images/portfolio_fade_cut_1795550995617.jpg' },
  { label: 'Beard Sculpt & Razor', url: '/src/assets/images/svc_beard_sculpt_1795553010712.jpg' },
  { label: 'Black Dye & Waves', url: '/src/assets/images/svc_hair_enhancement_1795553010410.jpg' },
  { label: 'Kids Precision Cut', url: '/src/assets/images/svc_kids_precision_1795553012939.jpg' },
  { label: 'VIP Home Call', url: '/src/assets/images/svc_vip_home_call_1795553013162.jpg' },
  { label: 'Barber: Wamunigga', url: '/src/assets/images/barber_wamunigga_didier_1795553012688.jpg' },
  { label: 'Barber: Jean-Luc K.', url: '/src/assets/images/barber_jean_luc_1795553014360.jpg' },
  { label: 'Barber: Patrick N.', url: '/src/assets/images/barber_patrick_n_1795553014532.jpg' },
  { label: 'Barber: Eric M.', url: '/src/assets/images/barber_eric_m_1795553014054.jpg' },
  { label: 'Merch: Durag & Grooming', url: '/src/assets/images/merch_kcz_durag_kit_1795550995951.jpg' },
  { label: 'Merch: KCZ Hoodie', url: '/src/assets/images/merch_kcz_hoodie_1795550997430.jpg' },
  { label: 'Artist Studio Portrait', url: '/src/assets/images/artist_wamunigga_music_1795550995578.jpg' },
];
