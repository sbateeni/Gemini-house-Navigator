
import React, { useState, useEffect } from 'react';
import { auth } from '../services/auth';
import { db } from '../services/db';
import { Loader2, Mail, Lock, User, ShieldCheck, AlertCircle, KeyRound, LogOut, CheckSquare, Square } from 'lucide-react';
import { SourceSession } from '../types';

// --- NATIVE STYLES (NO TAILWIND DEPENDENCY FOR LAYOUT) ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#0f172a', // Deep Dark Blue
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
    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(15,23,42,0) 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  card: {
    backgroundColor: '#1e293b', // Slate 900
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '10px'
  },
  logoBox: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    margin: '0 auto 20px auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    transition: 'background-color 0.3s ease'
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  tabsContainer: {
    backgroundColor: '#0f172a',
    padding: '5px',
    borderRadius: '12px',
    display: 'flex',
    gap: '5px',
    border: '1px solid #334155'
  },
  tab: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  inputGroup: {
    position: 'relative',
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '16px 50px 16px 16px', // Right padding for icon
    fontSize: '16px',
    color: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  icon: {
    position: 'absolute',
    top: '50%',
    right: '16px',
    transform: 'translateY(-50%)',
    color: '#64748b',
    pointerEvents: 'none'
  },
  button: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '10px',
    transition: 'transform 0.1s ease'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#38bdf8', // Sky 400
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '0 5px'
  },
  messageBox: {
    padding: '15px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    lineHeight: '1.5'
  },
  logoutBtn: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '5px'
  }
};

interface AuthPageProps {
  onSourceLogin?: (session: SourceSession) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSourceLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset' | 'source'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [showResend, setShowResend] = useState(false); 
  const [rememberMe, setRememberMe] = useState(false);
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');

  // Styles helpers based on state
  const isSource = authMode === 'source';
  
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
      if (isSource) {
         const cleanCode = accessCode.replace(/\s/g, '');
         if (cleanCode.length < 5) throw new Error('يرجى إدخال الكود بشكل صحيح');
         
         const res = await db.verifyAccessCode(cleanCode);
         if (res.valid && res.expiresAt) {
             if (onSourceLogin) onSourceLogin({ code: cleanCode, expiresAt: res.expiresAt, label: res.label });
         } else {
             throw new Error(res.error || 'كود غير صالح');
         }
         return;
      }

      await auth.signOut();

