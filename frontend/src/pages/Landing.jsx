import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Landing() {
  const { token } = useApp();

  // If already logged in, redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      title: 'Contributions',
      description: 'Pool and collect funds transparently with secure contribution and payment tracking.',
      icon: '💳'
    },
    {
      title: 'Event Management',
      description: 'Schedule, manage venues, set budgets, organize themes, and host events seamlessly.',
      icon: '📅'
    },
    {
      title: 'Polls',
      description: 'Collaborate and run polls to vote on venues, dates, budgets, and food options.',
      icon: '🗳️'
    },
    {
      title: 'Attendance Tracking',
      description: 'Keep track of member RSVPs and easily record attendance for every gathering.',
      icon: '👥'
    },
    {
      title: 'Expense Splitting',
      description: 'Log shared expenses, split costs fairly among members, and track settlements.',
      icon: '💸'
    },
    {
      title: 'Kitty Management',
      description: 'Organize kitty parties with monthly host rotations, chit draws, and interactive spin wheels.',
      icon: '🎁'
    }
  ];

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-obsidian)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      fontFamily: 'var(--font-family)'
    }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-card {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .delay-0 { animation-delay: 0ms; }
        .delay-1 { animation-delay: 80ms; }
        .delay-2 { animation-delay: 160ms; }
        .delay-3 { animation-delay: 240ms; }
        .delay-4 { animation-delay: 320ms; }
        .delay-5 { animation-delay: 400ms; }

        .landing-feature-card {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          will-change: transform;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .landing-feature-card:hover {
          transform: translateY(-5px) !important;
          border-color: var(--border-hover) !important;
          box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.6), 
                      0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .landing-feature-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            300px circle at var(--x, 0px) var(--y, 0px),
            rgba(255, 255, 255, 0.05),
            transparent 80%
          );
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          z-index: 1;
        }

        .landing-feature-card:hover::before {
          opacity: 1;
        }

        .landing-feature-card .card-icon {
          display: inline-block;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }

        .landing-feature-card:hover .card-icon {
          transform: scale(1.15);
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '960px',
        textAlign: 'center'
      }}>
        {/* Hero Section */}
        <header style={{ marginBottom: '4rem' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginBottom: '1rem',
            background: 'linear-gradient(to right, var(--text-primary), var(--text-secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            MEHFIL
          </h1>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em'
          }}>
            Premium Community Gatherings & Event Platform
          </p>
          <p style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            Mehfil brings people together. Simplify the organization of your community gatherings, kitty parties, event schedules, contributions, and group expenses in one unified, elegant workspace.
          </p>
        </header>

        {/* Features Section */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            textAlign: 'left'
          }}>
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`panel landing-feature-card fade-in-card delay-${idx}`}
                onMouseMove={handleMouseMove}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div className="card-icon" style={{ fontSize: '1.5rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{feature.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Call To Action Section */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '3rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Ready to host your next Mehfil?
          </h2>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center'
          }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
              Sign In
            </Link>
            <Link to="/register" className="btn btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}>
              Create Account
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
