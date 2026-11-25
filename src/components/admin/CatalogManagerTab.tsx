import { useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Check, Edit3, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  AddonItem,
  AVAILABLE_MEDIA_PRESETS,
  BarberProfile,
  ServiceItem,
} from '../../data/catalog';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { formatRwf, generateId } from '../../utils/format';
import { ResilientImage } from '../ResilientImage';

interface CatalogManagerTabProps {
  ensureSynced: () => Promise<void>;
}

export function CatalogManagerTab({ ensureSynced }: CatalogManagerTabProps) {
  const { services, addons, barbers } = useStore();

  // Service modal/form state
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isNewService, setIsNewService] = useState(false);
  const [svcSaving, setSvcSaving] = useState(false);

  // Addon form state
  const [editingAddon, setEditingAddon] = useState<AddonItem | null>(null);
  const [isNewAddon, setIsNewAddon] = useState(false);
  const [addonSaving, setAddonSaving] = useState(false);

  // Barber form state
  const [editingBarber, setEditingBarber] = useState<BarberProfile | null>(null);
  const [isNewBarber, setIsNewBarber] = useState(false);
  const [barberSaving, setBarberSaving] = useState(false);

  const openNewService = () => {
    setIsNewService(true);
    setEditingService({
      id: generateId('svc'),
      name: '',
      durationMin: 40,
      priceRwf: 6000,
      category: 'Signature',
      description: '',
      image: AVAILABLE_MEDIA_PRESETS[0].url,
      requiresDeposit: false,
      active: true,
      sortOrder: services.length + 1,
    });
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setSvcSaving(true);
    try {
      await ensureSynced();
      const payload = {
        name: editingService.name.trim().slice(0, 100),
        durationMin: Math.max(5, Math.min(480, Number(editingService.durationMin) || 30)),
        priceRwf: Math.max(500, Math.min(5000000, Number(editingService.priceRwf) || 5000)),
        category: editingService.category,
        description: (editingService.description.trim() || 'Precision grooming session at Kigali Clipper Zone.').slice(0, 300),
        image: (editingService.image.trim() || AVAILABLE_MEDIA_PRESETS[0].url).slice(0, 500),
        requiresDeposit: Boolean(editingService.requiresDeposit),
        active: editingService.active !== false,
        sortOrder: Number(editingService.sortOrder ?? services.length + 1),
      };
      await setDoc(doc(db, 'services', editingService.id), payload);
      setEditingService(null);
      setIsNewService(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `services/${editingService.id}`);
    } finally {
      setSvcSaving(false);
    }
  };

  const toggleServiceActive = async (svc: ServiceItem) => {
    try {
      await ensureSynced();
      await setDoc(doc(db, 'services', svc.id), {
        name: svc.name.slice(0, 100),
        durationMin: svc.durationMin,
        priceRwf: svc.priceRwf,
        category: svc.category,
        description: svc.description.slice(0, 300),
        image: svc.image.slice(0, 500),
        requiresDeposit: Boolean(svc.requiresDeposit),
        active: svc.active === false,
        sortOrder: svc.sortOrder ?? 1,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `services/${svc.id}`);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await ensureSynced();
      await deleteDoc(doc(db, 'services', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `services/${id}`);
    }
  };

  const openNewAddon = () => {
    setIsNewAddon(true);
    setEditingAddon({
      id: generateId('add'),
      name: '',
      priceRwf: 3000,
      tag: 'Upgrade',
      active: true,
    });
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon) return;
    setAddonSaving(true);
    try {
      await ensureSynced();
      await setDoc(doc(db, 'addons', editingAddon.id), {
        name: editingAddon.name.trim().slice(0, 100),
        priceRwf: Math.max(0, Math.min(1000000, Number(editingAddon.priceRwf) || 0)),
        tag: (editingAddon.tag.trim() || 'Upgrade').slice(0, 40),
        active: editingAddon.active !== false,
      });
      setEditingAddon(null);
      setIsNewAddon(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `addons/${editingAddon.id}`);
    } finally {
      setAddonSaving(false);
    }
  };

  const toggleAddonActive = async (addon: AddonItem) => {
    try {
      await ensureSynced();
      await setDoc(doc(db, 'addons', addon.id), {
        name: addon.name.slice(0, 100),
        priceRwf: addon.priceRwf,
        tag: addon.tag.slice(0, 40),
        active: addon.active === false,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `addons/${addon.id}`);
    }
  };

  const handleDeleteAddon = async (id: string) => {
    try {
      await ensureSynced();
      await deleteDoc(doc(db, 'addons', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `addons/${id}`);
    }
  };

  const openNewBarber = () => {
    setIsNewBarber(true);
    setEditingBarber({
      id: generateId('barber'),
      name: '',
      role: 'Senior Barber',
      tier: 'Senior',
      surchargeRwf: 0,
      commissionRate: 0.5,
      specialty: 'Skin fades & sharp razor line-ups',
      avatar: AVAILABLE_MEDIA_PRESETS[7].url,
      active: true,
    });
  };

  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;
    setBarberSaving(true);
    try {
      await ensureSynced();
      const rate = Math.max(0, Math.min(1, Number(editingBarber.commissionRate) || 0.5));
      await setDoc(doc(db, 'barbers', editingBarber.id), {
        name: editingBarber.name.trim().slice(0, 80),
        role: editingBarber.role.trim().slice(0, 80),
        tier: editingBarber.tier,
        surchargeRwf: Math.max(0, Math.min(500000, Number(editingBarber.surchargeRwf) || 0)),
        commissionRate: rate,
        specialty: (editingBarber.specialty.trim() || 'Precision fades & grooming').slice(0, 200),
        avatar: (editingBarber.avatar.trim() || AVAILABLE_MEDIA_PRESETS[7].url).slice(0, 500),
        active: editingBarber.active !== false,
      });
      setEditingBarber(null);
      setIsNewBarber(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `barbers/${editingBarber.id}`);
    } finally {
      setBarberSaving(false);
    }
  };

  const toggleBarberActive = async (barber: BarberProfile) => {
    try {
      await ensureSynced();
      await setDoc(doc(db, 'barbers', barber.id), {
        name: barber.name.slice(0, 80),
        role: barber.role.slice(0, 80),
        tier: barber.tier,
        surchargeRwf: barber.surchargeRwf,
        commissionRate: barber.commissionRate,
        specialty: barber.specialty.slice(0, 200),
        avatar: barber.avatar.slice(0, 500),
        active: barber.active === false,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `barbers/${barber.id}`);
    }
  };

  const handleDeleteBarber = async (id: string) => {
    try {
      await ensureSynced();
      await deleteDoc(doc(db, 'barbers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `barbers/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: SERVICES */}
      <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#18191B]">
              Services &amp; Haircut Menu ({services.length})
            </h3>
            <p className="text-xs text-[#5A5C63]">
              Edit prices, durations, descriptions, photos, or pause any service in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewService}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </button>
        </div>

        {editingService && (
          <form onSubmit={handleSaveService} className="p-5 bg-[#F9F8F5] border-b border-[#E5E1D8] space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-[#18191B]">
                {isNewService ? 'Create New Service' : `Edit: ${editingService.name}`}
              </p>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="text-xs text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={editingService.name}
                onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                placeholder="Service Name"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <select
                value={editingService.category}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    category: e.target.value as ServiceItem['category'],
                  })
                }
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              >
                <option value="Signature">Signature</option>
                <option value="Grooming">Grooming</option>
                <option value="VIP">VIP</option>
              </select>
              <input
                type="number"
                min={500}
                required
                value={editingService.priceRwf}
                onChange={(e) =>
                  setEditingService({ ...editingService, priceRwf: Number(e.target.value) })
                }
                placeholder="Price (RWF)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <input
                type="number"
                min={5}
                max={480}
                required
                value={editingService.durationMin}
                onChange={(e) =>
                  setEditingService({ ...editingService, durationMin: Number(e.target.value) })
                }
                placeholder="Duration (min)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={editingService.description}
                onChange={(e) =>
                  setEditingService({ ...editingService, description: e.target.value })
                }
                placeholder="Service description shown on booking card"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editingService.image}
                  onChange={(e) => setEditingService({ ...editingService, image: e.target.value })}
                  placeholder="Photo URL or choose preset below"
                  className="flex-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-[#18191B] shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingService.requiresDeposit)}
                    onChange={(e) =>
                      setEditingService({ ...editingService, requiresDeposit: e.target.checked })
                    }
                  />
                  Require MoMo Deposit
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#5A5C63]">Quick Photo Picker</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MEDIA_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setEditingService({ ...editingService, image: preset.url })}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                      editingService.image === preset.url
                        ? 'bg-[#14532D] border-[#14532D] text-white'
                        : 'bg-[#FFFFFF] border-[#E5E1D8] text-[#18191B]'
                    }`}
                  >
                    <img src={preset.url} alt="" className="w-5 h-5 rounded object-cover" />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={svcSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {svcSaving ? 'Saving...' : 'Save Service'}
              </button>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 bg-[#FFFFFF] border border-[#E5E1D8] text-xs font-semibold text-[#5A5C63] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-[#E5E1D8]">
          {services.map((svc) => {
            const isActive = svc.active !== false;
            return (
              <div key={svc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#F1EFE9] border border-[#E5E1D8] shrink-0">
                    <ResilientImage src={svc.image} alt={svc.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-[#18191B] truncate">{svc.name}</p>
                      {!isActive && (
                        <span className="text-[11px] font-semibold text-[#B48222]">Hidden</span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A5C63]">
                      {svc.category} · {svc.durationMin} min ·{' '}
                      <span className="font-mono font-semibold text-[#14532D]">{formatRwf(svc.priceRwf)}</span>
                      {svc.requiresDeposit ? ' · Deposit Required' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewService(false);
                      setEditingService({ ...svc });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs font-medium text-[#18191B] hover:border-[#14532D] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleServiceActive(svc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs font-medium text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
                  >
                    {isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isActive ? 'Pause' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(svc.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    aria-label="Delete service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: BARBERS */}
      <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#18191B]">
              Barbers, Photos &amp; Commission Splits ({barbers.length})
            </h3>
            <p className="text-xs text-[#5A5C63]">
              Add barbers, set commission rates (e.g. 0.5 = 50%), Master chair surcharges, or mark On Leave.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewBarber}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Barber
          </button>
        </div>

        {editingBarber && (
          <form onSubmit={handleSaveBarber} className="p-5 bg-[#F9F8F5] border-b border-[#E5E1D8] space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-[#18191B]">
                {isNewBarber ? 'Add New Barber' : `Edit: ${editingBarber.name}`}
              </p>
              <button
                type="button"
                onClick={() => setEditingBarber(null)}
                className="text-xs text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                type="text"
                required
                value={editingBarber.name}
                onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                placeholder="Barber Name"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                required
                value={editingBarber.role}
                onChange={(e) => setEditingBarber({ ...editingBarber, role: e.target.value })}
                placeholder="Role / Title"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <select
                value={editingBarber.tier}
                onChange={(e) =>
                  setEditingBarber({
                    ...editingBarber,
                    tier: e.target.value as BarberProfile['tier'],
                  })
                }
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              >
                <option value="Master">Master</option>
                <option value="Senior">Senior</option>
                <option value="Stylist">Stylist</option>
              </select>
              <input
                type="number"
                min={0}
                value={editingBarber.surchargeRwf}
                onChange={(e) =>
                  setEditingBarber({ ...editingBarber, surchargeRwf: Number(e.target.value) })
                }
                placeholder="Surcharge (RWF)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={editingBarber.commissionRate}
                onChange={(e) =>
                  setEditingBarber({ ...editingBarber, commissionRate: Number(e.target.value) })
                }
                placeholder="Commission (0–1)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={editingBarber.specialty}
                onChange={(e) => setEditingBarber({ ...editingBarber, specialty: e.target.value })}
                placeholder="Specialty summary"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                value={editingBarber.avatar}
                onChange={(e) => setEditingBarber({ ...editingBarber, avatar: e.target.value })}
                placeholder="Portrait URL or pick preset"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MEDIA_PRESETS.slice(6, 10).map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setEditingBarber({ ...editingBarber, avatar: preset.url })}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                    editingBarber.avatar === preset.url
                      ? 'bg-[#14532D] border-[#14532D] text-white'
                      : 'bg-[#FFFFFF] border-[#E5E1D8] text-[#18191B]'
                  }`}
                >
                  <img src={preset.url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={barberSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {barberSaving ? 'Saving...' : 'Save Barber'}
              </button>
              <button
                type="button"
                onClick={() => setEditingBarber(null)}
                className="px-4 py-2 bg-[#FFFFFF] border border-[#E5E1D8] text-xs font-semibold text-[#5A5C63] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-[#E5E1D8]">
          {barbers.map((barber) => {
            const isActive = barber.active !== false;
            return (
              <div key={barber.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F1EFE9] border border-[#E5E1D8] shrink-0">
                    <ResilientImage src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-[#18191B] truncate">{barber.name}</p>
                      {!isActive && (
                        <span className="text-[11px] font-semibold text-[#B48222]">On Leave / Hidden</span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A5C63]">
                      {barber.tier} · {barber.role} · Commission:{' '}
                      <span className="font-mono font-semibold text-[#14532D]">
                        {Math.round(barber.commissionRate * 100)}%
                      </span>
                      {barber.surchargeRwf > 0 ? ` · +${formatRwf(barber.surchargeRwf)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewBarber(false);
                      setEditingBarber({ ...barber });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs font-medium text-[#18191B] hover:border-[#14532D] cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBarberActive(barber)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs font-medium text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
                  >
                    {isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isActive ? 'Set On Leave' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBarber(barber.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    aria-label="Delete barber"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: CHECKOUT ADD-ONS */}
      <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#18191B]">
              1-Tap Checkout Add-Ons ({addons.length})
            </h3>
            <p className="text-xs text-[#5A5C63]">Upsells displayed in Step 3 of the booking flow.</p>
          </div>
          <button
            type="button"
            onClick={openNewAddon}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Upsell
          </button>
        </div>

        {editingAddon && (
          <form onSubmit={handleSaveAddon} className="p-5 bg-[#F9F8F5] border-b border-[#E5E1D8] grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <input
              type="text"
              required
              value={editingAddon.name}
              onChange={(e) => setEditingAddon({ ...editingAddon, name: e.target.value })}
              placeholder="Add-on Name"
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
            />
            <input
              type="number"
              min={0}
              required
              value={editingAddon.priceRwf}
              onChange={(e) =>
                setEditingAddon({ ...editingAddon, priceRwf: Number(e.target.value) })
              }
              placeholder="Price (RWF)"
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
            />
            <input
              type="text"
              required
              value={editingAddon.tag}
              onChange={(e) => setEditingAddon({ ...editingAddon, tag: e.target.value })}
              placeholder="Tag (e.g. Popular)"
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={addonSaving}
                className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
              >
                {isNewAddon ? 'Add' : 'Update'}
              </button>
              <button
                type="button"
                onClick={() => setEditingAddon(null)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E5E1D8] text-xs text-[#5A5C63] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-[#E5E1D8]">
          {addons.map((addon) => {
            const isActive = addon.active !== false;
            return (
              <div key={addon.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-[#18191B]">
                    {addon.name}{' '}
                    {!isActive && <span className="text-xs text-[#B48222]">(Paused)</span>}
                  </p>
                  <p className="text-xs text-[#5A5C63]">
                    {addon.tag} · <span className="font-mono text-[#14532D]">+{formatRwf(addon.priceRwf)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewAddon(false);
                      setEditingAddon({ ...addon });
                    }}
                    className="px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs font-medium text-[#18191B] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAddonActive(addon)}
                    className="px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs font-medium text-[#5A5C63] cursor-pointer"
                  >
                    {isActive ? 'Pause' : 'Show'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddon(addon.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    aria-label="Delete addon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
