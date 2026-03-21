import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Star, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import BackButton from '@/components/ui/BackButton';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

function makeProIcon(initial) {
  return L.divIcon({
    className: '',
    html: `<div style="width:38px;height:38px;background:#0a0a0a;border-radius:50%;border:2.5px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.25);color:white;font-size:14px;font-weight:700;font-family:Inter,sans-serif;">${initial}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function UserLocationMarker({ center }) {
  const map = useMap();
  React.useEffect(() => { map.setView(center, map.getZoom()); }, []);
  return null;
}

export default function MapPage() {
  const [selected, setSelected] = useState(null);

  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['professionals'],
    queryFn: () => base44.entities.User.filter({ user_type: 'professionnel', available: true }),
  });

  const validPros = professionals.filter(p => p.latitude && p.longitude);
  const defaultCenter = [50.8503, 4.3517]; // Bruxelles, Belgique

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {isLoading ? (
        <Skeleton className="w-full h-screen" />
      ) : (
        <MapContainer
          center={validPros.length ? [validPros[0].latitude, validPros[0].longitude] : defaultCenter}
          zoom={12}
          className="w-full h-full"
          style={{ zIndex: 1 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {validPros.map(pro => (
            <Marker
              key={pro.id}
              position={[pro.latitude, pro.longitude]}
              icon={makeProIcon(pro.full_name?.[0] || '?')}
              eventHandlers={{ click: () => setSelected(pro) }}
            />
          ))}
        </MapContainer>
      )}

      {/* Header floating */}
      <div
        className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div className="bg-card/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-border shadow-sm flex items-center gap-3">
          <BackButton fallback="/Home" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Professionnels à proximité</p>
            <p className="text-xs text-muted-foreground">{validPros.length} disponible{validPros.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
        </div>
      </div>

      {/* Bottom sheet — selected pro */}
      {selected && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000]">
          <div className="bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center text-background font-bold text-lg shrink-0 overflow-hidden">
                {selected.photo_url
                  ? <img src={selected.photo_url} alt="" className="w-full h-full object-cover" />
                  : selected.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground">{selected.category_name || '—'}</p>
                {selected.rating > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-foreground text-foreground" />
                    <span className="text-xs font-medium">{selected.rating?.toFixed(1)}</span>
                    {selected.reviews_count > 0 && (
                      <span className="text-xs text-muted-foreground">({selected.reviews_count})</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}