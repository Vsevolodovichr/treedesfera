import bgImage from '@/assets/141.webp';

export const BackgroundLayer = () => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.10)]
  before:absolute before:inset-0 before:pointer-events-none
  before:bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03)_45%,rgba(255,255,255,0.07))]
  after:absolute after:inset-0 after:pointer-events-none
  after:bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_30%)]"
      style={{ backgroundImage: `url(${bgImage})` }}
    />
    <div className="absolute inset-0 bg-black/40" />
  </div>
);
