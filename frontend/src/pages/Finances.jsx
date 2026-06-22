import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DollarSign, Plus, CreditCard, CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';

export default function Finances() {
  const { groupId } = useParams();
  const { api, activeGroupDetails, user } = useApp();

  const [activeTab, setActiveTab] = useState('contributions'); // 'contributions' | 'expenses'
  const [loading, setLoading] = useState(true);

  // Contributions states
  const [contributions, setContributions] = useState([]);
  const [activeContrib, setActiveContrib] = useState(null);
  const [contribDetails, setContribDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Contribution Form states
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [contribTitle, setContribTitle] = useState('');
  const [contribAmount, setContribAmount] = useState('');
  const [contribDueDate, setContribDueDate] = useState('');
  const [contribFormLoading, setContribFormLoading] = useState(false);

  // Mock checkout simulator overlay
  const [mockCheckoutOrder, setMockCheckoutOrder] = useState(null);

  // Expenses states
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Expense Form states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayerId, setExpensePayerId] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseFormLoading, setExpenseFormLoading] = useState(false);

  // Settle Up state
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleFromId, setSettleFromId] = useState('');
  const [settleFromName, setSettleFromName] = useState('');
  const [settleToId, setSettleToId] = useState('');
  const [settleToName, setSettleToName] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contributions/${groupId}`);
      setContributions(res.data);
    } catch (err) {
      console.error('Failed to load contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesAndBalances = async () => {
    try {
      setBalancesLoading(true);
      const [expRes, balRes] = await Promise.all([
        api.get(`/expenses/${groupId}`),
        api.get(`/expenses/${groupId}/balances`)
      ]);
      setExpenses(expRes.data);
      setBalances(balRes.data);
    } catch (err) {
      console.error('Failed to load expenses balances:', err);
    } finally {
      setBalancesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contributions') {
      fetchContributions();
    } else {
      fetchExpensesAndBalances();
    }
  }, [groupId, activeTab]);

  const handleOpenContribDetails = async (contrib) => {
    setActiveContrib(contrib);
    try {
      setDetailsLoading(true);
      const res = await api.get(`/contributions/${groupId}/details/${contrib.id}`);
      setContribDetails(res.data);
    } catch (err) {
      console.error('Failed to load contrib details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateContribution = async (e) => {
    e.preventDefault();
    if (!contribTitle || !contribAmount || !contribDueDate) return;

    try {
      setContribFormLoading(true);
      await api.post(`/contributions/${groupId}`, {
        title: contribTitle,
        amount: parseFloat(contribAmount),
        dueDate: contribDueDate
      });
      setIsContribModalOpen(false);
      setContribTitle('');
      setContribAmount('');
      setContribDueDate('');
      fetchContributions();
    } catch (err) {
      console.error(err);
      alert('Failed to create contribution cycle.');
    } finally {
      setContribFormLoading(false);
    }
  };

  const handleRazorpayPayment = async (contribId) => {
    try {
      const orderRes = await api.post(`/contributions/${groupId}/pay/${contribId}`);
      const orderData = orderRes.data;

      if (orderData.mock) {
        // Launch Mock Sandbox Checkout Modal
        setMockCheckoutOrder({
          contributionId: contribId,
          ...orderData
        });
      } else {
        // Load Real Razorpay SDK
        const loadScript = () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const loaded = await loadScript();
        if (!loaded) {
          alert('Failed to load payment checkout SDK.');
          return;
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Mehfil gathering',
          description: orderData.contributionName,
          order_id: orderData.orderId,
          handler: async function (response) {
            try {
              await api.post(`/contributions/${groupId}/verify/${contribId}`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              alert('Payment verified successfully!');
              fetchContributions();
              if (activeContrib?.id === contribId) {
                handleOpenContribDetails(activeContrib);
              }
            } catch (err) {
              console.error(err);
              alert('Payment verification failed.');
            }
          },
          prefill: {
            name: user.fullName,
            email: user.email
          },
          theme: {
            color: '#0F0F10'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to initialize payment.');
    }
  };

  const handleMockVerify = async (success) => {
    if (!mockCheckoutOrder) return;
    const { contributionId, orderId } = mockCheckoutOrder;

    try {
      await api.post(`/contributions/${groupId}/verify/${contributionId}`, {
        razorpay_order_id: orderId,
        mock_success: success
      });
      alert(success ? 'Mock payment completed successfully!' : 'Mock payment failed.');
      setMockCheckoutOrder(null);
      fetchContributions();
      if (activeContrib?.id === contributionId) {
        handleOpenContribDetails(activeContrib);
      }
    } catch (err) {
      console.error(err);
      alert('Mock payment verification failed.');
    }
  };

  const handleManualOfflinePayment = async (memberId) => {
    if (!activeContrib) return;
    if (!window.confirm('Log manual payment for this member?')) return;

    try {
      await api.post(`/contributions/${groupId}/manual-pay/${activeContrib.id}`, { memberId });
      handleOpenContribDetails(activeContrib);
    } catch (err) {
      console.error(err);
      alert('Failed to log offline payment.');
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount || !expensePayerId || !expenseDate) return;

    try {
      setExpenseFormLoading(true);
      await api.post(`/expenses/${groupId}`, {
        title: expenseTitle,
        totalAmount: parseFloat(expenseAmount),
        paidById: parseInt(expensePayerId),
        date: expenseDate
      });
      setIsExpenseModalOpen(false);
      setExpenseTitle('');
      setExpenseAmount('');
      setExpensePayerId('');
      setExpenseDate('');
      fetchExpensesAndBalances();
    } catch (err) {
      console.error(err);
      alert('Failed to create split expense.');
    } finally {
      setExpenseFormLoading(false);
    }
  };

  const handleOpenSettleUp = (settlement) => {
    setSettleFromId(settlement.from);
    setSettleFromName(settlement.fromName);
    setSettleToId(settlement.to);
    setSettleToName(settlement.toName);
    setSettleAmount(settlement.amount);
    setIsSettleModalOpen(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSettleLoading(true);
      await api.post(`/expenses/${groupId}/settle-up`, {
        debtorId: settleFromId,
        creditorId: settleToId,
        amount: parseFloat(settleAmount)
      });
      setIsSettleModalOpen(false);
      fetchExpensesAndBalances();
    } catch (err) {
      console.error(err);
      alert('Failed to settle balances.');
    } finally {
      setSettleLoading(false);
    }
  };

  if (loading && contributions.length === 0 && expenses.length === 0) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isAdmin = activeGroupDetails?.myRole === 'admin';
  const groupMembers = activeGroupDetails?.members || [];

  return (
    <div className="workspace-view">
      
      {/* Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-charcoal)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.25rem'
        }}>
          <button
            onClick={() => setActiveTab('contributions')}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'contributions' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'contributions' ? 'var(--bg-obsidian)' : 'var(--text-secondary)'
            }}
          >
            Monthly Contributions
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'expenses' ? 'var(--text-primary)' : 'transparent',
              color: activeTab === 'expenses' ? 'var(--bg-obsidian)' : 'var(--text-secondary)'
            }}
          >
            Shared Expense Splits
          </button>
        </div>

        <div>
          {activeTab === 'contributions' && isAdmin && (
            <button onClick={() => setIsContribModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Create Cycle</span>
            </button>
          )}

          {activeTab === 'expenses' && (
            <button onClick={() => { setExpensePayerId(user.id.toString()); setIsExpenseModalOpen(true); }} className="btn btn-primary">
              <Plus size={16} />
              <span>Log Shared Cost</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT: CONTRIBUTIONS */}
      {activeTab === 'contributions' && (
        <div className="dashboard-grid">
          
          {/* Left: Contributions Cycles List */}
          <div className="grid-col-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Collection Cycles ({contributions.length})
            </h3>

            {contributions.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'var(--bg-charcoal)' }}>
                <DollarSign size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>No Collections Scheduled</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Create a contribution cycle to collect monthly funds or kitty pool amounts.
                </p>
              </div>
            ) : (
              contributions.map(contrib => {
                const isSelected = activeContrib?.id === contrib.id;
                return (
                  <div
                    key={contrib.id}
                    onClick={() => handleOpenContribDetails(contrib)}
                    className="panel panel-interactive"
                    style={{
                      borderColor: isSelected ? 'var(--text-muted)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{contrib.title}</h4>
                      <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.9375rem' }}>
                        INR {parseFloat(contrib.amount).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.75rem' }}>
                      <span>Due: {new Date(contrib.due_date).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-primary)' }}>
                        <span>Collected: {contrib.paid_count} / {contrib.total_members}</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Payment Checklist & Pay actions */}
          <div className="grid-col-6">
            <div className="panel" style={{ minHeight: '350px', position: 'sticky', top: '80px' }}>
              {detailsLoading ? (
                <div style={{ display: 'flex', height: '300px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                </div>
              ) : contribDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Title & User Status */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{contribDetails.contribution.title}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Due by: {new Date(contribDetails.contribution.due_date).toLocaleDateString()}
                      </span>
                      
                      {/* Personal payment status action */}
                      {(() => {
                        const myPayment = contribDetails.payments.find(p => p.user_id === user.id);
                        if (myPayment?.payment_status === 'paid') {
                          return (
                            <span className="badge badge-paid" style={{ display: 'flex', gap: '0.25rem' }}>
                              <ShieldCheck size={14} />
                              <span>Paid</span>
                            </span>
                          );
                        } else {
                          return (
                            <button
                              onClick={() => handleRazorpayPayment(contribDetails.contribution.id)}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <CreditCard size={12} />
                              <span>Pay INR {parseFloat(contribDetails.contribution.amount).toLocaleString()}</span>
                            </button>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Payments Checklist */}
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      Circle Checklist
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                      {contribDetails.payments.map(record => (
                        <div
                          key={record.user_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <span>{record.user_name || record.full_name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className={`badge badge-${record.payment_status}`}>{record.payment_status}</span>
                            
                            {/* Manual check action for admins */}
                            {isAdmin && record.payment_status !== 'paid' && (
                              <button
                                onClick={() => handleManualOfflinePayment(record.user_id)}
                                className="btn btn-ghost"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <UserCheck size={12} />
                                <span>Offline</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ display: 'flex', height: '300px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', gap: '0.5rem' }}>
                  <DollarSign size={32} style={{ color: 'var(--text-muted)' }} />
                  <span>Select a contribution cycle from the left column to view tracking details and execute payments.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SHARED EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="dashboard-grid">
          
          {/* Left Column: Net Balances & Settlements Engine */}
          <div className="grid-col-5" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Balances Summary Card */}
            <div className="panel">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Circle Balances</h3>

              {balancesLoading || !balances ? (
                <div style={{ display: 'flex', height: '120px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {balances.memberBalances.map(mb => {
                    const isPositive = mb.net > 0;
                    const isNegative = mb.net < 0;
                    return (
                      <div 
                        key={mb.id} 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}
                      >
                        <span style={{ fontWeight: mb.id === user.id ? 600 : 400 }}>{mb.fullName}</span>
                        <span style={{
                          fontWeight: 700,
                          color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-secondary)'
                        }}>
                          {isPositive && '+'}
                          INR {mb.net.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Suggested simplified payments (Settlements) */}
            <div className="panel">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Optimal Debt Settlements</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Simplified transactions to clear all group balances.
              </p>

              {balancesLoading || !balances ? (
                <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                </div>
              ) : balances.suggestedSettlements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  All group balances are settled!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {balances.suggestedSettlements.map((tx, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-charcoal)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div>
                        <strong>{tx.fromName}</strong> owes <strong>{tx.toName}</strong>
                        <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.875rem', marginTop: '0.15rem' }}>
                          INR {tx.amount.toFixed(2)}
                        </div>
                      </div>
                      
                      {/* Settle button */}
                      {(tx.from === user.id || tx.to === user.id || isAdmin) && (
                        <button 
                          onClick={() => handleOpenSettleUp(tx)}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}
                        >
                          Settle Up
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Shared Cost Log List */}
          <div className="grid-col-7" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Shared Costs Log
            </h3>

            {balancesLoading ? (
              <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
              </div>
            ) : expenses.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '4rem 1.5rem', backgroundColor: 'var(--bg-charcoal)' }}>
                <DollarSign size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>No Shared Costs</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Log shared dinner costs, travel expenses, or decor bookings to split with the circle.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {expenses.map(expense => (
                  <div key={expense.id} className="panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{expense.title}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Paid by <strong>{expense.payer_name}</strong> on {new Date(expense.date).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        INR {parseFloat(expense.total_amount).toLocaleString()}
                      </span>
                    </div>

                    {/* Member split breakdowns details inside card */}
                    <div style={{
                      borderTop: '1px solid var(--border-subtle)',
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      {expense.splits.map(split => (
                        <div
                          key={split.id}
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: split.is_settled ? 'var(--success-glow)' : 'var(--bg-charcoal)',
                            border: `1px solid ${split.is_settled ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                            color: split.is_settled ? 'var(--success)' : 'var(--text-secondary)',
                            borderRadius: '4px',
                            padding: '0.2rem 0.5rem',
                            display: 'flex',
                            gap: '0.25rem',
                            alignItems: 'center'
                          }}
                        >
                          {split.is_settled && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>}
                          <span>{split.member_name}: INR {parseFloat(split.share_amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* CREATE CONTRIBUTION CYCLE MODAL */}
      {isContribModalOpen && (
        <div className="modal-overlay" onClick={() => setIsContribModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Create Contribution Cycle</h3>
            <form onSubmit={handleCreateContribution}>
              <div className="form-group">
                <label className="form-label">Cycle Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. June Monthly Dues"
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dues Amount (INR) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 1000"
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Payment Due Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={contribDueDate}
                  onChange={(e) => setContribDueDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsContribModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={contribFormLoading}>
                  {contribFormLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Create Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Log Shared Circle Cost</h3>
            <form onSubmit={handleCreateExpense}>
              <div className="form-group">
                <label className="form-label">Expense Description *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dinner & Appetizers"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Cost Amount (INR) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 3500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Paid By Member *</label>
                  <select
                    className="form-control"
                    value={expensePayerId}
                    onChange={(e) => setExpensePayerId(e.target.value)}
                    required
                  >
                    {groupMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                <span>Cost will automatically split equally among all active circle members.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={expenseFormLoading}>
                  {expenseFormLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Save Cost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE UP DUES MODAL OVERLAY */}
      {isSettleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSettleModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Settle Up Circle Dues</h3>
            
            <form onSubmit={handleSettleSubmit}>
              <div style={{
                backgroundColor: 'var(--bg-charcoal)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                Confirming that <strong>{settleFromName}</strong> paid <strong>{settleToName}</strong> cash or online transfer.
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Payment Settlement Amount (INR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsSettleModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={settleLoading}>
                  {settleLoading ? <div className="spinner" style={{ width: '16px', height: '16px' }}></div> : 'Record Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOCK CHECKOUT SIMULATOR OVERLAY */}
      {mockCheckoutOrder && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: '2.5rem', border: '1.5px solid var(--accent-blue)', boxShadow: '0 20px 45px rgba(37,99,235,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.5rem', backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: '50%', marginBottom: '1rem' }}>
                <CreditCard size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Razorpay Sandbox Simulator</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Simulating order checkout for {mockCheckoutOrder.contributionName}
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-charcoal)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Order ID:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{mockCheckoutOrder.orderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount:</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                  INR {(mockCheckoutOrder.amount / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => handleMockVerify(false)}
                className="btn btn-danger"
                style={{ flex: 1, padding: '0.625rem' }}
              >
                Simulate Fail
              </button>
              <button 
                onClick={() => handleMockVerify(true)}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.625rem', backgroundColor: 'var(--success)', color: 'var(--bg-obsidian)' }}
              >
                Simulate Success
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
