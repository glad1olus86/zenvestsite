export function formatCurrency(amount: number | string | { toNumber(): number } | null | undefined, currency = 'CZK'): string {
  const num = typeof amount === 'string' ? parseFloat(amount)
    : (amount && typeof amount === 'object' && 'toNumber' in amount) ? amount.toNumber()
    : (amount as number ?? 0);
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-400';
    case 'archived': return 'text-slate-500';
    case 'open': return 'text-amber-400';
    case 'done': return 'text-green-400';
    case 'rejected': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

export function statusBadge(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'archived': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'open': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'done': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}
