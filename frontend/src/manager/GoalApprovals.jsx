import React, { useState, useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import ApprovalQueueList from './ApprovalQueueList';
import ReviewDetailBoard from './ReviewDetailBoard';
import SuccessModal from './SuccessModal';
const GoalApprovals = () => {
  // GoalApprovals.jsx ke start mein
  const currentMonth = new Date().getMonth() + 1;
  let activeQIndex = 1;
  if (currentMonth >= 7 && currentMonth <= 9) activeQIndex = 2;
  else if (currentMonth >= 10 && currentMonth <= 12) activeQIndex = 3;
  else if (currentMonth >= 1 && currentMonth <= 3) activeQIndex = 4;

  const [cycle, setCycle] = useState(`Q${activeQIndex}`);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamKpis, setTeamKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [selectedEmp, setSelectedEmp] = useState(null);
  
  const [stagedNotes, setStagedNotes] = useState({});
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [editingNotes, setEditingNotes] = useState({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeActionId, setActiveActionId] = useState(null);

  // Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, targetGoalId: null });

  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  const managerId = sessionUser.id;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const syncWorkspaceData = async (bypassCache = false) => {
    if (!managerId) return;
    
    const cacheKey = `atomberg_manager_dashboard_${managerId}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData && !bypassCache) {
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
      console.error("Communication error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncWorkspaceData();
  }, [managerId]);

  const activeQuarterKpis = teamKpis.filter(k => k.quarter === cycle);

  const approvalQueue = teamMembers.map(member => {
    const memberKpis = activeQuarterKpis.filter(k => k.user_id === member.id);
    if (memberKpis.length === 0) return null;

    const allLocked = memberKpis.every(k => k.manager_locked === true);
    const hasFeedback = memberKpis.some(k => k.manager_note !== null && k.manager_note !== '');
    
    let status = 'Pending Review';
    if (allLocked) status = 'Approved';
    else if (hasFeedback) status = 'Revision Requested';

    const totalWeight = memberKpis.reduce((sum, k) => sum + k.weightage, 0);

    return { ...member, status, totalWeight, goals: memberKpis };
  }).filter(Boolean);

  const initiateDrilldownReview = (emp) => {
    setSelectedEmp(emp);
    setSelectedRowIds({});
    setEditingNotes({}); 
    const initialNotesMap = {};
    emp.goals.forEach(g => {
      initialNotesMap[g.id] = g.manager_note || '';
    });
    setStagedNotes(initialNotesMap);
  };

  const toggleRowSelection = (id) => {
    setSelectedRowIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApprovalTrigger = (goalId = null) => {
    if (!goalId) {
      const selectedCount = Object.values(selectedRowIds).filter(Boolean).length;
      if (selectedCount === 0) {
        alert("Please select at least one objective checkbox first.");
        return;
      }
    }
    setConfirmModal({ isOpen: true, targetGoalId: goalId });
  };

  const executeReviewSheetSubmission = async (actionType, singleGoalId = null) => {
    if (isSubmitting) return;

    let itemsToProcess = [];
    
    if (singleGoalId) {
      itemsToProcess = [{ id: singleGoalId, action: actionType, note: stagedNotes[singleGoalId] || '' }];
      setActiveActionId(`${actionType}-${singleGoalId}`); 
    } else {
      itemsToProcess = Object.keys(selectedRowIds)
        .filter(id => selectedRowIds[id] === true)
        .map(id => ({ id: Number(id), action: actionType, note: stagedNotes[id] || '' }));
      
      setActiveActionId(`bulk-${actionType}`);
      
      if (itemsToProcess.length === 0) {
        alert("Please select at least one objective checkbox first.");
        setActiveActionId(null);
        return;
      }
    }

    if (actionType === 'revision') {
      const missingNotes = itemsToProcess.some(item => !item.note.trim());
      if (missingNotes) {
        setActiveActionId(null);
        alert("Please write a feedback note for the goals you are sending back for revision.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/manager/review-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
          employee_id: selectedEmp.id,
          quarter: cycle,
          updates: itemsToProcess
        })
      });

      const data = await response.json();

      if (response.ok) {
        // 🔥 INSTANT OPTIMISTIC UI & CACHE UPDATE 🔥
        const updatedKpis = teamKpis.map(kpi => {
          const processedItem = itemsToProcess.find(item => item.id === kpi.id);
          if (processedItem) {
            if (processedItem.action === 'approve') {
              // 🚀 ADDED admin_locked: true HERE
              return { ...kpi, manager_locked: true, admin_locked: true, manager_note: null };
            } else if (processedItem.action === 'revision') {
              return { ...kpi, manager_locked: false, manager_note: processedItem.note };
            }
          }
          return kpi;
        });

        // 1. Update Main React State
        setTeamKpis(updatedKpis);

        // 🚀 FIX: UPDATE THE SELECTED EMPLOYEE VIEW INSTANTLY FOR ZERO DELAY 🚀
        setSelectedEmp(prev => {
          if (!prev) return null;
          return {
            ...prev,
            goals: prev.goals.map(g => {
              const processedItem = itemsToProcess.find(item => item.id === g.id);
              if (processedItem) {
                if (processedItem.action === 'approve') {
                  // 🚀 ADDED admin_locked: true HERE TOO
                  return { ...g, manager_locked: true, admin_locked: true, manager_note: null };
                } else if (processedItem.action === 'revision') {
                  return { ...g, manager_locked: false, manager_note: processedItem.note };
                }
              }
              return g;
            })
          };
        });

        // 2. Overwrite Manager's SessionStorage with the locked objectives
        const cacheKey = `atomberg_manager_dashboard_${managerId}`;
        const currentCache = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
        if (currentCache.team_kpis) {
          currentCache.team_kpis = updatedKpis;
          sessionStorage.setItem(cacheKey, JSON.stringify(currentCache));
        }

        // 3. Force-Clear Employee's Caches globally
        localStorage.removeItem(`atomberg_master_goals_${selectedEmp.id}`);
        sessionStorage.removeItem(`atomberg_master_goals_${selectedEmp.id}`);

        setSelectedRowIds({});
        setSuccessModal({ isOpen: true, message: 'The objectives were processed and the employee was notified successfully.' });
        if (!singleGoalId && actionType === 'approve') setSelectedEmp(null); 
        
        // Silently pull fresh data in background
        syncWorkspaceData(true);
      } else {
        alert(`❌ Action Blocked: ${data.error}`);
      }
    } catch (err) {
      alert("Network communication timeout encountered.");
    } finally {
      setIsSubmitting(false);
      setActiveActionId(null);
      setConfirmModal({ isOpen: false, targetGoalId: null });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#4B5563' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Assembling workflow review matrices...</span>
      </div>
    );
  }

  const selectedCount = Object.values(selectedRowIds).filter(Boolean).length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem', position: 'relative' }}>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {!selectedEmp ? (
        <ApprovalQueueList 
          cycle={cycle} 
          setCycle={setCycle} 
          approvalQueue={approvalQueue} 
          initiateDrilldownReview={initiateDrilldownReview} 
        />
      ) : (
        <ReviewDetailBoard 
          cycle={cycle}
          selectedEmp={selectedEmp}
          setSelectedEmp={setSelectedEmp}
          setSelectedRowIds={setSelectedRowIds}
          setEditingNotes={setEditingNotes}
          stagedNotes={stagedNotes}
          setStagedNotes={setStagedNotes}
          selectedRowIds={selectedRowIds}
          toggleRowSelection={toggleRowSelection}
          isSubmitting={isSubmitting}
          activeActionId={activeActionId}
          executeReviewSheetSubmission={executeReviewSheetSubmission}
          handleApprovalTrigger={handleApprovalTrigger}
          selectedCount={selectedCount}
          editingNotes={editingNotes}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#FFFFFF', width: '400px', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ background: '#FEF2F2', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <ShieldAlert size={24} color="#EF4444" />
            </div>
            
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.15rem', fontWeight: '800' }}>Confirm Action Locking</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#6B7280', fontSize: '0.8rem', lineHeight: '1.5' }}>
              Are you sure you want to approve and lock {confirmModal.targetGoalId ? "this objective" : "the selected objectives"}? <b>This action cannot be undone.</b> The employee's metrics will freeze immediately for progress tracking.
            </p>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button 
                onClick={() => setConfirmModal({ isOpen: false, targetGoalId: null })} 
                disabled={isSubmitting} 
                style={{ flex: 1, background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '0.6rem', fontWeight: '600', color: '#4B5563', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false })); 
                  executeReviewSheetSubmission('approve', confirmModal.targetGoalId); 
                }}
                disabled={isSubmitting}
                style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: '8px', padding: '0.6rem', fontWeight: '700', color: '#FFFFFF', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Yes, Lock & Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <SuccessModal 
        isOpen={successModal.isOpen}
        title="Action Successful!"
        message={successModal.message}
        badgeTitle="Employee Notified"
        badgeDescription="An automated email containing your remarks and decisions has been sent to the employee."
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};

export default GoalApprovals;