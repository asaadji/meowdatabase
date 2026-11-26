import React, { useState } from 'react';
import { Bookmark, BookOpen, Calendar, Check, MapPin, Star, X } from 'lucide-react';
import { Book } from '../types/library';
import { useLibrary } from '../store/libraryStore';
import { BookCover } from './BookCover';
import { formatDateShort, formatRupiah } from '../utils/formatters';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ book, onClose, onNotify }) => {
  const { state, role, activeMember, borrowBook, reserveBook, toggleBookmark } = useLibrary();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(activeMember?.id ?? '');

  if (!book) return null;

  const targetMemberId = role === 'admin' ? selectedMemberId || activeMember?.id || '' : activeMember?.id || '';
  const isBookmarked = activeMember ? (state.bookmarks[activeMember.id] ?? []).includes(book.id) : false;

  const expectedDue = new Date(Date.now() + state.settings.loanDurationDays * 86400000).toISOString();

  const handleBorrow = () => {
    if (!targetMemberId) {
      onNotify('Pilih anggota terlebih dahulu.', true);
      return;
    }
    const res = borrowBook(book.id, targetMemberId, role === 'admin' ? 'Admin' : 'Member');
    onNotify(res.message, !res.ok);
    if (res.ok) onClose();
  };

  const handleReserve = () => {
    if (!targetMemberId) {
      onNotify('Pilih anggota terlebih dahulu.', true);
      return;
    }
    const res = reserveBook(book.id, targetMemberId);
    onNotify(res.message, !res.ok);
    if (res.ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <p className="text-xs font-mono text-slate-500 tabular-nums">
            ISBN {book.isbn} <span aria-hidden="true">·</span> {book.shelfLocation}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail buku"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <BookCover book={book} className="w-40 aspect-[3/4] shrink-0 rounded-md mx-auto sm:mx-0" />
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-xs font-medium text-emerald-800">{book.category}</p>
              <h3 id="book-detail-title" className="font-serif text-2xl font-semibold text-slate-900 leading-snug">
                {book.title}
              </h3>
              <p className="text-sm text-slate-600">
                Oleh <span className="font-medium text-slate-900">{book.author}</span>
                <span aria-hidden="true"> · </span>
                {book.publisher}, {book.year}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-slate-600 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  {book.rating.toFixed(1)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {book.pages} halaman ({book.language})
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {book.shelfLocation}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-500">Ketersediaan: </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      book.availableCopies > 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {book.availableCopies} / {book.totalCopies} eksemplar
                  </span>
                </div>
                <span className="text-xs text-slate-500 tabular-nums">
                  Total dipinjam {book.borrowCount}x
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-700">Sinopsis Koleksi</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{book.synopsis}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-4">
            {role === 'admin' && (
              <div>
                <label htmlFor="borrow-member-select" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Pinjamkan Atas Nama Anggota
                </label>
                <select
                  id="borrow-member-select"
                  value={targetMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
                >
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.memberCode}) — {m.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Durasi standar {state.settings.loanDurationDays} hari · Jatuh tempo{' '}
                <strong className="text-slate-800">{formatDateShort(expectedDue)}</strong>
              </span>
              <span className="font-mono tabular-nums">
                Denda keterlambatan {formatRupiah(state.settings.dailyFineRp)}/hari
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          {activeMember ? (
            <button
              type="button"
              onClick={() => toggleBookmark(activeMember.id, book.id)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-emerald-800 text-emerald-800' : ''}`} />
              <span>{isBookmarked ? 'Tersimpan di Daftar Bacaan' : 'Simpan ke Daftar Bacaan'}</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              Tutup
            </button>
            {book.availableCopies > 0 ? (
              <button
                type="button"
                onClick={handleBorrow}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Pinjam Buku Sekarang</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReserve}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ClockIcon />
                <span>Masuk Antrean Reservasi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClockIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
