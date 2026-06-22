import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Vote, Plus, Calendar, AlertCircle, BarChart2, Check, Trash2 } from 'lucide-react';

export default function Polls() {
  const { groupId } = useParams();
  const { api, activeGroupDetails } = useApp();

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Active detail modal check
  const [activePoll, setActivePoll] = useState(null);
  const [activePollDetails, setActivePollDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [pollType, setPollType] = useState('other');
  const [expiry, setExpiry] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/polls/${groupId}`);
      setPolls(res.data);
    } catch (err) {
      console.error('Failed to load polls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [groupId]);

  const handleOpenPoll = async (poll) => {
    setActivePoll(poll);
    try {
      setDetailsLoading(true);
      const res = await api.get(`/polls/${groupId}/details/${poll.id}`);
      setActivePollDetails(res.data);
    } catch (err) {
      console.error('Failed to load poll details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionTextChange = (index, value) => {
    setOptions(prev => prev.map((opt, idx) => idx === index ? value : opt));
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const cleanOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (!title || !expiry || cleanOptions.length < 2) {
      setFormError('Please enter title, expiry, and at least 2 non-empty options.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError('');
      await api.post(`/polls/${groupId}`, {
        title,
        description: desc,
        type: pollType,
        expiresAt: expiry,
        options: cleanOptions
      });
      setIsCreateOpen(false);
      setTitle('');
      setDesc('');
      setPollType('other');
      setExpiry('');
      setOptions(['', '']);
      fetchPolls();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to create poll.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVote = async (optionId) => {
    if (!activePoll) return;
    try {
      await api.post(`/polls/${groupId}/vote/${activePoll.id}`, { optionId });
      // Re-fetch details to update UI percentages
      const res = await api.get(`/polls/${groupId}/details/${activePoll.id}`);
      setActivePollDetails(res.data);
      fetchPolls();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Voting failed.');
    }
  };

  const handleDeletePoll = async (pollId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this decision poll?')) return;
    try {
      await api.delete(`/polls/${groupId}/${pollId}`);
      fetchPolls();
      if (activePoll?.id === pollId) {
        setActivePoll(null);
        setActivePollDetails(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete poll.');
    }
  };

  if (loading || !activeGroupDetails) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isAdmin = activeGroupDetails.myRole === 'admin';

  return (
    <div className="workspace-view">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Decision Polls
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Coordinate and settle date options, venue preferences, food plans, dress codes, or budget scopes.
          </p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Create Poll</span>
        </button>
      </div>

      {/* Main split grid */}
      <div className="dashboard-grid">
        
        {/* Left pane: Polls list */}
        <div className="grid-col-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Active / Past Polls ({polls.length})
          </h3>

          {polls.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--bg-charcoal)' }}>
              <Vote size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>No Polls Logged</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>
                Start a conversation by introducing a vote for dates or events themes.
              </p>
            </div>
          ) : (
            polls.map(poll => {
              const isSelected = activePoll?.id === poll.id;
              const hasExpired = new Date(poll.expires_at) < new Date();
              return (
                <div 
                  key={poll.id}
                  onClick={() => handleOpenPoll(poll)}
                  className="panel panel-interactive"
                  style={{
                    borderColor: isSelected ? 'var(--text-muted)' : 'var(--border-subtle)',
                    backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: 'var(--accent-blue)',
                      backgroundColor: 'var(--accent-blue-glow)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {poll.type} Poll
                    </span>
                    <span className={`badge ${hasExpired ? 'badge-failed' : 'badge-paid'}`} style={{ fontSize: '0.6875rem' }}>
                      {hasExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{poll.title}</h4>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {poll.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span>{poll.total_votes || 0} votes recorded</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isAdmin && (
                        <button 
                          onClick={(e) => handleDeletePoll(poll.id, e)} 
                          className="btn btn-ghost" 
                          style={{ padding: '0.15rem', color: 'var(--danger)' }}
                          title="Delete Poll"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <span>View details →</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right pane: Poll voting and Live details */}
        <div className="grid-col-6">
          <div className="panel" style={{ minHeight: '350px', position: 'sticky', top: '80px' }}>
            {detailsLoading ? (
              <div style={{ display: 'flex', height: '300px', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
              </div>
            ) : activePollDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Poll Details Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                      {activePollDetails.poll.type} Choice
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} />
                      <span>Expires: {new Date(activePollDetails.poll.expires_at).toLocaleString()}</span>
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{activePollDetails.poll.title}</h3>
                  {activePollDetails.poll.description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {activePollDetails.poll.description}
                    </p>
                  )}
                </div>

                {/* Poll Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activePollDetails.options.map(option => {
                    const isUserVoted = activePollDetails.userVotedOptionId === option.id;
                    const hasExpired = !activePollDetails.poll.is_active;
                    return (
                      <div 
                        key={option.id}
                        onClick={() => !hasExpired && handleVote(option.id)}
                        style={{
                          border: `1px solid ${isUserVoted ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                          backgroundColor: isUserVoted ? 'var(--accent-blue-glow)' : 'var(--bg-charcoal)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.875rem 1.25rem',
                          cursor: hasExpired ? 'not-allowed' : 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {/* Vote Percent background bar */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${option.percentage}%`,
                          backgroundColor: isUserVoted ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.02)',
                          zIndex: 1,
                          pointerEvents: 'none',
                          transition: 'width 0.4s ease'
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 2 }}>
                          {isUserVoted && <Check size={16} style={{ color: 'var(--accent-blue)' }} />}
                          <span style={{ fontWeight: isUserVoted ? 600 : 400, fontSize: '0.9375rem' }}>{option.option_text}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 2, fontSize: '0.8125rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{option.votes_count} votes</span>
                          <span style={{ fontWeight: 600, color: isUserVoted ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{option.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={14} />
                  <span>
                    {!activePollDetails.poll.is_active 
                      ? 'Voting has expired for this poll.' 
                      : 'You can change your vote at any time by picking a different choice.'}
                  </span>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', height: '300px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', gap: '0.5rem' }}>
                <BarChart2 size={32} style={{ color: 'var(--text-muted)' }} />
                <span>Select a poll from the left column to view vote details and cast your vote.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Create Poll Modal */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Create Decision Poll</h3>

            {formError && (
              <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePoll}>
              <div className="form-group">
                <label className="form-label">Poll Question *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Which date works best for gathering?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control"
                  style={{ height: '50px', resize: 'none' }}
                  placeholder="Additional guidelines or constraints..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control"
                    value={pollType}
                    onChange={(e) => setPollType(e.target.value)}
                  >
                    <option value="date">Date Poll</option>
                    <option value="venue">Venue Location</option>
                    <option value="food">Food Choices</option>
                    <option value="theme">Dress & Theme</option>
                    <option value="games">Games / Activity</option>
                    <option value="budget">Budget Pool</option>
                    <option value="other">Other Selection</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Expires At *</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Options List */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Choices / Options *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Option #${idx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        required
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="btn btn-danger"
                          style={{ padding: '0.625rem', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', fontSize: '0.8125rem' }}
                >
                  + Add Choice Option
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                >
                  {formLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Launch Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
