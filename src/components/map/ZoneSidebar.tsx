'use client';

import { X, Pencil, Trash2, MapPin, Ruler, Building2, ShoppingCart, Warehouse, MapPinned } from 'lucide-react';
import type { GeoZone } from './MapContainer';

interface Props {
  zone: GeoZone;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TYPE_META: Record<string, { label: string; icon: typeof Building2; color: string; bg: string; border: string }> = {
  project:   { label: 'Объект',   icon: Building2,    color: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/30' },
  shop:      { label: 'Магазин',  icon: ShoppingCart,  color: 'text-blue-400',   bg: 'bg-blue-500/20',   border: 'border-blue-500/30' },
  warehouse: { label: 'Склад',    icon: Warehouse,     color: 'text-amber-400',  bg: 'bg-amber-500/20',  border: 'border-amber-500/30' },
  other:     { label: 'Другое',   icon: MapPinned,     color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
};

export default function ZoneSidebar({ zone, onClose, onEdit, onDelete }: Props) {
  const meta = TYPE_META[zone.type] || TYPE_META.other;
  const Icon = meta.icon;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-80 z-[1000] p-5 flex flex-col gap-4 animate-fade-in overflow-y-auto rounded-xl border border-white/10"
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold truncate">{zone.name}</h2>
        <button onClick={onClose} className="text-muted hover:text-foreground transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </div>

      {/* Type badge */}
      <div className={`inline-flex w-fit items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${meta.bg} ${meta.color} ${meta.border}`}>
        <Icon size={12} />
        {meta.label}
      </div>

      {/* Project info (only for project type) */}
      {zone.project && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 size={14} className="shrink-0 text-muted" />
            <span>{zone.project.name}</span>
          </div>
          <div className={`inline-flex w-fit text-xs px-2 py-0.5 rounded-md border ${
            zone.project.status === 'active'
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>
            {zone.project.status === 'active' ? 'Активен' : 'Архив'}
          </div>
        </div>
      )}

      {zone.project?.address && (
        <div className="flex items-start gap-2 text-sm text-muted">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <span>{zone.project.address}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted">
        <Ruler size={14} className="shrink-0" />
        <span>Радиус: {zone.radius_m} м</span>
      </div>

      <div className="text-xs text-muted font-mono">
        {Number(zone.lat).toFixed(5)}, {Number(zone.lng).toFixed(5)}
      </div>

      <div className="flex-1" />

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            bg-white/5 hover:bg-white/10 text-sm font-medium transition-all cursor-pointer"
        >
          <Pencil size={14} />
          Редактировать
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
