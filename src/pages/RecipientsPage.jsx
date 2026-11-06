import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  User,
  Clock,
  Send,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import {
  getSavedRecipients,
  addSavedRecipient,
  updateRecipientAlias,
  deleteSavedRecipient,
  searchSavedRecipients,
} from '../services/recipientService';
import { getAllRegisteredUsers } from '../services/userService';
import { maskPhoneNumber } from '../utils/transactionUtils';
import { formatTanggal } from '../utils/formatCurrency';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function RecipientsPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { user } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const userId = user?.id || user?.phone || '';

  // ============================================================
  // STATE
  // ============================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [recipients, setRecipients] = useState(() => getSavedRecipients(userId));

  // Modal: Tambah penerima baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addPhoneQuery, setAddPhoneQuery] = useState('');
  const [addAlias, setAddAlias] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Modal: Edit alias
  const [editTarget, setEditTarget] = useState(null); // { id, currentAlias }
  const [editAlias, setEditAlias] = useState('');
  const [editError, setEditError] = useState('');

  // Modal: Konfirmasi hapus
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, alias }

  // ============================================================
  // COMPUTED
  // ============================================================
  const guideText = `Halaman Daftar Penerima Transfer SahabatPay. Anda memiliki ${recipients.length} penerima tersimpan. Gunakan tombol Tambah Penerima untuk menambahkan kontak baru, atau pilih penerima dari daftar untuk langsung transfer.`;

  const filteredRecipients = useMemo(() => {
    return searchSavedRecipients(userId, searchQuery);
  }, [userId, searchQuery, recipients]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daftar pengguna terdaftar (untuk modal tambah — pencarian langsung)
  const allRegisteredUsers = useMemo(() => {
    const all = getAllRegisteredUsers();
    // Hapus diri sendiri dari daftar
    return all.filter((u) => {
      const uPhone = String(u.phone || '').replace(/\D/g, '');
      const myPhone = String(user?.phone || '').replace(/\D/g, '');
      return uPhone !== myPhone;
    });
  }, [user]);

  const filteredRegisteredUsers = useMemo(() => {
    if (!addPhoneQuery.trim()) return allRegisteredUsers;
    const q = addPhoneQuery.toLowerCase();
    const qDigits = addPhoneQuery.replace(/\D/g, '');
    return allRegisteredUsers.filter((u) => {
      const matchName = u.name?.toLowerCase().includes(q);
      const matchPhone = qDigits ? u.phone?.replace(/\D/g, '').includes(qDigits) : false;
      return matchName || matchPhone;
    });
  }, [addPhoneQuery, allRegisteredUsers]);

  // ============================================================
  // HANDLERS — TAMBAH PENERIMA
  // ============================================================
  const refreshRecipients = useCallback(() => {
    setRecipients(getSavedRecipients(userId));
  }, [userId]);

  const handleOpenAdd = () => {
    setAddPhoneQuery('');
    setAddAlias('');
    setAddError('');
    setAddSuccess('');
    setIsAddModalOpen(true);
    if (isAudioMode) speakText('Modal tambah penerima dibuka. Ketik nama atau nomor telepon untuk mencari pengguna terdaftar.');
  };

  const handleSelectFromRegistered = (regUser) => {
    setAddPhoneQuery(regUser.phone);
    setAddAlias(regUser.name || '');
    setAddError('');
  };

  const handleSubmitAdd = (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    const result = addSavedRecipient(userId, user?.phone || '', addPhoneQuery.trim(), addAlias.trim());
    if (result.success) {
      playSuccessSound();
      refreshRecipients();
      setAddSuccess(`${result.recipient.alias} berhasil ditambahkan ke daftar penerima.`);
      if (isAudioMode) speakText(`Penerima ${result.recipient.alias} berhasil disimpan.`);
      setAddPhoneQuery('');
      setAddAlias('');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess('');
      }, 1800);
    } else {
      playErrorSound();
      setAddError(result.error);
      if (isAudioMode) speakText(`Gagal: ${result.error}`);
    }
  };

  // ============================================================
  // HANDLERS — EDIT ALIAS
  // ============================================================
  const handleOpenEdit = (recipient) => {
    setEditTarget({ id: recipient.id, currentAlias: recipient.alias });
    setEditAlias(recipient.alias);
    setEditError('');
    if (isAudioMode) speakText(`Edit alias untuk penerima ${recipient.alias}.`);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!editTarget) return;

    const result = updateRecipientAlias(userId, editTarget.id, editAlias);
    if (result.success) {
      playSuccessSound();
      refreshRecipients();
      if (isAudioMode) speakText(`Alias berhasil diubah menjadi ${editAlias}.`);
      setEditTarget(null);
    } else {
      playErrorSound();
      setEditError(result.error);
    }
  };

  // ============================================================
  // HANDLERS — HAPUS
  // ============================================================
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const result = deleteSavedRecipient(userId, deleteTarget.id);
    if (result.success) {
      playSuccessSound();
      refreshRecipients();
      if (isAudioMode) speakText(`Penerima ${deleteTarget.alias} dihapus dari daftar.`);
      setDeleteTarget(null);
    } else {
      playErrorSound();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Audio Guide Bar */}
      <AudioGuideBar
        instructionText={guideText}
        isPlaying={isPlaying}
        onPlay={speakText}
        onStop={stopSpeech}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { stopSpeech(); navigate('/transfer'); }}
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke halaman Transfer"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Transfer</span>
        </button>

        <h1 className={`font-bold text-gray-900 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Daftar Penerima
        </h1>

        <Button
          variant="primary"
          size={isEasyMode ? 'lg' : 'sm'}
          icon={<UserPlus size={16} />}
          onClick={handleOpenAdd}
          aria-label="Tambah penerima baru"
        >
          Tambah
        </Button>
      </div>

      {/* Kartu Statistik */}
      <Card className="!p-4 bg-gradient-to-r from-primary to-red-500 text-white !border-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center" aria-hidden="true">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-white/90 font-medium">Penerima Tersimpan</p>
            <p className="text-2xl font-extrabold" aria-live="polite">{recipients.length} Kontak</p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <label htmlFor="recipient-search" className="sr-only">Cari penerima</label>
        <input
          id="recipient-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau nomor penerima..."
          className={`w-full pl-10 pr-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-default ${
            isEasyMode ? 'py-4 text-base min-h-[56px]' : 'py-3 text-sm'
          }`}
        />
      </div>

      {/* Daftar Penerima */}
      <section aria-labelledby="heading-recipients-list">
        <h2 id="heading-recipients-list" className="sr-only">Daftar penerima tersimpan</h2>

        {filteredRecipients.length === 0 ? (
          <Card className="!p-8 text-center bg-gray-50 border-dashed">
            <Users size={36} className="text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="font-semibold text-gray-500 text-sm">
              {searchQuery ? 'Penerima tidak ditemukan.' : 'Belum ada penerima tersimpan.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? 'Coba kata kunci lain atau tambahkan penerima baru.'
                : 'Tambahkan penerima transfer yang sering Anda gunakan.'}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                size={isEasyMode ? 'lg' : 'md'}
                icon={<UserPlus size={16} />}
                onClick={handleOpenAdd}
                className="mt-4 mx-auto"
              >
                Tambah Penerima Pertama
              </Button>
            )}
          </Card>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredRecipients.map((recipient) => (
              <Card
                key={recipient.id}
                className="!p-4 bg-white border-gray-200 shadow-sm hover:border-primary/40 transition-default"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0"
                    aria-hidden="true"
                  >
                    {recipient.alias.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-gray-900 truncate ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                      {recipient.alias}
                    </p>
                    {recipient.alias !== recipient.name && recipient.name && (
                      <p className="text-xs text-gray-500 truncate">{recipient.name}</p>
                    )}
                    <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                      <Phone size={11} aria-hidden="true" />
                      {maskPhoneNumber(recipient.phone)}
                    </p>
                  </div>

                  {/* Aksi */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Tombol Transfer Langsung */}
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/transfer', { state: { preselectedRecipient: recipient } });
                      }}
                      className={`p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        isEasyMode ? 'p-3' : ''
                      }`}
                      aria-label={`Transfer ke ${recipient.alias}`}
                    >
                      <Send size={isEasyMode ? 18 : 15} />
                    </button>

                    {/* Tombol Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(recipient)}
                      className={`p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        isEasyMode ? 'p-3' : ''
                      }`}
                      aria-label={`Edit alias ${recipient.alias}`}
                    >
                      <Edit2 size={isEasyMode ? 18 : 15} />
                    </button>

                    {/* Tombol Hapus */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: recipient.id, alias: recipient.alias })}
                      className={`p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        isEasyMode ? 'p-3' : ''
                      }`}
                      aria-label={`Hapus penerima ${recipient.alias}`}
                    >
                      <Trash2 size={isEasyMode ? 18 : 15} />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <Clock size={10} aria-hidden="true" />
                  Ditambahkan {formatTanggal(recipient.createdAt)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* MODAL: Tambah Penerima Baru */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setAddError(''); setAddSuccess(''); }}
        title="Tambah Penerima Baru"
        showDefaultFooter={false}
      >
        <form onSubmit={handleSubmitAdd} className="flex flex-col gap-4">
          {/* Cari dari pengguna terdaftar */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="add-phone-search"
              className={`font-semibold text-gray-800 ${isEasyMode ? 'text-base' : 'text-sm'}`}
            >
              Cari Pengguna Terdaftar
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                id="add-phone-search"
                type="text"
                value={addPhoneQuery}
                onChange={(e) => { setAddPhoneQuery(e.target.value); setAddError(''); }}
                placeholder="Nama atau nomor telepon..."
                className={`w-full pl-9 pr-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-default ${
                  isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'
                }`}
                autoComplete="off"
                required
              />
            </div>

            {/* Hasil pencarian pengguna terdaftar */}
            {addPhoneQuery.trim().length >= 2 && (
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-1.5">
                {filteredRegisteredUsers.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Tidak ada pengguna terdaftar yang cocok.
                  </p>
                ) : (
                  filteredRegisteredUsers.slice(0, 8).map((u) => (
                    <button
                      key={u.phone}
                      type="button"
                      onClick={() => handleSelectFromRegistered(u)}
                      className={`w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-primary hover:bg-red-50 transition-default flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        addPhoneQuery === u.phone ? 'border-primary bg-red-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{maskPhoneNumber(u.phone)}</p>
                      </div>
                      {addPhoneQuery === u.phone && (
                        <CheckCircle2 size={16} className="text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Alias penerima */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="add-alias"
              className={`font-semibold text-gray-800 ${isEasyMode ? 'text-base' : 'text-sm'}`}
            >
              Nama/Alias untuk Disimpan
            </label>
            <input
              id="add-alias"
              type="text"
              value={addAlias}
              onChange={(e) => setAddAlias(e.target.value)}
              placeholder="Contoh: Ibu, Budi Kerja, Adik..."
              maxLength={50}
              className={`w-full rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-default px-3 ${
                isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'
              }`}
              autoComplete="off"
              required
            />
          </div>

          {/* Pesan Error / Sukses */}
          {addError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs font-medium flex items-start gap-2" role="alert">
              <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <p>{addError}</p>
            </div>
          )}
          {addSuccess && (
            <div className="p-3 bg-green-50 border border-green-300 rounded-xl text-green-900 text-xs font-medium flex items-start gap-2" role="status">
              <CheckCircle2 size={15} className="shrink-0 text-secondary-dark mt-0.5" aria-hidden="true" />
              <p>{addSuccess}</p>
            </div>
          )}

          {/* Tombol */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              size={isEasyMode ? 'lg' : 'md'}
              onClick={() => { setIsAddModalOpen(false); setAddError(''); }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              icon={<UserPlus size={16} />}
              className="flex-1"
            >
              Simpan Penerima
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Edit Alias */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => { setEditTarget(null); setEditError(''); }}
        title="Ubah Nama/Alias Penerima"
        showDefaultFooter={false}
      >
        <form onSubmit={handleSubmitEdit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-alias"
              className={`font-semibold text-gray-800 ${isEasyMode ? 'text-base' : 'text-sm'}`}
            >
              Nama/Alias Baru
            </label>
            <input
              id="edit-alias"
              type="text"
              value={editAlias}
              onChange={(e) => { setEditAlias(e.target.value); setEditError(''); }}
              maxLength={50}
              className={`w-full rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-default px-3 ${
                isEasyMode ? 'py-3.5 text-base min-h-[56px]' : 'py-2.5 text-sm'
              }`}
              required
            />
          </div>

          {editError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs font-medium flex items-start gap-2" role="alert">
              <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" aria-hidden="true" />
              <p>{editError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="ghost" size={isEasyMode ? 'lg' : 'md'} onClick={() => setEditTarget(null)} className="flex-1">
              Batal
            </Button>
            <Button type="submit" variant="primary" size={isEasyMode ? 'lg' : 'md'} icon={<CheckCircle2 size={16} />} className="flex-1">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Konfirmasi Hapus */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Penerima?"
        showDefaultFooter={false}
      >
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-start gap-3">
              <Trash2 size={20} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className={`font-bold text-gray-900 ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                  Hapus "{deleteTarget.alias}"?
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Penerima ini akan dihapus dari daftar Anda. Tindakan ini tidak memengaruhi riwayat transaksi yang sudah ada.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" size={isEasyMode ? 'lg' : 'md'} onClick={() => setDeleteTarget(null)} className="flex-1">
                Batal
              </Button>
              <Button
                type="button"
                size={isEasyMode ? 'lg' : 'md'}
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                icon={<Trash2 size={16} />}
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
