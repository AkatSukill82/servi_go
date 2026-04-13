import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(active) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${active ? '#FF6B35' : '#1A1A2E'};
      color:white;border-radius:50% 50% 50% 0;
      width:30px;height:30px;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:700;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      border:2px solid white;
      transform:rotate(-45deg);
    "><span style="transform:rotate(45deg)">★</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  });
}

function FitBounds({ pros }) {
  const map = useMap();
  useEffect(() => {
    const pts = pros.filter(p => p.latitude && p.longitude);
    if (!pts.length) { map.setView([50.85, 4.35], 12); return; }
    if (pts.length === 1) { map.setView([pts[0].latitude, pts[0].longitude], 13); return; }
    map.fitBounds(L.latLngBounds(pts.map(p => [p.latitude, p.longitude])), { padding: [40, 40] });
  }, [pros.length]);
  return null;
}

function CenterOn({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.latitude && target?.longitude) {
      map.setView([target.latitude, target.longitude], 14);
    }
  }, [target?.id]);
  return null;
}

function Stars({ rating }) {
  return (
    <span className="text-yellow-400 text-xs">
      {'★★★★★'.split('').map((s, i) => (
        <span key={i} style={{ opacity: i < Math.round(rating || 0) ? 1 : 0.25 }}>{s}</span>
      ))}
    </span>
  );
}

export default function InlineSearchResults({ query }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);
  const [centeredPro, setCenteredPro] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { data: allPros = [], isLoading } = useQuery({
    queryKey: ['inlineSearchPros'],
    queryFn: () => base44.entities.Professional.list('-rating', 200),
    staleTime: 60000,
  });

  const pros = !query.trim()
    ? allPros
    : allPros.filter(p =>
        p.category_name?.toLowerCase().includes(query.toLowerCase()) ||
        p.name?.toLowerCase().includes(query.toLowerCase())
      );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-sm text-muted-foreground mb-3 font-medium">
        <span className="text-foreground font-semibold">{pros.length}</span> professionnel{pros.length !== 1 ? 's' : ''} trouvé{pros.length !== 1 ? 's' : ''}
        {query.trim() && <span> pour « {query} »</span>}
      </p>

      {pros.length === 0 ? (
        <div className="text-center py-12 space-y-2 bg-card border border-border rounded-2xl">
          <p className="text-3xl">🔍</p>
          <p className="font-semibold">Aucun résultat</p>
          <p className="text-sm text-muted-foreground">Essayez "plombier", "électricien", "jardinier"…</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-3">
          {/* MAP — single instance, responsive height */}
          <div
            className="w-full md:w-[60%] rounded-2xl overflow-hidden border border-border shrink-0"
            style={{ height: isMobile ? 250 : 500 }}
          >
            <MapContainer
              center={[50.85, 4.35]}
              zoom={12}
              style={{ width: '100%', height: '100%' }}
              zoomControl
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© OpenStreetMap'
              />
              <FitBounds pros={pros} />
              {centeredPro && <CenterOn target={centeredPro} />}
              {pros.filter(p => p.latitude && p.longitude).map(pro => (
                <Marker
                  key={pro.id}
                  position={[pro.latitude, pro.longitude]}
                  icon={makeIcon(hoveredId === pro.id || centeredPro?.id === pro.id)}
                  eventHandlers={{
                    click: () => setCenteredPro(pro),
                  }}
                >
                  <Popup>
                    <div className="min-w-[130px] space-y-0.5">
                      <p className="font-semibold text-sm">{pro.name}</p>
                      <p className="text-xs text-gray-500">{pro.category_name}</p>
                      {pro.rating > 0 && <Stars rating={pro.rating} />}
                      {pro.base_price > 0 && (
                        <p className="text-xs font-bold" style={{ color: '#FF6B35' }}>
                          À partir de {pro.base_price} €
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* LIST */}
          <div
            className="w-full md:w-[40%] overflow-y-auto space-y-2"
            style={{ maxHeight: isMobile ? 400 : 500 }}
          >
            {pros.map(pro => {
              const isActive = centeredPro?.id === pro.id;
              const isVerified = pro.verification_status === 'verified';
              return (
                <div
                  key={pro.id}
                  onMouseEnter={() => setHoveredId(pro.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setCenteredPro(pro)}
                  className={`bg-card border rounded-2xl p-3 cursor-pointer transition-all ${
                    isActive
                      ? 'border-[#FF6B35] shadow-md ring-1 ring-[#FF6B35]/20'
                      : 'border-border hover:border-[#FF6B35]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-primary text-lg">
                        {pro.photo_url
                          ? <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                          : (pro.name?.[0] || '?')}
                      </div>
                      {pro.available && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="font-semibold text-sm truncate">{pro.name}</p>
                        {isVerified && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0" style={{ backgroundColor: '#FFF3EE', color: '#FF6B35', border: '1px solid #FF6B35' }}>
                            <ServiGoIcon size={8} /> Vérifié
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{pro.category_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Stars rating={pro.rating} />
                        {pro.reviews_count > 0 && <span className="text-xs text-muted-foreground">({pro.reviews_count} avis)</span>}
                        {pro.available && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Disponible</span>
                        )}
                      </div>
                      {pro.base_price > 0 && (
                        <p className="text-xs font-bold mt-0.5" style={{ color: '#FF6B35' }}>À partir de {pro.base_price} €</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/ProPublicProfile?proId=${pro.id}`); }}
                    className="mt-2.5 w-full py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: '#FF6B35' }}
                  >
                    Contacter / Demander un devis
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}