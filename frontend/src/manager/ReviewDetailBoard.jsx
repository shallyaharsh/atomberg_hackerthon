import React from 'react';
import { Lock, ArrowLeft, RotateCcw, Check, CheckCircle2, Loader2, Edit3 } from 'lucide-react';

const ReviewDetailBoard = ({ 
  cycle, selectedEmp, setSelectedEmp, setSelectedRowIds, setEditingNotes, 
  stagedNotes, setStagedNotes, selectedRowIds, toggleRowSelection, 
  isSubmitting, activeActionId, executeReviewSheetSubmission, 
  handleApprovalTrigger, selectedCount, editingNotes 
}) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            onClick={() => { setSelectedEmp(null); setSelectedRowIds({}); setEditingNotes({}); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#4B5563', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to Submission List
          </button>
        </div>
        
        <div style={{ flex: 2, textAlign: 'center' }}>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '1.6rem', fontWeight: '800' }}>Reviewing: {selectedEmp.name}</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#6B7280', fontSize: '0.85rem', fontWeight: '600' }}>{cycle} Targets Plan</span>
          {selectedEmp.status === 'Approved' && (
            <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.4rem 0.8rem', borderRadius: '30px', fontWeight: '700', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} /> Approved
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
        
        <div style={{ padding: '0.8rem 2rem', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '52px' }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '0.9rem', fontWeight: '700' }}>Proposed KPIs Plan Summary ({cycle})</h3>
          
          {selectedCount > 0 && selectedEmp.status !== 'Approved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4B5563', background: '#E5E7EB', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {selectedCount} Selected
              </span>
              
              <button 
                onClick={() => executeReviewSheetSubmission('revision')}
                disabled={isSubmitting}
                style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {activeActionId === 'bulk-revision' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={14} />}
                Send for revision
              </button>
              
              <button 
                onClick={() => handleApprovalTrigger()}
                disabled={isSubmitting}
                style={{ background: 'var(--atomberg-yellow)', color: '#000000', border: 'none', padding: '0.4rem 1.2rem', borderRadius: '6px', fontWeight: '800', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(255,198,0,0.2)' }}
              >
                {activeActionId === 'bulk-approve' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
                Approve and lock Objective
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '0 2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ width: '5%', padding: '0.8rem 0', borderBottom: '2px solid #E5E7EB' }}></th>
                <th style={{ width: '25%', padding: '0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Thrust Area</th>
                <th style={{ width: '40%', padding: '0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Goal Description</th>
                {/* 🔥 FIXED TARGET & WEIGHT PADDING/ALIGNMENT 🔥 */}
                <th style={{ width: '15%', padding: '0.8rem 2rem 0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', textAlign: 'right' }}>Target</th>
                <th style={{ width: '15%', padding: '0.8rem 1rem 0.8rem 0', color: '#6B7280', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', textAlign: 'right' }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {selectedEmp.goals.map((goal) => (
                <React.Fragment key={goal.id}>
                  <tr style={{ borderBottom: goal.manager_locked ? '1px solid #F3F4F6' : 'none', opacity: goal.manager_locked ? 0.65 : 1, backgroundColor: goal.manager_locked ? '#FAFAFA' : 'transparent', transition: 'all 0.2s' }}>
                    <td style={{ padding: '1.2rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={!!selectedRowIds[goal.id]} 
                        onChange={() => toggleRowSelection(goal.id)}
                        disabled={goal.manager_locked || isSubmitting}
                        style={{ cursor: goal.manager_locked ? 'not-allowed' : 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1.2rem 0', color: '#111827', fontWeight: '700', fontSize: '0.85rem' }}>{goal.thrust_area}</td>
                    <td style={{ padding: '1.2rem 0', color: '#4B5563', fontSize: '0.85rem', paddingRight: '1rem' }}>{goal.title}</td>
                    
                    {/* 🔥 FIXED SPACING FOR TARGET VALUES 🔥 */}
                    <td style={{ padding: '1.2rem 2rem 1.2rem 0', color: '#111827', fontWeight: '600', fontSize: '0.85rem', textAlign: 'right' }}>
                      {goal.uom === '%' ? `${goal.target}%` : `${goal.target}`}
                    </td>
                    
                    {/* 🔥 ALIGNED LOCK ICON HORIZONTALLY NEXT TO WEIGHT 🔥 */}
                    <td style={{ padding: '1.2rem 1rem 1.2rem 0', color: '#111827', fontWeight: '800', fontSize: '0.95rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span>{goal.weightage}%</span>
                        {goal.manager_locked && (
                          <Lock size={14} color="#10B981" title="Locked" />
                        )}
                      </div>
                    </td>
                  </tr>

                  {!goal.manager_locked && (
                    <tr>
                      <td colSpan="5" style={{ padding: '0 0 1.5rem 0', borderBottom: '2px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#F9FAFB', padding: '0.8rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                          
                          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              placeholder="Write feedback notes here..."
                              value={stagedNotes[goal.id] || ''}
                              onChange={(e) => setStagedNotes(prev => ({...prev, [goal.id]: e.target.value}))}
                              disabled={isSubmitting || !editingNotes[goal.id]}
                              style={{ 
                                width: '100%', padding: '0.6rem 2.5rem 0.6rem 1rem', border: '1px solid',
                                borderColor: editingNotes[goal.id] ? 'var(--atomberg-yellow)' : '#D1D5DB', 
                                backgroundColor: editingNotes[goal.id] ? '#FFFFFF' : '#F3F4F6',
                                borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'Poppins', sans-serif", outline: 'none',
                                color: '#111827', transition: 'all 0.2s'
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => setEditingNotes(prev => ({...prev, [goal.id]: true}))}
                              disabled={isSubmitting}
                              style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', color: editingNotes[goal.id] ? '#D97706' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                              title="Edit note"
                            >
                              <Edit3 size={16} />
                            </button>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => executeReviewSheetSubmission('revision', goal.id)}
                              disabled={isSubmitting}
                              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#EF4444', padding: '0.5rem 1rem', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700' }}
                            >
                              {activeActionId === `revision-${goal.id}` ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={14} />}
                              Send for revision
                            </button>
                            
                            <button 
                              onClick={() => handleApprovalTrigger(goal.id)}
                              disabled={isSubmitting}
                              style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', color: '#059669', padding: '0.5rem 1rem', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700' }}
                            >
                              {activeActionId === `approve-${goal.id}` ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                              Approve & lock
                            </button>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetailBoard;