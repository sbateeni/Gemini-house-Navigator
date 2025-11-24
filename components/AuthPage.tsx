import React, { useState } from 'react';
import { auth } from '../services/auth';
import { Loader2, Mail, Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isReset) {
        const { error } = await auth.resetPassword(email);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset link sent to your email!' });
      } else if (isLogin) {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
        // App.tsx handles state change via onAuthStateChange
      } else {
        const { data, error } = await auth.signUp(email, password, username);
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            setMessage({ type: 'error', text: 'This email is already registered.' });
        } else {
            setMessage({ type: 'success', text: 'Registration successful! Please check your email to confirm your account.' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isReset ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h1>
          <p className="text-slate-400 text-sm">
            {isReset ? 'Enter your email to receive a recovery link' : (isLogin ? 'Access your secure map journal' : 'Join the secure network')}
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-green-900/20 text-green-400 border border-green-900/50'}`}>
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isReset && (
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {!isReset && (
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isReset ? 'Send Link' : (isLogin ? 'Sign In' : 'Sign Up'))}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 space-y-2">
          {!isReset ? (
            <>
              <p>
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setMessage(null); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
              <button
                onClick={() => { setIsReset(true); setMessage(null); }}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Forgot Password?
              </button>
            </>
          ) : (
            <button
              onClick={() => { setIsReset(false); setMessage(null); }}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};