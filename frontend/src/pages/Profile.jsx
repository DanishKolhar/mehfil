import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Mail, Shield, Calendar, DollarSign, Award, Camera, Check, ArrowLeft, Users } from 'lucide-react';

export default function Profile() {
  const { api, user, setUser } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgSuccess, setMsgSuccess] = useState('');

  const fetchProfileStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load profile stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.full_name || '');
      setEmail(user.email || '');
      fetchProfileStats();
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName || !email) {
      setMsgError('Name and Email are required.');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (avatarFile) formData.append('profilePicture', avatarFile);

    try {
      setUpdateLoading(true);
      setMsgError('');
      setMsgSuccess('');
      
      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update app auth state with updated details & token
      localStorage.setItem('mehfil_token', res.data.token);
      setUser(res.data.user);
      
      setMsgSuccess('Profile updated successfully.');
      setPassword('');
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      console.error(err);
      setMsgError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const avatarUrl = avatarPreview || (user.profilePictureUrl ? (
    user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `http://localhost:5000${user.profilePictureUrl}`
  ) : null);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Back button */}
      <div>
        <button
          onClick={handleBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.875rem',
            cursor: 'pointer',
            padding: '0.25rem 0',
            fontWeight: 500
          }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          My Profile
        </h1>
      </div>

      {/* Profile Header Card */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-hover)' }} 
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-charcoal)',
              border: '2px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 600,
              color: 'var(--text-secondary)'
            }}>
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <label style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: 'var(--accent-white)',
            color: 'var(--bg-obsidian)',
            padding: '0.35rem',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} title="Upload Avatar">
            <Camera size={12} />
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fullName}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.15rem', margin: 0 }}>{email}</p>
          
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Shield size={12} />
              <span>Role: {user.role || 'Member'}</span>
            </span>
            {(user.created_at || user.joined_at) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={12} />
                <span>Member Since: {new Date(user.created_at || user.joined_at).toLocaleDateString()}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      {stats?.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', padding: '0.5rem', backgroundColor: 'var(--success-glow)', color: 'var(--success)', borderRadius: '8px' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid Dues</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.15rem' }}>
                INR {parseFloat(stats.stats.totalPaidContributions).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', padding: '0.5rem', backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: '8px' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {stats.stats.attendance.percentage}%
              </div>
            </div>
          </div>

          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', padding: '0.5rem', backgroundColor: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', borderRadius: '8px' }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kitty Wins</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {stats.stats.kittyWinsCount} Win{stats.stats.kittyWinsCount !== 1 && 's'}
              </div>
            </div>
          </div>

          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', padding: '0.5rem', backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: '8px', opacity: 0.85 }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Groups Joined</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {stats.groups.length} Circle{stats.groups.length !== 1 && 's'}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Main Content Layout Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: Account Settings Form */}
        <div className="grid-col-7">
          <div className="panel">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Account Settings</h3>

            {msgError && (
              <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                {msgError}
              </div>
            )}

            {msgSuccess && (
              <div style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                {msgSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '2.25rem' }}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      className="form-control"
                      style={{ paddingLeft: '2.25rem' }}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Change Password (Optional)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="•••••••• (Min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ minWidth: '150px', padding: '0.625rem' }}
                  disabled={updateLoading}
                >
                  {updateLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Group Workspace Memberships */}
        <div className="grid-col-5">
          <div className="panel" style={{ height: '100%' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem' }}>Circle Memberships</h3>

            {stats?.groups.length === 0 ? (
              <div style={{ padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                You are not in any circles.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.groups.map(g => (
                  <div 
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.875rem 1rem',
                      backgroundColor: 'var(--bg-charcoal)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>Members: {g.member_count}</span>
                        <span>•</span>
                        <span>Joined: {new Date(g.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: g.role === 'admin' ? 'var(--success-glow)' : 'var(--accent-blue-glow)',
                      color: g.role === 'admin' ? 'var(--success)' : 'var(--accent-blue)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {g.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
