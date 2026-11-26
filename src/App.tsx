import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Cat,
  CreditCard,
  FolderKanban,
  Menu,
  Plus,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { LibraryProvider, BookDraft, useLibrary } from './store/libraryStore';
import { Book } from './types/library';
import { CatalogView } from './views/CatalogView';
import { MemberDashboardView } from './views/MemberDashboardView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { CollectionMembersView } from './views/CollectionMembersView';
import { AutomatedReportsView } from './views/AutomatedReportsView';
import { BookDetailModal } from './components/BookDetailModal';
import { BookFormModal } from './components/BookFormModal';
import { MemberCardModal } from './components/MemberCardModal';
import { formatTimeOnly } from './utils/formatters';

type ActiveView = 'katalog' | 'member' | 'admin' | 'koleksi' | 'laporan';

const VIEW_LABELS: Record<ActiveView, string> = {
  katalog: 'Katalog Koleksi',
  member: 'Dashboard Member',
  admin: 'Dashboard Admin',
  koleksi: 'Manajemen Koleksi & Anggota',
  laporan: 'Pelaporan Otomatis',
};

function MeowLibraryShell() {
  const {
    state,
    role,
    setRole,
    activeMember,
    addBook,
    updateBook,
    isSyncing,
  } = useLibrary();

  const [activeView, setActiveView] = useState<ActiveView>('katalog');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [memberCardOpen, setMemberCardOpen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string, isError = false) => {
    setToast({ message, isError });
  };

  const handleSaveBook = (draft: BookDraft, editingId?: string) => {
    if (editingId) {
      const res = updateBook(editingId, draft);
      notify(res.message, !res.ok);
    } else {
      const res = addBook(draft);
      notify(res.message, !res.ok);
    }
  };

  const handleSwitchRole = (nextRole: 'member' | 'admin') => {
    setRole(nextRole);
    if (nextRole === 'admin' && activeView === 'member') {
      setActiveView('admin');
    } else if (nextRole === 'member' && (activeView === 'admin' || activeView === 'koleksi' || activeView === 'laporan')) {
      setActiveView('member');
    }
    notify(
      nextRole === 'admin'
        ? 'Beralih ke mode Pustakawan Admin.'
        : `Beralih ke mode Member (${activeMember?.name ?? 'Anggota'}).`
    );
  };

  const navItems: {
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
  }[] = [
    { id: 'katalog', label: 'Katalog Koleksi', icon: BookOpen },
    { id: 'member', label: 'Dashboard Member', icon: User },
    { id: 'admin', label: 'Monitor Transaksi', icon: Activity, adminOnly: true },
    { id: 'koleksi', label: 'Koleksi & Anggota', icon: FolderKanban, adminOnly: true },
    { id: 'laporan', label: 'Pelaporan Otomatis', icon: BarChart3, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Workspace Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Zone */}
          <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveView('katalog');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer"
            >
              <Cat className="h-5 w-5 text-emerald-900 shrink-0" aria-hidden="true" />
              <span className="font-serif text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                MeowLibrary
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="p-1.5 text-slate-500 hover:text-slate-900 lg:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Role Switcher inside Sidebar Workspace */}
          <div className="p-4 border-b border-slate-200 space-y-2">
            <p className="text-[11px] font-medium text-slate-500 px-1">Mode Akses Perpustakaan</p>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => handleSwitchRole('member')}
                className={`py-1.5 px-2 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  role === 'member'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Member
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole('admin')}
                className={`py-1.5 px-2 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  role === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1" aria-label="Navigasi utama">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account & Real-time Sync Footer */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/70">
          {role === 'member' && activeMember ? (
            <button
              type="button"
              onClick={() => setMemberCardOpen(true)}
              className="w-full text-left p-2.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer space-y-0.5"
            >
              <p className="text-xs font-semibold text-slate-900 truncate">{activeMember.name}</p>
              <p className="font-mono text-[11px] text-slate-500 truncate">
                {activeMember.memberCode} · {activeMember.tier}
              </p>
            </button>
          ) : (
            <div className="p-2.5 rounded-md bg-white border border-slate-200 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-800 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">Pustakawan Admin</p>
                <p className="text-[11px] text-slate-500 truncate">Akses Kendali Penuh</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 font-mono tabular-nums px-1">
            {isSyncing
              ? 'Menyinkronkan pembaruan...'
              : `Sinkron ${formatTimeOnly(state.lastSyncedAt)}`}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-900 whitespace-nowrap">MeowLibrary</span>
              <span aria-hidden="true">/</span>
              <span className="truncate">{VIEW_LABELS[activeView]}</span>
            </div>
          </div>

          <div className="shrink-0">
            {role === 'admin' ? (
              <button
                type="button"
                onClick={() => {
                  setEditingBook(null);
                  setBookFormOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Koleksi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMemberCardOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Kartu Anggota</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-8">
          {activeView === 'katalog' && (
            <CatalogView
              onSelectBook={(book) => setSelectedBook(book)}
              onEditBook={(book) => {
                setEditingBook(book);
                setBookFormOpen(true);
              }}
              onAddBook={() => {
                setEditingBook(null);
                setBookFormOpen(true);
              }}
              onNotify={notify}
            />
          )}

          {activeView === 'member' && (
            <MemberDashboardView
              onSelectBook={(book) => setSelectedBook(book)}
              onOpenMemberCard={() => setMemberCardOpen(true)}
              onNavigateCatalog={() => setActiveView('katalog')}
              onNotify={notify}
            />
          )}

          {activeView === 'admin' && (
            <AdminDashboardView
              onNotify={notify}
              onNavigateReports={() => setActiveView('laporan')}
            />
          )}

          {activeView === 'koleksi' && (
            <CollectionMembersView
              onAddBook={() => {
                setEditingBook(null);
                setBookFormOpen(true);
              }}
              onEditBook={(book) => {
                setEditingBook(book);
                setBookFormOpen(true);
              }}
              onNotify={notify}
            />
          )}

          {activeView === 'laporan' && <AutomatedReportsView onNotify={notify} />}
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 sm:px-8 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 no-print">
          <span>MeowLibrary · Sistem Perpustakaan Digital & Sirkulasi Terpadu</span>
          <span>Siap diterbitkan melalui GitHub & Vercel</span>
        </footer>
      </div>

      {/* Modals */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onNotify={notify}
      />

      <BookFormModal
        isOpen={bookFormOpen}
        editingBook={editingBook}
        onClose={() => {
          setBookFormOpen(false);
          setEditingBook(null);
        }}
        onSave={handleSaveBook}
      />

      <MemberCardModal
        isOpen={memberCardOpen}
        onClose={() => setMemberCardOpen(false)}
        onNotify={notify}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm px-4 py-3 rounded-md border shadow-lg text-xs font-medium flex items-center justify-between gap-4 ${
            toast.isError
              ? 'bg-red-900 text-white border-red-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <MeowLibraryShell />
    </LibraryProvider>
  );
}
