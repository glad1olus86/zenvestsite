'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface VehiclePosition {
  vehicleId: number;
  name: string;
  licensePlate: string | null;
  driver: string | null;
  lat: number;
  lng: number;
  speed: number | null;
  recordedAt: string;
  online: boolean;
}

const onlineIcon = new L.DivIcon({
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: #22C55E; border: 3px solid #fff;
    box-shadow: 0 0 10px rgba(34,197,94,0.6);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.3s ease;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
      <path d="M5 17h2l2-8h6l2 8h2M7 17a2 2 0 1 0 4 0M13 17a2 2 0 1 0 4 0"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const offlineIcon = new L.DivIcon({
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #64748B; border: 3px solid #94A3B8;
    display: flex; align-items: center; justify-content: center;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
      <path d="M5 17h2l2-8h6l2 8h2M7 17a2 2 0 1 0 4 0M13 17a2 2 0 1 0 4 0"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * Smoothly animated vehicle marker that transitions to new positions.
 */
function AnimatedMarker({ position, icon, children }: {
  position: VehiclePosition;
  icon: L.DivIcon;
  children: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker>(null);
  const prevPos = useRef<[number, number]>([position.lat, position.lng]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const newPos: [number, number] = [position.lat, position.lng];
    const [prevLat, prevLng] = prevPos.current;

    // Only animate if position actually changed
    if (Math.abs(prevLat - newPos[0]) > 0.00001 || Math.abs(prevLng - newPos[1]) > 0.00001) {
      // Smooth slide animation over 1 second
      const steps = 20;
      const dLat = (newPos[0] - prevLat) / steps;
      const dLng = (newPos[1] - prevLng) / steps;
      let step = 0;

      const animate = () => {
        step++;
        const lat = prevLat + dLat * step;
        const lng = prevLng + dLng * step;
        marker.setLatLng([lat, lng]);
        if (step < steps) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
      prevPos.current = newPos;
    }
  }, [position.lat, position.lng]);

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={icon}
    >
      {children}
    </Marker>
  );
}

const POLL_INTERVAL = 30_000; // 30 seconds

export default function VehicleMarkers() {
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const map = useMap();

  const fetchPositions = useCallback(async () => {
    try {
      // Cache-bust to ensure fresh data every time
      const res = await fetch(`/api/gps/latest?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(data);
        setLastUpdate(new Date());
      }
    } catch { /* GPS not available */ }
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Auto-fit to vehicle positions on first load
  useEffect(() => {
    if (positions.length > 0 && lastUpdate && !prevHadPositions.current) {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      prevHadPositions.current = true;
    }
  }, [positions, lastUpdate, map]);

  const prevHadPositions = useRef(false);

  if (positions.length === 0) return null;

  return (
    <>
      {positions.map((pos) => (
        <AnimatedMarker
          key={pos.vehicleId}
          position={pos}
          icon={pos.online ? onlineIcon : offlineIcon}
        >
          <Popup>
            <div style={{ minWidth: 160, color: '#0F172A' }}>
              <strong>{pos.name}</strong>
              {pos.licensePlate && <div style={{ fontSize: 12, color: '#64748B' }}>{pos.licensePlate}</div>}
              {pos.driver && <div style={{ fontSize: 12 }}>Техник: {pos.driver}</div>}
              {pos.speed != null && pos.speed > 0 && (
                <div style={{ fontSize: 12 }}>Скорость: {pos.speed} км/ч</div>
              )}
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                GPS: {new Date(pos.recordedAt).toLocaleString('cs-CZ')}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, marginTop: 2,
                color: pos.online ? '#22C55E' : '#64748B'
              }}>
                {pos.online ? '● Online' : '○ Offline'}
              </div>
            </div>
          </Popup>
        </AnimatedMarker>
      ))}

      {/* Update indicator */}
      {lastUpdate && (
        <div
          className="leaflet-bottom leaflet-right"
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            color: '#94A3B8',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 6,
            margin: 10,
          }}>
            Обновлено: {lastUpdate.toLocaleTimeString('cs-CZ')}
          </div>
        </div>
      )}
    </>
  );
}
