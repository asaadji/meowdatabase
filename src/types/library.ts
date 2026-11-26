export type UserRole = 'admin' | 'member';

export type BookCategory =
  | 'Fiksi & Sastra'
  | 'Teknologi & Data'
  | 'Arsitektur & Desain'
  | 'Filsafat & Humaniora'
  | 'Sains & Ekologi';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  category: BookCategory;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl?: string;
  coverAccent: string;
  synopsis: string;
  pages: number;
  language: 'Indonesia' | 'Inggris';
  rating: number;
  borrowCount: number;
  createdAt: string;
  updatedAt: string;
}

export type MemberTier = 'Reguler' | 'Riset' | 'Prioritas';
export type MemberStatus = 'Aktif' | 'Ditangguhkan';

export interface Member {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  phone: string;
  tier: MemberTier;
  status: MemberStatus;
  joinedAt: string;
  maxLoans: number;
  totalFinesPaid: number;
}

export type TransactionType =
  | 'Peminjaman'
  | 'Pengembalian'
  | 'Perpanjangan'
  | 'Reservasi';

export type TransactionStatus =
  | 'Menunggu'
  | 'Dipinjam'
  | 'Terlambat'
  | 'Dikembalikan'
  | 'Tersedia Diambil'
  | 'Dibatalkan';

export interface Transaction {
  id: string;
  transactionCode: string;
  bookId: string;
  bookTitle: string;
  bookIsbn: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  type: TransactionType;
  status: TransactionStatus;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  renewCount: number;
  fineAmount: number;
  finePaid: boolean;
  notes?: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorRole: 'Admin' | 'Member' | 'Sistem';
  actorName: string;
  action: string;
  detail: string;
  txCode?: string;
}

export interface AutomatedReportRecord {
  id: string;
  reportCode: string;
  periodLabel: string;
  reportType: 'Harian' | 'Mingguan' | 'Bulanan' | 'Audit Denda';
  generatedAt: string;
  totalTransactions: number;
  activeLoans: number;
  overdueCount: number;
  collectedFinesRp: number;
  topCategory: string;
}

export interface LibrarySettings {
  libraryName: string;
  loanDurationDays: number;
  maxRenewals: number;
  dailyFineRp: number;
  maxBooksPerMember: number;
  autoReportSchedule: 'Harian' | 'Mingguan' | 'Bulanan';
  autoFineCalculation: boolean;
}

export interface LibraryState {
  books: Book[];
  members: Member[];
  transactions: Transaction[];
  activityLogs: ActivityLog[];
  reportSnapshots: AutomatedReportRecord[];
  bookmarks: Record<string, string[]>;
  settings: LibrarySettings;
  lastSyncedAt: string;
}
