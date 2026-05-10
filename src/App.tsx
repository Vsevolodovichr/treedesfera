import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import LoginPage from './pages/LoginPage';
import StartPage from './pages/StartPage';
import PropertyNewPage from './pages/PropertyNewPage';
import PropertySelectPage from './pages/PropertySelectPage';
import PlanSetupPage from './pages/PlanSetupPage';
import RoomSetupPage from './pages/RoomSetupPage';
import CameraPage from './pages/CameraPage';
import PanoCapturePage from './pages/PanoCapturePage';
import PanoStitchPage from './pages/PanoStitchPage';
import PanoReviewPage from './pages/PanoReviewPage';
import ReviewPage from './pages/ReviewPage';
import PropertyReviewPage from './pages/PropertyReviewPage';
import PreviewPage from './pages/PreviewPage';
import PublishPage from './pages/PublishPage';
import PublicTourPage from './pages/PublicTourPage';
import { AppLayout } from './components/layout/AppLayout';

const DevDepthPage = import.meta.env.DEV ? lazy(() => import('./pages/DevDepthPage')) : null;
const DevPanoPage = import.meta.env.DEV ? lazy(() => import('./pages/DevPanoPage')) : null;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useStore.persist.onFinishHydration(() => setHydrated(true));
    const timer = useStore.persist.hasHydrated() ? window.setTimeout(() => setHydrated(true), 0) : null;
    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!hydrated) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <div className="min-h-dvh bg-black">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/tour/:slug" element={<PublicTourPage />} />
        <Route path="/p/:id" element={<PublicTourPage />} />
        <Route
          path="/dev/depth"
          element={
            <ProtectedRoute>
              {import.meta.env.DEV && DevDepthPage ? (
                <Suspense fallback={null}>
                  <DevDepthPage />
                </Suspense>
              ) : (
                <Navigate to="/start" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/start"
          element={
            <ProtectedRoute>
              <AppLayout title="3Dсфера" description="Що будемо робити сьогодні?"><StartPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property/new"
          element={
            <ProtectedRoute>
              <AppLayout title="Новий об'єкт" description="Дані нерухомості" backTo="/start"><PropertyNewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property/select"
          element={
            <ProtectedRoute>
              <AppLayout title="Існуючий об'єкт" description="Оберіть об'єкт" backTo="/start"><PropertySelectPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <ProtectedRoute>
              <AppLayout title="План" description="Розмістіть кімнати" backTo="/property/new"><PlanSetupPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <AppLayout title="Кімнати" description="Налаштуйте порядок зйомки" backTo="/plan"><RoomSetupPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/camera"
          element={
            <ProtectedRoute>
              <CameraPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev/pano"
          element={
            <ProtectedRoute>
              {import.meta.env.DEV && DevPanoPage ? (
                <Suspense fallback={null}>
                  <DevPanoPage />
                </Suspense>
              ) : (
                <Navigate to="/start" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/pano/:roomId"
          element={
            <ProtectedRoute>
              <PanoCapturePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pano/:roomId/stitch"
          element={
            <ProtectedRoute>
              <PanoStitchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pano/:roomId/review"
          element={
            <ProtectedRoute>
              <PanoReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <AppLayout title="Перевірка" description="Огляд знятих кімнат" backTo="/rooms"><ReviewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property-review"
          element={
            <ProtectedRoute>
              <AppLayout title="Готовність" description="Фінальна перевірка" backTo="/review"><PropertyReviewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/preview"
          element={
            <ProtectedRoute>
              <AppLayout title="Прев'ю" description="Перегляд туру" backTo="/property-review"><PreviewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/publish"
          element={
            <ProtectedRoute>
              <AppLayout title="Публікація" description="Перевірка і посилання" backTo="/preview"><PublishPage /></AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
