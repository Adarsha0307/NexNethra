import { useState } from 'react';
import { getApiUrl } from '../api';
import { SignInPage } from '../components/ui/sign-in';
import CyberBackground from '../components/ui/cyber-background';
import OTPVerification from '../components/ui/otp-input';

function AuthPage({ onAuth }) {
  const [step, setStep] = useState('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState([]);
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');

  const submitOtp = async (endpoint, payload) => {
    const res = await fetch(getApiUrl(endpoint), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  async function handleRegister(event) {
    event.preventDefault();
    setMessage('');
    setErrors([]);

    const res = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setUserId(data.userId);
      setStep('verify-email');
      setMessage(data.message);
    } else {
      setErrors(data.reasons || [data.error]);
    }
  }

  async function verifyEmailCode(otpCode) {
    setMessage('');
    const { ok, data } = await submitOtp('/api/auth/verify-email', { userId, code: otpCode });
    if (ok) {
      setMessage('Email verified! You can now sign in.');
      setStep('login');
      return true;
    }
    setMessage(data.error);
    return false;
  }

  async function handleResendCode() {
    setMessage('');
    const res = await fetch(getApiUrl('/api/auth/resend-code'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    setMessage(data.message || data.error);
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setMessage('');
    setErrors([]);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    setForm(prev => ({ ...prev, email, password }));

    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      if (data.mfaRequired) {
        setPendingToken(data.pendingToken);
        setStep('mfa-code');
      } else {
        onAuth({});
      }
    } else if (res.status === 403 && data.userId) {
      setUserId(data.userId);
      setStep('verify-email');
      setMessage(data.error);
    } else {
      setMessage(data.error);
    }
  }

  async function verifyMfaCode(otpCode) {
    setMessage('');
    const { ok, data } = await submitOtp('/api/auth/login/verify-mfa', { pendingToken, code: otpCode });
    if (ok) {
      onAuth({});
      return true;
    }
    setMessage(data.error);
    return false;
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setMessage('');
    setErrors([]);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');

    const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (res.ok) {
      setResetEmail(email);
      setStep('reset-password');
      setMessage(data.message);
    } else {
      setErrors([data.error]);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setMessage('');
    setErrors([]);

    const res = await fetch(getApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail, code, password }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage('Password reset successful! You can now sign in.');
      setStep('login');
    } else {
      setErrors(data.reasons || [data.error]);
    }
  }

  if (step === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <CyberBackground />
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative z-10">
          <p className="text-sm uppercase tracking-widest text-[#4fd1c5] font-bold mb-2">Nexnetra access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-[#a0aec0] mb-6">A verification code will be sent to your email.</p>

          {errors.length > 0 && (
            <ul className="text-red-400 text-sm mb-4 pl-4" style={{ listStyle: 'disc' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {message && <p className="text-[#a0aec0] text-sm mb-4">{message}</p>}

          <form onSubmit={handleRegister} className="space-y-4">
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff]" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff]" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff]" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff]" type="password" placeholder="Password (min 10 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button className="w-full bg-[#2b7fff] text-white rounded-2xl py-4 font-medium hover:bg-[#2b7fff]/90 transition-colors" type="submit">Create account</button>
          </form>

          <button className="w-full text-center text-sm text-[#a0aec0] mt-4 hover:text-white transition-colors" onClick={() => { setStep('login'); setMessage(''); setErrors([]); }}>Back to sign in</button>
        </div>
      </div>
    );
  }

  if (step === 'verify-email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <CyberBackground />
        <div className="relative z-10 w-full flex flex-col items-center gap-4">
          {message && <p className="max-w-sm text-center text-sm text-[#a0aec0] bg-white/5 border border-white/10 rounded-2xl px-4 py-3">{message}</p>}
          <OTPVerification
            length={6}
            email={form.email}
            title="Verify your email"
            verifyOTP={verifyEmailCode}
            onResend={handleResendCode}
          />
        </div>
      </div>
    );
  }

  if (step === 'mfa-code') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <CyberBackground />
        <div className="relative z-10 w-full flex flex-col items-center gap-4">
          {message && <p className="max-w-sm text-center text-sm text-[#a0aec0] bg-white/5 border border-white/10 rounded-2xl px-4 py-3">{message}</p>}
          <OTPVerification
            length={6}
            title="Two-factor authentication"
            verifyOTP={verifyMfaCode}
          />
        </div>
      </div>
    );
  }

  if (step === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <CyberBackground />
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative z-10">
          <p className="text-sm uppercase tracking-widest text-[#4fd1c5] font-bold mb-2">Nexnetra access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Reset your password</h1>
          <p className="text-[#a0aec0] mb-6">Enter your account email and we will send you a reset code.</p>

          {errors.length > 0 && (
            <ul className="text-red-400 text-sm mb-4 pl-4" style={{ listStyle: 'disc' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {message && <p className="text-[#a0aec0] text-sm mb-4">{message}</p>}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input name="email" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff]" placeholder="Email" type="email" required />
            <button className="w-full bg-[#2b7fff] text-white rounded-2xl py-4 font-medium hover:bg-[#2b7fff]/90 transition-colors" type="submit">Send reset code</button>
          </form>

          <button className="w-full text-center text-sm text-[#a0aec0] mt-4 hover:text-white transition-colors" onClick={() => { setStep('login'); setMessage(''); setErrors([]); }}>Back to sign in</button>
        </div>
      </div>
    );
  }

  if (step === 'reset-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <CyberBackground />
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative z-10">
          <p className="text-sm uppercase tracking-widest text-[#4fd1c5] font-bold mb-2">Nexnetra access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Enter new password</h1>
          <p className="text-[#a0aec0] mb-6">Enter the reset code and your new password.</p>

          {errors.length > 0 && (
            <ul className="text-red-400 text-sm mb-4 pl-4" style={{ listStyle: 'disc' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {message && <p className="text-[#a0aec0] text-sm mb-4">{message}</p>}

          <form onSubmit={handleResetPassword} className="space-y-4">
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff] text-center tracking-widest text-2xl" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff]" type="password" placeholder="New password (min 10 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="w-full bg-[#2b7fff] text-white rounded-2xl py-4 font-medium hover:bg-[#2b7fff]/90 transition-colors" type="submit">Reset password</button>
          </form>

          <button className="w-full text-center text-sm text-[#a0aec0] mt-4 hover:text-white transition-colors" onClick={() => { setStep('login'); setMessage(''); setErrors([]); }}>Back to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <SignInPage
      error={message}
      onSignIn={handleSignIn}
      onResetPassword={() => { setStep('forgot-password'); setMessage(''); setErrors([]); }}
      onCreateAccount={() => { setStep('register'); setMessage(''); setErrors([]); }}
    />
  );
}

export default AuthPage;