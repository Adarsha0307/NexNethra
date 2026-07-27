import { useState } from 'react';
import { getApiUrl } from '../api';
import { SignInPage } from '../components/ui/sign-in';

const testimonials = [
  
 
];

function AuthPage({ onAuth }) {
  const [step, setStep] = useState('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState([]);
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  async function handleRegister(event) {
    event.preventDefault();
    setMessage('');
    setErrors([]);

    const res = await fetch(getApiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setUserId(data.userId);
      setStep('verify-email');
      setMessage(data.devCode ? `${data.message} Dev code: ${data.devCode}` : data.message);
    } else {
      setErrors(data.reasons || [data.error]);
    }
  }

  async function handleVerifyEmail(event) {
    event.preventDefault();
    setMessage('');

    const res = await fetch(getApiUrl('/api/auth/verify-email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage('Email verified! You can now sign in.');
      setStep('login');
    } else {
      setMessage(data.error);
    }
  }

  async function handleResendCode() {
    setMessage('');

    const res = await fetch(getApiUrl('/api/auth/resend-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    setMessage(data.devCode ? `${data.message} Dev code: ${data.devCode}` : (data.message || data.error));
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      if (data.mfaRequired) {
        setPendingToken(data.pendingToken);
        setStep('mfa-code');
      } else {
        localStorage.setItem('nexnetra_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('nexnetra_refresh', data.refreshToken);
        onAuth({ token: data.accessToken });
      }
    } else if (res.status === 403 && data.userId) {
      setUserId(data.userId);
      setStep('verify-email');
      setMessage(data.error);
    } else {
      setMessage(data.error);
    }
  }

  async function handleMfaVerify(event) {
    event.preventDefault();
    setMessage('');

    const res = await fetch(getApiUrl('/api/auth/login/verify-mfa'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingToken, code: mfaCode }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('nexnetra_token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('nexnetra_refresh', data.refreshToken);
      onAuth({ token: data.accessToken });
    } else {
      setMessage(data.error);
    }
  }

  async function handleGoogleSignIn() {
    setMessage('Attempting demo login...');

    const res = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email || 'demo@test.com', password: form.password || 'DemoPass123!' }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('nexnetra_token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('nexnetra_refresh', data.refreshToken);
      onAuth({ token: data.accessToken });
    } else {
      setMessage(data.error || 'Google OAuth is not configured. Use email/password to sign in.');
    }
  }

  if (step === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030a12] p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
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
      <div className="min-h-screen flex items-center justify-center bg-[#030a12] p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <p className="text-sm uppercase tracking-widest text-[#4fd1c5] font-bold mb-2">Nexnetra access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Verify your email</h1>
          {message && <p className="text-[#a0aec0] text-sm mb-4">{message}</p>}
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff] text-center tracking-widest text-2xl" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
            <button className="w-full bg-[#2b7fff] text-white rounded-2xl py-4 font-medium hover:bg-[#2b7fff]/90 transition-colors" type="submit">Verify</button>
          </form>
          <button className="w-full text-center text-sm text-[#a0aec0] mt-4 hover:text-white transition-colors" onClick={handleResendCode}>Resend code</button>
        </div>
      </div>
    );
  }

  if (step === 'mfa-code') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030a12] p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
          <p className="text-sm uppercase tracking-widest text-[#4fd1c5] font-bold mb-2">Nexnetra access</p>
          <h1 className="text-3xl font-bold text-white mb-2">Two-factor authentication</h1>
          <p className="text-[#a0aec0] mb-6">Enter the code from your authenticator app.</p>
          {message && <p className="text-red-400 text-sm mb-4">{message}</p>}
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-[#2b7fff] text-center tracking-widest text-2xl" placeholder="000000" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} maxLength={6} />
            <button className="w-full bg-[#2b7fff] text-white rounded-2xl py-4 font-medium hover:bg-[#2b7fff]/90 transition-colors" type="submit">Verify</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <SignInPage
      heroImageSrc="https://i.snapcdn.app/photo?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJodHRwczovL3Njb250ZW50LmNkbmluc3RhZ3JhbS5jb20vdi90NTEuODI3ODctMTUvNjcxMDM2MDMxXzE4MDg3NTE2NTMwMDE3MjU3XzMyMDE3ODk5NDIxNzMzMjhfbi5oZWljP3N0cD1kc3QtanBnX2UzNV9zNDgweDQ4MF90dDYmX25jX2NhdD0xMTEmaWdfY2FjaGVfa2V5PU16ZzNNamMzTnpZM056ZzFNemsxTkRBMk5BJTNEJTNELjMtY2NiNy01JmNjYj03LTUmX25jX3NpZD01OGNkYWQmZWZnPWV5SjJaVzVqYjJSbFgzUmhaeUk2SWtaRlJVUXVlSEJwWkhNdU1UUTBNQzV6WkhJdWNtVm5kV3hoY2w5d2FHOTBieTVETXlKOSZfbmNfb2hjPW05Y3QyVzFmNmFvUTdrTnZ3SFN3SFRfJl9uY19vYz1BZHJWR1cweld0M1ZQWHhSbzNGaTZjMTVWTTBObnNrbzVFaVhGbTRKNVhySnFqdUNuT3RUcjJzNHNMTGM1T3lpa1BnJl9uY19hZD16LW0mX25jX2NpZD0wJl9uY196dD0yMyZfbmNfaHQ9c2NvbnRlbnQtbGdhMy0xLmNkbmluc3RhZ3JhbS5jb20mX25jX2dpZD1rS0RzLWEycGVFWTlMNUJCVzBhTDFnJl9uY19zcz03YTIyZSZvaD0wMF9BUURYQ0RQczVKR1ZIMFJacDJiWTZNVUU5TzB6YWFLNGQ0UWF0eS1MQlJnSTdnJm9lPTZBNkNDMkI4IiwiZmlsZW5hbWUiOiJUaHVtYm5haWxfNjcxMDM2MDMxXzE4MDg3NTE2NTMwMDE3MjU3XzMyMDE3ODk5NDIxNzMzMjhfbi5qcGciLCJuYmYiOjE3ODUxMjc3MDcsImV4cCI6MTc4NTEzMTMwNywiaWF0IjoxNzg1MTI3NzA3fQ.TBEAODyiXvl-sK6rJDA9nyl93ovsc8w8s1wzoonOd-k"
      testimonials={testimonials}
      error={message}
      onSignIn={handleSignIn}
      onResetPassword={() => setMessage('Password reset is not yet implemented.')}
      onCreateAccount={() => { setStep('register'); setMessage(''); setErrors([]); }}
    />
  );
}

export default AuthPage;
