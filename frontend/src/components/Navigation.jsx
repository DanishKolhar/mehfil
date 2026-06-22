import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, Calendar, Vote, DollarSign, Gift, 
  Image as ImageIcon, BarChart3, Settings, LogOut, 
  Menu, X, Search, User, ChevronDown, PlusCircle
} from 'lucide-react';

export default function Navigation() {
  const { 
    user, logout, groups, activeGroup, selectActiveGroup, activeGroupDetails
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');

  // Command palette keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGroupSelect = (group) => {
    selectActiveGroup(group);
    setIsGroupDropdownOpen(false);
    navigate(`/group/${group.id}`);
  };

  const navItems = [
    { name: 'Dashboard', path: '', icon: LayoutDashboard },
    { name: 'Events & RSVP', path: '/events', icon: Calendar },
    { name: 'Polls & Votes', path: '/polls', icon: Vote },
    { name: 'Finances', path: '/finances', icon: DollarSign },
    ...(activeGroup?.type === 'kitty' ? [{ name: 'Kitty Draw', path: '/kitty', icon: Gift }] : []),
    { name: 'Photo Gallery', path: '/gallery', icon: ImageIcon },
    { name: 'Analytics & Reports', path: '/reports', icon: BarChart3 }
  ];

  const commandItems = [
    { label: 'Go to Dashboard', action: () => { navigate(`/group/${activeGroup?.id}`); setIsCmdOpen(false); } },
    { label: 'View Events & RSVP', action: () => { navigate(`/group/${activeGroup?.id}/events`); setIsCmdOpen(false); } },
    { label: 'Create Event', action: () => { navigate(`/group/${activeGroup?.id}/events`); setIsCmdOpen(false); } },
    { label: 'Vote on Polls', action: () => { navigate(`/group/${activeGroup?.id}/polls`); setIsCmdOpen(false); } },
    { label: 'Manage Finances', action: () => { navigate(`/group/${activeGroup?.id}/finances`); setIsCmdOpen(false); } },
    ...(activeGroup?.type === 'kitty' ? [
      { label: 'Kitty Draw (Spin Wheel/Chits)', action: () => { navigate(`/group/${activeGroup?.id}/kitty`); setIsCmdOpen(false); } },
      { label: 'View Kitty Winners History', action: () => { navigate(`/group/${activeGroup?.id}/kitty`); setIsCmdOpen(false); } }
    ] : []),
    { label: 'Explore Photo Gallery', action: () => { navigate(`/group/${activeGroup?.id}/gallery`); setIsCmdOpen(false); } },
    { label: 'Export PDF Reports', action: () => { navigate(`/group/${activeGroup?.id}/reports`); setIsCmdOpen(false); } },
    { label: 'Edit Profile Settings', action: () => { navigate('/profile'); setIsCmdOpen(false); } },
    { label: 'Logout Session', action: () => { logout(); setIsCmdOpen(false); } }
  ];

  const filteredCommands = commandItems.filter(item => 
    item.label.toLowerCase().includes(cmdSearch.toLowerCase())
  );

  return (
    <>
      {/* Top Header Bar */}
      <header style={{
        height: '60px',
        backgroundColor: 'var(--bg-charcoal)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}>
        {/* Left Side: Mobile Menu toggle + Group Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn btn-ghost" 
            style={{ padding: '0.25rem', display: 'none' }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            id="mobile-nav-toggle"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <style>{`
            @media (max-width: 768px) {
              #mobile-nav-toggle { display: inline-flex !important; }
            }
            .sidebar-container-wrapper {
              position: absolute;
              top: 60px;
              bottom: 0;
              left: 0;
              width: 260px;
              display: flex;
              z-index: 80;
            }
            .group-content-wrapper {
              padding-left: 260px;
            }
            @media (max-width: 768px) {
              .sidebar-container-wrapper {
                width: 0;
              }
              .group-content-wrapper {
                padding-left: 0;
              }
            }
          `}</style>

          {/* Group Workspace Selector */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-subtle)' }}
            >
              <span style={{ fontWeight: 600 }}>
                {activeGroup ? activeGroup.name : 'Select Circle'}
              </span>
              <ChevronDown size={14} />
            </button>

            {isGroupDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: 0,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                width: '240px',
                padding: '0.5rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 100
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Workspaces
                </div>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleGroupSelect(g)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: activeGroup?.id === g.id ? 'var(--accent-white)' : 'var(--text-secondary)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: activeGroup?.id === g.id ? 'var(--border-subtle)' : 'transparent'
                    }}
                  >
                    <span>{g.name}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{g.type}</span>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <button
                    onClick={() => { setIsGroupDropdownOpen(false); navigate('/dashboard'); }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>Create new Group</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setIsCmdOpen(true)}
            style={{
              backgroundColor: 'var(--bg-obsidian)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
            className="search-cmd-trigger"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={14} />
              <span>Search actions...</span>
            </div>
            <kbd style={{
              backgroundColor: 'var(--bg-charcoal)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '3px',
              padding: '0.1rem 0.3rem',
              fontSize: '0.65rem'
            }}>
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Side: Profile drop panel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}
          >
            {user?.profilePictureUrl ? (
              <img 
                src={user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `http://localhost:5000${user.profilePictureUrl}`} 
                alt="Profile" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} 
              />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--border-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}>
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>

          {isProfileDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              width: '200px',
              padding: '0.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 100
            }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
              
              <button
                onClick={() => { setIsProfileDropdownOpen(false); navigate('/profile'); }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                className="btn-ghost"
              >
                <User size={16} />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => { setIsProfileDropdownOpen(false); navigate('/dashboard'); }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                className="btn-ghost"
              >
                <LayoutDashboard size={16} />
                <span>Workspace List</span>
              </button>

              <button
                onClick={() => { setIsProfileDropdownOpen(false); logout(); }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}
                className="btn-ghost"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace layout container (Sidebar + Content Pane) */}
      <div className="sidebar-container-wrapper">
        
        {/* Sidebar Nav Drawer */}
        <aside 
          className={`sidebar-nav ${isSidebarOpen ? 'open' : ''}`}
          style={{
            width: '260px',
            backgroundColor: 'var(--bg-charcoal)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.3s ease',
            zIndex: 80
          }}
        >
          <style>{`
            @media (max-width: 768px) {
              .sidebar-nav {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                transform: translateX(-100%);
              }
              .sidebar-nav.open {
                transform: translateX(0);
              }
            }
          `}</style>

          {/* Nav Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Workspace Navigation
            </div>
            
            {activeGroup ? (
              navItems.map(item => {
                const isActive = location.pathname.endsWith(item.path);
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsSidebarOpen(false);
                      navigate(`/group/${activeGroup.id}${item.path}`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '0.75rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      color: isActive ? 'var(--accent-white)' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <IconComponent size={18} style={{ color: isActive ? 'var(--accent-white)' : 'var(--text-muted)' }} />
                    <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Please select or create a circle.
              </div>
            )}
          </div>

          {/* Footer of Sidebar */}
          <div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.25rem 0.75rem' }}>
                Role Level
              </div>
              <div style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: activeGroupDetails?.myRole === 'admin' ? 'var(--success)' : 'var(--accent-blue)' }}></div>
                <span style={{ textTransform: 'capitalize' }}>
                  {activeGroupDetails?.myRole || 'Member'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile navigation */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 70
            }}
          />
        )}
      </div>

      {/* Command Palette Modal */}
      {isCmdOpen && (
        <div className="modal-overlay" onClick={() => setIsCmdOpen(false)}>
          <div 
            className="modal-content cmd-palette" 
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '1rem', maxWidth: '600px', backgroundColor: 'var(--bg-charcoal)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Type a command or action to execute..."
                value={cmdSearch}
                onChange={(e) => setCmdSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={cmd.action}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="btn-ghost"
                  >
                    <span>{cmd.label}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>Action</span>
                  </button>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No matching commands found.
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Use arrow keys to navigate, enter to select</span>
              <span>ESC to exit</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
