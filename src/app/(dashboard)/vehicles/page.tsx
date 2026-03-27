'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Truck, Wifi, WifiOff } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface Worker {
  id: number;
  name: string;
  worker_type: string;
}

interface Vehicle {
  id: number;
  name: string;
  license_plate: string | null;
  vin: string | null;
  gps_device_id: string | null;
  worker_id: number | null;
  status: string;
  worker: Worker | null;
  lastPosition: { lat: number; lng: number; speed: number | null; recorded_at: string } | null;
  online: boolean;
}

interface FormData {
  name: string;
  license_plate: string;
  vin: string;
  gps_device_id: string;
  worker_id: string;
}

const emptyForm: FormData = { name: '', license_plate: '', vin: '', gps_device_id: '', worker_id: '' };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchVehicles = useCallback(async () => {
    const res = await fetch('/api/vehicles');
    setVehicles(await res.json());
  }, []);

  const fetchWorkers = useCallback(async () => {
    const res = await fetch('/api/workers');
    setWorkers(await res.json());
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchWorkers();
  }, [fetchVehicles, fetchWorkers]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (v: Vehicle) => {
    setForm({
      name: v.name,
      license_plate: v.license_plate || '',
      vin: v.vin || '',
      gps_device_id: v.gps_device_id || '',
      worker_id: v.worker_id ? String(v.worker_id) : '',
    });
    setEditingId(v.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const body = {
      name: form.name.trim(),
      license_plate: form.license_plate.trim(),
      vin: form.vin.trim(),
      gps_device_id: form.gps_device_id.trim(),
      worker_id: form.worker_id ? Number(form.worker_id) : null,
    };

    if (editingId) {
      await fetch(`/api/vehicles/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    setShowForm(false);
    fetchVehicles();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить машину?')) return;
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    fetchVehicles();
  };

  const technicians = workers.filter((w) => w.worker_type === 'technician' || w.worker_type === 'junior_technician');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Машины / Сотрудники</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover
            text-white text-sm font-medium transition-all cursor-pointer"
        >
          <Plus size={16} />
          Добавить машину
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="glass p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Редактирование' : 'Новая машина'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-muted hover:text-foreground cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1">Название *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Škoda Octavia #1"
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground outline-none focus:border-accent/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Гос. номер</label>
              <input
                value={form.license_plate}
                onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                placeholder="1A2 3456"
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground outline-none focus:border-accent/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">VIN (для GPS)</label>
              <input
                value={form.vin}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
                placeholder="TMBZZZAAZKD611337"
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground font-mono text-sm outline-none focus:border-accent/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Техник</label>
              <select
                value={form.worker_id}
                onChange={(e) => setForm({ ...form, worker_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10
                  text-foreground outline-none focus:border-accent/50 transition-all cursor-pointer"
              >
                <option value="" className="bg-surface">Не назначен</option>
                {technicians.map((w) => (
                  <option key={w.id} value={w.id} className="bg-surface">{w.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover
                text-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editingId ? 'Сохранить' : 'Создать'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-all cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-muted font-medium">Машина</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Номер</th>
                <th className="text-left py-3 px-4 text-muted font-medium">VIN</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Техник</th>
                <th className="text-center py-3 px-4 text-muted font-medium">GPS</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Последняя позиция</th>
                <th className="text-right py-3 px-4 text-muted font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-muted" />
                      <span className="font-medium">{v.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted">{v.license_plate || '—'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted">{v.vin || '—'}</td>
                  <td className="py-3 px-4">{v.worker?.name || <span className="text-muted">—</span>}</td>
                  <td className="py-3 px-4 text-center">
                    {v.online ? (
                      <Wifi size={16} className="text-green-400 inline" />
                    ) : v.lastPosition ? (
                      <WifiOff size={16} className="text-slate-500 inline" />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted">
                    {v.lastPosition ? formatDateTime(v.lastPosition.recorded_at) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">Нет машин</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
