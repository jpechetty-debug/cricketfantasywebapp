import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MatchPage from './pages/MatchPage';
import MatchesPage from './pages/MatchesPage';
import MyTeamsPage from './pages/MyTeamsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import RulesPage from './pages/RulesPage';

// Admin screens are only needed by organisers, so keep them out of the main bundle.
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminMatchesPage = lazy(() => import('./pages/AdminMatchesPage'));
const AdminPlayersPage = lazy(() => import('./pages/AdminPlayersPage'));
const AdminScoringPage = lazy(() => import('./pages/AdminScoringPage'));
const AdminCricHeroesPage = lazy(() => import('./pages/AdminCricHeroesPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

function PageFallback() {
  return <div className="h-64 animate-pulse rounded-3xl bg-slate-200/60" />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/match/:id" element={<MatchPage />} />
              <Route path="/my-teams" element={<MyTeamsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/rules" element={<RulesPage />} />
            </Route>

            <Route
              element={
                <AdminRoute>
                  <AppLayout />
                </AdminRoute>
              }
            >
              <Route path="/admin/dashboard" element={<Suspense fallback={<PageFallback />}><AdminDashboardPage /></Suspense>} />
              <Route path="/admin/matches" element={<Suspense fallback={<PageFallback />}><AdminMatchesPage /></Suspense>} />
              <Route path="/admin/players" element={<Suspense fallback={<PageFallback />}><AdminPlayersPage /></Suspense>} />
              <Route path="/admin/scoring" element={<Suspense fallback={<PageFallback />}><AdminScoringPage /></Suspense>} />
              <Route path="/admin/cricheroes" element={<Suspense fallback={<PageFallback />}><AdminCricHeroesPage /></Suspense>} />
              <Route path="/admin/users" element={<Suspense fallback={<PageFallback />}><AdminUsersPage /></Suspense>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
