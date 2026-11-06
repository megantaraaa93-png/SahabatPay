import { Routes, Route, Navigate } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerificationPage from './pages/VerificationPage';
import SetupPinPage from './pages/SetupPinPage';
import DashboardPage from './pages/DashboardPage';
import TopUpPage from './pages/TopUpPage';
import TransferPage from './pages/TransferPage';
import QrisPage from './pages/QrisPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import ProfilePage from './pages/ProfilePage';
import AccessibilitySettingsPage from './pages/AccessibilitySettingsPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import AboutPage from './pages/AboutPage';
import RecipientsPage from './pages/RecipientsPage';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import { VerificationGuard, SetupPinGuard } from './components/common/OnboardingGuard';
import VoiceCommandButton from './components/a11y/VoiceCommandButton';

function App() {
  return (
    <>
      <Routes>
      {/* Halaman Welcome / Pilihan Mode */}
      <Route path="/" element={<WelcomePage />} />

      {/* Rute Autentikasi Publik */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rute Onboarding yang Terlindungi Guard */}
      <Route
        path="/verification"
        element={
          <VerificationGuard>
            <VerificationPage />
          </VerificationGuard>
        }
      />
      <Route
        path="/setup-pin"
        element={
          <SetupPinGuard>
            <SetupPinPage />
          </SetupPinGuard>
        }
      />

      {/* Area Pengguna Terproteksi dengan Layout Utama */}
      <Route element={<MainLayout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/top-up"
          element={
            <ProtectedRoute>
              <TopUpPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute>
              <TransferPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qris"
          element={
            <ProtectedRoute>
              <QrisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <TransactionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history/:transactionId"
          element={
            <ProtectedRoute>
              <TransactionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={<Navigate to="/settings/accessibility" replace />}
        />
        <Route
          path="/settings/accessibility"
          element={
            <ProtectedRoute>
              <AccessibilitySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/account"
          element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <AboutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipients"
          element={
            <ProtectedRoute>
              <RecipientsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

    {/* Floating Global Voice Assistant - Tersedia sejak App Entry di seluruh halaman */}
    <VoiceCommandButton />
  </>
  );
}

export default App;
