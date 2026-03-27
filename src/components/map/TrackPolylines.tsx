'use client';

import { useEffect, useState } from 'react';
import { Polyline, CircleMarker, Popup } from 'react-leaflet';

interface TrackPoint {
  lat: number;
  lng: number;
  speed: number;
  recordedAt: string;
}

interface GeoSession {
  geozoneId: number | null;
  geozone: string;
  type: string;
  enterTime: string;
  exitTime: string | null;
  hours: number | null;
  enterLat: number | null;
  enterLng: number | null;
  exitLat: number | null;
  exitLng: number | null;
}

export interface VehicleTrack {
  vehicleId: number;
  name: string;
  licensePlate: string | null;
  color: string;
  totalDistanceKm: number;
  totalGeoHours: number;
  points: TrackPoint[];
  geozoneSessions: GeoSession[];
}

interface Props {
  date: string;
  visibleVehicles: Set<number>;
  onDataLoaded: (tracks: VehicleTrack[]) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

/** Darken a hex color by a factor (0-1) */
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * (1 - factor)).toString(16).padStart(2, '0')}${Math.round(g * (1 - factor)).toString(16).padStart(2, '0')}${Math.round(b * (1 - factor)).toString(16).padStart(2, '0')}`;
}

export default function TrackPolylines({ date, visibleVehicles, onDataLoaded }: Props) {
  const [tracks, setTracks] = useState<VehicleTrack[]>([]);

  useEffect(() => {
    if (!date) return;

    const fetchTracks = async () => {
      try {
        const res = await fetch(`/api/gps/tracks?date=${date}`);
        if (res.ok) {
          const data: VehicleTrack[] = await res.json();
          setTracks(data);
          onDataLoaded(data);
        }
      } catch { /* ignore */ }
    };

    fetchTracks();
  }, [date, onDataLoaded]);

  return (
    <>
      {tracks
        .filter((t) => visibleVehicles.has(t.vehicleId))
        .map((track) => {
          if (track.points.length === 0) return null;

          const firstPoint = track.points[0];
          const lastPoint = track.points[track.points.length - 1];

          return (
            <span key={track.vehicleId}>
              {/* Full route polyline — all points including inside geozones */}
              <Polyline
                positions={track.points.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: track.color,
                  weight: 3,
                  opacity: 0.85,
                }}
              />

              {/* START marker — filled circle in vehicle color */}
              <CircleMarker
                center={[firstPoint.lat, firstPoint.lng]}
                radius={8}
                pathOptions={{
                  color: '#fff',
                  fillColor: track.color,
                  fillOpacity: 1,
                  weight: 2.5,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 150, color: '#0F172A' }}>
                    <strong>{track.name}</strong>
                    {track.licensePlate && <div style={{ fontSize: 11, color: '#64748B' }}>{track.licensePlate}</div>}
                    <div style={{ fontSize: 12, color: track.color, fontWeight: 700, marginTop: 2 }}>
                      Старт — {formatTime(firstPoint.recordedAt)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>

              {/* END marker — ring in vehicle color */}
              <CircleMarker
                center={[lastPoint.lat, lastPoint.lng]}
                radius={8}
                pathOptions={{
                  color: track.color,
                  fillColor: '#fff',
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 150, color: '#0F172A' }}>
                    <strong>{track.name}</strong>
                    {track.licensePlate && <div style={{ fontSize: 11, color: '#64748B' }}>{track.licensePlate}</div>}
                    <div style={{ fontSize: 12, color: track.color, fontWeight: 700, marginTop: 2 }}>
                      Конец — {formatTime(lastPoint.recordedAt)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {track.totalDistanceKm} км за день
                    </div>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Geozone ENTER markers */}
              {track.geozoneSessions.map((session, si) => {
                if (session.enterLat == null || session.enterLng == null) return null;
                return (
                  <CircleMarker
                    key={`enter-${track.vehicleId}-${si}`}
                    center={[session.enterLat, session.enterLng]}
                    radius={5}
                    pathOptions={{
                      color: track.color,
                      fillColor: track.color,
                      fillOpacity: 0.6,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160, color: '#0F172A' }}>
                        <strong>{track.name}</strong>
                        <div style={{ fontSize: 12, fontWeight: 600, color: track.color, marginTop: 2 }}>
                          Въезд → {session.geozone}
                        </div>
                        <div style={{ fontSize: 12 }}>
                          {formatTime(session.enterTime)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Geozone EXIT markers */}
              {track.geozoneSessions.map((session, si) => {
                if (!session.exitTime || session.exitLat == null || session.exitLng == null) return null;
                return (
                  <CircleMarker
                    key={`exit-${track.vehicleId}-${si}`}
                    center={[session.exitLat, session.exitLng]}
                    radius={5}
                    pathOptions={{
                      color: darken(track.color, 0.3),
                      fillColor: '#fff',
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160, color: '#0F172A' }}>
                        <strong>{track.name}</strong>
                        <div style={{ fontSize: 12, fontWeight: 600, color: darken(track.color, 0.3), marginTop: 2 }}>
                          Выезд ← {session.geozone}
                        </div>
                        <div style={{ fontSize: 12 }}>
                          {formatTime(session.exitTime)}
                          {session.hours != null && (
                            <span style={{ color: '#64748B' }}> ({session.hours} ч)</span>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </span>
          );
        })}
    </>
  );
}
