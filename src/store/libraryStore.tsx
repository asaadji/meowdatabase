import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_LIBRARY_STATE } from '../data/seedData';
import {
  ActivityLog,
  AutomatedReportRecord,
  Book,
  LibrarySettings,
  LibraryState,
  Member,
  Transaction,
  UserRole,
} from '../types/library';
import { computeLiveFine } from '../utils/formatters';

const STORAGE_KEY = 'meowlibrary_state_v1';
const CHANNEL_NAME = 'meowlibrary_realtime_sync_v1';

export type BookDraft = Omit<Book, 'id' | 'borrowCount' | 'createdAt' | 'updatedAt'>;
export type MemberDraft = Omit<Member, 'id' | 'memberCode' | 'joinedAt' | 'totalFinesPaid'>;

interface ActionResult {
  ok: boolean;
  message: string;
}

interface LibraryContextValue {
  state: LibraryState;
  role: UserRole;
  setRole: (role: UserRole) => void;
  activeMemberId: string;
  setActiveMemberId: (memberId: string) => void;
  activeMember: Member | undefined;
  borrowBook: (bookId: string, memberId: string, actorRole: 'Admin' | 'Member') => ActionResult;
  reserveBook: (bookId: string, memberId: string) => ActionResult;
  returnBook: (transactionId: string, actorRole: 'Admin' | 'Member') => ActionResult;
  renewLoan: (transactionId: string, actorRole: 'Admin' | 'Member') => ActionResult;
  fulfillReservation: (transactionId: string) => ActionResult;
  cancelReservation: (transactionId: string, actorRole: 'Admin' | 'Member') => ActionResult;
  markFinePaid: (transactionId: string) => ActionResult;
  addBook: (draft: BookDraft) => ActionResult;
  updateBook: (bookId: string, patch: Partial<BookDraft>) => ActionResult;
  deleteBook: (bookId: string) => ActionResult;
  registerMember: (draft: MemberDraft) => { ok: boolean; message: string; member?: Member };
  toggleMemberStatus: (memberId: string) => ActionResult;
  toggleBookmark: (memberId: string, bookId: string) => void;
  updateSettings: (patch: Partial<LibrarySettings>) => void;
  generateAutomatedReport: (reportType: AutomatedReportRecord['reportType']) => AutomatedReportRecord;
  resetDemoData: () => void;
  isSyncing: boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function loadPersistedState(): LibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_LIBRARY_STATE;
    const parsed = JSON.parse(raw) as LibraryState;
    if (!parsed || !Array.isArray(parsed.books) || !Array.isArray(parsed.transactions)) {
      return INITIAL_LIBRARY_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_LIBRARY_STATE;
  }
}

