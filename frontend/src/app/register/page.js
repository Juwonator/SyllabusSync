'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

const SYMBOLS = [
  { text: 'E = mc²',        x: '8%',  y: '4%',  size: '1.1rem', rot: '-3deg'  },
  { text: '∫f(x)dx',        x: '55%', y: '2%',  size: '1rem',   rot: '4deg'   },
  { text: 'H₂O',            x: '78%', y: '9%',  size: '1.2rem', rot: '-6deg'  },
  { text: 'F = ma',         x: '22%', y: '14%', size: '1rem',   rot: '2deg'   },
  { text: 'NaCl',           x: '66%', y: '20%', size: '0.95rem',rot: '-4deg'  },
  { text: 'DNA',            x: '5%',  y: '26%', size: '1.1rem', rot: '5deg'   },
  { text: 'PV = nRT',       x: '40%', y: '18%', size: '0.9rem', rot: '-2deg'  },
  { text: 'sin²θ+cos²θ=1',  x: '8%',  y: '40%', size: '0.85rem',rot: '3deg'  },
  { text: 'λ = v/f',        x: '72%', y: '36%', size: '1rem',   rot: '-5deg'  },
  { text: '♪ ♩ ♫',          x: '30%', y: '46%', size: '1.3rem', rot: '2deg'   },
  { text: 'CO₂',            x: '82%', y: '50%', size: '1rem',   rot: '6deg'   },
  { text: 'Δ = b²−4ac',     x: '4%',  y: '56%', size: '0.9rem', rot: '-3deg'  },
  { text: 'mitosis',        x: '55%', y: '58%', size: '0.95rem',rot: '4deg'   },
  { text: 'y = mx + c',     x: '16%', y: '66%', size: '0.9rem', rot: '-2deg'  },
  { text: 'a² + b² = c²',   x: '60%', y: '70%', size: '0.85rem',rot: '5deg'  },
  { text: 'V = IR',         x: '5%',  y: '76%', size: '1rem',   rot: '-4deg'  },
  { text: 'osmosis',        x: '70%', y: '80%', size: '0.9rem', rot: '3deg'   },
  { text: 'GDP',            x: '32%', y: '82%', size: '1rem',   rot: '-2deg'  },
  { text: 'π r²',           x: '50%', y: '88%', size: '1.1rem', rot: '6deg'   },
  { text: '∞',              x: '14%', y: '92%', size: '1.4rem', rot: '-3deg'  },
  { text: 'entropy',        x: '66%', y: '94%', size: '0.9rem', rot: '2deg'   },
  { text: 'pH',             x: '87%', y: '66%', size: '1rem',   rot: '-5deg'  },
  { text: 'VSEPR',          x: '42%', y: '32%', size: '0.85rem',rot: '4deg'   },
  { text: 'ATP',            x: '88%', y: '28%', size: '0.95rem',rot: '-3deg'  },
];

