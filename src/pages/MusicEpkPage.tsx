import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Download, ExternalLink, Music2, Play, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { generateId } from '../utils/format';
import { ResilientImage } from '../components/ResilientImage';
import { AppRoute } from '../components/Navbar';

interface MusicEpkPageProps {
  onNavigate: (route: AppRoute, serviceId?: string) => void;
}

export function MusicEpkPage({ onNavigate }: MusicEpkPageProps) {
  const { releases, siteConfig } = useStore();
  const activeReleases = releases.filter((r) => r.active !== false);
  const [activeReleaseId, setActiveReleaseId] = useState(activeReleases[0]?.id || '');

  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhoneOrEmail, setContactPhoneOrEmail] = useState('');
  const [inquiryType, setInquiryType] = useState<
    'live_show' | 'brand_ambassador' | 'private_vip_event' | 'media_press'
  >('live_show');
  const [budgetTier, setBudgetTier] = useState('500,000 – 1,500,000 RWF');
  const [eventDate, setEventDate] = useState('');
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedRef, setSubmittedRef] = useState('');

  const activeRelease = activeReleases.find((r) => r.id === activeReleaseId) || activeReleases[0];

  const liveStats = [
    { label: 'Instagram Personal (@wamunigga_original)', value: siteConfig.igPersonalCount },
    { label: 'Instagram Salon (@wamunigga_cuts)', value: siteConfig.igShopCount },
    { label: 'Active Catalog Releases', value: `${activeReleases.length}+` },
    { label: 'Flagship Studio Location', value: 'Kigali, RW' },
  ];

  const handleDownloadEpk = () => {
    const content = [
      `${siteConfig.founderName.toUpperCase()} — OFFICIAL ELECTRONIC PRESS KIT (EPK)`,
      '======================================================',
      `Location: Kigali, Rwanda (${siteConfig.brandName}, ${siteConfig.address})`,
      'Roles: Recording Artist · Master Barber · Entrepreneur · Cultural Creator',
      '',
      'VERIFIED AUDIENCE REACH:',
      ...liveStats.map((s) => `- ${s.label}: ${s.value}`),
      '',
      'FEATURED RELEASES:',
      ...activeReleases.map(
        (r) => `- ${r.title}${r.featuring ? ` (${r.featuring})` : ''} · ${r.year} · ${r.location}`
      ),
      '',
      'DIRECT MANAGEMENT & BRAND BOOKINGS:',
      `Phone / WhatsApp: ${siteConfig.vipPhone} / ${siteConfig.primaryPhone}`,
      `Instagram: @wamunigga_original | @wamunigga_cuts`,
      `TikTok: @wamuniggaa_original`,
      'Website: https://wamunigga.com',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Wamunigga_Didier_Official_EPK.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (organization.trim().length < 2 || contactName.trim().length < 2) {
      setErrorMsg('Please enter your organization and contact name.');
      return;
    }
    if (contactPhoneOrEmail.trim().length < 5) {
      setErrorMsg('Please enter a valid phone number or email address.');
      return;
    }
    if (brief.trim().length < 10) {
      setErrorMsg('Please provide at least a short brief (10+ characters) for your event or campaign.');
      return;
    }

    setSubmitting(true);
    const inquiryId = generateId('inq');
    try {
      const payload: Record<string, unknown> = {
        organization: organization.trim().slice(0, 100),
        contactName: contactName.trim().slice(0, 80),
        contactPhoneOrEmail: contactPhoneOrEmail.trim().slice(0, 100),
        inquiryType,
        budgetTier,
        brief: brief.trim().slice(0, 1000),
        status: 'new',
        createdAt: serverTimestamp(),
      };
      if (eventDate.trim()) {
        payload.eventDate = eventDate.trim().slice(0, 32);
      }

      await setDoc(doc(db, 'brand_inquiries', inquiryId), payload);
      setSubmittedRef(inquiryId);
      setOrganization('');
      setContactName('');
      setContactPhoneOrEmail('');
      setEventDate('');
      setBrief('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `brand_inquiries/${inquiryId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Artist Split Showcase */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch border-b border-[#E5E1D8] pb-12">
        <div className="lg:col-span-5">
          <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#F1EFE9]">
            <ResilientImage
              src="/src/assets/images/artist_wamunigga_music_1795550995578.jpg"
              alt="Wamunigga Didier performing at studio microphone"
              className="w-full h-full lg:h-full object-cover"
              fallbackLabel="Wamunigga Didier Studio"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between gap-6 py-1">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5C63]">
              <span className="text-[#14532D] font-semibold">Official Music &amp; Press Kit</span>
              <span aria-hidden="true">·</span>
              <span>@wamunigga_original</span>
              <span aria-hidden="true">·</span>
              <span>Kigali &amp; East Africa</span>
            </div>

            <h1 className="font-display text-[clamp(2rem,3.6vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-[#18191B] [text-wrap:balance]">
              Wamunigga Didier — Sound, Stage &amp; Brand Partnerships
            </h1>

            <p className="text-sm sm:text-base text-[#5A5C63] leading-relaxed max-w-2xl">
              From Kigali Clipper Zone to international music shoots in Rwanda and Ethiopia,
              Wamunigga connects street culture, music, and high-engagement digital reach across
              115,000+ combined followers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {liveStats.map((stat) => (
              <div key={stat.label} className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg p-3.5">
                <p className="font-mono text-lg font-bold text-[#14532D] tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-[#5A5C63] mt-1 leading-snug">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadEpk}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Press Dossier (EPK)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('book', 'svc_master_wamunigga')}
              className="px-5 py-3 bg-[#FFFFFF] border border-[#E5E1D8] text-[#18191B] text-sm font-semibold rounded-lg hover:border-[#14532D] transition-colors cursor-pointer"
            >
              Book Haircut Chair Instead
            </button>
          </div>
        </div>
      </section>

      {/* Music & Video Hub */}
      <section className="space-y-8">
        <div className="border-b border-[#E5E1D8] pb-5">
          <p className="text-xs font-semibold text-[#14532D] mb-2">01. Streaming &amp; Visual Catalog</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B]">
            Featured Releases &amp; Official Videos
          </h2>
        </div>

        {activeRelease ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-3">
              {activeReleases.map((release) => {
                const active = release.id === activeRelease.id;
                return (
                  <button
                    key={release.id}
                    type="button"
                    onClick={() => setActiveReleaseId(release.id)}
                    className={`w-full text-left p-5 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#F4F8F5] border-[#14532D]'
                        : 'bg-[#FFFFFF] border-[#E5E1D8] hover:border-[#14532D]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-[#5A5C63]">
                      <span>
                        {release.releaseType} · {release.year}
                      </span>
                      <span className="font-mono font-semibold text-[#14532D] tabular-nums">{release.duration}</span>
                    </div>
                    <p className="font-display text-lg font-semibold text-[#18191B] mt-1">
                      {release.title}
                    </p>
                    {release.featuring && (
                      <p className="text-xs text-[#B48222] font-medium mt-0.5">{release.featuring}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#E5E1D8] pb-5">
                <div>
                  <p className="text-xs text-[#B48222] font-semibold">
                    {activeRelease.location} · {activeRelease.year}
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B] mt-1">
                    {activeRelease.title}
                  </h3>
                  {activeRelease.featuring && (
                    <p className="text-sm text-[#5A5C63] mt-1">{activeRelease.featuring}</p>
                  )}
                </div>
                <Music2 className="w-7 h-7 text-[#14532D] shrink-0" />
              </div>

              <p className="text-sm sm:text-base text-[#5A5C63] leading-relaxed">
                {activeRelease.highlight}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={activeRelease.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-[#14532D] text-white rounded-lg text-sm font-semibold hover:bg-[#166534] transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Play className="w-4 h-4 fill-current" />
                    Watch on YouTube
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <a
                  href={activeRelease.audiomackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-[#F9F8F5] border border-[#E5E1D8] text-[#18191B] rounded-lg text-sm font-semibold hover:border-[#14532D] transition-colors"
                >
                  <span>Stream on Audiomack</span>
                  <ExternalLink className="w-4 h-4 text-[#14532D]" />
                </a>

                <a
                  href={activeRelease.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-[#F9F8F5] border border-[#E5E1D8] text-[#18191B] rounded-lg text-sm font-semibold hover:border-[#14532D] transition-colors"
                >
                  <span>Listen on Spotify</span>
                  <ExternalLink className="w-4 h-4 text-[#14532D]" />
                </a>

                <a
                  href={activeRelease.appleMusicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-[#F9F8F5] border border-[#E5E1D8] text-[#18191B] rounded-lg text-sm font-semibold hover:border-[#14532D] transition-colors"
                >
                  <span>Listen on Apple Music</span>
                  <ExternalLink className="w-4 h-4 text-[#14532D]" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#5A5C63]">No active music releases published yet.</p>
        )}
      </section>

      {/* Show & Brand Partnership Inquiry Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold text-[#14532D]">02. Work With Wamunigga</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18191B]">
            Book Live Shows &amp; Brand Campaigns
          </h2>
          <p className="text-sm text-[#5A5C63] leading-relaxed">
            Dedicated intake portal for club promoters, festival organizers, corporate sponsors, and
            media outlets. Every inquiry goes directly into Wamunigga’s management pipeline.
          </p>
          <div className="border-t border-[#E5E1D8] pt-4 space-y-2 text-xs text-[#5A5C63]">
            <p>Direct Management Line: <span className="font-mono font-semibold text-[#18191B]">{siteConfig.vipPhone}</span></p>
            <p>Instagram: <span className="text-[#18191B] font-medium">@wamunigga_original</span></p>
            <p>TikTok: <span className="text-[#18191B] font-medium">@wamuniggaa_original</span></p>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-6 sm:p-8">
          {submittedRef ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#14532D]" />
                <div>
                  <p className="text-xs font-mono font-semibold text-[#B48222]">INQUIRY REF: {submittedRef}</p>
                  <h3 className="font-display text-xl font-bold text-[#18191B]">
                    Booking &amp; Partnership Brief Received
                  </h3>
                </div>
              </div>
              <p className="text-sm text-[#5A5C63]">
                Thank you. Wamunigga Didier’s management team reviews new show and sponsorship
                briefs within 24 hours.
              </p>
              <button
                type="button"
                onClick={() => setSubmittedRef('')}
                className="px-4 py-2 bg-[#F1EFE9] border border-[#E5E1D8] text-xs font-semibold text-[#18191B] rounded-lg hover:border-[#14532D] cursor-pointer"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="epk-org" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Brand / Club / Organization
                  </label>
                  <input
                    id="epk-org"
                    type="text"
                    required
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Kigali Arena Events"
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                  />
                </div>
                <div>
                  <label htmlFor="epk-contact" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Contact Person
                  </label>
                  <input
                    id="epk-contact"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="epk-phone" className="block text-xs font-semibold text-[#18191B] mb-1">
                    WhatsApp Number or Email
                  </label>
                  <input
                    id="epk-phone"
                    type="text"
                    required
                    value={contactPhoneOrEmail}
                    onChange={(e) => setContactPhoneOrEmail(e.target.value)}
                    placeholder="+250 78... or email@company.com"
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                  />
                </div>
                <div>
                  <label htmlFor="epk-date" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    id="epk-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#18191B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="epk-type" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Booking Category
                  </label>
                  <select
                    id="epk-type"
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value as typeof inquiryType)}
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                  >
                    <option value="live_show">Live Club / Concert Performance</option>
                    <option value="brand_ambassador">Brand Ambassadorship / Promo</option>
                    <option value="private_vip_event">Private VIP / Wedding Appearance</option>
                    <option value="media_press">Media Interview / Press Feature</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="epk-budget" className="block text-xs font-semibold text-[#18191B] mb-1">
                    Estimated Budget Tier
                  </label>
                  <select
                    id="epk-budget"
                    value={budgetTier}
                    onChange={(e) => setBudgetTier(e.target.value)}
                    className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                  >
                    <option value="500,000 – 1,500,000 RWF">500,000 – 1,500,000 RWF</option>
                    <option value="1,500,000 – 3,500,000 RWF">1,500,000 – 3,500,000 RWF</option>
                    <option value="3,500,000+ RWF / Multi-Month">3,500,000+ RWF / Multi-Month</option>
                    <option value="International ($3,000+ USD)">International ($3,000+ USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="epk-brief" className="block text-xs font-semibold text-[#18191B] mb-1">
                  Event or Campaign Brief
                </label>
                <textarea
                  id="epk-brief"
                  rows={4}
                  required
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Share venue, deliverables, audience size, and campaign timeline..."
                  className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting Brief...' : 'Send Partnership Inquiry'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
