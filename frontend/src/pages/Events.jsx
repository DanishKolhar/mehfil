import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Calendar, Plus, MapPin, Sparkles, DollarSign, User, ShieldCheck, ClipboardList, CheckCircle } from 'lucide-react';

export default function Events() {
  const { groupId } = useParams();
  const { api, activeGroupDetails } = useApp();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  
  // Create/Edit fields
  const [eventId, setEventId] = useState(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [theme, setTheme] = useState('');
  const [budget, setBudget] = useState('');
  const [hostId, setHostId] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Attendance fields
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${groupId}`);
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [groupId]);

  const handleOpenCreateModal = () => {
    setEventId(null);
    setTitle('');
    setDesc('');
    setDate('');
    setTime('');
    setVenue('');
    setTheme('');
    setBudget('');
    setHostId(activeGroupDetails?.members[0]?.user_id || '');
    setStatus('scheduled');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setEventId(event.id);
    setTitle(event.title);
    setDesc(event.description || '');
    setDate(event.date.split('T')[0]); // Formats ISO date to YYYY-MM-DD
    setTime(event.time);
    setVenue(event.venue);
    setTheme(event.theme || '');
    setBudget(event.budget);
    setHostId(event.host_id);
    setStatus(event.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title || !date || !time || !venue || !hostId) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const payload = {
      title,
      description: desc,
      date,
      time,
      venue,
      theme,
      budget: parseFloat(budget) || 0.00,
      hostId: parseInt(hostId),
      status
    };

    try {
      setFormLoading(true);
      setFormError('');
      if (eventId) {
        await api.put(`/events/${groupId}/${eventId}`, payload);
      } else {
        await api.post(`/events/${groupId}`, payload);
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Failed to save event.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${groupId}/${id}`);
      fetchEvents();
    } catch (err) {
      console.error('Delete event error:', err);
      alert('Failed to delete event.');
    }
  };

  const handleRsvpSubmit = async (eventId, newStatus) => {
    try {
      await api.post(`/events/${groupId}/${eventId}/rsvp`, { status: newStatus });
      // Update local state instead of re-fetching
      setEvents(prev => prev.map(evt => {
        if (evt.id === eventId) {
          return { ...evt, user_rsvp: newStatus }; // Mock update, we can re-fetch
        }
        return evt;
      }));
      fetchEvents();
    } catch (err) {
      console.error('RSVP error:', err);
    }
  };

  const handleOpenAttendance = async (event) => {
    setActiveEvent(event);
    try {
      setAttendanceLoading(true);
      const res = await api.get(`/events/${groupId}/${event.id}/attendance`);
      setAttendanceRecords(res.data);
      setIsAttendanceOpen(true);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendanceStatusChange = (userId, status) => {
    setAttendanceRecords(prev => prev.map(rec => {
      if (rec.user_id === userId) {
        return { ...rec, status };
      }
      return rec;
    }));
  };

  const handleSaveAttendance = async () => {
    const records = attendanceRecords.map(r => ({
      userId: r.user_id,
      status: r.status
    }));

    try {
      setAttendanceLoading(true);
      await api.post(`/events/${groupId}/${activeEvent.id}/attendance`, { records });
      // Mark event as completed if attendance is being taken
      await api.patch(`/events/${groupId}/${activeEvent.id}/status`, { status: 'completed' });
      setIsAttendanceOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to record attendance.');
    } finally {
      setAttendanceLoading(false);
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
  const membersList = activeGroupDetails.members || [];

  return (
    <div className="workspace-view">
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Event Schedules & RSVPs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Plan, customize themes, capture attendee lists, and record circle participation logs.
          </p>
        </div>
        {isAdmin && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Schedule Event</span>
          </button>
        )}
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '4rem 1.5rem', backgroundColor: 'var(--bg-charcoal)' }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Scheduled Events</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            There are no events hosted in this circle yet. Schedule a gathering to get started!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {events.map(event => (
            <div 
              key={event.id} 
              className="panel"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                padding: '1.5rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-charcoal)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className={`badge badge-${event.status}`}>{event.status}</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{event.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{event.description || 'No description provided.'}</p>
                </div>

                {/* RSVP Controls / Admin Tools */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  
                  {/* Attendance trigger for admins */}
                  {isAdmin && event.status !== 'cancelled' && (
                    <button 
                      onClick={() => handleOpenAttendance(event)}
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                      title="Log Member Attendance"
                    >
                      <ClipboardList size={16} />
                      <span>Attendance</span>
                    </button>
                  )}

                  {/* Standard Edit/Delete tools */}
                  {isAdmin && (
                    <>
                      <button onClick={() => handleOpenEditModal(event)} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteEvent(event.id)} className="btn btn-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Event Attributes Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
                backgroundColor: 'var(--bg-charcoal)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
                fontSize: '0.8125rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Venue</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.venue}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Theme</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.theme || 'Casual'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Budget Pool</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>INR {parseFloat(event.budget).toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} style={{ color: 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Circle Host</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.host_name}</div>
                  </div>
                </div>
              </div>

              {/* User RSVP Panel */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--accent-blue)' }} />
                    <span>Your RSVP status:</span>
                  </span>

                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {['attending', 'maybe', 'not_attending'].map(opt => {
                      // Fetch actual status. Note: to keep things simple, we support checking if event has a status or fetching RSVP
                      // Let's compare option
                      const isSelected = event.user_rsvp === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleRsvpSubmit(event.id, opt)}
                          disabled={event.status === 'completed' || event.status === 'cancelled'}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: isSelected ? 'var(--text-primary)' : 'var(--bg-charcoal)',
                            color: isSelected ? 'var(--bg-obsidian)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            textTransform: 'capitalize',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          {opt.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {eventId ? 'Edit Event Schedule' : 'Schedule New Event'}
            </h3>

            {formError && (
              <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEvent}>
              <div className="form-group">
                <label className="form-label">Event Title *</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Monthly Reunion Gather"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control"
                  style={{ height: '60px', resize: 'none' }}
                  placeholder="e.g. Dinner, dress guidelines details..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Date *</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Time *</label>
                  <input 
                    type="time" 
                    className="form-control"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue Location *</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Grand Lounge, Sunset Terrace"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Theme / Dresscode</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Smart Casual, White Theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Budget (INR)</label>
                  <input 
                    type="number" 
                    className="form-control"
                    placeholder="e.g. 5000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Event Host *</label>
                  <select 
                    className="form-control"
                    value={hostId}
                    onChange={(e) => setHostId(e.target.value)}
                    required
                  >
                    {membersList.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                {eventId && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select 
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
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
                  {formLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Logging Modal Overlay */}
      {isAttendanceOpen && activeEvent && (
        <div className="modal-overlay" onClick={() => setIsAttendanceOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <ClipboardList size={20} />
              <span>Record Event Attendance</span>
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Event: <strong>{activeEvent.title}</strong> ({new Date(activeEvent.date).toLocaleDateString()})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
              {attendanceRecords.map(record => (
                <div 
                  key={record.user_id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{record.full_name}</span>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {['present', 'late', 'absent'].map(state => {
                      const isSelected = record.status === state;
                      return (
                        <button
                          key={state}
                          type="button"
                          onClick={() => handleAttendanceStatusChange(record.user_id, state)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'var(--text-primary)' : 'var(--bg-charcoal)',
                            color: isSelected ? 'var(--bg-obsidian)' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            textTransform: 'capitalize',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          {state}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={() => setIsAttendanceOpen(false)} 
                className="btn btn-secondary"
                disabled={attendanceLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveAttendance} 
                className="btn btn-primary"
                disabled={attendanceLoading}
              >
                {attendanceLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Save & Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
