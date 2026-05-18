import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, MessageSquareWarning, Clock, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Lock } from 'lucide-react';
const GoalDraftView = ({ quarter, userId, apiBaseUrl }) => {
  const [draftGoals, setDraftGoals] = useState([]);
  const [lockedWeight, setLockedWeight] = useState(0); 
  const [lockedCount, setLockedCount] = useState(0); // 🚀 TRACKS HOW MANY GOALS ARE ALREADY APPROVED
  const [deletedIds, setDeletedIds] = useState([]); // 🚀 TRACKS DELETED GOALS FOR BACKEND
  
  // 🗑️ EXPLICIT DELETE TRACKER FUNCTION
  const handleDeleteGoal = (id) => {
    if (!String(id).startsWith('new_')) {
      setDeletedIds(prev => [...prev, id]); // Existing goal hai toh backend list me daalo
    }
    // UI se turant hta do
    setDraftGoals(prev => prev.filter(g => g.id !== id));
    setEditingIds(prev => { const next = { ...prev }; delete next[id]; return next; });
    setModifiedGoals(prev => { const next = { ...prev }; delete next[id]; return next; });
  };
  // ⚙️ TRACKING ENGINES FOR BATCH EDITING
  const [editingIds, setEditingIds] = useState({}); 
  const [modifiedGoals, setModifiedGoals] = useState({}); 
  
  const [isSaving, setIsSaving] = useState(false);
  const [isFabHovered, setIsFabHovered] = useState(false); // 🚀 HOVER STATE FOR FLOATING BUTTON

  const thrustAreas = ['Sales & Revenue', 'Operations & SCM', 'Marketing & Brand', 'Product & Engineering', 'HR & Culture', 'Finance'];
  const uomOptions = ['Numeric', '%', 'Timeline', 'Zero-based'];

  // Initialize view from master storage engine
  useEffect(() => {
    const cacheKey = `atomberg_master_goals_${userId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      const allGoals = JSON.parse(cachedData);
      const qGoals = allGoals.filter(g => g.quarter === quarter);
      
      setDraftGoals(qGoals.filter(g => g.manager_locked === false));
      setLockedWeight(qGoals.filter(g => g.manager_locked === true).reduce((sum, g) => sum + g.weightage, 0));
      setLockedCount(qGoals.filter(g => g.manager_locked === true).length);
    }
    setEditingIds({});
    setModifiedGoals({});
  }, [quarter, userId]);

  // Turn on edit mode for a specific row entry
  const startEditingRow = (goal) => {
    setEditingIds(prev => ({ ...prev, [goal.id]: true }));
    setModifiedGoals(prev => ({
      ...prev,
      [goal.id]: {
        id: goal.id,
        title: goal.title,
        thrustArea: goal.thrust_area,
        uom: goal.uom,
        target: goal.target,
        weight: goal.weightage
      }
    }));
  };

  // 🚀 Discard changes (AND DELETE TEMPORARY ROWS IF NEW)
  const cancelEditingRow = (id) => {
    if (String(id).startsWith('new_')) {
      // Temporary row ko puri tarah uda do agar cancel dabaya
      setDraftGoals(prev => prev.filter(g => g.id !== id));
    }
    setEditingIds(prev => { const next = { ...prev }; delete next[id]; return next; });
    setModifiedGoals(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  // Sync value adjustment inside the multi-row staging dictionary
  const handleFieldChange = (id, field, value) => {
    setModifiedGoals(prev => {
      const currentGoal = prev[id];
      let newGoalData = { ...currentGoal, [field]: value };
      
      if (field === 'uom' && value === 'Zero-based') newGoalData.target = '0';
      else if (field === 'uom') newGoalData.target = '';

      return { ...prev, [id]: newGoalData };
    });
  };

  // 🚀 FEATURE: CREATE TEMPORARY ROW FOR NEW OBJECTIVE
  const handleAddNewObjective = () => {
    if (draftGoals.length + lockedCount >= 8) return; // Strict BRD limit check
    
    const newId = `new_${Date.now()}`;
    const newRow = { id: newId, title: '', thrust_area: '', uom: '', target: '', weightage: 0, manager_locked: false };
    
    setDraftGoals([...draftGoals, newRow]);
    setEditingIds(prev => ({ ...prev, [newId]: true }));
    setModifiedGoals(prev => ({
      ...prev,
      [newId]: { id: newId, title: '', thrustArea: '', uom: '', target: '', weight: '' }
    }));
  };

  // ⚖️ REAL-TIME WEIGHT EVALUATOR FOOTER ENGINE
  const dynamicTotalWeight = lockedWeight + draftGoals.reduce((sum, g) => {
    if (modifiedGoals[g.id]) return sum + Number(modifiedGoals[g.id].weight || 0);
    return sum + g.weightage;
  }, 0);

  // 🚀 Check validations (Fixed string strip to .trim())
  const hasValidationErrors = Object.values(modifiedGoals).some(g => {
    if (Number(g.weight) < 10) return true; 
    if (!g.title || g.title.trim() === "") return true; 
    if (g.uom === '%' && (Number(g.target) > 100 || Number(g.target) < 0)) return true;
    if (g.uom === 'Numeric' && Number(g.target) < 0) return true;
    if (!g.thrustArea || !g.uom || g.target === '') return true;
    return false;
  });

  const changesDetected = Object.keys(modifiedGoals).length > 0 || deletedIds.length > 0;
  const isSaveDisabled = dynamicTotalWeight !== 100 || hasValidationErrors || !changesDetected || isSaving;

  // 🚀 BULK COMMIT TRANSACTION SENDER (Handles Updates & Inserts)
  const submitAllBatchChanges = async () => {
    if (isSaveDisabled) return;
    setIsSaving(true);

    const payloadGoals = Object.values(modifiedGoals).filter(modified => {
      // Hamesha naye created objectives ko payload mein bhejo
      if (String(modified.id).startsWith('new_')) return true; 
      
      const original = draftGoals.find(o => o.id === modified.id);
      if (!original) return false;
      return (
        original.title !== modified.title ||
        original.thrust_area !== modified.thrustArea ||
        original.uom !== modified.uom ||
        original.target !== modified.target ||
        original.weightage !== Number(modified.weight)
      );
    });

    if (payloadGoals.length === 0 && deletedIds.length === 0) {
      setEditingIds({}); setModifiedGoals({}); setIsSaving(false); return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/goals/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🚀 UPDATE: Send deleted_ids cleanly to backend
        body: JSON.stringify({ user_id: userId, quarter: quarter, goals: payloadGoals, deleted_ids: deletedIds })
      });

      const data = await response.json();

      if (response.ok) {
        // 🔥 WIPE CACHE SO APP RELOADS FRESH POSTGRES IDs ON REFRESH
        sessionStorage.removeItem(`atomberg_master_goals_${userId}`);
        alert("✨ All changes (including new objectives) saved successfully!");
        window.location.reload(); // Refresh viewport to pull exact real IDs from DB
      } else {
        alert(`Bulk Action Failed: ${data.error}`);
      }
    } catch (err) {
      alert("Network exception encountered during batch operations.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", boxSizing: 'border-box' };

  if (draftGoals.length === 0 && lockedCount === 0) return null;

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '8rem', position: 'relative' }}>
      
      <div style={{ padding: '1.2rem 2rem', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FEF3C7', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Clock size={20} color="#D97706" />
        <div>
          <h3 style={{ margin: 0, color: '#92400E', fontSize: '1.05rem', fontWeight: '700' }}>Pending Manager Approval ({quarter})</h3>
          <p style={{ margin: 0, color: '#B45309', fontSize: '0.85rem' }}>Toggle Edit on any row or add a new objective. Changes accumulate instantly and can be saved all together.</p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', padding: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', width: '35%' }}>Goal Description</th>
              <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', width: '22%' }}>Thrust Area / UoM</th>
              <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', width: '15%' }}>Target</th>
              <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', width: '13%' }}>Weight</th>
              <th style={{ padding: '1rem', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', width: '15%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {draftGoals.map((goal) => {
              const isEditing = !!editingIds[goal.id];
              const activeRowData = modifiedGoals[goal.id] || {};
              // 🚀 NEW FLAG: Check if it's a shared group objective
              const isShared = goal.is_shared === true; 

              return (
                <React.Fragment key={goal.id}>
                  <tr style={{ borderBottom: goal.manager_note ? 'none' : '1px solid #F3F4F6', backgroundColor: isEditing ? (isShared ? '#FEFCE8' : '#F9FAFB') : '#FFFFFF' }}>
                    
                    <td style={{ padding: '1.2rem 1rem' }}>
                      {isEditing ? (
                        <input type="text" placeholder="Goal title..." value={activeRowData.title || ''} onChange={(e) => handleFieldChange(goal.id, 'title', e.target.value)} disabled={isSaving || isShared} style={{...inputStyle, background: isShared ? '#E5E7EB' : 'transparent', cursor: isShared ? 'not-allowed' : 'text'}} />
                      ) : (
                        <div style={{ color: '#111827', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {goal.title}
                          {isShared && <span style={{ background: '#FEF08A', color: '#854D0E', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>GROUP GOAL</span>}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1.2rem 1rem' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <select value={activeRowData.thrustArea || ''} onChange={(e) => handleFieldChange(goal.id, 'thrustArea', e.target.value)} disabled={isSaving || isShared} style={{...inputStyle, background: isShared ? '#E5E7EB' : 'transparent', cursor: isShared ? 'not-allowed' : 'pointer'}}>
                            <option value="" disabled>Select...</option>
                            {thrustAreas.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                          <select value={activeRowData.uom || ''} onChange={(e) => handleFieldChange(goal.id, 'uom', e.target.value)} disabled={isSaving || isShared} style={{...inputStyle, background: isShared ? '#E5E7EB' : 'transparent', cursor: isShared ? 'not-allowed' : 'pointer'}}>
                            <option value="" disabled>Select...</option>
                            {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: '#4B5563', fontWeight: '600', fontSize: '0.85rem' }}>{goal.thrust_area}</div>
                          <div style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: '2px' }}>{goal.uom}</div>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1.2rem 1rem' }}>
                      {isEditing ? (
                        <div>
                          {activeRowData.uom === 'Numeric' && <input type="number" min="0" placeholder="e.g. 50" value={activeRowData.target || ''} onChange={(e) => handleFieldChange(goal.id, 'target', e.target.value)} disabled={isSaving || isShared} style={{...inputStyle, background: isShared ? '#E5E7EB' : 'transparent', cursor: isShared ? 'not-allowed' : 'text'}} />}
                          {activeRowData.uom === '%' && (
                            <div style={{ position: 'relative' }}>
                              <input type="number" min="0" max="100" placeholder="e.g. 10" value={activeRowData.target || ''} onChange={(e) => handleFieldChange(goal.id, 'target', e.target.value)} disabled={isSaving || isShared} style={{...inputStyle, background: isShared ? '#E5E7EB' : 'transparent', cursor: isShared ? 'not-allowed' : 'text'}} />
                              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: '700', fontSize: '0.8rem' }}>%</span>
                            </div>
                          )}
                          {activeRowData.uom === 'Timeline' && <input type="date" value={activeRowData.target || ''} onChange={(e) => handleFieldChange(goal.id, 'target', e.target.value)} disabled={isSaving || isShared} style={{...inputStyle, background: isShared ? '#E5E7EB' : 'transparent', cursor: isShared ? 'not-allowed' : 'pointer'}} />}
                          {activeRowData.uom === 'Zero-based' && <input type="text" value="Locked at 0" disabled style={{ ...inputStyle, background: '#E5E7EB', color: '#6B7280', fontWeight: '600' }} />}
                        </div>
                      ) : (
                        <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.9rem' }}>{goal.uom === '%' ? `${goal.target}%` : goal.target}</div>
                      )}
                    </td>

                    {/* ONLY WEIGHTAGE REMAINS EDITABLE EVEN FOR SHARED GOALS */}
                    <td style={{ padding: '1.2rem 1rem' }}>
                      {isEditing ? (
                        <div style={{ position: 'relative' }}>
                          <input type="number" min="10" max="100" placeholder="Min 10" value={activeRowData.weight || ''} onChange={(e) => handleFieldChange(goal.id, 'weight', e.target.value)} disabled={isSaving} style={{ ...inputStyle, border: Number(activeRowData.weight) < 10 ? '1px solid #EF4444' : '1px solid #D1D5DB', fontWeight: '700', background: '#FFFFFF' }} />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontWeight: '700', fontSize: '0.75rem' }}>%</span>
                        </div>
                      ) : (
                        <div style={{ color: '#111827', fontWeight: '800', fontSize: '0.95rem' }}>{goal.weightage}%</div>
                      )}
                    </td>

                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        
                        {isEditing ? (
                          <button type="button" onClick={() => cancelEditingRow(goal.id)} disabled={isSaving} style={{ background: '#FFFFFF', color: '#EF4444', border: '1px solid #FCA5A5', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <X size={14} /> Cancel
                          </button>
                        ) : (
                          <button type="button" onClick={() => startEditingRow(goal)} disabled={isSaving} style={{ background: '#FFFFFF', color: '#4B5563', border: '1px solid #D1D5DB', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Edit2 size={12} /> Edit
                          </button>
                        )}

                        {/* 🚀 SHARED GOAL PROTECTION LOGIC WITH TRASH ICON */}
                        {isShared ? (
                          <div style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', padding: '0.5rem' }} title="Mandatory Group Goal. Cannot be deleted.">
                            <Lock size={14} /> Shared
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleDeleteGoal(goal.id)}
                            disabled={isSaving}
                            style={{ background: 'transparent', color: '#EF4444', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                            title="Delete Objective"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>

                  {goal.manager_note && !isEditing && (
                    <tr style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FEF2F2' }}>
                      <td colSpan="5" style={{ padding: '0.8rem 1.5rem 1.2rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <MessageSquareWarning size={16} color="#EF4444" style={{ marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#B91C1C', textTransform: 'uppercase', marginBottom: '2px' }}>Manager Feedback</div>
                            <div style={{ fontSize: '0.85rem', color: '#991B1B', fontStyle: 'italic' }}>"{goal.manager_note}"</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🚀 FIXED FLOATING CONSOLE (WITH HOVER FAB & SAVE BUTTON) */}
      <div style={{ 
        position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-28%)', width: '700px',
        backgroundColor: dynamicTotalWeight === 100 ? '#ECFDF5' : '#FEF2F2',
        border: `1px solid ${dynamicTotalWeight === 100 ? '#10B981' : '#FCA5A5'}`,
        padding: '1rem 2rem', borderRadius: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
        {/* Left Side: Weight Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {dynamicTotalWeight === 100 ? <CheckCircle2 size={22} color="#10B981"/> : <AlertCircle size={22} color="#EF4444"/>}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Combined Sheet Metric Load</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: dynamicTotalWeight === 100 ? '#065F46' : '#B91C1C', lineHeight: '1', marginTop: '2px' }}>
              {dynamicTotalWeight}% <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: '500' }}>/ 100%</span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* 🚀 THE NEW HOVER FLOATING PLUS BUTTON */}
          <div 
            onMouseEnter={() => setIsFabHovered(true)}
            onMouseLeave={() => setIsFabHovered(false)}
            style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
          >
            <div style={{
              background: '#111827', color: '#FFFFFF', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', marginRight: '0.5rem', whiteSpace: 'nowrap', pointerEvents: 'none',
              opacity: isFabHovered && (draftGoals.length + lockedCount < 8) ? 1 : 0,
              transform: isFabHovered && (draftGoals.length + lockedCount < 8) ? 'translateX(0)' : 'translateX(10px)',
              transition: 'all 0.3s ease'
            }}>
              New Objective
            </div>
            
            <button 
              onClick={handleAddNewObjective}
              disabled={draftGoals.length + lockedCount >= 8}
              title={draftGoals.length + lockedCount >= 8 ? "Limit Reached (Max 8)" : "Add Objective"}
              style={{
                width: '42px', height: '42px', borderRadius: '50%',
                background: (draftGoals.length + lockedCount >= 8) ? '#E5E7EB' : '#111827',
                color: (draftGoals.length + lockedCount >= 8) ? '#9CA3AF' : '#FFFFFF',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: (draftGoals.length + lockedCount >= 8) ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
                transform: isFabHovered && (draftGoals.length + lockedCount < 8) ? 'scale(1.08)' : 'scale(1)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          <button 
            onClick={submitAllBatchChanges} 
            disabled={isSaveDisabled}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: isSaveDisabled ? '#E5E7EB' : 'var(--atomberg-yellow)', 
              color: isSaveDisabled ? '#9CA3AF' : '#000000', 
              border: 'none', padding: '0.7rem 1.8rem', borderRadius: '30px', 
              fontSize: '0.85rem', fontWeight: '800', 
              cursor: isSaveDisabled ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s ease', 
              boxShadow: isSaveDisabled ? 'none' : '0 4px 15px rgba(255, 198, 0, 0.4)' 
            }}
          >
            {isSaving ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> SAVING PIPELINE...</>
            ) : (
              <><Save size={16} /> SAVE ALL CHANGES</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default GoalDraftView;