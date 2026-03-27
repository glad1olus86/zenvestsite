'use client';

import { useState } from 'react';
import { Loader2, Save, X, Building2, ShoppingCart, Warehouse, MapPinned } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  status: string;
}

interface Props {
  lat: number;
  lng: number;
  projects: Project[];
  onDone: () => void;
  onCancel: () => void;
}

const ZONE_TYPES = [
  { value: 'project', label: 'Объект', icon: Building2, color: '#22C55E' },
  { value: 'shop', label: 'Магазин', icon: ShoppingCart, color: '#3B82F6' },
  { value: 'warehouse', label: 'Склад', icon: Warehouse, color: '#F59E0B' },
  { value: 'other', label: 'Другое', icon: MapPinned, color: '#8B5CF6' },
] as const;

export default function CreateZoneWizard({ lat, lng, projects, onDone, onCancel }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('project');
  const [radius, setRadius] = useState(500);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const activeProjects = projects.filter((p) => p.status === 'active');
  const needsProject = type === 'project';
  const canSave = name.trim() && (!needsProject || projectId);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    await fetch('/api/geozones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        type,
        project_id: needsProject ? projectId : null,
        lat,
        lng,
        radius_m: radius,
      }),
    });

    setSaving(false);
    onDone();
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-96 p-5 animate-fade-in rounded-xl border border-white/10"
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Новая геозона</h3>
        <button onClick={onCancel} className="text-muted hover:text-foreground transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Zone name */}
        <div>
          <label className="block text-sm text-muted mb-1.5">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Напр. Bauhaus Čestlice"
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
              text-foreground placeholder:text-muted/50 outline-none focus:border-accent/50 transition-all"
          />
        </div>

        {/* Zone type */}
        <div>
          <label className="block text-sm text-muted mb-1.5">Тип</label>
          <div className="grid grid-cols-4 gap-2">
            {ZONE_TYPES.map((zt) => {
              const Icon = zt.icon;
              const isSelected = type === zt.value;
              return (
                <button
                  key={zt.value}
                  onClick={() => setType(zt.value)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium
                    transition-all cursor-pointer ${
                    isSelected
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/5'
                  }`}
                  style={isSelected ? { color: zt.color } : { color: '#94A3B8' }}
                >
                  <Icon size={18} />
                  {zt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Project select — only for type "project" */}
        {needsProject && (
          <div>
            <label className="block text-sm text-muted mb-1.5">Объект</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
                text-foreground outline-none focus:border-accent/50 transition-all cursor-pointer"
            >
              <option value="" className="bg-surface">Выберите объект...</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface">{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Radius slider */}
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
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>100 м</span>
            <span>2000 м</span>
          </div>
        </div>

        {/* Coordinates */}
        <div className="text-xs text-muted font-mono">
          Центр: {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg
            bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-all
            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={16} />
              Сохранить геозону
            </>
          )}
        </button>
      </div>
    </div>
  );
}
