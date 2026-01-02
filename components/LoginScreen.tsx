import React, { useState } from 'react';
import { KiteIcon } from './KiteIcon';
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate inputs exist
    if (!email.trim() || !password.trim()) {
        setError('Vui lòng điền đầy đủ thông tin.');
        return;
    }

    // 2. Validate Gmail format
    if (!email.toLowerCase().endsWith('@gmail.com')) {
        setError('Vui lòng sử dụng tài khoản Gmail (@gmail.com).');
        return;
    }

    // 3. Validate Password length (>= 12 characters)
    if (password.length < 12) {
        setError('Mật khẩu phải có ít nhất 12 ký tự.');
        return;
    }

    setIsLoading(true);
    
    // Simulate authentication process
    setTimeout(() => {
      // In a real app, this is where you'd validate credentials with a backend.
      // We accept the login if validations pass.
      onLogin(email);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white p-4 relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-blue-900/5 rounded-3xl p-8 md:p-10 relative overflow-hidden">
            
            {/* Top Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-50"></div>

            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-6 transform hover:scale-105 transition-transform duration-500">
                    <KiteIcon className="w-9 h-9" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Đăng nhập</h1>
                <p className="text-slate-500 text-sm md:text-base max-w-xs mx-auto leading-relaxed">
                    Sử dụng tài khoản Google để tiếp tục.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-1.5 text-left">
                    <label htmlFor="email" className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Gmail</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="email"
                            id="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="tenban@gmail.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 text-left">
                    <label htmlFor="password" className="text-xs font-semibold text-slate-500 ml-1 uppercase tracking-wider">Mật khẩu</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="password"
                            id="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="Tối thiểu 12 ký tự"
                        />
                    </div>
                    <p className="text-[11px] text-slate-400 text-right px-1">
                        Yêu cầu ít nhất 12 ký tự
                    </p>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Đang xác thực...</span>
                            </div>
                        ) : (
                            <>
                                <span>Đăng nhập</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                    Bằng việc tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư của k-ite.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};