import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import MobileHeader from './components/MobileHeader';
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
import { BackgroundLayer } from './components/layout/BackgroundLayer';

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

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-[#0a070d] flex justify-center overflow-hidden text-[#f5f5f5] font-sans">
      <BackgroundLayer />
      <div className="relative z-10 w-full max-w-[480px] flex h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)]">
          {children}
        </main>
      </div>
    </div>
  );
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
              <AppLayout><StartPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property/new"
          element={
            <ProtectedRoute>
              <AppLayout><PropertyNewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property/select"
          element={
            <ProtectedRoute>
              <AppLayout><PropertySelectPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan"
          element={
            <ProtectedRoute>
              <AppLayout><PlanSetupPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <AppLayout><RoomSetupPage /></AppLayout>
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
              <AppLayout><ReviewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property-review"
          element={
            <ProtectedRoute>
              <AppLayout><PropertyReviewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/preview"
          element={
            <ProtectedRoute>
              <AppLayout><PreviewPage /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/publish"
          element={
            <ProtectedRoute>
              <AppLayout><PublishPage /></AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
