import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Calendar, Plus, MapPin, Sparkles, DollarSign, User, ShieldCheck, ClipboardList, CheckCircle, Utensils, Coffee, Home, Gamepad2, Music, Film, Compass, Ticket, Sun, BookOpen, Users, Link, Trash2, ArrowLeft, ArrowUpRight } from 'lucide-react';

const EVENT_TYPES = [
  { name: 'Kitty Party', icon: Sparkles, desc: 'Reunion circle and budget pool' },
  { name: 'Movie Night', icon: Film, desc: 'Movie booking details' },
  { name: 'Dinner', icon: Utensils, desc: 'Dinner gathering' },
  { name: 'Lunch', icon: Utensils, desc: 'Lunch gathering' },
  { name: 'Brunch', icon: Coffee, desc: 'Weekend brunch' },
  { name: 'House Party', icon: Home, desc: 'Indoor home gather' },
  { name: 'Game Night', icon: Gamepad2, desc: 'Boardgames/Console night' },
  { name: 'Concert', icon: Music, desc: 'Shows and concerts details' },
  { name: 'Festival', icon: Ticket, desc: 'Festival celebrations' },
  { name: 'Picnic', icon: Sun, desc: 'Outdoor park picnic' },
  { name: 'Trip', icon: Compass, desc: 'Accommodations and travel' },
  { name: 'Workshop', icon: BookOpen, desc: 'Learning sessions' },
  { name: 'Community Gathering', icon: Users, desc: 'Neighborhood gathering' },
  { name: 'Custom Event', icon: Calendar, desc: 'Standard scheduling form' }
];

const getEventIcon = (typeName) => {
  const matched = EVENT_TYPES.find(t => t.name === typeName);
  return matched ? matched.icon : Calendar;
};

export default function Events() {
  const { groupId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Smart scheduling additions
  const [eventType, setEventType] = useState('Custom Event');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [step, setStep] = useState('select_type'); // 'select_type' | 'fill_details'

  // Additional form fields for event templates
  const [meetingPoint, setMeetingPoint] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [budgetPerPerson, setBudgetPerPerson] = useState('');
  const [reservationNumber, setReservationNumber] = useState('');
  const [artistName, setArtistName] = useState('');
  const [transportation, setTransportation] = useState('');
  const [foodArrangement, setFoodArrangement] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [accommodation, setAccommodation] = useState('');

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

  useEffect(() => {
    // Check if we are converting a poll to an event
    const pollId = searchParams.get('convertPollId');
    const winningOption = searchParams.get('winningOption');
    const pollType = searchParams.get('pollType');
    const pollTitle = searchParams.get('pollTitle');

    if (pollId && winningOption) {
      // Clear parameters from URL so reloading doesn't prompt again
      setSearchParams({}, { replace: true });
      
      // Auto open modal
      setEventId(null);
      setDate('');
      setTime('');
      setTheme('');
      setHostId(activeGroupDetails?.members[0]?.user_id || '');
      setStatus('scheduled');
      setFormError('');
      setBookingLink('');
      setMeetingPoint('');
      setAddress('');
      setCuisine('');
      setBudgetPerPerson('');
      setReservationNumber('');
      setArtistName('');
      setTransportation('');
      setFoodArrangement('');
      setReturnDate('');
      setAccommodation('');

      // Prefill fields based on poll details
      if (pollType === 'movie') {
        setEventType('Movie Night');
        setTitle(winningOption);
        setVenue('');
        setBudget('');
        setStep('fill_details');
      } else if (pollType === 'venue' || pollType === 'restaurant') {
        setEventType('Dinner');
        setTitle(pollTitle || 'Dinner Gathering');
        setVenue(winningOption);
        setBudget('');
        setStep('fill_details');
      } else if (pollType === 'date') {
        setEventType('Custom Event');
        setTitle(pollTitle || 'Gathering');
        setVenue('');
        setBudget('');
        if (/^\d{4}-\d{2}-\d{2}$/.test(winningOption)) {
          setDate(winningOption);
        } else {
          setDesc(`Winning Date Option: ${winningOption}`);
        }
        setStep('fill_details');
      } else if (pollType === 'budget') {
        setEventType('Custom Event');
        setTitle(pollTitle || 'Gathering');
        setVenue('');
        const parsedBudget = parseFloat(winningOption);
        if (!isNaN(parsedBudget)) {
          setBudget(parsedBudget);
        } else {
          setDesc(`Winning Budget Option: ${winningOption}`);
        }
        setStep('fill_details');
      } else {
        setEventType('Custom Event');
        setTitle(pollTitle || 'Gathering');
        setVenue('');
        setBudget('');
        setDesc(`Winning Poll Option: ${winningOption}`);
        setStep('fill_details');
      }

      setIsModalOpen(true);
    }
  }, [groupId, searchParams, activeGroupDetails]);

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
    
    // Additions
    setEventType('Custom Event');
    setRsvpDeadline('');
    setBookingLink('');
    setStep('select_type');
    setMeetingPoint('');
    setAddress('');
    setCuisine('');
    setBudgetPerPerson('');
    setReservationNumber('');
    setArtistName('');
    setTransportation('');
    setFoodArrangement('');
    setReturnDate('');
    setAccommodation('');

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

    // Additions
    setEventType(event.event_type || 'Custom Event');
    setRsvpDeadline(event.rsvp_deadline ? event.rsvp_deadline.slice(0, 16) : '');
    setBookingLink(event.booking_link || '');
    setStep('fill_details');

    let addFields = {};
    if (event.additional_fields) {
      try {
        addFields = typeof event.additional_fields === 'string'
          ? JSON.parse(event.additional_fields)
          : event.additional_fields;
      } catch (e) {
        console.error('Failed to parse additional fields', e);
      }
    }
    setMeetingPoint(addFields.meetingPoint || '');
    setAddress(addFields.address || '');
    setCuisine(addFields.cuisine || '');
    setBudgetPerPerson(addFields.budgetPerPerson || '');
    setReservationNumber(addFields.reservationNumber || '');
    setArtistName(addFields.artistName || '');
    setTransportation(addFields.transportation || '');
    setFoodArrangement(addFields.foodArrangement || '');
    setReturnDate(addFields.returnDate || '');
    setAccommodation(addFields.accommodation || '');

    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title || !date || !time || !venue || !hostId) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const additionalFieldsObj = {};
    if (eventType === 'Movie Night') {
      additionalFieldsObj.meetingPoint = meetingPoint;
    } else if (['Dinner', 'Lunch', 'Brunch'].includes(eventType)) {
      additionalFieldsObj.address = address;
      additionalFieldsObj.cuisine = cuisine;
      additionalFieldsObj.budgetPerPerson = budgetPerPerson;
      additionalFieldsObj.reservationNumber = reservationNumber;
    } else if (eventType === 'Concert') {
      additionalFieldsObj.artistName = artistName;
    } else if (eventType === 'Picnic') {
      additionalFieldsObj.transportation = transportation;
      additionalFieldsObj.foodArrangement = foodArrangement;
    } else if (eventType === 'Trip') {
      additionalFieldsObj.returnDate = returnDate;
      additionalFieldsObj.transportation = transportation;
      additionalFieldsObj.accommodation = accommodation;
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
      status,
      eventType,
      rsvpDeadline: rsvpDeadline || null,
      bookingLink: bookingLink || null,
      additionalFields: additionalFieldsObj
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
          {events.map(event => {
            const Icon = getEventIcon(event.event_type);
            const isDeadlinePassed = event.rsvp_deadline ? new Date(event.rsvp_deadline) < new Date() : false;

            return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', backgroundColor: 'var(--accent-purple-glow)', border: '1px solid rgba(124,58,237,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                        <Icon size={12} />
                        <span>{event.event_type || 'Custom Event'}</span>
                      </span>
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
                    {event.booking_link && (
                      <a 
                        href={event.booking_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                      >
                        <ArrowUpRight size={14} />
                        <span>Open Booking Link</span>
                      </a>
                    )}
                    
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
                      <div style={{ color: 'var(--text-muted)' }}>
                        {event.event_type === 'Movie Night' ? 'Theatre Name' :
                         ['Dinner', 'Lunch', 'Brunch'].includes(event.event_type) ? 'Restaurant Name' :
                         event.event_type === 'Picnic' ? 'Location' :
                         event.event_type === 'Trip' ? 'Destination' : 'Venue'}
                      </div>
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
                      <div style={{ color: 'var(--text-muted)' }}>
                        {event.event_type === 'Kitty Party' ? 'Budget Pool' :
                         event.event_type === 'Movie Night' ? 'Ticket Price' :
                         event.event_type === 'Concert' ? 'Ticket Cost' :
                         event.event_type === 'Picnic' ? 'Budget' :
                         event.event_type === 'Trip' ? 'Estimated Budget' : 'Budget'}
                      </div>
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

                {/* Type-Specific Custom Attributes */}
                {(() => {
                  let addFields = {};
                  if (event.additional_fields) {
                    try {
                      addFields = typeof event.additional_fields === 'string'
                        ? JSON.parse(event.additional_fields)
                        : event.additional_fields;
                    } catch (e) {}
                  }
                  const fieldKeys = Object.keys(addFields).filter(k => addFields[k]);
                  if (fieldKeys.length === 0) return null;
                  
                  return (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-charcoal)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8125rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      {fieldKeys.map(k => {
                        const labelMap = {
                          meetingPoint: 'Meeting Point',
                          address: 'Address',
                          cuisine: 'Cuisine',
                          budgetPerPerson: 'Budget Per Person',
                          reservationNumber: 'Reservation Info',
                          artistName: 'Artist / Headliner',
                          transportation: 'Transportation Details',
                          foodArrangement: 'Food Arrangement',
                          returnDate: 'Return Date',
                          accommodation: 'Accommodation Details'
                        };
                        return (
                          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{labelMap[k] || k}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{addFields[k]}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* RSVP Statistics & Organizer Range Insights */}
                <div style={{ margin: '1rem 0', padding: '0.875rem', backgroundColor: 'var(--bg-charcoal)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {event.responded_count || 0} of {event.total_rsvps || 0} Members Responded
                    </span>
                    {isAdmin && (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                        Expected Attendance: {event.attending_count || 0} - {(event.attending_count || 0) + (event.maybe_count || 0)} Members
                      </span>
                    )}
                  </div>
                  
                  {/* RSVP Progress Bar */}
                  <div style={{ height: '4px', backgroundColor: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div style={{
                      height: '100%',
                      width: `${event.total_rsvps > 0 ? ((event.responded_count || 0) / event.total_rsvps) * 100 : 0}%`,
                      backgroundColor: 'var(--accent-blue)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>✅ Attending: <strong>{event.attending_count || 0}</strong></span>
                    <span>❓ Maybe: <strong>{event.maybe_count || 0}</strong></span>
                    <span>❌ Not Attending: <strong>{event.not_attending_count || 0}</strong></span>
                    <span>⏳ No Response: <strong>{event.no_response_count || 0}</strong></span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={16} style={{ color: 'var(--accent-blue)' }} />
                      <span>{isDeadlinePassed ? 'RSVP Closed (Deadline Passed):' : 'Your RSVP status:'}</span>
                    </span>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {['attending', 'maybe', 'not_attending'].map(opt => {
                        const isSelected = event.user_rsvp === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleRsvpSubmit(event.id, opt)}
                            disabled={event.status === 'completed' || event.status === 'cancelled' || isDeadlinePassed}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              cursor: (event.status === 'completed' || event.status === 'cancelled' || isDeadlinePassed) ? 'not-allowed' : 'pointer',
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

                  {event.rsvp_deadline && (
                    <span style={{ fontSize: '0.75rem', color: isDeadlinePassed ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      Deadline: {new Date(event.rsvp_deadline).toLocaleString()}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '550px', 
              maxHeight: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              padding: '1.5rem 2rem'
            }}
          >
            
            {step === 'select_type' ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Select Event Type
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                  Select a template containing custom layouts and configurations for your gathering.
                </p>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  flex: 1,
                  overflowY: 'auto',
                  paddingRight: '0.5rem',
                  marginBottom: '1.25rem'
                }}>
                  {EVENT_TYPES.map(type => {
                    const IconComponent = type.icon;
                    return (
                      <div
                        key={type.name}
                        onClick={() => {
                          setEventType(type.name);
                          if (type.name !== 'Custom Event') {
                            setTitle(type.name);
                          }
                          setStep('fill_details');
                        }}
                        style={{
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-charcoal)',
                          padding: '0.875rem',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          transition: 'var(--transition-smooth)'
                        }}
                        className="panel-interactive"
                      >
                        <IconComponent size={18} style={{ color: 'var(--accent-blue)' }} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{type.name}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{type.desc}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                  <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {!eventId && (
                  <button
                    type="button"
                    onClick={() => setStep('select_type')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      marginBottom: '1rem',
                      padding: 0
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to templates</span>
                  </button>
                )}

                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                  {eventId ? 'Edit Event Schedule' : `Schedule ${eventType}`}
                </h3>

                {formError && (
                  <div style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  
                  {/* Scrollable Form Body */}
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Event Type</label>
                      <select
                        className="form-control"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                      >
                        {EVENT_TYPES.map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {eventType === 'Movie Night' ? 'Movie Name *' :
                         eventType === 'Concert' ? 'Event Name *' : 'Event Title *'}
                      </label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder={eventType === 'Movie Night' ? 'e.g. Jurassic World' : 'e.g. Monthly Reunion Gather'}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description / Notes</label>
                      <textarea 
                        className="form-control"
                        style={{ height: '50px', resize: 'none' }}
                        placeholder="e.g. Dinner rules, guidelines details..."
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">
                          {eventType === 'Trip' ? 'Departure Date *' :
                           eventType === 'Concert' ? 'Event Date *' : 'Date *'}
                        </label>
                        <input 
                          type="date" 
                          className="form-control"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">
                          {eventType === 'Movie Night' ? 'Showtime *' :
                           eventType === 'Picnic' ? 'Meeting Time *' : 'Time *'}
                        </label>
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
                      <label className="form-label">
                        {eventType === 'Movie Night' ? 'Theatre Name *' :
                         ['Dinner', 'Lunch', 'Brunch'].includes(eventType) ? 'Restaurant Name *' :
                         eventType === 'Picnic' ? 'Location *' :
                         eventType === 'Trip' ? 'Destination *' : 'Venue Location *'}
                      </label>
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
                        <label className="form-label">
                          {eventType === 'Kitty Party' ? 'Budget Pool (INR)' :
                           eventType === 'Movie Night' ? 'Ticket Price' :
                           eventType === 'Concert' ? 'Ticket Cost' :
                           eventType === 'Picnic' ? 'Budget' :
                           eventType === 'Trip' ? 'Estimated Budget' : 'Budget (INR)'}
                        </label>
                        <input 
                          type="number" 
                          className="form-control"
                          placeholder="e.g. 5000"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Dynamic Fields Section */}
                    {eventType === 'Movie Night' && (
                      <div className="form-group">
                        <label className="form-label">Meeting Point</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Near ticket counter at 8:45 PM"
                          value={meetingPoint}
                          onChange={(e) => setMeetingPoint(e.target.value)}
                        />
                      </div>
                    )}

                    {['Dinner', 'Lunch', 'Brunch'].includes(eventType) && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. 5th Main, Sector 7"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Cuisine Type</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Italian, North Indian"
                              value={cuisine}
                              onChange={(e) => setCuisine(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Budget Per Person</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. INR 800"
                              value={budgetPerPerson}
                              onChange={(e) => setBudgetPerPerson(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Reservation Number / Details</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Table for 8, Booking Ref #12345"
                            value={reservationNumber}
                            onChange={(e) => setReservationNumber(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {eventType === 'Concert' && (
                      <div className="form-group">
                        <label className="form-label">Artist Name / Headliner</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Diljit Dosanjh, Coldplay"
                          value={artistName}
                          onChange={(e) => setArtistName(e.target.value)}
                        />
                      </div>
                    )}

                    {eventType === 'Picnic' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Transportation Details</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Carpool from central park"
                            value={transportation}
                            onChange={(e) => setTransportation(e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Food Arrangement</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Bring your own drinks, snacks shared"
                            value={foodArrangement}
                            onChange={(e) => setFoodArrangement(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {eventType === 'Trip' && (
                      <>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Return Date</label>
                            <input
                              type="date"
                              className="form-control"
                              value={returnDate}
                              onChange={(e) => setReturnDate(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Transportation Mode</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Flight / Private Mini-bus"
                              value={transportation}
                              onChange={(e) => setTransportation(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Accommodation Details</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. 3 Nights stay at Hyatt Resort"
                            value={accommodation}
                            onChange={(e) => setAccommodation(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Booking Link (Movies, Concerts, Festivals, Workshops) */}
                    {['Movie Night', 'Concert', 'Festival', 'Workshop'].includes(eventType) && (
                      <div className="form-group">
                        <label className="form-label">Booking Link / URL</label>
                        <input
                          type="url"
                          className="form-control"
                          placeholder="e.g. BookMyShow, District link, or official URL"
                          value={bookingLink}
                          onChange={(e) => setBookingLink(e.target.value)}
                        />
                      </div>
                    )}

                    {/* RSVP Deadline Input */}
                    <div className="form-group">
                      <label className="form-label">RSVP Deadline *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={rsvpDeadline}
                        onChange={(e) => setRsvpDeadline(e.target.value)}
                        required
                      />
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
                  </div>

                  {/* Fixed Footer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
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
            )}

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
