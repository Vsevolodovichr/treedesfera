import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';

const slides = [
  'treedesfera-3d/logo-treedesfera.png',
  'treedesfera-3d/room-living.png',
  'treedesfera-3d/room-bathroom.png',
  'treedesfera-3d/room-bedroom.png',
  'treedesfera-3d/room-kitchen.png',
  'treedesfera-3d/room-hallway.png',
  'treedesfera-3d/logo-treedesfera.png',
];

const pauseFrames = 18;
const turnFrames = 24;
const segmentFrames = pauseFrames + turnFrames;

export const Treedesfera3D = () => {
  const frame = useCurrentFrame();
  const segment = Math.min(Math.floor(frame / segmentFrames), slides.length - 2);
  const frameInSegment = frame - segment * segmentFrames;
  const turnProgress = interpolate(frameInSegment, [pauseFrames, segmentFrames - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const currentOpacity = interpolate(turnProgress, [0, 0.48, 0.52, 1], [1, 1, 0, 0]);
  const nextOpacity = interpolate(turnProgress, [0, 0.48, 0.52, 1], [0, 0, 1, 1]);
  const rotation = interpolate(turnProgress, [0, 1], [0, 180]);
  const scale = interpolate(turnProgress, [0, 0.5, 1], [1, 0.88, 1]);
  const glow = interpolate(turnProgress, [0, 0.5, 1], [0.42, 0.72, 0.42]);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 40%, rgba(244, 35, 255, 0.42), rgba(48, 0, 76, 0.94) 44%, #050007 82%)',
        overflow: 'hidden',
        perspective: 1500,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 38%, rgba(0, 0, 0, 0.24) 68%, rgba(0, 0, 0, 0.68) 100%)',
        }}
      />
      <div
        style={{
          width: 820,
          height: 820,
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateX(6deg) rotateY(${rotation}deg) scale(${scale})`,
          filter: `drop-shadow(0 62px 56px rgba(0, 0, 0, 0.56)) drop-shadow(0 0 48px rgba(246, 31, 255, ${glow}))`,
        }}
      >
        <Img
          src={staticFile(slides[segment])}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: currentOpacity,
            backfaceVisibility: 'hidden',
          }}
        />
        <Img
          src={staticFile(slides[segment + 1])}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: nextOpacity,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
