import { useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Award, Check, Copy, Crown, Gift, Share2, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { VipPlan } from '../data/catalog';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  formatDisplayPhone,
  formatRwf,
  generateId,
  normalizePhoneKey,
  todayIso,
} from '../utils/format';
import { AppRoute } from '../components/Navbar';

interface ClubPageProps {
  onNavigate: (route: AppRoute) => void;
}

interface LoyaltyRecord {
  phoneKey: string;
  displayPhone: string;
  firstName: string;
  stamps: number;
  totalCuts: number;
  tier: string;
  referralCode: string;
  lastVisitDate: string;
}

export function ClubPage({ onNavigate }: ClubPageProps) {
  const { vipPlans, siteConfig } = useStore();
  const activePlans = vipPlans.filter((p) => p.active !== false);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [card, setCard] = useState<LoyaltyRecord | null>(null);
  const [notFoundKey, setNotFoundKey] = useState<string>('');
  const [lookupError, setLookupError] = useState('');
  const [loadingCard, setLoadingCard] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [subName, setSubName] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subMethod, setSubMethod] = useState<'mtn_momo' | 'airtel_money'>('mtn_momo');
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subConfirmation, setSubConfirmation] = useState<{ id: string; plan: VipPlan } | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setNotFoundKey('');
    const key = normalizePhoneKey(phoneQuery);
    if (key.length < 9) {
      setLookupError('Enter a valid Rwandan phone number (e.g. 0787 792 446).');
      return;
    }

    setLoadingCard(true);
    try {
      const snap = await getDoc(doc(db, 'loyalty_cards', key));
      if (snap.exists()) {
        setCard(snap.data() as LoyaltyRecord);
      } else {
        setCard(null);
        setNotFoundKey(key);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `loyalty_cards/${key}`);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleActivateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notFoundKey) return;
    const cleanFirst = firstNameInput.trim();
    if (!cleanFirst) {
      setLookupError('Enter your first name to activate your stamp card.');
      return;
    }

    const codePrefix = cleanFirst.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'VIP';
    const primaryCode = `KCZ-${codePrefix}${notFoundKey.slice(-3)}`;

    setLoadingCard(true);
    try {
      let refCode = primaryCode;
      const existingRef = await getDoc(doc(db, 'referrals', primaryCode));
      if (existingRef.exists()) {
        const fallbackCode = `KCZ-${codePrefix}${notFoundKey.slice(-4)}`;
        const existingFallback = await getDoc(doc(db, 'referrals', fallbackCode));
        refCode = existingFallback.exists()
          ? `KCZ-${codePrefix}${notFoundKey.slice(-3)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`.slice(0, 20)
          : fallbackCode;
      }

      const batch = writeBatch(db);
      const newCard: LoyaltyRecord = {
        phoneKey: notFoundKey,
        displayPhone: formatDisplayPhone(phoneQuery),
        firstName: cleanFirst.slice(0, 60),
        stamps: 0,
        totalCuts: 0,
        tier: 'Standard',
        referralCode: refCode,
        lastVisitDate: todayIso(),
      };
      batch.set(doc(db, 'loyalty_cards', notFoundKey), {
        ...newCard,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'referrals', refCode), {
        code: refCode,
        ownerFirstName: cleanFirst.slice(0, 60),
        discountRwf: 2000,
        usesCount: 0,
        active: true,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      setCard(newCard);
      setNotFoundKey('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `loyalty_cards/${notFoundKey}`);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const cleanName = subName.trim();
    const key = normalizePhoneKey(subPhone);
    if (cleanName.length < 2 || key.length < 9) return;

    setSubmittingSub(true);
    const subId = generateId('sub');
    try {
      await setDoc(doc(db, 'subscriptions', subId), {
        customerName: cleanName.slice(0, 80),
        customerPhone: formatDisplayPhone(subPhone).slice(0, 24),
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        priceRwf: selectedPlan.priceRwf,
        paymentMethod: subMethod,
        status: 'pending_momo',
        cutsRemaining: selectedPlan.cutsIncluded,
        createdAt: serverTimestamp(),
      });
      setSubConfirmation({ id: subId, plan: selectedPlan });
      setSelectedPlan(null);
      setSubName('');
      setSubPhone('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subscriptions/${subId}`);
    } finally {
      setSubmittingSub(false);
    }
  };

  const copyReferralLink = (code: string) => {
    const shareUrl = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <div className="border-b border-[#E5E1D8] pb-6">
        <p className="text-xs font-semibold text-[#14532D] mb-2">Retention &amp; Membership · Zero App Required</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18191B] tracking-tight">
          Kigali Clipper Zone Loyalty Club
        </h1>
        <p className="text-sm sm:text-base text-[#5A5C63] mt-2 max-w-2xl">
          Track your haircut stamps with your phone number, share your 2,000 RWF referral code, or
          lock in a discounted monthly VIP pass via MTN MoMo.
        </p>
      </div>

      {/* Phone-Number Stamp Card & Referral */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#14532D]">
              <Award className="w-4 h-4" />
              <span>Digital Stamp Card (5 Cuts + 1 Free Reward)</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#18191B]">Check or Activate Your Card</h2>
          </div>

          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
            <input
              type="tel"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="Enter phone (e.g. 0787 792 446)"
              className="flex-1 bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-4 py-3 text-sm font-mono text-[#18191B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#14532D]"
            />
            <button
              type="submit"
              disabled={loadingCard}
              className="px-6 py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loadingCard ? 'Checking...' : 'Check Stamps'}
            </button>
          </form>

          {lookupError && <p className="text-xs text-red-700">{lookupError}</p>}

          {notFoundKey && !card && (
            <form onSubmit={handleActivateCard} className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-xl p-5 space-y-4">
              <p className="text-sm text-[#18191B]">
                No stamp card found yet for{' '}
                <span className="font-mono font-semibold text-[#14532D]">{formatDisplayPhone(phoneQuery)}</span>.
                Activate yours now to get your shareable 2,000 RWF referral code.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  placeholder="Your First Name"
                  className="flex-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B] focus:outline-none focus:border-[#14532D]"
                />
                <button
                  type="submit"
                  disabled={loadingCard}
                  className="px-5 py-2.5 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Activate Free Card
                </button>
              </div>
            </form>
          )}

          {card && (
            <div className="bg-[#F4F8F5] border border-[#14532D]/40 rounded-xl p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[#14532D] font-semibold">{card.tier} Member</p>
                  <h3 className="font-display text-xl font-bold text-[#18191B] mt-0.5">{card.firstName}</h3>
                  <p className="font-mono text-xs text-[#5A5C63] mt-0.5">{card.displayPhone}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-2xl font-bold text-[#14532D] tabular-nums">{card.stamps} / 6</p>
                  <p className="text-xs text-[#5A5C63]">Total cuts: {card.totalCuts}</p>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2.5">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const filled = idx < card.stamps;
                  const isReward = idx === 5;
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-xs font-mono ${
                        filled
                          ? 'bg-[#14532D] border-[#14532D] text-white font-bold'
                          : isReward
                            ? 'bg-[#FFFFFF] border-[#B48222] text-[#B48222]'
                            : 'bg-[#FFFFFF] border-[#E5E1D8] text-[#9CA3AF]'
                      }`}
                    >
                      {filled ? <Check className="w-4 h-4" /> : isReward ? <Gift className="w-4 h-4" /> : idx + 1}
                    </div>
                  );
                })}
              </div>

              {card.stamps >= 5 && (
                <div className="bg-[#FFFFFF] border border-[#B48222]/50 rounded-lg px-4 py-2.5 text-xs font-medium text-[#18191B] flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#B48222] shrink-0" />
                  <span>
                    {card.stamps >= 6
                      ? 'Reward ready (6/6 stamps)! Show your phone at the desk so your barber redeems your free cut/beard reward.'
                      : '5 stamps collected — your 6th cut unlocks a free beard sculpt or 5,000 RWF off!'}
                  </span>
                </div>
              )}

              <div className="border-t border-[#E5E1D8] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#5A5C63]">Your 2,000 RWF Referral Code</p>
                  <p className="font-mono text-base font-bold text-[#14532D]">{card.referralCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyReferralLink(card.referralCode)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg text-xs font-semibold text-[#18191B] hover:border-[#14532D] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedCode ? 'Copied Link' : 'Copy Link'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Book a fresh cut at ${siteConfig.brandName} with my referral code ${card.referralCode} for 2,000 RWF off: ${window.location.origin}/?ref=${card.referralCode}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#14532D] text-white rounded-lg text-xs font-semibold hover:bg-[#166534]"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B48222]">
            <Sparkles className="w-4 h-4" />
            <span>How Loyalty &amp; Referrals Pay Back</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#18191B]">
            Every Visit &amp; Referral Earns Real Value
          </h2>
          <div className="space-y-5 text-sm">
            <div className="border-b border-[#E5E1D8] pb-4">
              <p className="font-semibold text-[#18191B]">01. Automatic Check-In Stamps</p>
              <p className="text-[#5A5C63] mt-1">
                Every completed cut logged by your barber adds 1 stamp to your phone number. On your
                6th visit, unlock a free beard sculpt or 5,000 RWF off your haircut.
              </p>
            </div>
            <div className="border-b border-[#E5E1D8] pb-4">
              <p className="font-semibold text-[#18191B]">02. Give 2,000 RWF, Get 2,000 RWF</p>
              <p className="text-[#5A5C63] mt-1">
                Share your personal referral link on WhatsApp or Instagram. Every friend who books
                their first cut saves 2,000 RWF instantly.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#18191B]">03. Priority 21-Day Reminders</p>
              <p className="text-[#5A5C63] mt-1">
                Regular clients receive exclusive weekday renewal promos via WhatsApp before weekend
                slots sell out.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('book')}
            className="w-full py-3 px-5 bg-[#F1EFE9] border border-[#E5E1D8] text-[#18191B] text-sm font-semibold rounded-lg hover:border-[#14532D] transition-colors cursor-pointer"
          >
            Book Next Cut &amp; Earn Stamp
          </button>
        </div>
      </section>

      {/* Monthly VIP Subscriptions */}
      <section className="space-y-8">
        <div className="border-b border-[#E5E1D8] pb-5">
          <p className="text-xs font-semibold text-[#14532D] mb-2">Monthly Passes · Paid via MoMo</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B]">
            Lock In Fresh Cuts Every Month
          </h2>
        </div>

        {subConfirmation && (
          <div className="bg-[#F4F8F5] border border-[#14532D]/40 rounded-xl p-6 space-y-2">
            <p className="text-xs font-mono font-semibold text-[#14532D]">PASS REF: {subConfirmation.id}</p>
            <h3 className="font-display text-xl font-bold text-[#18191B]">
              {subConfirmation.plan.name} Reserved
            </h3>
            <p className="text-sm text-[#5A5C63]">
              Send <span className="font-mono font-semibold text-[#18191B]">{formatRwf(subConfirmation.plan.priceRwf)}</span> via{' '}
              <span className="font-mono font-semibold text-[#14532D]">{siteConfig.momoPayCode}</span> to activate your{' '}
              {subConfirmation.plan.cutsIncluded} monthly cuts immediately, or confirm directly on WhatsApp.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activePlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#B48222] flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />
                    {plan.audience}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-[#E5E1D8] pb-4">
                  <h3 className="font-display text-2xl font-bold text-[#18191B]">{plan.name}</h3>
                  <p className="font-mono text-xl font-bold text-[#14532D] tabular-nums shrink-0">
                    {formatRwf(plan.priceRwf)}
                    <span className="text-xs text-[#5A5C63] font-normal"> / mo</span>
                  </p>
                </div>
                <ul className="space-y-2.5 text-sm text-[#5A5C63]">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#14532D] shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className="w-full py-3 px-5 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
              >
                Subscribe via MoMo · {formatRwf(plan.priceRwf)}
              </button>
            </div>
          ))}
        </div>

        {selectedPlan && (
          <form
            onSubmit={handleSubscribe}
            className="bg-[#FFFFFF] border border-[#14532D] rounded-xl p-6 sm:p-8 space-y-5 max-w-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-[#18191B]">
                Activate {selectedPlan.name} ({formatRwf(selectedPlan.priceRwf)})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="text-xs text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Full Name"
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
              />
              <input
                type="tel"
                required
                value={subPhone}
                onChange={(e) => setSubPhone(e.target.value)}
                placeholder="MoMo Phone (078...)"
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#18191B]"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSubMethod('mtn_momo')}
                className={`px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  subMethod === 'mtn_momo'
                    ? 'bg-[#14532D] border-[#14532D] text-white'
                    : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                }`}
              >
                MTN MoMo
              </button>
              <button
                type="button"
                onClick={() => setSubMethod('airtel_money')}
                className={`px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  subMethod === 'airtel_money'
                    ? 'bg-[#14532D] border-[#14532D] text-white'
                    : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                }`}
              >
                Airtel Money
              </button>
            </div>
            <button
              type="submit"
              disabled={submittingSub}
              className="px-6 py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
            >
              {submittingSub ? 'Creating Pass...' : 'Confirm Monthly VIP Pass'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
