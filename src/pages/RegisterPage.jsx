import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAuth } from '../context/AuthContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isEasyMode, isAudioMode } = useA11y();
  const { register } = useAuth();
  const { isPlaying, speakText, stopSpeech, playSuccessSound, playErrorSound } = useAudioGuidance();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guideText =
    'Halaman Pendaftaran Akun SahabatPay. Langkah satu dari tiga. Lengkapi nama lengkap, nomor handphone, alamat email, kata sandi, dan konfirmasi kata sandi Anda. Jangan lupa menyetujui syarat dan ketentuan simulasi.';

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Nama lengkap wajib diisi.';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Nama lengkap minimal 3 karakter.';
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor handphone wajib diisi.';
    } else if (cleanPhone.length < 9 || cleanPhone.length > 14) {
      newErrors.phone = 'Nomor handphone tidak valid (minimal 10 digit).';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format alamat email belum tepat.';
    }

    if (!formData.password) {
      newErrors.password = 'Kata sandi wajib diisi.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Kata sandi minimal 6 karakter.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Wajib mengonfirmasi kata sandi.';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Anda harus menyetujui ketentuan simulasi prototype ini.';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      playErrorSound();
      const firstError = Object.values(validationErrors)[0];
      if (isAudioMode) {
        speakText(`Pendaftaran belum dapat diproses. ${firstError}`);
      }
      return;
    }

    setIsSubmitting(true);
    await register({
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      password: formData.password,
    });
    setIsSubmitting(false);

    playSuccessSound();
    if (isAudioMode) {
      speakText('Data pendaftaran berhasil disimpan. Melanjutkan ke langkah verifikasi kode OTP.');
    }
    navigate('/verification');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Tombol kembali */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              stopSpeech();
              navigate('/login');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-primary transition-default p-1 rounded-lg focus-visible:outline focus-visible:outline-3 focus-visible:outline-primary"
            aria-label="Kembali ke halaman masuk"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Kembali ke Masuk</span>
          </button>

          {/* Indikator Progres */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-dark bg-red-100 px-3 py-1 rounded-full border border-red-200">
            <span>Langkah 1 dari 3</span>
          </div>
        </div>

        {/* Audio Guide Bar */}
        <div className="mb-5">
          <AudioGuideBar
            instructionText={guideText}
            isPlaying={isPlaying}
            onPlay={speakText}
            onStop={stopSpeech}
          />
        </div>

        <Card className="!p-6 md:!p-8 shadow-md">
          {/* Header dengan Logo Resmi SahabatPay */}
          <div className="text-center mb-6">
            <Logo size="lg" className="mx-auto mb-3 drop-shadow-md" />
            <h1 className={`font-bold text-gray-800 ${isEasyMode ? 'text-2xl' : 'text-xl'}`}>
              Daftar Akun Baru
            </h1>
            <p className={`text-gray-600 mt-1 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Bergabung bersama SahabatPay dan nikmati kemudahan transaksi inklusif.
            </p>

            {/* Stepper Visual */}
            <div className="flex items-center justify-center gap-2 mt-4" aria-hidden="true">
              <span className="w-8 h-2 rounded-full bg-primary" />
              <span className="w-8 h-2 rounded-full bg-gray-300" />
              <span className="w-8 h-2 rounded-full bg-gray-300" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="reg-fullname"
              label="Nama Lengkap"
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              icon={<User size={18} />}
              error={errors.fullName}
              required
            />

            <Input
              id="reg-phone"
              label="Nomor Handphone"
              type="tel"
              placeholder="Contoh: 081234567890"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              icon={<Phone size={18} />}
              hint="Kode OTP akan dikirimkan ke nomor ini (simulasi demo)."
              error={errors.phone}
              required
            />

            <Input
              id="reg-email"
              label="Alamat Email"
              type="email"
              placeholder="Contoh: nama@domain.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              icon={<Mail size={18} />}
              error={errors.email}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-password"
                className={`font-semibold text-gray-800 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
              >
                Kata Sandi
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-hidden="true"
                >
                  <Lock size={18} />
                </span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full rounded-xl border bg-white text-gray-800 pl-10 pr-12 transition-default focus:ring-2 focus:ring-primary focus:border-primary ${
                    isEasyMode ? 'py-4 text-lg min-h-[64px]' : 'py-3 text-base min-h-[48px]'
                  } ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-lg"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-700 font-medium flex items-center gap-1" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.password}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reg-confirm-password"
                className={`font-semibold text-gray-800 ${isEasyMode ? 'text-lg' : 'text-sm'}`}
              >
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  aria-hidden="true"
                >
                  <Lock size={18} />
                </span>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi Anda"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`w-full rounded-xl border bg-white text-gray-800 pl-10 pr-4 transition-default focus:ring-2 focus:ring-primary focus:border-primary ${
                    isEasyMode ? 'py-4 text-lg min-h-[64px]' : 'py-3 text-base min-h-[48px]'
                  } ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  required
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-700 font-medium flex items-center gap-1" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Checkbox Syarat & Ketentuan */}
            <div className="mt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="reg-agree-terms"
                  checked={formData.agreeTerms}
                  onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                  className={`mt-1 rounded text-primary focus:ring-primary ${
                    isEasyMode ? 'w-6 h-6' : 'w-4 h-4'
                  }`}
                />
                <span className={`text-gray-700 ${isEasyMode ? 'text-base' : 'text-xs leading-relaxed font-medium'}`}>
                  Saya menyetujui bahwa ini adalah <strong className="text-gray-900 font-bold">prototype simulasi</strong>, tidak menggunakan uang riil, dan tidak mengumpulkan data sensitif perbankan asli.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-sm text-red-700 font-medium mt-1 flex items-center gap-1" role="alert">
                  <span aria-hidden="true">⚠</span> {errors.agreeTerms}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size={isEasyMode ? 'lg' : 'md'}
              fullWidth
              disabled={isSubmitting}
              className="mt-3"
            >
              {isSubmitting ? 'Menyimpan...' : 'Lanjutkan ke Verifikasi'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p className={`text-gray-700 font-medium ${isEasyMode ? 'text-base' : 'text-sm'}`}>
              Sudah memiliki akun?{' '}
              <Link
                to="/login"
                onClick={stopSpeech}
                className="text-primary font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded"
              >
                Masuk di Sini
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
