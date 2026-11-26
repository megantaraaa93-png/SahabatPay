import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Accessibility,
  Volume2,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useA11y } from '../context/A11yContext';
import { useAudioGuidance } from '../hooks/useAudioGuidance';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Logo from '../components/common/Logo';
import AudioGuideBar from '../components/a11y/AudioGuideBar';

export default function AboutPage() {
  const navigate = useNavigate();
  const { isEasyMode } = useA11y();
  const { isPlaying, speakText, stopSpeech } = useAudioGuidance();

  const guideText = `Halaman Tentang SahabatPay. SahabatPay, Satu Dompet Semua Bisa. Purwarupa aplikasi dompet digital inklusif yang dirancang untuk pengguna umum, penyandang tunanetra dengan panduan audio, serta penyandang keterbatasan motorik dengan tombol besar minimal 64 piksel. Seluruh transaksi pada aplikasi ini bersifat simulasi lokal.`;

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
          Tentang SahabatPay
        </h1>

        <div className="w-16" />
      </div>

      {/* ============================================================ */}
      {/* HERO BANNER BRAND SAHABATPAY */}
      {/* ============================================================ */}
      <div className="balance-card rounded-3xl p-6 text-white text-center shadow-balance">
        <Logo
          size="lg"
          className="mx-auto mb-3"
        />

        <h2 className={`font-black tracking-tight ${isEasyMode ? 'text-3xl' : 'text-2xl'}`}>
          SahabatPay
        </h2>
        <p className="text-white/90 font-semibold text-sm mt-0.5">
          "Satu Dompet, Semua Bisa"
        </p>

        <div className="inline-block mt-3 px-3 py-1 bg-white/15 rounded-full text-xs font-mono font-bold tracking-wider border border-white/20">
          PROTOTYPE v1.0.0
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISI & TUJUAN PENGEMBANGAN */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-vision">
        <h2 id="heading-vision" className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Visi & Misi Inklusif
        </h2>

        <Card className="!p-5 bg-white border-brand-border shadow-card flex flex-col gap-3 text-xs sm:text-sm text-brand-charcoal leading-relaxed">
          <p>
            <strong>SahabatPay</strong> lahir dari gagasan bahwa kemajuan teknologi finansial digital harus dapat diakses secara setara dan bermartabat oleh seluruh lapisan masyarakat Indonesia, tanpa terkecuali.
          </p>
          <p className="text-brand-muted">
            Banyak dompet digital modern mengabaikan kebutuhan pengguna dengan disabilitas sensorik (tunanetra/low-vision) dan motorik (tremor/kesulitan menjangkau tombol kecil). SahabatPay membuktikan bahwa antarmuka finansial dapat dirancang aman, tangguh, dan ramah aksesibilitas sejak baris kode pertama.
          </p>
        </Card>
      </section>

      {/* ============================================================ */}
      {/* TIGA PILAR AKSESIBILITAS SAHABATPAY */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-pillars">
        <h2 id="heading-pillars" className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Tiga Mode Aksesibilitas
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Pilar 1 */}
          <div className="p-4 bg-white rounded-2xl border border-brand-border shadow-card flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center font-bold">
              <Accessibility size={20} />
            </div>
            <p className="font-extrabold text-brand-charcoal text-sm">Normal Mode</p>
            <p className="text-xs text-brand-muted leading-relaxed">
              Tampilan modern, rapi, dan responsif dengan hierarki informasi yang seimbang untuk pengguna umum.
            </p>
          </div>

          {/* Pilar 2 */}
          <div className="p-4 bg-white rounded-2xl border border-brand-border shadow-card flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 text-brand-emerald flex items-center justify-center font-bold">
              <Volume2 size={20} />
            </div>
            <p className="font-extrabold text-brand-charcoal text-sm">Audio Guidance</p>
            <p className="text-xs text-brand-muted leading-relaxed">
              Panduan suara interaktif dan umpan balik nada ramah tunanetra, dengan jaminan privasi penuh pada PIN.
            </p>
          </div>

          {/* Pilar 3 */}
          <div className="p-4 bg-white rounded-2xl border border-brand-border shadow-card flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Smartphone size={20} />
            </div>
            <p className="font-extrabold text-brand-charcoal text-sm">Easy Mode</p>
            <p className="text-xs text-brand-muted leading-relaxed">
              Target sentuh tombol minimal 64px, tipografi besar, dan kontras tinggi untuk kemudahan motorik serta lansia.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* PENAFIAN SIMULASI RESMI (LEGAL DISCLAIMER) */}
      {/* ============================================================ */}
      <section aria-labelledby="heading-disclaimer">
        <h2 id="heading-disclaimer" className={`font-bold text-brand-charcoal mb-2.5 ${isEasyMode ? 'text-xl' : 'text-base'}`}>
          Penafian Simulasi (Disclaimer)
        </h2>

        <div className="sp-alert-warning rounded-2xl text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="text-amber-700" />
            <span>Aplikasi Percontohan (Prototype Riset)</span>
          </div>
          <p className="leading-relaxed">
            Aplikasi ini semata-mata merupakan prototype rekayasa perangkat lunak untuk pengujian kegunaan aksesibilitas. Seluruh transaksi Top Up, Transfer Antar-Pengguna, Pembayaran QRIS, dan saldo yang tertera bersifat simulasi lokal pada peramban web Anda.
          </p>
          <p className="leading-relaxed font-semibold">
            Tidak ada perpindahan dana moneter riil atau integrasi dengan Bank Indonesia, BI-FAST, maupun sistem kliring perbankan nyata.
          </p>
        </div>
      </section>
    </div>
  );
}
