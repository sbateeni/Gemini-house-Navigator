
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { db } from '../services/db';
import { isConfigured } from '../services/supabase';
import { Loader2, Mail, Lock, User, ShieldCheck, AlertCircle, KeyRound, LogOut, CheckSquare, Square, Play } from 'lucide-react';
import { SourceSession } from '../types';

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#020617',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    direction: 'rtl',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGlow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(15,23,42,0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  logoBox: {
    width: '70px',
    height: '70px',
    borderRadius: '18px',
    margin: '0 auto 15px auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  },
  title: { fontSize: '24px', fontWeight: '800', color: 'white', textAlign: 'center', margin: 0 },
  subtitle: { fontSize: '13px', color: '#94a3b8', textAlign: 'center', marginTop: '5px' },
  input: {
    width: '100%',
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '14px 45px 14px 15px',
    fontSize: '15px',
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 'bold',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
  },
  demoBtn: {
    backgroundColor: 'transparent',
    border: '2px dashed #3b82f6',
    color: '#3b82f6',
    marginTop: '10px'
  }
};

interface AuthPageProps {
  onSourceLogin?: (session: SourceSession) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSourceLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'source'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');

  const handleDemoMode = () => {
    if (onSourceLogin) {
      onSourceLogin({ 
        code: 'DEMO-MODE', 
        expiresAt: Date.now() + 3600000, 
        label: 'جولة استكشافية (تجربة)' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (authMode === 'source') {
         const res = await db.verifyAccessCode(accessCode);
         if (res.valid && res.expiresAt) {
             onSourceLogin?.({ code: accessCode, expiresAt: res.expiresAt, label: res.label });
         } else throw new Error(res.error || 'كود غير صالح');
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlow}></div>
      <div style={styles.card}>
        <div style={styles.logoBox}>
          <ShieldCheck size={35} color="white" />
        </div>
        <h1 style={styles.title}>دخول النظام</h1>
        <p style={styles.subtitle}>نظام العمليات الجغرافية الآمن</p>

        {message && (
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {authMode === 'login' ? (
            <>
              <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} required />
              <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} required />
            </>
          ) : (
            <input type="text" placeholder="كود المصدر (16 رقم)" value={accessCode} onChange={e => setAccessCode(e.target.value)} style={styles.input} required />
          )}

          <button type="submit" disabled={loading} style={{ ...styles.button, backgroundColor: '#2563eb' }}>
            {loading ? <Loader2 className="animate-spin" /> : 'دخول النظام'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'source' : 'login')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {authMode === 'login' ? 'الدخول كـ مصدر مؤقت' : 'العودة لدخول الطاقم'}
          </button>
        </div>

        {/* زر وضع التجربة يظهر دائماً في حالة عدم وجود إعدادات لإتاحة الوصول للطائرة */}
        {!isConfigured && (
          <button onClick={handleDemoMode} style={{ ...styles.button, ...styles.demoBtn }}>
            <Play size={18} />
            بدء جولة تجريبية (بدون قاعدة بيانات)
          </button>
        )}
      </div>
    </div>
  );
};
