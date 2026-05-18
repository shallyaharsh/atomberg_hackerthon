import React, { useState, useEffect } from 'react';
import { Calendar, ArrowLeft, MessageSquare, CheckCircle2, Award, Eye, FileText, Loader2 } from 'lucide-react';
import SuccessModal from './SuccessModal'; // 🔥 IMPORTED MODAL HERE

const TeamProgress = () => {
  // --- STATES ---
  // --- STATES ---
  // 🕒 TIME-AWARE QUARTER LOCKING ENGINE
  const currentMonth = new Date().getMonth() + 1; // 1-12
  let activeQIndex = 1;
  if (currentMonth >= 7 && currentMonth <= 9) activeQIndex = 2;
  else if (currentMonth >= 10 && currentMonth <= 12) activeQIndex = 3;
  else if (currentMonth >= 1 && currentMonth <= 3) activeQIndex = 4;

  const [cycle, setCycle] = useState(`Q${activeQIndex}`);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamKpis, setTeamKpis] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [activeRemarkId, setActiveRemarkId] = useState(null);
  const [tempRemark, setTempRemark] = useState('');
  
  // Staging state for manager's final assessments
  const [stagedAssessments, setStagedAssessments] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🔥 NEW STATE FOR MODAL 🔥
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  const managerId = sessionUser.id;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const syncProgressData = async (bypassCache = false) => {
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

  useEffect(() => { syncProgressData(); }, [managerId]);

  const activeQuarterKpis = teamKpis.filter(k => k.quarter === cycle && k.manager_locked === true);

  const currentTeamQueue = teamMembers.map(member => {
    const memberKpis = activeQuarterKpis.filter(k => k.user_id === member.id);
    if (memberKpis.length === 0) return null; 

    const calculatedScore = memberKpis.reduce((sum, k) => {
      if (k.performance_status === 'Completed') return sum + k.weightage;
      if (k.performance_status === 'On Track') return sum + Math.round(k.weightage * 0.5);
      return sum;
    }, 0);

    const kpisWithActivity = memberKpis.filter(k => k.actual_performance);
    const allAssessed = kpisWithActivity.length > 0 && kpisWithActivity.every(k => k.manager_assessment && k.manager_assessment !== '');
    
    return {
      ...member,
      score: `${calculatedScore}%`,
      overallStatus: allAssessed ? 'Reviewed' : 'Pending Review',
      objectives: memberKpis
    };
  }).filter(Boolean);

  const initiateEvaluation = (emp) => {
    setSelectedEmp(emp);
    const initialMap = {};
    emp.objectives.forEach(o => {
      initialMap[o.id] = o.manager_assessment || '';
    });
    setStagedAssessments(initialMap);
  };

  const openRemarkBox = (objId, currentRemark) => {
    setActiveRemarkId(objId);
    setTempRemark(stagedAssessments[objId] || currentRemark || '');
  };

  const saveRemark = (objId) => {
    setStagedAssessments(prev => ({ ...prev, [objId]: tempRemark }));
    setActiveRemarkId(null);
  };

  // 🚀 API DISPATCH: SIGN OFF EVALUATIONS
  const handleFinalSignoff = async () => {
    if (isSubmitting) return;

    // 🚀 STRICT COMPULSORY CHECK: EVERY objective must have an assessment!
    const allAssessed = selectedEmp.objectives.every(obj => 
      stagedAssessments[obj.id] && stagedAssessments[obj.id].trim() !== ''
    );

    if (!allAssessed) {
      alert("⚠️ Compliance Error: You must evaluate and assign a remark to EVERY objective before signing off.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/manager/evaluate-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
          employee_id: selectedEmp.id,
          quarter: cycle,
          evaluations: stagedAssessments
        })
      });

      if (response.ok) {
        // Optimistic State Cache Update
        const updatedKpis = teamKpis.map(kpi => {
          if (kpi.user_id === selectedEmp.id && stagedAssessments[kpi.id]) {
            return { ...kpi, manager_assessment: stagedAssessments[kpi.id] };
          }
          return kpi;
        });

        setTeamKpis(updatedKpis);
        const cacheKey = `atomberg_manager_dashboard_${managerId}`;
        const currentCache = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
        if (currentCache.team_kpis) {
          currentCache.team_kpis = updatedKpis;
          sessionStorage.setItem(cacheKey, JSON.stringify(currentCache));
        }

        const empName = selectedEmp.name; // Save name for modal
        setSelectedEmp(null);
        
        // 🔥 MODAL TRIGGER INSTED OF ALERT 🔥
        setSuccessModal({ isOpen: true, message: `Final assessment signed off for ${empName}.` });
        
        await syncProgressData(true); 
      } else {
        alert("Failed to submit evaluations.");
      }
    } catch (err) {
      alert("Network timeout while submitting evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#4B5563' }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Assembling tracking matrices...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem', position: 'relative' }}>
      
      <style>
        {`
          @keyframes slideUp {
            0% { opacity: 0; transform: translateY(15px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}
      </style>

      {!selectedEmp ? (
        <div className="animate-slide-up">
          <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Team Progress Tracking</h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Monitor actual scores and submit formal check-in appraisal evaluations.</p>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: '#6B7280', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check-in Cycle</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.5rem 1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <Calendar size={16} color="#9CA3AF" style={{ marginRight: '8px' }} />
                
                {/* 🚀 THE FIXED SECURE DROPDOWN */}
                <select 
                  value={cycle} 
                  onChange={(e) => setCycle(e.target.value)} 
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: '700', color: '#111827', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
                >
                  <option value="Q1" disabled={activeQIndex < 1}>Quarter 1 Check-in {activeQIndex < 1 ? '🔒' : ''}</option>
                  <option value="Q2" disabled={activeQIndex < 2}>Quarter 2 Check-in {activeQIndex < 2 ? '🔒' : ''}</option>
                  <option value="Q3" disabled={activeQIndex < 3}>Quarter 3 Check-in {activeQIndex < 3 ? '🔒' : ''}</option>
                  <option value="Q4" disabled={activeQIndex < 4}>Quarter 4 Check-in {activeQIndex < 4 ? '🔒' : ''}</option>
                </select>
                
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '0.95rem', fontWeight: '700' }}>Team Achievement Logs ({cycle})</h3>
            </div>

            <div style={{ padding: '0 1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Employee</th>
                    <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Current Achievement Rate</th>
                    <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Review Status</th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTeamQueue.length > 0 ? (
                    currentTeamQueue.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.85rem' }}>{emp.name}</div>
                          <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: '500', marginTop: '2px' }}>{emp.role}</div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#111827', fontWeight: '800', fontSize: '0.9rem' }}>{emp.score}</span>
                            <div style={{ width: '120px', height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: emp.score, height: '100%', background: '#10B981' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                            backgroundColor: emp.overallStatus === 'Reviewed' ? '#D1FAE5' : '#FEF3C7',
                            color: emp.overallStatus === 'Reviewed' ? '#065F46' : '#92400E'
                          }}>
                            {emp.overallStatus}
                          </span>
                        </td>
                        <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => initiateEvaluation(emp)}
                            style={{ background: '#111827', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={12} /> Evaluate
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontWeight: '600' }}>
                        No approved sheets found for {cycle} tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-slide-up">
          <button 
            onClick={() => { setSelectedEmp(null); setActiveRemarkId(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#4B5563', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}
          >
            <ArrowLeft size={14} /> Back to Team Progress
          </button>

          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 0.2rem 0', color: '#111827', fontSize: '1.5rem', fontWeight: '800' }}>Evaluating Progress: {selectedEmp.name}</h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>{selectedEmp.role} • locked {cycle} scorecard</p>
            </div>
            {selectedEmp.overallStatus === 'Reviewed' && (
              <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.4rem 0.8rem', borderRadius: '30px', fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={12} /> Remarks Signed Off
              </div>
            )}
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem 2rem', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ margin: 0, color: '#111827', fontSize: '0.9rem', fontWeight: '700' }}>KPI Target vs Achievement Audit ({cycle})</h3>
            </div>

            <div style={{ padding: '0 2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35%', padding: '0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>KPI Objective</th>
                    <th style={{ width: '15%', padding: '0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', textAlign: 'right' }}>Target</th>
                    <th style={{ width: '15%', padding: '0.8rem 0', color: '#111827', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', textAlign: 'right', paddingRight: '1.5rem' }}>Actual Logged</th>
                    <th style={{ width: '15%', padding: '0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Status</th>
                    <th style={{ width: '20%', padding: '0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', textAlign: 'right' }}>Manager Evaluation</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmp.objectives.map((obj) => {
                    const currentStoredRemark = stagedAssessments[obj.id] || obj.manager_assessment;
                    return (
                    <React.Fragment key={obj.id}>
                      <tr style={{ borderBottom: activeRemarkId === obj.id ? 'none' : '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1.2rem 0' }}>
                          <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px' }}>{obj.title}</div>
                          <span style={{ fontSize: '0.75rem', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>{obj.thrust_area}</span>
                        </td>
                        <td style={{ padding: '1.2rem 0', color: '#4B5563', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>
                          {obj.uom === '%' ? `${obj.target}%` : obj.target}
                        </td>
                        <td style={{ padding: '1.2rem 0', color: '#10B981', fontWeight: '800', fontSize: '0.9rem', textAlign: 'right', paddingRight: '1.5rem' }}>
                          {obj.actual_performance ? (obj.uom === '%' ? `${obj.actual_performance}%` : obj.actual_performance) : '—'}
                        </td>
                        <td style={{ padding: '1.2rem 0' }}>
                          <span style={{ 
                            padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700',
                            backgroundColor: obj.performance_status === 'Completed' ? '#D1FAE5' : '#DBEAFE',
                            color: obj.performance_status === 'Completed' ? '#065F46' : '#1E40AF'
                          }}>
                            {obj.performance_status}
                          </span>
                        </td>
                        <td style={{ padding: '1.2rem 0', textAlign: 'right' }}>
                            <button 
                              onClick={() => openRemarkBox(obj.id, currentStoredRemark)}
                              style={{ background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', color: '#374151', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <MessageSquare size={12} /> {currentStoredRemark ? 'Edit Note' : 'Add Remark'}
                            </button>
                        </td>
                      </tr>
                      {activeRemarkId === obj.id && (
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td colSpan="5" style={{ padding: '0 0 1rem 0' }}>
                            <div style={{ background: '#F9FAFB', padding: '0.8rem', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', gap: '10px', alignItems: 'center' }}>
                              
                              {/* 🚀 REPLACED INPUT WITH SMART DROPDOWN */}
                              <select 
                                value={tempRemark}
                                onChange={(e) => setTempRemark(e.target.value)}
                                style={{ flex: 1, padding: '0.55rem', border: '1px solid #D1D5DB', borderRadius: '6px', outline: 'none', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", backgroundColor: '#FFFFFF', cursor: 'pointer', color: '#111827' }}
                              >
                                <option value="" disabled>Select corporate appraisal assessment...</option>
                                <option value="⭐ Outstanding: Exceeded targets with exceptional delivery.">⭐ Outstanding: Exceeded targets with exceptional delivery.</option>
                                <option value="✅ Meets Expectations: Successfully achieved planned targets.">✅ Meets Expectations: Successfully achieved planned targets.</option>
                                <option value="⚠️ Needs Improvement: Fell short of expectations, requires focus.">⚠️ Needs Improvement: Fell short of expectations, requires focus.</option>
                                <option value="❌ Not Completed: Objective was dropped or missed entirely.">❌ Not Completed: Objective was dropped or missed entirely.</option>
                              </select>

                              <button onClick={() => saveRemark(obj.id)} disabled={!tempRemark} style={{ background: tempRemark ? '#111827' : '#9CA3AF', color: '#FFF', border: 'none', padding: '0.55rem 1rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: tempRemark ? 'pointer' : 'not-allowed' }}>Stage Note</button>
                              <button onClick={() => setActiveRemarkId(null)} style={{ background: 'transparent', border: '1px solid #D1D5DB', padding: '0.55rem 1rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', color: '#4B5563' }}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {currentStoredRemark && activeRemarkId !== obj.id && (
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td colSpan="5" style={{ padding: '0 2rem 1rem 2rem', backgroundColor: '#FAFAFA' }}>
                            <div style={{ fontSize: '0.75rem', color: '#1F2937', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Award size={14} color="var(--atomberg-yellow)" />
                              <span><strong>Official Assessment:</strong> "{currentStoredRemark}"</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleFinalSignoff}
              disabled={isSubmitting}
              style={{ background: 'var(--atomberg-yellow)', color: '#000000', border: 'none', padding: '0.6rem 2rem', borderRadius: '8px', fontWeight: '800', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(255,198,0,0.15)' }}
            >
              {isSubmitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />} 
              {isSubmitting ? 'Saving Sign-off...' : 'Sign Off Check-in Summary'}
            </button>
          </div>
        </div>
      )}

      {/* 🔥 THE MAGIC REUSABLE SUCCESS MODAL RENDERED HERE 🔥 */}
      <SuccessModal 
        isOpen={successModal.isOpen}
        title="Assessment Completed!"
        message={successModal.message}
        badgeTitle="Evaluation Saved"
        badgeDescription="The final check-in review performance data and your official assessment comments have been locked and emailed to the employee."
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};

export default TeamProgress;