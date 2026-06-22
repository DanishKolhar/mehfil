import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Users, Gift, ArrowRight, Bell, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { api, groups, refreshGroups, selectActiveGroup } = useApp();
  const navigate = useNavigate();

  const [invites, setInvites] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupType, setGroupType] = useState('standard'); // 'standard' or 'kitty'
  const [loading, setLoading] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchPendingInvites = async () => {
    try {
      setInvitesLoading(true);
      const res = await api.get('/groups/invites/pending');
      setInvites(res.data);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    refreshGroups();
    fetchPendingInvites();
  }, []);

  const handleGroupClick = (group) => {
    selectActiveGroup(group);
    navigate(`/group/${group.id}`);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName) {
      setModalError('Group name is required.');
      return;
    }

    try {
      setLoading(true);
      setModalError('');
      const res = await api.post('/groups', {
        name: groupName,
        description: groupDesc,
        type: groupType
      });
      await refreshGroups();
      setIsModalOpen(false);
      setGroupName('');
      setGroupDesc('');
      
      // Auto select the new group
      const newGroup = { id: res.data.groupId, name: groupName, type: groupType };
      selectActiveGroup(newGroup);
      navigate(`/group/${res.data.groupId}`);
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      await api.post(`/groups/invites/${inviteId}/respond`, { action });
      await refreshGroups();
      await fetchPendingInvites();
    } catch (err) {
      console.error(`Failed to ${action} invite:`, err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem' }}>
      
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            <Sparkles size={16} />
            <span>Mehfil Workspace Platform</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
            Your Community Gathering Circles
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', marginBottom: '1.5rem' }}>
            Plan premium events, collect monthly contributions, organize kitty rotations, simplify shared expense splits, and track attendance. All in one minimal dashboard.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ fontWeight: 600 }}
          >
            <Plus size={16} />
            <span>Create new Circle</span>
          </button>
        </div>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, var(--accent-purple-glow) 0%, transparent 60%)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />
      </div>

      {/* Invitations Row */}
      {invites.length > 0 && (
        <div className="panel" style={{ marginBottom: '2rem', borderColor: 'var(--accent-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Bell size={18} style={{ color: 'var(--accent-purple)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pending Group Invitations ({invites.length})</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {invites.map(invite => (
              <div 
                key={invite.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-charcoal)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{invite.group_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Invited by {invite.invited_by_name} • Role: <span style={{ textTransform: 'capitalize' }}>{invite.role}</span> • Type: <span style={{ textTransform: 'capitalize' }}>{invite.group_type} Group</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleInviteAction(invite.id, 'accept')}
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleInviteAction(invite.id, 'decline')}
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Active Circles ({groups.length})
        </h2>

        {groups.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'var(--bg-charcoal)' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Active Circles</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              You are not a member of any circles yet. Create your own group or wait for an administrator to invite you.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn btn-secondary"
            >
              <Plus size={16} />
              <span>Create Circle</span>
            </button>
          </div>
        ) : (
          <div className="dashboard-grid">
            {groups.map(group => (
              <div 
                key={group.id} 
                onClick={() => handleGroupClick(group)}
                className="panel panel-interactive grid-col-4"
                style={{ display: 'flex', flexDirection: 'column', height: '200px', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: group.type === 'kitty' ? 'var(--accent-purple)' : 'var(--accent-blue)',
                      backgroundColor: group.type === 'kitty' ? 'var(--accent-purple-glow)' : 'var(--accent-blue-glow)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {group.type === 'kitty' ? <Gift size={12} /> : <Users size={12} />}
                      {group.type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {group.member_count} member{group.member_count !== 1 && 's'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {group.name}
                  </h3>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.4'
                  }}>
                    {group.description || 'No description provided.'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Role: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{group.role}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Enter Circle <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Create New Circle</h3>

            {modalError && (
              <div style={{
                backgroundColor: 'var(--danger-glow)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--danger)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label className="form-label">Circle Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Society Friends, Friday Club"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="What is this gathering about?"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Circle Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${groupType === 'standard' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    backgroundColor: groupType === 'standard' ? 'var(--accent-blue-glow)' : 'var(--bg-charcoal)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}>
                    <input 
                      type="radio" 
                      name="groupType" 
                      value="standard" 
                      checked={groupType === 'standard'}
                      onChange={() => setGroupType('standard')}
                      style={{ display: 'none' }}
                    />
                    <Users size={20} style={{ color: groupType === 'standard' ? 'var(--accent-white)' : 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Standard Group</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
                      Gatherings, Events, Expense splits
                    </span>
                  </label>

                  <label style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${groupType === 'kitty' ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                    backgroundColor: groupType === 'kitty' ? 'var(--accent-purple-glow)' : 'var(--bg-charcoal)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}>
                    <input 
                      type="radio" 
                      name="groupType" 
                      value="kitty" 
                      checked={groupType === 'kitty'}
                      onChange={() => setGroupType('kitty')}
                      style={{ display: 'none' }}
                    />
                    <Gift size={20} style={{ color: groupType === 'kitty' ? 'var(--accent-white)' : 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Kitty Party</span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
                      Monthly host rotation, wheel/chit draws
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? <div className="spinner" style={{ width: '18px', height: '18px' }}></div> : 'Create Circle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