const CLASS_LEVELS  = ['SS1', 'SS2', 'SS3'];
const EXAM_TARGETS  = ['WAEC/SSCE', 'NECO', 'JAMB/UTME', 'GCE', 'JUPEB'];

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    full_name:    '',
    email:        '',
    phone:        '',
    password:     '',
    confirm:      '',
    class_level:  '',
    exam_target:  '',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim())  errs.full_name   = 'Full name is required';
    if (!form.email.trim())      errs.email       = 'Email is required';
    if (!form.phone.trim())      errs.phone       = 'Phone number is required';
    if (form.password.length < 6) errs.password   = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    if (!form.class_level)       errs.class_level = 'Select your class level';
    if (!form.exam_target)       errs.exam_target = 'Select your exam target';
    return errs;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        full_name:   form.full_name,
        email:       form.email,
        phone:       form.phone,
        password:    form.password,
        class_level: form.class_level,
        exam_target: form.exam_target,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/profile-setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const strength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6)  return { label: 'Too short',  color: '#ef4444', width: '20%' };
    if (p.length < 8)  return { label: 'Weak',       color: '#f97316', width: '40%' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p))
                       return { label: 'Fair',        color: '#eab308', width: '65%' };
    return             { label: 'Strong',             color: '#16a34a', width: '100%' };
  })();

  const Field = ({ id, label, type = 'text', placeholder, icon, value, onChange,
                   error, right }) => (
    <div style={s.fieldGroup}>
      <label style={s.label} htmlFor={id}>{label}</label>
      <div style={s.inputWrap}>
        <span style={s.inputIcon}>{icon}</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            ...s.input,
            borderColor: error ? '#fca5a5' : '#e5e7eb',
            background: error ? '#fff5f5' : '#fff',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = '#15803d'; }}
          onBlur={e  => { if (!error) e.target.style.borderColor = '#e5e7eb'; }}
        />
        {right}
      </div>
      {error && <span style={s.fieldError}>{error}</span>}
    </div>
  );

  return (
    <div style={s.root}>

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <div style={s.left}>
        <div style={s.formulaBg}>
          {SYMBOLS.map((sym, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: sym.x, top: sym.y,
              fontSize: sym.size,
              transform: `rotate(${sym.rot})`,
              color: '#fff',
              opacity: 0.18,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              {sym.text}
            </span>
          ))}
        </div>

        <div style={s.leftContent}>
          <div style={s.logoWrap}>
            <div style={s.logoIcon}>S</div>
            <span style={s.logoText}>
              Syllabus<span style={s.logoAccent}>Sync</span>
            </span>
          </div>

          <div>
            <h1 style={s.leftHeading}>
              Your exam journey<br />
              <span style={s.leftAccent}>starts here.</span>
            </h1>
            <p style={s.leftSub}>
              Join thousands of Nigerian students already practising
              smarter — not harder.
            </p>
          </div>

          {/* Steps */}
          <div style={s.stepsWrap}>
            {[
              { step: '01', title: 'Create your account',    sub: 'Takes less than 2 minutes' },
              { step: '02', title: 'Set up your profile',    sub: 'Tell us your subjects and goals' },
              { step: '03', title: 'Start practising',       sub: 'CBT, study notes and more' },
            ].map(item => (
              <div key={item.step} style={s.stepItem}>
                <div style={s.stepNum}>{item.step}</div>
                <div>
                  <div style={s.stepTitle}>{item.title}</div>
                  <div style={s.stepSub}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <div style={s.right}>
        <div style={s.formCard}>

          <div style={s.formHeader}>
            <h2 style={s.formTitle}>Create your account</h2>
            <p style={s.formSub}>Free forever — no credit card needed</p>
          </div>

          {error && (
            <div style={s.errorBox}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={s.form}>

            {/* Row 1 — Full name + Phone */}
            <div style={s.twoCol}>
              <Field
                id="full_name" label="Full name" placeholder="Daniel Olorunshola"
                icon="👤" value={form.full_name} error={fieldErrors.full_name}
                onChange={v => update('full_name', v)}
              />
              <Field
                id="phone" label="Phone number" placeholder="08012345678"
                icon="📱" value={form.phone} error={fieldErrors.phone}
                onChange={v => update('phone', v)}
              />
            </div>

            {/* Email */}
            <Field
              id="email" label="Email address" type="email"
              placeholder="you@example.com" icon="✉"
              value={form.email} error={fieldErrors.email}
              onChange={v => update('email', v)}
            />

            {/* Row 2 — Class + Exam */}
            <div style={s.twoCol}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Class level</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>🎓</span>
                  <select
                    value={form.class_level}
                    onChange={e => update('class_level', e.target.value)}
                    style={{
                      ...s.input, ...s.select,
                      borderColor: fieldErrors.class_level ? '#fca5a5' : '#e5e7eb',
                    }}
                  >
                    <option value="">Select class</option>
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {fieldErrors.class_level && (
                  <span style={s.fieldError}>{fieldErrors.class_level}</span>
                )}
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Exam target</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}>🎯</span>
                  <select
                    value={form.exam_target}
                    onChange={e => update('exam_target', e.target.value)}
                    style={{
                      ...s.input, ...s.select,
                      borderColor: fieldErrors.exam_target ? '#fca5a5' : '#e5e7eb',
                    }}
                  >
                    <option value="">Select exam</option>
                    {EXAM_TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {fieldErrors.exam_target && (
                  <span style={s.fieldError}>{fieldErrors.exam_target}</span>
                )}
              </div>
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <label style={s.label}>Password</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  style={{
                    ...s.input,
                    borderColor: fieldErrors.password ? '#fca5a5' : '#e5e7eb',
                  }}
                  onFocus={e => { if (!fieldErrors.password) e.target.style.borderColor = '#15803d'; }}
                  onBlur={e  => { if (!fieldErrors.password) e.target.style.borderColor = '#e5e7eb'; }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={s.eyeBtn}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {fieldErrors.password && <span style={s.fieldError}>{fieldErrors.password}</span>}
              {strength && (
                <div style={s.strengthWrap}>
                  <div style={s.strengthBar}>
                    <div style={{ ...s.strengthFill, width: strength.width, background: strength.color }} />
                  </div>
                  <span style={{ ...s.strengthLabel, color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Field
              id="confirm" label="Confirm password" type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password" icon="🔑"
              value={form.confirm} error={fieldErrors.confirm}
              onChange={v => update('confirm', v)}
              right={
                <button type="button" onClick={() => setShowConfirm(p => !p)} style={s.eyeBtn}>
                  {showConfirm ? '🙈' : '👁'}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                ...s.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating account...' : 'Create account →'}
            </button>

          </form>

          <p style={s.loginPrompt}>
            Already have an account?{' '}
            <Link href="/login" style={s.loginLink}>Log in</Link>
          </p>

        </div>
      </div>

    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  left: {
    flex: '0 0 40%',
    background: 'linear-gradient(145deg, #14532d 0%, #15803d 55%, #166534 100%)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 36px',
  },
  formulaBg: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  leftContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '36px',
    maxWidth: '360px',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: '#fde047', color: '#14532d',
    fontWeight: '900', fontSize: '1.3rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.5px' },
  logoAccent: { color: '#fde047' },
  leftHeading: {
    color: '#fff', fontSize: '1.8rem', fontWeight: '800',
    lineHeight: '1.25', margin: '0 0 12px',
  },
  leftAccent: { color: '#fde047' },
  leftSub: { color: '#bbf7d0', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 },
  stepsWrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  stepItem: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  stepNum: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'rgba(253,224,71,0.2)', border: '1px solid rgba(253,224,71,0.4)',
    color: '#fde047', fontWeight: '800', fontSize: '0.75rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: { color: '#fff', fontWeight: '600', fontSize: '0.9rem' },
  stepSub: { color: '#86efac', fontSize: '0.8rem', marginTop: '2px' },

  // Right
  right: {
    flex: 1,
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    overflowY: 'auto',
  },
  formCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    border: '1px solid #f0f0f0',
  },
  formHeader: { marginBottom: '24px' },
  formTitle: { fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: '0 0 4px' },
  formSub: { fontSize: '0.875rem', color: '#6b7280', margin: 0 },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '10px', padding: '10px 14px',
    fontSize: '0.875rem', color: '#dc2626',
    marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '0.8rem', fontWeight: '600', color: '#374151' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: {
    position: 'absolute', left: '11px',
    fontSize: '0.85rem', pointerEvents: 'none', zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '0.875rem',
    color: '#111827',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  select: { paddingLeft: '36px', appearance: 'none', cursor: 'pointer' },
  eyeBtn: {
    position: 'absolute', right: '10px',
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '0.9rem', padding: '4px',
  },
  fieldError: { fontSize: '0.75rem', color: '#ef4444' },
  strengthWrap: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' },
  strengthBar: {
    flex: 1, height: '4px', background: '#e5e7eb',
    borderRadius: '999px', overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: '999px', transition: 'width 0.3s, background 0.3s' },
  strengthLabel: { fontSize: '0.72rem', fontWeight: '600', minWidth: '50px' },
  submitBtn: {
    width: '100%', padding: '13px',
    background: '#15803d', color: '#fff',
    border: 'none', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: '700',
    cursor: 'pointer', marginTop: '4px',
    letterSpacing: '0.2px',
  },
  loginPrompt: {
    textAlign: 'center', fontSize: '0.875rem',
    color: '#6b7280', marginTop: '20px', marginBottom: 0,
  },
  loginLink: { color: '#15803d', fontWeight: '600', textDecoration: 'none' },
};
