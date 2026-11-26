import React, { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { useLibrary } from '../store/libraryStore';
import { AutomatedReportRecord } from '../types/library';
import {
  computeLiveFine,
  downloadCsv,
  downloadJson,
  formatDateShort,
  formatDateTime,
  formatRupiah,
} from '../utils/formatters';

interface AutomatedReportsViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AutomatedReportsView: React.FC<AutomatedReportsViewProps> = ({ onNotify }) => {
  const { state, generateAutomatedReport } = useLibrary();
  const [selectedType, setSelectedType] =
    useState<AutomatedReportRecord['reportType']>('Mingguan');

  const summary = useMemo(() => {
    const totalTitles = state.books.length;
    const totalCopies = state.books.reduce((s, b) => s + b.totalCopies, 0);
    const availableCopies = state.books.reduce((s, b) => s + b.availableCopies, 0);
    const utilizationPct =
      totalCopies > 0 ? Math.round(((totalCopies - availableCopies) / totalCopies) * 100) : 0;

    const overdueTxs = state.transactions
      .map((tx) => ({
        tx,
        ...computeLiveFine(tx, state.settings.dailyFineRp),
      }))
      .filter((item) => item.isOverdue);

    const pendingFineTotal = overdueTxs.reduce(
      (s, i) => s + (i.tx.finePaid ? 0 : i.liveFine),
      0
    );
    const collectedFineTotal = state.members.reduce((s, m) => s + m.totalFinesPaid, 0);

    const categoryStats = Object.values(
      state.books.reduce<
        Record<string, { category: string; titles: number; totalBorrows: number; copies: number }>
      >((acc, book) => {
        if (!acc[book.category]) {
          acc[book.category] = {
            category: book.category,
            titles: 0,
            totalBorrows: 0,
            copies: 0,
          };
        }
        acc[book.category].titles += 1;
        acc[book.category].totalBorrows += book.borrowCount;
        acc[book.category].copies += book.totalCopies;
        return acc;
      }, {})
    ).sort((a, b) => b.totalBorrows - a.totalBorrows);

    const topBooks = [...state.books]
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 5);

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      utilizationPct,
      overdueTxs,
      pendingFineTotal,
      collectedFineTotal,
      categoryStats,
      topBooks,
    };
  }, [state.books, state.transactions, state.members, state.settings.dailyFineRp]);

  const maxCategoryBorrows = Math.max(
    1,
    ...summary.categoryStats.map((c) => c.totalBorrows)
  );

  const handleGenerateSnapshot = () => {
    const record = generateAutomatedReport(selectedType);
    onNotify(`Snapshot laporan ${record.reportCode} (${record.reportType}) berhasil dibuat.`);
  };

  const handleExportTransactionsCsv = () => {
    downloadCsv(
      `meowlibrary_laporan_${selectedType.toLowerCase().replace(/\s+/g, '_')}.csv`,
      [
        'Kode Transaksi',
        'Judul Buku',
        'ISBN',
        'Nama Anggota',
        'Kode Anggota',
        'Jenis',
        'Status',
        'Tanggal Pinjam',
        'Jatuh Tempo',
        'Denda (IDR)',
        'Status Denda',
      ],
      state.transactions.map((tx) => {
        const fine = computeLiveFine(tx, state.settings.dailyFineRp);
        return [
          tx.transactionCode,
          tx.bookTitle,
          tx.bookIsbn,
          tx.memberName,
          tx.memberCode,
          tx.type,
          fine.isOverdue ? 'Terlambat' : tx.status,
          formatDateShort(tx.borrowedAt),
          formatDateShort(tx.dueDate),
          fine.liveFine,
          tx.finePaid ? 'Lunas' : 'Belum Lunas',
        ];
      })
    );
    onNotify('Laporan transaksi CSV berhasil diunduh.');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 no-print">
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-800">
            Sistem Pelaporan Otomatis · Jadwal Aktif: {state.settings.autoReportSchedule}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            Laporan Sirkulasi, Keterlambatan & Audit Koleksi
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Jenis periode laporan"
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as AutomatedReportRecord['reportType'])
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-800 focus:outline-none"
          >
            <option value="Harian">Laporan Harian</option>
            <option value="Mingguan">Laporan Mingguan</option>
            <option value="Bulanan">Laporan Bulanan</option>
            <option value="Audit Denda">Audit Denda & Keterlambatan</option>
          </select>

          <button
            type="button"
            onClick={handleGenerateSnapshot}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Buat Snapshot Laporan</span>
          </button>

          <button
            type="button"
            onClick={handleExportTransactionsCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Print Header (only visible when printing) */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          Laporan Resmi Perpustakaan Digital MeowLibrary
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Jenis Laporan: {selectedType} · Dicetak pada {formatDateTime(new Date().toISOString())}
        </p>
      </div>

      {/* Executive Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs text-slate-500">Utilisasi Sirkulasi Koleksi</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {summary.utilizationPct}%
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {summary.totalCopies - summary.availableCopies} dari {summary.totalCopies} eksemplar beredar
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Total Transaksi Tercatat</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {state.transactions.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Termasuk peminjaman & reservasi</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Keterlambatan Aktif</p>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
              summary.overdueTxs.length > 0 ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {summary.overdueTxs.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            Potensi denda {formatRupiah(summary.pendingFineTotal)}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Total Denda Terkumpul</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800 tabular-nums">
            {formatRupiah(summary.collectedFineTotal)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Kas pelunasan anggota</p>
        </div>
      </section>

      {/* Visual Analytics + Top Books */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">
                Distribusi Peminjaman per Kategori
              </h2>
              <p className="text-xs text-slate-500">
                Akumulasi frekuensi peminjaman berdasarkan klasifikasi subjek koleksi.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {summary.categoryStats.map((item) => {
              const widthPct = Math.max(6, Math.round((item.totalBorrows / maxCategoryBorrows) * 100));
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{item.category}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {item.totalBorrows} peminjaman · {item.titles} judul
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-emerald-800 rounded-sm transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              5 Koleksi Paling Diminati
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {summary.topBooks.map((book, idx) => (
              <div key={book.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    0{idx + 1}. {book.category}
                  </p>
                  <p className="text-sm font-medium text-slate-900 truncate">{book.title}</p>
                  <p className="text-xs text-slate-500 truncate">{book.author}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-emerald-900 tabular-nums shrink-0">
                  {book.borrowCount}x
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Automated Report Archive */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">
              Arsip Snapshot Laporan Otomatis
            </h2>
            <p className="text-xs text-slate-500">
              Rekapitulasi berkala yang tersimpan untuk audit operasional perpustakaan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              downloadJson('meowlibrary_arsip_laporan.json', state.reportSnapshots);
              onNotify('Arsip snapshot laporan (JSON) berhasil diunduh.');
            }}
            className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh Arsip JSON</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-medium">Kode Laporan</th>
                <th className="py-3 px-4 font-medium">Jenis & Periode</th>
                <th className="py-3 px-4 font-medium">Dibuat Pada</th>
                <th className="py-3 px-4 font-medium text-right">Transaksi</th>
                <th className="py-3 px-4 font-medium text-right">Terlambat</th>
                <th className="py-3 px-4 font-medium text-right">Kas Denda</th>
                <th className="py-3 px-4 font-medium">Kategori Teratas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {state.reportSnapshots.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                    {rep.reportCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-900">{rep.reportType}</span> ·{' '}
                    <span className="text-slate-600">{rep.periodLabel}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                    {formatDateTime(rep.generatedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                    {rep.totalTransactions}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-red-700">
                    {rep.overdueCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800">
                    {formatRupiah(rep.collectedFinesRp)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{rep.topCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
