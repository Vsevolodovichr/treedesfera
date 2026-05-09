import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
const screenTitles: Record<string, string> = {
  '/start': 'Xatosfera Capture',
  '/property/new': 'Новий об\'єкт',
  '/property/select': 'Оберіть об\'єкт',
  '/plan': 'План приміщення',
  '/rooms': 'Кімнати',
  '/review': 'Перевірка',
  '/property-review': 'Огляд об\'єкта',
  '/preview': 'Превью туру',
  '/publish': 'Публікація',
};

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const title = screenTitles[location.pathname] || 'Xatosfera Capture';
  const showBack = location.pathname !== '/start' && location.pathname !== '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-[30] h-[56px] bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center px-4 max-w-[480px] mx-auto">
      <div className="flex items-center w-full relative">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full active:bg-white/5 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-[#f5f5f5]" />
          </button>
        )}
        <h1 className="w-full text-center text-[15px] font-semibold text-[#f5f5f5] tracking-[-0.01em]">
          {title}
        </h1>
      </div>
    </header>
  );
}
