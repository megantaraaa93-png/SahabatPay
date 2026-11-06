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
    color: 'bg-primary',
  },
  {
    id: 'audio',
    label: 'Audio Guidance',
    description: 'Panduan suara untuk membantu navigasi tanpa perlu melihat layar.',
    icon: Volume2,
    color: 'bg-secondary',
  },
  {
    id: 'easy',
    label: 'Easy Mode',
    description: 'Tombol besar (minimal 64px), teks lebih besar, dan langkah bertahap.',
    icon: Hand,
    color: 'bg-amber-500',
  },
];

/**
 * Halaman selamat datang SahabatPay.
 * Pengguna memilih mode aksesibilitas, lalu dapat Masuk, Daftar, atau Coba Akun Demo.
 */
export default function WelcomePage() {
  const navigate = useNavigate();
  const { mode: currentMode, setMode, isEasyMode, isAudioMode } = useA11y();
  const { loginDemo } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound } = useAudioGuidance();
  const [selectedMode, setSelectedMode] = useState(currentMode);

  // Cek apakah ini kunjungan pertama kali
  const isFirstVisit = !localStorage.getItem('sahabatpay_welcomed');

  // Sambutan lengkap untuk kunjungan pertama
  const fullWelcomeText =
    'Selamat datang di SahabatPay. Satu Dompet, Semua Bisa. Saya adalah asisten suara SahabatPay. Saya dapat membantu Anda menggunakan aplikasi melalui perintah suara. Anda dapat memilih: Masuk ke akun, Buat akun baru, Pelajari fitur aksesibilitas, Aktifkan mode sederhana, atau Aktifkan panduan suara. Anda dapat mengucapkan perintah suara kapan saja atau menggunakan tombol pada layar.';

  // Sambutan singkat untuk kunjungan berikutnya
  const shortWelcomeText =
    'Selamat datang kembali di SahabatPay. Satu Dompet, Semua Bisa. Silakan pilih Masuk ke akun, Buat akun baru, atau Coba Akun Demo Langsung.';

  const guideText = isFirstVisit ? fullWelcomeText : shortWelcomeText;

  const handleSelectMode = (modeId) => {
    setSelectedMode(modeId);
    setMode(modeId);

    if (modeId === 'audio') {
      const speech = isFirstVisit ? fullWelcomeText : 'Mode Audio Guidance aktif. Saya siap mendampingi Anda di setiap halaman.';
      speakText(speech);
      localStorage.setItem('sahabatpay_welcomed', 'true');
    } else {
      stopSpeech();
    }
  };

  const handleGoToLogin = () => {
    stopSpeech();
    navigate('/login');
  };

  const handleGoToRegister = () => {
    stopSpeech();
    navigate('/register');
  };

  const handleStartDemoAccount = () => {
    stopSpeech();
    loginDemo();
    playSuccessSound();
    if (isAudioMode) {
      speakText('Masuk sebagai akun demo berhasil. Mengarahkan ke Beranda.');
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      {/* Header branding dengan Logo Resmi SahabatPay */}
      <header className="text-center mb-8">
        <Logo size="xl" className="mx-auto mb-4 drop-shadow-md" />
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
          Sahab<span className="text-primary">at</span>Pay
        </h1>
        <p className="text-gray-600 mt-2 text-base md:text-lg font-medium">
          Satu Dompet, Semua Bisa.
        </p>
      </header>

      {/* Audio Guide Bar jika pengguna berada dalam Audio Mode atau ingin mendengarkan */}
      <div className="w-full max-w-md mb-6">
        <AudioGuideBar
          instructionText={guideText}
          isPlaying={isPlaying}
          onPlay={speakText}
          onStop={stopSpeech}
        />
      </div>

      {/* Pilihan mode */}
      <section aria-labelledby="mode-heading" className="w-full max-w-md">
        <h2
          id="mode-heading"
          className={`font-semibold text-gray-800 text-center mb-4 ${
            isEasyMode ? 'text-xl' : 'text-base'
          }`}
        >
          Pilih Mode Aksesibilitas Anda:
        </h2>

        <div
          className="flex flex-col gap-3"
          role="radiogroup"
          aria-label="Pilihan mode aksesibilitas"
        >
          {modes.map(({ id, label, description, icon: Icon, color }) => {
            const isSelected = selectedMode === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectMode(id)}
                className={`flex items-center gap-4 w-full bg-white rounded-2xl p-4 border transition-default text-left focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div
                  className={`${color} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white`}
                  aria-hidden="true"
                >
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`font-semibold text-gray-800 ${
                        isEasyMode ? 'text-lg' : 'text-base'
                      }`}
                    >
                      {label}
                    </p>
                    {isSelected && (
                      <span className="text-xs bg-red-100 text-primary font-bold px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-gray-600 mt-0.5 ${
                      isEasyMode ? 'text-base' : 'text-xs'
                    }`}
                  >
                    {description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Tombol Aksi Autentikasi */}
      <section
        aria-label="Aksi masuk atau daftar"
        className="w-full max-w-md mt-6 flex flex-col gap-3"
      >
        <Button
          variant="primary"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<LogIn size={20} />}
          onClick={handleGoToLogin}
        >
          Masuk ke Akun
        </Button>

        <Button
          variant="outline"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<UserPlus size={20} />}
          onClick={handleGoToRegister}
        >
          Daftar Akun Baru
        </Button>

        <Button
          variant="ghost"
          size={isEasyMode ? 'lg' : 'md'}
          fullWidth
          icon={<PlayCircle size={20} className="text-secondary" />}
          onClick={handleStartDemoAccount}
          className="border border-secondary/30 bg-green-50/50 hover:bg-green-50 text-secondary-dark font-medium"
        >
          Coba dengan Akun Demo Langsung
        </Button>
      </section>

      {/* Footer prototype notice dengan kontras tinggi (WCAG AA compliant) */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-600 font-medium">
          PROTOTYPE SIMULASI — Tidak menggunakan uang nyata
        </p>
        <p className="text-xs text-gray-500 mt-1">
          © 2026 SahabatPay — Satu Dompet, Semua Bisa
        </p>
      </footer>
    </div>
  );
}
