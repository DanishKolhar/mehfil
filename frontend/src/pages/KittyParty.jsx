import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Gift, Play, RotateCcw, AlertTriangle, HelpCircle, History, Sparkles, User, Info, Search } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function KittyParty() {
  const { groupId } = useParams();
  const { api, activeGroupDetails } = useApp();
  const { theme } = useTheme();

  const [kittyStatus, setKittyStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Settings / Rules
  const [excludeUnpaid, setExcludeUnpaid] = useState(true);
  const [excludeAbsent, setExcludeAbsent] = useState(false);
  const [manualExcluded, setManualExcluded] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [drawType, setDrawType] = useState('spin_wheel'); // 'spin_wheel' | 'chit_draw' | 'manual'
  const [manualWinnerId, setManualWinnerId] = useState('');
  const [hostId, setHostId] = useState('');

  // Animation / Draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPool, setDrawingPool] = useState([]);
  const [drawnWinner, setDrawnWinner] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [activeChitIdx, setActiveChitIdx] = useState(null);

  // Winners history state
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  
  const canvasRef = useRef(null);

  const fetchKittyStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kitty/${groupId}/status`);
      setKittyStatus(res.data);
      
      // Default host: pick first member who hasn't hosted, or current user
      if (res.data.members.length > 0) {
        setHostId(res.data.members[0].user_id.toString());
      }
    } catch (err) {
      console.error('Failed to load kitty status:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWinnersHistory = async () => {
    try {
      const res = await api.get(`/kitty/${groupId}/winners`, {
        params: {
          page: historyPage,
          limit: 5,
          search: historySearch
        }
      });
      setHistoryList(res.data.winners);
      setHistoryPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load winners history:', err);
    }
  };

  useEffect(() => {
    fetchKittyStatus();
  }, [groupId]);

  useEffect(() => {
    fetchWinnersHistory();
  }, [groupId, historyPage, historySearch]);

  // Re-calculate the active eligible pool when rules or members change
  useEffect(() => {
    if (!kittyStatus) return;
    let pool = [...kittyStatus.members];

    // 1. Exclude previous winners (unless all have won)
    const hasWonList = pool.filter(m => m.has_won_previously);
    if (hasWonList.length < pool.length) {
      pool = pool.filter(m => !m.has_won_previously);
    }

    // 2. Exclude unpaid
    if (excludeUnpaid) {
      pool = pool.filter(m => m.latest_payment_status === 'paid');
    }

    // 3. Exclude absent
    if (excludeAbsent) {
      pool = pool.filter(m => m.latest_attendance_status === 'present');
    }

    // 4. Exclude manual unchecked members
    if (manualExcluded.length > 0) {
      pool = pool.filter(m => !manualExcluded.includes(m.user_id));
    }

    setDrawingPool(pool);
  }, [kittyStatus, excludeUnpaid, excludeAbsent, manualExcluded]);

  // Draw the spin wheel canvas
  useEffect(() => {
    if (drawType !== 'spin_wheel' || drawingPool.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    
    ctx.clearRect(0, 0, size, size);

    const arcSize = (2 * Math.PI) / drawingPool.length;
    const isLightTheme = theme === 'light';

    drawingPool.forEach((candidate, idx) => {
      const startAngle = idx * arcSize;
      const endAngle = startAngle + arcSize;

      // Draw wedge background
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      
      // Alternate gray shades
      ctx.fillStyle = isLightTheme 
        ? (idx % 2 === 0 ? '#F3F4F6' : '#E5E7EB') 
        : (idx % 2 === 0 ? '#1A1A1C' : '#27272A');
      ctx.fill();
      ctx.strokeStyle = isLightTheme ? '#D1D5DB' : '#3F3F46';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw Text label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + arcSize / 2);
      
      ctx.textAlign = 'right';
      ctx.fillStyle = isLightTheme ? '#111827' : '#E5E7EB';
      ctx.font = 'bold 11px sans-serif';
      
      // Truncate name
      let name = candidate.full_name;
      if (name.length > 12) name = name.substring(0, 10) + '...';
      ctx.fillText(name, radius - 20, 5);
      
      ctx.restore();
    });

    // Draw central node/pin
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = isLightTheme ? '#F3F4F6' : '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = isLightTheme ? '#D1D5DB' : '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [drawingPool, drawType, theme]);

  const handleManualExclusionToggle = (userId) => {
    setManualExcluded(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const executeKittyDraw = async () => {
    if (isDrawing) return;

    if (drawType === 'manual' && !manualWinnerId) {
      alert('Please select a winner first.');
      return;
    }

    if (drawType !== 'manual' && drawingPool.length === 0) {
      alert('No eligible candidates to draw from. Check your exclusion filters.');
      return;
    }

    try {
      setIsDrawing(true);
      setDrawnWinner(null);

      // Call API to perform secure draw
      const res = await api.post(`/kitty/${groupId}/draw`, {
        drawType,
        excludeUnpaid,
        excludeAbsent,
        manualExcluded,
        overrideWinnerId: drawType === 'manual' ? manualWinnerId : null,
        hostId: parseInt(hostId),
        remarks
      });

      const winnerInfo = res.data.winner;
      const prizeAmount = res.data.prizeAmount;

      if (drawType === 'spin_wheel') {
        // Find winner index in local pool to line up spin angle
        const wIdx = drawingPool.findIndex(m => m.user_id === winnerInfo.id);
        const arcDegrees = 360 / drawingPool.length;
        // Target rotation: multiple full spins + align wedge at pointer (pointing top / 270 deg)
        const targetRotation = 3600 - (wIdx * arcDegrees) - (arcDegrees / 2) - 90;
        
        setWheelRotation(targetRotation);

        setTimeout(() => {
          triggerSuccessConfetti();
          setDrawnWinner({ ...winnerInfo, prizeAmount });
          setIsDrawing(false);
          fetchKittyStatus();
          fetchWinnersHistory();
        }, 4000);

      } else if (drawType === 'chit_draw') {
        // Shuffle chits animations
        let count = 0;
        const interval = setInterval(() => {
          setActiveChitIdx(Math.floor(Math.random() * drawingPool.length));
          count++;
          if (count > 15) {
            clearInterval(interval);
            // Highlight actual winner
            const wIdx = drawingPool.findIndex(m => m.user_id === winnerInfo.id);
            setActiveChitIdx(wIdx >= 0 ? wIdx : 0);
            
            triggerSuccessConfetti();
            setDrawnWinner({ ...winnerInfo, prizeAmount });
            setIsDrawing(false);
            fetchKittyStatus();
            fetchWinnersHistory();
          }
        }, 200);

      } else {
        // Manual Draw (No animation wait)
        triggerSuccessConfetti();
        setDrawnWinner({ ...winnerInfo, prizeAmount });
        setIsDrawing(false);
        fetchKittyStatus();
        fetchWinnersHistory();
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error occurred while drawing kitty.');
      setIsDrawing(false);
    }
  };

  const triggerSuccessConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  if (loading || !kittyStatus) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const activeMembers = kittyStatus.members || [];
  const cycleNumber = kittyStatus.currentCycleNumber + 1;
  const isAdmin = activeGroupDetails?.myRole === 'admin';

  return (
    <div className="workspace-view">
      
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Gift style={{ color: 'var(--accent-purple)' }} />
          <span>Kitty Party Management</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Track cycle lists, check participant status, configure exclusions, and select monthly host/pool winners.
        </p>
      </div>

      {/* Kitty party status summary banner */}
      <div className="panel" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        marginBottom: '2rem',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Cycle</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--accent-purple)' }}>Cycle #{cycleNumber}</div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous Host</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.25rem' }}>
            {kittyStatus.activeCycle?.host_name || 'No history'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous Winner</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.25rem', color: 'var(--success)' }}>
            {kittyStatus.activeCycle?.winner_name || 'No history'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Winners</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
            {activeMembers.filter(m => !m.has_won_previously).length} / {activeMembers.length}
          </div>
        </div>
      </div>

      {/* Main split grid */}
      <div className="dashboard-grid">
        
        {/* Left pane: draw setup (Rules & Candidates checklist) */}
        <div className="grid-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Rules / Exclusions Card */}
          <div className="panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} />
              <span>Smart Winner Rules</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={excludeUnpaid}
                  onChange={(e) => setExcludeUnpaid(e.target.checked)}
                  style={{ marginTop: '0.2rem' }}
                  disabled={!isAdmin || isDrawing}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Exclude Unpaid Members</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Removes members who haven't paid their current contribution dues.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={excludeAbsent}
                  onChange={(e) => setExcludeAbsent(e.target.checked)}
                  style={{ marginTop: '0.2rem' }}
                  disabled={!isAdmin || isDrawing}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Exclude Absent Members</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Removes members who were marked absent in the last completed event.
                  </div>
                </div>
              </label>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={14} style={{ color: 'var(--accent-purple)' }} />
                  <span>Unique winner logic active: Members who won in past months are automatically excluded from the pool.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Members Pool checklist */}
          <div className="panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Draw Candidates</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Uncheck members to manually exclude them from this cycle draw.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {activeMembers.map(member => {
                const hasWon = member.has_won_previously;
                const isUnpaid = member.latest_payment_status !== 'paid';
                const isAbsent = member.latest_attendance_status === 'absent';
                
                // Determine if automatically excluded by rules
                const isAutoExcluded = hasWon || (excludeUnpaid && isUnpaid) || (excludeAbsent && isAbsent);
                const isManuallyExcluded = manualExcluded.includes(member.user_id);
                
                const isEligible = !isAutoExcluded && !isManuallyExcluded;

                return (
                  <div 
                    key={member.user_id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: isEligible ? 1 : 0.45,
                      fontSize: '0.8125rem'
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                      <input 
                        type="checkbox"
                        checked={isEligible}
                        disabled={isAutoExcluded || !isAdmin || isDrawing}
                        onChange={() => handleManualExclusionToggle(member.user_id)}
                      />
                      <span style={{ fontWeight: isEligible ? 600 : 400 }}>{member.full_name}</span>
                    </label>

                    {/* Exclusions Reason tags */}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {hasWon && <span style={{ fontSize: '0.625rem', color: 'var(--accent-purple)', backgroundColor: 'var(--accent-purple-glow)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Won</span>}
                      {isUnpaid && <span style={{ fontSize: '0.625rem', color: 'var(--warning)', backgroundColor: 'rgba(245,158,11,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Unpaid</span>}
                      {isAbsent && <span style={{ fontSize: '0.625rem', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Absent</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Center/Right pane: Animated Spin Wheel or Chit Draw */}
        <div className="grid-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Draw Component */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '500px', justifyContent: 'space-between' }}>
            
            {/* Draw Mode Switcher */}
            <div style={{
              display: 'flex',
              backgroundColor: 'var(--bg-charcoal)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.25rem',
              width: '100%',
              maxWidth: '380px',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              {['spin_wheel', 'chit_draw', 'manual'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setDrawType(mode)}
                  disabled={isDrawing || !isAdmin}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    backgroundColor: drawType === mode ? 'var(--text-primary)' : 'transparent',
                    color: drawType === mode ? 'var(--bg-obsidian)' : 'var(--text-secondary)'
                  }}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Selected Drawing Area */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
              
              {/* SPIN WHEEL */}
              {drawType === 'spin_wheel' && (
                <div style={{ position: 'relative', width: '300px', height: '300px' }}>
                  
                  {/* Indicator arrow pointing top */}
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '18px solid var(--accent-white)',
                    zIndex: 10
                  }} />

                  <canvas 
                    ref={canvasRef} 
                    width={300} 
                    height={300} 
                    style={{
                      borderRadius: '50%',
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isDrawing ? 'transform 4s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
                      boxShadow: '0 15px 45px rgba(0,0,0,0.6)'
                    }}
                  />
                </div>
              )}

              {/* CHIT DRAW */}
              {drawType === 'chit_draw' && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  maxWidth: '380px',
                  justifyContent: 'center',
                  alignContent: 'center'
                }}>
                  {drawingPool.map((candidate, idx) => {
                    const isActive = activeChitIdx === idx;
                    return (
                      <div 
                        key={candidate.user_id}
                        className={isDrawing ? 'animate-float-chit' : ''}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1.5px solid ${isActive ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                          backgroundColor: isActive ? 'var(--accent-purple-glow)' : 'var(--bg-charcoal)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6875rem',
                          textAlign: 'center',
                          padding: '0.25rem',
                          transition: 'var(--transition-smooth)',
                          animationDelay: `${idx * 0.1}s`
                        }}
                      >
                        <Gift size={16} style={{ color: isActive ? 'var(--accent-purple)' : 'var(--text-muted)', marginBottom: '0.25rem' }} />
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Chit</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MANUAL SELECTION */}
              {drawType === 'manual' && (
                <div style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Select Winner Member</label>
                    <select
                      className="form-control"
                      value={manualWinnerId}
                      onChange={(e) => setManualWinnerId(e.target.value)}
                      disabled={isDrawing}
                    >
                      <option value="">-- Choose Candidate --</option>
                      {drawingPool.map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Reveal Overlay Winner banner */}
              {drawnWinner && (
                <div style={{
                  position: 'absolute',
                  backgroundColor: 'rgba(22, 22, 24, 0.95)',
                  border: '1.5px solid var(--accent-purple)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                  zIndex: 20,
                  width: '90%',
                  maxWidth: '340px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-purple-glow)',
                    color: 'var(--accent-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '1rem'
                  }}>
                    {drawnWinner.full_name?.charAt(0)}
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    WINNER REVEALED
                  </div>
                  <h3 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0.25rem 0' }}>
                    {drawnWinner.full_name}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Drawn for Cycle #{cycleNumber}
                  </div>

                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)', borderTop: '1px solid var(--border-subtle)', width: '100%', paddingTop: '0.75rem' }}>
                    Prize: INR {parseFloat(drawnWinner.prizeAmount).toLocaleString()}
                  </div>

                  <button 
                    onClick={() => setDrawnWinner(null)}
                    className="btn btn-secondary"
                    style={{ marginTop: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Host rotation & Remarks Panel details */}
            <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '240px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Cycle Host *</label>
                  <select
                    className="form-control"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                    value={hostId}
                    onChange={(e) => setHostId(e.target.value)}
                    disabled={isDrawing || !isAdmin}
                  >
                    {activeMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1.5 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                    placeholder="e.g. June Kitty gathering"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isDrawing || !isAdmin}
                  />
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={executeKittyDraw}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', gap: '0.5rem', fontWeight: 600, padding: '0.5rem 1.5rem', alignSelf: 'flex-end', marginTop: '0.5rem' }}
                  disabled={isDrawing}
                >
                  <Play size={14} />
                  <span>{isDrawing ? 'Drawing...' : 'Draw Winner'}</span>
                </button>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Winner logs list history */}
      <div className="panel" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} />
            <span>Winner & Host Rotation Logs</span>
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ padding: '0.35rem 0.75rem 0.35rem 1.75rem', fontSize: '0.8125rem', width: '180px' }}
                placeholder="Search winners..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
              />
            </div>
          </div>
        </div>

        {historyList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No history recorded. Runs a draw cycle to log records.
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Winner Member</th>
                    <th>Host Member</th>
                    <th>Prize Pool</th>
                    <th>Draw Date</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(row => (
                    <tr key={row.id}>
                      <td><span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>Cycle #{row.cycle_number}</span></td>
                      <td>{row.winner_name}</td>
                      <td>{row.host_name}</td>
                      <td><span style={{ fontWeight: 600, color: 'var(--success)' }}>INR {parseFloat(row.amount_won).toLocaleString()}</span></td>
                      <td>{new Date(row.won_date).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{row.remarks || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {historyPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
                  Page {historyPage} of {historyPages}
                </span>
                <button
                  disabled={historyPage === historyPages}
                  onClick={() => setHistoryPage(prev => Math.min(historyPages, prev + 1))}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
