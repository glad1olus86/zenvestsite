'use client';

import { Calendar, Eye, EyeOff, Route, Clock, MapPin } from 'lucide-react';
import type { VehicleTrack } from './TrackPolylines';

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  tracks: VehicleTrack[];
  visibleVehicles: Set<number>;
  onToggleVehicle: (id: number) => void;
}

export default function HistoryControls({ date, onDateChange, tracks, visibleVehicles, onToggleVehicle }: Props) {
  // Summary stats
  const totalKm = tracks.reduce((sum, t) => sum + (visibleVehicles.has(t.vehicleId) ? t.totalDistanceKm : 0), 0);
  const totalHours = tracks.reduce((sum, t) => sum + (visibleVehicles.has(t.vehicleId) ? t.totalGeoHours : 0), 0);
  const totalPoints = tracks.reduce((sum, t) => sum + (visibleVehicles.has(t.vehicleId) ? t.points.length : 0), 0);

  return (
    <div className="absolute top-16 left-4 z-[1000] w-72 animate-fade-in rounded-xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>

      {/* Date picker */}
      <div className="p-4 border-b border-white/5">
        <label className="flex items-center gap-2 text-xs text-muted mb-2">
          <Calendar size={12} />
          Дата
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10
            text-foreground text-sm outline-none focus:border-accent/50 transition-all cursor-pointer
            [color-scheme:dark]"
        />
      </div>

      {/* Stats */}
      {tracks.length > 0 && (
        <div className="px-4 py-3 border-b border-white/5 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted mb-0.5">
              <Route size={10} />
              Км
            </div>
            <div className="text-sm font-mono font-bold">{Math.round(totalKm * 10) / 10}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted mb-0.5">
              <Clock size={10} />
              Часы
            </div>
            <div className="text-sm font-mono font-bold">{Math.round(totalHours * 10) / 10}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted mb-0.5">
              <MapPin size={10} />
              Точки
            </div>
            <div className="text-sm font-mono font-bold">{totalPoints}</div>
          </div>
        </div>
      )}

      {/* Vehicle list */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="text-center text-xs text-muted py-4">
            Нет данных за выбранную дату
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track) => {
              const isVisible = visibleVehicles.has(track.vehicleId);
              return (
                <button
                  key={track.vehicleId}
                  onClick={() => onToggleVehicle(track.vehicleId)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                    transition-all cursor-pointer ${
                    isVisible ? 'bg-white/5' : 'bg-transparent opacity-50'
                  } hover:bg-white/10`}
                >
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: track.color }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{track.name}</div>
                    <div className="text-[10px] text-muted">
                      {track.totalDistanceKm} км | {track.points.length} точек
                    </div>
                  </div>
                  {/* Toggle icon */}
                  {isVisible ? (
                    <Eye size={14} className="shrink-0 text-muted" />
                  ) : (
                    <EyeOff size={14} className="shrink-0 text-muted" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Geozone sessions */}
      {tracks.some((t) => t.geozoneSessions.length > 0 && visibleVehicles.has(t.vehicleId)) && (
        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Геозоны</div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {tracks
              .filter((t) => visibleVehicles.has(t.vehicleId))
              .flatMap((t) =>
                t.geozoneSessions.map((s, i) => (
                  <div key={`${t.vehicleId}-${i}`} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="truncate flex-1">{s.geozone}</span>
                    <span className="text-muted font-mono shrink-0">
                      {s.hours != null ? `${s.hours}ч` : 'в зоне'}
                    </span>
                  </div>
                ))
              )}
          </div>
        </div>
      )}
    </div>
  );
}
