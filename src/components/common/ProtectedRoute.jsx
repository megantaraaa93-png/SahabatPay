import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Komponen ProtectedRoute untuk melindungi rute privat (seperti /dashboard).
 * Jika pengguna belum terautentikasi, alihkan ke /login menggunakan replace={true}
 * sehingga riwayat browser (tombol Back) tidak dapat kembali ke halaman privat.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
