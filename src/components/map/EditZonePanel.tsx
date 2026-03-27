'use client';

import { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import type { GeoZone } from './MapContainer';

interface Props {
  zone: GeoZone;
  onDone: () => void;
  onCancel: () => void;
}

export default function EditZonePanel({ zone, onDone, onCancel }: Props) {
  const [name, setName] = useState(zone.name);
  const [radius, setRadius] = useState(zone.radius_m);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await fetch(`/api/geozones/${zone.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), radius_m: radius }),
    });
    setSaving(false);
    onDone();
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-80 p-5 animate-fade-in rounded-xl border border-white/10"
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Редактирование</h3>
        <button onClick={onCancel} className="text-muted hover:text-foreground transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1.5">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
              text-foreground outline-none focus:border-accent/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            Радиус: <span className="text-foreground font-mono">{radius} м</span>
          </label>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg
            bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-all
            disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={16} />
              Сохранить
            </>
          )}
        </button>
      </div>
    </div>
  );
}
