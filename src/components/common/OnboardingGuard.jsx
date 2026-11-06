import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Guard untuk rute verifikasi OTP (/verification).
 * Hanya dapat dibuka jika pendaftaran sedang berjalan (pendingRegistration ada).
 * Jika tidak ada pendaftaran aktif, arahkan ke /register dengan replace={true}.
 */
export function VerificationGuard({ children }) {
  const { pendingRegistration } = useAuth();

  if (!pendingRegistration) {
    return <Navigate to="/register" replace />;
  }

  return children;
}

/**
 * Guard untuk rute pembuatan PIN (/setup-pin).
 * Hanya dapat dibuka jika pendaftaran sudah berhasil diverifikasi (isVerified === true).
 * Jika pendingRegistration tidak ada, arahkan ke /register.
 * Jika pendingRegistration ada tapi belum diverifikasi, arahkan ke /verification.
 */
export function SetupPinGuard({ children }) {
  const { pendingRegistration } = useAuth();

  if (!pendingRegistration) {
    return <Navigate to="/register" replace />;
  }

  if (!pendingRegistration.isVerified) {
    return <Navigate to="/verification" replace />;
  }

  return children;
}
