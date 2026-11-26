import React, { useMemo } from 'react';
import { Bookmark, BookOpen, CreditCard, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useLibrary } from '../store/libraryStore';
import { Book } from '../types/library';
import {
  computeLiveFine,
  formatDateShort,
  formatRupiah,
  formatTimeOnly,
  getDaysRemaining,
} from '../utils/formatters';
import { BookCover } from '../components/BookCover';
import { MemberStatusText, TransactionStatusText } from '../components/StatusIndicator';

interface MemberDashboardViewProps {
  onSelectBook: (book: Book) => void;
  onOpenMemberCard: () => void;
  onNavigateCatalog: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const MemberDashboardView: React.FC<MemberDashboardViewProps> = ({
  onSelectBook,
  onOpenMemberCard,
  onNavigateCatalog,
  onNotify,
}) => {
  const {
    state,
    activeMember,
    returnBook,
    renewLoan,
    cancelReservation,
    toggleBookmark,
  } = useLibrary();

  const memberTransactions = useMemo(() => {
    if (!activeMember) return [];
    return state.transactions.filter((tx) => tx.memberId === activeMember.id);
  }, [state.transactions, activeMember]);

  const activeLoans = useMemo(
    () =>
      memberTransactions.filter(
        (tx) => tx.status === 'Dipinjam' || tx.status === 'Terlambat'
      ),
    [memberTransactions]
  );

  const reservations = useMemo(
    () =>
      memberTransactions.filter(
        (tx) => tx.status === 'Menunggu' || tx.status === 'Tersedia Diambil'
      ),
    [memberTransactions]
  );

  const historyTransactions = useMemo(
    () =>
      memberTransactions.filter(
        (tx) => tx.status === 'Dikembalikan' || tx.status === 'Dibatalkan'
      ),
    [memberTransactions]
  );

  const bookmarkedBooks = useMemo(() => {
    if (!activeMember) return [];
    const ids = state.bookmarks[activeMember.id] ?? [];
    return state.books.filter((b) => ids.includes(b.id));
  }, [state.books, state.bookmarks, activeMember]);

  const outstandingFines = useMemo(
    () =>
      memberTransactions.reduce((sum, tx) => {
        if (tx.finePaid) return sum;
        const { liveFine } = computeLiveFine(tx, state.settings.dailyFineRp);
        return sum + liveFine;
      }, 0),
    [memberTransactions, state.settings.dailyFineRp]
  );

  const memberLogs = useMemo(() => {
    if (!activeMember) return [];
    return state.activityLogs
      .filter((l) => l.detail.includes(activeMember.name) || l.actorName === activeMember.name)
      .slice(0, 8);
  }, [state.activityLogs, activeMember]);

  if (!activeMember) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-4">
        <p className="font-serif text-xl font-semibold text-slate-900">Belum ada anggota aktif</p>
        <button
          type="button"
          onClick={onOpenMemberCard}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer"
        >
          Pilih atau Daftarkan Anggota
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Member Identity Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="font-mono text-slate-700">{activeMember.memberCode}</span>
            <span aria-hidden="true">·</span>
            <span>Paket {activeMember.tier}</span>
            <span aria-hidden="true">·</span>
            <MemberStatusText status={activeMember.status} />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Selamat datang, {activeMember.name}
          </h1>
          <p className="text-sm text-slate-600">
            Pantau status peminjaman, antrean reservasi, dan tenggat pengembalian buku Anda secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenMemberCard}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Kartu & Ganti Member</span>
          </button>
          <button
            type="button"
            onClick={onNavigateCatalog}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Pinjam Buku Baru</span>
          </button>
        </div>
      </section>

