import React, { useMemo, useState } from 'react';
import {
  Check,
  DollarSign,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useLibrary } from '../store/libraryStore';
import { TransactionStatus } from '../types/library';
import {
  computeLiveFine,
  formatDateShort,
  formatRupiah,
  formatTimeOnly,
} from '../utils/formatters';
import { TransactionStatusText } from '../components/StatusIndicator';

interface AdminDashboardViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
  onNavigateReports: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNotify,
  onNavigateReports,
}) => {
  const {
    state,
    borrowBook,
    returnBook,
    renewLoan,
    fulfillReservation,
    cancelReservation,
    markFinePaid,
  } = useLibrary();

  const [statusFilter, setStatusFilter] = useState<'Semua' | TransactionStatus>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Circulation Desk Form
  const [quickBookId, setQuickBookId] = useState(() => state.books[0]?.id ?? '');
  const [quickMemberId, setQuickMemberId] = useState(() => state.members[0]?.id ?? '');

  const enrichedTransactions = useMemo(() => {
    return state.transactions.map((tx) => {
      const fineInfo = computeLiveFine(tx, state.settings.dailyFineRp);
      const effectiveStatus: TransactionStatus =
        fineInfo.isOverdue && tx.status === 'Dipinjam' ? 'Terlambat' : tx.status;
      return {
        ...tx,
        effectiveStatus,
        overdueDays: fineInfo.overdueDays,
        liveFine: fineInfo.liveFine,
      };
    });
  }, [state.transactions, state.settings.dailyFineRp]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedTransactions.filter((tx) => {
      if (statusFilter !== 'Semua' && tx.effectiveStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        tx.transactionCode.toLowerCase().includes(q) ||
        tx.bookTitle.toLowerCase().includes(q) ||
        tx.memberName.toLowerCase().includes(q) ||
        tx.memberCode.toLowerCase().includes(q)
      );
    });
  }, [enrichedTransactions, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const activeLoans = enrichedTransactions.filter(
      (t) => t.effectiveStatus === 'Dipinjam' || t.effectiveStatus === 'Terlambat'
    ).length;
    const overdueCount = enrichedTransactions.filter(
      (t) => t.effectiveStatus === 'Terlambat'
    ).length;
    const reservationQueue = enrichedTransactions.filter(
      (t) => t.effectiveStatus === 'Menunggu' || t.effectiveStatus === 'Tersedia Diambil'
    ).length;
    const unpaidFines = enrichedTransactions.reduce(
      (sum, t) => sum + (!t.finePaid ? t.liveFine : 0),
      0
    );
    return { activeLoans, overdueCount, reservationQueue, unpaidFines };
  }, [enrichedTransactions]);

  const handleQuickBorrow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBookId || !quickMemberId) {
      onNotify('Pilih buku dan anggota terlebih dahulu.', true);
      return;
    }
    const res = borrowBook(quickBookId, quickMemberId, 'Admin');
    onNotify(res.message, !res.ok);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-800">
            Pusat Kendali Pustakawan · Sinkronisasi Antar-Tab Aktif
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Dashboard Admin & Monitor Sirkulasi Real-Time
          </h1>
        </div>
        <button
          type="button"
          onClick={onNavigateReports}
          className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          Buka Pelaporan Otomatis
        </button>
      </div>

      {/* 4-column Admin KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs text-slate-500">Peminjaman Aktif</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics.activeLoans}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Keterlambatan Berjalan</p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
              metrics.overdueCount > 0 ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {metrics.overdueCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Antrean Reservasi</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {metrics.reservationQueue}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Denda Belum Lunas</p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
              metrics.unpaidFines > 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatRupiah(metrics.unpaidFines)}
          </p>
        </div>
      </section>

      {/* Quick Circulation Desk */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Meja Sirkulasi Cepat (Catat Peminjaman Langsung)
        </h2>
        <form onSubmit={handleQuickBorrow} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label htmlFor="quick-book" className="block text-xs text-slate-500 mb-1">
              Pilih Judul Koleksi
            </label>
            <select
              id="quick-book"
              value={quickBookId}
              onChange={(e) => setQuickBookId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
            >
              {state.books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} (Sisa {b.availableCopies}/{b.totalCopies})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <label htmlFor="quick-member" className="block text-xs text-slate-500 mb-1">
              Pilih Anggota Peminjam
            </label>
            <select
              id="quick-member"
              value={quickMemberId}
              onChange={(e) => setQuickMemberId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-800 focus:outline-none"
            >
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.memberCode}) · {m.status}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Terbitkan Peminjaman</span>
            </button>
          </div>
        </form>
      </section>

      {/* Main Split: Live Transactions Table + Live Activity Stream */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Monitor Transaksi Sirkulasi
              </h2>
              <p className="text-xs text-slate-500">
                Pembaruan otomatis secara real-time saat anggota meminjam atau mengembalikan buku.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode, buku, anggota..."
                className="w-full rounded-md border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-1.5">
            {(
              [
                'Semua',
                'Dipinjam',
                'Terlambat',
                'Menunggu',
                'Tersedia Diambil',
                'Dikembalikan',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">Transaksi</th>
                  <th className="py-3 px-4 font-medium">Buku & Anggota</th>
                  <th className="py-3 px-4 font-medium">Jatuh Tempo</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Denda</th>
                  <th className="py-3 px-4 font-medium text-right">Aksi Pustakawan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Tidak ada transaksi yang sesuai dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        <div>{tx.transactionCode}</div>
                        <div className="text-[11px] text-slate-400">
                          {formatDateShort(tx.borrowedAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-medium text-slate-900 truncate">{tx.bookTitle}</div>
                        <div className="text-slate-500 truncate">
                          {tx.memberName} · <span className="font-mono">{tx.memberCode}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {formatDateShort(tx.dueDate)}
                        {tx.overdueDays > 0 && (
                          <div className="text-[11px] text-red-700 font-sans">
                            +{tx.overdueDays} hari lewat
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <TransactionStatusText status={tx.effectiveStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {tx.liveFine > 0 ? (
                          <span className={tx.finePaid ? 'text-emerald-700' : 'text-red-700 font-semibold'}>
                            {formatRupiah(tx.liveFine)}
                            <span className="block text-[10px] font-sans font-normal">
                              {tx.finePaid ? 'Lunas' : 'Belum lunas'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Rp 0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {(tx.effectiveStatus === 'Dipinjam' ||
                            tx.effectiveStatus === 'Terlambat') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = renewLoan(tx.id, 'Admin');
                                  onNotify(res.message, !res.ok);
                                }}
                                title="Perpanjang masa pinjam"
                                className="p-1.5 text-slate-600 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = returnBook(tx.id, 'Admin');
                                  onNotify(res.message, !res.ok);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Kembali</span>
                              </button>
                            </>
                          )}

                          {(tx.effectiveStatus === 'Menunggu' ||
                            tx.effectiveStatus === 'Tersedia Diambil') && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = fulfillReservation(tx.id);
                                  onNotify(res.message, !res.ok);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-emerald-900 rounded hover:bg-emerald-800 cursor-pointer"
                              >
                                <Check className="h-3 w-3" />
                                <span>Serahkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const res = cancelReservation(tx.id, 'Admin');
                                  onNotify(res.message, !res.ok);
                                }}
                                title="Batalkan reservasi"
                                className="p-1.5 text-red-700 border border-red-200 rounded hover:bg-red-50 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {tx.liveFine > 0 && !tx.finePaid && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = markFinePaid(tx.id);
                                onNotify(res.message, !res.ok);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 cursor-pointer"
                            >
                              <DollarSign className="h-3 w-3" />
                              <span>Lunasi</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Audit Stream */}
        <section className="xl:col-span-4 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col max-h-[680px]">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Log Aktivitas Real-Time
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Sinkron terakhir {formatTimeOnly(state.lastSyncedAt)}
              </p>
            </div>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {state.activityLogs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-slate-800">
                    {log.actorRole} · {log.action}
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums shrink-0">
                    {formatTimeOnly(log.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{log.detail}</p>
                {log.txCode && (
                  <p className="font-mono text-[11px] text-slate-400">{log.txCode}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
