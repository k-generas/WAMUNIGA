import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SHOP_INFO, ServiceItem } from '../data/catalog';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  buildWhatsAppUrl,
  formatDisplayPhone,
  formatRwf,
  generateId,
  nextDates,
  normalizePhoneKey,
} from '../utils/format';
import { ResilientImage } from '../components/ResilientImage';
import { AppRoute } from '../components/Navbar';

interface BookingPageProps {
  preselectedServiceId?: string;
  initialReferralCode?: string;
  onNavigate: (route: AppRoute) => void;
}

interface BookingReceipt {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  addonNames: string;
  barberName: string;
  date: string;
  slot: string;
  totalRwf: number;
  depositRwf: number;
  paymentMethod: 'mtn_momo' | 'airtel_money' | 'cash_chair';
}

export function BookingPage({
  preselectedServiceId,
  initialReferralCode,
  onNavigate,
}: BookingPageProps) {
  const { services, addons, barbers, siteConfig } = useStore();
  const activeServices = useMemo(() => services.filter((s) => s.active !== false), [services]);
  const activeAddons = useMemo(() => addons.filter((a) => a.active !== false), [addons]);
  const activeBarbers = useMemo(() => barbers.filter((b) => b.active !== false), [barbers]);
  const timeSlots = siteConfig.timeSlots;
  const blockedDates = siteConfig.blockedDates || [];

  const dates = useMemo(() => nextDates(7), []);
  const firstOpenDate = useMemo(
    () => dates.find((d) => !blockedDates.includes(d.iso))?.iso || dates[0].iso,
    [dates, blockedDates]
  );

  const [step, setStep] = useState<1 | 2 | 3>(preselectedServiceId ? 2 : 1);
  const [categoryFilter, setCategoryFilter] = useState<'All' | ServiceItem['category']>('All');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    preselectedServiceId || activeServices[0]?.id || ''
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>(activeBarbers[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(firstOpenDate);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [lockedSlots, setLockedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(true);

  const [paymentOption, setPaymentOption] = useState<
    'deposit_momo' | 'full_momo' | 'full_airtel' | 'cash_chair'
  >('deposit_momo');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referralInput, setReferralInput] = useState(initialReferralCode || '');
  const [appliedReferral, setAppliedReferral] = useState<{ code: string; discountRwf: number } | null>(null);
  const [referralStatus, setReferralStatus] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
      setStep(2);
    }
  }, [preselectedServiceId]);

  useEffect(() => {
    if (activeServices.length > 0 && !activeServices.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(activeServices[0].id);
    }
  }, [activeServices, selectedServiceId]);

  useEffect(() => {
    if (activeBarbers.length > 0 && !activeBarbers.some((b) => b.id === selectedBarberId)) {
      setSelectedBarberId(activeBarbers[0].id);
    }
  }, [activeBarbers, selectedBarberId]);

  useEffect(() => {
    if (blockedDates.includes(selectedDate)) {
      setSelectedDate(firstOpenDate);
      setSelectedSlot('');
    }
  }, [blockedDates, selectedDate, firstOpenDate]);

  useEffect(() => {
    if (!selectedBarberId) return;
    setSlotsLoading(true);
    const q = query(
      collection(db, 'slot_locks'),
      where('date', '==', selectedDate),
      where('status', '==', 'reserved')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const taken: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.barberId === selectedBarberId) {
            taken.push(data.slot);
          }
        });
        setLockedSlots(taken);
        setSlotsLoading(false);
        if (taken.includes(selectedSlot)) {
          setSelectedSlot('');
        }
      },
      (error) => {
        setSlotsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'slot_locks');
      }
    );

    return () => unsubscribe();
  }, [selectedDate, selectedBarberId, selectedSlot]);

  const selectedService =
    activeServices.find((s) => s.id === selectedServiceId) || activeServices[0] || services[0];
  const selectedBarber =
    activeBarbers.find((b) => b.id === selectedBarberId) || activeBarbers[0] || barbers[0];
  const selectedSlotObj = timeSlots.find((t) => t.time === selectedSlot);

  const masterSurcharge =
    selectedBarber &&
    selectedBarber.surchargeRwf > 0 &&
    selectedService.category !== 'VIP'
      ? selectedBarber.surchargeRwf
      : 0;

  const addonsTotal = selectedAddonIds.reduce((sum, id) => {
    const found = activeAddons.find((a) => a.id === id);
    return sum + (found ? found.priceRwf : 0);
  }, 0);

  const peakFee = selectedSlotObj?.isPeak ? selectedSlotObj.peakFeeRwf : 0;
  const discountRwf = appliedReferral ? appliedReferral.discountRwf : 0;
  const totalRwf = Math.max(
    1000,
    selectedService.priceRwf + masterSurcharge + addonsTotal + peakFee - discountRwf
  );

  const requiresAdvanceCommitment =
    Boolean(selectedService.requiresDeposit) || Boolean(selectedSlotObj?.isPeak);

  useEffect(() => {
    if (requiresAdvanceCommitment && paymentOption === 'cash_chair') {
      setPaymentOption('deposit_momo');
    }
  }, [requiresAdvanceCommitment, paymentOption]);

  const depositTargetRwf =
    selectedService.category === 'VIP' || selectedService.id === 'svc_vip_home'
      ? siteConfig.vipDepositRwf
      : siteConfig.standardDepositRwf;

  const depositRwf =
    paymentOption === 'deposit_momo'
      ? Math.min(totalRwf, depositTargetRwf)
      : paymentOption === 'cash_chair'
        ? 0
        : totalRwf;

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyReferral = async () => {
    const cleanCode = referralInput.trim().toUpperCase();
    if (!cleanCode) return;
    if (!/^[a-zA-Z0-9_-]{4,24}$/.test(cleanCode)) {
      setReferralStatus('Enter a valid referral code (e.g. KCZ-KEVIN233).');
      return;
    }
    setReferralStatus('Checking code...');
    try {
      const refSnap = await getDoc(doc(db, 'referrals', cleanCode));
      if (refSnap.exists() && refSnap.data().active) {
        const disc = Number(refSnap.data().discountRwf) || 2000;
        setAppliedReferral({ code: cleanCode, discountRwf: disc });
        setReferralStatus(`Applied ${formatRwf(disc)} referral discount.`);
      } else {
        setAppliedReferral(null);
        setReferralStatus('Code not found. Generate yours in Loyalty Club.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `referrals/${cleanCode}`);
    }
  };

  const handleSubmitBooking = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError('');

    const cleanName = customerName.trim();
    const phoneKey = normalizePhoneKey(customerPhone);
    if (cleanName.length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (phoneKey.length < 9) {
      setFormError('Please enter a valid Rwandan phone number (e.g. 0787 792 446).');
      return;
    }
    if (!selectedSlot) {
      setStep(2);
      setFormError('Please choose an available time slot first.');
      return;
    }
    if (lockedSlots.includes(selectedSlot)) {
      setStep(2);
      setFormError('That slot was just reserved. Please pick another open time.');
      return;
    }

    setSubmitting(true);
    const bookingId = generateId('bk');
    const slotKeySafe = selectedSlot.replace(':', '');
    const lockId = `${selectedBarber.id}_${selectedDate}_${slotKeySafe}`;
    const addonNames = selectedAddonIds
      .map((id) => activeAddons.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const dbPaymentMethod: 'mtn_momo' | 'airtel_money' | 'cash_chair' =
      paymentOption === 'full_airtel'
        ? 'airtel_money'
        : paymentOption === 'cash_chair'
          ? 'cash_chair'
          : 'mtn_momo';

    try {
      const existingLock = await getDoc(doc(db, 'slot_locks', lockId));
      if (existingLock.exists() && existingLock.data().status === 'reserved') {
        setStep(2);
        setFormError('This time slot is already locked. Please choose another available slot.');
        setSubmitting(false);
        return;
      }

      const batch = writeBatch(db);
      const bookingData: Record<string, unknown> = {
        customerName: cleanName.slice(0, 80),
        customerPhone: formatDisplayPhone(customerPhone).slice(0, 24),
        serviceId: selectedService.id,
        serviceName: selectedService.name.slice(0, 100),
        barberId: selectedBarber.id,
        barberName: selectedBarber.name.slice(0, 80),
        date: selectedDate,
        slot: selectedSlot,
        totalRwf,
        depositRwf,
        paymentMethod: dbPaymentMethod,
        bookingType: 'online',
        status: depositRwf > 0 ? 'confirmed' : 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (addonNames) bookingData.addonNames = addonNames.slice(0, 240);
      if (appliedReferral) bookingData.referralCode = appliedReferral.code;
      if (notes.trim()) bookingData.notes = notes.trim().slice(0, 300);
      if (auth.currentUser?.uid) bookingData.userId = auth.currentUser.uid;

      batch.set(doc(db, 'bookings', bookingId), bookingData);
      batch.set(doc(db, 'slot_locks', lockId), {
        barberId: selectedBarber.id,
        date: selectedDate,
        slot: selectedSlot,
        bookingId,
        status: 'reserved',
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      setReceipt({
        bookingId,
        customerName: cleanName,
        customerPhone: formatDisplayPhone(customerPhone),
        serviceName: selectedService.name,
        addonNames,
        barberName: selectedBarber.name,
        date: selectedDate,
        slot: selectedSlot,
        totalRwf,
        depositRwf,
        paymentMethod: dbPaymentMethod,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const primaryRaw = normalizePhoneKey(siteConfig.primaryPhone) || SHOP_INFO.phones[0].raw;

  if (receipt) {
    const waText = [
      `Hello ${siteConfig.brandName}! Booking Confirmed (${receipt.bookingId})`,
      `Name: ${receipt.customerName}`,
      `Service: ${receipt.serviceName}${receipt.addonNames ? ` + ${receipt.addonNames}` : ''}`,
      `Barber: ${receipt.barberName}`,
      `When: ${receipt.date} at ${receipt.slot}`,
      `Total: ${formatRwf(receipt.totalRwf)} | Deposit Due/Paid: ${formatRwf(receipt.depositRwf)}`,
      `Location: ${siteConfig.address}`,
    ].join('\n');

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-[#14532D] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-semibold text-[#B48222] mb-1">
                REF: {receipt.bookingId}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B]">
                Chair Locked &amp; Confirmed
              </h1>
              <p className="text-sm text-[#5A5C63] mt-1">
                Your slot is reserved in real time so nobody else can double-book your barber.
              </p>
            </div>
          </div>

          <div className="border-t border-b border-[#E5E1D8] py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#5A5C63]">Client</p>
              <p className="font-semibold text-[#18191B] mt-0.5">{receipt.customerName}</p>
              <p className="font-mono text-xs text-[#5A5C63] mt-0.5">{receipt.customerPhone}</p>
            </div>
            <div>
              <p className="text-xs text-[#5A5C63]">Barber &amp; Time</p>
              <p className="font-semibold text-[#18191B] mt-0.5">{receipt.barberName}</p>
              <p className="font-mono text-xs font-semibold text-[#14532D] mt-0.5">
                {receipt.date} · {receipt.slot}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5A5C63]">Service &amp; Add-Ons</p>
              <p className="font-semibold text-[#18191B] mt-0.5">{receipt.serviceName}</p>
              {receipt.addonNames && <p className="text-xs text-[#5A5C63] mt-0.5">{receipt.addonNames}</p>}
            </div>
            <div>
              <p className="text-xs text-[#5A5C63]">Total &amp; MoMo Commitment</p>
              <p className="font-mono font-semibold text-[#18191B] mt-0.5 tabular-nums">
                {formatRwf(receipt.totalRwf)}
              </p>
              <p className="font-mono text-xs text-[#14532D] font-semibold mt-0.5 tabular-nums">
                Commitment: {formatRwf(receipt.depositRwf)} ({receipt.paymentMethod.replace('_', ' ').toUpperCase()})
              </p>
            </div>
          </div>

          {receipt.depositRwf > 0 && (
            <div className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-[#14532D]">Complete MoMo / Airtel Payment</p>
              <p className="text-sm text-[#18191B]">
                Dial <span className="font-mono font-semibold">{siteConfig.momoPayCode}</span> or send{' '}
                <span className="font-mono font-semibold tabular-nums">{formatRwf(receipt.depositRwf)}</span> to{' '}
                <span className="font-mono">{siteConfig.momoNumber}</span> with ref{' '}
                <span className="font-mono font-semibold text-[#14532D]">{receipt.bookingId}</span>.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href={buildWhatsAppUrl(primaryRaw, waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Send Receipt &amp; 2h Reminder on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => onNavigate('club')}
              className="px-5 py-3 bg-[#F1EFE9] border border-[#E5E1D8] text-[#18191B] text-sm font-semibold rounded-lg hover:border-[#14532D] transition-colors cursor-pointer"
            >
              Check Loyalty Stamp Card
            </button>
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                setSelectedSlot('');
                setStep(1);
              }}
              className="px-4 py-3 text-sm text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
            >
              Book Another Slot
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredServices =
    categoryFilter === 'All'
      ? activeServices
      : activeServices.filter((s) => s.category === categoryFilter);

  const selectedDateLabel = dates.find((d) => d.iso === selectedDate);
  const isSelectedDateBlocked = blockedDates.includes(selectedDate);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-12 space-y-6">
      {/* Compact Header + Interactive 3-Step Bar (Always Visible — Zero Hidden Features) */}
      <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B] tracking-tight">
              Book Your Chair
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5C63]">
              {siteConfig.address} · Pick service, barber &amp; slot in 3 quick steps
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F1EFE9] border border-[#E5E1D8] rounded-lg w-fit">
            {[
              { num: 1 as const, label: '1. Service' },
              { num: 2 as const, label: '2. Barber & Time' },
              { num: 3 as const, label: '3. Confirm' },
            ].map((item) => {
              const active = step === item.num;
              const completed = step > item.num;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => setStep(item.num)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#14532D] text-white'
                      : completed
                        ? 'bg-[#FFFFFF] text-[#14532D]'
                        : 'text-[#5A5C63] hover:text-[#18191B]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Two-Column Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Interactive Step Panel */}
        <div className="lg:col-span-8">
          {/* STEP 1: Services with Real Photos */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#18191B]">
                  Step 1 · Choose Your Service
                </h2>
                <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg">
                  {(['All', 'Signature', 'Grooming', 'VIP'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-[#14532D] text-white'
                          : 'text-[#5A5C63] hover:text-[#18191B]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredServices.map((svc) => {
                  const active = svc.id === selectedServiceId;
                  return (
                    <div
                      key={svc.id}
                      onClick={() => setSelectedServiceId(svc.id)}
                      className={`group rounded-xl border overflow-hidden flex flex-col justify-between transition-colors cursor-pointer bg-[#FFFFFF] ${
                        active
                          ? 'border-[#14532D] ring-2 ring-[#14532D]/15'
                          : 'border-[#E5E1D8] hover:border-[#14532D]/50'
                      }`}
                    >
                      <div>
                        <div className="aspect-[16/10] bg-[#F1EFE9] overflow-hidden relative">
                          <ResilientImage
                            src={svc.image}
                            alt={svc.name}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        </div>
                        <div className="p-4 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#5A5C63]">
                              {svc.category} · {svc.durationMin} min
                            </span>
                            <span className="font-mono font-bold text-[#14532D] tabular-nums">
                              {formatRwf(svc.priceRwf)}
                            </span>
                          </div>
                          <h3 className="font-display text-sm sm:text-base font-bold text-[#18191B]">
                            {svc.name}
                          </h3>
                          <p className="text-xs text-[#5A5C63] line-clamp-2 leading-relaxed">
                            {svc.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedServiceId(svc.id);
                            setStep(2);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#14532D] text-white hover:bg-[#166534]'
                              : 'bg-[#F1EFE9] text-[#18191B] hover:bg-[#14532D] hover:text-white'
                          }`}
                        >
                          {active ? 'Selected · Pick Barber & Time →' : 'Select & Continue →'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Barber Portraits + Date & Live Slots Together (No Scrolling!) */}
          {step === 2 && (
            <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#18191B]">
                    Step 2 · Pick Your Barber, Date &amp; Time
                  </h2>
                  <p className="text-xs text-[#5A5C63] mt-0.5">
                    Selecting a barber immediately shows their live open chair times below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A5C63] hover:text-[#18191B] cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Service
                </button>
              </div>

              {/* Real Barber Portraits */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#18191B]">Choose Barber</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeBarbers.map((barber) => {
                    const active = barber.id === selectedBarberId;
                    return (
                      <button
                        key={barber.id}
                        type="button"
                        onClick={() => setSelectedBarberId(barber.id)}
                        className={`flex items-center gap-3.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#F4F8F5] border-[#14532D] ring-1 ring-[#14532D]/20'
                            : 'bg-[#F9F8F5] border-[#E5E1D8] hover:border-[#14532D]/50'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F1EFE9] shrink-0 border border-[#E5E1D8]">
                          <ResilientImage
                            src={barber.avatar}
                            alt={barber.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-bold text-[#18191B] truncate">
                              {barber.name}
                            </span>
                            {barber.surchargeRwf > 0 ? (
                              <span className="font-mono text-[11px] font-semibold text-[#B48222] shrink-0">
                                +{formatRwf(barber.surchargeRwf)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#14532D] font-medium shrink-0">
                                Standard
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5A5C63] truncate">{barber.role}</p>
                          <p className="text-[11px] text-[#5A5C63] truncate mt-0.5">{barber.specialty}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Selector Strip */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#18191B] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#14532D]" />
                  Choose Date
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {dates.map((d) => {
                    const isBlocked = blockedDates.includes(d.iso);
                    const active = d.iso === selectedDate;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => {
                          setSelectedDate(d.iso);
                          setSelectedSlot('');
                        }}
                        className={`py-2 px-2 rounded-lg border text-center transition-colors min-h-[48px] ${
                          isBlocked
                            ? 'bg-[#F1EFE9] border-[#E5E1D8] text-[#9CA3AF] line-through cursor-not-allowed'
                            : active
                              ? 'bg-[#14532D] border-[#14532D] text-white cursor-pointer'
                              : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#18191B] hover:border-[#14532D]/60 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs font-semibold block">{d.dayShort}</span>
                        <span className={`text-[11px] font-mono block ${active ? 'text-white/85' : 'text-[#5A5C63]'}`}>
                          {isBlocked ? 'Closed' : d.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Time Slot Grid */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#18191B] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#14532D]" />
                    Available Times for {selectedBarber.name}
                  </p>
                  <span className="text-[11px] text-[#B48222] font-medium">
                    Evening Priority Slots May Carry Peak Fee
                  </span>
                </div>

                {isSelectedDateBlocked ? (
                  <p className="text-xs text-[#B48222] bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg p-4">
                    The studio is closed on this date. Please choose another day above.
                  </p>
                ) : slotsLoading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div key={idx} className="h-12 rounded-lg bg-[#F1EFE9] animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {timeSlots.map((slot) => {
                      const isTaken = lockedSlots.includes(slot.time);
                      const active = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isTaken}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2 px-2 rounded-lg border text-center min-h-[48px] transition-colors ${
                            isTaken
                              ? 'bg-[#F1EFE9] border-[#E5E1D8] text-[#9CA3AF] line-through cursor-not-allowed'
                              : active
                                ? 'bg-[#14532D] border-[#14532D] text-white font-semibold cursor-pointer'
                                : 'bg-[#FFFFFF] border-[#E5E1D8] text-[#18191B] hover:border-[#14532D] cursor-pointer'
                          }`}
                        >
                          <span className="font-mono text-sm tabular-nums block">{slot.time}</span>
                          {slot.isPeak && !isTaken && (
                            <span className={`text-[10px] block ${active ? 'text-white/85' : 'text-[#B48222]'}`}>
                              +{formatRwf(slot.peakFeeRwf)}
                            </span>
                          )}
                          {isTaken && <span className="text-[10px] block no-underline">Booked</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F1EFE9] text-[#18191B] text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#E5E1D8] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => {
                    setStep(3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] disabled:opacity-45 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
                >
                  {selectedSlot ? `Next: Upgrades & MoMo (${selectedSlot})` : 'Pick an Open Time Slot'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Upgrades, Contact Info & MoMo Guarantee */}
          {step === 3 && (
            <form
              onSubmit={handleSubmitBooking}
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5 sm:p-6 space-y-6"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#18191B]">
                    Step 3 · Grooming Upgrades &amp; MoMo Confirmation
                  </h2>
                  <p className="text-xs text-[#5A5C63] mt-0.5">
                    Add optional treatments or products at your chair and confirm your details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A5C63] hover:text-[#18191B] cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Time
                </button>
              </div>

              {/* 1-Tap Add-Ons */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#18191B]">Optional 1-Tap Chair Add-Ons</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeAddons.map((addon) => {
                    const checked = selectedAddonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => toggleAddon(addon.id)}
                        className={`flex items-center justify-between gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#F4F8F5] border-[#14532D]'
                            : 'bg-[#F9F8F5] border-[#E5E1D8] hover:border-[#14532D]/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#5A5C63]">{addon.tag}</p>
                          <p className="text-xs font-semibold text-[#18191B] truncate">{addon.name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-semibold text-[#14532D] tabular-nums">
                            +{formatRwf(addon.priceRwf)}
                          </span>
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center border ${
                              checked
                                ? 'bg-[#14532D] border-[#14532D] text-white'
                                : 'border-[#D5D0C5] bg-white text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client Details & Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bk-name" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Your Full Name
                  </label>
                  <input
                    id="bk-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Jean-Paul Habimana"
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
                <div>
                  <label htmlFor="bk-phone" className="block text-xs font-semibold text-[#18191B] mb-1">
                    WhatsApp / MoMo Phone
                  </label>
                  <input
                    id="bk-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0787 792 446"
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#18191B] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
                <div>
                  <label htmlFor="bk-notes" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Style Notes / Kigali Address
                  </label>
                  <input
                    id="bk-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Low drop fade"
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
                <div>
                  <label htmlFor="referral-code" className="block text-xs font-semibold text-[#18191B] mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#B48222]" />
                      Referral Code (2,000 RWF Off)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="referral-code"
                      type="text"
                      value={referralInput}
                      onChange={(e) => setReferralInput(e.target.value)}
                      placeholder="KCZ-KEVIN233"
                      className="flex-1 bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2.5 text-sm text-[#18191B] focus:outline-none focus:border-[#14532D]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyReferral}
                      className="px-3.5 py-2 bg-[#F1EFE9] border border-[#E5E1D8] text-xs font-semibold text-[#18191B] rounded-lg hover:border-[#14532D] cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {referralStatus && <p className="text-[11px] text-[#14532D] mt-1">{referralStatus}</p>}
                </div>
              </div>

              {/* Payment Commitment */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#18191B] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#14532D]" />
                  Slot Guarantee Method
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('deposit_momo')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      paymentOption === 'deposit_momo'
                        ? 'bg-[#F4F8F5] border-[#14532D] text-[#18191B]'
                        : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                    }`}
                  >
                    <span className="font-semibold block">
                      MTN MoMo Deposit ({formatRwf(depositTargetRwf)})
                    </span>
                    <span className="text-[11px]">Locks slot now; pay balance after cut.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('full_momo')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      paymentOption === 'full_momo'
                        ? 'bg-[#F4F8F5] border-[#14532D] text-[#18191B]'
                        : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                    }`}
                  >
                    <span className="font-semibold block">Full Prepayment via MTN MoMo</span>
                    <span className="text-[11px]">Pay {formatRwf(totalRwf)} upfront for zero wait.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('full_airtel')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      paymentOption === 'full_airtel'
                        ? 'bg-[#F4F8F5] border-[#14532D] text-[#18191B]'
                        : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                    }`}
                  >
                    <span className="font-semibold block">Airtel Money Prepayment</span>
                    <span className="text-[11px]">Pay full {formatRwf(totalRwf)} via Airtel Money.</span>
                  </button>

                  {!requiresAdvanceCommitment && (
                    <button
                      type="button"
                      onClick={() => setPaymentOption('cash_chair')}
                      className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        paymentOption === 'cash_chair'
                          ? 'bg-[#F4F8F5] border-[#14532D] text-[#18191B]'
                          : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                      }`}
                    >
                      <span className="font-semibold block">Pay Cash / MoMo at Chair</span>
                      <span className="text-[11px]">Available for standard daytime slots.</span>
                    </button>
                  )}
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#F1EFE9] text-[#18191B] text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#E5E1D8] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-[#14532D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {submitting
                    ? 'Locking Slot...'
                    : `Confirm Booking (${formatRwf(depositRwf)} Due)`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Live Booking Summary Card (Always Visible on Desktop) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
            <h2 className="font-display text-base font-bold text-[#18191B]">Your Chair Summary</h2>
            <span className="font-mono text-xs text-[#14532D] font-semibold">Step {step} of 3</span>
          </div>

          {/* Selected Service Thumbnail */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#F1EFE9] border border-[#E5E1D8] shrink-0">
              <ResilientImage
                src={selectedService.image}
                alt={selectedService.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#5A5C63]">Service ({selectedService.durationMin} min)</p>
              <p className="text-xs font-bold text-[#18191B] truncate">{selectedService.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-[#14532D] hover:underline shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Selected Barber Thumbnail */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F1EFE9] border border-[#E5E1D8] shrink-0">
              <ResilientImage
                src={selectedBarber.avatar}
                alt={selectedBarber.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#5A5C63]">Barber &amp; Time</p>
              <p className="text-xs font-bold text-[#18191B] truncate">{selectedBarber.name}</p>
              <p className="font-mono text-[11px] text-[#14532D]">
                {selectedDateLabel?.dayShort} {selectedDateLabel?.label} ·{' '}
                {selectedSlot || 'Time not picked'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-semibold text-[#14532D] hover:underline shrink-0 cursor-pointer"
            >
              Edit
            </button>
          </div>

          {/* Itemized Math */}
          <div className="border-t border-[#E5E1D8] pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#5A5C63]">Base Service</span>
              <span className="font-mono text-[#18191B] tabular-nums">
                {formatRwf(selectedService.priceRwf)}
              </span>
            </div>
            {masterSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-[#5A5C63]">Master Chair Rate</span>
                <span className="font-mono text-[#18191B] tabular-nums">
                  +{formatRwf(masterSurcharge)}
                </span>
              </div>
            )}
            {addonsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-[#5A5C63]">Add-Ons ({selectedAddonIds.length})</span>
                <span className="font-mono text-[#18191B] tabular-nums">
                  +{formatRwf(addonsTotal)}
                </span>
              </div>
            )}
            {peakFee > 0 && (
              <div className="flex justify-between">
                <span className="text-[#5A5C63]">Priority Evening ({selectedSlot})</span>
                <span className="font-mono text-[#B48222] tabular-nums">+{formatRwf(peakFee)}</span>
              </div>
            )}
            {appliedReferral && (
              <div className="flex justify-between text-[#14532D] font-semibold">
                <span>Referral ({appliedReferral.code})</span>
                <span className="font-mono tabular-nums">-{formatRwf(appliedReferral.discountRwf)}</span>
              </div>
            )}

            <div className="border-t border-[#E5E1D8] pt-3 flex justify-between items-baseline">
              <span className="font-semibold text-sm text-[#18191B]">Total</span>
              <span className="font-mono text-xl font-bold text-[#14532D] tabular-nums">
                {formatRwf(totalRwf)}
              </span>
            </div>
          </div>

          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 px-4 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
            >
              Next: Pick Barber &amp; Time →
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="w-full py-3 px-4 bg-[#14532D] disabled:opacity-45 text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
            >
              {selectedSlot ? 'Next: Upgrades & MoMo →' : 'Pick a Time Slot to Continue'}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitBooking()}
              className="w-full py-3 px-4 bg-[#14532D] disabled:opacity-60 text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
            >
              {submitting ? 'Locking Slot...' : `Confirm Booking · ${formatRwf(depositRwf)} Due`}
            </button>
          )}
        </aside>
      </div>

      {/* Compact Mobile Bottom Action Bar (<= 15% Viewport Height) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E5E1D8] px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#5A5C63]">
            {selectedSlot ? `${selectedDateLabel?.dayShort} ${selectedSlot}` : selectedService.name}
          </p>
          <p className="font-mono text-base font-bold text-[#14532D] tabular-nums">
            {formatRwf(totalRwf)}
          </p>
        </div>
        {step < 3 ? (
          <button
            type="button"
            disabled={step === 2 && !selectedSlot}
            onClick={() => {
              setStep((s) => (s === 1 ? 2 : 3));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-5 py-2.5 bg-[#14532D] disabled:opacity-45 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
          >
            {step === 1 ? 'Pick Barber & Time →' : selectedSlot ? 'Upgrades & MoMo →' : 'Pick Time'}
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitBooking()}
            className="px-5 py-2.5 bg-[#14532D] disabled:opacity-60 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
          >
            {submitting ? 'Locking...' : `Confirm (${formatRwf(depositRwf)})`}
          </button>
        )}
      </div>
    </div>
  );
}
