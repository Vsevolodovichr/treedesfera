import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthenticated, setUser } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Введіть email та пароль');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setAuthenticated(true);
    setUser({ name: 'Олександр', email, agency: 'Premier Estate' });
    setLoading(false);
    navigate('/start');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f0f0f_0%,_#0a0a0a_70%)]" />
      
      {/* Decorative gold accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-[#d4af37]/[0.03] blur-3xl" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 flex flex-col items-center mb-8"
      >
        <img src="/logo-xatosfera.png" alt="Xatosfera" className="w-[100px] h-[100px] object-contain mb-4" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 text-[28px] font-bold text-[#f5f5f5] tracking-[-0.02em] mb-2"
      >
        Xatosfera Capture
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 text-[14px] text-[#888] mb-10"
      >
        Створюйте інтерактивні тури за 15 хвилин
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className={`relative z-10 w-full max-w-[360px] space-y-4 ${shake ? 'animate-shake' : ''}`}
      >
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-[56px] px-4 bg-[#141414] border border-white/[0.08] rounded-[12px] text-[#f5f5f5] placeholder-[#555] text-[16px] focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)] transition-all outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full h-[56px] px-4 pr-12 bg-[#141414] border border-white/[0.08] rounded-[12px] text-[#f5f5f5] placeholder-[#555] text-[16px] focus:border-[#d4af37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)] transition-all outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#888]"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <p className="text-[#f87171] text-[13px] px-1">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-[56px] bg-[#d4af37] hover:bg-[#e8c547] active:bg-[#b8962e] text-[#0a0a0a] font-semibold text-[15px] rounded-[12px] transition-all flex items-center justify-center disabled:opacity-60 mt-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
          ) : (
            'Увійти'
          )}
        </button>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 mt-auto mb-8 text-[12px] text-[#555] hover:text-[#888] transition-colors"
        onClick={() => {}}
      >
        ← Повернутися до CRM
      </motion.button>
    </div>
  );
}