      {/* Member KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs text-slate-500">Pinjaman Aktif</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {activeLoans.length}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              / {activeMember.maxLoans} kuota
            </span>
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Antrean Reservasi</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {reservations.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Daftar Bacaan Tersimpan</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {bookmarkedBooks.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Tunggakan Denda Berjalan</p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
              outstandingFines > 0 ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {formatRupiah(outstandingFines)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Loans Column */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Peminjaman Sedang Berlangsung
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {activeLoans.length} aktif
              </span>
            </div>

            {activeLoans.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  Anda belum memiliki buku yang sedang dipinjam saat ini.
                </p>
                <button
                  type="button"
                  onClick={onNavigateCatalog}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer"
                >
                  Jelajahi Katalog Buku
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {activeLoans.map((tx) => {
                  const book = state.books.find((b) => b.id === tx.bookId);
                  const { overdueDays, liveFine, isOverdue } = computeLiveFine(
                    tx,
                    state.settings.dailyFineRp
                  );
                  const daysLeft = getDaysRemaining(tx.dueDate);
                  return (
                    <div
                      key={tx.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        {book && (
                          <BookCover
                            book={book}
                            className="w-14 aspect-[3/4] rounded shrink-0"
                          />
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono text-slate-600">{tx.transactionCode}</span>
                            <span aria-hidden="true">·</span>
                            <TransactionStatusText status={isOverdue ? 'Terlambat' : tx.status} />
                          </div>
                          <h3 className="font-serif text-base font-semibold text-slate-900 truncate">
                            {tx.bookTitle}
                          </h3>
                          <p className="text-xs text-slate-600 tabular-nums">
                            Pinjam: {formatDateShort(tx.borrowedAt)} <span aria-hidden="true">·</span>{' '}
                            Jatuh tempo:{' '}
                            <strong className={isOverdue ? 'text-red-700' : 'text-slate-900'}>
                              {formatDateShort(tx.dueDate)}
                            </strong>
                            {isOverdue ? (
                              <span className="text-red-700 font-medium">
                                {' '}
                                (Terlambat {overdueDays} hari · Denda {formatRupiah(liveFine)})
                              </span>
                            ) : (
                              <span className="text-emerald-800"> (Sisa {daysLeft} hari)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 tabular-nums">
                            Perpanjangan terpakai: {tx.renewCount} / {state.settings.maxRenewals} kali
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={tx.renewCount >= state.settings.maxRenewals}
                          onClick={() => {
                            const res = renewLoan(tx.id, 'Member');
                            onNotify(res.message, !res.ok);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Perpanjang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const res = returnBook(tx.id, 'Member');
                            onNotify(res.message, !res.ok);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Kembalikan</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reservations */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-slate-900">Antrean Reservasi</h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {reservations.length} antrean
              </span>
            </div>
            {reservations.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                Tidak ada buku dalam daftar antrean reservasi Anda.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {reservations.map((resTx) => (
                  <div
                    key={resTx.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-slate-500">{resTx.transactionCode}</span>
                        <span aria-hidden="true">·</span>
                        <TransactionStatusText status={resTx.status} />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{resTx.bookTitle}</p>
                      <p className="text-xs text-slate-500">{resTx.notes}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const res = cancelReservation(resTx.id, 'Member');
                        onNotify(res.message, !res.ok);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50 cursor-pointer self-start sm:self-center whitespace-nowrap"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Batalkan</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Transaction History */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Riwayat Sirkulasi Selesai
              </h2>
            </div>
            {historyTransactions.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">Belum ada riwayat pengembalian buku.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 px-4 font-medium">Kode</th>
                      <th className="py-3 px-4 font-medium">Judul Buku</th>
                      <th className="py-3 px-4 font-medium">Tanggal Kembali</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Denda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {historyTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                          {tx.transactionCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{tx.bookTitle}</td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">
                          {formatDateShort(tx.returnedAt ?? tx.updatedAt)}
                        </td>
                        <td className="py-3 px-4">
                          <TransactionStatusText status={tx.status} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {tx.fineAmount > 0
                            ? `${formatRupiah(tx.fineAmount)} (${tx.finePaid ? 'Lunas' : 'Belum'})`
                            : 'Rp 0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Column: Bookmarks & Real-Time Activity */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-serif text-base font-semibold text-slate-900">
                Daftar Bacaan Tersimpan
              </h2>
              <Bookmark className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </div>
            {bookmarkedBooks.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">
                Simpan buku favorit dari katalog agar mudah dipinjam kapan saja.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {bookmarkedBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => onSelectBook(book)}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{book.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {book.author} · {book.availableCopies > 0 ? 'Tersedia' : 'Dipinjam'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(activeMember.id, book.id);
                      }}
                      aria-label="Hapus simpanan"
                      className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-serif text-base font-semibold text-slate-900">
                Aktivitas Transaksi Real-Time
              </h2>
            </div>
            {memberLogs.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">Belum ada aktivitas tercatat untuk akun ini.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {memberLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">{log.action}</span>
                      <span className="font-mono tabular-nums">{formatTimeOnly(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{log.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
