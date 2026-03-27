import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatCurrency, formatDate, statusBadge } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ObjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) notFound();

  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    include: {
      daily_reports: { orderBy: { report_date: 'desc' }, take: 10 },
      receipts: { where: { recognition_status: 'success' }, orderBy: { created_at: 'desc' }, take: 10 },
      tasks: { orderBy: { created_at: 'desc' }, take: 10 },
      worker_hours: { orderBy: { work_date: 'desc' }, take: 20 },
    },
  });

  if (!project) notFound();

  const totalSpent = project.receipts.reduce(
    (sum, r) => sum + (r.amount_czk?.toNumber() ?? 0),
    0
  );
  const totalHours = project.worker_hours.reduce(
    (sum, h) => sum + (h.hours?.toNumber() ?? 0),
    0
  );
  const budgetPercent = project.budget_czk.toNumber() > 0
    ? Math.min(100, (totalSpent / project.budget_czk.toNumber()) * 100)
    : 0;
  const hoursPercent = project.allocated_hours.toNumber() > 0
    ? Math.min(100, (totalHours / project.allocated_hours.toNumber()) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/objects" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        К объектам
      </Link>

      {/* Header */}
      <div className="glass p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.address && <p className="text-muted mt-1">{project.address}</p>}
            <p className="text-xs text-muted mt-2">Начало: {formatDate(project.start_date)}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-md border ${statusBadge(project.status)}`}>
            {project.status === 'active' ? 'Активен' : 'Архив'}
          </span>
        </div>

        {/* Progress bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">Бюджет</span>
              <span className="font-mono">
                {formatCurrency(totalSpent)} / {formatCurrency(project.budget_czk)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">Часы</span>
              <span className="font-mono">
                {totalHours.toFixed(1)} / {project.allocated_hours.toString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${hoursPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reports + Receipts + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports */}
        <div className="glass p-5">
          <h2 className="text-lg font-semibold mb-4">Отчёты ({project.daily_reports.length})</h2>
          <div className="space-y-3">
            {project.daily_reports.map((r) => (
              <div key={r.id} className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-muted mb-1">{formatDate(r.report_date)}</p>
                {r.done_block && (
                  <p className="text-sm line-clamp-2">{r.done_block}</p>
                )}
              </div>
            ))}
            {project.daily_reports.length === 0 && (
              <p className="text-muted text-sm">Нет отчётов</p>
            )}
          </div>
        </div>

        {/* Receipts */}
        <div className="glass p-5">
          <h2 className="text-lg font-semibold mb-4">Чеки ({project.receipts.length})</h2>
          <div className="space-y-3">
            {project.receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <p className="text-sm font-medium">{r.shop || r.category || 'Чек'}</p>
                  <p className="text-xs text-muted">{formatDate(r.receipt_date)}</p>
                </div>
                <span className="font-mono text-sm">{formatCurrency(r.amount_czk)}</span>
              </div>
            ))}
            {project.receipts.length === 0 && (
              <p className="text-muted text-sm">Нет чеков</p>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="glass p-5">
          <h2 className="text-lg font-semibold mb-4">Задачи ({project.tasks.length})</h2>
          <div className="space-y-3">
            {project.tasks.map((t) => (
              <div key={t.id} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm line-clamp-2">{t.description}</p>
                  <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${statusBadge(t.status)}`}>
                    {t.status === 'open' ? 'Откр.' : t.status === 'done' ? 'Вып.' : 'Откл.'}
                  </span>
                </div>
              </div>
            ))}
            {project.tasks.length === 0 && (
              <p className="text-muted text-sm">Нет задач</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
