import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Users, DollarSign, Calendar, Vote, UserPlus, Trash2, 
  UserCheck, Shield, Award, Mail, ArrowRight, MessageSquare
} from 'lucide-react';

export default function GroupDashboard() {
  const { groupId } = useParams();
  const { api, activeGroupDetails, refreshActiveGroup } = useApp();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Member invite controls
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/groups/${groupId}/dashboard`);
      setDashData(res.data);
    } catch (err) {
      console.error('Failed to load group dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    refreshActiveGroup();
  }, [groupId]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      setInviteError('');
      setInviteSuccess('');
      await api.post(`/groups/${groupId}/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      setInviteSuccess(`Invitation successfully sent to ${inviteEmail}.`);
      setInviteEmail('');
      await refreshActiveGroup();
    } catch (err) {
      console.error(err);
      setInviteError(err.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.post(`/groups/${groupId}/members/${userId}/role`, { role: newRole });
      await refreshActiveGroup();
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to modify role:', err);
      alert(err.response?.data?.message || 'Failed to change role.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      await refreshActiveGroup();
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  if (loading || !activeGroupDetails) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const { group, members, invitations, myRole } = activeGroupDetails;
  const isAdmin = myRole === 'admin';

  return (
    <div className="workspace-view">
      
      {/* Workspace Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          <span>Circles</span>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{group.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              {group.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '600px' }}>
              {group.description || 'Welcome to your gathering circle dashboard.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              backgroundColor: group.type === 'kitty' ? 'var(--accent-purple-glow)' : 'var(--accent-blue-glow)',
              color: group.type === 'kitty' ? 'var(--accent-purple)' : 'var(--accent-blue)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${group.type === 'kitty' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(37, 99, 235, 0.2)'}`
            }}>
              {group.type} Mode
            </span>
          </div>
        </div>
      </div>

      {/* Analytics widgets row */}
      {dashData && (
        <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
          <div className="panel grid-col-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: 'var(--radius-sm)' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashData.group?.member_count || 1} Active</div>
            </div>
          </div>

          <div className="panel grid-col-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-glow)', color: 'var(--success)', borderRadius: 'var(--radius-sm)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contributions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>INR {parseFloat(dashData.finances?.totalCollected).toLocaleString()}</div>
            </div>
          </div>

          <div className="panel grid-col-4" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shared Expenses</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>INR {parseFloat(dashData.finances?.totalSpent).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main dashboard body split layout */}
      <div className="dashboard-grid">
        
        {/* Left Column: Feeds, Events, Polls */}
        <div className="grid-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Upcoming Event card */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                <span>Next Event Gathering</span>
              </h3>
              <button 
                onClick={() => navigate(`/group/${groupId}/events`)} 
                className="btn btn-ghost" 
                style={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>All Events</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {dashData?.upcomingEvent ? (
              <div style={{
                backgroundColor: 'var(--bg-charcoal)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--accent-white)' }}>{dashData.upcomingEvent.title}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{dashData.upcomingEvent.description || 'No description.'}</p>
                  </div>
                  <span className="badge badge-pending">Scheduled</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                  fontSize: '0.8125rem'
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Date & Time</div>
                    <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                      {new Date(dashData.upcomingEvent.date).toLocaleDateString()} at {dashData.upcomingEvent.time.substring(0, 5)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Venue</div>
                    <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{dashData.upcomingEvent.venue}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Host</div>
                    <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{dashData.upcomingEvent.host_name}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                No upcoming events scheduled. Create one to organize your circle.
              </div>
            )}
          </div>

          {/* Active Polls widget */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Vote size={18} style={{ color: 'var(--text-secondary)' }} />
                <span>Active Decision Polls</span>
              </h3>
              <button 
                onClick={() => navigate(`/group/${groupId}/polls`)} 
                className="btn btn-ghost" 
                style={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>View Polls</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {dashData?.activePolls && dashData.activePolls.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dashData.activePolls.map(poll => (
                  <div 
                    key={poll.id}
                    onClick={() => navigate(`/group/${groupId}/polls`)}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--bg-charcoal)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="panel-interactive"
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{poll.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Expires {new Date(poll.expires_at).toLocaleString()} • {poll.total_votes} votes recorded
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>Vote</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                No active decision polls. Create a poll for food, date, or venue selections.
              </div>
            )}
          </div>

          {/* Recent Kitty Winners (only for kitty party mode) */}
          {group.type === 'kitty' && (
            <div className="panel">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Award size={18} style={{ color: 'var(--accent-purple)' }} />
                <span>Recent Kitty Draw Winners</span>
              </h3>

              {dashData?.recentWinners && dashData.recentWinners.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {dashData.recentWinners.map((win, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg-charcoal)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-purple-glow)',
                          color: 'var(--accent-purple)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          #{win.cycle_number}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{win.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Drawn on {new Date(win.won_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--success)' }}>
                        INR {parseFloat(win.amount_won).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  No kitty rotations drawn yet. Go to Kitty Draw to run the wheel.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Members panel & Send Invitation */}
        <div className="grid-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Send invitation panel */}
          {isAdmin && (
            <div className="panel" style={{ borderColor: 'var(--border-hover)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <UserPlus size={16} />
                <span>Invite New Member</span>
              </h3>

              {inviteError && (
                <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                  {inviteSuccess}
                </div>
              )}

              <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="user@domain.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Workspace Role</label>
                  <select 
                    className="form-control"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="member">Standard Member</option>
                    <option value="admin">Workspace Admin</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.5rem 1rem' }}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Send Invite'}
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          <div className="panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Users size={16} />
              <span>Workspace Members ({members.length})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {members.map(member => (
                <div 
                  key={member.user_id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {member.profile_picture_url ? (
                      <img 
                        src={member.profile_picture_url.startsWith('http') ? member.profile_picture_url : `http://localhost:5000${member.profile_picture_url}`}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}>
                        {member.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{member.full_name}</span>
                        {member.role === 'admin' && <Shield size={12} style={{ color: 'var(--success)' }} />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                    </div>
                  </div>

                  {/* Actions for Admins */}
                  {isAdmin && member.user_id !== activeGroupDetails.group.created_by_id && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        onClick={() => handleRoleChange(member.user_id, member.role === 'admin' ? 'member' : 'admin')}
                        className="btn btn-ghost" 
                        style={{ padding: '0.25rem', color: 'var(--text-secondary)' }}
                        title="Toggle Admin Role"
                      >
                        <Shield size={14} />
                      </button>
                      <button 
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="btn btn-ghost" 
                        style={{ padding: '0.25rem', color: 'var(--danger)' }}
                        title="Remove Member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations list */}
          {invitations.length > 0 && (
            <div className="panel">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Mail size={16} />
                <span>Sent Invitations ({invitations.length})</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {invitations.map(invite => (
                  <div 
                    key={invite.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, wordBreak: 'break-all' }}>{invite.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Role: <span style={{ textTransform: 'capitalize' }}>{invite.role}</span>
                      </div>
                    </div>
                    <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>{invite.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
