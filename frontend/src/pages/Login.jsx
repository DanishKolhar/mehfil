import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';

export default function Login() {
  const { login, token } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-obsidian)',
      padding: '2rem'
    }}>
      <div className="panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <Logo size={42} showText={true} />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Welcome back. Access your workspace.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            marginBottom: '1.25rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
            </div>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem' }}
            disabled={loading}
          >
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px' }}></div> : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-white)', textDecoration: 'none', fontWeight: 500 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
