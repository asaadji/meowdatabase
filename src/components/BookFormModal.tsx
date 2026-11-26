import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Book, BookCategory } from '../types/library';
import { BookDraft } from '../store/libraryStore';

interface BookFormModalProps {
  isOpen: boolean;
  editingBook: Book | null;
  onClose: () => void;
  onSave: (draft: BookDraft, editingId?: string) => void;
}

const CATEGORIES: BookCategory[] = [
  'Fiksi & Sastra',
  'Teknologi & Data',
  'Arsitektur & Desain',
  'Filsafat & Humaniora',
  'Sains & Ekologi',
];

const ACCENT_OPTIONS = [
  { label: 'Emerald Pustaka', value: '#14532D' },
  { label: 'Biru Samudra', value: '#1E3A5F' },
  { label: 'Arang Modernis', value: '#1E293B' },
  { label: 'Abu Batu', value: '#475569' },
  { label: 'Terakota Gelap', value: '#7C2D12' },
];

export const BookFormModal: React.FC<BookFormModalProps> = ({
  isOpen,
  editingBook,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState(2026);
  const [category, setCategory] = useState<BookCategory>('Teknologi & Data');
  const [shelfLocation, setShelfLocation] = useState('Rak A-01');
  const [totalCopies, setTotalCopies] = useState(3);
  const [availableCopies, setAvailableCopies] = useState(3);
  const [pages, setPages] = useState(240);
  const [language, setLanguage] = useState<'Indonesia' | 'Inggris'>('Indonesia');
  const [coverAccent, setCoverAccent] = useState('#14532D');
  const [synopsis, setSynopsis] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingBook) {
      setTitle(editingBook.title);
      setAuthor(editingBook.author);
      setIsbn(editingBook.isbn);
      setPublisher(editingBook.publisher);
      setYear(editingBook.year);
      setCategory(editingBook.category);
      setShelfLocation(editingBook.shelfLocation);
      setTotalCopies(editingBook.totalCopies);
      setAvailableCopies(editingBook.availableCopies);
      setPages(editingBook.pages);
      setLanguage(editingBook.language);
      setCoverAccent(editingBook.coverAccent);
      setSynopsis(editingBook.synopsis);
    } else {
      setTitle('');
      setAuthor('');
      setIsbn(`978-602-${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}-0`);
      setPublisher('Pustaka Meow');
      setYear(2026);
      setCategory('Teknologi & Data');
      setShelfLocation('Rak C-10');
      setTotalCopies(3);
      setAvailableCopies(3);
      setPages(260);
      setLanguage('Indonesia');
      setCoverAccent('#14532D');
      setSynopsis('');
    }
    setError('');
  }, [editingBook, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !isbn.trim()) {
      setError('Judul buku, penulis, dan ISBN wajib diisi.');
      return;
    }
    if (availableCopies > totalCopies || totalCopies < 1) {
      setError('Jumlah stok tersedia tidak boleh melebihi total eksemplar.');
      return;
    }

    onSave(
      {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        publisher: publisher.trim() || 'Pustaka Meow',
        year: Number(year) || 2026,
        category,
        shelfLocation: shelfLocation.trim() || 'Rak A-01',
        totalCopies: Number(totalCopies),
        availableCopies: Number(availableCopies),
        coverUrl: editingBook?.coverUrl,
        coverAccent,
        synopsis:
          synopsis.trim() ||
          'Koleksi resmi MeowLibrary yang dikurasi untuk referensi riset dan bacaan anggota.',
        pages: Number(pages) || 200,
        language,
        rating: editingBook?.rating ?? 4.8,
      },
      editingBook?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-form-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 id="book-form-title" className="font-serif text-lg font-semibold text-slate-900">
            {editingBook ? 'Edit Koleksi Buku' : 'Tambah Koleksi Buku Baru'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir buku"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Judul Buku</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pengantar Sistem Basis Data Modern"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Penulis</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nama penulis"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ISBN</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-emerald-800 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BookCategory)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-emerald-800 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Lokasi Rak</label>
              <input
                type="text"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="Rak A-01"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Penerbit</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tahun</label>
                <input
                  type="number"
                  min={1900}
                  max={2030}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Halaman</label>
                <input
                  type="number"
                  min={10}
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Total Eksemplar</label>
              <input
                type="number"
                min={1}
                max={100}
                value={totalCopies}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalCopies(val);
                  if (!editingBook) setAvailableCopies(val);
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Stok Tersedia</label>
              <input
                type="number"
                min={0}
                max={totalCopies}
                value={availableCopies}
                onChange={(e) => setAvailableCopies(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:border-emerald-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bahasa</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'Indonesia' | 'Inggris')}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-emerald-800 focus:outline-none"
              >
                <option value="Indonesia">Indonesia</option>
                <option value="Inggris">Inggris</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Warna Sampul</label>
              <select
                value={coverAccent}
                onChange={(e) => setCoverAccent(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-emerald-800 focus:outline-none"
              >
                {ACCENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Sinopsis Ringkas</label>
              <textarea
                rows={3}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Ringkasan isi buku..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              {editingBook ? 'Simpan Perubahan' : 'Tambahkan Koleksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
