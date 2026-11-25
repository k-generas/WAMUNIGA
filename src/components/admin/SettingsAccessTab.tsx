import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { CalendarOff, CheckCircle2, Clock, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SiteConfig, TimeSlot } from '../../data/catalog';
import { db, handleFirestoreError, OperationType, OWNER_ADMIN_EMAIL } from '../../firebase';
import { formatRwf } from '../../utils/format';

interface SettingsAccessTabProps {
  currentUserEmail?: string | null;
  ensureSynced: () => Promise<void>;
}

interface AdminRecord {
  id: string;
  email: string;
  role: 'owner' | 'manager';
}

export function SettingsAccessTab({
  currentUserEmail,
  ensureSynced,
}: SettingsAccessTabProps) {
  const { siteConfig } = useStore();
  const [form, setForm] = useState<SiteConfig>(siteConfig);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('16:30');
  const [newSlotPeakFee, setNewSlotPeakFee] = useState(0);

  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'manager' | 'owner'>('manager');

  const isPrimaryOwner = currentUserEmail === OWNER_ADMIN_EMAIL;

  useEffect(() => {
    setForm(siteConfig);
  }, [siteConfig]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        setAdmins(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminRecord, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );
    return () => unsub();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await ensureSynced();
      const sortedSlots: TimeSlot[] = [...form.timeSlots].sort((a, b) =>
        a.time.localeCompare(b.time)
      );
      await setDoc(doc(db, 'site_config', 'main'), {
        brandName: form.brandName.trim().slice(0, 80),
        founderName: form.founderName.trim().slice(0, 80),
        address: form.address.trim().slice(0, 160),
        hours: form.hours.trim().slice(0, 120),
        primaryPhone: form.primaryPhone.trim().slice(0, 30),
        bookingPhone: form.bookingPhone.trim().slice(0, 30),
        vipPhone: form.vipPhone.trim().slice(0, 30),
        mapsUrl: form.mapsUrl.trim().slice(0, 400),
        momoPayCode: form.momoPayCode.trim().slice(0, 60),
        momoNumber: form.momoNumber.trim().slice(0, 80),
        heroHeadline: form.heroHeadline.trim().slice(0, 160),
        heroSubheadline: form.heroSubheadline.trim().slice(0, 400),
        motoDeliveryFeeRwf: Math.max(0, Math.min(50000, Number(form.motoDeliveryFeeRwf) || 0)),
        standardDepositRwf: Math.max(0, Math.min(100000, Number(form.standardDepositRwf) || 0)),
        vipDepositRwf: Math.max(0, Math.min(200000, Number(form.vipDepositRwf) || 0)),
        igPersonalCount: form.igPersonalCount.trim().slice(0, 24),
        igShopCount: form.igShopCount.trim().slice(0, 24),
        blockedDates: form.blockedDates.slice(0, 90),
        timeSlots: sortedSlots.slice(0, 30),
        updatedAt: serverTimestamp(),
      });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'site_config/main');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedDate = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBlockedDate)) return;
    if (form.blockedDates.includes(newBlockedDate)) return;
    setForm((prev) => ({
      ...prev,
      blockedDates: [...prev.blockedDates, newBlockedDate].sort(),
    }));
    setNewBlockedDate('');
  };

  const removeBlockedDate = (dateIso: string) => {
    setForm((prev) => ({
      ...prev,
      blockedDates: prev.blockedDates.filter((d) => d !== dateIso),
    }));
  };

  const addTimeSlot = () => {
    if (!/^\d{2}:\d{2}$/.test(newSlotTime)) return;
    if (form.timeSlots.some((s) => s.time === newSlotTime)) return;
    const fee = Math.max(0, Number(newSlotPeakFee) || 0);
    setForm((prev) => ({
      ...prev,
      timeSlots: [...prev.timeSlots, { time: newSlotTime, isPeak: fee > 0, peakFeeRwf: fee }].sort(
        (a, b) => a.time.localeCompare(b.time)
      ),
    }));
  };

  const removeTimeSlot = (time: string) => {
    if (form.timeSlots.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((s) => s.time !== time),
    }));
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = newAdminUid.trim();
    const email = newAdminEmail.trim();
    if (!/^[a-zA-Z0-9_-]{4,128}$/.test(uid) || email.length < 5) return;
    try {
      await setDoc(doc(db, 'admins', uid), {
        email: email.slice(0, 120),
        role: newAdminRole,
      });
      setNewAdminUid('');
      setNewAdminEmail('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${uid}`);
    }
  };

  const handleDeleteAdmin = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'admins', uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${uid}`);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSaveConfig} className="space-y-6">
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-[#18191B]">
                Shop Profile, Pricing Rules &amp; MoMo Settings
              </h3>
              <p className="text-xs text-[#5A5C63]">
                Changes update the homepage, booking flow, store checkout fees, and receipts everywhere.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
            >
              {savedBanner ? <CheckCircle2 className="w-4 h-4" /> : null}
              {saving ? 'Saving Settings...' : savedBanner ? 'Saved Live!' : 'Save All Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Shop / Brand Name</label>
              <input
                type="text"
                required
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Founder Name</label>
              <input
                type="text"
                required
                value={form.founderName}
                onChange={(e) => setForm({ ...form, founderName: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Opening Hours</label>
              <input
                type="text"
                required
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Physical Address</label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Google Maps URL</label>
              <input
                type="url"
                value={form.mapsUrl}
                onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E5E1D8]">
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Main WhatsApp / Shop Phone</label>
              <input
                type="text"
                required
                value={form.primaryPhone}
                onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Booking Desk Phone</label>
              <input
                type="text"
                value={form.bookingPhone}
                onChange={(e) => setForm({ ...form, bookingPhone: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">VIP &amp; Management Phone</label>
              <input
                type="text"
                value={form.vipPhone}
                onChange={(e) => setForm({ ...form, vipPhone: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-[#E5E1D8]">
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">MoMo USSD Code</label>
              <input
                type="text"
                required
                value={form.momoPayCode}
                onChange={(e) => setForm({ ...form, momoPayCode: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">MoMo Account Display</label>
              <input
                type="text"
                required
                value={form.momoNumber}
                onChange={(e) => setForm({ ...form, momoNumber: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Standard Deposit (RWF)</label>
              <input
                type="number"
                min={0}
                value={form.standardDepositRwf}
                onChange={(e) =>
                  setForm({ ...form, standardDepositRwf: Number(e.target.value) })
                }
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">VIP Deposit (RWF)</label>
              <input
                type="number"
                min={0}
                value={form.vipDepositRwf}
                onChange={(e) => setForm({ ...form, vipDepositRwf: Number(e.target.value) })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Moto Delivery Fee (RWF)</label>
              <input
                type="number"
                min={0}
                value={form.motoDeliveryFeeRwf}
                onChange={(e) =>
                  setForm({ ...form, motoDeliveryFeeRwf: Number(e.target.value) })
                }
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pt-2 border-t border-[#E5E1D8]">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Homepage Hero Headline</label>
              <input
                type="text"
                value={form.heroHeadline}
                onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">IG Personal Reach</label>
              <input
                type="text"
                value={form.igPersonalCount}
                onChange={(e) => setForm({ ...form, igPersonalCount: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18191B] mb-1">IG Salon Reach</label>
              <input
                type="text"
                value={form.igShopCount}
                onChange={(e) => setForm({ ...form, igShopCount: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div className="lg:col-span-4">
              <label className="block text-xs font-semibold text-[#18191B] mb-1">Homepage Hero Subheadline</label>
              <textarea
                rows={2}
                value={form.heroSubheadline}
                onChange={(e) => setForm({ ...form, heroSubheadline: e.target.value })}
                className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
          </div>
        </div>

        {/* SCHEDULE SLOTS & BLOCKED DATES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-bold text-[#18191B] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#14532D]" />
                Daily Chair Time Slots ({form.timeSlots.length})
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.timeSlots.map((slot) => (
                <div
                  key={slot.time}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg text-xs"
                >
                  <span className="font-mono font-semibold text-[#18191B]">{slot.time}</span>
                  {slot.isPeak && (
                    <span className="text-[11px] font-mono text-[#B48222]">
                      +{formatRwf(slot.peakFeeRwf)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(slot.time)}
                    className="text-[#5A5C63] hover:text-red-600 cursor-pointer"
                    aria-label={`Remove ${slot.time}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E1D8]">
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-1.5 text-xs font-mono text-[#18191B]"
              />
              <input
                type="number"
                min={0}
                step={500}
                value={newSlotPeakFee}
                onChange={(e) => setNewSlotPeakFee(Number(e.target.value))}
                placeholder="Peak fee (0 = standard)"
                className="w-44 bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-1.5 text-xs font-mono text-[#18191B]"
              />
              <button
                type="button"
                onClick={addTimeSlot}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F1EFE9] border border-[#E5E1D8] text-xs font-semibold text-[#18191B] rounded-lg hover:border-[#14532D] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Slot
              </button>
            </div>
            <p className="text-[11px] text-[#5A5C63]">Click “Save All Settings” above after adding or removing slots.</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 space-y-4">
            <h4 className="font-display text-base font-bold text-[#18191B] flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-[#B48222]" />
              Blocked Dates / Studio Holidays ({form.blockedDates.length})
            </h4>
            <p className="text-xs text-[#5A5C63]">
              Mark Umuganda mornings, tour dates, or closed days so customers cannot book them.
            </p>
            <div className="flex flex-wrap gap-2">
              {form.blockedDates.length === 0 ? (
                <p className="text-xs text-[#5A5C63]">No blocked dates. Shop open all 7 upcoming days.</p>
              ) : (
                form.blockedDates.map((d) => (
                  <div
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-700"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeBlockedDate(d)}
                      className="hover:text-red-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[#E5E1D8]">
              <input
                type="date"
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-1.5 text-xs font-mono text-[#18191B]"
              />
              <button
                type="button"
                onClick={addBlockedDate}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F1EFE9] border border-[#E5E1D8] text-xs font-semibold text-[#18191B] rounded-lg hover:border-[#14532D] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Block Date
              </button>
            </div>
            <p className="text-[11px] text-[#5A5C63]">Click “Save All Settings” above to publish blocked dates.</p>
          </div>
        </div>
      </form>

      {/* TEAM / MANAGER ACCESS */}
      <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-[#18191B] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#14532D]" />
              Shop Manager &amp; Co-Admin Access ({admins.length})
            </h3>
            <p className="text-xs text-[#5A5C63]">
              Primary owner (<span className="font-mono">{OWNER_ADMIN_EMAIL}</span>) can grant or revoke desk manager access by Firebase UID.
            </p>
          </div>
        </div>

        {isPrimaryOwner && (
          <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              value={newAdminUid}
              onChange={(e) => setNewAdminUid(e.target.value)}
              placeholder="Firebase User UID"
              className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
            />
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Manager Google Email"
              className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
            />
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value as 'manager' | 'owner')}
              className="bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
            >
              <option value="manager">Manager</option>
              <option value="owner">Co-Owner</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
            >
              Grant Admin Access
            </button>
          </form>
        )}

        <div className="divide-y divide-[#E5E1D8] border-t border-[#E5E1D8]">
          {admins.length === 0 ? (
            <p className="py-3 text-xs text-[#5A5C63]">Only primary owner currently has admin access.</p>
          ) : (
            admins.map((adm) => (
              <div key={adm.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#18191B]">{adm.email}</span>{' '}
                  <span className="font-mono text-[#5A5C63]">({adm.id})</span> ·{' '}
                  <span className="text-[#14532D] font-semibold uppercase">{adm.role}</span>
                </div>
                {isPrimaryOwner && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAdmin(adm.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
