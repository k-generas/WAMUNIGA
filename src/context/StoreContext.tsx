import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADDONS,
  AddonItem,
  BARBERS,
  BarberProfile,
  CLIENT_REVIEWS,
  ClientReview,
  DEFAULT_SITE_CONFIG,
  MusicRelease,
  PRODUCTS,
  ProductItem,
  RELEASES,
  SERVICES,
  ServiceItem,
  SiteConfig,
  VIP_PLANS,
  VipPlan,
} from '../data/catalog';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface CloudCounts {
  services: number;
  addons: number;
  barbers: number;
  products: number;
  releases: number;
  vipPlans: number;
  reviews: number;
  siteConfig: boolean;
}

interface StoreContextValue {
  services: ServiceItem[];
  addons: AddonItem[];
  barbers: BarberProfile[];
  products: ProductItem[];
  releases: MusicRelease[];
  vipPlans: VipPlan[];
  reviews: ClientReview[];
  siteConfig: SiteConfig;
  cloudCounts: CloudCounts;
  isFullyCloudSynced: boolean;
  syncDefaultsToCloud: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cloudServices, setCloudServices] = useState<ServiceItem[] | null>(null);
  const [cloudAddons, setCloudAddons] = useState<AddonItem[] | null>(null);
  const [cloudBarbers, setCloudBarbers] = useState<BarberProfile[] | null>(null);
  const [cloudProducts, setCloudProducts] = useState<ProductItem[] | null>(null);
  const [cloudReleases, setCloudReleases] = useState<MusicRelease[] | null>(null);
  const [cloudVipPlans, setCloudVipPlans] = useState<VipPlan[] | null>(null);
  const [cloudReviews, setCloudReviews] = useState<ClientReview[] | null>(null);
  const [cloudConfig, setCloudConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    const activeQuery = (colName: string) =>
      query(collection(db, colName), where('active', 'in', [true, false]));

    const unsubServices = onSnapshot(
      activeQuery('services'),
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ServiceItem, 'id'>),
        }));
        rows.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
        setCloudServices(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'services')
    );

    const unsubAddons = onSnapshot(
      activeQuery('addons'),
      (snap) => {
        setCloudAddons(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AddonItem, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'addons')
    );

    const unsubBarbers = onSnapshot(
      activeQuery('barbers'),
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BarberProfile, 'id'>),
        }));
        rows.sort((a, b) => {
          const order = { Master: 0, Senior: 1, Stylist: 2 };
          return (order[a.tier] ?? 9) - (order[b.tier] ?? 9);
        });
        setCloudBarbers(rows);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'barbers')
    );

    const unsubProducts = onSnapshot(
      activeQuery('products'),
      (snap) => {
        setCloudProducts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductItem, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubReleases = onSnapshot(
      activeQuery('releases'),
      (snap) => {
        setCloudReleases(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicRelease, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'releases')
    );

    const unsubVipPlans = onSnapshot(
      activeQuery('vip_plans'),
      (snap) => {
        setCloudVipPlans(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VipPlan, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'vip_plans')
    );

    const unsubReviews = onSnapshot(
      activeQuery('reviews'),
      (snap) => {
        setCloudReviews(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientReview, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
    );

    const unsubConfig = onSnapshot(
      doc(db, 'site_config', 'main'),
      (snap) => {
        if (snap.exists()) {
          setCloudConfig({
            ...DEFAULT_SITE_CONFIG,
            ...(snap.data() as Partial<SiteConfig>),
          });
        } else {
          setCloudConfig(null);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'site_config/main')
    );

    return () => {
      unsubServices();
      unsubAddons();
      unsubBarbers();
      unsubProducts();
      unsubReleases();
      unsubVipPlans();
      unsubReviews();
      unsubConfig();
    };
  }, []);

  const services =
    cloudServices && cloudServices.length > 0
      ? cloudServices
      : SERVICES.map((s, idx) => ({ ...s, active: true, sortOrder: idx + 1 }));

  const addons =
    cloudAddons && cloudAddons.length > 0
      ? cloudAddons
      : ADDONS.map((a) => ({ ...a, active: true }));

  const barbers =
    cloudBarbers && cloudBarbers.length > 0
      ? cloudBarbers
      : BARBERS.map((b) => ({ ...b, active: true }));

  const products =
    cloudProducts && cloudProducts.length > 0
      ? cloudProducts
      : PRODUCTS.map((p) => ({ ...p, active: true }));

  const releases =
    cloudReleases && cloudReleases.length > 0
      ? cloudReleases
      : RELEASES.map((r) => ({ ...r, active: true }));

  const vipPlans =
    cloudVipPlans && cloudVipPlans.length > 0
      ? cloudVipPlans
      : VIP_PLANS.map((p) => ({ ...p, active: true }));

  const reviews =
    cloudReviews && cloudReviews.length > 0 ? cloudReviews : CLIENT_REVIEWS;

  const siteConfig = cloudConfig || DEFAULT_SITE_CONFIG;

  const cloudCounts: CloudCounts = {
    services: cloudServices?.length ?? 0,
    addons: cloudAddons?.length ?? 0,
    barbers: cloudBarbers?.length ?? 0,
    products: cloudProducts?.length ?? 0,
    releases: cloudReleases?.length ?? 0,
    vipPlans: cloudVipPlans?.length ?? 0,
    reviews: cloudReviews?.length ?? 0,
    siteConfig: Boolean(cloudConfig),
  };

  const isFullyCloudSynced =
    cloudCounts.services > 0 &&
    cloudCounts.addons > 0 &&
    cloudCounts.barbers > 0 &&
    cloudCounts.products > 0 &&
    cloudCounts.releases > 0 &&
    cloudCounts.vipPlans > 0 &&
    cloudCounts.reviews > 0 &&
    cloudCounts.siteConfig;

  const syncDefaultsToCloud = async () => {
    const batch = writeBatch(db);

    if (cloudCounts.services === 0) {
      SERVICES.forEach((s, idx) => {
        batch.set(doc(db, 'services', s.id), {
          name: s.name.slice(0, 100),
          durationMin: s.durationMin,
          priceRwf: s.priceRwf,
          category: s.category,
          description: s.description.slice(0, 300),
          image: s.image.slice(0, 500),
          requiresDeposit: Boolean(s.requiresDeposit),
          active: true,
          sortOrder: idx + 1,
        });
      });
    }

    if (cloudCounts.addons === 0) {
      ADDONS.forEach((a) => {
        batch.set(doc(db, 'addons', a.id), {
          name: a.name.slice(0, 100),
          priceRwf: a.priceRwf,
          tag: a.tag.slice(0, 40),
          active: true,
        });
      });
    }

    if (cloudCounts.barbers === 0) {
      BARBERS.forEach((b) => {
        batch.set(doc(db, 'barbers', b.id), {
          name: b.name.slice(0, 80),
          role: b.role.slice(0, 80),
          tier: b.tier,
          surchargeRwf: b.surchargeRwf,
          commissionRate: b.commissionRate,
          specialty: b.specialty.slice(0, 200),
          avatar: b.avatar.slice(0, 500),
          active: true,
        });
      });
    }

    if (cloudCounts.products === 0) {
      PRODUCTS.forEach((p) => {
        batch.set(doc(db, 'products', p.id), {
          name: p.name.slice(0, 100),
          category: p.category,
          priceRwf: p.priceRwf,
          stockNote: p.stockNote.slice(0, 60),
          description: p.description.slice(0, 300),
          image: p.image.slice(0, 500),
          variants: p.variants.slice(0, 10),
          active: true,
        });
      });
    }

    if (cloudCounts.releases === 0) {
      RELEASES.forEach((r) => {
        const payload: Record<string, unknown> = {
          title: r.title.slice(0, 120),
          releaseType: r.releaseType.slice(0, 80),
          year: r.year.slice(0, 10),
          location: r.location.slice(0, 80),
          youtubeUrl: r.youtubeUrl.slice(0, 300),
          audiomackUrl: r.audiomackUrl.slice(0, 300),
          spotifyUrl: r.spotifyUrl.slice(0, 300),
          appleMusicUrl: r.appleMusicUrl.slice(0, 300),
          duration: r.duration.slice(0, 16),
          highlight: r.highlight.slice(0, 300),
          active: true,
        };
        if (r.featuring) payload.featuring = r.featuring.slice(0, 120);
        batch.set(doc(db, 'releases', r.id), payload);
      });
    }

    if (cloudCounts.vipPlans === 0) {
      VIP_PLANS.forEach((p) => {
        batch.set(doc(db, 'vip_plans', p.id), {
          name: p.name.slice(0, 100),
          audience: p.audience.slice(0, 120),
          priceRwf: p.priceRwf,
          cutsIncluded: p.cutsIncluded,
          perks: p.perks.slice(0, 10),
          active: true,
        });
      });
    }

    if (cloudCounts.reviews === 0) {
      CLIENT_REVIEWS.forEach((rev) => {
        batch.set(doc(db, 'reviews', rev.id), {
          name: rev.name.slice(0, 80),
          role: rev.role.slice(0, 80),
          quote: rev.quote.slice(0, 400),
          outcome: rev.outcome.slice(0, 80),
          active: true,
        });
      });
    }

    if (!cloudCounts.siteConfig) {
      batch.set(doc(db, 'site_config', 'main'), {
        ...DEFAULT_SITE_CONFIG,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'catalog_seed');
    }
  };

  return (
    <StoreContext.Provider
      value={{
        services,
        addons,
        barbers,
        products,
        releases,
        vipPlans,
        reviews,
        siteConfig,
        cloudCounts,
        isFullyCloudSynced,
        syncDefaultsToCloud,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}
