import { useEffect, useState } from 'react';

interface ParallaxPhotoViewerProps {
  photos: string[];
  alt: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function ParallaxPhotoViewer({ photos, alt }: ParallaxPhotoViewerProps) {
  const layers = photos.slice(0, 3);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      setOffset({
        x: clamp((event.gamma || 0) / 18, -1, 1),
        y: clamp((event.beta || 0) / 28, -1, 1),
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  if (layers.length < 3) {
    return <img src={layers[0]} alt={alt} className="max-w-[95%] max-h-[85%] object-contain rounded-[8px]" />;
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setOffset({
          x: clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
          y: clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1),
        });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
    >
      {layers.map((photo, index) => {
        const depth = index - 1;
        return (
          <img
            key={`${photo}-${index}`}
            src={photo}
            alt={alt}
            className="absolute inset-0 m-auto max-w-[95%] max-h-[85%] object-contain rounded-[8px] transition-transform duration-150 ease-out"
            style={{
              opacity: index === 1 ? 0.92 : 0.72,
              transform: `translate3d(${offset.x * depth * 22}px, ${offset.y * depth * 12}px, 0) scale(${1 + Math.abs(depth) * 0.015})`,
            }}
          />
        );
      })}
    </div>
  );
}
