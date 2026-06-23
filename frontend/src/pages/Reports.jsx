import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BarChart3, FileText, Download, TrendingUp, DollarSign, Calendar, Award } from 'lucide-react';

export default function Reports() {
  const { groupId } = useParams();
  const { api, activeGroupDetails } = useApp();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/${groupId}/analytics`);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load group analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [groupId]);

  const handleDownloadPDF = async (reportType) => {
    try {
      setPdfLoading(prev => ({ ...prev, [reportType]: true }));
      
      const response = await api.get(`/reports/${groupId}/export`, {
        params: { type: reportType },
        responseType: 'blob' // Essential to handle binary PDF stream
      });

      // Create local URL for the PDF blob
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(fileBlob);
      
      // Trigger browser download action
      const link = document.createElement('a');
      link.href = fileURL;
      link.setAttribute('download', `Mehfil_Report_${reportType}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up reference
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);

    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate and download PDF report.');
    } finally {
      setPdfLoading(prev => ({ ...prev, [reportType]: false }));
    }
  };

  if (loading || !activeGroupDetails) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const { group } = activeGroupDetails;

  return (
    <div className="workspace-view">
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <BarChart3 style={{ color: 'var(--accent-blue)' }} />
          <span>Analytics & Reports</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          View financial trends, attendance charts, winner breakdowns, and export branded PDF files.
        </p>
      </div>

      {/* PDF Export Triggers Panels */}
      <div className="panel" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} />
          <span>Generate Branded PDF Reports</span>
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { id: 'monthly', title: 'Monthly Summary', desc: 'Overview of all active finances, events and user metrics.' },
            { id: 'contributions', title: 'Contributions Dues', desc: 'Checklist details of monthly cash flows, paid list status.' },
            { id: 'expenses', title: 'Shared Costs Splits', desc: 'Individual balances, logged bills, settlements outlines.' },
            { id: 'attendance', title: 'Attendance logs', desc: 'Summaries of circle presence lists, rates and metrics.' },
            ...(group.type === 'kitty' ? [{ id: 'winners', title: 'Kitty Winners Log', desc: ' rotation history, dates drawn, prize pools.' }] : [])
          ].map(report => (
            <div 
              key={report.id}
              style={{
                backgroundColor: 'var(--bg-charcoal)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '160px'
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>{report.title}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>{report.desc}</p>
              </div>

              <button
                onClick={() => handleDownloadPDF(report.id)}
                disabled={pdfLoading[report.id]}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}
              >
                {pdfLoading[report.id] ? (
                  <div className="spinner" style={{ width: '12px', height: '12px' }}></div>
                ) : (
                  <>
                    <Download size={12} />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Analytics Trends */}
      {analytics && (
        <div className="dashboard-grid">
          
          {/* Contribution Progress Graph (Simple CSS Bar representation) */}
          <div className="panel grid-col-6">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <TrendingUp size={16} style={{ color: 'var(--success)' }} />
              <span>Contribution Pools Trend</span>
            </h3>

            {analytics.contributions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                No contribution cycles logged to display.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.contributions.map((c, idx) => {
                  const percent = c.amount > 0 ? Math.round((c.total_collected / (c.amount * c.total_members)) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span>{c.title}</span>
                        <strong>{percent}% ({c.paid_members_count}/{c.total_members} Paid)</strong>
                      </div>
                      
                      {/* Bar track */}
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-charcoal)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, percent)}%`,
                          backgroundColor: 'var(--success)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance Trends widget */}
          <div className="panel grid-col-6">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Calendar size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>Gathering Attendance Rates</span>
            </h3>

            {analytics.attendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                No completed events to aggregate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.attendance.map((evt, idx) => {
                  const presentPercent = evt.total_recorded > 0 ? Math.round(((evt.present_count + evt.late_count) / evt.total_recorded) * 100) : 100;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span>{evt.title}</span>
                        <strong>{presentPercent}% Present</strong>
                      </div>
                      
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-charcoal)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <div style={{
                          height: '100%',
                          width: `${presentPercent}%`,
                          backgroundColor: 'var(--accent-blue)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expense cost chart tracker */}
          <div className="panel grid-col-6">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <DollarSign size={16} style={{ color: 'var(--danger)' }} />
              <span>Shared Cost Outlines</span>
            </h3>

            {analytics.expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                No group expenses logged.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {analytics.expenses.map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{exp.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(exp.date).toLocaleDateString()}</span>
                    </div>
                    <strong style={{ color: 'var(--text-primary)' }}>INR {parseFloat(exp.total_amount).toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Winners stats totals */}
          {group.type === 'kitty' && (
            <div className="panel grid-col-6">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Award size={16} style={{ color: 'var(--accent-purple)' }} />
                <span>Kitty Pools Distribution</span>
              </h3>

              {analytics.winners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  No kitty cycles drawn.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {analytics.winners.map((win, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)' }}></div>
                        <span>{win.winner_name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{win.win_count} Win{win.win_count !== 1 && 's'}</span>
                        <strong style={{ color: 'var(--success)' }}>INR {parseFloat(win.total_won).toLocaleString()}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event KPI Metrics */}
          <div className="panel grid-col-6">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <TrendingUp size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>Event Scheduling Overview</span>
            </h3>

            {!analytics.eventAnalytics || analytics.eventAnalytics.totalEvents === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                No scheduled event data available to display.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div style={{ backgroundColor: 'var(--bg-charcoal)', padding: '1rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {analytics.eventAnalytics.totalEvents}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Total Events
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-charcoal)', padding: '1rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {Math.round(analytics.eventAnalytics.averageAttendance * 10) / 10}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Avg Attendance
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-charcoal)', padding: '1rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    {analytics.eventAnalytics.rsvpParticipationRate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    RSVP Response
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Event Type Distribution List */}
          <div className="panel grid-col-6">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <BarChart3 size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>Event Type Distribution</span>
            </h3>

            {!analytics.eventAnalytics || !analytics.eventAnalytics.typeDistribution || analytics.eventAnalytics.typeDistribution.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                No events categorized.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {analytics.eventAnalytics.typeDistribution.map((dist, idx) => {
                  const percent = analytics.eventAnalytics.totalEvents > 0 
                    ? Math.round((dist.count / analytics.eventAnalytics.totalEvents) * 100)
                    : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                        <span>{dist.event_type}</span>
                        <strong>{dist.count} event{dist.count !== 1 && 's'} ({percent}%)</strong>
                      </div>
                      
                      {/* Bar chart track */}
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-charcoal)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <div style={{
                          height: '100%',
                          width: `${percent}%`,
                          backgroundColor: 'var(--accent-purple)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
