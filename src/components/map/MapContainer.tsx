'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer as LeafletMap, TileLayer, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ZoneSidebar from './ZoneSidebar';
import CreateZoneWizard from './CreateZoneWizard';
import EditZonePanel from './EditZonePanel';
import VehicleMarkers from './VehicleMarkers';
import TrackPolylines from './TrackPolylines';
import type { VehicleTrack } from './TrackPolylines';
import HistoryControls from './HistoryControls';
import GeoZoneHistoryPopup from './GeoZoneHistoryPopup';
import { Plus, Radio, History } from 'lucide-react';

export interface GeoZone {
  id: number;
  name: string;
  type: string;
  project_id: number | null;
  lat: number;
  lng: number;
  radius_m: number;
  project: {
    id: number;
    name: string;
    status: string;
    address: string | null;
  } | null;
}

const ZONE_COLORS: Record<string, string> = {
  project: '#22C55E',
  shop: '#3B82F6',
  warehouse: '#F59E0B',
  other: '#8B5CF6',
};

function getZoneColor(zone: GeoZone): string {
  if (zone.type === 'project' && zone.project?.status !== 'active') return '#64748B';
  return ZONE_COLORS[zone.type] || '#64748B';
}

interface Project {
  id: number;
  name: string;
  status: string;
  address: string | null;
}

