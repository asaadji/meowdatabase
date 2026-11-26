import React, { useState } from 'react';
import { Cat, UserPlus, X } from 'lucide-react';
import { useLibrary } from '../store/libraryStore';
import { MemberTier } from '../types/library';
import { formatDateShort } from '../utils/formatters';
import { MemberStatusText } from './StatusIndicator';

interface MemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({ isOpen, onClose, onNotify }) => {
  const { state, activeMember, setActiveMemberId, registerMember } = useLibrary();
  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState<MemberTier>('Reguler');

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      onNotify('Nama dan email wajib diisi.', true);
      return;
    }
    const maxLoans = tier === 'Prioritas' ? 5 : tier === 'Riset' ? 4 : 3;
    const res = registerMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '0812-0000-0000',
      tier,
      status: 'Aktif',
      maxLoans,
    });
    if (res.ok && res.member) {
      setActiveMemberId(res.member.id);
      setShowRegister(false);
      setName('');
      setEmail('');
      setPhone('');
      onNotify(`Selamat datang di MeowLibrary, ${res.member.name}!`);
    } else {
      onNotify(res.message, true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-card-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 id="member-card-modal-title" className="font-serif text-lg font-semibold text-slate-900">
            Kartu Anggota Digital & Sesi Member
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kartu anggota"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeMember && !showRegister && (
            <>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-white space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Cat className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                    <div>
                      <p className="font-serif text-base font-semibold tracking-tight">MeowLibrary</p>
                      <p className="text-[11px] text-slate-400">Kartu Keanggotaan Digital</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-emerald-300 tabular-nums">
                    Paket {activeMember.tier}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-semibold tracking-tight">{activeMember.name}</p>
                  <p className="font-mono text-xs text-slate-300 tabular-nums">
                    {activeMember.memberCode} · {activeMember.email}
                  </p>
                </div>

                <div className="flex items-end justify-between border-t border-slate-800 pt-4">
                  <div className="text-xs text-slate-400 space-y-0.5 tabular-nums">
                    <p>Kuota Pinjam: Maks. {activeMember.maxLoans} buku</p>
                    <p>Bergabung: {formatDateShort(activeMember.joinedAt)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 h-8" aria-label="Kode batang keanggotaan">
                    {[3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2].map((w, idx) => (
                      <span
                        key={idx}
                        className="bg-white/90 h-full inline-block"
                        style={{ width: `${w * 1.5}px`, marginRight: '1.5px' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="switch-member-select" className="text-xs font-medium text-slate-700">
                    Ganti Akun Member Aktif (Simulasi Multi-Member)
                  </label>
                  <MemberStatusText status={activeMember.status} />
                </div>
                <select
                  id="switch-member-select"
                  value={activeMember.id}
                  onChange={(e) => setActiveMemberId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
                >
                  {state.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.memberCode}) · {m.tier}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {showRegister && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rania Putri"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rania@email.id"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Telepon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tingkat Keanggotaan</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as MemberTier)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-800 focus:outline-none"
                >
                  <option value="Reguler">Reguler (Maks. 3 buku)</option>
                  <option value="Riset">Riset (Maks. 4 buku)</option>
                  <option value="Prioritas">Prioritas (Maks. 5 buku)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-md hover:bg-emerald-800 cursor-pointer"
                >
                  Daftarkan Anggota Baru
                </button>
              </div>
            </form>
          )}
        </div>

        {!showRegister && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-900 hover:text-emerald-700 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Daftar Anggota Baru</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
