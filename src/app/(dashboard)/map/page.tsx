'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface rounded-xl">
      <div className="text-muted text-sm animate-pulse">Загрузка карты...</div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="-m-6 h-[calc(100vh-4rem)]">
      <MapView />
    </div>
  );
}
