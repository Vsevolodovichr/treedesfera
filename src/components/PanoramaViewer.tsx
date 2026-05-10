import { useEffect, useRef } from 'react';

type PanoramaViewerProps = {
  panoramaUrl: string;
  hfov?: number;
  autoRotate?: boolean;
  className?: string;
  onReady?: () => void;
};

type PanoramaViewerInstance = ReturnType<NonNullable<Window['pannellum']>['viewer']>;

export default function PanoramaViewer({
  panoramaUrl,
  hfov,
  autoRotate = false,
  className = '',
  onReady,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PanoramaViewerInstance | null>(null);
  const hasViewer = typeof window !== 'undefined' && Boolean(window.pannellum);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !window.pannellum) {
      return;
    }

    viewerRef.current = window.pannellum.viewer(containerRef.current, {
      type: 'equirectangular',
      panorama: panoramaUrl,
      hfov: hfov || 360,
      autoLoad: true,
      autoRotate: autoRotate ? -2 : 0,
      compass: false,
      showControls: false,
      orientationOnByDefault: true,
    });
    onReady?.();

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [autoRotate, hfov, onReady, panoramaUrl]);

  return (
    <div className={`relative h-full w-full bg-black ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!hasViewer && (
        <img
          src={panoramaUrl}
          alt="Panorama"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
