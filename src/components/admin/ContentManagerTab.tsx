import { useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Check, Edit3, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  AVAILABLE_MEDIA_PRESETS,
  ClientReview,
  MusicRelease,
  ProductItem,
  VipPlan,
} from '../../data/catalog';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { formatRwf, generateId } from '../../utils/format';
import { ResilientImage } from '../ResilientImage';

interface ContentManagerTabProps {
  ensureSynced: () => Promise<void>;
}

export function ContentManagerTab({ ensureSynced }: ContentManagerTabProps) {
  const { products, releases, vipPlans, reviews } = useStore();

  const [editingProduct, setEditingProduct] = useState<
    (ProductItem & { variantsText: string }) | null
  >(null);
  const [editingRelease, setEditingRelease] = useState<MusicRelease | null>(null);
  const [editingPlan, setEditingPlan] = useState<(VipPlan & { perksText: string }) | null>(null);
  const [editingReview, setEditingReview] = useState<ClientReview | null>(null);

  const openNewProduct = () => {
    setEditingProduct({
      id: generateId('prod'),
      name: '',
      category: 'Grooming',
      priceRwf: 12000,
      stockNote: 'In Stock · Kigali',
      description: '',
      image: AVAILABLE_MEDIA_PRESETS[10].url,
      variants: ['Standard'],
      variantsText: 'Standard',
      active: true,
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await ensureSynced();
      const variants = editingProduct.variantsText
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 10);
      await setDoc(doc(db, 'products', editingProduct.id), {
        name: editingProduct.name.trim().slice(0, 100),
        category: editingProduct.category,
        priceRwf: Math.max(500, Math.min(5000000, Number(editingProduct.priceRwf) || 5000)),
        stockNote: (editingProduct.stockNote.trim() || 'In Stock').slice(0, 60),
        description: (editingProduct.description.trim() || 'KCZ Official Store product.').slice(0, 300),
        image: (editingProduct.image.trim() || AVAILABLE_MEDIA_PRESETS[10].url).slice(0, 500),
        variants: variants.length > 0 ? variants : ['Standard'],
        active: editingProduct.active !== false,
      });
      setEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${editingProduct.id}`);
    }
  };

  const toggleProductActive = async (p: ProductItem) => {
    try {
      await ensureSynced();
      await setDoc(doc(db, 'products', p.id), {
        name: p.name.slice(0, 100),
        category: p.category,
        priceRwf: p.priceRwf,
        stockNote: p.stockNote.slice(0, 60),
        description: p.description.slice(0, 300),
        image: p.image.slice(0, 500),
        variants: p.variants.length > 0 ? p.variants.slice(0, 10) : ['Standard'],
        active: p.active === false,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${p.id}`);
    }
  };

  const openNewRelease = () => {
    setEditingRelease({
      id: generateId('rel'),
      title: '',
      featuring: '',
      releaseType: 'Single · Official Video',
      year: String(new Date().getFullYear()),
      location: 'Kigali, Rwanda',
      youtubeUrl: 'https://www.youtube.com/results?search_query=Wamunigga',
      audiomackUrl: 'https://audiomack.com/search?q=Wamunigga',
      spotifyUrl: 'https://open.spotify.com/search/Wamunigga',
      appleMusicUrl: 'https://music.apple.com/search?term=Wamunigga',
      duration: '3:30',
      highlight: '',
      active: true,
    });
  };

  const handleSaveRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRelease) return;
    try {
      await ensureSynced();
      const payload: Record<string, unknown> = {
        title: editingRelease.title.trim().slice(0, 120),
        releaseType: (editingRelease.releaseType.trim() || 'Single').slice(0, 80),
        year: (editingRelease.year.trim() || '2026').slice(0, 10),
        location: (editingRelease.location.trim() || 'Kigali, Rwanda').slice(0, 80),
        youtubeUrl: editingRelease.youtubeUrl.trim().slice(0, 300),
        audiomackUrl: editingRelease.audiomackUrl.trim().slice(0, 300),
        spotifyUrl: editingRelease.spotifyUrl.trim().slice(0, 300),
        appleMusicUrl: editingRelease.appleMusicUrl.trim().slice(0, 300),
        duration: (editingRelease.duration.trim() || '3:00').slice(0, 16),
        highlight: editingRelease.highlight.trim().slice(0, 300),
        active: editingRelease.active !== false,
      };
      if (editingRelease.featuring?.trim()) {
        payload.featuring = editingRelease.featuring.trim().slice(0, 120);
      }
      await setDoc(doc(db, 'releases', editingRelease.id), payload);
      setEditingRelease(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `releases/${editingRelease.id}`);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await ensureSynced();
      const perks = editingPlan.perksText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10);
      await setDoc(doc(db, 'vip_plans', editingPlan.id), {
        name: editingPlan.name.trim().slice(0, 100),
        audience: editingPlan.audience.trim().slice(0, 120),
        priceRwf: Math.max(1000, Math.min(1000000, Number(editingPlan.priceRwf) || 18000)),
        cutsIncluded: Math.max(1, Math.min(30, Number(editingPlan.cutsIncluded) || 4)),
        perks: perks.length > 0 ? perks : ['Monthly cuts included'],
        active: editingPlan.active !== false,
      });
      setEditingPlan(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `vip_plans/${editingPlan.id}`);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    try {
      await ensureSynced();
      await setDoc(doc(db, 'reviews', editingReview.id), {
        name: editingReview.name.trim().slice(0, 80),
        role: editingReview.role.trim().slice(0, 80),
        quote: editingReview.quote.trim().slice(0, 400),
        outcome: editingReview.outcome.trim().slice(0, 80),
        active: editingReview.active !== false,
      });
      setEditingReview(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reviews/${editingReview.id}`);
    }
  };

  const removeItem = async (colName: string, id: string) => {
    try {
      await ensureSynced();
      await deleteDoc(doc(db, colName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${colName}/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* MERCH & GROOMING PRODUCTS */}
      <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#18191B]">
              Merch &amp; Grooming Store ({products.length})
            </h3>
            <p className="text-xs text-[#5A5C63]">
              Control product prices, stock badges, sizes/variants, and store visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>

        {editingProduct && (
          <form onSubmit={handleSaveProduct} className="p-5 bg-[#F9F8F5] border-b border-[#E5E1D8] space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-[#18191B]">Save Product</p>
              <button type="button" onClick={() => setEditingProduct(null)} className="cursor-pointer">
                <X className="w-4 h-4 text-[#5A5C63]" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                placeholder="Product Name"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <select
                value={editingProduct.category}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    category: e.target.value as ProductItem['category'],
                  })
                }
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              >
                <option value="Apparel">Apparel</option>
                <option value="Grooming">Grooming</option>
                <option value="Bundle">Bundle</option>
              </select>
              <input
                type="number"
                min={500}
                required
                value={editingProduct.priceRwf}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, priceRwf: Number(e.target.value) })
                }
                placeholder="Price (RWF)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <input
                type="text"
                required
                value={editingProduct.stockNote}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, stockNote: e.target.value })
                }
                placeholder="Stock badge (e.g. In Stock · Kigali)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={editingProduct.description}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, description: e.target.value })
                }
                placeholder="Product description"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                required
                value={editingProduct.variantsText}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, variantsText: e.target.value })
                }
                placeholder="Variants comma-separated (S, M, L)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                value={editingProduct.image}
                onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                placeholder="Image URL"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MEDIA_PRESETS.slice(10, 12).map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, image: preset.url })}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                    editingProduct.image === preset.url
                      ? 'bg-[#14532D] border-[#14532D] text-white'
                      : 'bg-[#FFFFFF] border-[#E5E1D8] text-[#18191B]'
                  }`}
                >
                  <img src={preset.url} alt="" className="w-5 h-5 rounded object-cover" />
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Save Product
            </button>
          </form>
        )}

        <div className="divide-y divide-[#E5E1D8]">
          {products.map((p) => (
            <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#F1EFE9] border border-[#E5E1D8] shrink-0">
                  <ResilientImage src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#18191B] truncate">
                    {p.name} {p.active === false && <span className="text-xs text-[#B48222]">(Hidden)</span>}
                  </p>
                  <p className="text-xs text-[#5A5C63]">
                    {p.category} · {p.stockNote} ·{' '}
                    <span className="font-mono font-semibold text-[#14532D]">{formatRwf(p.priceRwf)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProduct({ ...p, variantsText: p.variants.join(', ') })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs text-[#18191B] cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleProductActive(p)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs text-[#5A5C63] cursor-pointer"
                >
                  {p.active !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {p.active !== false ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem('products', p.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MUSIC RELEASES */}
      <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#18191B]">
              Music Releases &amp; Videos ({releases.length})
            </h3>
            <p className="text-xs text-[#5A5C63]">
              Publish new tracks, update YouTube/Audiomack/Spotify/Apple Music links.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewRelease}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Release
          </button>
        </div>

        {editingRelease && (
          <form onSubmit={handleSaveRelease} className="p-5 bg-[#F9F8F5] border-b border-[#E5E1D8] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={editingRelease.title}
                onChange={(e) => setEditingRelease({ ...editingRelease, title: e.target.value })}
                placeholder="Track Title"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                value={editingRelease.featuring || ''}
                onChange={(e) => setEditingRelease({ ...editingRelease, featuring: e.target.value })}
                placeholder="Featuring (optional)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                required
                value={editingRelease.releaseType}
                onChange={(e) => setEditingRelease({ ...editingRelease, releaseType: e.target.value })}
                placeholder="Type (e.g. Single)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={editingRelease.year}
                  onChange={(e) => setEditingRelease({ ...editingRelease, year: e.target.value })}
                  placeholder="Year"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
                />
                <input
                  type="text"
                  required
                  value={editingRelease.duration}
                  onChange={(e) => setEditingRelease({ ...editingRelease, duration: e.target.value })}
                  placeholder="3:42"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={editingRelease.location}
                onChange={(e) => setEditingRelease({ ...editingRelease, location: e.target.value })}
                placeholder="Location (e.g. Kigali, Rwanda)"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
              <input
                type="text"
                required
                value={editingRelease.highlight}
                onChange={(e) => setEditingRelease({ ...editingRelease, highlight: e.target.value })}
                placeholder="Story / highlight note"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#18191B]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="url"
                value={editingRelease.youtubeUrl}
                onChange={(e) => setEditingRelease({ ...editingRelease, youtubeUrl: e.target.value })}
                placeholder="YouTube URL"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <input
                type="url"
                value={editingRelease.audiomackUrl}
                onChange={(e) => setEditingRelease({ ...editingRelease, audiomackUrl: e.target.value })}
                placeholder="Audiomack URL"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <input
                type="url"
                value={editingRelease.spotifyUrl}
                onChange={(e) => setEditingRelease({ ...editingRelease, spotifyUrl: e.target.value })}
                placeholder="Spotify URL"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
              <input
                type="url"
                value={editingRelease.appleMusicUrl}
                onChange={(e) => setEditingRelease({ ...editingRelease, appleMusicUrl: e.target.value })}
                placeholder="Apple Music URL"
                className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs font-mono text-[#18191B]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#14532D] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Save Release
              </button>
              <button
                type="button"
                onClick={() => setEditingRelease(null)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E5E1D8] text-xs text-[#5A5C63] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-[#E5E1D8]">
          {releases.map((rel) => (
            <div key={rel.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm text-[#18191B]">
                  {rel.title} {rel.featuring ? `(${rel.featuring})` : ''}
                </p>
                <p className="text-xs text-[#5A5C63]">
                  {rel.releaseType} · {rel.year} · {rel.location}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingRelease({ ...rel })}
                  className="px-2.5 py-1.5 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs text-[#18191B] cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeItem('releases', rel.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VIP MONTHLY PLANS & HOMEPAGE REVIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIP PLANS */}
        <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#E5E1D8] flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-[#18191B]">
              VIP Monthly Plans ({vipPlans.length})
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingPlan({
                  id: generateId('plan'),
                  name: '',
                  audience: '',
                  priceRwf: 25000,
                  cutsIncluded: 4,
                  perks: ['4 cuts per month'],
                  perksText: '4 cuts per month\nPriority WhatsApp booking',
                  active: true,
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Plan
            </button>
          </div>

          {editingPlan && (
            <form onSubmit={handleSavePlan} className="p-4 bg-[#F9F8F5] border-b border-[#E5E1D8] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="Plan Name"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
                />
                <input
                  type="text"
                  required
                  value={editingPlan.audience}
                  onChange={(e) => setEditingPlan({ ...editingPlan, audience: e.target.value })}
                  placeholder="Audience label"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
                />
                <input
                  type="number"
                  min={1000}
                  required
                  value={editingPlan.priceRwf}
                  onChange={(e) => setEditingPlan({ ...editingPlan, priceRwf: Number(e.target.value) })}
                  placeholder="Monthly RWF"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs font-mono text-[#18191B]"
                />
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={editingPlan.cutsIncluded}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, cutsIncluded: Number(e.target.value) })
                  }
                  placeholder="Cuts included"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs font-mono text-[#18191B]"
                />
              </div>
              <textarea
                rows={3}
                value={editingPlan.perksText}
                onChange={(e) => setEditingPlan({ ...editingPlan, perksText: e.target.value })}
                placeholder="One perk per line"
                className="w-full bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
              />
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded cursor-pointer">
                  Save Plan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E1D8] text-xs rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#E5E1D8]">
            {vipPlans.map((plan) => (
              <div key={plan.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-[#18191B]">{plan.name}</p>
                  <p className="text-xs text-[#5A5C63]">
                    {formatRwf(plan.priceRwf)}/mo · {plan.cutsIncluded} cuts
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlan({ ...plan, perksText: plan.perks.join('\n') })}
                    className="px-2.5 py-1 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem('vip_plans', plan.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOMEPAGE CLIENT REVIEWS */}
        <section className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#E5E1D8] flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-[#18191B]">
              Homepage Client Testimonials ({reviews.length})
            </h3>
            <button
              type="button"
              onClick={() =>
                setEditingReview({
                  id: generateId('rev'),
                  name: '',
                  role: '',
                  quote: '',
                  outcome: 'Verified Client',
                  active: true,
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Review
            </button>
          </div>

          {editingReview && (
            <form onSubmit={handleSaveReview} className="p-4 bg-[#F9F8F5] border-b border-[#E5E1D8] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={editingReview.name}
                  onChange={(e) => setEditingReview({ ...editingReview, name: e.target.value })}
                  placeholder="Client Name"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
                />
                <input
                  type="text"
                  required
                  value={editingReview.role}
                  onChange={(e) => setEditingReview({ ...editingReview, role: e.target.value })}
                  placeholder="Role / Kigali Area"
                  className="bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
                />
              </div>
              <input
                type="text"
                required
                value={editingReview.outcome}
                onChange={(e) => setEditingReview({ ...editingReview, outcome: e.target.value })}
                placeholder="Outcome label (e.g. Monthly VIP Member)"
                className="w-full bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
              />
              <textarea
                rows={2}
                required
                minLength={5}
                value={editingReview.quote}
                onChange={(e) => setEditingReview({ ...editingReview, quote: e.target.value })}
                placeholder="Client quote..."
                className="w-full bg-[#FFFFFF] border border-[#E5E1D8] rounded px-3 py-2 text-xs text-[#18191B]"
              />
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded cursor-pointer">
                  Save Review
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E1D8] text-xs rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-[#E5E1D8]">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#18191B]">{rev.name}</p>
                  <p className="text-xs text-[#5A5C63] truncate">“{rev.quote}”</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingReview({ ...rev })}
                    className="px-2.5 py-1 bg-[#F9F8F5] border border-[#E5E1D8] rounded text-xs cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem('reviews', rev.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
