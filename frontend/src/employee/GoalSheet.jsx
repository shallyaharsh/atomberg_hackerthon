import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Send, Calendar, ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import GoalDraftView from './GoalDraftView'; // 🚀 IMPORTED THE NEW MODULAR COMPONENT

const GoalSheet = () => {
  // ==========================================
  // 🕒 TIME-AWARE QUARTER LOCKING ENGINE
  // ==========================================
  const currentMonth = new Date().getMonth() + 1; // 1-12
  let activeQIndex = 1; // Default to Q1
  if (currentMonth >= 7 && currentMonth <= 9) activeQIndex = 2;       // Jul-Sep
  else if (currentMonth >= 10 && currentMonth <= 12) activeQIndex = 3; // Oct-Dec
  else if (currentMonth >= 1 && currentMonth <= 3) activeQIndex = 4;   // Jan-Mar

  // 🚀 Initialize dropdown with the CURRENT running quarter automatically
  const [cycle, setCycle] = useState(`Q${activeQIndex}`);
  const [goals, setGoals] = useState([
    { id: Date.now(), thrustArea: '', title: '', uom: '', target: '', weight: '' }
  ]);
  
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isFabHovered, setIsFabHovered] = useState(false);

  // --- 🚀 NEW SMART STATES FOR DATA COORDINATION ---
  const [quarterStatus, setQuarterStatus] = useState('loading'); // 'loading', 'empty', 'draft', 'locked'
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session'));
  const userId = sessionUser?.id;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const thrustAreas = ['Sales & Revenue', 'Operations & SCM', 'Marketing & Brand', 'Product & Engineering', 'HR & Culture', 'Finance'];
  const uomOptions = ['Numeric', '%', 'Timeline', 'Zero-based'];

  // 🚀 THE MASTER CACHE CHECKER (Decides which view to show)
  useEffect(() => {
    const fetchAndCheckStatus = async () => {
      if (!userId) return;
      setQuarterStatus('loading');
      
      const cacheKey = `atomberg_master_goals_${userId}`;
      let allGoals = JSON.parse(sessionStorage.getItem(cacheKey));

      if (!allGoals) {
         try {
           const res = await fetch(`${apiBaseUrl}/api/dashboard/goals?user_id=${userId}`);
           const data = await res.json();
           if (res.ok) {
             allGoals = data.goals || [];
             sessionStorage.setItem(cacheKey, JSON.stringify(allGoals));
           } else {
             allGoals = [];
           }
         } catch(err) {
           console.error("Failed to fetch master goals for validation", err);
           allGoals = [];
         }
      }

      // Filter goals for the active quarter
      const quarterGoals = allGoals.filter(g => g.quarter === cycle);
      
      if (quarterGoals.length === 0) {
        setQuarterStatus('empty'); // 1. Bilkul naya quarter hai -> Show Creation Form
      } else if (quarterGoals.every(g => g.manager_locked === true || g.admin_locked === true)) {
        setQuarterStatus('locked'); // 2. Jab SARE ke SARE goals lock ho chuke hain -> Show Locked Banner
      } else {
        setQuarterStatus('draft'); // 3. Mixed state (kuch approved, kuch pending) -> Show GoalDraftView
      }
    };

    fetchAndCheckStatus();
  }, [cycle, userId, refreshTrigger, apiBaseUrl]);


  // Form Handlers
  const handleAddGoal = () => {
    if (goals.length >= 8) {
      alert('BRD Rule: Maximum 8 goals allowed per employee.');
      return;
    }
    setGoals([...goals, { id: Date.now(), thrustArea: '', title: '', uom: '', target: '', weight: '' }]);
  };

  const handleUpdateGoal = (id, field, value) => {
    if (field === 'weight') {
      const numericValue = value === '' ? 0 : Number(value);
      const otherGoalsWeight = goals.reduce((sum, g) => sum + (g.id === id ? 0 : (Number(g.weight) || 0)), 0);
      if (otherGoalsWeight + numericValue > 100) {
        const remaining = 100 - otherGoalsWeight;
        alert(`Limit Reached! You only have ${remaining}% weightage left to distribute.`);
        return; 
      }
    }

    if (field === 'uom') {
      let newTarget = '';
      if (value === 'Zero-based') newTarget = '0'; 
      setGoals(goals.map(g => g.id === id ? { ...g, [field]: value, target: newTarget } : g));
      return;
    }

    if (field === 'target') {
      const currentGoal = goals.find(g => g.id === id);
      if (currentGoal.uom === '%' && Number(value) > 100) {
        alert('Maximum target percentage cannot exceed 100%.');
        return;
      }
      if (currentGoal.uom === 'Numeric' && Number(value) < 0) {
        alert('Numeric target cannot be negative.');
        return;
      }
    }

    setGoals(goals.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleRemoveGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const totalWeight = goals.reduce((sum, g) => sum + (Number(g.weight) || 0), 0);
  const isExactly100 = totalWeight === 100;
  const hasLowWeight = goals.some(g => g.weight !== '' && Number(g.weight) > 0 && Number(g.weight) < 10);
  const hasEmptyFields = goals.some(g => !g.thrustArea || !g.title || !g.uom || g.target === '' || !g.weight);
  const isSubmitDisabled = !isExactly100 || hasLowWeight || hasEmptyFields;

  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (!isSubmitDisabled) {
      setIsReviewMode(true);
    }
  };

  // 🚀 CONNECTED REAL BACKEND API POST REQUEST 🚀
  const handleFinalSubmit = async () => {
    try {
      const payload = {
        user_id: userId,
        quarter: cycle,
        goals: goals.map(g => ({
          thrustArea: g.thrustArea,
          title: g.title,
          uom: g.uom,
          target: g.target,
          weight: Number(g.weight)
        }))
      };

      const response = await fetch(`${apiBaseUrl}/api/goals/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert(`🎉 SUCCESS! ${data.message}`);
        // Clear cache so it fetches fresh data for the newly submitted goals
        sessionStorage.removeItem(`atomberg_master_goals_${userId}`);
        
        // Reset form and state to trigger view change
        setGoals([{ id: Date.now(), thrustArea: '', title: '', uom: '', target: '', weight: '' }]);
        setIsReviewMode(false);
        setRefreshTrigger(prev => prev + 1); // Forces component to detect the new "draft" status!
      } else {
        alert(`❌ ERROR: ${data.error}`);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Network Error: Could not connect to the backend server.");
    }
  };

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', fontSize: '0.85rem', color: '#111827', backgroundColor: '#F9FAFB', fontFamily: "'Poppins', sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s' };
  const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' };

  // ==========================================
  // VIEW 2: CONFIRMATION / REVIEW SCREEN
  // ==========================================
  if (isReviewMode) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '3rem' }}>
        
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Review & Confirm</h1>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Please verify your {cycle} objectives before final submission.</p>
          </div>
          <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.6rem 1.2rem', borderRadius: '30px', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> 100% Weightage Verified
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '2rem' }}>
          <div style={{ padding: '1.2rem 2rem', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem', fontWeight: '700' }}>Goal Sheet Summary ({cycle})</h3>
          </div>
          
          <div style={{ padding: '0 2rem 1rem 2rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '5%', padding: '1rem 0', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>#</th>
                  <th style={{ width: '25%', padding: '1rem 0', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Thrust Area</th>
                  <th style={{ width: '35%', padding: '1rem 0', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Goal Description</th>
                  <th style={{ width: '20%', padding: '1rem 0', textAlign: 'right', paddingRight: '2rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Target</th>
                  <th style={{ width: '15%', padding: '1rem 0', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Weightage</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal, index) => (
                  <tr key={goal.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '1.2rem 0', color: '#6B7280', fontWeight: '600', fontSize: '0.9rem' }}>{index + 1}.</td>
                    <td style={{ padding: '1.2rem 0', color: '#111827', fontWeight: '600', fontSize: '0.85rem' }}>{goal.thrustArea}</td>
                    <td style={{ padding: '1.2rem 0', color: '#4B5563', fontSize: '0.9rem', paddingRight: '1rem' }}>{goal.title}</td>
                    <td style={{ padding: '1.2rem 0', textAlign: 'right', paddingRight: '2rem', color: '#111827', fontWeight: '600', fontSize: '0.9rem' }}>
                      {goal.uom === '%' ? `${goal.target}%` : `${goal.target} (${goal.uom})`} 
                    </td>
                    <td style={{ padding: '1.2rem 0', textAlign: 'right', color: '#111827', fontWeight: '800', fontSize: '1rem' }}>{goal.weight}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" style={{ padding: '1.5rem 0', paddingRight: '2rem', textAlign: 'right', color: '#4B5563', fontWeight: '700', fontSize: '0.9rem' }}>Total Allocated Weightage:</td>
                  <td style={{ padding: '1.5rem 0', textAlign: 'right', color: '#10B981', fontWeight: '800', fontSize: '1.2rem' }}>100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => setIsReviewMode(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #D1D5DB', color: '#4B5563', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#F3F4F6'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <ArrowLeft size={16} /> Edit Objectives
          </button>
          
          <button 
            onClick={handleFinalSubmit}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--atomberg-yellow)', color: '#000', border: 'none', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.1s', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(255, 198, 0, 0.3)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CheckCircle size={18} /> Confirm & Submit to Manager
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: MASTER HANDLER (Checks Status)
  // ==========================================
  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%', position: 'relative' }}>
      
      {/* 🧭 ALWAYS VISIBLE HEADER */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Goal Sheet</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Align your targets with the organizational thrust areas.</p>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#111827', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Performance Cycle</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '0.5rem 0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Calendar size={16} color="#6B7280" style={{ marginRight: '8px' }} />
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '700', color: '#4B5563', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
              <option value="Q1" disabled={activeQIndex < 1}>Quarter 1 (Apr - Jun) {activeQIndex < 1 ? '🔒' : ''}</option>
              <option value="Q2" disabled={activeQIndex < 2}>Quarter 2 (Jul - Sep) {activeQIndex < 2 ? '🔒' : ''}</option>
              <option value="Q3" disabled={activeQIndex < 3}>Quarter 3 (Oct - Dec) {activeQIndex < 3 ? '🔒' : ''}</option>
              <option value="Q4" disabled={activeQIndex < 4}>Quarter 4 (Jan - Mar) {activeQIndex < 4 ? '🔒' : ''}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ⏳ LOADING STATE */}
      {quarterStatus === 'loading' && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6B7280', fontWeight: '600' }}>Checking quarter status...</div>
      )}

      {/* 🔒 LOCKED STATE: Manager has approved */}
      {quarterStatus === 'locked' && (
        <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', padding: '4rem 2rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <Lock size={48} color="#059669" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#065F46', margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '800' }}>Objectives Locked for {cycle}</h3>
          <p style={{ color: '#047857', fontSize: '1rem', margin: 0 }}>Your manager has approved and locked your goals for this cycle. No further edits can be made. Track your progress on the Dashboard.</p>
        </div>
      )}

      {/* 📝 DRAFT STATE: Pending manager approval (Shows our new component) */}
      {quarterStatus === 'draft' && (
        <GoalDraftView quarter={cycle} userId={userId} apiBaseUrl={apiBaseUrl} />
      )}

      {/* ✍️ EMPTY STATE: Fresh Form to create goals */}
      {quarterStatus === 'empty' && (
        <form onSubmit={handleProceedToReview} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '6rem' }}>
            {goals.map((goal, index) => (
              <div key={goal.id} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <span style={{ fontWeight: '800', color: '#111827', fontSize: '0.9rem', letterSpacing: '0.5px' }}>OBJECTIVE {index + 1}</span>
                  {goals.length > 1 && (
                    <button type="button" onClick={() => handleRemoveGoal(goal.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.2rem', marginBottom: '1.2rem' }}>
                  <div>
                    <label style={labelStyle}>Thrust Area</label>
                    <select value={goal.thrustArea} onChange={(e) => handleUpdateGoal(goal.id, 'thrustArea', e.target.value)} style={inputStyle} required>
                      <option value="">Select Area...</option>
                      {thrustAreas.map(area => <option key={area} value={area}>{area}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Unit of Measure</label>
                    <select value={goal.uom} onChange={(e) => handleUpdateGoal(goal.id, 'uom', e.target.value)} style={inputStyle} required>
                      <option value="">Select UoM...</option>
                      {uomOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Target</label>
                    {!goal.uom && <input type="text" placeholder="Select UoM first" disabled style={{ ...inputStyle, background: '#E5E7EB', cursor: 'not-allowed' }} />}
                    {goal.uom === 'Numeric' && <input type="number" min="0" placeholder="e.g., 5000" value={goal.target} onChange={(e) => handleUpdateGoal(goal.id, 'target', e.target.value)} style={inputStyle} required />}
                    {goal.uom === '%' && (
                      <div style={{ position: 'relative' }}>
                        <input type="number" min="0" max="100" placeholder="e.g., 15" value={goal.target} onChange={(e) => handleUpdateGoal(goal.id, 'target', e.target.value)} style={inputStyle} required />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: '700', fontSize: '0.8rem' }}>%</span>
                      </div>
                    )}
                    {goal.uom === 'Timeline' && <input type="date" value={goal.target} onChange={(e) => handleUpdateGoal(goal.id, 'target', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} required />}
                    {goal.uom === 'Zero-based' && <input type="text" value="Locked at 0" disabled style={{ ...inputStyle, background: '#E5E7EB', color: '#6B7280', fontWeight: '600', cursor: 'not-allowed' }} />}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.2rem' }}>
                  <div>
                    <label style={labelStyle}>Goal Title / Description</label>
                    <input type="text" placeholder="e.g., Reduce TAT by implementing new SOPs" value={goal.title} onChange={(e) => handleUpdateGoal(goal.id, 'title', e.target.value)} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Weightage (%)</label>
                    <div style={{ position: 'relative' }}>
                      <input type="number" placeholder="Min 10%" value={goal.weight} onChange={(e) => handleUpdateGoal(goal.id, 'weight', e.target.value)} style={{ ...inputStyle, border: `1px solid ${(hasLowWeight && Number(goal.weight) < 10) ? '#EF4444' : '#E5E7EB'}`, fontWeight: '600', backgroundColor: '#FFFFFF' }} required />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: '600', fontSize: '0.8rem' }}>%</span>
                    </div>
                    {(goal.weight !== '' && Number(goal.weight) < 10) && <span style={{ color: '#EF4444', fontSize: '0.65rem', fontWeight: '500', marginTop: '0.3rem', display: 'block' }}>Minimum 10% required</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FLOATING ACTION BUTTON */}
          <div 
            style={{ position: 'fixed', bottom: '7rem', right: '3rem', zIndex: 60, display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => setIsFabHovered(true)}
            onMouseLeave={() => setIsFabHovered(false)}
          >
            <div style={{
              background: '#111827', color: '#FFFFFF', padding: '0.5rem 1.2rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '700', marginRight: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', whiteSpace: 'nowrap', pointerEvents: 'none',
              opacity: isFabHovered && !(goals.length >= 8 || totalWeight >= 100) ? 1 : 0,
              transform: isFabHovered && !(goals.length >= 8 || totalWeight >= 100) ? 'translateX(0)' : 'translateX(20px)',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              Add New Objective
            </div>
            <button 
              type="button" onClick={handleAddGoal} disabled={goals.length >= 8 || totalWeight >= 100} 
              style={{ 
                width: '60px', height: '60px', borderRadius: '50%',
                background: (goals.length >= 8 || totalWeight >= 100) ? '#E5E7EB' : 'var(--atomberg-yellow)',
                color: (goals.length >= 8 || totalWeight >= 100) ? '#9CA3AF' : '#000000',
                border: 'none', boxShadow: '0 8px 25px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (goals.length >= 8 || totalWeight >= 100) ? 'not-allowed' : 'pointer',
                transform: isFabHovered && !(goals.length >= 8 || totalWeight >= 100) ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s'
              }}
            >
              <Plus size={32} strokeWidth={2.5} style={{ transition: 'transform 0.4s ease-in-out', transform: isFabHovered && !(goals.length >= 8 || totalWeight >= 100) ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#111827', color: '#FFFFFF', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', border: '2px solid #FFFFFF', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                {goals.length}
              </div>
            </button>
          </div>

          <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-40%)', width: '700px', background: 'rgba(255, 255, 255, 0.90)', backdropFilter: 'blur(12px)', padding: '0.8rem 1.5rem', borderRadius: '50px', border: '1px solid #E5E7EB', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isExactly100 ? <CheckCircle2 size={24} color="#10B981" /> : <AlertCircle size={24} color="#EF4444" />}
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assigned</div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: isExactly100 ? '#10B981' : '#EF4444', lineHeight: '1' }}>
                  {totalWeight}% <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: '500' }}>/ 100%</span>
                </div>
              </div>
            </div>
            <button type="submit" disabled={isSubmitDisabled} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isSubmitDisabled ? '#E5E7EB' : 'var(--atomberg-yellow)', color: isSubmitDisabled ? '#9CA3AF' : '#000000', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: '700', cursor: isSubmitDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', boxShadow: isSubmitDisabled ? 'none' : '0 4px 12px rgba(255, 198, 0, 0.3)' }}>
              <Send size={16} />
              {isExactly100 ? 'REVIEW GOALS' : 'COMPLETE 100%'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GoalSheet;