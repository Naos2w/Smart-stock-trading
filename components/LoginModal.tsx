import React, { useState } from 'react';
import { UserProfile, AppLanguage, TRANSLATIONS } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  lang: AppLanguage;
}

const LoginModal: React.FC<Props> = ({ isOpen, onClose, onLogin, lang }) => {
  const [isLoading, setIsLoading] = useState(false);
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  const handleSimulatedGoogleLogin = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
        const mockUser: UserProfile = {
            id: 'google_123456',
            name: 'Demo User',
            email: 'demo@gmail.com',
            avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=random'
        };
        onLogin(mockUser);
        setIsLoading(false);
        onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
       <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center relative border border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <h2 className="text-2xl font-bold mb-2 dark:text-white">{t.login}</h2>
          <p className="text-gray-500 mb-8 text-sm">Sign in to sync your watchlist across devices.</p>
          
          <button 
            onClick={handleSimulatedGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-100 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all shadow-sm transform hover:scale-[1.02]"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t.loginGoogle}
                </>
            )}
          </button>
       </div>
    </div>
  );
};

export default LoginModal;