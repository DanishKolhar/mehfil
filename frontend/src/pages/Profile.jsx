import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Shield, Calendar, DollarSign, Award, Camera, Check } from 'lucide-react';

export default function Profile() {
  const { api, user, setUser, logout } = useApp();

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
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 2rem' }}>
      
      {/* Page Header */}
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '2rem' }}>
        My Personal Profile Settings
      </h1>

      <div className="dashboard-grid">
        
        {/* Left Column: Edit profile form */}
        <div className="grid-col-5">
          <div className="panel">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Personal Credentials</h3>

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
              {/* Avatar picker container */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px' }}>
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
                      fontWeight: 600
                    }}>
                      {fullName.charAt(0)}
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
                  }}>
                    <Camera size={14} />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload Profile Avatar</span>
              </div>

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Update Password (Optional)</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="•••••••• (Min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.625rem' }}
                disabled={updateLoading}
              >
                {updateLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: User activity, stats, and active workspaces */}
        <div className="grid-col-7" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Stats overview cards */}
          {stats?.stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              
              <div className="panel" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '0.4rem', backgroundColor: 'var(--success-glow)', color: 'var(--success)', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <DollarSign size={16} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid Dues</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.15rem' }}>
                  INR {parseFloat(stats.stats.totalPaidContributions).toLocaleString()}
                </div>
              </div>

              <div className="panel" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '0.4rem', backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <Calendar size={16} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.15rem' }}>
                  {stats.stats.attendance.percentage}%
                </div>
              </div>

              <div className="panel" style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '0.4rem', backgroundColor: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', borderRadius: '50%', marginBottom: '0.5rem' }}>
                  <Award size={16} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kitty Wins</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.15rem' }}>
                  {stats.stats.kittyWinsCount} Win{stats.stats.kittyWinsCount !== 1 && 's'}
                </div>
              </div>

            </div>
          )}

          {/* User Workspace Memberships */}
          <div className="panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Group Circle Memberships</h3>

            {stats?.groups.length === 0 ? (
              <div style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
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
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-charcoal)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Joined: {new Date(g.joined_at).toLocaleDateString()} • {g.member_count} member{g.member_count !== 1 && 's'}
                      </div>
                    </div>
                    
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: g.role === 'admin' ? 'var(--success-glow)' : 'var(--accent-blue-glow)',
                      color: g.role === 'admin' ? 'var(--success)' : 'var(--accent-blue)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '3px',
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
