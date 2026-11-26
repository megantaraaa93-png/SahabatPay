import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { getAllRegisteredUsers, findRegisteredUser } from '../services/userService';
import { maskPhoneNumber } from '../utils/transactionUtils';
import { formatTanggal } from '../utils/formatCurrency';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function RecipientsPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const isExternalCandidate = useMemo(() => {
    const cleanDigits = addPhoneQuery.replace(/\D/g, '');
    const myDigits = String(user?.phone || '').replace(/\D/g, '');
    if (cleanDigits.length < 9) return false;
    if (myDigits && cleanDigits === myDigits) return false;
    return !findRegisteredUser(addPhoneQuery);
  }, [addPhoneQuery, user]);

  // ============================================================
  // HANDLERS — TAMBAH PENERIMA
  // ============================================================
  const refreshRecipients = useCallback(() => {
    setRecipients(getSavedRecipients(userId));
  }, [userId]);

  // Sinkronisasi dengan Voice-Driven Add Recipient state machine
  useEffect(() => {
    if (location.state?.openAddModal !== undefined) {
      setIsAddModalOpen(Boolean(location.state.openAddModal));
    }
    if (location.state?.voiceDraft) {
      const { alias, phone } = location.state.voiceDraft;
      if (alias !== undefined) setAddAlias(alias);
      if (phone !== undefined) setAddPhoneQuery(phone);
    }
  }, [location.state]);

  useEffect(() => {
    const handleUpdated = () => refreshRecipients();
    window.addEventListener('sahabatpay:recipients-updated', handleUpdated);
    return () => window.removeEventListener('sahabatpay:recipients-updated', handleUpdated);
  }, [refreshRecipients]);

  const handleOpenAdd = () => {
    setAddPhoneQuery('');
    setAddAlias('');
    setAddError('');
    setAddSuccess('');
    setIsAddModalOpen(true);
    if (isAudioMode) {
      speakText(
        'Modal tambah penerima dibuka. Ketik nama atau nomor telepon untuk mencari pengguna terdaftar, atau masukkan nomor baru minimal sembilan digit beserta alias untuk menyimpannya sebagai penerima simulasi.'
      );
    }
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
      const isSim = Boolean(result.recipient.isDemo);
      setAddSuccess(
        isSim
          ? `${result.recipient.alias} berhasil ditambahkan sebagai penerima simulasi (belum terdaftar di SahabatPay).`
          : `${result.recipient.alias} berhasil ditambahkan ke daftar penerima.`
      );
      if (isAudioMode) {
        speakText(
          isSim
            ? `Penerima ${result.recipient.alias} berhasil disimpan sebagai penerima simulasi karena nomor belum terdaftar.`
            : `Penerima ${result.recipient.alias} berhasil disimpan.`
        );
      }
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
          className={`inline-flex items-center gap-2 font-semibold text-brand-charcoal hover:text-brand-forest transition-default rounded-xl border border-brand-border bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
            isEasyMode ? 'min-h-[64px] px-5 text-base' : 'min-h-[42px] text-sm px-3.5'
          }`}
          aria-label="Kembali ke halaman Transfer"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Transfer</span>
        </button>

        <h1 className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
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
      <div className="balance-card rounded-2xl p-5 text-white shadow-balance">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center" aria-hidden="true">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-white/75 font-medium">Penerima Tersimpan</p>
            <p className="text-2xl font-extrabold tabular-nums" aria-live="polite">{recipients.length} Kontak</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted"
          aria-hidden="true"
        />
        <label htmlFor="recipient-search" className="sr-only">Cari penerima</label>
        <input
          id="recipient-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau nomor penerima..."
          className={`w-full pl-10 pr-4 rounded-xl border border-brand-border bg-white text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest placeholder:text-brand-muted/60 transition-default ${
            isEasyMode ? 'py-4 text-base min-h-[64px]' : 'py-3 text-sm min-h-[46px]'
          }`}
        />
      </div>

      {/* Daftar Penerima */}
      <section aria-labelledby="heading-recipients-list">
        <h2 id="heading-recipients-list" className="sr-only">Daftar penerima tersimpan</h2>

        {filteredRecipients.length === 0 ? (
          <Card className="!p-8 text-center bg-white border-dashed border-brand-border">
            <Users size={36} className="text-brand-muted/40 mx-auto mb-3" aria-hidden="true" />
            <p className="font-semibold text-brand-charcoal text-sm">
              {searchQuery ? 'Penerima tidak ditemukan.' : 'Belum ada penerima tersimpan.'}
            </p>
            <p className="text-xs text-brand-muted mt-1">
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
                className="!p-4 bg-white border-brand-border shadow-card hover:border-brand-forest/40 transition-default"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center font-bold text-base shrink-0"
                    aria-hidden="true"
                  >
                    {recipient.alias.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`font-bold text-brand-charcoal truncate ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                        {recipient.alias}
                      </p>
                      {recipient.isDemo && (
                        <span className="sp-badge-amber text-[10px]">
                          Penerima Simulasi
                        </span>
                      )}
                    </div>
                    {recipient.alias !== recipient.name && recipient.name && (
                      <p className="text-xs text-brand-muted truncate">{recipient.name}</p>
                    )}
                    <p className="text-xs text-brand-muted font-mono mt-0.5 flex items-center gap-1">
                      <Phone size={11} aria-hidden="true" />
                      {maskPhoneNumber(recipient.phone)}
                    </p>
                    {recipient.isDemo && (
                      <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                        Belum terdaftar • Hanya simulasi (tidak mengirim uang riil)
                      </p>
                    )}
                  </div>

                  {/* Aksi */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Tombol Transfer Langsung */}
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/transfer', { state: { preselectedRecipient: recipient } });
                      }}
                      className={`p-2 rounded-xl bg-brand-forest/10 text-brand-forest hover:bg-brand-forest/20 transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                        isEasyMode ? 'p-3.5 min-h-[48px] min-w-[48px]' : ''
                      }`}
                      aria-label={
                        recipient.isDemo
                          ? `Transfer simulasi ke ${recipient.alias} (Penerima Simulasi)`
                          : `Transfer ke ${recipient.alias}`
                      }
                    >
                      <Send size={isEasyMode ? 18 : 15} />
                    </button>

                    {/* Tombol Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(recipient)}
                      className={`p-2 rounded-xl bg-brand-cream text-brand-charcoal hover:bg-brand-border/60 transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                        isEasyMode ? 'p-3.5 min-h-[48px] min-w-[48px]' : ''
                      }`}
                      aria-label={`Edit alias ${recipient.alias}`}
                    >
                      <Edit2 size={isEasyMode ? 18 : 15} />
                    </button>

                    {/* Tombol Hapus */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: recipient.id, alias: recipient.alias })}
                      className={`p-2 rounded-xl bg-brand-coral/10 text-brand-coral hover:bg-brand-coral/20 transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral ${
                        isEasyMode ? 'p-3.5 min-h-[48px] min-w-[48px]' : ''
                      }`}
                      aria-label={`Hapus penerima ${recipient.alias}`}
                    >
                      <Trash2 size={isEasyMode ? 18 : 15} />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-brand-muted/70 mt-2 flex items-center gap-1">
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
          {/* Cari dari pengguna terdaftar atau masukkan nomor eksternal */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="add-phone-search"
              className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}
            >
              Cari Pengguna Terdaftar / Nomor Telepon
            </label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" aria-hidden="true" />
              <input
                id="add-phone-search"
                type="text"
                value={addPhoneQuery}
                onChange={(e) => { setAddPhoneQuery(e.target.value); setAddError(''); }}
                placeholder="Nama pengguna atau nomor HP (min. 9 digit)..."
                className={`w-full pl-9 pr-3 rounded-xl border border-brand-border bg-white text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest transition-default ${
                  isEasyMode ? 'py-3.5 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[46px]'
                }`}
                autoComplete="off"
                required
              />
            </div>

            {/* Hasil pencarian pengguna terdaftar */}
            {addPhoneQuery.trim().length >= 2 && (
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto rounded-xl border border-brand-border bg-brand-cream/40 p-1.5">
                {filteredRegisteredUsers.length === 0 ? (
                  <p className="text-xs text-brand-muted text-center py-2 px-2">
                    Tidak ada pengguna terdaftar yang cocok. Masukkan nomor HP minimal 9 digit dan isi alias di bawah untuk menyimpan sebagai penerima simulasi.
                  </p>
                ) : (
                  filteredRegisteredUsers.slice(0, 8).map((u) => (
                    <button
                      key={u.phone}
                      type="button"
                      onClick={() => handleSelectFromRegistered(u)}
                      className={`w-full text-left px-3 py-2 rounded-lg bg-white border border-brand-border hover:border-brand-forest hover:bg-brand-forest/5 transition-default flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                        addPhoneQuery === u.phone ? 'border-brand-forest bg-brand-forest/5' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-forest/10 text-brand-forest flex items-center justify-center font-bold text-sm shrink-0">
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-charcoal truncate">{u.name}</p>
                        <p className="text-xs text-brand-muted font-mono">{maskPhoneNumber(u.phone)}</p>
                      </div>
                      {addPhoneQuery === u.phone && (
                        <CheckCircle2 size={16} className="text-brand-forest ml-auto shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Keterangan penerima eksternal simulasi */}
            {isExternalCandidate && (
              <div
                className="sp-alert-warning text-xs flex items-start gap-2"
                role="status"
                aria-live="polite"
              >
                <AlertCircle size={15} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
                <p>
                  Nomor ini belum terdaftar di SahabatPay. Jika disimpan, kontak ini akan ditandai sebagai{' '}
                  <strong>Penerima Simulasi</strong> (hanya untuk demonstrasi, tidak mengirim uang riil).
                </p>
              </div>
            )}
          </div>

          {/* Alias penerima */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="add-alias"
              className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}
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
              className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest transition-default px-3 ${
                isEasyMode ? 'py-3.5 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[46px]'
              }`}
              autoComplete="off"
              required
            />
          </div>

          {/* Pesan Error / Sukses */}
          {addError && (
            <div className="sp-alert-error text-xs flex items-start gap-2" role="alert">
              <AlertCircle size={15} className="shrink-0 text-brand-coral mt-0.5" aria-hidden="true" />
              <p>{addError}</p>
            </div>
          )}
          {addSuccess && (
            <div className="sp-alert-success text-xs flex items-start gap-2" role="status">
              <CheckCircle2 size={15} className="shrink-0 text-brand-emerald mt-0.5" aria-hidden="true" />
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
              className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}
            >
              Nama/Alias Baru
            </label>
            <input
              id="edit-alias"
              type="text"
              value={editAlias}
              onChange={(e) => { setEditAlias(e.target.value); setEditError(''); }}
              maxLength={50}
              className={`w-full rounded-xl border border-brand-border bg-white text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-forest/20 focus:border-brand-forest transition-default px-3 ${
                isEasyMode ? 'py-3.5 text-base min-h-[64px]' : 'py-2.5 text-sm min-h-[46px]'
              }`}
              required
            />
          </div>

          {editError && (
            <div className="sp-alert-error text-xs flex items-start gap-2" role="alert">
              <AlertCircle size={15} className="shrink-0 text-brand-coral mt-0.5" aria-hidden="true" />
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
            <div className="sp-alert-error flex items-start gap-3">
              <Trash2 size={20} className="text-brand-coral shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-base' : 'text-sm'}`}>
                  Hapus "{deleteTarget.alias}"?
                </p>
                <p className="text-xs text-brand-muted mt-1">
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
                variant="danger"
                size={isEasyMode ? 'lg' : 'md'}
                onClick={handleConfirmDelete}
                className="flex-1"
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
