import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  CheckCircle2,
  CloudUpload,
  Crown,
  Database,
  Edit3,
  Lock,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Tag,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CatalogManagerTab } from '../components/admin/CatalogManagerTab';
import { ContentManagerTab } from '../components/admin/ContentManagerTab';
import { SettingsAccessTab } from '../components/admin/SettingsAccessTab';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  OWNER_ADMIN_EMAIL,
} from '../firebase';
import {
  buildWhatsAppUrl,
  daysSinceDate,
  formatDisplayPhone,
  formatRwf,
  generateId,
  normalizePhoneKey,
  todayIso,
} from '../utils/format';

interface BookingDoc {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  addonNames?: string;
  barberId: string;
  barberName: string;
  date: string;
  slot: string;
  totalRwf: number;
  depositRwf: number;
  paymentMethod: 'mtn_momo' | 'airtel_money' | 'cash_chair';
  bookingType: 'online' | 'walkin';
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  referralCode?: string;
  notes?: string;
}

interface SlotLockDoc {
  id: string;
  barberId: string;
  date: string;
  slot: string;
  bookingId: string;
  status: 'reserved' | 'completed' | 'released';
}

interface LoyaltyDoc {
  id: string;
  phoneKey: string;
  displayPhone: string;
  firstName: string;
  stamps: number;
  totalCuts: number;
  tier: 'Standard' | 'VIP' | 'Founder';
  favoriteBarber?: string;
  referralCode: string;
  lastVisitDate: string;
}

interface SubscriptionDoc {
  id: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  planName: string;
  priceRwf: number;
  paymentMethod: 'mtn_momo' | 'airtel_money';
  status: 'pending_momo' | 'active' | 'expired';
  cutsRemaining: number;
}

interface ReferralDoc {
  id: string;
  code: string;
  ownerFirstName: string;
  discountRwf: number;
  usesCount: number;
  active: boolean;
}

interface OrderDoc {
  id: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
  totalRwf: number;
  fulfillment: string;
  deliveryAddress?: string;
  paymentMethod: string;
  status: 'pending' | 'paid' | 'dispatched' | 'completed';
}

interface InquiryDoc {
  id: string;
  organization: string;
  contactName: string;
  contactPhoneOrEmail: string;
  inquiryType: string;
  budgetTier: string;
  eventDate?: string;
  brief: string;
  status: 'new' | 'reviewing' | 'booked' | 'archived';
}

type AdminTab =
  | 'queue'
  | 'commissions'
  | 'crm'
  | 'orders'
  | 'catalog'
  | 'content'
  | 'settings';

