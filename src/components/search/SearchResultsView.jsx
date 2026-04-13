import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Star, ShieldCheck, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ServiGoIcon } from '@/components/brand/ServiGoLogo';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(highlighted) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${highlighted ? '#FF6B35' : '#1A1A2E'};
      color:white;
      border-radius:50% 50% 50% 0;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:700;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      border:2px solid white;
      transform:rotate(-45deg);
      transition:all 0.2s;
    "><span style="transform:rotate(45deg)">★</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function FitBounds({ pros }) {
  const map = useMap();
  useEffect(() => {
    const withCoords = pros.filter(p => p.latitude && p.longitude);
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude, withCoords[0].longitude], 13);
      return;
    }
    const bounds = L.latLngBounds(withCoords.map(p => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pros.length]);
  return null;
}

function StarRating({ rating, count }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= full ? 'text-yellow-400 fill-yellow-400' : i === full+1 && half ? 'text-yellow-400 fill-yellow-200' : 'text-border fill-border'}`} />
      ))}
      {count > 0 && <span className="ml-1">({count} avis)</span>}
    </span>
  );
}

export default function SearchResultsView({ query, onClose }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const cardRefs = useRef({});

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['searchPros', query],
    queryFn: () => {
      if (!query || query.trim() === '') {
        return base44.entities.User.filter({ user_type: 'professionnel', available: true }, '-rating', 50);
      }
      return base44.entities.User.filter({ user_type: 'professionnel', available: true }, '-rating', 100).then(all =>
        all.filter(p =>
          p.category_name?.toLowerCase().includes(query.toLowerCase()) ||
          p.name?.toLowerCase().includes(query.toLowerCase())
        )
      );
    },
    staleTime: 60000,
  });

  const handleMarkerClick = (id) => {
    setSelectedId(id);
    const el = cardRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleContact = (pro) => {
    navigate(`/ProPublicProfile?proId=${pro.id}`);
  };

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0" style={{ backgroundColor: '#1A1A2E' }}>
        <ServiGoIcon size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {query ? `Résultats pour "${query}"` : 'Tous les professionnels'}
          </p>
          {!isLoading && <p className="text-xs text-white/60">{pros.length} professionnel{pros.length !== 1 ? 's' : ''} trouvé{pros.length !== 1 ? 's' : ''}</p>}
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : pros.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-3xl">🔍</p>
          <p className="font-semibold">Aucun résultat</p>
          <p className="text-sm text-muted-foreground">Essayez un autre terme (ex: plombier, électricien, jardinier)</p>
          <button onClick={onClose} className="mt-2 text-sm text-primary underline">Retour</button>
        </div>
      ) : (
        // Desktop: side by side | Mobile: map on top, list below
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Map */}
          <div className="shrink-0 h-[250px] md:h-full md:w-[60%]">
            <MapContainer
              center={[50.85, 4.35]}
              zoom={12}
              className="w-full h-full"
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <FitBounds pros={pros} />
              {pros.filter(p => p.latitude && p.longitude).map(pro => (
                <Marker
                  key={pro.id}
                  position={[pro.latitude, pro.longitude]}
                  icon={makeIcon(hoveredId === pro.id || selectedId === pro.id)}
                  eventHandlers={{
                    click: () => handleMarkerClick(pro.id),
                    mouseover: () => setHoveredId(pro.id),
                    mouseout: () => setHoveredId(null),
                  }}
                >
                  <Popup>
                    <div className="min-w-[140px]">
                      <p className="font-semibold text-sm">{pro.name || pro.full_name}</p>
                      <p className="text-xs text-gray-500">{pro.category_name}</p>
                      {pro.rating > 0 && (
                        <div className="flex items-center gap-0.5 mt-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs">{pro.rating?.toFixed(1)}</span>
                          {pro.reviews_count > 0 && <span className="text-xs text-gray-400">({pro.reviews_count})</span>}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* List */}
          <div className="flex-1 md:w-[40%] overflow-y-auto px-3 py-3 space-y-3">
            {pros.map(pro => {
              const isSelected = selectedId === pro.id;
              const isVerified = pro.verification_status === 'verified';
              return (
                <div
                  key={pro.id}
                  ref={el => { if (el) cardRefs.current[pro.id] = el; }}
                  onMouseEnter={() => setHoveredId(pro.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedId(pro.id)}
                  className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected ? 'border-[#FF6B35] shadow-md ring-1 ring-[#FF6B35]/30' : 'border-border hover:border-[#FF6B35]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Photo */}
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center text-xl font-bold text-primary">
                        {pro.photo_url
                          ? <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                          : (pro.name?.[0] || pro.full_name?.[0] || '?')}
                      </div>
                      {pro.available && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm truncate">{pro.name || pro.full_name}</p>
                        {isVerified && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0" style={{ backgroundColor: '#FFF3EE', color: '#FF6B35', border: '1px solid #FF6B35' }}>
                            <ServiGoIcon size={8} /> Vérifié
                          </span>
                        )}
                        {pro.available && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0">
                            Disponible
                          </span>
                        )}
                      </div>

                      {/* Category */}
                      <p className="text-xs text-muted-foreground mt-0.5">{pro.category_name}</p>

                      {/* Stars */}
                      <div className="mt-1">
                        <StarRating rating={pro.rating} count={pro.reviews_count} />
                      </div>

                      {/* Address */}
                      {pro.address && (
                        <p className="flex items-center gap-0.5 text-xs text-muted-foreground mt-0.5 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {pro.address}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">
                      {pro.base_price > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground">À partir de</p>
                          <p className="font-bold text-base" style={{ color: '#FF6B35' }}>{pro.base_price} €</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={e => { e.stopPropagation(); handleContact(pro); }}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
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