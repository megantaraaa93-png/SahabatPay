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
          className={`inline-flex items-center gap-2 font-semibold text-gray-700 hover:text-primary transition-default rounded-xl border border-gray-300 bg-white p-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
            isEasyMode ? 'min-h-[52px] px-4 text-base' : 'text-sm px-3'
          }`}
          aria-label="Kembali ke Halaman Profil"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Profil</span>
        </button>

        <h1 className={`font-bold text-gray-900 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
          Preferensi Aksesibilitas
        </h1>

        <div className="w-16" />
      </div>

      {/* Banner Penjelasan Inklusivitas */}
      <Card className="!p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <Accessibility size={22} />
          </div>
          <div>
            <p className="font-extrabold text-gray-900 text-sm">Satu Dompet, Untuk Semua Pengguna</p>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              SahabatPay dirancang inklusif. Anda dapat beralih mode kapan saja tanpa mengulang transaksi atau mengubah data saldo Anda.
            </p>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* PILIHAN 3 MODE AKSESIBILITAS */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-mode-selection" className="flex flex-col gap-3">
        <h2 id="heading-mode-selection" className={`font-bold text-gray-900 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Pilih Mode yang Anda Butuhkan:
        </h2>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Pilihan mode aksesibilitas">
          {/* OPSI 1: NORMAL MODE */}
          <ModeCard
            modeKey="normal"
            currentMode={mode}
            title="Normal Mode (Tampilan Standar)"
            badgeText="Standar"
            badgeColor="bg-blue-100 text-blue-800 border-blue-200"
            icon={<Eye size={22} className="text-blue-600" />}
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
            badgeColor="bg-purple-100 text-purple-800 border-purple-200"
            icon={<Volume2 size={22} className="text-purple-600" />}
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
            badgeColor="bg-amber-100 text-amber-800 border-amber-200"
            icon={<Smartphone size={22} className="text-amber-600" />}
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
        <h2 id="heading-shields" className={`font-bold text-gray-900 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Perlindungan Khusus Transaksi (Shields)
        </h2>

        <div className="flex flex-col gap-3">
          {/* Tremor Shield Switch */}
          <Card className="!p-4 bg-white border-gray-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`font-extrabold text-gray-900 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Tremor Shield
                </p>
                <p className={`text-gray-600 mt-0.5 leading-relaxed ${isEasyMode ? 'text-base' : 'text-xs'}`}>
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
                className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                  tremorShieldEnabled ? 'bg-secondary' : 'bg-gray-300'
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
            <span className="text-[11px] font-semibold text-secondary-dark">
              Status: {tremorShieldEnabled ? 'Aktif (Direkomendasikan)' : 'Nonaktif'}
            </span>

            {/* Selector Durasi Tremor Shield — tampil hanya jika aktif */}
            {tremorShieldEnabled && (
              <div className="mt-1 pt-3 border-t border-gray-100">
                <p className={`font-semibold text-gray-700 mb-2 ${isEasyMode ? 'text-base' : 'text-xs'}`}>
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
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                          isEasyMode ? 'min-h-[48px] text-sm px-4' : ''
                        } ${
                          isSelected
                            ? 'bg-secondary text-white border-secondary shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Cognitive Delay Shield Switch */}
          <Card className="!p-4 bg-white border-gray-200 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`font-extrabold text-gray-900 ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                  Cognitive Delay Shield (Jeda 10 Detik)
                </p>
                <p className={`text-gray-600 mt-0.5 leading-relaxed ${isEasyMode ? 'text-base' : 'text-xs'}`}>
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
                className={`w-14 h-8 rounded-full transition-colors relative p-1 shrink-0 focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                  cognitiveDelayEnabled ? 'bg-secondary' : 'bg-gray-300'
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
            <span className="text-[11px] font-semibold text-secondary-dark">
              Status: {cognitiveDelayEnabled ? 'Aktif (Direkomendasikan)' : 'Nonaktif'}
            </span>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* KONTROL PENGUJIAN AUDIO GUIDANCE */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-audio-test">
        <h2 id="heading-audio-test" className={`font-bold text-gray-900 mb-2 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Uji Coba Suara Panduan
        </h2>

        <Card className="!p-4 bg-white border-gray-200 shadow-sm flex flex-col gap-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            Tekan tombol di bawah untuk mendengarkan simulasi pembacaan suara sintetis Bahasa Indonesia SahabatPay:
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size={isEasyMode ? 'lg' : 'md'}
              icon={<Play size={16} />}
              onClick={handleTestAudio}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
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
                className="text-gray-600"
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
      className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-default focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
        isEasy ? 'min-h-[64px] p-5' : ''
      } ${
        isSelected
          ? 'bg-red-50/60 border-primary ring-2 ring-primary/20 shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 shrink-0" aria-hidden="true">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-extrabold text-gray-900 ${isEasy ? 'text-lg' : 'text-base'}`}>
                {title}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {badgeText}
              </span>
            </div>
            <p className={`text-gray-600 mt-1 leading-relaxed ${isEasy ? 'text-base' : 'text-xs'}`}>
              {description}
            </p>
          </div>
        </div>

        {/* Radio Indicator Visual + Teks */}
        <div className="shrink-0 flex items-center gap-1.5 pt-1">
          {isSelected ? (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary bg-white px-2.5 py-1 rounded-full border border-primary shadow-xs">
              <CheckCircle2 size={14} />
              <span>Aktif</span>
            </span>
          ) : (
            <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-300" />
          )}
        </div>
      </div>

      {/* Rincian Manfaat Mode */}
      <ul className="mt-3.5 pt-3 border-t border-gray-200/80 flex flex-col gap-1.5 text-xs text-gray-600">
        {features.map((feat, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-secondary-dark font-bold">✓</span>
            <span className={isEasy ? 'text-sm' : 'text-xs'}>{feat}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
