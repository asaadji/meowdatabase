import React, { useMemo, useState } from 'react';
import { Download, Edit3, Plus, RotateCcw, Search, Trash2, UserPlus } from 'lucide-react';
import { useLibrary } from '../store/libraryStore';
import { Book, MemberTier } from '../types/library';
import { downloadCsv, downloadJson, formatDateShort, formatRupiah } from '../utils/formatters';
import { MemberStatusText } from '../components/StatusIndicator';

interface CollectionMembersViewProps {
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const CollectionMembersView: React.FC<CollectionMembersViewProps> = ({
  onAddBook,
  onEditBook,
  onNotify,
}) => {
  const {
    state,
    deleteBook,
    registerMember,
    toggleMemberStatus,
    updateSettings,
    resetDemoData,
  } = useLibrary();

  const [tab, setTab] = useState<'koleksi' | 'anggota' | 'kebijakan'>('koleksi');
  const [searchBook, setSearchBook] = useState('');
  const [pendingDeleteBookId, setPendingDeleteBookId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // New member inline form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mTier, setMTier] = useState<MemberTier>('Reguler');

  // Settings form
  const [loanDays, setLoanDays] = useState(state.settings.loanDurationDays);
  const [maxRenewals, setMaxRenewals] = useState(state.settings.maxRenewals);
  const [dailyFine, setDailyFine] = useState(state.settings.dailyFineRp);
  const [reportSchedule, setReportSchedule] = useState(state.settings.autoReportSchedule);

  const filteredBooks = useMemo(() => {
    const q = searchBook.trim().toLowerCase();
    if (!q) return state.books;
    return state.books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.shelfLocation.toLowerCase().includes(q)
    );
  }, [state.books, searchBook]);

  const handleExportCatalogCsv = () => {
    downloadCsv(
      'meowlibrary_katalog_koleksi.csv',
      ['ISBN', 'Judul', 'Penulis', 'Penerbit', 'Tahun', 'Kategori', 'Rak', 'Tersedia', 'Total', 'Dipinjam'],
      state.books.map((b) => [
        b.isbn,
        b.title,
        b.author,
        b.publisher,
        b.year,
        b.category,
        b.shelfLocation,
        b.availableCopies,
        b.totalCopies,
        b.borrowCount,
      ])
    );
    onNotify('Katalog koleksi berhasil diunduh dalam format CSV.');
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim() || !mEmail.trim()) {
      onNotify('Nama dan email anggota wajib diisi.', true);
      return;
    }
    const maxLoans = mTier === 'Prioritas' ? 5 : mTier === 'Riset' ? 4 : 3;
    const res = registerMember({
      name: mName.trim(),
      email: mEmail.trim(),
      phone: mPhone.trim() || '0812-0000-0000',
      tier: mTier,
      status: 'Aktif',
      maxLoans,
    });
    onNotify(res.message, !res.ok);
    if (res.ok) {
      setShowMemberForm(false);
      setMName('');
      setMEmail('');
      setMPhone('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      loanDurationDays: Math.max(1, Number(loanDays)),
      maxRenewals: Math.max(0, Number(maxRenewals)),
      dailyFineRp: Math.max(0, Number(dailyFine)),
      autoReportSchedule: reportSchedule,
    });
    onNotify('Kebijakan sirkulasi & jadwal pelaporan otomatis berhasil disimpan.');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-800">
            Pengelolaan Inventaris & Keanggotaan
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Manajemen Koleksi, Anggota & Kebijakan
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md self-start sm:self-auto">
          {(
            [
              { id: 'koleksi', label: 'Inventaris Koleksi' },
              { id: 'anggota', label: 'Direktori Anggota' },
              { id: 'kebijakan', label: 'Kebijakan Sistem' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: KOLEKSI */}
      {tab === 'koleksi' && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchBook}
                onChange={(e) => setSearchBook(e.target.value)}
                placeholder="Filter judul, penulis, ISBN, rak..."
                className="w-full rounded-md border border-slate-300 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCatalogCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Ekspor CSV</span>
              </button>
              <button
                type="button"
                onClick={onAddBook}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Buku</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-medium">ISBN & Rak</th>
                  <th className="py-3 px-4 font-medium">Judul & Penulis</th>
                  <th className="py-3 px-4 font-medium">Kategori</th>
                  <th className="py-3 px-4 font-medium text-right">Stok</th>
                  <th className="py-3 px-4 font-medium text-right">Dipinjam</th>
                  <th className="py-3 px-4 font-medium text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      <div>{book.isbn}</div>
                      <div className="text-[11px] text-slate-400">{book.shelfLocation}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">{book.title}</div>
                      <div className="text-slate-500 truncate">
                        {book.author} · {book.publisher} ({book.year})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {book.category}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          book.availableCopies > 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'
                        }
                      >
                        {book.availableCopies}
                      </span>{' '}
                      <span className="text-slate-400">/ {book.totalCopies}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {book.borrowCount}x
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditBook(book)}
                          aria-label={`Edit ${book.title}`}
                          className="p-1.5 text-slate-600 border border-slate-200 rounded hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteBookId(book.id)}
                          aria-label={`Hapus ${book.title}`}
                          className="p-1.5 text-slate-600 border border-slate-200 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-200 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: ANGGOTA */}
      {tab === 'anggota' && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-slate-900">
                  Direktori Anggota MeowLibrary
                </h2>
                <p className="text-xs text-slate-500">
                  Kelola status keanggotaan, kuota pinjam, dan riwayat pelunasan denda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMemberForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{showMemberForm ? 'Tutup Formulir' : 'Registrasi Anggota'}</span>
              </button>
            </div>

            {showMemberForm && (
              <form
                onSubmit={handleAddMember}
                className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="Nama anggota"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    placeholder="email@domain.id"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telepon & Paket</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mPhone}
                      onChange={(e) => setMPhone(e.target.value)}
                      placeholder="0812..."
                      className="w-1/2 rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-emerald-800 focus:outline-none"
                    />
                    <select
                      value={mTier}
                      onChange={(e) => setMTier(e.target.value as MemberTier)}
                      className="w-1/2 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs focus:border-emerald-800 focus:outline-none"
                    >
                      <option value="Reguler">Reguler</option>
                      <option value="Riset">Riset</option>
                      <option value="Prioritas">Prioritas</option>
                    </select>
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer"
                  >
                    Simpan Anggota
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">ID Anggota</th>
                    <th className="py-3 px-4 font-medium">Nama & Kontak</th>
                    <th className="py-3 px-4 font-medium">Paket & Kuota</th>
                    <th className="py-3 px-4 font-medium">Pinjaman Aktif</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Denda Dibayar</th>
                    <th className="py-3 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.members.map((member) => {
                    const activeCount = state.transactions.filter(
                      (t) =>
                        t.memberId === member.id &&
                        (t.status === 'Dipinjam' || t.status === 'Terlambat')
                    ).length;
                    return (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                          <div>{member.memberCode}</div>
                          <div className="text-[11px] text-slate-400">
                            Sejak {formatDateShort(member.joinedAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{member.name}</div>
                          <div className="text-slate-500">
                            {member.email} · {member.phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 tabular-nums">
                          {member.tier} · Maks. {member.maxLoans} buku
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800">
                          {activeCount} / {member.maxLoans}
                        </td>
                        <td className="py-3.5 px-4">
                          <MemberStatusText status={member.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatRupiah(member.totalFinesPaid)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const res = toggleMemberStatus(member.id);
                              onNotify(res.message, !res.ok);
                            }}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded border cursor-pointer ${
                              member.status === 'Aktif'
                                ? 'text-red-700 border-red-200 hover:bg-red-50'
                                : 'text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            {member.status === 'Aktif' ? 'Tangguhkan' : 'Aktifkan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: KEBIJAKAN */}
      {tab === 'kebijakan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5"
          >
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Parameter Sirkulasi & Otomasi Laporan
              </h2>
              <p className="text-xs text-slate-500">
                Aturan ini berlaku langsung untuk peminjaman baru dan perhitungan denda real-time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Durasi Pinjam Standar (Hari)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={loanDays}
                  onChange={(e) => setLoanDays(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Batas Maksimal Perpanjangan
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={maxRenewals}
                  onChange={(e) => setMaxRenewals(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tarif Denda Harian (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={dailyFine}
                  onChange={(e) => setDailyFine(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jadwal Pelaporan Otomatis
                </label>
                <select
                  value={reportSchedule}
                  onChange={(e) =>
                    setReportSchedule(e.target.value as 'Harian' | 'Mingguan' | 'Bulanan')
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                >
                  <option value="Harian">Harian</option>
                  <option value="Mingguan">Mingguan</option>
                  <option value="Bulanan">Bulanan</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer"
              >
                Simpan Kebijakan
              </button>
            </div>
          </form>

          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              Cadangan Data & Pemeliharaan
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unduh seluruh basis data lokal MeowLibrary (koleksi, anggota, transaksi, log) sebagai
              arsip JSON, atau kembalikan data awal jika ingin mengulang simulasi.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  downloadJson('meowlibrary_backup_lengkap.json', state);
                  onNotify('Arsip cadangan JSON berhasil diunduh.');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Cadangan JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Data Awal</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Delete Book Confirm Modal */}
      {pendingDeleteBookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-slate-900">Hapus Buku?</h3>
            <p className="text-sm text-slate-600">
              Tindakan ini menghapus judul buku dari katalog aktif perpustakaan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteBookId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = deleteBook(pendingDeleteBookId);
                  onNotify(res.message, !res.ok);
                  setPendingDeleteBookId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-slate-900">
              Kembalikan Data Awal MeowLibrary?
            </h3>
            <p className="text-sm text-slate-600">
              Semua perubahan lokal akan dikembalikan ke dataset contoh awal dan disinkronkan ke
              semua tab aktif.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setConfirmReset(false);
                  onNotify('Data perpustakaan berhasil dikembalikan ke kondisi awal.');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 cursor-pointer"
              >
                Ya, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
