import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate, statusBadge } from '@/lib/utils';
import Link from 'next/link';

export default async function ObjectsPage() {
  const projects = await prisma.projects.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      _count: { select: { tasks: { where: { status: 'open' } } } },
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Объекты</h1>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-muted font-medium">Название</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Статус</th>
                <th className="text-right py-3 px-4 text-muted font-medium">Бюджет</th>
                <th className="text-right py-3 px-4 text-muted font-medium">Часы план</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Начало</th>
                <th className="text-center py-3 px-4 text-muted font-medium">Задачи</th>
                <th className="text-right py-3 px-4 text-muted font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-md border ${statusBadge(p.status)}`}>
                      {p.status === 'active' ? 'Активен' : 'Архив'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(p.budget_czk)}</td>
                  <td className="py-3 px-4 text-right font-mono">{p.allocated_hours?.toString() ?? '0'}</td>
                  <td className="py-3 px-4 text-muted">{formatDate(p.start_date)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-amber-400 font-mono">{p._count.tasks}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/objects/${p.id}`}
                      className="text-accent hover:text-accent-hover text-xs font-medium transition-colors"
                    >
                      Детали
                    </Link>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">Нет объектов</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
