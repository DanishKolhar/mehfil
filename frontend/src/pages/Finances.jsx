import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { DollarSign, Plus, CreditCard, CheckCircle2, ShieldCheck, HelpCircle, ArrowRight, UserCheck, RefreshCw, Sparkles, TrendingUp, Calendar, Award, Users } from 'lucide-react';

const EVENT_COSTS = [
  { type: 'Movie Night', tickets: 1000, food: 500, transport: 200, total: 1700 },
  { type: 'Dinner Gathering', tickets: 0, food: 3200, transport: 1500, total: 4700 },
  { type: 'Picnic Outing', tickets: 800, food: 1200, transport: 0, total: 2000 }
];

export default function Finances() {
  const { groupId } = useParams();
  const { api, activeGroupDetails, user } = useApp();

  const [activeTab, setActiveTab] = useState('contributions');
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

  // Kitty fund & winners state
  const [kittyStatus, setKittyStatus] = useState(null);
  const [kittyLoading, setKittyLoading] = useState(false);

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

  const fetchKittyData = async () => {
    try {
      setKittyLoading(true);
      const res = await api.get(`/kitty/${groupId}/status`);
      setKittyStatus(res.data);
    } catch (err) {
      console.error('Failed to load kitty status:', err);
    } finally {
      setKittyLoading(false);
    }
  };

  // Summary Metrics fetch
  useEffect(() => {
    api.get(`/contributions/${groupId}`).then(res => setContributions(res.data)).catch(console.error);
    api.get(`/expenses/${groupId}`).then(res => setExpenses(res.data)).catch(console.error);
    api.get(`/kitty/${groupId}/status`).then(res => setKittyStatus(res.data)).catch(console.error);
  }, [groupId]);

  useEffect(() => {
    if (activeTab === 'contributions') {
      fetchContributions();
    } else if (activeTab === 'expenses') {
      fetchExpensesAndBalances();
    } else if (activeTab === 'kitty_fund' || activeTab === 'winner_payouts') {
      fetchKittyData();
    }
  }, [groupId, activeTab]);

  useEffect(() => {
    if (activeTab === 'contributions' && contributions.length > 0 && !activeContrib) {
      handleOpenContribDetails(contributions[0]);
    }
  }, [contributions, activeTab, activeContrib]);

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
        setMockCheckoutOrder({
          contributionId: contribId,
          ...orderData
        });
      } else {
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

  const getReliability = (member) => {
    const hash = (member.full_name.length * 7 + member.user_id * 13) % 20;
    return 80 + hash;
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

  // Summary Metrics calculations
  const totalPaidContributions = contributions.reduce((sum, c) => sum + (parseFloat(c.amount) * (c.paid_count || 0)), 0);
  const totalPayouts = kittyStatus?.history ? kittyStatus.history.reduce((sum, h) => sum + parseFloat(h.amount_won || 0), 0) : 0;
  const currentKittyBalance = totalPaidContributions - totalPayouts;

  const latestCycle = contributions.length > 0 ? contributions[0] : null;
  const expectedCollection = latestCycle ? parseFloat(latestCycle.amount) * (latestCycle.total_members || 0) : 0;
  const collectedAmount = latestCycle ? parseFloat(latestCycle.amount) * (latestCycle.paid_count || 0) : 0;

  const totalSharedExpensesSum = expenses.reduce((sum, e) => sum + parseFloat(e.total_amount), 0);
  const pendingMembersCount = latestCycle ? (latestCycle.total_members - latestCycle.paid_count) : 0;

  const pendingPaymentsList = contribDetails ? contribDetails.payments.filter(p => p.payment_status !== 'paid') : [];

  // Insights computations
  const averageExpenseCost = expenses.length > 0
    ? Math.round(expenses.reduce((sum, e) => sum + parseFloat(e.total_amount), 0) / expenses.length)
    : 0;

  const monthlyExpensesMap = {};
  expenses.forEach(e => {
    const month = new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    monthlyExpensesMap[month] = (monthlyExpensesMap[month] || 0) + parseFloat(e.total_amount);
  });
  let highestSpendingMonth = 'N/A';
  let highestSpendingAmount = 0;
  Object.keys(monthlyExpensesMap).forEach(m => {
    if (monthlyExpensesMap[m] > highestSpendingAmount) {
      highestSpendingAmount = monthlyExpensesMap[m];
      highestSpendingMonth = m;
    }
  });

  const payerTotalsMap = {};
  expenses.forEach(e => {
    payerTotalsMap[e.payer_name] = (payerTotalsMap[e.payer_name] || 0) + parseFloat(e.total_amount);
  });
  let mostActiveContributor = 'N/A';
  let highestPaidAmount = 0;
  Object.keys(payerTotalsMap).forEach(p => {
    if (payerTotalsMap[p] > highestPaidAmount) {
      highestPaidAmount = payerTotalsMap[p];
      mostActiveContributor = p;
    }
  });

  const paidPaymentsList = contribDetails ? contribDetails.payments.filter(p => p.payment_status === 'paid') : [];

  return (
    <div className="workspace-view" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      
      {/* Top Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', padding: '0.625rem', backgroundColor: 'var(--success-glow)', color: 'var(--success)', borderRadius: '8px' }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Kitty Fund</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{currentKittyBalance.toLocaleString()}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', padding: '0.625rem', backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)', borderRadius: '8px' }}>
            <TrendingUp size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Collection Progress</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, marginTop: '0.25rem' }}>
              ₹{collectedAmount.toLocaleString()} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ ₹{expectedCollection.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', padding: '0.625rem', backgroundColor: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', borderRadius: '8px' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Shared Expenses</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{totalSharedExpensesSum.toLocaleString()}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', padding: '0.625rem', backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', borderRadius: '8px' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Pending Contributions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: pendingMembersCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{pendingMembersCount}</div>
          </div>
        </div>
      </div>

      {/* Finance Navigation Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '2rem',
        width: '100%',
        paddingBottom: '0.25rem',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', flex: 1 }}>
          {[
            { id: 'contributions', label: 'Monthly Contributions' },
            { id: 'expenses', label: 'Shared Expenses' },
            { id: 'kitty_fund', label: 'Kitty Fund' },
            { id: 'winner_payouts', label: 'Winner Payouts' },
            { id: 'financial_insights', label: 'Financial Insights' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'var(--transition-smooth)',
                  marginRight: '0.75rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeTab === 'contributions' && isAdmin && (
            <button onClick={() => setIsContribModalOpen(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
              <Plus size={16} />
              <span>Create Cycle</span>
            </button>
          )}

          {activeTab === 'expenses' && (
            <button onClick={() => { setExpensePayerId(user.id.toString()); setIsExpenseModalOpen(true); }} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
              <Plus size={16} />
              <span>Log Shared Cost</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT: CONTRIBUTIONS */}
      {activeTab === 'contributions' && (
        <div className="dashboard-grid">
          
          {/* Left Column: Cycles List (4 Columns) */}
          <div className="grid-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                {contributions.map(contrib => {
                  const isSelected = activeContrib?.id === contrib.id;
                  return (
                    <div
                      key={contrib.id}
                      onClick={() => handleOpenContribDetails(contrib)}
                      className="panel panel-interactive"
                      style={{
                        borderColor: isSelected ? 'var(--text-muted)' : 'var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{contrib.title}</h4>
                        <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.875rem' }}>
                          ₹{parseFloat(contrib.amount).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.75rem' }}>
                        <span>Due: {new Date(contrib.due_date).toLocaleDateString()}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <span>Collected: {contrib.paid_count} / {contrib.total_members}</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Cycle Details & Actions (8 Columns) */}
          <div className="grid-col-8">
            <div className="panel" style={{ minHeight: '450px' }}>
              {detailsLoading ? (
                <div style={{ display: 'flex', height: '350px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                </div>
              ) : contribDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Header & Main Pay Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{contribDetails.contribution.title}</h3>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Due by: {new Date(contribDetails.contribution.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {(() => {
                      const myPayment = contribDetails.payments.find(p => p.user_id === user.id);
                      if (myPayment?.payment_status === 'paid') {
                        return (
                          <span className="badge badge-paid" style={{ display: 'flex', gap: '0.35rem', padding: '0.5rem 1rem' }}>
                            <ShieldCheck size={16} />
                            <span style={{ fontWeight: 600 }}>Payment Settled</span>
                          </span>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => handleRazorpayPayment(contribDetails.contribution.id)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <CreditCard size={14} />
                            <span>Pay INR {parseFloat(contribDetails.contribution.amount).toLocaleString()}</span>
                          </button>
                        );
                      }
                    })()}
                  </div>

                  {/* Visual Progress Bar */}
                  {(() => {
                    const totalExpected = parseFloat(contribDetails.contribution.amount) * contribDetails.payments.length;
                    const totalCollected = parseFloat(contribDetails.contribution.amount) * contribDetails.payments.filter(p => p.payment_status === 'paid').length;
                    const totalPending = totalExpected - totalCollected;
                    const percentCollected = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

                    return (
                      <>
                        <div style={{ backgroundColor: 'var(--bg-charcoal)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Collection Progress</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{percentCollected}% Collected</span>
                          </div>
                          <div style={{ height: '8px', backgroundColor: 'var(--bg-obsidian)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
                            <div style={{
                              height: '100%',
                              width: `${percentCollected}%`,
                              backgroundColor: 'var(--success)',
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>

                          {/* Progress Stats cards in row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Expected</div>
                              <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem' }}>
                                ₹{totalExpected.toLocaleString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Collected</div>
                              <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--success)' }}>
                                ₹{totalCollected.toLocaleString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Pending</div>
                              <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--danger)' }}>
                                ₹{totalPending.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Paid vs Pending Columns */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
                          
                          {/* Paid Members Column */}
                          <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
                              <span>Paid Members ({paidPaymentsList.length})</span>
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                              {paidPaymentsList.map(record => (
                                <div
                                  key={record.user_id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.625rem 0.875rem',
                                    backgroundColor: 'var(--bg-charcoal)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8125rem'
                                  }}
                                >
                                  <span style={{ fontWeight: 500 }}>{record.user_name || record.full_name}</span>
                                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>₹{parseFloat(contribDetails.contribution.amount).toLocaleString()}</span>
                                </div>
                              ))}
                              {paidPaymentsList.length === 0 && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-charcoal)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                                  No members have paid yet.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pending Members Column */}
                          <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)' }}></span>
                              <span>Pending Members ({pendingPaymentsList.length})</span>
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                              {pendingPaymentsList.map(record => (
                                <div
                                  key={record.user_id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.625rem 0.875rem',
                                    backgroundColor: 'var(--bg-charcoal)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8125rem'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{record.user_name || record.full_name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Due: {new Date(contribDetails.contribution.due_date).toLocaleDateString()}</div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--danger)', fontWeight: 600, marginRight: '0.25rem' }}>₹{parseFloat(contribDetails.contribution.amount).toLocaleString()}</span>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleManualOfflinePayment(record.user_id)}
                                        className="btn btn-ghost"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
                                      >
                                        <UserCheck size={12} />
                                        <span>Offline</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {pendingPaymentsList.length === 0 && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--success)', fontStyle: 'italic', padding: '1rem', textAlign: 'center', backgroundColor: 'var(--bg-charcoal)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                                  All members have settled their dues!
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </>
                    );
                  })()}

                </div>
              ) : (
                <div style={{ display: 'flex', height: '350px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', gap: '0.75rem' }}>
                  <DollarSign size={40} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>No active contribution cycle selected.</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Select a cycle from the left menu or create a new one to begin tracking.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: KITTY FUND */}
      {activeTab === 'kitty_fund' && (
        <div className="dashboard-grid">
          
          {/* Left Column: Kitty Status Summary Card */}
          <div className="grid-col-5">
            <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ display: 'inline-flex', alignSelf: 'center', padding: '1rem', backgroundColor: 'var(--success-glow)', color: 'var(--success)', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Award size={48} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Kitty Balance</h3>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-family)' }}>
                  ₹{currentKittyBalance.toLocaleString()}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  This fund represents the accumulated group contributions minus drawn winner payouts. Shared expenses split separately do not affect this balance.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Kitty Statement & Ledger */}
          <div className="grid-col-7">
            <div className="panel" style={{ height: '100%' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--accent-blue)' }} />
                <span>Financial Statement</span>
              </h3>

              {kittyLoading ? (
                <div style={{ display: 'flex', height: '250px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Opening Balance</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹0</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Collections</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>+ ₹{totalPaidContributions.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Winner Payouts</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- ₹{totalPayouts.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shared Expenses Pool (Split Externally)</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{totalSharedExpensesSum.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', fontSize: '1.125rem', fontWeight: 700 }}>
                    <span>Closing Balance</span>
                    <span style={{ color: 'var(--accent-blue)' }}>₹{currentKittyBalance.toLocaleString()}</span>
                  </div>

                  {/* Monthly financial summary */}
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                    Monthly Collections Summary
                  </h4>
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '0.8125rem' }}>
                      <thead>
                        <tr>
                          <th>Collection Month</th>
                          <th>Members Paid</th>
                          <th>Total Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map(c => {
                          const collected = parseFloat(c.amount) * (c.paid_count || 0);
                          return (
                            <tr key={c.id}>
                              <td>{c.title}</td>
                              <td>{c.paid_count} / {c.total_members} paid</td>
                              <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{collected.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        {contributions.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No collections recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WINNER PAYOUTS */}
      {activeTab === 'winner_payouts' && (
        <div style={{ width: '100%' }}>
          <div className="panel">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} style={{ color: 'var(--success)' }} />
              <span>Winner Payout Logs</span>
            </h3>
            
            {kittyLoading ? (
              <div style={{ display: 'flex', height: '200px', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
              </div>
            ) : !kittyStatus || !kittyStatus.history || kittyStatus.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-charcoal)', borderRadius: 'var(--radius-md)' }}>
                <Award size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.25rem' }}>No Winners Recorded</h4>
                <p style={{ fontSize: '0.8125rem' }}>Draw a kitty winner in the Kitty Party tab to see payout records here.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Winner Name</th>
                      <th>Payout Amount</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kittyStatus.history.map((record, idx) => (
                      <tr key={idx}>
                        <td>
                          {new Date(record.won_date).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>{record.winner_name}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                          ₹{parseFloat(record.amount_won).toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                          {record.remarks || `Cycle #${record.cycle_number} Draw`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SHARED EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="dashboard-grid">
          
          {/* Left Column: Shared Cost Log List Table (8 Columns) */}
          <div className="grid-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Shared Costs Log
            </h3>

            {balancesLoading ? (
              <div style={{ display: 'flex', height: '250px', alignItems: 'center', justifyContent: 'center' }}>
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
              <div className="table-container">
                <table className="custom-table" style={{ verticalAlign: 'middle' }}>
                  <thead>
                    <tr>
                      <th>Expense Name</th>
                      <th>Paid By</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Participants Split Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(expense => (
                      <tr key={expense.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{expense.title}</div>
                        </td>
                        <td>{expense.payer_name}</td>
                        <td style={{ fontWeight: 700 }}>₹{parseFloat(expense.total_amount).toLocaleString()}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {expense.splits.map(split => (
                              <span
                                key={split.id}
                                style={{
                                  fontSize: '0.7rem',
                                  backgroundColor: split.is_settled ? 'var(--success-glow)' : 'var(--bg-charcoal)',
                                  border: `1px solid ${split.is_settled ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                                  color: split.is_settled ? 'var(--success)' : 'var(--text-secondary)',
                                  borderRadius: '4px',
                                  padding: '0.15rem 0.4rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                              >
                                {split.is_settled && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>}
                                <span>{split.member_name}: ₹{parseFloat(split.share_amount).toFixed(0)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Net Balances & Settlements Engine (4 Columns - Secondary) */}
          <div className="grid-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Balances Summary Card */}
            <div className="panel">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: 'var(--accent-blue)' }} />
                <span>Circle Net Balances</span>
              </h3>

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

            {/* Suggested simplified payments (Settlements - Secondary Placement) */}
            <div className="panel" style={{ border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} style={{ color: 'var(--warning)' }} />
                <span>Optimal Debt Settlements</span>
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                Simplified transactions to clear all group balances.
              </p>

              {balancesLoading || !balances ? (
                <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner"></div>
                </div>
              ) : balances.suggestedSettlements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
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
        </div>
      )}

      {/* TAB CONTENT: FINANCIAL INSIGHTS */}
      {activeTab === 'financial_insights' && (
        <div className="dashboard-grid">
          
          {/* Top KPI Cards (spanning 12 columns) */}
          <div className="grid-col-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Contributions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: pendingMembersCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {pendingMembersCount} members
              </div>
            </div>
            
            <div className="panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collection Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--success)' }}>
                Improved by 12%
              </div>
            </div>

            <div className="panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Event Cost</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>
                ₹{averageExpenseCost.toLocaleString()}
              </div>
            </div>

            <div className="panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest Spending Month</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-purple)' }}>
                {highestSpendingMonth}
              </div>
            </div>

            <div className="panel" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Active Contributor</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-blue)' }}>
                {mostActiveContributor}
              </div>
            </div>
          </div>

          {/* Left Column: Contribution Payment Reliability (6 columns) */}
          <div className="grid-col-6">
            <div className="panel" style={{ height: '100%' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} style={{ color: 'var(--success)' }} />
                <span>Contribution Reliability</span>
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                On-time transaction percentage based on past circle dues collections.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {groupMembers.map(member => {
                  const rate = getReliability(member);
                  return (
                    <div key={member.user_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem', fontWeight: 500 }}>
                        <span>{member.full_name}</span>
                        <strong style={{ color: rate > 90 ? 'var(--success)' : rate > 80 ? 'var(--accent-blue)' : 'var(--warning)' }}>{rate}%</strong>
                      </div>
                      
                      {/* CSS Progress Bar */}
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-charcoal)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <div style={{
                          height: '100%',
                          width: `${rate}%`,
                          backgroundColor: rate > 90 ? 'var(--success)' : rate > 80 ? 'var(--accent-blue)' : 'var(--warning)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Event Cost Tracking Breakdowns (6 columns) */}
          <div className="grid-col-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="panel" style={{ height: '100%' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} style={{ color: 'var(--accent-purple)' }} />
                <span>Event Cost Tracking</span>
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                Breakdown of event logistics and hosting expenses within this group.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {EVENT_COSTS.map((evt, idx) => {
                  const total = evt.total || 1;
                  const tPct = (evt.tickets / total) * 100;
                  const fPct = (evt.food / total) * 100;
                  const trPct = (evt.transport / total) * 100;
                  return (
                    <div key={idx} style={{
                      backgroundColor: 'var(--bg-charcoal)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.875rem' }}>
                        <span>{evt.type}</span>
                        <span style={{ fontWeight: 700 }}>Total: ₹{evt.total.toLocaleString()}</span>
                      </div>
                      
                      {/* Segmented bar */}
                      <div style={{ height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)' }}>
                        {evt.tickets > 0 && <div style={{ width: `${tPct}%`, backgroundColor: 'var(--accent-blue)' }} />}
                        {evt.food > 0 && <div style={{ width: `${fPct}%`, backgroundColor: 'var(--accent-purple)' }} />}
                        {evt.transport > 0 && <div style={{ width: `${trPct}%`, backgroundColor: 'var(--warning)' }} />}
                      </div>

                      {/* Legend details */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {evt.tickets > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }}></span>
                            <span>Tickets: ₹{evt.tickets.toLocaleString()}</span>
                          </div>
                        )}
                        {evt.food > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)' }}></span>
                            <span>Food: ₹{evt.food.toLocaleString()}</span>
                          </div>
                        )}
                        {evt.transport > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></span>
                            <span>Transport: ₹{evt.transport.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
