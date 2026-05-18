import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, TrendingUp, AlertTriangle, ArrowUpRight, ShieldCheck, Calendar, Loader2, Target, X, Send } from 'lucide-react';

const TeamDashboard = ({ setActiveTab }) => {
  const [cycle, setCycle] = useState('Q1');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamKpis, setTeamKpis] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 BROADCAST MODAL STATES (Removed Target and Weight)
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bGoal, setBGoal] = useState({ title: '', thrustArea: '', uom: '', target: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const thrustAreas = ['Sales & Revenue', 'Operations & SCM', 'Marketing & Brand', 'Product & Engineering', 'HR & Culture', 'Finance'];
  const uomOptions = ['Numeric', '%', 'Timeline', 'Zero-based'];

  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  const managerId = sessionUser.id;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchTeamIntelligence = async () => {
      if (!managerId) return;
      const cacheKey = `atomberg_manager_dashboard_${managerId}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        setTeamMembers(parsedCache.team_members || []);
        setTeamKpis(parsedCache.team_kpis || []);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/manager/dashboard-summary?manager_id=${managerId}`);
        const data = await response.json();
        
        if (response.ok) {
          setTeamMembers(data.team_members || []);
          setTeamKpis(data.team_kpis || []);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error("Network communication crash", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamIntelligence();
  }, [managerId, apiBaseUrl]);

  const handleBGoalChange = (field, value) => {
    setBGoal(prev => ({ ...prev, [field]: value }));
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setIsBroadcasting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/manager/broadcast-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerId, quarter: cycle, goal: bGoal })
      });
      const data = await response.json();
      if (response.ok) {
        alert(`🚀 SUCCESS! ${data.message}`);
        setShowBroadcast(false);
        setBGoal({ title: '', thrustArea: '', uom: '' });
        sessionStorage.removeItem(`atomberg_manager_dashboard_${managerId}`); 
        window.location.reload();
      } else {
        alert(`❌ ERROR: ${data.error}`);
      }
    } catch (err) {
      alert("Failed to connect to server.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const activeQuarterKpis = teamKpis.filter(k => k.quarter === cycle);

  const calculatedRoster = teamMembers.map(member => {
    const memberKpis = activeQuarterKpis.filter(k => k.user_id === member.id);
    let sheetStatus = 'Not Submitted';
    let individualCompletion = 0;
    let primaryAlignment = 'Not Set';

    if (memberKpis.length > 0) {
      const allLocked = memberKpis.every(k => k.manager_locked === true);
      const hasFeedback = memberKpis.some(k => k.manager_note !== null && k.manager_note !== '');
      if (allLocked) sheetStatus = 'Approved';
      else if (hasFeedback) sheetStatus = 'Revision Requested';
      else sheetStatus = 'Pending L1';

      individualCompletion = memberKpis.reduce((sum, k) => {
        if (k.manager_locked && k.performance_status === 'Completed') return sum + k.weightage;
        else if (k.manager_locked && k.performance_status === 'On Track') return sum + Math.round(k.weightage * 0.5);
        return sum;
      }, 0);

      const areasCount = memberKpis.reduce((acc, k) => { acc[k.thrust_area] = (acc[k.thrust_area] || 0) + k.weightage; return acc; }, {});
      primaryAlignment = Object.keys(areasCount).reduce((a, b) => areasCount[a] > areasCount[b] ? a : b, 'General');
    }
    return { ...member, sheetStatus, completion: individualCompletion, alignment: primaryAlignment };
  });

  const totalManagedCount = calculatedRoster.length;
  const totalPendingApprovals = calculatedRoster.filter(r => r.sheetStatus === 'Pending L1').length;
  const membersWithApprovedSheets = calculatedRoster.filter(r => r.sheetStatus === 'Approved');
  const globalAverageAchievement = membersWithApprovedSheets.length > 0 ? Math.round(membersWithApprovedSheets.reduce((sum, r) => sum + r.completion, 0) / membersWithApprovedSheets.length) : 0;
  const totalDelayedObjectives = activeQuarterKpis.filter(k => k.manager_locked && k.performance_status === 'Not Started').length;

  const totalAllocatedWeightPool = activeQuarterKpis.reduce((sum, k) => sum + k.weightage, 0) || 1;
  const thrustAreasList = ['Sales & Revenue', 'Operations & SCM', 'Product & Engineering', 'Marketing & Brand', 'HR & Culture', 'Finance'];
  const barColors = ['var(--atomberg-yellow)', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];
  const dynamicThrustDistribution = thrustAreasList.map((area, idx) => {
    const areaWeightSum = activeQuarterKpis.filter(k => k.thrust_area === area).reduce((sum, k) => sum + k.weightage, 0);
    const calculatedPercentage = Math.round((areaWeightSum / totalAllocatedWeightPool) * 100);
    return { area, weight: `${calculatedPercentage}%`, barColor: barColors[idx] };
  }).filter(d => parseInt(d.weight) > 0);

  const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif" };
  const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#4B5563', marginBottom: '0.3rem', textTransform: 'uppercase' };

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#4B5563' }}><Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Assembling team metrics layer...</span></div>;

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '3rem', transform: 'scale(0.95)', transformOrigin: 'top center' }}>
      
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Team Overview</h1><p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Track alignment, review submissions, and monitor departmental targets in real-time.</p></div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.4rem 0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Calendar size={14} color="#9CA3AF" style={{ marginRight: '6px' }} />
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '700', color: '#111827', cursor: 'pointer' }}>
              <option value="Q1">Quarter 1 (Apr - Jun)</option><option value="Q2">Quarter 2 (Jul - Sep)</option><option value="Q3">Quarter 3 (Oct - Dec)</option><option value="Q4">Quarter 4 (Jan - Mar)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.2rem', marginBottom: '2rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Total Managed</span><div style={{ background: '#F3F4F6', padding: '0.5rem', borderRadius: '10px' }}><Users size={16} color="#4B5563" /></div></div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827' }}>{totalManagedCount} <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: '500' }}>Directs</span></div>
        </div>
        <div onClick={() => setActiveTab('Goal Approvals')} style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Pending Approvals</span><div style={{ background: totalPendingApprovals > 0 ? '#FEF3C7' : '#D1FAE5', padding: '0.5rem', borderRadius: '10px' }}><CheckSquare size={16} color={totalPendingApprovals > 0 ? '#D97706' : '#10B981'} /></div></div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: totalPendingApprovals > 0 ? '#D97706' : '#111827' }}>{totalPendingApprovals} <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: '500' }}>Sheets</span></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Avg Team Progress</span><div style={{ background: '#D1FAE5', padding: '0.5rem', borderRadius: '10px' }}><TrendingUp size={16} color="#10B981" /></div></div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10B981' }}>{globalAverageAchievement}<span style={{ fontSize: '1rem', marginLeft: '2px' }}>%</span></div>
        </div>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' }}>Delayed Objectives</span><div style={{ background: totalDelayedObjectives > 0 ? '#FEF2F2' : '#F3F4F6', padding: '0.5rem', borderRadius: '10px' }}><AlertTriangle size={16} color={totalDelayedObjectives > 0 ? '#EF4444' : '#6B7280'} /></div></div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: totalDelayedObjectives > 0 ? '#EF4444' : '#111827' }}>{totalDelayedObjectives} <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: '500' }}>Tasks</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '1.5rem 2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 1.2rem 0', color: '#111827', fontSize: '1rem', fontWeight: '700' }}>Departmental Allocation by Corporate Thrust Areas ({cycle})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dynamicThrustDistribution.length === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No active corporate targets found for this cycle.</div>
            ) : dynamicThrustDistribution.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: '#4B5563', marginBottom: '0.4rem' }}><span>{item.area}</span><span style={{ fontWeight: '700', color: '#111827' }}>{item.weight} Allocation</span></div>
                <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: item.weight, height: '100%', background: item.barColor, borderRadius: '4px' }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#4a80f4', borderRadius: '16px', padding: '1.5rem 2rem', color: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '20px', width: 'fit-content', fontSize: '0.75rem', fontWeight: '700', color: 'var(--atomberg-yellow)', marginBottom: '1rem', textTransform: 'uppercase' }}>
            <ShieldCheck size={14} /> Team Alignment
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: '700' }}>Shared Group Objective</h2>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#fbf815', lineHeight: '1.5' }}>Push a mandatory objective to all direct reports for {cycle}. This will safely unlock their sheets.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowBroadcast(true)} style={{ background: 'var(--atomberg-yellow)', color: '#000000', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Broadcast Goal <Target size={14} />
            </button>
            <button onClick={() => setActiveTab('Goal Approvals')} style={{ background: 'transparent', color: '#FFFFFF', border: '1px solid #4B5563', padding: '0.75rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Review Approvals <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem', fontWeight: '700' }}>Team Progress Tracking ({cycle})</h3>
        </div>
        <div style={{ padding: '0 1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '0.5rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Employee Name</th>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Primary Alignment</th>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Approval Status</th>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB', width: '20%' }}>{cycle} Execution Achieved</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {calculatedRoster.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>No employees linked.</td></tr>
              ) : calculatedRoster.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '1.2rem 1rem' }}><div style={{ color: '#111827', fontWeight: '700', fontSize: '0.9rem' }}>{emp.name}</div><div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: '500', marginTop: '2px' }}>{emp.role}</div></td>
                  <td style={{ padding: '1.2rem 1rem', color: '#4B5563', fontSize: '0.85rem', fontWeight: '600' }}>{emp.alignment}</td>
                  <td style={{ padding: '1.2rem 1rem' }}>
                    <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: emp.sheetStatus === 'Approved' ? '#D1FAE5' : emp.sheetStatus === 'Pending L1' ? '#FEF3C7' : emp.sheetStatus === 'Revision Requested' ? '#FEE2E2' : '#F3F4F6', color: emp.sheetStatus === 'Approved' ? '#065F46' : emp.sheetStatus === 'Pending L1' ? '#92400E' : emp.sheetStatus === 'Revision Requested' ? '#991B1B' : '#4B5563' }}>{emp.sheetStatus}</span>
                  </td>
                  <td style={{ padding: '1.2rem 1rem' }}>
                    {emp.sheetStatus === 'Not Submitted' ? <span style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>—</span> : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${emp.completion}%`, height: '100%', background: emp.completion > 70 ? '#10B981' : 'var(--atomberg-yellow)' }} /></div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#111827', minWidth: '35px', textAlign: 'right' }}>{emp.completion}%</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}><button onClick={() => setActiveTab(emp.sheetStatus === 'Approved' ? 'Team Progress' : 'Goal Approvals')} style={{ background: '#F3F4F6', border: 'none', borderRadius: '6px', padding: '0.5rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 FIXED BROADCAST MODAL (REMOVED TARGET & WEIGHT) */}
      {showBroadcast && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', padding: '2.5rem', borderRadius: '20px', maxWidth: '550px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E5E7EB', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#111827', fontWeight: '800' }}>Broadcast Group Goal</h3>
                <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: '0.3rem 0 0 0' }}>Employees will define their own specific target & weightage to match this goal.</p>
              </div>
              <button onClick={() => setShowBroadcast(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleBroadcastSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Thrust Area *</label>
                  <select required style={inputStyle} value={bGoal.thrustArea} onChange={e => handleBGoalChange('thrustArea', e.target.value)}>
                    <option value="" disabled>Select...</option>
                    {thrustAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>UoM *</label>
                  <select required style={inputStyle} value={bGoal.uom} onChange={e => handleBGoalChange('uom', e.target.value)}>
                    <option value="" disabled>Select...</option>
                    {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {/* 🚀 TARGET IS BACK FOR THE MANAGER TO SET */}
                <div>
                  <label style={labelStyle}>Fixed Target *</label>
                  {!bGoal.uom && <input type="text" disabled style={{...inputStyle, background: '#F3F4F6'}} placeholder="Wait..." />}
                  {bGoal.uom === 'Numeric' && <input type="number" min="0" required style={inputStyle} value={bGoal.target} onChange={e => handleBGoalChange('target', e.target.value)} />}
                  {bGoal.uom === '%' && <input type="number" min="0" max="100" required style={inputStyle} value={bGoal.target} onChange={e => handleBGoalChange('target', e.target.value)} />}
                  {bGoal.uom === 'Timeline' && <input type="date" required style={{...inputStyle, cursor: 'pointer'}} value={bGoal.target} onChange={e => handleBGoalChange('target', e.target.value)} />}
                  {bGoal.uom === 'Zero-based' && <input type="text" disabled style={{...inputStyle, background: '#F3F4F6'}} value="0" />}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Shared Goal Description *</label>
                <input type="text" required placeholder="Describe the common goal..." style={inputStyle} value={bGoal.title} onChange={e => handleBGoalChange('title', e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Shared Goal Description *</label>
                <input type="text" required placeholder="Describe the common goal..." style={inputStyle} value={bGoal.title} onChange={e => handleBGoalChange('title', e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" disabled={isBroadcasting} style={{ padding: '0.8rem 1.5rem', borderRadius: '10px', border: 'none', background: 'var(--atomberg-yellow)', color: '#000000', fontWeight: '800', cursor: isBroadcasting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isBroadcasting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />} 
                  Launch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamDashboard;