import { createContext, useContext, useState } from 'react';

const A11yContext = createContext(null);

/**
 * Mode aksesibilitas:
 * - 'normal': Tampilan standar
 * - 'audio': Audio guidance aktif (untuk tunanetra)
 * - 'easy': Easy mode - tombol besar, layout sederhana (untuk keterbatasan motorik)
 *
 * Fitur Perlindungan Khusus:
 * - tremorShield: Perlindungan salah tekan dengan tombol tahan 1-2 detik
 * - tremorDurationMs: Durasi tahan dalam milidetik (1000 / 1500 / 2000)
 * - cognitiveDelay: Jeda 10 detik untuk menelaah ringkasan sebelum transaksi finansial
 */

/** Opsi durasi Tremor Shield yang tersedia */
export const TREMOR_DURATION_OPTIONS = [
  { label: '1 detik', ms: 1000 },
  { label: '1,5 detik (Disarankan)', ms: 1500 },
  { label: '2 detik', ms: 2000 },
];

export function A11yProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      return localStorage.getItem('sahabatpay_a11y_mode') || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [tremorShieldEnabled, setTremorShieldState] = useState(() => {
    try {
      const saved = localStorage.getItem('sahabatpay_tremor_shield');
      if (saved !== null) return JSON.parse(saved);
      return false;
    } catch {
      return false;
    }
  });

  const [tremorDurationMs, setTremorDurationState] = useState(() => {
    try {
      const saved = localStorage.getItem('sahabatpay_tremor_duration_ms');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if ([1000, 1500, 2000].includes(parsed)) return parsed;
      }
      return 1500;
    } catch {
      return 1500;
    }
  });

  const [cognitiveDelayEnabled, setCognitiveDelayState] = useState(() => {
    try {
      const saved = localStorage.getItem('sahabatpay_cognitive_delay');
      if (saved !== null) return JSON.parse(saved);
      return false;
    } catch {
      return false;
    }
  });

  const setMode = (newMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('sahabatpay_a11y_mode', newMode);
      // Jika beralih ke Easy Mode, aktifkan shield secara default jika belum diatur eksplisit
      if (newMode === 'easy') {
        const savedTremor = localStorage.getItem('sahabatpay_tremor_shield');
        if (savedTremor === null) setTremorShieldState(true);
        const savedDelay = localStorage.getItem('sahabatpay_cognitive_delay');
        if (savedDelay === null) setCognitiveDelayState(true);
      }
    } catch {}
  };

  const setTremorShieldEnabled = (enabled) => {
    setTremorShieldState(Boolean(enabled));
    try {
      localStorage.setItem('sahabatpay_tremor_shield', JSON.stringify(Boolean(enabled)));
    } catch {}
  };

  const setTremorDuration = (ms) => {
    const valid = [1000, 1500, 2000].includes(ms) ? ms : 1500;
    setTremorDurationState(valid);
    try {
      localStorage.setItem('sahabatpay_tremor_duration_ms', String(valid));
    } catch {}
  };

  const setCognitiveDelayEnabled = (enabled) => {
    setCognitiveDelayState(Boolean(enabled));
    try {
      localStorage.setItem('sahabatpay_cognitive_delay', JSON.stringify(Boolean(enabled)));
    } catch {}
  };

  const isEasyMode = mode === 'easy';
  const isAudioMode = mode === 'audio';

  return (
    <A11yContext.Provider
      value={{
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
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y harus digunakan di dalam A11yProvider');
  }
  return context;
}
