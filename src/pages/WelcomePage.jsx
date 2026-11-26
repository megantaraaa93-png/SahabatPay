import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Volume2, Hand, LogIn, UserPlus, PlayCircle } from 'lucide-react';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

const modes = [
  {
    id: 'normal',
    label: 'Mode Normal',
    description: 'Tampilan standar dengan semua fitur lengkap dan visual modern.',
    icon: Eye,
    iconBg: 'bg-brand-forest',
  },
  {
    id: 'audio',
    label: 'Audio Guidance',
    description: 'Panduan suara untuk membantu navigasi tanpa perlu melihat layar.',
    icon: Volume2,
    iconBg: 'bg-brand-emerald',
  },
  {
    id: 'easy',
    label: 'Easy Mode',
    description: 'Tombol besar (minimal 64px), teks lebih besar, dan langkah bertahap.',
    icon: Hand,
    iconBg: 'bg-amber-500',
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { mode: currentMode, setMode, isEasyMode, isAudioMode } = useA11y();
  const { loginDemo } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound } = useAudioGuidance();
  const [selectedMode, setSelectedMode] = useState(currentMode);

  const isFirstVisit = !localStorage.getItem('sahabatpay_welcomed');

  const fullWelcomeText =
    'Selamat datang di SahabatPay. Satu Dompet, Semua Bisa. Saya adalah asisten suara SahabatPay. Saya dapat membantu Anda menggunakan aplikasi melalui perintah suara. Anda dapat memilih: Masuk ke akun, Buat akun baru, Pelajari fitur aksesibilitas, Aktifkan mode sederhana, atau Aktifkan panduan suara. Anda dapat mengucapkan perintah suara kapan saja atau menggunakan tombol pada layar.';
  const shortWelcomeText =
    'Selamat datang kembali di SahabatPay. Satu Dompet, Semua Bisa. Silakan pilih Masuk ke akun, Buat akun baru, atau Coba Akun Demo Langsung.';
  const guideText = isFirstVisit ? fullWelcomeText : shortWelcomeText;

  const handleSelectMode = (modeId) => {
    setSelectedMode(modeId);
    setMode(modeId);
    if (modeId === 'audio') {
      const speech = isFirstVisit
        ? fullWelcomeText
        : 'Mode Audio Guidance aktif. Saya siap mendampingi Anda di setiap halaman.';
      speakText(speech);
      localStorage.setItem('sahabatpay_welcomed', 'true');
    } else {
      stopSpeech();
    }
  };

  const handleGoToLogin = () => { stopSpeech(); navigate('/login'); };
  const handleGoToRegister = () => { stopSpeech(); navigate('/register'); };
  const handleStartDemo = () => {
    stopSpeech();
    loginDemo();
    playSuccessSound();
    if (isAudioMode) speakText('Masuk sebagai akun demo berhasil. Mengarahkan ke Beranda.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center px-4 py-10">
      {/* Brand Header */}
      <header className="text-center mb-8 animate-fade-in">
        <Logo size="xl" className="mx-auto mb-5" />
        <h1 className={`font-extrabold text-brand-charcoal ${isEasyMode ? 'text-4xl' : 'text-3xl md:text-4xl'}`}>
          Sahab<span className="text-brand-forest">at</span>Pay
        </h1>
        <p className={`text-brand-muted mt-2 font-medium ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Satu Dompet, Semua Bisa.
        </p>
      </header>

      {/* Audio Guide Bar */}
      <div className="w-full max-w-md mb-6">
        <AudioGuideBar
          instructionText={guideText}
          isPlaying={isPlaying}
          onPlay={speakText}
          onStop={stopSpeech}
        />
      </div>

      {/* Mode selector */}
      <section aria-labelledby="mode-heading" className="w-full max-w-md animate-slide-up">
        <h2
          id="mode-heading"
          className={`font-semibold text-brand-charcoal text-center mb-4 ${isEasyMode ? 'text-xl' : 'text-sm'}`}
        >
          Pilih Mode Aksesibilitas:
        </h2>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Pilihan mode aksesibilitas">
          {modes.map(({ id, label, description, icon: Icon, iconBg }) => {
            const isSelected = selectedMode === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectMode(id)}
                className={`flex items-center gap-4 w-full bg-white rounded-2xl p-4 border-2 transition-all duration-200 text-left
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:ring-offset-2
                  ${isSelected
                    ? 'border-brand-forest ring-2 ring-brand-forest/15 shadow-card-md'
                    : 'border-brand-border hover:border-brand-forest/40 shadow-card'
                  }`}
              >
                <div
                  className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white`}
                  aria-hidden="true"
                >
                  <Icon size={22} strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold text-brand-charcoal ${isEasyMode ? 'text-lg' : 'text-sm'}`}>
                      {label}
                    </p>
                    {isSelected && (
                      <span className="sp-badge-forest shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className={`text-brand-muted mt-0.5 ${isEasyMode ? 'text-base' : 'text-xs'}`}>
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Auth Actions */}
      <section
        aria-label="Aksi masuk atau daftar"
        className="w-full max-w-md mt-6 flex flex-col gap-3 animate-slide-up"
      >
        <Button
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<LogIn size={18} />}
          onClick={handleGoToLogin}
        >
          Masuk ke Akun
        </Button>

        <Button
          variant="outline"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<UserPlus size={18} />}
          onClick={handleGoToRegister}
        >
          Daftar Akun Baru
        </Button>

        <Button
          variant="ghost"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<PlayCircle size={18} className="text-brand-emerald" />}
          onClick={handleStartDemo}
          className="border border-brand-emerald/30 hover:bg-brand-emerald/8 text-brand-emerald font-semibold"
        >
          Coba dengan Akun Demo Langsung
        </Button>
      </section>

      {/* Footer */}
      <footer className="mt-10 text-center">
        <p className="text-xs text-brand-muted font-medium">
          PROTOTYPE SIMULASI — Tidak menggunakan uang nyata
        </p>
        <p className="text-xs text-brand-muted/70 mt-1">
          © 2026 SahabatPay — Satu Dompet, Semua Bisa
        </p>
      </footer>
    </div>
  );
}
