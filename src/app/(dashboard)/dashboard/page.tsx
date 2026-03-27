import { prisma } from '@/lib/prisma';
import { Building2, Truck, CheckSquare, Wallet } from 'lucide-react';
import { formatCurrency, formatDate, statusBadge } from '@/lib/utils';

async function getStats() {
  const activeProjects = await prisma.projects.count({ where: { status: 'active' } });
  const totalBudget = await prisma.projects.aggregate({
    where: { status: 'active' },
    _sum: { budget_czk: true },
  });
  const openTasks = await prisma.tasks.count({ where: { status: 'open' } });
  const recentReports = await prisma.daily_reports.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { project: true },
  });
  const recentTasks = await prisma.tasks.findMany({
    where: { status: 'open' },
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { project: true },
  });

  return {
    activeProjects,
    totalBudget: totalBudget._sum.budget_czk?.toNumber() ?? 0,
    openTasks,
    recentReports,
    recentTasks,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: 'Активных объектов',
      value: stats.activeProjects,
      icon: Building2,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Машин на линии',
      value: 0,
      icon: Truck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Открытых задач',
      value: stats.openTasks,
      icon: CheckSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Общий бюджет',
      value: formatCurrency(stats.totalBudget),
      icon: Wallet,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass p-5 glow-green-hover transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted">{card.label}</span>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon size={18} className={card.color} />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Two columns: Reports + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="glass p-5">
          <h2 className="text-lg font-semibold mb-4">Последние отчёты</h2>
          {stats.recentReports.length === 0 ? (
            <p className="text-muted text-sm">Нет отчётов</p>
          ) : (
            <div className="space-y-3">
              {stats.recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{report.project?.name || 'Без объекта'}</p>
                    <p className="text-xs text-muted">{formatDate(report.report_date)}</p>
                  </div>
                  <span className="text-xs text-accent">Отчёт</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Tasks */}
        <div className="glass p-5">
          <h2 className="text-lg font-semibold mb-4">Открытые задачи</h2>
          {stats.recentTasks.length === 0 ? (
            <p className="text-muted text-sm">Нет открытых задач</p>
          ) : (
            <div className="space-y-3">
              {stats.recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.description}</p>
                    <p className="text-xs text-muted">{task.project?.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md border ${statusBadge(task.status)}`}>
                    {task.status === 'open' ? 'Открыта' : task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