function makeCode(prefix: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  const ts = String(Date.now()).slice(-3);
  return `${prefix}-${ts}${rand}`;
}

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LibraryState>(() => loadPersistedState());
  const [role, setRole] = useState<UserRole>('member');
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    const initial = loadPersistedState();
    return initial.members[0]?.id ?? 'mb-001';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);

  const commitState = (updater: (prev: LibraryState) => LibraryState) => {
    setState((prev) => {
      const next = {
        ...updater(prev),
        lastSyncedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors gracefully
      }
      channelRef.current?.postMessage({ type: 'SYNC_STATE', payload: next });
      return next;
    });
  };

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_STATE' && event.data.payload) {
          setIsSyncing(true);
          setState(event.data.payload as LibraryState);
          window.setTimeout(() => setIsSyncing(false), 350);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as LibraryState;
          setIsSyncing(true);
          setState(parsed);
          window.setTimeout(() => setIsSyncing(false), 350);
        } catch {
          // Ignore malformed storage payload
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      channelRef.current?.close();
    };
  }, []);

  const activeMember = useMemo(
    () => state.members.find((m) => m.id === activeMemberId) ?? state.members[0],
    [state.members, activeMemberId]
  );

  const borrowBook = (bookId: string, memberId: string, actorRole: 'Admin' | 'Member'): ActionResult => {
    const book = state.books.find((b) => b.id === bookId);
    const member = state.members.find((m) => m.id === memberId);
    if (!book || !member) return { ok: false, message: 'Data buku atau anggota tidak ditemukan.' };
    if (member.status === 'Ditangguhkan') {
      return { ok: false, message: 'Akun anggota sedang ditangguhkan. Hubungi admin perpustakaan.' };
    }
    if (book.availableCopies <= 0) {
      return { ok: false, message: 'Stok eksemplar habis. Silakan gunakan fitur reservasi antrean.' };
    }

    const activeLoans = state.transactions.filter(
      (tx) =>
        tx.memberId === member.id &&
        (tx.status === 'Dipinjam' || tx.status === 'Terlambat')
    );

    if (activeLoans.length >= member.maxLoans) {
      return {
        ok: false,
        message: `Batas peminjaman aktif (${member.maxLoans} buku) untuk ${member.name} telah tercapai.`,
      };
    }

    const alreadyBorrowingSame = activeLoans.some((tx) => tx.bookId === book.id);
    if (alreadyBorrowingSame) {
      return { ok: false, message: 'Anggota ini sedang meminjam judul buku yang sama.' };
    }

    const nowIso = new Date().toISOString();
    const dueIso = new Date(Date.now() + state.settings.loanDurationDays * 86400000).toISOString();
    const txCode = makeCode('TRX-2611');

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      transactionCode: txCode,
      bookId: book.id,
      bookTitle: book.title,
      bookIsbn: book.isbn,
      memberId: member.id,
      memberName: member.name,
      memberCode: member.memberCode,
      type: 'Peminjaman',
      status: 'Dipinjam',
      borrowedAt: nowIso,
      dueDate: dueIso,
      renewCount: 0,
      fineAmount: 0,
      finePaid: false,
      updatedAt: nowIso,
    };

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole,
      actorName: actorRole === 'Admin' ? 'Pustakawan Admin' : member.name,
      action: 'Peminjaman Baru',
      detail: `${member.name} meminjam "${book.title}" (jatuh tempo ${state.settings.loanDurationDays} hari)`,
      txCode,
    };

    commitState((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === book.id
          ? {
              ...b,
              availableCopies: Math.max(0, b.availableCopies - 1),
              borrowCount: b.borrowCount + 1,
              updatedAt: nowIso,
            }
          : b
      ),
      transactions: [newTx, ...prev.transactions],
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Peminjaman ${txCode} berhasil dicatat.` };
  };

  const reserveBook = (bookId: string, memberId: string): ActionResult => {
    const book = state.books.find((b) => b.id === bookId);
    const member = state.members.find((m) => m.id === memberId);
    if (!book || !member) return { ok: false, message: 'Data buku atau anggota tidak ditemukan.' };
    if (member.status === 'Ditangguhkan') {
      return { ok: false, message: 'Akun anggota sedang ditangguhkan.' };
    }

    const existingRes = state.transactions.find(
      (tx) =>
        tx.bookId === book.id &&
        tx.memberId === member.id &&
        (tx.status === 'Menunggu' || tx.status === 'Tersedia Diambil')
    );
    if (existingRes) {
      return { ok: false, message: 'Anda sudah memiliki antrean reservasi aktif untuk buku ini.' };
    }

    const nowIso = new Date().toISOString();
    const txCode = makeCode('RSV-2611');
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      transactionCode: txCode,
      bookId: book.id,
      bookTitle: book.title,
      bookIsbn: book.isbn,
      memberId: member.id,
      memberName: member.name,
      memberCode: member.memberCode,
      type: 'Reservasi',
      status: 'Menunggu',
      borrowedAt: nowIso,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      renewCount: 0,
      fineAmount: 0,
      finePaid: false,
      notes: 'Menunggu ketersediaan eksemplar',
      updatedAt: nowIso,
    };

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Member',
      actorName: member.name,
      action: 'Reservasi Antrean',
      detail: `${member.name} masuk daftar antrean untuk "${book.title}"`,
      txCode,
    };

    commitState((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Reservasi ${txCode} berhasil dibuat.` };
  };

  const returnBook = (transactionId: string, actorRole: 'Admin' | 'Member'): ActionResult => {
    const tx = state.transactions.find((t) => t.id === transactionId);
    if (!tx) return { ok: false, message: 'Transaksi tidak ditemukan.' };
    if (tx.status === 'Dikembalikan' || tx.status === 'Dibatalkan') {
      return { ok: false, message: 'Transaksi sudah selesai.' };
    }

    const nowIso = new Date().toISOString();
    const { liveFine } = computeLiveFine(tx, state.settings.dailyFineRp);
    const waitingReservation = state.transactions.find(
      (r) => r.bookId === tx.bookId && r.status === 'Menunggu'
    );

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole,
      actorName: actorRole === 'Admin' ? 'Pustakawan Admin' : tx.memberName,
      action: 'Pengembalian Buku',
      detail: `"${tx.bookTitle}" dikembalikan oleh ${tx.memberName}${liveFine > 0 ? ` (denda Rp ${liveFine.toLocaleString('id-ID')})` : ''}`,
      txCode: tx.transactionCode,
    };

    commitState((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === tx.bookId
          ? {
              ...b,
              availableCopies: Math.min(b.totalCopies, b.availableCopies + 1),
              updatedAt: nowIso,
            }
          : b
      ),
      transactions: prev.transactions.map((t) => {
        if (t.id === tx.id) {
          return {
            ...t,
            status: 'Dikembalikan',
            type: 'Pengembalian',
            returnedAt: nowIso,
            fineAmount: liveFine,
            finePaid: liveFine === 0 ? true : t.finePaid,
            updatedAt: nowIso,
          };
        }
        if (waitingReservation && t.id === waitingReservation.id) {
          return {
            ...t,
            status: 'Tersedia Diambil',
            notes: 'Eksemplar baru saja kembali dan siap diambil.',
            updatedAt: nowIso,
          };
        }
        return t;
      }),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Pengembalian "${tx.bookTitle}" berhasil dikonfirmasi.` };
  };

  const renewLoan = (transactionId: string, actorRole: 'Admin' | 'Member'): ActionResult => {
    const tx = state.transactions.find((t) => t.id === transactionId);
    if (!tx) return { ok: false, message: 'Transaksi tidak ditemukan.' };
    if (tx.status !== 'Dipinjam' && tx.status !== 'Terlambat') {
      return { ok: false, message: 'Hanya peminjaman aktif yang dapat diperpanjang.' };
    }
    if (tx.renewCount >= state.settings.maxRenewals) {
      return { ok: false, message: `Batas maksimal perpanjangan (${state.settings.maxRenewals}x) telah tercapai.` };
    }

    const nowIso = new Date().toISOString();
    const baseTime = Math.max(Date.now(), new Date(tx.dueDate).getTime());
    const extendedDue = new Date(baseTime + state.settings.loanDurationDays * 86400000).toISOString();

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole,
      actorName: actorRole === 'Admin' ? 'Pustakawan Admin' : tx.memberName,
      action: 'Perpanjangan Masa Pinjam',
      detail: `Durasi pinjam "${tx.bookTitle}" diperpanjang +${state.settings.loanDurationDays} hari`,
      txCode: tx.transactionCode,
    };

    commitState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === tx.id
          ? {
              ...t,
              type: 'Perpanjangan',
              status: 'Dipinjam',
              dueDate: extendedDue,
              renewCount: t.renewCount + 1,
              updatedAt: nowIso,
            }
          : t
      ),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Masa pinjam diperpanjang +${state.settings.loanDurationDays} hari.` };
  };

  const fulfillReservation = (transactionId: string): ActionResult => {
    const resTx = state.transactions.find((t) => t.id === transactionId);
    if (!resTx) return { ok: false, message: 'Data reservasi tidak ditemukan.' };
    const book = state.books.find((b) => b.id === resTx.bookId);
    if (!book || book.availableCopies <= 0) {
      return { ok: false, message: 'Eksemplar buku belum tersedia di rak.' };
    }

    const nowIso = new Date().toISOString();
    const dueIso = new Date(Date.now() + state.settings.loanDurationDays * 86400000).toISOString();

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Konversi Reservasi ke Pinjaman',
      detail: `${resTx.memberName} mengambil buku reservasi "${resTx.bookTitle}"`,
      txCode: resTx.transactionCode,
    };

    commitState((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === book.id
          ? {
              ...b,
              availableCopies: Math.max(0, b.availableCopies - 1),
              borrowCount: b.borrowCount + 1,
              updatedAt: nowIso,
            }
          : b
      ),
      transactions: prev.transactions.map((t) =>
        t.id === resTx.id
          ? {
              ...t,
              type: 'Peminjaman',
              status: 'Dipinjam',
              borrowedAt: nowIso,
              dueDate: dueIso,
              notes: 'Dikonversi dari reservasi antrean.',
              updatedAt: nowIso,
            }
          : t
      ),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: 'Reservasi berhasil diserahkan sebagai peminjaman aktif.' };
  };

  const cancelReservation = (transactionId: string, actorRole: 'Admin' | 'Member'): ActionResult => {
    const tx = state.transactions.find((t) => t.id === transactionId);
    if (!tx) return { ok: false, message: 'Reservasi tidak ditemukan.' };
    const nowIso = new Date().toISOString();

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole,
      actorName: actorRole === 'Admin' ? 'Pustakawan Admin' : tx.memberName,
      action: 'Pembatalan Reservasi',
      detail: `Antrean reservasi "${tx.bookTitle}" dibatalkan`,
      txCode: tx.transactionCode,
    };

    commitState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === tx.id ? { ...t, status: 'Dibatalkan', updatedAt: nowIso } : t
      ),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: 'Reservasi dibatalkan.' };
  };

  const markFinePaid = (transactionId: string): ActionResult => {
    const tx = state.transactions.find((t) => t.id === transactionId);
    if (!tx) return { ok: false, message: 'Transaksi tidak ditemukan.' };
    const nowIso = new Date().toISOString();
    const { liveFine } = computeLiveFine(tx, state.settings.dailyFineRp);

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Pelunasan Denda',
      detail: `Denda Rp ${liveFine.toLocaleString('id-ID')} untuk ${tx.memberName} dinyatakan lunas`,
      txCode: tx.transactionCode,
    };

    commitState((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === tx.memberId
          ? { ...m, totalFinesPaid: m.totalFinesPaid + liveFine }
          : m
      ),
      transactions: prev.transactions.map((t) =>
        t.id === tx.id ? { ...t, fineAmount: liveFine, finePaid: true, updatedAt: nowIso } : t
      ),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: 'Pembayaran denda berhasil dicatat.' };
  };

  const addBook = (draft: BookDraft): ActionResult => {
    const nowIso = new Date().toISOString();
    const newBook: Book = {
      ...draft,
      id: `bk-${Date.now()}`,
      borrowCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Penambahan Koleksi',
      detail: `Menambahkan "${newBook.title}" (${newBook.totalCopies} eksemplar) ke ${newBook.shelfLocation}`,
    };

    commitState((prev) => ({
      ...prev,
      books: [newBook, ...prev.books],
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Buku "${newBook.title}" berhasil ditambahkan ke koleksi.` };
  };

  const updateBook = (bookId: string, patch: Partial<BookDraft>): ActionResult => {
    const existing = state.books.find((b) => b.id === bookId);
    if (!existing) return { ok: false, message: 'Buku tidak ditemukan.' };
    const nowIso = new Date().toISOString();

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Pembaruan Koleksi',
      detail: `Memperbarui informasi bibliografi "${patch.title ?? existing.title}"`,
    };

    commitState((prev) => ({
      ...prev,
      books: prev.books.map((b) =>
        b.id === bookId ? { ...b, ...patch, updatedAt: nowIso } : b
      ),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: 'Detail koleksi berhasil diperbarui.' };
  };

  const deleteBook = (bookId: string): ActionResult => {
    const existing = state.books.find((b) => b.id === bookId);
    if (!existing) return { ok: false, message: 'Buku tidak ditemukan.' };
    const hasActiveLoan = state.transactions.some(
      (tx) => tx.bookId === bookId && (tx.status === 'Dipinjam' || tx.status === 'Terlambat')
    );
    if (hasActiveLoan) {
      return { ok: false, message: 'Tidak dapat menghapus buku yang masih memiliki peminjaman aktif.' };
    }

    const nowIso = new Date().toISOString();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Penghapusan Koleksi',
      detail: `Menghapus "${existing.title}" dari katalog aktif`,
    };

    commitState((prev) => ({
      ...prev,
      books: prev.books.filter((b) => b.id !== bookId),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Koleksi "${existing.title}" dihapus.` };
  };

  const registerMember = (draft: MemberDraft): { ok: boolean; message: string; member?: Member } => {
    const nowIso = new Date().toISOString();
    const memberCode = `MW-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newMember: Member = {
      ...draft,
      id: `mb-${Date.now()}`,
      memberCode,
      joinedAt: nowIso,
      totalFinesPaid: 0,
    };

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Registrasi Anggota Baru',
      detail: `Anggota baru terdaftar: ${newMember.name} (${memberCode})`,
    };

    commitState((prev) => ({
      ...prev,
      members: [newMember, ...prev.members],
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Anggota ${newMember.name} berhasil didaftarkan.`, member: newMember };
  };

  const toggleMemberStatus = (memberId: string): ActionResult => {
    const target = state.members.find((m) => m.id === memberId);
    if (!target) return { ok: false, message: 'Anggota tidak ditemukan.' };
    const nextStatus = target.status === 'Aktif' ? 'Ditangguhkan' : 'Aktif';
    const nowIso = new Date().toISOString();

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Status Keanggotaan',
      detail: `Mengubah status ${target.name} menjadi ${nextStatus}`,
    };

    commitState((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, status: nextStatus } : m
      ),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return { ok: true, message: `Status ${target.name} diubah menjadi ${nextStatus}.` };
  };

  const toggleBookmark = (memberId: string, bookId: string) => {
    commitState((prev) => {
      const current = prev.bookmarks[memberId] ?? [];
      const exists = current.includes(bookId);
      const updated = exists ? current.filter((id) => id !== bookId) : [...current, bookId];
      return {
        ...prev,
        bookmarks: {
          ...prev.bookmarks,
          [memberId]: updated,
        },
      };
    });
  };

  const updateSettings = (patch: Partial<LibrarySettings>) => {
    const nowIso = new Date().toISOString();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Admin',
      actorName: 'Pustakawan Admin',
      action: 'Pembaruan Kebijakan Sirkulasi',
      detail: 'Memperbarui parameter durasi peminjaman, denda, atau jadwal laporan otomatis',
    };
    commitState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));
  };

  const generateAutomatedReport = (
    reportType: AutomatedReportRecord['reportType']
  ): AutomatedReportRecord => {
    const nowIso = new Date().toISOString();
    const activeLoans = state.transactions.filter(
      (t) => t.status === 'Dipinjam' || t.status === 'Terlambat'
    ).length;
    const overdueCount = state.transactions.filter(
      (t) => computeLiveFine(t, state.settings.dailyFineRp).isOverdue
    ).length;
    const collectedFinesRp = state.members.reduce((acc, m) => acc + m.totalFinesPaid, 0);

    const catCounts = state.books.reduce<Record<string, number>>((acc, b) => {
      acc[b.category] = (acc[b.category] ?? 0) + b.borrowCount;
      return acc;
    }, {});
    const topCategory =
      Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Teknologi & Data';

    const record: AutomatedReportRecord = {
      id: `rep-${Date.now()}`,
      reportCode: makeCode('RPT-2611'),
      periodLabel: new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
      reportType,
      generatedAt: nowIso,
      totalTransactions: state.transactions.length,
      activeLoans,
      overdueCount,
      collectedFinesRp,
      topCategory,
    };

    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actorRole: 'Sistem',
      actorName: 'Mesin Pelaporan',
      action: `Laporan ${reportType} Dibuat`,
      detail: `Arsip ${record.reportCode} merangkum ${record.totalTransactions} transaksi dan ${record.overdueCount} keterlambatan`,
    };

    commitState((prev) => ({
      ...prev,
      reportSnapshots: [record, ...prev.reportSnapshots].slice(0, 25),
      activityLogs: [newLog, ...prev.activityLogs].slice(0, 60),
    }));

    return record;
  };

  const resetDemoData = () => {
    const fresh = {
      ...INITIAL_LIBRARY_STATE,
      lastSyncedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    channelRef.current?.postMessage({ type: 'SYNC_STATE', payload: fresh });
    setState(fresh);
    setActiveMemberId(fresh.members[0]?.id ?? 'mb-001');
  };

  return (
    <LibraryContext.Provider
      value={{
        state,
        role,
        setRole,
        activeMemberId,
        setActiveMemberId,
        activeMember,
        borrowBook,
        reserveBook,
        returnBook,
        renewLoan,
        fulfillReservation,
        cancelReservation,
        markFinePaid,
        addBook,
        updateBook,
        deleteBook,
        registerMember,
        toggleMemberStatus,
        toggleBookmark,
        updateSettings,
        generateAutomatedReport,
        resetDemoData,
        isSyncing,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
