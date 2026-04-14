import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useI18n } from '@/hooks/useI18n';
import ProProfileSheet from '@/components/pro/ProProfileSheet';
import { base44 } from '@/api/base44Client';
import { Search, Zap, AlertCircle, X } from 'lucide-react';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import ServiceCard from '@/components/home/ServiceCard';
import PullToRefresh from '@/components/ui/PullToRefresh';

// Ensure Leaflet CSS is loaded once
function ensureLeafletCSS() {
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

function loadLeaflet(cb) {
  ensureLeafletCSS();
  if (window.L) { cb(); return; }
  if (document.getElementById('leaflet-js')) {
    // Already loading — wait
    const check = setInterval(() => { if (window.L) { clearInterval(check); cb(); } }, 50);
    return;
  }
  const script = document.createElement('script');
  script.id = 'leaflet-js';
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = cb;
  document.head.appendChild(script);
}

export default function Home() {
  const [viewingPro, setViewingPro] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [pros, setPros] = useState([]);
  const [selectedProId, setSelectedProId] = useState(null);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const mapContainerRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: upcomingReminder } = useQuery({
    queryKey: ['upcomingReminder', user?.email],
    queryFn: async () => {
      const reqs = await base44.entities.ServiceRequestV2.filter(
        { customer_email: user.email }, '-created_date', 10
      );
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return reqs
        .filter(r => ['contract_signed', 'accepted'].includes(r.status) && r.scheduled_date)
        .find(r => { const d = new Date(r.scheduled_date); return d >= now && d <= in24h; }) || null;
    },
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 60000,
  });

  const { data: activeRequest } = useQuery({
    queryKey: ['activeRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email, status: 'accepted' }, '-created_date', 1
    ).then(r => r[0] || null),
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 20000,
    staleTime: 20000,
  });

  const { data: unfinishedRequest } = useQuery({
    queryKey: ['unfinishedRequest', user?.email],
    queryFn: () => base44.entities.ServiceRequestV2.filter(
      { customer_email: user.email }, '-created_date', 10
    ).then(r => r.find(req => ['searching', 'pending_pro'].includes(req.status)) || null),
    enabled: !!user?.email && user?.user_type === 'particulier',
    refetchInterval: 45000,
    staleTime: 45000,
  });

  const [dismissedId, setDismissedId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceRequestV2.update(id, { status: 'cancelled', cancelled_by: 'customer' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unfinishedRequest'] });
      setConfirmCancel(false);
    },
  });

  useEffect(() => {
    if (!unfinishedRequest || dismissedId === unfinishedRequest.id) return;
    if (Notification.permission === 'granted') {
      new Notification('ServiGo', {
        body: `Votre demande "${unfinishedRequest.category_name}" est toujours en cours.`,
        icon: '/icon.png',
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [unfinishedRequest?.id]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: allPros = [] } = useQuery({
    queryKey: ['allAvailablePros'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel', available: true }),
    staleTime: 5 * 60 * 1000,
  });

  const prosByCategory = allPros.reduce((acc, pro) => {
    if (pro.category_name) acc[pro.category_name] = (acc[pro.category_name] || 0) + 1;
    return acc;
  }, {});

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });

  const handleSearch = async (overrideQuery) => {
    const q = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim().toLowerCase();
    if (overrideQuery !== undefined) setSearchQuery(overrideQuery);
    setSearching(true);
    const data = await base44.entities.Professional.list('-rating', 200);
    const filtered = q === ''
      ? data
      : data.filter(p =>
          p.category_name?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q)
        );
    setPros(filtered);
    setShowResults(true);
    setSelectedProId(null);
    setSearching(false);
  };

  // Initialize / reinitialize map whenever results are shown
  useEffect(() => {
    if (!showResults) {
      // Destroy map when hiding results
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      return;
    }

    const initMap = () => {
      const L = window.L;
      if (!L) return;

      // Wait for the DOM container to exist
      const tryInit = () => {
        const container = document.getElementById('servigo-map');
        if (!container) { setTimeout(tryInit, 50); return; }

        // Destroy previous instance
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

        const map = L.map('servigo-map', { zoomControl: true }).setView([50.85, 4.35], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 18,
        }).addTo(map);

        markersRef.current = {};
        const bounds = [];

        pros.forEach(pro => {
          if (!pro.latitude || !pro.longitude) return;
          const popup = `<b>${pro.name}</b><br>${'★'.repeat(Math.round(pro.rating || 0))} (${pro.reviews_count || 0} avis)<br>À partir de ${pro.base_price || '?'}€`;
          const marker = L.marker([pro.latitude, pro.longitude])
            .addTo(map)
            .bindPopup(popup);
          markersRef.current[pro.id] = marker;
          bounds.push([pro.latitude, pro.longitude]);
        });

        if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
        else if (bounds.length === 1) map.setView(bounds[0], 13);

        mapRef.current = map;
      };

      tryInit();
    };

    loadLeaflet(initMap);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [showResults, pros]);

  // Pan to selected pro
  useEffect(() => {
    if (!selectedProId || !mapRef.current) return;
    const marker = markersRef.current[selectedProId];
    if (marker) {
      mapRef.current.setView(marker.getLatLng(), 14, { animate: true });
      marker.openPopup();
    }
  }, [selectedProId]);

  const firstName = (() => {
    if (user?.first_name) return user.first_name;
    const handle = (user?.full_name || '').includes('@') ? user.full_name.split('@')[0] : (user?.full_name || '');
    const letters = handle.match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
    if (letters.length >= 2) return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
    const emailLetters = (user?.email || '').split('@')[0].match(/^[a-zA-Z\u00C0-\u024F]+/)?.[0] || '';
    if (emailLetters.length >= 2) return emailLetters.charAt(0).toUpperCase() + emailLetters.slice(1).toLowerCase();
    return '';
  })();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-5 pt-7 pb-4">
        <OnboardingModal />

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground leading-snug truncate">
            {firstName ? `${t('home_greeting')}, ${firstName}` : t('home_greeting')} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('home_subtitle')}</p>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Plombier, électricien, jardinier..."
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="h-12 px-5 rounded-xl text-sm font-semibold text-white shrink-0 disabled:opacity-60"
            style={{ backgroundColor: '#FF6B35' }}
          >
            {searching ? '...' : 'Rechercher'}
          </button>
          {showResults && (
            <button
              onClick={() => { setShowResults(false); setPros([]); setSearchQuery(''); }}
              className="h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* ── SEARCH RESULTS ── */}
        {showResults && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">
              {pros.length} professionnel{pros.length > 1 ? 's' : ''} trouvé{pros.length > 1 ? 's' : ''}
              {searchQuery.trim() && <span> pour « {searchQuery} »</span>}
            </p>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
            }}>
              {/* Map */}
              <div
                id="servigo-map"
                style={{
                  flex: isMobile ? 'none' : '0 0 60%',
                  height: isMobile ? '250px' : '480px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  background: '#f0f0f0',
                  position: 'relative',
                  zIndex: 0,
                }}
              />

              {/* Pro list */}
              <div style={{
                flex: 1,
                maxHeight: isMobile ? '380px' : '480px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {pros.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
                    <p style={{ fontSize: '28px' }}>🔍</p>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>Aucun professionnel trouvé</p>
                    <p style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>Essayez un autre métier</p>
                  </div>
                ) : pros.map(pro => (
                  <div
                    key={pro.id}
                    onClick={() => setSelectedProId(pro.id)}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: selectedProId === pro.id ? '2px solid #FF6B35' : '1px solid #e2e8f0',
                      background: selectedProId === pro.id ? '#FFF5F0' : '#fff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      overflow: 'hidden', flexShrink: 0,
                      background: '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '18px', color: '#555',
                    }}>
                      {pro.photo_url
                        ? <img src={pro.photo_url} alt={pro.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (pro.name?.[0]?.toUpperCase() || '?')}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a202c' }}>{pro.name}</span>
                        {pro.verification_status === 'verified' && (
                          <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '6px', fontWeight: 600 }}>✓ Vérifié</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096' }}>{pro.category_name}</div>
                      <div style={{ fontSize: '12px', color: '#FF6B35' }}>
                        {'★'.repeat(Math.round(pro.rating || 0))}{'☆'.repeat(5 - Math.round(pro.rating || 0))}
                        <span style={{ color: '#999', marginLeft: 3 }}>({pro.reviews_count || 0} avis)</span>
                      </div>
                      {pro.base_price > 0 && (
                        <div style={{ fontSize: '12px', color: '#444', fontWeight: 500 }}>À partir de {pro.base_price}€</div>
                      )}
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                      {pro.available && (
                        <span style={{ fontSize: '10px', background: '#e6f9f0', color: '#059669', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>Dispo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BANNERS (always shown) ── */}

        {/* Unfinished request banner */}
        {!showResults && unfinishedRequest && dismissedId !== unfinishedRequest.id && !activeRequest && (
          <div className="w-full mb-3 rounded-2xl overflow-hidden border border-orange-200 bg-orange-50">
            <div className="px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800">Demande en attente — {unfinishedRequest.category_name}</p>
                  <p className="text-xs text-orange-600 mt-0.5">Vous avez une demande non clôturée. Souhaitez-vous l'annuler ?</p>
                </div>
                <button onClick={() => setDismissedId(unfinishedRequest.id)} className="p-1 rounded-full hover:bg-orange-100">
                  <X className="w-4 h-4 text-orange-400" />
                </button>
              </div>
              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="mt-3 w-full text-center text-xs font-semibold text-orange-700 border border-orange-300 bg-white rounded-xl py-2 hover:bg-orange-50 transition-colors"
                >
                  Annuler cette demande
                </button>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConfirmCancel(false)} className="flex-1 text-xs font-medium border border-orange-200 rounded-xl py-2 bg-white text-orange-600">
                    Non, garder
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate(unfinishedRequest.id)}
                    disabled={cancelMutation.isPending}
                    className="flex-1 text-xs font-semibold rounded-xl py-2 bg-orange-500 text-white disabled:opacity-60"
                  >
                    {cancelMutation.isPending ? 'Annulation...' : 'Oui, annuler'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminder banner */}
        {!showResults && upcomingReminder && (
          <div className="w-full mb-3 rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center gap-3">
            <span className="text-xl shrink-0">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-800">Rappel — Mission demain</p>
              <p className="text-xs text-yellow-700">{upcomingReminder.category_name} à {upcomingReminder.scheduled_time || '?'} avec {upcomingReminder.professional_name || 'votre pro'}</p>
            </div>
          </div>
        )}

        {/* Active mission banner */}
        {!showResults && activeRequest && (
          <button
            onClick={() => navigate(`/TrackingMap?requestId=${activeRequest.id}`)}
            className="w-full mb-3 rounded-2xl overflow-hidden"
          >
            <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-300 animate-pulse shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">{t('home_mission_accepted')} — {activeRequest.professional_name}</p>
                <p className="text-xs text-white/80">{t('home_track')}</p>
              </div>
              <span className="text-white text-lg">→</span>
            </div>
          </button>
        )}

        {/* Identity pending banner */}
        {!showResults && user && user.eid_status !== 'verified' && user.eid_status !== undefined && (
          <div className="w-full mb-3 rounded-2xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-center gap-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800">Identité non vérifiée</p>
              <p className="text-xs text-orange-600">Certaines fonctionnalités sont limitées en attendant la vérification.</p>
            </div>
            <button onClick={() => navigate('/EidVerification')} className="text-xs font-bold text-orange-700 underline shrink-0">Vérifier</button>
          </div>
        )}

        {/* SOS banner */}
        {!showResults && (
          <button
            onClick={() => navigate('/Emergency')}
            className="w-full mb-5 rounded-2xl overflow-hidden relative"
          >
            <div className="bg-foreground px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive flex items-center justify-center shrink-0 animate-pulse">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-background">{t('home_sos_title')}</p>
                <p className="text-xs text-background/70">{t('home_sos_subtitle')}</p>
              </div>
              <span className="text-xs font-bold text-destructive bg-destructive/20 rounded-full px-2.5 py-1">⚡ SOS</span>
            </div>
          </button>
        )}

        {/* ── CATEGORIES GRID (hidden when showing results) ── */}
        {!showResults && (
          <>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
              {t('home_our_services')}
            </p>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl p-4 border border-border">
                    <Skeleton className="w-10 h-10 rounded-lg mb-3" />
                    <Skeleton className="h-3.5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground">{t('home_no_service')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category, index) => (
                  <ServiceCard
                    key={category.id}
                    category={category}
                    index={index}
                    unavailable={!prosByCategory[category.name]}
                    onSearch={handleSearch}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {viewingPro && (
        <ProProfileSheet
          pro={viewingPro}
          onClose={() => setViewingPro(null)}
          onSelect={(pro) => {
            const cat = categories.find(c => c.name === pro.category_name);
            if (cat) navigate(`/ServiceRequest?categoryId=${cat.id}&priorityProId=${pro.id}`);
            setViewingPro(null);
          }}
        />
      )}
    </PullToRefresh>
  );
}