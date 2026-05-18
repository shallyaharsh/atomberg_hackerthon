import React, { useState, useEffect } from 'react';
import { Calendar, Lock, Edit2, Save, X, CheckCircle2, Loader2, Target, ChevronLeft, ChevronRight, AlertTriangle, Calculator } from 'lucide-react';

const AchievementTracking = () => {
  // 🕒 TIME-AWARE QUARTER LOCKING ENGINE
  const currentMonth = new Date().getMonth() + 1; // 1-12
  let activeQIndex = 1;
  if (currentMonth >= 7 && currentMonth <= 9) activeQIndex = 2;
  else if (currentMonth >= 10 && currentMonth <= 12) activeQIndex = 3;
  else if (currentMonth >= 1 && currentMonth <= 3) activeQIndex = 4;

  const [cycle, setCycle] = useState(`Q${activeQIndex}`);
  const [trackers, setTrackers] = useState([]);
  
  // 🚀 BATCH EDITING STATES
  const [editingIds, setEditingIds] = useState({}); 
  const [modifiedTrackers, setModifiedTrackers] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // 🚀 PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session'));
  const userId = sessionUser?.id;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // Fetch Approved Goals from Master Cache
  useEffect(() => {
    const fetchApprovedGoals = () => {
      const cacheKey = `atomberg_master_goals_${userId}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        const allGoals = JSON.parse(cachedData);
        // Display goals that are locked by manager (approved targets)
        const approvedForQuarter = allGoals.filter(g => g.quarter === cycle && g.manager_locked === true);

        const formattedTrackers = approvedForQuarter.map(g => ({
          id: g.id,
          thrustArea: g.thrust_area,
          title: g.title,
          uom: g.uom,
          target: g.target,
          weight: g.weightage,
          actual: g.actual_performance || '',
          status: g.performance_status || 'Not Started',
          adminLocked: g.admin_locked 
        }));

        setTrackers(formattedTrackers);
        setEditingIds({});
        setModifiedTrackers({});
        setCurrentPage(1); 
      }
    };

    fetchApprovedGoals();
  }, [cycle, userId]);

  // ========================================================
  // 🧠 SMART SYSTEM-COMPUTED UoM FORMULA ENGINE (BRD ALIGNED)
  // ========================================================
  const computeProgress = (actual, target, uom, title) => {
    if (actual === '' || actual === undefined || actual === null) return { score: 0, status: 'Not Started' };

    let score = 0;
    let status = 'Not Started';

    if (uom === 'Zero-based') {
      score = String(actual) === '0' ? 100 : 0;
      status = score === 100 ? 'Completed' : 'Not Started';
    } 
    else if (uom === 'Timeline') {
      const tDate = new Date(target);
      const aDate = new Date(actual);
      if (aDate <= tDate) {
          score = 100;
          status = 'Completed';
      } else {
          score = 80; // Small penalty for overdue
          status = 'Completed'; 
      }
    } 
    else {
      const a = Number(actual);
      const t = Number(target);

      if (t === 0) {
          score = a > 0 ? 100 : 0;
      } else {
          // 🚀 SMART INFERENCE: "Lower is Better" (TAT, Cost reduction) vs "Higher is Better"
          const isLowerBetter = /reduce|decrease|lower|drop|minimize/i.test(title);
          
          if (isLowerBetter) {
              score = a <= t ? 100 : (t / a) * 100;
          } else {
              score = (a / t) * 100;
          }
      }

      // Cap boundaries
      score = Math.min(Math.max(Math.round(score), 0), 100);

      // Auto-assign logical status block
      if (score >= 100) status = 'Completed';
      else if (score > 0) status = 'On Track';
      else status = 'Not Started';
    }

    return { score, status };
  };

  // Editing handlers
  const startEditingRow = (item) => {
    setEditingIds(prev => ({ ...prev, [item.id]: true }));
    const { score, status } = computeProgress(item.actual, item.target, item.uom, item.title);
    setModifiedTrackers(prev => ({ 
      ...prev, 
      [item.id]: { id: item.id, actual: item.actual, status: status || item.status, computedScore: score } 
    }));
  };

  const cancelEditingRow = (id) => {
    setEditingIds(prev => { const next = { ...prev }; delete next[id]; return next; });
    setModifiedTrackers(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleFieldChange = (id, field, value) => {
    setModifiedTrackers(prev => {
      const item = trackers.find(t => t.id === id);
      let updated = { ...prev[id], [field]: value };

      // 🚀 SYSTEM AUTO-COMPUTE KICKS IN WHEN ACTUAL CHANGES
      if (field === 'actual') {
        const { score, status } = computeProgress(value, item.target, item.uom, item.title);
        updated.status = status;
        updated.computedScore = score;
      }

      return { ...prev, [id]: updated };
    });
  };

  // UoM Validation Boundary
  const getValidationErrorForField = (mod, original) => {
    if (!original || mod.actual === undefined || mod.actual === '') return null;
    if (original.uom === '%' && (Number(mod.actual) > 100 || Number(mod.actual) < 0)) return "Percentage bounds error.";
    if (original.uom === 'Numeric' && Number(mod.actual) < 0) return "Negative numeric value.";
    return null;
  };

  const changesDetected = Object.keys(modifiedTrackers).length > 0;
  
  const modifiedGoalsArray = Object.keys(modifiedTrackers).map(id => {
    const mod = modifiedTrackers[id];
    const original = trackers.find(t => t.id === Number(id));
    return { mod, original, error: getValidationErrorForField(mod, original) };
  });

  const hasValidationErrors = modifiedGoalsArray.some(g => g.error !== null);
  const isSaveDisabled = hasValidationErrors || !changesDetected || isSaving;

  const submitAllBatchChanges = async () => {
    if (isSaveDisabled) return;
    setIsSaving(true);

    // Prepare JSON payload with the System Computed values
    const payloadUpdates = Object.values(modifiedTrackers).map(mod => ({
      id: mod.id,
      actual_performance: mod.actual,
      performance_status: mod.status
    }));

    try {
      const response = await fetch(`${apiBaseUrl}/api/goals/bulk-log-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, quarter: cycle, updates: payloadUpdates })
      });

      const data = await response.json();

      if (response.ok) {
        const freshTrackers = trackers.map(t => {
          if (modifiedTrackers[t.id]) {
            return { ...t, actual: modifiedTrackers[t.id].actual, status: modifiedTrackers[t.id].status };
          }
          return t;
        });
        setTrackers(freshTrackers);

        // 🔄 SYNC MASTER CACHE IMMEDIATELY
        const cacheKey = `atomberg_master_goals_${userId}`;
        const allMasterCache = JSON.parse(sessionStorage.getItem(cacheKey) || '[]');
        const updatedCache = allMasterCache.map(g => {
          if (modifiedTrackers[g.id]) {
            return { ...g, actual_performance: modifiedTrackers[g.id].actual, performance_status: modifiedTrackers[g.id].status };
          }
          return g;
        });
        sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));

        setEditingIds({});
        setModifiedTrackers({});
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      alert("Network exception encountered.");
    } finally {
      setIsSaving(false);
    }
  };

  // PAGINATION LOGIC
  const totalPages = Math.ceil(trackers.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentTrackers = trackers.slice(indexOfFirstItem, indexOfLastItem);

  const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', color: '#111827', fontWeight: '600', fontFamily: "'Poppins', sans-serif", boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: '3rem', transform: 'scale(0.9)', transformOrigin: 'top center', position: 'relative' }}>
      
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* Compact Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#111827', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Progress Check-ins</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Quarter Filter</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.4rem 0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Calendar size={14} color="#9CA3AF" style={{ marginRight: '6px' }} />
            {/* 🚀 FIXED SECURE DROPDOWN FOR ACHIEVEMENT TRACKING */}
            <select 
              value={cycle} 
              onChange={(e) => setCycle(e.target.value)} 
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '700', color: '#111827', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
            >
              <option value="Q1" disabled={activeQIndex < 1}>Quarter 1 (Apr - Jun) {activeQIndex < 1 ? '🔒' : ''}</option>
              <option value="Q2" disabled={activeQIndex < 2}>Quarter 2 (Jul - Sep) {activeQIndex < 2 ? '🔒' : ''}</option>
              <option value="Q3" disabled={activeQIndex < 3}>Quarter 3 (Oct - Dec) {activeQIndex < 3 ? '🔒' : ''}</option>
              <option value="Q4" disabled={activeQIndex < 4}>Quarter 4 (Jan - Mar) {activeQIndex < 4 ? '🔒' : ''}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        
        {/* TABLE HEADER & CONTROLS */}
        <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem', fontWeight: '700' }}>Approved Goals ({cycle})</h3>
            {/* Unsaved Changes Badge */}
            {changesDetected && (
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: hasValidationErrors ? '#991B1B' : '#B45309', backgroundColor: hasValidationErrors ? '#FEF2F2' : '#FEF3C7', border: `1px solid ${hasValidationErrors ? '#FCA5A5' : '#FDE68A'}`, padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hasValidationErrors ? <AlertTriangle size={12} /> : null}
                {modifiedGoalsArray.length} Unsaved {modifiedGoalsArray.length === 1 ? 'Change' : 'Changes'}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#FFFFFF', padding: '0.3rem 0.5rem', borderRadius: '8px', border: '1px solid #D1D5DB' }}>
                 <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ background: 'transparent', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#D1D5DB' : '#4B5563', display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
                 <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280' }}>Page {currentPage} of {totalPages}</span>
                 <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ background: 'transparent', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#D1D5DB' : '#4B5563', display: 'flex', alignItems: 'center' }}><ChevronRight size={16} /></button>
              </div>
            )}
            
            {/* SAVE BUTTON */}
            <button 
              onClick={submitAllBatchChanges} 
              disabled={isSaveDisabled}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: isSaveDisabled ? '#E5E7EB' : 'var(--atomberg-yellow)', 
                color: isSaveDisabled ? '#9CA3AF' : '#000', 
                border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', 
                fontSize: '0.85rem', fontWeight: '700', 
                cursor: isSaveDisabled ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s ease', boxShadow: isSaveDisabled ? 'none' : '0 2px 8px rgba(255, 198, 0, 0.3)'
              }}
            >
              {isSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> SAVING...</> : <><Save size={14} /> SAVE ACTUALS</>}
            </button>
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '1.2rem 2rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB', width: '38%' }}>Objective Details</th>
                <th style={{ padding: '1.2rem 1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB', width: '15%' }}>Target</th>
                <th style={{ padding: '1.2rem 1rem', color: '#111827', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB', width: '17%' }}>Your Actuals</th>
                <th style={{ padding: '1.2rem 1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB', width: '16%' }}>System Status</th>
                <th style={{ padding: '1.2rem 2rem', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E5E7EB', width: '14%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {trackers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: '#6B7280', fontWeight: '500' }}>No approved goals found for tracking in this cycle.</td>
                </tr>
              ) : currentTrackers.map((item) => {
                const isEditing = !!editingIds[item.id];
                const activeData = modifiedTrackers[item.id] || {};
                const isAdminLocked = item.adminLocked; 
                const currentError = modifiedGoalsArray.find(g => g.mod.id === item.id)?.error;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: isEditing ? '#FAFAFA' : '#FFFFFF', transition: 'all 0.2s' }}>
                    
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.95rem', marginBottom: '8px', lineHeight: '1.4' }}>{item.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#6B7280', fontWeight: '500' }}>
                        <Target size={12} color="#9CA3AF" />
                        <span>{item.thrustArea}</span>
                        <span style={{ color: '#D1D5DB' }}>•</span>
                        <span style={{ color: '#4B5563', fontWeight: '700' }}>Weight: {item.weight}%</span>
                      </div>
                    </td>

                    <td style={{ padding: '1.5rem 1rem' }}>
                      <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.95rem' }}>{item.uom === '%' ? `${item.target}%` : item.target}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '0.5px' }}>{item.uom}</div>
                    </td>

                    {/* 🚀 ACTUALS & LIVE COMPUTED SCORE VIEW */}
                    <td style={{ padding: '1.5rem 1rem' }}>
                      {isEditing ? (
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={item.uom === 'Timeline' ? 'date' : 'number'} 
                            value={activeData.actual !== undefined ? activeData.actual : ''} 
                            onChange={(e) => handleFieldChange(item.id, 'actual', e.target.value)} 
                            placeholder="Actual..." 
                            disabled={isSaving} 
                            style={{ ...inputStyle, border: currentError ? '1px solid #EF4444' : '1px solid #D1D5DB' }} 
                          />
                          {item.uom === '%' && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '0.8rem', fontWeight: '700' }}>%</span>}
                          
                          {/* Showing the Computed Score directly to the user! */}
                          {activeData.actual !== '' && activeData.actual !== undefined && (
                            <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: '800', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calculator size={12} /> Score: {activeData.computedScore}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: item.actual ? '#10B981' : '#9CA3AF', fontWeight: '800', fontSize: '1rem' }}>{item.actual ? (item.uom === '%' ? `${item.actual}%` : item.actual) : '—'}</div>
                      )}
                    </td>

                    {/* 🚀 READ-ONLY SYSTEM COMPUTED STATUS */}
                    <td style={{ padding: '1.5rem 1rem' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          <span style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: activeData.status === 'Completed' ? '#D1FAE5' : activeData.status === 'On Track' ? '#DBEAFE' : '#F3F4F6', color: activeData.status === 'Completed' ? '#065F46' : activeData.status === 'On Track' ? '#1E40AF' : '#4B5563', border: `1px solid ${activeData.status === 'Completed' ? '#A7F3D0' : activeData.status === 'On Track' ? '#BFDBFE' : '#E5E7EB'}`, display: 'inline-block', textAlign: 'center' }}>
                            {activeData.status || 'Not Started'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calculator size={10} /> Auto-Computed
                          </span>
                        </div>
                      ) : (
                        <span style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: item.status === 'Completed' ? '#D1FAE5' : item.status === 'On Track' ? '#DBEAFE' : '#F3F4F6', color: item.status === 'Completed' ? '#065F46' : item.status === 'On Track' ? '#1E40AF' : '#4B5563', border: `1px solid ${item.status === 'Completed' ? '#A7F3D0' : item.status === 'On Track' ? '#BFDBFE' : '#E5E7EB'}` }}>
                          {item.status}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                      {isAdminLocked ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F3F4F6', color: '#9CA3AF', border: '1px solid #E5E7EB', padding: '0.5rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700' }}><Lock size={12} /> Admin Locked</div>
                      ) : isEditing ? (
                        <button type="button" onClick={() => cancelEditingRow(item.id)} disabled={isSaving} style={{ background: '#FFFFFF', color: '#EF4444', border: '1px solid #FCA5A5', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><X size={14} /> Cancel</button>
                      ) : (
                        <button type="button" onClick={() => startEditingRow(item)} disabled={isSaving} style={{ background: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Edit2 size={12} /> Edit</button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AchievementTracking;