      if (authMode === 'reset') {
        const { error } = await auth.resetPassword(email);
        if (error) throw error;
        setMessage({ type: 'success', text: 'تم إرسال الرابط بنجاح.' });
      } else if (authMode === 'login') {
        if (rememberMe) localStorage.setItem('gemini_saved_email', email);
        else localStorage.removeItem('gemini_saved_email');

        const { error } = await auth.signIn(email, password);
        if (error) {
          if (error.message.includes("Email not confirmed")) setShowResend(true);
          throw error;
        }
      } else {
        const { data, error } = await auth.signUp(email, password, username);
        if (error) throw error;
        if (data.user?.identities?.length === 0) setMessage({ type: 'error', text: 'البريد مسجل مسبقاً.' });
        else setMessage({ type: 'success', text: 'تم التسجيل! تفقد بريدك.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ' });
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async () => {
      if(confirm("إعادة ضبط التطبيق ومسح البيانات؟")) {
          localStorage.clear();
          await auth.signOut();
          window.location.reload();
      }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlow}></div>
      
      <div style={styles.card}>
        {/* Utility Button */}
        <button onClick={handleForceLogout} style={styles.logoutBtn} title="إعادة ضبط">
           <LogOut size={18} />
        </button>

        {/* Header */}
        <div style={styles.header}>
            <div style={{
                ...styles.logoBox, 
                background: isSource ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
            }}>
                {isSource ? <KeyRound size={40} color="white" /> : <ShieldCheck size={40} color="white" />}
            </div>
            <h1 style={styles.title}>{isSource ? 'دخول المصادر' : 'تسجيل الدخول'}</h1>
            <p style={styles.subtitle}>نظام العمليات الجغرافية الآمن</p>
        </div>

        {/* Custom Tabs */}
        <div style={styles.tabsContainer}>
            <button 
                onClick={() => { setAuthMode('login'); setMessage(null); }}
                style={{
                    ...styles.tab,
                    backgroundColor: !isSource ? '#1e293b' : 'transparent',
                    color: !isSource ? 'white' : '#64748b',
                    boxShadow: !isSource ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
            >
                طاقم العمليات
            </button>
            <button 
                onClick={() => { setAuthMode('source'); setMessage(null); }}
                style={{
                    ...styles.tab,
                    backgroundColor: isSource ? '#064e3b' : 'transparent',
                    color: isSource ? '#34d399' : '#64748b',
                    boxShadow: isSource ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
            >
                مصدر (مؤقت)
            </button>
        </div>

        {/* Messages */}
        {message && (
            <div style={{
                ...styles.messageBox,
                backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: message.type === 'error' ? '#f87171' : '#4ade80',
                border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
            }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                    {message.text}
                    {showResend && message.type === 'error' && (
                        <div style={{marginTop: '5px'}}>
                           <button onClick={() => auth.resendConfirmation(email)} style={{...styles.linkBtn, color: '#f87171', textDecoration: 'underline'}}>إعادة الإرسال</button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
            {isSource ? (
                <div style={styles.inputGroup}>
                    <div style={styles.icon}><KeyRound size={20} /></div>
                    <input 
                        type="text" 
                        placeholder="0000 0000 0000 0000"
                        value={accessCode}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length <= 16) setAccessCode(val);
                        }}
                        style={{...styles.input, textAlign: 'center', letterSpacing: '2px', fontFamily: 'monospace', fontSize: '18px'}}
                        maxLength={16}
                    />
                    <p style={{fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '8px'}}>* أدخل الكود السري المكون من 16 خانة</p>
                </div>
            ) : (
                <>
                    {authMode === 'signup' && (
                         <div style={styles.inputGroup}>
                            <div style={styles.icon}><User size={20} /></div>
                            <input 
                                type="text" 
                                placeholder="اسم المستخدم"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    )}

                    <div style={styles.inputGroup}>
                        <div style={styles.icon}><Mail size={20} /></div>
                        <input 
                            type="email" 
                            placeholder="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    {authMode !== 'reset' && (
                        <div style={styles.inputGroup}>
                            <div style={styles.icon}><Lock size={20} /></div>
                            <input 
                                type="password" 
                                placeholder="كلمة المرور"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={styles.input}
                                required
                            />
                        </div>
                    )}

                    {authMode === 'login' && (
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '13px', color: '#94a3b8'}}>
                             <button type="button" onClick={() => setRememberMe(!rememberMe)} style={{background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                {rememberMe ? <CheckSquare size={16} color="#3b82f6" /> : <Square size={16} />}
                                تذكرني
                             </button>
                             <button type="button" onClick={() => { setAuthMode('reset'); setMessage(null); }} style={{...styles.linkBtn, fontSize: '13px'}}>نسيت كلمة المرور؟</button>
                        </div>
                    )}
                </>
            )}

            <button 
                type="submit" 
                disabled={loading}
                style={{
                    ...styles.button,
                    backgroundColor: isSource ? '#10b981' : '#3b82f6',
                    boxShadow: isSource ? '0 4px 14px 0 rgba(16,185,129,0.39)' : '0 4px 14px 0 rgba(59,130,246,0.39)',
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'wait' : 'pointer'
                }}
            >
                {loading && <Loader2 className="animate-spin" size={20} />}
                {isSource ? 'بدء المهمة' : authMode === 'login' ? 'دخول' : authMode === 'signup' ? 'إنشاء حساب' : 'إرسال'}
            </button>
        </form>

        {/* Footer */}
        {!isSource && authMode !== 'reset' && (
            <div style={{textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#64748b'}}>
                {authMode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب؟'}
                <button 
                    onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setMessage(null); }} 
                    style={styles.linkBtn}
                >
                    {authMode === 'login' ? 'سجل الآن' : 'تسجيل الدخول'}
                </button>
            </div>
        )}
        {authMode === 'reset' && (
             <div style={{textAlign: 'center', marginTop: '10px'}}>
                <button onClick={() => setAuthMode('login')} style={{...styles.linkBtn, color: '#94a3b8'}}>العودة للدخول</button>
             </div>
        )}

      </div>
    </div>
  );
};
