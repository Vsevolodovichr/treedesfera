import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { login, refreshSession, toStoreUser } from '../lib/api';
import { probeDepthSupport } from '../lib/depth/capabilities';
import './Loginpage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticated, setUser, setDeviceCaps } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let cancelled = false;

    refreshSession()
      .then((user) => {
        if (cancelled || !user) return;
        setAuthenticated(true);
        void probeDepthSupport().then(setDeviceCaps);
        setUser(toStoreUser(user));
        navigate('/start', { replace: true });
      })
      .catch(() => {
        if (cancelled) return;
        setAuthenticated(false);
        setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuthenticated, setDeviceCaps, setUser]);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Введіть email та пароль');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setLoading(true);
    try {
      const session = await login(email, password);
      setAuthenticated(true);
      void probeDepthSupport().then(setDeviceCaps);
      setUser(toStoreUser(session.user));
      navigate('/start');
    } catch {
      setError('Невірний email або пароль');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Subtle radial gradient */}
      <div className="absolute inset-0 " />
      
      {/* Decorative gold accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full " />
      
      <div

        className={`relative z-10 w-full max-w-[360px] rounded-[24px] border border-[rgba(232,78,250,0.12)] bg-[#14101a]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl ${shake ? 'animate-shake' : ''}`}
      >
<div className="mb-6 flex flex-col items-center">
  <div className="logo-rotator" aria-label="3Dсфера animated logo">
    <img src="/assets/logo-treedesfera.png" alt="" className="frame frame-1" />
    <img src="/assets/living-room.png" alt="" className="frame frame-2" />
    <img src="/assets/bathroom.png" alt="" className="frame frame-3" />
    <img src="/assets/bedroom.png" alt="" className="frame frame-4" />
    <img src="/assets/kitchen.png" alt="" className="frame frame-5" />
    <img src="/assets/hallway.png" alt="" className="frame frame-6" />
  </div>

  <img
    src="/111.png"
    alt="3Dсфера текст"
    className="relative mb-4 z-10 object-contain"
  />
</div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-[36px] px-4 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] text-[#f5f0fa] placeholder-[#5a4d68] text-[16px] focus:border-[#d100d9] focus:shadow-[0_0_0_3px_rgba(209,0,217,0.15)] transition-all outline-none"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full h-[36px] px-4 pr-12 bg-[#14101a] border border-[rgba(232,78,250,0.10)] rounded-[12px] text-[#f5f0fa] placeholder-[#5a4d68] text-[16px] focus:border-[#d100d9] focus:shadow-[0_0_0_3px_rgba(209,0,217,0.15)] transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#a08fb0]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-[#f87171] text-[13px] px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[36px] bg-[#d100d9] hover:bg-[#e84efa] active:bg-[#9d00a8] text-[#0a070d] font-semibold text-[15px] rounded-[12px] transition-all flex items-center justify-center disabled:opacity-60 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#0a070d] border-t-transparent rounded-full animate-spin" />
            ) : (
              'Увійти'
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
