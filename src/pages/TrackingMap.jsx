import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const proIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#f97316;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🔧</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const clientIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#3b82f6;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;">🏠</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [60, 60] });
    }
  }, [points.length]);
  return null;
}

export default function TrackingMap() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');

  const [route, setRoute] = useState([]);

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
    refetchInterval: 15000,
  });

  // Fetch route from OpenRouteService (free, no key needed for basic use via OSRM)
  useEffect(() => {
    if (!proUser?.latitude || !proUser?.longitude || !request?.customer_latitude) return;

    const fromLon = proUser.longitude;
    const fromLat = proUser.latitude;
    const toLon = request.customer_longitude;
    const toLat = request.customer_latitude;

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`
    )
      .then(r => r.json())
      .then(data => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (coords) {
          setRoute(coords.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => {
        // Fallback: straight line
        setRoute([[fromLat, fromLon], [toLat, toLon]]);
      });
  }, [proUser?.latitude, proUser?.longitude, request?.customer_latitude]);

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const proPos = proUser?.latitude ? [proUser.latitude, proUser.longitude] : null;
  const clientPos = request.customer_latitude ? [request.customer_latitude, request.customer_longitude] : null;
  const allPoints = [proPos, clientPos].filter(Boolean);
  const centerPos = clientPos || proPos || [48.8566, 2.3522];

  const isCompleted = request.status === 'completed';
  const isAccepted = request.status === 'accepted';

  return (
    <div className="relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-6 pb-4 bg-gradient-to-b from-background via-background/95 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Suivi en temps réel
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {request.professional_name || 'Professionnel'} • {request.category_name}
            </p>
          </div>
          <Badge className={isCompleted ? 'bg-green-600' : isAccepted ? 'bg-primary' : 'bg-accent'}>
            {isCompleted ? '✅ Terminé' : isAccepted ? '🚗 En route' : '⏳ En attente'}
          </Badge>
        </div>
      </div>

      <MapContainer
        center={centerPos}
        zoom={13}
        className="w-full h-screen"
        style={{ zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPoints.length >= 2 && <FitBounds points={allPoints} />}

        {/* Route line */}
        {route.length > 1 && (
          <Polyline positions={route} color="#3b82f6" weight={4} opacity={0.8} dashArray="8,4" />
        )}

        {/* Pro marker */}
        {proPos && (
          <Marker position={proPos} icon={proIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-sm">{request.professional_name}</p>
                <p className="text-xs text-muted-foreground">{request.category_name}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Client marker */}
        {clientPos && (
          <Marker position={clientPos} icon={clientIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-sm">Votre adresse</p>
                <p className="text-xs text-muted-foreground">{request.customer_address}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Bottom card */}
      <div className="absolute bottom-32 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg">
        {isCompleted ? (
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-1" />
            <p className="font-semibold">Mission terminée !</p>
          </div>
        ) : isAccepted ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">🔧</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{request.professional_name} est en route</p>
              <p className="text-xs text-muted-foreground">{request.customer_address}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">En attente de confirmation...</p>
          </div>
        )}
        <Button variant="outline" className="w-full mt-3 h-10 rounded-xl text-sm" onClick={() => navigate('/Home')}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}