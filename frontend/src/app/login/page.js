'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

// ── Subject formula symbols for the left panel background ──────────────
const SYMBOLS = [
  { text: 'E = mc²',        x: '8%',  y: '6%',  size: '1.1rem', rot: '-3deg'  },
  { text: '∫f(x)dx',        x: '55%', y: '3%',  size: '1rem',   rot: '4deg'   },
  { text: 'H₂O',            x: '75%', y: '10%', size: '1.2rem', rot: '-6deg'  },
  { text: 'F = ma',         x: '20%', y: '16%', size: '1rem',   rot: '2deg'   },
  { text: 'NaCl',           x: '68%', y: '22%', size: '0.95rem',rot: '-4deg'  },
  { text: 'DNA',            x: '5%',  y: '28%', size: '1.1rem', rot: '5deg'   },
  { text: 'PV = nRT',       x: '42%', y: '19%', size: '0.9rem', rot: '-2deg'  },
  { text: 'sin²θ+cos²θ=1',  x: '10%', y: '42%', size: '0.85rem',rot: '3deg'  },
  { text: 'λ = v/f',        x: '70%', y: '38%', size: '1rem',   rot: '-5deg'  },
  { text: '♪ ♩ ♫',          x: '30%', y: '48%', size: '1.3rem', rot: '2deg'   },
  { text: 'CO₂',            x: '80%', y: '52%', size: '1rem',   rot: '6deg'   },
  { text: 'Δ = b²−4ac',     x: '5%',  y: '58%', size: '0.9rem', rot: '-3deg'  },
  { text: 'mitosis',        x: '55%', y: '60%', size: '0.95rem',rot: '4deg'   },
  { text: 'y = mx + c',     x: '18%', y: '68%', size: '0.9rem', rot: '-2deg'  },
  { text: 'a² + b² = c²',   x: '60%', y: '72%', size: '0.85rem',rot: '5deg'  },
  { text: 'V = IR',         x: '5%',  y: '78%', size: '1rem',   rot: '-4deg'  },
  { text: 'osmosis',        x: '72%', y: '82%', size: '0.9rem', rot: '3deg'   },
  { text: 'GDP',            x: '30%', y: '84%', size: '1rem',   rot: '-2deg'  },
  { text: 'π r²',           x: '50%', y: '90%', size: '1.1rem', rot: '6deg'   },
  { text: '∞',              x: '15%', y: '92%', size: '1.4rem', rot: '-3deg'  },
  { text: 'entropy',        x: '68%', y: '94%', size: '0.9rem', rot: '2deg'   },
  { text: 'pH',             x: '85%', y: '68%', size: '1rem',   rot: '-5deg'  },
  { text: 'VSEPR',          x: '40%', y: '34%', size: '0.85rem',rot: '4deg'   },
  { text: 'ATP',            x: '88%', y: '30%', size: '0.95rem',rot: '-3deg'  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email, password
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>

      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div style={styles.left}>

        {/* Formula background */}
        <div style={styles.formulaBg}>
          {SYMBOLS.map((s, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: s.x, top: s.y,
              fontSize: s.size,
              transform: `rotate(${s.rot})`,
              color: '#fff',
              opacity: 0.18,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              {s.text}
            </span>
          ))}
        </div>

        {/* Left panel content */}
        <div style={styles.leftContent}>
          <div style={styles.logoWrap}>
            <div style={styles.logoIcon}>S</div>
            <span style={styles.logoText}>
              Syllabus<span style={styles.logoAccent}>Sync</span>
            </span>
          </div>

          <div style={styles.leftTagline}>
            <h1 style={styles.leftHeading}>
              Pass your exams.<br />
              <span style={styles.leftHeadingAccent}>Not just study for them.</span>
            </h1>
            <p style={styles.leftSub}>
              Nigeria's smartest CBT practice platform —
              built for WAEC, JAMB, NECO, GCE and JUPEB candidates.
            </p>
          </div>

          <div style={styles.statsRow}>
            {[
              { value: '20+', label: 'Subjects' },
              { value: '5',   label: 'Exam types' },
              { value: '∞',   label: 'Practice sessions' },
            ].map(stat => (
              <div key={stat.label} style={styles.statItem}>
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div style={styles.right}>
        <div style={styles.formCard}>

          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSub}>Log in to continue your exam preparation</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={styles.form}>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>✉</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={e => e.target.style.borderColor = '#15803d'}
                  onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.labelRow}>
                <label style={styles.label}>Password</label>
                <a href="#" style={styles.forgotLink}>Forgot password?</a>
              </div>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={styles.input}
                  onFocus={e => e.target.style.borderColor = '#15803d'}
                  onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={styles.eyeBtn}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span style={styles.loadingRow}>
                  <span style={styles.spinner} /> Logging in...
                </span>
              ) : 'Log in →'}
            </button>

          </form>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>New to SyllabusSync?</span>
            <span style={styles.dividerLine} />
          </div>

          <Link href="/register" style={styles.registerBtn}>
            Create a free account
          </Link>

        </div>
      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  // Left panel
  left: {
    flex: '0 0 45%',
    background: 'linear-gradient(145deg, #14532d 0%, #15803d 50%, #166534 100%)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  formulaBg: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  leftContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
    maxWidth: '380px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#fde047',
    color: '#14532d',
    fontWeight: '900',
    fontSize: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: '1.4rem',
    fontWeight: '700',
    letterSpacing: '-0.5px',
  },
  logoAccent: {
    color: '#fde047',
  },
  leftTagline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  leftHeading: {
    color: '#fff',
    fontSize: '2rem',
    fontWeight: '800',
    lineHeight: '1.2',
    margin: 0,
  },
  leftHeadingAccent: {
    color: '#fde047',
  },
  leftSub: {
    color: '#bbf7d0',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    margin: 0,
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statValue: {
    color: '#fde047',
    fontSize: '1.6rem',
    fontWeight: '800',
  },
  statLabel: {
    color: '#bbf7d0',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // Right panel
  right: {
    flex: 1,
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
  },
  formCard: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    border: '1px solid #f0f0f0',
  },
  formHeader: {
    marginBottom: '28px',
  },
  formTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: '#111827',
    margin: '0 0 6px',
  },
  formSub: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: 0,
  },

  // Error
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '0.875rem',
    color: '#dc2626',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorIcon: { fontSize: '1rem' },

  // Form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: '0.8rem',
    color: '#15803d',
    textDecoration: 'none',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '0.9rem',
    pointerEvents: 'none',
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '11px 12px 11px 38px',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#111827',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '4px',
  },

  // Submit
  submitBtn: {
    width: '100%',
    padding: '13px',
    background: '#15803d',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'background 0.15s',
    letterSpacing: '0.2px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '24px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e5e7eb',
  },
  dividerText: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
  },

  // Register button
  registerBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    border: '1.5px solid #15803d',
    borderRadius: '12px',
    color: '#15803d',
    fontWeight: '600',
    fontSize: '0.9rem',
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
};
