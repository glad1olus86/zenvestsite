'use client';

import { X, Clock, Car } from 'lucide-react';
import type { GeoZone } from './MapContainer';
import type { VehicleTrack } from './TrackPolylines';

interface Props {
  zone: GeoZone;
  tracks: VehicleTrack[];
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

export default function GeoZoneHistoryPopup({ zone, tracks, onClose }: Props) {
  // Find all sessions for this geozone across all vehicles
  const sessions = tracks.flatMap((track) =>
    track.geozoneSessions
      .filter((s) => s.geozoneId === zone.id)
      .map((s) => ({ ...s, vehicleName: track.name, vehicleColor: track.color }))
  );

  const totalHours = sessions.reduce((sum, s) => sum + (s.hours || 0), 0);

  return (
    <div className="absolute bottom-4 right-4 z-[1000] w-80 animate-fade-in rounded-xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div>
          <h3 className="font-bold text-sm">{zone.name}</h3>
          <div className="text-xs text-muted mt-0.5">История посещений</div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-foreground transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted">
          Нет посещений за этот день
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <Car size={12} className="text-muted" />
              <span className="font-mono font-bold">{sessions.length}</span>
              <span className="text-muted">визит{sessions.length === 1 ? '' : sessions.length < 5 ? 'а' : 'ов'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Clock size={12} className="text-muted" />
              <span className="font-mono font-bold">{Math.round(totalHours * 10) / 10}</span>
              <span className="text-muted">ч всего</span>
            </div>
          </div>

          {/* Sessions list */}
          <div className="p-3 max-h-60 overflow-y-auto space-y-2">
            {sessions.map((session, i) => (
              <div key={i} className="flex items-start gap-3 px-2 py-2 rounded-lg bg-white/[0.03]">
                <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: session.vehicleColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{session.vehicleName}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {formatTime(session.enterTime)}
                    {session.exitTime ? ` → ${formatTime(session.exitTime)}` : ' → в зоне'}
                  </div>
                </div>
                <div className="text-xs font-mono shrink-0" style={{ color: session.vehicleColor }}>
                  {session.hours != null ? `${session.hours} ч` : '...'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
