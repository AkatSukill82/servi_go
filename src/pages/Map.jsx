import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Star, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function MapPage() {
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['professionals'],
    queryFn: () => base44.entities.Professional.list(),
  });

  const validPros = professionals.filter(p => p.latitude && p.longitude);
  const defaultCenter = [48.8566, 2.3522]; // Paris

  return (
    <div className="relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-6 pb-3 bg-gradient-to-b from-background via-background/90 to-transparent">
        <h1 className="text-xl font-bold">Professionnels à proximité</h1>
        <p className="text-sm text-muted-foreground">
          {validPros.length} professionnel{validPros.length !== 1 ? 's' : ''} disponible{validPros.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Map */}
      {isLoading ? (
        <Skeleton className="w-full h-screen" />
      ) : (
        <MapContainer
          center={validPros.length ? [validPros[0].latitude, validPros[0].longitude] : defaultCenter}
          zoom={12}
          className="w-full h-screen"
          style={{ zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {validPros.map(pro => (
            <Marker key={pro.id} position={[pro.latitude, pro.longitude]}>
              <Popup>
                <div className="p-1 min-w-[180px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{pro.name}</p>
                      <p className="text-xs text-muted-foreground">{pro.category_name}</p>
                    </div>
                  </div>
                  {pro.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-medium">{pro.rating}</span>
                      {pro.reviews_count && (
                        <span className="text-xs text-muted-foreground">({pro.reviews_count} avis)</span>
                      )}
                    </div>
                  )}
                  {pro.phone && (
                    <a href={`tel:${pro.phone}`} className="flex items-center gap-1 mt-1 text-xs text-primary">
                      <Phone className="w-3 h-3" /> {pro.phone}
                    </a>
                  )}
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {pro.available ? '✅ Disponible' : '❌ Indisponible'}
                  </Badge>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}