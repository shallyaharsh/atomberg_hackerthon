import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, Activity, Loader2, Filter, Lock, Mail, Zap, AlertTriangle, Unlock, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
const AdminControlCenter = ({ setActiveTab }) => {
  const [masterStream, setMasterStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1'); 
  
  // 🚀 FIXED: Re-introduced unified action loading state to resolve the crash!
  const [actionLoading, setActionLoading] = useState(false);
  const [lockingLoading, setLockingLoading] = useState(false);
  const [unlockingLoading, setUnlockingLoading] = useState(false);
  
  // Modal States
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const STREAM_CACHE_KEY = 'atomberg_admin_global_stream';
  const STREAM_TIME_KEY = 'atomberg_admin_stream_time';
  const CACHE_DURATION = 15 * 60 * 1000; 

  const fetchGlobalStream = async () => {
    const cachedStream = sessionStorage.getItem(STREAM_CACHE_KEY);
    const cachedTime = sessionStorage.getItem(STREAM_TIME_KEY);
    const now = Date.now();

    if (cachedStream && cachedTime && (now - parseInt(cachedTime)) < CACHE_DURATION) {
      setMasterStream(JSON.parse(cachedStream));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/global-master-stream`);
      const data = await response.json();

      if (response.ok) {
        setMasterStream(data);
        sessionStorage.setItem(STREAM_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(STREAM_TIME_KEY, now.toString());
      }
    } catch (err) {
      console.error("Master stream synchronization crash:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStream();
  }, [apiBaseUrl]);

  // ==========================================
  // ⚡ HIGH-SPEED LOCAL DATA COMPILING ENGINE
  // ==========================================
  let approvedSheetsCount = 0;
  let pendingSheetsCount = 0;
  const computedDefaulterManagers = [];

  if (masterStream && masterStream.hierarchy) {
    masterStream.hierarchy.forEach(mgr => {
      const p1PendingEmps = new Set();
      const p2PendingEmps = new Set();
      const ghostEmps = new Set();
      mgr.employees.forEach(emp => {
        const qGoals = emp.quarters[selectedQuarter] || [];
        
        // 🚀 THE GHOST EMPLOYEE CATCHER: If employee made 0 goals, they are instantly flagged as Defaulters!
        if (qGoals.length === 0) {
          p1PendingEmps.add(emp.id);
          ghostEmps.add(emp.id);
          pendingSheetsCount++;
        } else {
          const isSheetApproved = qGoals.every(g => g.manager_locked === true);
          if (isSheetApproved) approvedSheetsCount++;
          else pendingSheetsCount++;

          qGoals.forEach(g => {
            if (!g.manager_locked) {
              p1PendingEmps.add(emp.id); // Phase 1: Not approved by manager
            }
            if (g.actual_performance !== null && (!g.manager_assessment || g.manager_assessment.trim() === '')) {
              p2PendingEmps.add(emp.id); // Phase 2: Actuals logged but not verified by manager
            }
          });
        }
      });

      if (p1PendingEmps.size > 0 || p2PendingEmps.size > 0) {
        computedDefaulterManagers.push({
          mgr_id: mgr.id,
          mgr_name: mgr.name,
          mgr_email: mgr.email,
          phase1_count: p1PendingEmps.size,
          phase2_count: p2PendingEmps.size,
          ghost_count: ghostEmps.size,
          total_pending_emps: p1PendingEmps.size + p2PendingEmps.size
        });
      }
    });
  }

  const hasDefaulters = computedDefaulterManagers.length > 0;

  // ==========================================
  // 🚀 ACTION 1: OPTIMISTIC CYCLE FREEZE (0 Latency Update)
  // ==========================================
  const executeCycleFreeze = async () => {
    setShowFreezeModal(false);
    setLockingLoading(true);
    setActionLoading(true);
    
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/lock-compliant-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter: selectedQuarter })
      });
      
      if (res.ok) {
        alert(`✅ Global Compliance Freeze successfully executed for ${selectedQuarter}!`);
        
        // 🚀 STEP 1: Deep copy the current local master stream
        const updatedStream = JSON.parse(JSON.stringify(masterStream));
        
        // 🚀 STEP 2: Loop through hierarchy and apply HR lock on manager-approved goals
        updatedStream.hierarchy.forEach(mgr => {
          mgr.employees.forEach(emp => {
            const qGoals = emp.quarters[selectedQuarter] || [];
            qGoals.forEach(g => {
              if (g.manager_locked === true) {
                g.admin_locked = true; // Enforce HR lock in local state
              }
            });
          });
        });
        
        // 🚀 STEP 3: Sync React state and SessionStorage instantly without any network call!
        setMasterStream(updatedStream);
        sessionStorage.setItem(STREAM_CACHE_KEY, JSON.stringify(updatedStream));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to the server.");
    } finally {
      setLockingLoading(false);
      setActionLoading(false);
    }
  };

  // ==========================================
  // 🚀 ACTION 2: OPTIMISTIC CHECK-IN OPENER (0 Latency Update)
  // ==========================================
  const executeOpenCheckins = async () => {
    setShowOpenModal(false);
    setUnlockingLoading(true);
    setActionLoading(true);
    
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/open-checkin-window`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter: selectedQuarter })
      });
      
      if (res.ok) {
        alert(`✅ Phase 2 Check-in Window successfully opened for ${selectedQuarter}!`);
        
        // 🚀 STEP 1: Clone current structural snapshot
        const updatedStream = JSON.parse(JSON.stringify(masterStream));
        
        // 🚀 STEP 2: Revoke administrative locks for check-ins
        updatedStream.hierarchy.forEach(mgr => {
          mgr.employees.forEach(emp => {
            const qGoals = emp.quarters[selectedQuarter] || [];
            qGoals.forEach(g => {
              if (g.manager_locked === true) {
                g.admin_locked = false; // Revoke HR lock locally
              }
            });
          });
        });
        
        // 🚀 STEP 3: Hot-swap client state and memory stream cache layer
        setMasterStream(updatedStream);
        sessionStorage.setItem(STREAM_CACHE_KEY, JSON.stringify(updatedStream));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to the server.");
    } finally {
      setUnlockingLoading(false);
      setActionLoading(false);
    }
  };

  // 📧 ESCALATION PING (REAL API TRIGGER)
  const handlePingManager = async (mgrId, mgrName, mgrEmail, p1, p2) => {
    const confirmPing = window.confirm(`⚠️ INITIATE ESCALATION\n\nSend automated warning emails to ${mgrName} and their defaulting team members for ${selectedQuarter}?`);
    
    if (!confirmPing) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/escalation-ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: mgrId, quarter: selectedQuarter })
      });
      
      if (res.ok) {
        alert(`✅ Escalation Protocol Triggered!\nEmails dispatched to ${mgrEmail} and pending employees.`);
      } else {
        alert("Failed to dispatch escalation emails from the server.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while trying to ping.");
    } finally {
      setActionLoading(false);
    }
  };

  // ⚡ SUPER LOCK TRIGGER (0-Latency API + Cache Update)
  const handleSuperLock = async (mgrId, mgrName) => {
    const confirmDirective = window.confirm(`⚠️ SUPER LOCK DIRECTIVE\n\nAre you sure you want to instantly lock ALL pending Phase 1 and Phase 2 sheets for employees under ${mgrName} for ${selectedQuarter}?\n\nThis will bypass manager approval and freeze the data immediately.`);
    
    if (!confirmDirective) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/bulk-super-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: mgrId, quarter: selectedQuarter })
      });
      
      if (res.ok) {
        alert(`✅ Super Lock applied successfully to ${mgrName}'s team!`);
        
        // 🚀 STEP 1: Copy stream context matrix
        const updatedStream = JSON.parse(JSON.stringify(masterStream));
        
        // 🚀 STEP 2: Track down targeted manager node and freeze all profiles
        updatedStream.hierarchy.forEach(mgr => {
          if (mgr.id === mgrId) {
            mgr.employees.forEach(emp => {
              const qGoals = emp.quarters[selectedQuarter] || [];
              
              if (qGoals.length === 0) {
                // Ghost employee fix: force placeholder initialization to clear dashboard counts
                emp.quarters[selectedQuarter] = [{ 
                  manager_locked: true, 
                  admin_locked: true, 
                  manager_assessment: '[Force Locked]' 
                }];
              } else {
                qGoals.forEach(g => {
                  g.manager_locked = true;
                  g.admin_locked = true;
                  
                  // 🔥 FIX: Agar employee ne actual performance daali hai aur manager ka note pending hai,
                  // toh local session cache mein instantly forced sign-off text inject karo!
                  if (g.actual_performance !== null && (!g.manager_assessment || g.manager_assessment.trim() === '')) {
                    g.manager_assessment = '[Force Sign-off by HR Admin Super Lock]';
                  }
                });
              }
            });
          }
        });
        
        // 🚀 STEP 3: Push back to Session Storage cache. Table will automatically clean up!
        setMasterStream(updatedStream);
        sessionStorage.setItem(STREAM_CACHE_KEY, JSON.stringify(updatedStream));
      } else {
        alert("Failed to apply Super Lock directive.");
      }
    } catch (err) {
      console.error(err);
      alert("Server communication error during Super Lock.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !masterStream) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#4B5563' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Streaming Global Compliance Matrix Asset...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out', paddingBottom: '3rem' }}>
      
      {/* TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800' }}>Admin Control Center</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Govern organization-wide compliance, manage cycles, and enforce global locks.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <Filter size={16} color="#6B7280" />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Select Cycle:</span>
          <select 
            value={selectedQuarter} 
            onChange={(e) => setSelectedQuarter(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: '700', color: '#111827', cursor: 'pointer', outline: 'none' }}
          >
            <option value="Q1">Q1 Cycle (Apr - Jun)</option>
            <option value="Q2">Q2 Cycle (Jul - Sep)</option>
            <option value="Q3">Q3 Cycle (Oct - Dec)</option>
            <option value="Q4">Q4 Cycle (Jan - Mar)</option>
          </select>
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280' }}>TOTAL WORKFORCE</span><div style={{ background: '#F3F4F6', padding: '0.5rem', borderRadius: '10px' }}><Users size={16} color="#4B5563" /></div></div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#111827' }}>{masterStream.global_stats.total_employees}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280' }}>TOTAL MANAGERS</span><div style={{ background: '#DBEAFE', padding: '0.5rem', borderRadius: '10px' }}><Activity size={16} color="#1D4ED8" /></div></div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1D4ED8' }}>{masterStream.global_stats.total_managers}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280' }}>APPROVED SHEETS</span><div style={{ background: '#D1FAE5', padding: '0.5rem', borderRadius: '10px' }}><CheckCircle2 size={16} color="#059669" /></div></div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#059669' }}>{approvedSheetsCount}</div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}><span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B7280' }}>PENDING UNVERIFIED</span><div style={{ background: '#FEF3C7', padding: '0.5rem', borderRadius: '10px' }}><Clock size={16} color="#D97706" /></div></div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#D97706' }}>{pendingSheetsCount}</div>
        </div>
      </div>

      {/* 🚀 DUAL-CONTROL PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
        
        {/* Phase 2 Opener Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #6EE7B7', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.05)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ background: '#D1FAE5', padding: '0.6rem', borderRadius: '12px' }}><Unlock size={20} color="#059669" /></div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#065F46' }}>Initiate Check-in Phase</h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Revoke Phase 2 administrative locks. This action opens the portal, allowing all compliant employees to log their actual performance achievements for <b>{selectedQuarter}</b>.
            </p>
          </div>
          <button 
            onClick={() => setShowOpenModal(true)} 
            disabled={unlockingLoading || lockingLoading || actionLoading} 
            style={{ 
              background: unlockingLoading || lockingLoading || actionLoading ? '#A7F3D0' : '#10B981', 
              color: '#FFFFFF', border: 'none', padding: '0.9rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', 
              cursor: unlockingLoading || lockingLoading || actionLoading ? 'not-allowed' : 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' 
            }}
          >
            {unlockingLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Unlock size={18} />}
            {unlockingLoading ? 'Processing Request...' : `Open ${selectedQuarter} Actuals Window`}
          </button>
        </div>

        {/* Global Freeze Card */}
        <div style={{ background: '#111827', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ background: 'var(--atomberg-yellow)', padding: '0.6rem', borderRadius: '12px' }}><Lock size={20} color="#000000" /></div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#FFFFFF' }}>Enforce Cycle Freeze</h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#9CA3AF', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Apply a system-wide administrative lock on all objective sheets for <b>{selectedQuarter}</b>. 
              {hasDefaulters ? <span style={{ color: '#FCA5A5' }}> ⚠️ Disabled until 100% compliance is met.</span> : " This enforces strict compliance and freezes edits."}
            </p>
          </div>
          <button 
            onClick={() => setShowFreezeModal(true)} 
            disabled={hasDefaulters || lockingLoading || unlockingLoading || actionLoading} 
            style={{ 
              background: hasDefaulters ? '#374151' : 'var(--atomberg-yellow)', 
              color: hasDefaulters ? '#9CA3AF' : '#000000', 
              border: 'none', padding: '0.9rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.95rem', 
              cursor: hasDefaulters || lockingLoading || unlockingLoading || actionLoading ? 'not-allowed' : 'pointer', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
              boxShadow: hasDefaulters ? 'none' : '0 4px 12px rgba(255, 198, 0, 0.2)',
              transition: 'all 0.3s'
            }}
          >
            {lockingLoading ? (
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            ) : hasDefaulters ? (
              <ShieldAlert size={18} />
            ) : (
              <Lock size={18} />
            )}
            {lockingLoading ? 'Locking Database...' : hasDefaulters ? 'Resolve Pending First' : 'Execute Global Lock'}
          </button>
        </div>

      </div>

      {/* COMPLIANCE CHECKLIST TABLE FOR DEFECTIVE MANAGERS */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '1.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.2rem', color: '#111827', fontWeight: '800', fontSize: '1.15rem' }}>Defaulter Managers List • Enforcement Tracker</h3>
        {computedDefaulterManagers.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#059669', background: '#D1FAE5', padding: '1.2rem', borderRadius: '12px', fontWeight: '700' }}>
            <CheckCircle size={20} /> 100% Operational Compliance Verified across the company for {selectedQuarter}!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#4B5563', fontWeight: '700' }}>
                <th style={{ padding: '0.75rem' }}>Reporting Line Manager</th>
                <th style={{ padding: '0.75rem' }}>Phase 1 (Approvals Pending)</th>
                <th style={{ padding: '0.75rem' }}>Phase 2 (Evaluations Pending)</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Administrative Actions</th>
              </tr>
            </thead>
            <tbody>
              {computedDefaulterManagers.map((mgr) => (
                <tr key={mgr.mgr_id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '1.2rem 0.75rem' }}>
                    <div style={{ fontWeight: '800', color: '#111827', fontSize: '0.95rem' }}>{mgr.mgr_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{mgr.mgr_email}</div>
                  </td>
                  <td style={{ padding: '1.2rem 0.75rem' }}>
                    {mgr.phase1_count > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>
                          {mgr.phase1_count} profiles pending
                        </span>
                        
                        {/* 🚀 PREMIUM UI LABEL FOR GHOST EMPLOYEES */}
                        {mgr.ghost_count > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800' }}>
                            <AlertCircle size={14} /> {mgr.ghost_count} Missing Goals
                          </span>
                        )}
                      </div>
                    ) : <span style={{ color: '#9CA3AF' }}>—</span>}
                  </td>
                  <td style={{ padding: '1.2rem 0.75rem' }}>
                    {mgr.phase2_count > 0 ? <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>{mgr.phase2_count} profiles</span> : <span style={{ color: '#9CA3AF' }}>—</span>}
                  </td>
                  <td style={{ padding: '1.2rem 0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handlePingManager(mgr.mgr_id, mgr.mgr_name, mgr.mgr_email, mgr.phase1_count, mgr.phase2_count)} 
                        disabled={actionLoading}
                        style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.5rem 1rem', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', opacity: actionLoading ? 0.6 : 1 }}
                      >
                        {actionLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
                        Escalate (Ping)
                      </button>
                      <button 
                        onClick={() => handleSuperLock(mgr.mgr_id, mgr.mgr_name)} 
                        disabled={actionLoading}
                        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.5rem 1rem', borderRadius: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', opacity: actionLoading ? 0.6 : 1 }}
                      >
                        {actionLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                        Force Super Lock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 🛑 CONFIRMATION MODAL 1: CYCLE FREEZE */}
      {showFreezeModal && !hasDefaulters && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', padding: '2.5rem', borderRadius: '24px', maxWidth: '560px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', border: '1px solid #E5E7EB' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', color: '#D97706' }}>
              <div style={{ background: '#FEF3C7', padding: '0.8rem', borderRadius: '14px' }}><Lock size={28} color="#D97706" /></div>
              <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#111827' }}>Confirm Global Freeze</h3>
            </div>
            
            <p style={{ fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              You are about to enforce a system-wide administrative lock on all goal sheets for <b>{selectedQuarter}</b>. This ensures data integrity and prevents further modifications.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowFreezeModal(false)} style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontWeight: '700', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={executeCycleFreeze} style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', border: 'none', background: 'var(--atomberg-yellow)', color: '#000000', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(255, 198, 0, 0.2)' }}>
                <Lock size={18} /> Proceed with Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 CONFIRMATION MODAL 2: INITIATE CHECK-INS */}
      {showOpenModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFFFFF', padding: '2.5rem', borderRadius: '24px', maxWidth: '520px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', border: '1px solid #E5E7EB' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{ background: '#D1FAE5', padding: '0.8rem', borderRadius: '14px' }}><Unlock size={28} color="#059669" /></div>
              <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#111827' }}>Initiate Check-in Phase</h3>
            </div>
            
            <p style={{ fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.6', marginBottom: '2rem' }}>
              Opening the check-in window will revoke administrative locks for all compliant employees, allowing them to officially log their actual performance achievements for <b>{selectedQuarter}</b>.
              <br/><br/>
              <i>Note: Employee targets will remain securely locked by their managers.</i>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowOpenModal(false)} style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontWeight: '700', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={executeOpenCheckins} style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', border: 'none', background: '#10B981', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                <Unlock size={18} /> Open Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminControlCenter;