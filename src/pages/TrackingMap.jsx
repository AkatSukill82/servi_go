import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, MessageCircle, Navigation, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

const proIcon = L.divIcon({
  className: '',
  html: `<div style="width:42px;height:42px;background:#0a0a0a;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.3);font-size:18px;">🔧</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const clientIcon = L.divIcon({
  className: '',
  html: `<div style="width:42px;height:42px;background:#ffffff;border-radius:50%;border:3px solid #0a0a0a;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.2);font-size:18px;">🏠</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [80, 60] });
    }
  }, [points.length]);
  return null;
}

export default function TrackingMap() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState(null); // minutes

  const { data: request } = useQuery({
    queryKey: ['trackRequest', requestId],
    queryFn: () => base44.entities.ServiceRequest.filter({ id: requestId }).then(r => r[0]),
    enabled: !!requestId,
    refetchInterval: 10000,
  });

  const { data: proUser } = useQuery({
    queryKey: ['proUser', request?.professional_email],
    queryFn: () => base44.entities.User.filter({ email: request.professional_email }).then(r => r[0]),
    enabled: !!request?.professional_email,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!proUser?.latitude || !proUser?.longitude || !request?.customer_latitude) return;
    const { latitude: fromLat, longitude: fromLon } = proUser;
    const { customer_latitude: toLat, customer_longitude: toLon } = request;
    fetch(`https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        const route0 = data?.routes?.[0];
        if (route0?.geometry?.coordinates) {
          setRoute(route0.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        }
        if (route0?.duration) {
          setEta(Math.ceil(route0.duration / 60));
        }
      })
      .catch(() => {
        setRoute([[fromLat, fromLon], [toLat, toLon]]);
        setEta(null);
      });
  }, [proUser?.latitude, proUser?.longitude, request?.customer_latitude]);

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const proPos = proUser?.latitude ? [proUser.latitude, proUser.longitude] : null;
  const clientPos = request.customer_latitude ? [request.customer_latitude, request.customer_longitude] : null;
  const allPoints = [proPos, clientPos].filter(Boolean);
  const centerPos = clientPos || proPos || [50.8503, 4.3517];
  const isCompleted = request.status === 'completed';
  const isAccepted = request.status === 'accepted';

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapContainer
        center={centerPos}
        zoom={13}
        className="w-full h-full"
        style={{ zIndex: 1 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {allPoints.length >= 2 && <FitBounds points={allPoints} />}
        {route.length > 1 && (
          <Polyline positions={route} color="#0a0a0a" weight={3.5} opacity={0.7} dashArray="10,6" />
        )}
        {proPos && <Marker position={proPos} icon={proIcon} />}
        {clientPos && <Marker position={clientPos} icon={clientIcon} />}
      </MapContainer>

      {/* Header floating */}
      <div
        className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div className="bg-card/90 backdrop-blur-md rounded-2xl px-4 py-3 border border-border shadow-sm flex items-center gap-3">
          <BackButton fallback="/Home" />
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" strokeWidth={2} />
              Suivi en temps réel
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {request.professional_name || 'Professionnel'} · {request.category_name}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isCompleted ? 'bg-foreground text-background border-foreground' :
            isAccepted ? 'bg-muted text-foreground border-border' :
            'bg-muted text-muted-foreground border-border'
          }`}>
            {isCompleted ? 'Terminé' : isAccepted ? 'En route' : 'En attente'}
          </span>
        </div>
      </div>

      {/* Bottom card */}
      <div className="absolute bottom-8 left-4 right-4 z-[1000]">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-xl p-4 space-y-3">
          {isCompleted ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-background" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mission terminée !</p>
                <p className="text-xs text-muted-foreground">Le travail est complété.</p>
              </div>
            </div>
          ) : isAccepted ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0 text-xl">🔧</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{request.professional_name} est en route</p>
                <p className="text-xs text-muted-foreground truncate">{request.customer_address}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {eta !== null ? (
                  <div className="flex items-center gap-1 bg-foreground text-background rounded-xl px-2.5 py-1">
                    <Timer className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{eta} min</span>
                  </div>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">En attente de confirmation...</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={() => navigate(`/Chat?requestId=${requestId}`)}
            >
              <MessageCircle className="w-4 h-4 mr-1.5" /> Chat
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={() => navigate('/Home')}
            >
              Accueil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}