export function AdminPage() {
  const { services, barbers, siteConfig, isFullyCloudSynced, syncDefaultsToCloud } = useStore();
  const timeSlots = siteConfig.timeSlots;

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('queue');
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [slotLocks, setSlotLocks] = useState<SlotLockDoc[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyDoc[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDoc[]>([]);
  const [referrals, setReferrals] = useState<ReferralDoc[]>([]);
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [inquiries, setInquiries] = useState<InquiryDoc[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [queueFilter, setQueueFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editBookingBarberId, setEditBookingBarberId] = useState('');
  const [editBookingTotal, setEditBookingTotal] = useState(0);
  const [editBookingNotes, setEditBookingNotes] = useState('');

  const [blockBarberId, setBlockBarberId] = useState('');
  const [blockDate, setBlockDate] = useState(todayIso());
  const [blockSlot, setBlockSlot] = useState('');

  const [crmSearch, setCrmSearch] = useState('');
  const [promoDraft, setPromoDraft] = useState(
    'Hey from Kigali Clipper Zone! Midweek slots are open at La Bonne Adresse (2nd Floor). Reply or book on wamunigga.com for 10% off your fade today.'
  );

  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoOwner, setNewPromoOwner] = useState('Shop Promo');
  const [newPromoDiscount, setNewPromoDiscount] = useState(2000);

  const [walkName, setWalkName] = useState('');
  const [walkPhone, setWalkPhone] = useState('');
  const [walkServiceId, setWalkServiceId] = useState(services[0]?.id || '');
  const [walkBarberId, setWalkBarberId] = useState(barbers[1]?.id || barbers[0]?.id || '');
  const [walkSlot, setWalkSlot] = useState(timeSlots[4]?.time || timeSlots[0]?.time || '12:00');
  const [walkPayment, setWalkPayment] = useState<'cash_chair' | 'mtn_momo' | 'airtel_money'>('cash_chair');
  const [loggingWalkin, setLoggingWalkin] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  useEffect(() => {
    if (!walkServiceId && services[0]) setWalkServiceId(services[0].id);
  }, [services, walkServiceId]);

  useEffect(() => {
    if (!walkBarberId && barbers[0]) setWalkBarberId(barbers[0].id);
    if (!blockBarberId && barbers[0]) setBlockBarberId(barbers[0].id);
  }, [barbers, walkBarberId, blockBarberId]);

  useEffect(() => {
    if (!blockSlot && timeSlots[0]) setBlockSlot(timeSlots[0].time);
  }, [timeSlots, blockSlot]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorized(false);
        setAuthReady(true);
        return;
      }

      if (currentUser.email === OWNER_ADMIN_EMAIL && currentUser.emailVerified) {
        setIsAuthorized(true);
        setAuthReady(true);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
        setIsAuthorized(adminSnap.exists() && currentUser.emailVerified);
      } catch {
        setIsAuthorized(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthorized) return;
    setDataLoading(true);

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), orderBy('createdAt', 'desc')),
      (snap) => {
        setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BookingDoc, 'id'>) })));
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubLocks = onSnapshot(
      query(collection(db, 'slot_locks'), where('status', '==', 'reserved')),
      (snap) => {
        setSlotLocks(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SlotLockDoc, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'slot_locks')
    );

    const unsubLoyalty = onSnapshot(
      collection(db, 'loyalty_cards'),
      (snap) => {
        setLoyaltyCards(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LoyaltyDoc, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'loyalty_cards')
    );

    const unsubSubs = onSnapshot(
      query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc')),
      (snap) => {
        setSubscriptions(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SubscriptionDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
    );

    const unsubRefs = onSnapshot(
      collection(db, 'referrals'),
      (snap) => {
        setReferrals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReferralDoc, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'referrals')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderDoc, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubInquiries = onSnapshot(
      query(collection(db, 'brand_inquiries'), orderBy('createdAt', 'desc')),
      (snap) => {
        setInquiries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InquiryDoc, 'id'>) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'brand_inquiries')
    );

    return () => {
      unsubBookings();
      unsubLocks();
      unsubLoyalty();
      unsubSubs();
      unsubRefs();
      unsubOrders();
      unsubInquiries();
    };
  }, [authReady, isAuthorized]);

  const handleLogin = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in cancelled or blocked.');
    }
  };

  const ensureSynced = async () => {
    if (!isFullyCloudSynced) {
      await syncDefaultsToCloud();
    }
  };

  const handleSyncCatalogNow = async () => {
    setSyncingCatalog(true);
    try {
      await syncDefaultsToCloud();
    } finally {
      setSyncingCatalog(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      await ensureSynced();
      const batch = writeBatch(db);
      const today = todayIso();

      const bk1 = generateId('bk_demo');
      batch.set(doc(db, 'bookings', bk1), {
        customerName: 'Kevin Mugisha',
        customerPhone: '+250 788 112 233',
        serviceId: 'svc_fade_beard',
        serviceName: 'Fade + Sculpted Beard & Razor',
        addonNames: 'Add Black Mask & Facial Steam',
        barberId: 'barber_jeanluc',
        barberName: 'Jean-Luc K.',
        date: today,
        slot: '14:15',
        totalRwf: 13000,
        depositRwf: 3000,
        paymentMethod: 'mtn_momo',
        bookingType: 'online',
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'slot_locks', `barber_jeanluc_${today}_1415`), {
        barberId: 'barber_jeanluc',
        date: today,
        slot: '14:15',
        bookingId: bk1,
        status: 'reserved',
        createdAt: serverTimestamp(),
      });

      const bk2 = generateId('bk_demo');
      batch.set(doc(db, 'bookings', bk2), {
        customerName: 'Olivier Habimana',
        customerPhone: '+250 783 445 566',
        serviceId: 'svc_master_wamunigga',
        serviceName: 'Master Chair with Wamunigga Didier',
        barberId: 'barber_wamunigga',
        barberName: 'Wamunigga Didier',
        date: today,
        slot: '18:00',
        totalRwf: 15000,
        depositRwf: 15000,
        paymentMethod: 'mtn_momo',
        bookingType: 'online',
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const bk3 = generateId('bk_demo');
      batch.set(doc(db, 'bookings', bk3), {
        customerName: 'Eric Ndayisenga',
        customerPhone: '+250 789 901 234',
        serviceId: 'svc_skin_fade',
        serviceName: 'Signature Skin Fade & Line-Up',
        barberId: 'barber_patrick',
        barberName: 'Patrick N.',
        date: today,
        slot: '11:15',
        totalRwf: 5000,
        depositRwf: 0,
        paymentMethod: 'cash_chair',
        bookingType: 'walkin',
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 26);
      const staleIso = staleDate.toISOString().slice(0, 10);

      batch.set(doc(db, 'loyalty_cards', '250788112233'), {
        phoneKey: '250788112233',
        displayPhone: '+250 788 112 233',
        firstName: 'Kevin',
        stamps: 4,
        totalCuts: 10,
        tier: 'VIP',
        favoriteBarber: 'Jean-Luc K.',
        referralCode: 'KCZ-KEVIN233',
        lastVisitDate: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'referrals', 'KCZ-KEVIN233'), {
        code: 'KCZ-KEVIN233',
        ownerFirstName: 'Kevin',
        discountRwf: 2000,
        usesCount: 2,
        active: true,
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'loyalty_cards', '250783998877'), {
        phoneKey: '250783998877',
        displayPhone: '+250 783 998 877',
        firstName: 'Yves',
        stamps: 2,
        totalCuts: 8,
        tier: 'Standard',
        favoriteBarber: 'Wamunigga Didier',
        referralCode: 'KCZ-YVES877',
        lastVisitDate: staleIso,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'referrals', 'KCZ-YVES877'), {
        code: 'KCZ-YVES877',
        ownerFirstName: 'Yves',
        discountRwf: 2000,
        usesCount: 0,
        active: true,
        createdAt: serverTimestamp(),
      });

      const ord1 = generateId('ord_demo');
      batch.set(doc(db, 'orders', ord1), {
        customerName: 'Claude Nshimiye',
        customerPhone: '+250 788 554 321',
        itemsSummary: '1x Complete KCZ Grooming Box (Full 3-Piece Kit)',
        itemCount: 1,
        subtotalRwf: 26000,
        deliveryFeeRwf: 2000,
        totalRwf: 28000,
        fulfillment: 'kigali_moto',
        deliveryAddress: 'Kimihurura, KG 624 St',
        paymentMethod: 'mtn_momo',
        status: 'paid',
        createdAt: serverTimestamp(),
      });

      const inq1 = generateId('inq_demo');
      batch.set(doc(db, 'brand_inquiries', inq1), {
        organization: 'Kigali Summer Fest',
        contactName: 'Diane Uwase',
        contactPhoneOrEmail: '+250 788 220 110',
        inquiryType: 'live_show',
        budgetTier: '1,500,000 – 3,500,000 RWF',
        eventDate: today,
        brief: 'Main stage 30-minute live set featuring Umuvandimwe plus VIP grooming lounge activation.',
        status: 'new',
        createdAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seed_demo');
    } finally {
      setSeeding(false);
    }
  };

  const handleLogWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = walkName.trim();
    const key = normalizePhoneKey(walkPhone);
    if (cleanName.length < 2 || key.length < 9) return;

    const service = services.find((s) => s.id === walkServiceId) || services[0];
    const barber = barbers.find((b) => b.id === walkBarberId) || barbers[0];
    const today = todayIso();
    const bookingId = generateId('wk');
    const lockId = `${barber.id}_${today}_${walkSlot.replace(':', '')}`;

    setLoggingWalkin(true);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'bookings', bookingId), {
        customerName: cleanName.slice(0, 80),
        customerPhone: formatDisplayPhone(walkPhone).slice(0, 24),
        serviceId: service.id,
        serviceName: service.name.slice(0, 100),
        barberId: barber.id,
        barberName: barber.name.slice(0, 80),
        date: today,
        slot: walkSlot,
        totalRwf: service.priceRwf,
        depositRwf: service.priceRwf,
        paymentMethod: walkPayment,
        bookingType: 'walkin',
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'slot_locks', lockId), {
        barberId: barber.id,
        date: today,
        slot: walkSlot,
        bookingId,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      const cardRef = doc(db, 'loyalty_cards', key);
      const cardSnap = await getDoc(cardRef);
      if (cardSnap.exists()) {
        const cur = cardSnap.data();
        const nextStamps = Math.min(6, (Number(cur.stamps) || 0) + 1);
        batch.update(cardRef, {
          stamps: nextStamps,
          totalCuts: (Number(cur.totalCuts) || 0) + 1,
          favoriteBarber: barber.name.slice(0, 60),
          lastVisitDate: today,
          updatedAt: serverTimestamp(),
        });
      } else {
        const first = cleanName.split(' ')[0] || 'Client';
        const prefix = first.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'VIP';
        const baseCode = `KCZ-${prefix}${key.slice(-3)}`;
        const existingRef = await getDoc(doc(db, 'referrals', baseCode));
        const code = existingRef.exists()
          ? `KCZ-${prefix}${key.slice(-4)}`.slice(0, 20)
          : baseCode;
        batch.set(cardRef, {
          phoneKey: key,
          displayPhone: formatDisplayPhone(walkPhone),
          firstName: first.slice(0, 60),
          stamps: 1,
          totalCuts: 1,
          tier: 'Standard',
          favoriteBarber: barber.name.slice(0, 60),
          referralCode: code,
          lastVisitDate: today,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (!existingRef.exists()) {
          batch.set(doc(db, 'referrals', code), {
            code,
            ownerFirstName: first.slice(0, 60),
            discountRwf: 2000,
            usesCount: 0,
            active: true,
            createdAt: serverTimestamp(),
          });
        } else {
          const checkFallback = await getDoc(doc(db, 'referrals', code));
          if (!checkFallback.exists()) {
            batch.set(doc(db, 'referrals', code), {
              code,
              ownerFirstName: first.slice(0, 60),
              discountRwf: 2000,
              usesCount: 0,
              active: true,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      await batch.commit();
      setWalkName('');
      setWalkPhone('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
    } finally {
      setLoggingWalkin(false);
    }
  };

  const handleUpdateBookingStatus = async (
    booking: BookingDoc,
    nextStatus: BookingDoc['status']
  ) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'bookings', booking.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      const lockId = `${booking.barberId}_${booking.date}_${booking.slot.replace(':', '')}`;
      const lockSnap = await getDoc(doc(db, 'slot_locks', lockId));
      if (lockSnap.exists()) {
        batch.update(doc(db, 'slot_locks', lockId), {
          status:
            nextStatus === 'cancelled'
              ? 'released'
              : nextStatus === 'completed'
                ? 'completed'
                : 'reserved',
        });
      }

      if (nextStatus === 'completed' && booking.status !== 'completed') {
        const key = normalizePhoneKey(booking.customerPhone);
        if (key.length >= 9) {
          const cardRef = doc(db, 'loyalty_cards', key);
          const cardSnap = await getDoc(cardRef);
          const today = todayIso();
          if (cardSnap.exists()) {
            const cur = cardSnap.data();
            const nextStamps = Math.min(6, (Number(cur.stamps) || 0) + 1);
            batch.update(cardRef, {
              stamps: nextStamps,
              totalCuts: (Number(cur.totalCuts) || 0) + 1,
              favoriteBarber: booking.barberName.slice(0, 60),
              lastVisitDate: today,
              updatedAt: serverTimestamp(),
            });
          } else {
            const first = booking.customerName.split(' ')[0] || 'Client';
            const prefix = first.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'VIP';
            const baseCode = `KCZ-${prefix}${key.slice(-3)}`;
            const existingRef = await getDoc(doc(db, 'referrals', baseCode));
            const code = existingRef.exists()
              ? `KCZ-${prefix}${key.slice(-4)}`.slice(0, 20)
              : baseCode;
            batch.set(cardRef, {
              phoneKey: key,
              displayPhone: booking.customerPhone,
              firstName: first.slice(0, 60),
              stamps: 1,
              totalCuts: 1,
              tier: 'Standard',
              favoriteBarber: booking.barberName.slice(0, 60),
              referralCode: code,
              lastVisitDate: today,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            const finalRefSnap = existingRef.exists()
              ? await getDoc(doc(db, 'referrals', code))
              : existingRef;
            if (!finalRefSnap.exists()) {
              batch.set(doc(db, 'referrals', code), {
                code,
                ownerFirstName: first.slice(0, 60),
                discountRwf: 2000,
                usesCount: 0,
                active: true,
                createdAt: serverTimestamp(),
              });
            }
          }
        }

        if (booking.referralCode) {
          const usedRefDoc = doc(db, 'referrals', booking.referralCode);
          const usedRefSnap = await getDoc(usedRefDoc);
          if (usedRefSnap.exists()) {
            batch.update(usedRefDoc, {
              usesCount: Math.min(100000, (Number(usedRefSnap.data().usesCount) || 0) + 1),
            });
          }
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  const handleSaveBookingEdit = async (booking: BookingDoc) => {
    const newBarber = barbers.find((b) => b.id === editBookingBarberId) || barbers[0];
    const nextTotal = Math.max(0, Math.min(5000000, Number(editBookingTotal) || 0));
    const clampedDeposit = Math.min(booking.depositRwf, nextTotal);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        barberId: newBarber.id,
        barberName: newBarber.name.slice(0, 80),
        totalRwf: nextTotal,
        depositRwf: clampedDeposit,
        notes: editBookingNotes.trim().slice(0, 300),
        updatedAt: serverTimestamp(),
      });
      setEditingBookingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  const handleDeleteBooking = async (booking: BookingDoc) => {
    try {
      await deleteDoc(doc(db, 'bookings', booking.id));
      const lockId = `${booking.barberId}_${booking.date}_${booking.slot.replace(':', '')}`;
      const lockSnap = await getDoc(doc(db, 'slot_locks', lockId));
      if (lockSnap.exists()) {
        await deleteDoc(doc(db, 'slot_locks', lockId));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${booking.id}`);
    }
  };

  const handleBlockChairSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockBarberId || !blockDate || !blockSlot) return;
    const slotKeySafe = blockSlot.replace(':', '');
    const lockId = `${blockBarberId}_${blockDate}_${slotKeySafe}`;
    try {
      await setDoc(doc(db, 'slot_locks', lockId), {
        barberId: blockBarberId,
        date: blockDate,
        slot: blockSlot,
        bookingId: `admin_hold_${slotKeySafe}`,
        status: 'reserved',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `slot_locks/${lockId}`);
    }
  };

  const handleReleaseSlotLock = async (lockId: string) => {
    try {
      await deleteDoc(doc(db, 'slot_locks', lockId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `slot_locks/${lockId}`);
    }
  };

  const handleAdjustLoyalty = async (
    card: LoyaltyDoc,
    updates: Partial<Pick<LoyaltyDoc, 'stamps' | 'totalCuts' | 'tier'>>
  ) => {
    try {
      await updateDoc(doc(db, 'loyalty_cards', card.id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `loyalty_cards/${card.id}`);
    }
  };

  const handleUpdateSubscription = async (
    sub: SubscriptionDoc,
    status: SubscriptionDoc['status'],
    cutsRemaining: number
  ) => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status,
        cutsRemaining: Math.max(0, Math.min(30, cutsRemaining)),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptions/${sub.id}`);
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPromoCode.trim().toUpperCase();
    if (!/^[a-zA-Z0-9_-]{4,24}$/.test(clean)) return;
    const disc = Math.max(500, Math.min(100000, Number(newPromoDiscount) || 2000));
    try {
      await setDoc(doc(db, 'referrals', clean), {
        code: clean,
        ownerFirstName: (newPromoOwner.trim() || 'Shop Promo').slice(0, 60),
        discountRwf: disc,
        usesCount: 0,
        active: true,
        createdAt: serverTimestamp(),
      });
      setNewPromoCode('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `referrals/${clean}`);
    }
  };

  const metrics = useMemo(() => {
    const activeOrDone = bookings.filter((b) => b.status !== 'cancelled');
    const completed = bookings.filter((b) => b.status === 'completed');
    const completedCutRevenue = completed.reduce((sum, b) => sum + (Number(b.totalRwf) || 0), 0);
    const momoTotal = completed
      .filter((b) => b.paymentMethod === 'mtn_momo' || b.paymentMethod === 'airtel_money')
      .reduce((sum, b) => sum + (Number(b.totalRwf) || 0), 0);
    const cashTotal = completed
      .filter((b) => b.paymentMethod === 'cash_chair')
      .reduce((sum, b) => sum + (Number(b.totalRwf) || 0), 0);
    const merchRevenue = orders.reduce((sum, o) => sum + (Number(o.totalRwf) || 0), 0);

    return {
      totalRevenue: completedCutRevenue + merchRevenue,
      cutRevenue: completedCutRevenue,
      merchRevenue,
      momoTotal,
      cashTotal,
      activeCount: activeOrDone.filter((b) => b.status !== 'completed').length,
      completedCount: completed.length,
    };
  }, [bookings, orders]);

  const commissionRows = useMemo(() => {
    return barbers.map((barber) => {
      const cuts = bookings.filter(
        (b) => b.barberId === barber.id && b.status === 'completed'
      );
      const gross = cuts.reduce((s, b) => s + (Number(b.totalRwf) || 0), 0);
      const momo = cuts
        .filter((b) => b.paymentMethod !== 'cash_chair')
        .reduce((s, b) => s + (Number(b.totalRwf) || 0), 0);
      const cash = gross - momo;
      const barberPayout = Math.round(gross * barber.commissionRate);
      const shopRetained = gross - barberPayout;
      return {
        barber,
        cutsCount: cuts.length,
        gross,
        momo,
        cash,
        barberPayout,
        shopRetained,
      };
    });
  }, [bookings, barbers]);

  if (!authReady) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-[#5A5C63]">
        Checking owner session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-8 space-y-6 text-center">
          <Shield className="w-9 h-9 text-[#14532D] mx-auto" />
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-[#18191B]">
              Owner &amp; Full Control Studio
            </h1>
            <p className="text-sm text-[#5A5C63] leading-relaxed">
              Sign in with your authorized Google account to manage walk-ins, commissions,
              services, barbers, merch, music releases, VIP plans, MoMo settings, and blocked dates.
            </p>
          </div>
          {authError && <p className="text-xs text-red-700">{authError}</p>}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-8 space-y-4 text-center">
          <h1 className="font-display text-xl font-bold text-[#18191B]">Owner Access Required</h1>
          <p className="text-sm text-[#5A5C63]">
            Signed in as <span className="font-mono text-[#18191B]">{user.email}</span> (UID:{' '}
            <span className="font-mono text-xs">{user.uid}</span>). This account is not authorized
            for Kigali Clipper Zone shop management.
          </p>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="px-5 py-2.5 bg-[#F1EFE9] border border-[#E5E1D8] text-sm font-semibold text-[#18191B] rounded-lg hover:border-[#14532D] cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const visibleBookings = bookings.filter((b) => {
    if (queueFilter === 'active') return b.status !== 'completed' && b.status !== 'cancelled';
    if (queueFilter === 'completed') return b.status === 'completed';
    return true;
  });

  const filteredCrm = loyaltyCards.filter((c) => {
    const q = crmSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.displayPhone.toLowerCase().includes(q) ||
      c.phoneKey.includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-6">
        <div>
          <p className="text-xs font-semibold text-[#14532D]">{siteConfig.brandName} · Owner Control Studio</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B] mt-1">
            Operations, Catalog &amp; Shop Settings
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isFullyCloudSynced && (
            <button
              type="button"
              disabled={syncingCatalog}
              onClick={handleSyncCatalogNow}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              {syncingCatalog ? 'Syncing Catalog...' : 'Sync Defaults to Cloud'}
            </button>
          )}
          {bookings.length === 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDemoData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F4F8F5] border border-[#14532D]/40 text-xs font-semibold text-[#14532D] rounded-lg hover:bg-[#14532D] hover:text-white transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Populating...' : 'Populate Sample Kigali Data'}
            </button>
          )}
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] border border-[#E5E1D8] text-xs font-medium text-[#5A5C63] hover:text-[#18191B] rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5">
          <p className="text-xs text-[#5A5C63]">Total Shop + Merch Revenue</p>
          <p className="font-mono text-2xl font-bold text-[#14532D] mt-1 tabular-nums">
            {formatRwf(metrics.totalRevenue)}
          </p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5">
          <p className="text-xs text-[#5A5C63]">MoMo &amp; Airtel Digital</p>
          <p className="font-mono text-2xl font-bold text-[#18191B] mt-1 tabular-nums">
            {formatRwf(metrics.momoTotal)}
          </p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5">
          <p className="text-xs text-[#5A5C63]">Cash at Chair</p>
          <p className="font-mono text-2xl font-bold text-[#18191B] mt-1 tabular-nums">
            {formatRwf(metrics.cashTotal)}
          </p>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5">
          <p className="text-xs text-[#5A5C63]">Queue / Completed Cuts</p>
          <p className="font-mono text-2xl font-bold text-[#18191B] mt-1 tabular-nums">
            {metrics.activeCount} / {metrics.completedCount}
          </p>
        </div>
      </div>

      {/* 5-Second Walk-In Logger */}
      <form
        onSubmit={handleLogWalkIn}
        className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5 space-y-4"
      >
        <h2 className="font-display text-base font-semibold text-[#18191B] flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#14532D]" />
          5-Second Walk-In Logger (Syncs Live Slots &amp; Awards Stamp)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <input
            type="text"
            required
            value={walkName}
            onChange={(e) => setWalkName(e.target.value)}
            placeholder="Client Name"
            className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
          />
          <input
            type="tel"
            required
            value={walkPhone}
            onChange={(e) => setWalkPhone(e.target.value)}
            placeholder="Phone (078...)"
            className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
          />
          <select
            value={walkServiceId}
            onChange={(e) => setWalkServiceId(e.target.value)}
            className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({formatRwf(s.priceRwf)})
              </option>
            ))}
          </select>
          <select
            value={walkBarberId}
            onChange={(e) => setWalkBarberId(e.target.value)}
            className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={walkSlot}
            onChange={(e) => setWalkSlot(e.target.value)}
            className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
          >
            {timeSlots.map((t) => (
              <option key={t.time} value={t.time}>
                {t.time}
              </option>
            ))}
          </select>
          <select
            value={walkPayment}
            onChange={(e) => setWalkPayment(e.target.value as typeof walkPayment)}
            className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
          >
            <option value="cash_chair">Cash</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="airtel_money">Airtel Money</option>
          </select>
          <button
            type="submit"
            disabled={loggingWalkin}
            className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap cursor-pointer"
          >
            {loggingWalkin ? 'Saving...' : 'Log Walk-In'}
          </button>
        </div>
      </form>

      {/* Dashboard Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg w-fit">
        {(
          [
            { id: 'queue', label: 'Queue & Slot Locks' },
            { id: 'commissions', label: 'Commissions' },
            { id: 'crm', label: 'CRM, VIP & Promos' },
            { id: 'orders', label: 'Merch & EPK' },
            { id: 'catalog', label: 'Services & Barbers' },
            { id: 'content', label: 'Store, Music & VIP Plans' },
            { id: 'settings', label: 'Shop Settings & Access' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#14532D] text-white'
                : 'text-[#5A5C63] hover:text-[#18191B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Queue, Booking Editor & Chair Slot Blocker */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display font-semibold text-[#18191B]">
                Appointments &amp; Walk-Ins ({visibleBookings.length})
              </h3>
              <div className="flex items-center gap-1 p-1 bg-[#F1EFE9] rounded-lg">
                {(['all', 'active', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setQueueFilter(f)}
                    className={`px-3 py-1 text-xs font-medium rounded capitalize cursor-pointer ${
                      queueFilter === f ? 'bg-[#FFFFFF] text-[#14532D] shadow-xs' : 'text-[#5A5C63]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {dataLoading ? (
              <div className="p-6 text-sm text-[#5A5C63]">Loading shop schedule...</div>
            ) : visibleBookings.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#5A5C63]">
                No bookings recorded yet. Log a walk-in above or click &ldquo;Populate Sample Kigali Data&rdquo;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-[#E5E1D8] bg-[#F9F8F5] text-[#5A5C63] text-xs">
                    <tr>
                      <th className="py-3 px-4">Time &amp; Type</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Service &amp; Barber</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]">
                    {visibleBookings.map((b) => {
                      const isEditing = editingBookingId === b.id;
                      return (
                        <tr key={b.id} className="hover:bg-[#F9F8F5]">
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <span className="text-[#18191B] block">{b.date} · {b.slot}</span>
                            <span className="text-[11px] text-[#5A5C63] uppercase">{b.bookingType}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-[#18191B] block">{b.customerName}</span>
                            <span className="font-mono text-xs text-[#5A5C63]">{b.customerPhone}</span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editBookingNotes}
                                onChange={(e) => setEditBookingNotes(e.target.value)}
                                placeholder="Style notes..."
                                className="mt-1 w-full bg-[#FFFFFF] border border-[#E5E1D8] rounded px-2 py-1 text-xs"
                              />
                            ) : (
                              b.notes && <span className="text-[11px] text-[#5A5C63] block">{b.notes}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[#18191B] block">{b.serviceName}</span>
                            {isEditing ? (
                              <select
                                value={editBookingBarberId}
                                onChange={(e) => setEditBookingBarberId(e.target.value)}
                                className="mt-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded px-2 py-1 text-xs"
                              >
                                {barbers.map((bar) => (
                                  <option key={bar.id} value={bar.id}>
                                    {bar.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-medium text-[#14532D]">{b.barberName}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={editBookingTotal}
                                onChange={(e) => setEditBookingTotal(Number(e.target.value))}
                                className="w-24 bg-[#FFFFFF] border border-[#E5E1D8] rounded px-2 py-1 text-xs text-right"
                              />
                            ) : (
                              <>
                                <span className="text-[#18191B] font-semibold block">{formatRwf(b.totalRwf)}</span>
                                <span className="text-[11px] text-[#5A5C63]">
                                  {b.paymentMethod.replace('_', ' ')}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold ${
                                b.status === 'completed'
                                  ? 'text-[#14532D]'
                                  : b.status === 'cancelled'
                                    ? 'text-red-600'
                                    : 'text-[#B48222]'
                              }`}
                            >
                              {b.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveBookingEdit(b)}
                                  className="px-2.5 py-1 bg-[#14532D] text-white text-xs font-semibold rounded cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingBookingId(null)}
                                  className="px-2 py-1 bg-[#F1EFE9] text-xs rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                {b.status !== 'completed' && b.status !== 'cancelled' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBookingStatus(b, 'completed')}
                                      className="px-2.5 py-1 bg-[#F4F8F5] border border-[#14532D]/40 text-[#14532D] text-xs font-semibold rounded hover:bg-[#14532D] hover:text-white transition-colors cursor-pointer"
                                    >
                                      Complete + Stamp
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBookingStatus(b, 'cancelled')}
                                      className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded hover:bg-red-100 cursor-pointer"
                                    >
                                      Release
                                    </button>
                                  </>
                                )}
                                {b.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532D] mr-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Paid
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBookingId(b.id);
                                    setEditBookingBarberId(b.barberId);
                                    setEditBookingTotal(b.totalRwf);
                                    setEditBookingNotes(b.notes || '');
                                  }}
                                  className="p-1.5 text-[#5A5C63] hover:text-[#18191B] rounded cursor-pointer"
                                  title="Edit barber, price or notes"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBooking(b)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                  title="Delete booking"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Chair Slot Blocker / Unblocker */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-[#18191B] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#B48222]" />
                  Block Individual Chair Slot (Breaks, Shoots &amp; VIP Holds)
                </h3>
                <p className="text-xs text-[#5A5C63]">
                  Lock or release any barber time slot directly without creating a customer booking.
                </p>
              </div>
            </div>

            <form onSubmit={handleBlockChairSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={blockBarberId}
                onChange={(e) => setBlockBarberId(e.target.value)}
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <select
                value={blockSlot}
                onChange={(e) => setBlockSlot(e.target.value)}
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              >
                {timeSlots.map((t) => (
                  <option key={t.time} value={t.time}>
                    {t.time}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
              >
                Block Chair Slot
              </button>
            </form>

            {slotLocks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E1D8]">
                {slotLocks.map((lock) => {
                  const barberName = barbers.find((b) => b.id === lock.barberId)?.name || lock.barberId;
                  return (
                    <div
                      key={lock.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg text-xs"
                    >
                      <span className="font-semibold text-[#18191B]">{barberName}</span>
                      <span className="font-mono text-[#5A5C63]">
                        {lock.date} · {lock.slot}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleReleaseSlotLock(lock.id)}
                        className="inline-flex items-center gap-1 text-[#14532D] font-semibold hover:underline cursor-pointer"
                      >
                        <Unlock className="w-3 h-3" />
                        Release
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Barber Commissions */}
      {activeTab === 'commissions' && (
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#E5E1D8]">
            <h3 className="font-display font-semibold text-[#18191B]">
              Automated Barber Commission &amp; Split Ledger (Completed Cuts)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[#E5E1D8] bg-[#F9F8F5] text-[#5A5C63] text-xs">
                <tr>
                  <th className="py-3 px-4">Barber</th>
                  <th className="py-3 px-4 text-right">Cuts</th>
                  <th className="py-3 px-4 text-right">Gross Revenue</th>
                  <th className="py-3 px-4 text-right">MoMo / Airtel</th>
                  <th className="py-3 px-4 text-right">Cash</th>
                  <th className="py-3 px-4 text-right">Split %</th>
                  <th className="py-3 px-4 text-right">Barber Payout</th>
                  <th className="py-3 px-4 text-right">Shop Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8] font-mono tabular-nums">
                {commissionRows.map((row) => (
                  <tr key={row.barber.id} className="hover:bg-[#F9F8F5]">
                    <td className="py-3.5 px-4 font-sans">
                      <span className="font-semibold text-[#18191B] block">{row.barber.name}</span>
                      <span className="text-xs text-[#5A5C63]">{row.barber.role}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#18191B]">{row.cutsCount}</td>
                    <td className="py-3.5 px-4 text-right text-[#18191B]">{formatRwf(row.gross)}</td>
                    <td className="py-3.5 px-4 text-right text-[#5A5C63]">{formatRwf(row.momo)}</td>
                    <td className="py-3.5 px-4 text-right text-[#5A5C63]">{formatRwf(row.cash)}</td>
                    <td className="py-3.5 px-4 text-right text-[#B48222] font-semibold">
                      {Math.round(row.barber.commissionRate * 100)}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#14532D] font-bold">
                      {formatRwf(row.barberPayout)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#18191B]">
                      {formatRwf(row.shopRetained)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: CRM, VIP Subscriptions & Promo Codes */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-[#18191B] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#14532D]" />
              WhatsApp Win-Back &amp; Weekday Promo Message Template
            </h3>
            <textarea
              rows={2}
              value={promoDraft}
              onChange={(e) => setPromoDraft(e.target.value)}
              className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#18191B]"
            />
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-display font-semibold text-[#18191B] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#14532D]" />
                Client Loyalty Database ({filteredCrm.length})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#5A5C63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  placeholder="Search name or phone..."
                  className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#18191B]"
                />
              </div>
            </div>

            {filteredCrm.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#5A5C63]">No client records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-[#E5E1D8] bg-[#F9F8F5] text-[#5A5C63] text-xs">
                    <tr>
                      <th className="py-3 px-4">Client &amp; Tier</th>
                      <th className="py-3 px-4">Stamps Control</th>
                      <th className="py-3 px-4 text-right">Cuts</th>
                      <th className="py-3 px-4">Last Visit</th>
                      <th className="py-3 px-4 text-right">WhatsApp &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8]">
                    {filteredCrm.map((c) => {
                      const days = daysSinceDate(c.lastVisitDate);
                      const isOverdue = days >= 21;
                      const personalizedMsg = `Hey ${c.firstName}! ${promoDraft}`;
                      return (
                        <tr key={c.id} className="hover:bg-[#F9F8F5]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#18191B]">{c.firstName}</span>
                              <select
                                value={c.tier}
                                onChange={(e) =>
                                  handleAdjustLoyalty(c, {
                                    tier: e.target.value as LoyaltyDoc['tier'],
                                  })
                                }
                                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#14532D]"
                              >
                                <option value="Standard">Standard</option>
                                <option value="VIP">VIP</option>
                                <option value="Founder">Founder</option>
                              </select>
                            </div>
                            <span className="font-mono text-xs text-[#5A5C63]">{c.displayPhone}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[#14532D] tabular-nums">
                                {c.stamps}/6
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustLoyalty(c, {
                                    stamps: Math.min(6, c.stamps + 1),
                                    totalCuts: c.totalCuts + 1,
                                  })
                                }
                                className="px-2 py-0.5 bg-[#F4F8F5] border border-[#14532D]/40 text-[#14532D] text-[11px] font-semibold rounded cursor-pointer"
                              >
                                +1 Stamp
                              </button>
                              {c.stamps >= 5 && (
                                <button
                                  type="button"
                                  onClick={() => handleAdjustLoyalty(c, { stamps: 0 })}
                                  className="px-2 py-0.5 bg-[#B48222] text-white text-[11px] font-semibold rounded cursor-pointer"
                                >
                                  Redeem Free Cut
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#18191B]">
                            {c.totalCuts}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <span className={isOverdue ? 'text-[#B48222] font-semibold' : 'text-[#5A5C63]'}>
                              {c.lastVisitDate} ({days}d ago){isOverdue ? ' · Win-Back Due' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                            <a
                              href={buildWhatsAppUrl(c.phoneKey, personalizedMsg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                isOverdue
                                  ? 'bg-[#14532D] text-white'
                                  : 'bg-[#F9F8F5] border border-[#E5E1D8] text-[#18191B] hover:border-[#14532D]'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {isOverdue ? 'Send 21d Win-Back' : 'Send Promo'}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                deleteDoc(doc(db, 'loyalty_cards', c.id)).catch((err) =>
                                  handleFirestoreError(err, OperationType.DELETE, `loyalty_cards/${c.id}`)
                                )
                              }
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Delete card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VIP Subscriptions Manager */}
            <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#E5E1D8]">
                <h3 className="font-display font-semibold text-[#18191B] flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#B48222]" />
                  VIP Monthly Subscriptions ({subscriptions.length})
                </h3>
              </div>
              <div className="divide-y divide-[#E5E1D8]">
                {subscriptions.length === 0 ? (
                  <p className="p-6 text-xs text-[#5A5C63]">No monthly VIP passes subscribed yet.</p>
                ) : (
                  subscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-[#18191B]">
                          {sub.customerName} · <span className="font-mono text-[#14532D]">{sub.cutsRemaining} cuts left</span>
                        </p>
                        <p className="text-[#5A5C63]">
                          {sub.planName} ({formatRwf(sub.priceRwf)}) · {sub.customerPhone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sub.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSubscription(sub, 'active', sub.cutsRemaining)}
                            className="px-2.5 py-1 bg-[#14532D] text-white rounded font-semibold cursor-pointer"
                          >
                            Activate
                          </button>
                        )}
                        {sub.status === 'active' && sub.cutsRemaining > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSubscription(
                                sub,
                                sub.cutsRemaining - 1 <= 0 ? 'expired' : 'active',
                                sub.cutsRemaining - 1
                              )
                            }
                            className="px-2.5 py-1 bg-[#F4F8F5] border border-[#14532D]/40 text-[#14532D] rounded font-semibold cursor-pointer"
                          >
                            Use 1 Cut
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            deleteDoc(doc(db, 'subscriptions', sub.id)).catch((err) =>
                              handleFirestoreError(err, OperationType.DELETE, `subscriptions/${sub.id}`)
                            )
                          }
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Promo & Referral Codes Manager */}
            <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#E5E1D8]">
                <h3 className="font-display font-semibold text-[#18191B] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#14532D]" />
                  Promo &amp; Referral Codes ({referrals.length})
                </h3>
              </div>
              <form onSubmit={handleCreatePromoCode} className="p-4 bg-[#F9F8F5] border-b border-[#E5E1D8] grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  placeholder="Code (e.g. KIGALI2K)"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-2.5 py-1.5 text-xs font-mono text-[#18191B]"
                />
                <input
                  type="text"
                  required
                  value={newPromoOwner}
                  onChange={(e) => setNewPromoOwner(e.target.value)}
                  placeholder="Label"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-2.5 py-1.5 text-xs text-[#18191B]"
                />
                <input
                  type="number"
                  min={500}
                  step={500}
                  required
                  value={newPromoDiscount}
                  onChange={(e) => setNewPromoDiscount(Number(e.target.value))}
                  placeholder="Discount RWF"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-2.5 py-1.5 text-xs font-mono text-[#18191B]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded cursor-pointer"
                >
                  Create Promo
                </button>
              </form>
              <div className="divide-y divide-[#E5E1D8]">
                {referrals.map((ref) => (
                  <div key={ref.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-[#14532D]">{ref.code}</span>{' '}
                      <span className="text-[#5A5C63]">
                        · {formatRwf(ref.discountRwf)} off · {ref.ownerFirstName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateDoc(doc(db, 'referrals', ref.id), { active: !ref.active }).catch((err) =>
                            handleFirestoreError(err, OperationType.UPDATE, `referrals/${ref.id}`)
                          )
                        }
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          ref.active
                            ? 'bg-[#F4F8F5] text-[#14532D] border border-[#14532D]/40'
                            : 'bg-[#F1EFE9] text-[#5A5C63]'
                        }`}
                      >
                        {ref.active ? 'Active' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteDoc(doc(db, 'referrals', ref.id)).catch((err) =>
                            handleFirestoreError(err, OperationType.DELETE, `referrals/${ref.id}`)
                          )
                        }
                        className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Merch & EPK Inquiries */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#E5E1D8]">
              <h3 className="font-display font-semibold text-[#18191B]">
                Merch &amp; Grooming Orders ({orders.length})
              </h3>
            </div>
            <div className="divide-y divide-[#E5E1D8]">
              {orders.length === 0 ? (
                <p className="p-6 text-sm text-[#5A5C63]">No merch orders yet.</p>
              ) : (
                orders.map((ord) => (
                  <div key={ord.id} className="p-4 flex items-start justify-between gap-4 text-xs sm:text-sm">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#18191B]">
                        {ord.customerName} ·{' '}
                        <span className="font-mono text-[#14532D]">{formatRwf(ord.totalRwf)}</span>
                      </p>
                      <p className="text-xs text-[#5A5C63]">{ord.itemsSummary}</p>
                      <p className="text-xs text-[#5A5C63]">
                        {ord.fulfillment === 'kigali_moto' ? `Moto: ${ord.deliveryAddress}` : 'Shop Pickup'} ·{' '}
                        <span className="font-mono">{ord.customerPhone}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          updateDoc(doc(db, 'orders', ord.id), { status: e.target.value }).catch((err) =>
                            handleFirestoreError(err, OperationType.UPDATE, `orders/${ord.id}`)
                          )
                        }
                        className="bg-[#F9F8F5] border border-[#E5E1D8] rounded px-2.5 py-1 text-xs text-[#18191B]"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          deleteDoc(doc(db, 'orders', ord.id)).catch((err) =>
                            handleFirestoreError(err, OperationType.DELETE, `orders/${ord.id}`)
                          )
                        }
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#E5E1D8]">
              <h3 className="font-display font-semibold text-[#18191B]">
                EPK Show &amp; Brand Inquiries ({inquiries.length})
              </h3>
            </div>
            <div className="divide-y divide-[#E5E1D8]">
              {inquiries.length === 0 ? (
                <p className="p-6 text-sm text-[#5A5C63]">No brand or show inquiries yet.</p>
              ) : (
                inquiries.map((inq) => (
                  <div key={inq.id} className="p-4 space-y-2 text-xs sm:text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#18191B]">{inq.organization}</p>
                        <p className="text-xs font-medium text-[#14532D]">
                          {inq.inquiryType.replace('_', ' ')} · {inq.budgetTier}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={inq.status}
                          onChange={(e) =>
                            updateDoc(doc(db, 'brand_inquiries', inq.id), {
                              status: e.target.value,
                            }).catch((err) =>
                              handleFirestoreError(err, OperationType.UPDATE, `brand_inquiries/${inq.id}`)
                            )
                          }
                          className="bg-[#F9F8F5] border border-[#E5E1D8] rounded px-2.5 py-1 text-xs text-[#18191B]"
                        >
                          <option value="new">New</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="booked">Booked</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            deleteDoc(doc(db, 'brand_inquiries', inq.id)).catch((err) =>
                              handleFirestoreError(err, OperationType.DELETE, `brand_inquiries/${inq.id}`)
                            )
                          }
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#5A5C63] leading-relaxed">{inq.brief}</p>
                    <p className="text-xs text-[#5A5C63]">
                      Contact: <span className="text-[#18191B] font-medium">{inq.contactName}</span> ({inq.contactPhoneOrEmail})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Services, Barbers & Add-Ons CRUD */}
      {activeTab === 'catalog' && <CatalogManagerTab ensureSynced={ensureSynced} />}

      {/* Tab 6: Store Products, Music Releases, VIP Plans & Reviews CRUD */}
      {activeTab === 'content' && <ContentManagerTab ensureSynced={ensureSynced} />}

      {/* Tab 7: Shop Settings, MoMo, Slots, Blocked Dates & Manager Access */}
      {activeTab === 'settings' && (
        <SettingsAccessTab currentUserEmail={user.email} ensureSynced={ensureSynced} />
      )}
    </div>
  );
}