// Fix Leaflet marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ zones }: { zones: GeoZone[] }) {
  const map = useMap();
  useEffect(() => {
    if (zones.length === 0) return;
    const bounds = L.latLngBounds(zones.map((z) => [Number(z.lat), Number(z.lng)]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [zones, map]);
  return null;
}

type MapMode = 'live' | 'history';

export default function MapView() {
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedZone, setSelectedZone] = useState<GeoZone | null>(null);
  const [creating, setCreating] = useState(false);
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [editing, setEditing] = useState<GeoZone | null>(null);

  // Map mode: live or history
  const [mode, setMode] = useState<MapMode>('live');
  const [historyDate, setHistoryDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [historyTracks, setHistoryTracks] = useState<VehicleTrack[]>([]);
  const [visibleVehicles, setVisibleVehicles] = useState<Set<number>>(new Set());

  const fetchZones = useCallback(async () => {
    const res = await fetch('/api/geozones');
    const data = await res.json();
    setZones(data);
  }, []);

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  }, []);

  useEffect(() => {
    fetchZones();
    fetchProjects();
  }, [fetchZones, fetchProjects]);

  const handleMapClick = (lat: number, lng: number) => {
    if (creating) {
      setClickedPos({ lat, lng });
    } else {
      setSelectedZone(null);
      setEditing(null);
      setHistoryZone(null);
    }
  };

  const [historyZone, setHistoryZone] = useState<GeoZone | null>(null);

  const handleZoneClick = (zone: GeoZone) => {
    if (creating) return;
    if (mode === 'history') {
      // In history mode — show geozone visit popup
      setHistoryZone(zone);
      setSelectedZone(null);
    } else {
      setSelectedZone(zone);
      setHistoryZone(null);
    }
    setEditing(null);
  };

  const handleCreateDone = () => {
    setCreating(false);
    setClickedPos(null);
    fetchZones();
  };

  const handleEditDone = () => {
    setEditing(null);
    setSelectedZone(null);
    fetchZones();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/geozones/${id}`, { method: 'DELETE' });
    setSelectedZone(null);
    setEditing(null);
    fetchZones();
  };

  const handleTracksLoaded = useCallback((tracks: VehicleTrack[]) => {
    setHistoryTracks(tracks);
    // Show all vehicles by default
    setVisibleVehicles(new Set(tracks.map((t) => t.vehicleId)));
  }, []);

  const handleToggleVehicle = (id: number) => {
    setVisibleVehicles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const switchMode = (newMode: MapMode) => {
    setMode(newMode);
    setCreating(false);
    setClickedPos(null);
    setSelectedZone(null);
    setEditing(null);
    setHistoryZone(null);
  };

  // Prague center as default
  const center: [number, number] = zones.length > 0
    ? [Number(zones[0].lat), Number(zones[0].lng)]
    : [50.0755, 14.4378];

  return (
    <div className="relative w-full h-full">
      <LeafletMap
        center={center}
        zoom={12}
        zoomControl={false}
        className="w-full h-full z-0"
        style={{ background: '#E2E8F0' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zones.length > 0 && <FitBounds zones={zones} />}

        <ClickHandler onClick={handleMapClick} />

        {/* Geozones (always visible) */}
        {zones.map((zone) => {
          const color = getZoneColor(zone);
          return (
            <Circle
              key={zone.id}
              center={[Number(zone.lat), Number(zone.lng)]}
              radius={zone.radius_m}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 2,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  handleZoneClick(zone);
                },
              }}
            />
          );
        })}

        {/* Live mode: vehicle markers */}
        {mode === 'live' && <VehicleMarkers />}

        {/* History mode: track polylines */}
        {mode === 'history' && (
          <TrackPolylines
            date={historyDate}
            visibleVehicles={visibleVehicles}
            onDataLoaded={handleTracksLoaded}
          />
        )}

        {/* Preview circle while creating */}
        {creating && clickedPos && (
          <Circle
            center={[clickedPos.lat, clickedPos.lng]}
            radius={500}
            pathOptions={{
              color: '#F59E0B',
              fillColor: '#F59E0B',
              fillOpacity: 0.2,
              weight: 2,
              dashArray: '8 4',
            }}
          />
        )}
      </LeafletMap>

      {/* Top bar — mode toggle + action buttons */}
      <div className="absolute top-4 left-4 z-[1000] flex gap-2">
        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 shadow-lg"
          style={{ background: 'rgba(15, 23, 42, 0.95)' }}>
          <button
            onClick={() => switchMode('live')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              mode === 'live'
                ? 'bg-accent text-white'
                : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            <Radio size={14} />
            Live
          </button>
          <button
            onClick={() => switchMode('history')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              mode === 'history'
                ? 'bg-accent text-white'
                : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
          >
            <History size={14} />
            История
          </button>
        </div>

        {/* Create geozone button (only in live mode) */}
        {mode === 'live' && !creating && (
          <button
            onClick={() => { setCreating(true); setSelectedZone(null); setEditing(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover
              text-white text-sm font-medium transition-all cursor-pointer shadow-lg"
          >
            <Plus size={16} />
            Новая геозона
          </button>
        )}

        {mode === 'live' && creating && (
          <button
            onClick={() => { setCreating(false); setClickedPos(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600
              text-white text-sm font-medium transition-all cursor-pointer shadow-lg"
          >
            Отмена
          </button>
        )}
      </div>

      {/* Creating hint */}
      {creating && !clickedPos && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]
          px-6 py-3 text-sm text-amber-400 font-medium shadow-lg rounded-xl border border-white/10"
          style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>
          Кликните на карту, чтобы выбрать центр геозоны
        </div>
      )}

      {/* Create wizard */}
      {creating && clickedPos && (
        <CreateZoneWizard
          lat={clickedPos.lat}
          lng={clickedPos.lng}
          projects={projects}
          onDone={handleCreateDone}
          onCancel={() => { setCreating(false); setClickedPos(null); }}
        />
      )}

      {/* Zone sidebar (view) */}
      {selectedZone && !editing && (
        <ZoneSidebar
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
          onEdit={() => setEditing(selectedZone)}
          onDelete={() => handleDelete(selectedZone.id)}
        />
      )}

      {/* Edit panel */}
      {editing && (
        <EditZonePanel
          zone={editing}
          onDone={handleEditDone}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* History controls panel */}
      {mode === 'history' && (
        <HistoryControls
          date={historyDate}
          onDateChange={setHistoryDate}
          tracks={historyTracks}
          visibleVehicles={visibleVehicles}
          onToggleVehicle={handleToggleVehicle}
        />
      )}

      {/* Geozone history popup (shows vehicle visits when clicking a geozone in history mode) */}
      {mode === 'history' && historyZone && (
        <GeoZoneHistoryPopup
          zone={historyZone}
          tracks={historyTracks}
          onClose={() => setHistoryZone(null)}
        />
      )}
    </div>
  );
}
