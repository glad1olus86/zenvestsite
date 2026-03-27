import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

export default async function ReportsPage() {
  const reports = await prisma.daily_reports.findMany({
    orderBy: { report_date: 'desc' },
    take: 50,
    include: { project: true },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Отчёты</h1>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-muted font-medium">Дата</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Объект</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Выполнено</th>
                <th className="text-left py-3 px-4 text-muted font-medium">Требуется</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-muted font-mono text-xs">{formatDate(r.report_date)}</td>
                  <td className="py-3 px-4 font-medium">{r.project?.name || '—'}</td>
                  <td className="py-3 px-4 text-sm max-w-xs truncate">{r.done_block || '—'}</td>
                  <td className="py-3 px-4 text-sm max-w-xs truncate">{r.required_block || '—'}</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted">Нет отчётов</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
