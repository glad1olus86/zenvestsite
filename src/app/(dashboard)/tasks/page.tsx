import { prisma } from '@/lib/prisma';
import { formatDate, statusBadge } from '@/lib/utils';

export default async function TasksPage() {
  const tasks = await prisma.tasks.findMany({
    orderBy: { created_at: 'desc' },
    take: 50,
    include: { project: true },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Задачи</h1>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-muted font-medium">Описание</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Объект</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Статус</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Создана</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Выполнил</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 max-w-sm">
                    <p className="truncate">{t.description}</p>
                  </td>
                  <td className="py-3 px-4 text-muted">{t.project?.name || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-md border ${statusBadge(t.status)}`}>
                      {t.status === 'open' ? 'Открыта' : t.status === 'done' ? 'Выполнена' : 'Отклонена'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted text-xs font-mono">{formatDate(t.created_date)}</td>
                  <td className="py-3 px-4 text-muted text-xs">{t.completed_by || '—'}</td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Нет задач</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
