import React, { useMemo, useState } from 'react';
import { Bookmark, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { READING_ROOM_HERO_IMAGE } from '../data/seedData';
import { useLibrary } from '../store/libraryStore';
import { Book, BookCategory } from '../types/library';
import { BookCover } from '../components/BookCover';

interface CatalogViewProps {
  onSelectBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onAddBook: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

const CATEGORIES: ('Semua' | BookCategory)[] = [
  'Semua',
  'Fiksi & Sastra',
  'Teknologi & Data',
  'Arsitektur & Desain',
  'Filsafat & Humaniora',
  'Sains & Ekologi',
];

export const CatalogView: React.FC<CatalogViewProps> = ({
  onSelectBook,
  onEditBook,
  onAddBook,
  onNotify,
}) => {
  const { state, role, activeMember, borrowBook, reserveBook, toggleBookmark, deleteBook } =
    useLibrary();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | BookCategory>('Semua');
  const [availabilityFilter, setAvailabilityFilter] = useState<'semua' | 'tersedia' | 'habis'>('semua');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'title'>('popular');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.books
      .filter((b) => {
        if (selectedCategory !== 'Semua' && b.category !== selectedCategory) return false;
        if (availabilityFilter === 'tersedia' && b.availableCopies === 0) return false;
        if (availabilityFilter === 'habis' && b.availableCopies > 0) return false;
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          b.shelfLocation.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.borrowCount - a.borrowCount;
        if (sortBy === 'newest') return b.year - a.year;
        return a.title.localeCompare(b.title, 'id');
      });
  }, [state.books, query, selectedCategory, availabilityFilter, sortBy]);

  const totalCopies = useMemo(
    () => state.books.reduce((acc, b) => acc + b.totalCopies, 0),
    [state.books]
  );
  const availableCopies = useMemo(
    () => state.books.reduce((acc, b) => acc + b.availableCopies, 0),
    [state.books]
  );
  const activeLoansCount = useMemo(
    () =>
      state.transactions.filter((t) => t.status === 'Dipinjam' || t.status === 'Terlambat').length,
    [state.transactions]
  );

  const handleQuickAction = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (!activeMember) {
      onNotify('Silakan pilih akun member terlebih dahulu.', true);
      return;
    }
    if (book.availableCopies > 0) {
      const res = borrowBook(book.id, activeMember.id, role === 'admin' ? 'Admin' : 'Member');
      onNotify(res.message, !res.ok);
    } else {
      const res = reserveBook(book.id, activeMember.id);
      onNotify(res.message, !res.ok);
    }
  };

  const confirmDelete = (bookId: string) => {
    const res = deleteBook(bookId);
    onNotify(res.message, !res.ok);
    setPendingDeleteId(null);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Hero Split */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-emerald-800">
                Katalog Terbuka MeowLibrary · Sirkulasi Digital Real-Time
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight text-balance">
                Ruang baca tenang untuk riset, sastra, dan arsitektur pengetahuan.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                Telusuri koleksi terkurasi, pinjam eksemplar secara langsung, pantau jatuh tempo, dan
                sinkronkan seluruh transaksi antar dashboard anggota maupun pustakawan secara instan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari judul, penulis, ISBN, atau kode rak..."
                  aria-label="Cari koleksi buku"
                  className="w-full rounded-md border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-800 focus:outline-none"
                />
              </div>
              {role === 'admin' && (
                <button
                  type="button"
                  onClick={onAddBook}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Koleksi</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[240px] bg-slate-100 border-t lg:border-t-0 lg:border-l border-slate-200">
            <img
              src={READING_ROOM_HERO_IMAGE}
              alt="Ruang baca MeowLibrary dengan kucing yang sedang tertidur di bangku baca"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover lg:h-full"
            />
          </div>
        </div>

        {/* Full-width 4-column metric strip below hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/70">
          <div className="px-6 py-4">
            <p className="text-xs text-slate-500">Judul Terindeks</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {state.books.length} <span className="text-xs font-sans font-normal text-slate-500">judul</span>
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-slate-500">Eksemplar Siap Pinjam</p>
            <p className="mt-1 font-mono text-xl font-semibold text-emerald-800 tabular-nums">
              {availableCopies}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">/ {totalCopies} total</span>
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-slate-500">Sedang Dipinjam</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {activeLoansCount} <span className="text-xs font-sans font-normal text-slate-500">transaksi</span>
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-slate-500">Durasi Pinjam Standar</p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900 tabular-nums">
              {state.settings.loanDurationDays}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">hari</span>
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Sort Controls */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter kategori buku">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
            {(
              [
                { id: 'semua', label: 'Semua' },
                { id: 'tersedia', label: 'Tersedia' },
                { id: 'habis', label: 'Stok Habis' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAvailabilityFilter(opt.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  availabilityFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Urutkan katalog"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'popular' | 'newest' | 'title')}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-800 focus:outline-none"
          >
            <option value="popular">Paling Sering Dipinjam</option>
            <option value="newest">Terbitan Terbaru</option>
            <option value="title">Judul A – Z</option>
          </select>
        </div>
      </section>

      {/* Catalog Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <p className="font-serif text-lg font-semibold text-slate-900">
            Tidak ada koleksi yang cocok dengan filter pencarian
          </p>
          <p className="text-sm text-slate-500">
            Ubah kata kunci pencarian atau pilih kategori lain untuk melihat buku yang tersedia.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory('Semua');
              setAvailabilityFilter('semua');
            }}
            className="mt-2 px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 cursor-pointer"
          >
            Reset Filter Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const isBookmarked = activeMember
              ? (state.bookmarks[activeMember.id] ?? []).includes(book.id)
              : false;
            return (
              <article
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-4 hover:border-slate-400 transition-colors cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="relative">
                    <BookCover
                      book={book}
                      className="w-full aspect-[3/4] rounded-md transition-transform duration-200 group-hover:scale-[1.01]"
                    />
                    {activeMember && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(activeMember.id, book.id);
                        }}
                        aria-label={isBookmarked ? 'Hapus dari daftar bacaan' : 'Simpan ke daftar bacaan'}
                        className="absolute top-2.5 right-2.5 p-2 rounded-md bg-white/95 border border-slate-200 text-slate-700 hover:text-emerald-900 transition-colors cursor-pointer"
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-emerald-800 text-emerald-800' : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500 truncate">
                      {book.category} <span aria-hidden="true">·</span> {book.shelfLocation}
                    </p>
                    <h3 className="font-serif text-base font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-900 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-600 truncate">
                      {book.author} <span aria-hidden="true">·</span> {book.year}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span
                      className={`font-medium ${
                        book.availableCopies > 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {book.availableCopies > 0
                        ? `Tersedia ${book.availableCopies}/${book.totalCopies}`
                        : 'Sedang dipinjam semua'}
                    </span>
                    <span className="font-mono text-slate-400">{book.borrowCount}x</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleQuickAction(e, book)}
                      className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        book.availableCopies > 0
                          ? 'bg-emerald-900 text-white hover:bg-emerald-800'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {book.availableCopies > 0 ? 'Pinjam Buku' : 'Reservasi'}
                    </button>

                    {role === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBook(book);
                          }}
                          aria-label={`Edit ${book.title}`}
                          className="p-2 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(book.id);
                          }}
                          aria-label={`Hapus ${book.title}`}
                          className="p-2 text-slate-600 border border-slate-200 rounded-md hover:bg-red-50 hover:text-red-700 hover:border-red-200 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-slate-900">Hapus Koleksi Buku?</h3>
            <p className="text-sm text-slate-600">
              Koleksi yang dihapus tidak lagi muncul di katalog publik. Riwayat transaksi terdahulu tetap
              tersimpan untuk keperluan audit.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(pendingDeleteId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 cursor-pointer"
              >
                Ya, Hapus Buku
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
