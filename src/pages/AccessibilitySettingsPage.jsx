import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Accessibility,
  Volume2,
  VolumeX,
  Smartphone,
  Eye,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Play,
  Square,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { useA11y, TREMOR_DURATION_OPTIONS } from '../context/A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function AccessibilitySettingsPage() {
  const navigate = useNavigate();
  const {
    mode,
    setMode,
    isEasyMode,
    isAudioMode,
    tremorShieldEnabled,
    setTremorShieldEnabled,
    tremorDurationMs,
    setTremorDuration,
    cognitiveDelayEnabled,
    setCognitiveDelayEnabled,
  } = useA11y();
  const { isPlaying, speakText, stopSpeech, playSuccessSound } = useAudioGuidance();

  const [testSpeechPlaying, setTestSpeechPlaying] = useState(false);

  const guideText = `Halaman Pengaturan Aksesibilitas SahabatPay. Anda dapat memilih satu dari tiga mode yang tersedia: Normal Mode untuk tampilan standar, Audio Guidance Mode untuk panduan suara bagi penyandang tunanetra, atau Easy Mode dengan tombol ekstra besar minimal 64 piksel untuk kemudahan motorik. Pilihlah mode yang paling nyaman bagi Anda.`;

  // Pemilihan Mode
  const handleSelectMode = (newMode, modeName) => {
    setMode(newMode);
    playSuccessSound();
    if (newMode === 'audio' || isAudioMode) {
      speakText(`Mode aksesibilitas diubah ke ${modeName}. Seluruh halaman kini menggunakan ${modeName}.`);
    }
  };

  // Uji Coba Suara Panduan Audio
  const handleTestAudio = () => {
    stopSpeech();
    setTestSpeechPlaying(true);
    speakText(
      'Halo! Ini adalah contoh panduan suara SahabatPay. Seluruh instruksi, saldo, dan konfirmasi transaksi akan dibacakan dengan jelas, sementara nomor PIN Anda selalu dirahasiakan dan tidak pernah disuarakan.'
    );
  };

  const handleStopAudio = () => {
    stopSpeech();
    setTestSpeechPlaying(false);
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Audio Guide Bar */}
      <AudioGuideBar
        instructionText={guideText}
        isPlaying={isPlaying}
        onPlay={speakText}
        onStop={stopSpeech}
      />

      {/* Header Halaman */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            stopSpeech();
            navigate('/profile');
          }}
          className={`inline-flex items-center gap-2 font-semibold text-brand-charcoal hover:text-brand-forest transition-default rounded-xl border border-brand-border bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
            isEasyMode ? 'min-h-[64px] px-5 text-base' : 'min-h-[42px] text-sm px-3.5'
          }`}
          aria-label="Kembali ke Halaman Profil"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Profil</span>
        </button>

        <h1 className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Preferensi Aksesibilitas
        </h1>

        <div className="w-16" />
      </div>

      {/* Banner Penjelasan Inklusivitas */}
      <Card className="!p-4 bg-brand-forest/5 border-brand-forest/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-forest text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <Accessibility size={22} />
          </div>
          <div>
            <p className="font-extrabold text-brand-charcoal text-sm">Satu Dompet, Untuk Semua Pengguna</p>
            <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
              SahabatPay dirancang inklusif. Anda dapat beralih mode kapan saja tanpa mengulang transaksi atau mengubah data saldo Anda.
            </p>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* PILIHAN 3 MODE AKSESIBILITAS */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-mode-selection" className="flex flex-col gap-3">
        <h2 id="heading-mode-selection" className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Pilih Mode yang Anda Butuhkan:
        </h2>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Pilihan mode aksesibilitas">
          {/* OPSI 1: NORMAL MODE */}
          <ModeCard
            modeKey="normal"
            currentMode={mode}
            title="Normal Mode (Tampilan Standar)"
            badgeText="Standar"
            badgeColor="sp-badge-forest"
            icon={<Eye size={22} className="text-brand-forest" />}
            description="Tampilan antarmuka modern yang seimbang, intuitif, dan responsif untuk penggunaan harian umum."
            features={[
              'Tata letak informasi seimbang dan ringkas',
              'Navigasi cepat dan kontrol standar',
              'Optimal untuk ponsel pintar dan desktop',
            ]}
            isEasy={isEasyMode}
            onSelect={() => handleSelectMode('normal', 'Normal Mode')}
          />

          {/* OPSI 2: AUDIO GUIDANCE MODE */}
          <ModeCard
            modeKey="audio"
            currentMode={mode}
            title="Audio Guidance Mode (Panduan Suara)"
            badgeText="Tunanetra & Low Vision"
            badgeColor="sp-badge-green"
            icon={<Volume2 size={22} className="text-brand-emerald" />}
            description="Dirancang khusus untuk pengguna tunanetra atau low vision. Menyediakan instruksi suara interaktif pada setiap alur transaksi."
            features={[
              'Bilah panduan suara yang dapat diputar dan dihentikan setiap saat',
              'Fokus keyboard tegas dan indikator suara saat aksi berhasil',
              'Privasi terjamin: PIN dan password TIDAK PERNAH dibacakan audio',
            ]}
            isEasy={isEasyMode}
            onSelect={() => handleSelectMode('audio', 'Audio Guidance Mode')}
          />

          {/* OPSI 3: EASY MODE */}
          <ModeCard
            modeKey="easy"
            currentMode={mode}
            title="Easy Mode (Aksesibilitas Motorik)"
            badgeText="Keterbatasan Motorik & Lansia"
            badgeColor="sp-badge-amber"
            icon={<Smartphone size={22} className="text-amber-700" />}
            description="Dirancang untuk pengguna dengan tremor, keterbatasan gerak motorik, atau lansia. Memperbesar ukuran tombol dan tipografi."
            features={[
              'Ukuran target sentuh tombol minimal 64 piksel (mudah disentuh)',
              'Ukuran teks dan nominal jauh lebih besar dan kontras tinggi',
              'Tata letak lapang satu kolom untuk mencegah salah klik',
            ]}
            isEasy={isEasyMode}
            onSelect={() => handleSelectMode('easy', 'Easy Mode')}
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* FITUR PERLINDUNGAN KHUSUS (SHIELDS) */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-shields" className="flex flex-col gap-3">
        <h2 id="heading-shields" className={`font-bold text-brand-charcoal ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Perlindungan Khusus Transaksi (Shields)
        </h2>

        <div className="flex flex-col gap-3">
          {/* Tremor Shield Switch */}
          <Card className="!p-4 bg-white border-brand-border shadow-card flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Tremor Shield
                </p>
                <p className={`text-brand-muted mt-0.5 leading-relaxed ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                  Mewajibkan penekanan stabil selama {tremorDurationMs >= 2000 ? '2' : tremorDurationMs >= 1500 ? '1,5' : '1'} detik pada konfirmasi transaksi untuk mencegah ketidaksengajaan akibat tremor atau salah sentuh.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={tremorShieldEnabled}
                onClick={() => {
                  const next = !tremorShieldEnabled;
                  setTremorShieldEnabled(next);
                  playSuccessSound();
                  if (isAudioMode) {
                    speakText(next ? 'Tremor Shield diaktifkan.' : 'Tremor Shield dinonaktifkan.');
                  }
                }}
                className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                  tremorShieldEnabled ? 'bg-brand-emerald' : 'bg-gray-300'
                }`}
                aria-label="Aktifkan atau nonaktifkan Tremor Shield"
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                    tremorShieldEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <span className="text-[11px] font-semibold text-brand-emerald">
              Status: {tremorShieldEnabled ? 'Aktif (Direkomendasikan)' : 'Nonaktif'}
            </span>

            {/* Selector Durasi Tremor Shield — tampil hanya jika aktif */}
            {tremorShieldEnabled && (
              <div className="mt-1 pt-3 border-t border-brand-border">
                <p className={`font-semibold text-brand-charcoal mb-2 ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                  Durasi Penahanan:
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pilih durasi Tremor Shield">
                  {TREMOR_DURATION_OPTIONS.map((opt) => {
                    const isSelected = tremorDurationMs === opt.ms;
                    return (
                      <button
                        key={opt.ms}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setTremorDuration(opt.ms);
                          playSuccessSound();
                          if (isAudioMode) {
                            speakText(`Durasi Tremor Shield diubah menjadi ${opt.label}.`);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                          isEasyMode ? 'min-h-[52px] text-sm px-4' : ''
                        } ${
                          isSelected
                            ? 'bg-brand-emerald text-white border-brand-emerald shadow-sm'
                            : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-forest/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Cognitive Delay Shield Switch */}
          <Card className="!p-4 bg-white border-brand-border shadow-card flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Cognitive Delay Shield (Jeda 10 Detik)
                </p>
                <p className={`text-brand-muted mt-0.5 leading-relaxed ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                  Memberikan waktu telaah 10 detik sebelum tombol konfirmasi aktif agar Anda dapat memeriksa kembali nominal dan penerima dengan tenang.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={cognitiveDelayEnabled}
                onClick={() => {
                  const next = !cognitiveDelayEnabled;
                  setCognitiveDelayEnabled(next);
                  playSuccessSound();
                  if (isAudioMode) {
                    speakText(next ? 'Cognitive Delay Shield diaktifkan.' : 'Cognitive Delay Shield dinonaktifkan.');
                  }
                }}
                className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
                  cognitiveDelayEnabled ? 'bg-brand-emerald' : 'bg-gray-300'
                }`}
                aria-label="Aktifkan atau nonaktifkan Cognitive Delay Shield"
              >
                <span
                  className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                    cognitiveDelayEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <span className="text-[11px] font-semibold text-brand-emerald">
              Status: {cognitiveDelayEnabled ? 'Aktif (Direkomendasikan)' : 'Nonaktif'}
            </span>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* KONTROL PENGUJIAN AUDIO GUIDANCE */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-audio-test">
        <h2 id="heading-audio-test" className={`font-bold text-brand-charcoal mb-2 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Uji Coba Suara Panduan
        </h2>

        <Card className="!p-4 bg-white border-brand-border shadow-card flex flex-col gap-3">
          <p className="text-xs text-brand-muted leading-relaxed">
            Tekan tombol di bawah untuk mendengarkan simulasi pembacaan suara sintetis Bahasa Indonesia SahabatPay:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size={isEasyMode ? 'lg' : 'md'}
              icon={<Play size={16} />}
              onClick={handleTestAudio}
            >
              Putar Contoh Panduan Suara
            </Button>

            {isPlaying && (
              <Button
                type="button"
                variant="ghost"
                size={isEasyMode ? 'lg' : 'md'}
                icon={<Square size={16} />}
                onClick={handleStopAudio}
                className="text-brand-muted"
              >
                Hentikan Suara
              </Button>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ============================================================
   Sub-komponen Kartu Pilihan Mode
   ============================================================ */
function ModeCard({
  modeKey,
  currentMode,
  title,
  badgeText,
  badgeColor,
  icon,
  description,
  features,
  isEasy,
  onSelect,
}) {
  const isSelected = currentMode === modeKey;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest ${
        isEasy ? 'min-h-[64px] p-5' : ''
      } ${
        isSelected
          ? 'bg-brand-forest/5 border-brand-forest ring-2 ring-brand-forest/15 shadow-card-md'
          : 'bg-white border-brand-border hover:border-brand-muted/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-cream border border-brand-border shrink-0" aria-hidden="true">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-extrabold text-brand-charcoal ${isEasy ? 'text-lg' : 'text-base'}`}>
                {title}
              </h3>
              <span className={`text-[10px] font-bold ${badgeColor}`}>
                {badgeText}
              </span>
            </div>
            <p className={`text-brand-muted mt-1 leading-relaxed ${isEasy ? 'text-base' : 'text-xs'}`}>
              {description}
            </p>
          </div>
        </div>

        {/* Radio Indicator Visual + Teks */}
        <div className="shrink-0 flex items-center gap-1.5 pt-1">
          {isSelected ? (
            <span className="sp-badge-forest font-extrabold border border-brand-forest/30">
              <CheckCircle2 size={14} />
              <span>Aktif</span>
            </span>
          ) : (
            <span className="inline-block w-5 h-5 rounded-full border-2 border-brand-border" />
          )}
        </div>
      </div>

      {/* Rincian Manfaat Mode */}
      <ul className="mt-3.5 pt-3 border-t border-brand-border flex flex-col gap-1.5 text-xs text-brand-muted">
        {features.map((feat, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-brand-emerald shrink-0 mt-0.5" aria-hidden="true" />
            <span className={isEasy ? 'text-sm' : 'text-xs'}>{feat}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
