import { Transaction } from '../types/library';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function getDaysRemaining(dueDateIso: string, now = new Date()): number {
  const due = new Date(dueDateIso);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function computeLiveFine(
  tx: Transaction,
  dailyFineRp: number,
  now = new Date()
): { overdueDays: number; liveFine: number; isOverdue: boolean } {
  if (tx.status === 'Dikembalikan' || tx.status === 'Dibatalkan' || tx.status === 'Menunggu' || tx.status === 'Tersedia Diambil') {
    return {
      overdueDays: 0,
      liveFine: tx.fineAmount,
      isOverdue: false,
    };
  }
  const due = new Date(tx.dueDate);
  const diffMs = now.getTime() - due.getTime();
  if (diffMs <= 0) {
    return { overdueDays: 0, liveFine: tx.fineAmount, isOverdue: false };
  }
  const overdueDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return {
    overdueDays,
    liveFine: Math.max(tx.fineAmount, overdueDays * dailyFineRp),
    isOverdue: true,
  };
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]): void {
  const escapeCell = (cell: string | number | boolean): string => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
