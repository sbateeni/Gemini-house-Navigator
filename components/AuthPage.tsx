
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { db } from '../services/db';
import { Loader2, Mail, Lock, User, ShieldCheck, AlertCircle, Send, CheckSquare, Square, KeyRound, LogOut } from 'lucide-react';
import { SourceSession } from '../types';

interface AuthPageProps {
  onSourceLogin?: (session: SourceSession) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSourceLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'source'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [showResend, setShowResend] = useState(false); 
  const [rememberMe, setRememberMe] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('gemini_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setShowResend(false);

    try {
      if (authMode === 'source') {
         // Source Login Logic
         const res = await db.verifyAccessCode(accessCode.replace(/\s/g, ''));
         if (res.valid && res.expiresAt) {
             const session: SourceSession = {
                 code: accessCode.replace(/\s/g, ''),
                 expiresAt: res.expiresAt
             };
             if (onSourceLogin) onSourceLogin(session);
         } else {
             throw new Error(res.error || 'كود غير صالح');
         }
         return;
      }

      await auth.signOut();

      if (authMode === 'reset') {
        const { error } = await auth.resetPassword(email);
        if (error) throw error;
        setMessage({ type: 'success', text: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك!' });
      } else if (authMode === 'login') {
        if (rememberMe) {
            localStorage.setItem('gemini_saved_email', email);
        } else {
            localStorage.removeItem('gemini_saved_email');
        }

        const { error } = await auth.signIn(email, password);
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setShowResend(true);
          }
          throw error;
        }
      } else {
        const { data, error } = await auth.signUp(email, password, username);
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            setMessage({ type: 'error', text: 'هذا البريد مسجل بالفعل.' });
        } else {
            setMessage({ type: 'success', text: 'تم التسجيل بنجاح! الرجاء التحقق من بريدك الإلكتروني.' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ ما' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await auth.resendConfirmation(email);
      if (error) throw error;
      setMessage({ type: 'success', text: 'تم إرسال الرابط! تفقد بريدك الوارد (أو الرسائل المزعجة).' });
      setShowResend(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'فشل إرسال البريد.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async () => {
      if(confirm("هل أنت متأكد من تسجيل الخروج ومسح جميع البيانات المحلية؟")) {
          localStorage.clear();
          await auth.signOut();
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] ${authMode === 'source' ? 'bg-green-600/20' : 'bg-blue-600/20'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] ${authMode === 'source' ? 'bg-emerald-600/20' : 'bg-indigo-600/20'}`}></div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
        
        {/* Force Logout Button (Top Left) */}
        <button 
            onClick={handleForceLogout}
            className="absolute top-4 left-4 p-2 text-slate-500 hover:text-red-400 transition-colors rounded-full hover:bg-slate-800"
            title="تسجيل خروج إجباري / مسح البيانات"
        >
            <LogOut size={18} />
        </button>

        <div className="text-center mb-8 mt-2">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transition-colors duration-500
              ${authMode === 'source' ? 'bg-gradient-to-br from-emerald-600 to-green-600 shadow-green-500/20' : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/20'}
          `}>
            {authMode === 'source' ? <KeyRound className="text-white w-8 h-8" /> : <ShieldCheck className="text-white w-8 h-8" />}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {authMode === 'reset' ? 'استعادة كلمة المرور' : 
             authMode === 'signup' ? 'إنشاء حساب جديد' : 
             authMode === 'source' ? 'الدخول الآمن للمصدر' : 'تسجيل الدخول'}
          </h1>
          <p className="text-slate-400 text-sm">
            {authMode === 'source' ? 'أدخل رمز الوصول الخاص بالمهمة (صلاحية 30 دقيقة)' : 
             authMode === 'reset' ? 'أدخل بريدك لاستلام رابط الاستعادة' : 
             'نظام العمليات الجغرافية الآمن'}
          </p>
        </div>

        {/* Auth Mode Tabs - Using Flexbox for better spacing */}
        <div className="flex gap-2 mb-6 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full">
           <button 
             onClick={() => { setAuthMode('login'); setMessage(null); }}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all text-center whitespace-nowrap ${authMode !== 'source' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
           >
             طاقم العمليات
           </button>
           <button 
             onClick={() => { setAuthMode('source'); setMessage(null); }}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all text-center whitespace-nowrap ${authMode === 'source' ? 'bg-green-900/40 text-green-400 shadow border border-green-900/50' : 'text-slate-500 hover:text-slate-300'}`}
           >
             مصدر (مؤقت)
           </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex flex-col items-start gap-2 text-sm ${message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-green-900/20 text-green-400 border border-green-900/50'}`}>
            <div className="flex items-start gap-3">
               <AlertCircle size={18} className="shrink-0 mt-0.5" />
               <p>{message.text}</p>
            </div>
            
            {showResend && message.type === 'error' && (
              <button 
                type="button"
                onClick={handleResendConfirmation}
                className="mt-2 text-xs bg-red-900/40 hover:bg-red-900/60 text-white px-3 py-2 rounded-lg border border-red-700/50 flex items-center gap-2 transition-colors w-full justify-center font-bold"
              >
                <Send size={12} className="rotate-180" /> إعادة إرسال التفعيل
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {authMode === 'source' ? (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-10">
                <div className="relative group">
                    <KeyRound className="absolute right-4 top-3.5 text-green-500/70" size={20} />
                    <input
                        type="text"
                        name="accessCode"
                        placeholder="أدخل رمز الوصول (16 خانة)"
                        value={accessCode}
                        onChange={(e) => {
                            // Only numbers
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 16) setAccessCode(val);
                        }}
                        className="w-full bg-slate-950 border border-green-900/50 rounded-xl py-3 pr-12 pl-4 text-white placeholder-slate-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-mono text-center tracking-widest text-lg shadow-inner"
                        maxLength={16}
                    />
                </div>
                <p className="text-[10px] text-center text-slate-500">
                    * هذا الرمز صالح لمرة واحدة ولمدة 30 دقيقة فقط من وقت إنشائه.
                </p>
             </div>
          ) : (
            <>
                {authMode === 'signup' && (
                    <div className="relative group animate-in fade-in slide-in-from-left-10">
                    <User className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        name="username"
                        autoComplete="username"
                        placeholder="اسم المستخدم"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={authMode === 'signup'}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    </div>
                )}

                <div className="relative group animate-in fade-in">
                    <Mail className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>

                {authMode !== 'reset' && (
                    <div className="relative group animate-in fade-in">
                    <Lock className="absolute right-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="password"
                        name="password"
                        autoComplete={authMode === 'login' ? "current-password" : "new-password"}
                        placeholder="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    </div>
                )}

                {authMode === 'login' && (
                    <div className="flex items-center gap-2 mt-2">
                        <button 
                            type="button"
                            onClick={() => setRememberMe(!rememberMe)}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                        >
                            {rememberMe ? (
                                <CheckSquare size={18} className="text-blue-500" />
                            ) : (
                                <Square size={18} />
                            )}
                            <span>تذكرني</span>
                        </button>
                    </div>
                )}
            </>
          )}

          <button
            type="submit"
            disabled={loading || (authMode === 'source' && accessCode.length < 16)}
            className={`w-full font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed
               ${authMode === 'source' 
                 ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                 : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}
            `}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                authMode === 'source' ? 'بدء المهمة (30 دقيقة)' : 
                authMode === 'reset' ? 'إرسال الرابط' : 
                authMode === 'login' ? 'دخول' : 'تسجيل'
            )}
          </button>
        </form>

        {authMode !== 'source' && (
            <div className="mt-6 text-center text-sm text-slate-400 space-y-2">
            {authMode !== 'reset' ? (
                <>
                <p>
                    {authMode === 'login' ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{' '}
                    <button
                    onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setMessage(null); setShowResend(false); }}
                    className="text-blue-400 hover:text-blue-300 font-semibold"
                    >
                    {authMode === 'login' ? 'إنشاء حساب' : 'تسجيل الدخول'}
                    </button>
                </p>
                <button
                    onClick={() => { setAuthMode('reset'); setMessage(null); setShowResend(false); }}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                >
                    نسيت كلمة المرور؟
                </button>
                </>
            ) : (
                <button
                onClick={() => { setAuthMode('login'); setMessage(null); setShowResend(false); }}
                className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                العودة للدخول
                </button>
            )}
            </div>
        )}
      </div>
    </div>
  );
};
