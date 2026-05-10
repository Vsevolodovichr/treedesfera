import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Camera, RotateCcw } from 'lucide-react';
import PanoramaViewer from '../components/PanoramaViewer';
import { useStore } from '../store';

export default function PanoReviewPage() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { rooms, resetPanorama } = useStore();
  const room = rooms.find((item) => item.id === roomId);
  const panorama = room?.panorama;

  useEffect(() => {
    if (!roomId || !room || !panorama?.equirectangularUrl) {
      navigate('/rooms', { replace: true });
    }
  }, [navigate, panorama?.equirectangularUrl, room, roomId]);

  const handleAccept = () => {
    navigate('/rooms');
  };

  const handleRetake = () => {
    if (!roomId) return;
    resetPanorama(roomId);
    navigate(`/pano/${roomId}`);
  };

  const handleContinue = () => {
    if (!roomId) return;
    navigate(`/pano/${roomId}?continue=1`);
  };

  if (!panorama?.equirectangularUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0a070d] text-[#f5f5f5]">
      <main className="flex flex-1 flex-col px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <div className="min-h-0 flex-1 overflow-hidden rounded-[16px] border border-white/10 bg-black">
          <PanoramaViewer
            panoramaUrl={panorama.equirectangularUrl}
            hfov={panorama.hfov}
            className="h-full min-h-[55vh]"
          />
        </div>

        <div className="mt-4 grid gap-2">
          <button
            onClick={handleAccept}
            className="h-12 rounded-[12px] bg-[#d4af37] text-[14px] font-semibold text-[#0a070d]"
          >
            <Check className="mr-2 inline h-4 w-4" />
            Прийняти
          </button>
          <button
            onClick={handleRetake}
            className="h-12 rounded-[12px] border border-white/10 bg-[#14101a] text-[14px] font-semibold"
          >
            <RotateCcw className="mr-2 inline h-4 w-4" />
            Перезняти
          </button>
          {panorama.frameUrls.length < 8 && (
            <button
              onClick={handleContinue}
              className="h-12 rounded-[12px] border border-[#d4af37]/40 bg-[#d4af37]/10 text-[14px] font-semibold text-[#d4af37]"
            >
              <Camera className="mr-2 inline h-4 w-4" />
              Дозняти кадри
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
