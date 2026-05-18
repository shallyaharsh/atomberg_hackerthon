import React, { useState } from 'react';
import { ArrowLeft, Unlock, AlertTriangle, CheckCircle, Edit3, Target } from 'lucide-react';

const ObjectiveUnlocker = ({ employee, quarter, onBack, onUnlockSuccess, apiBaseUrl }) => {
  const [selectedKpi, setSelectedKpi] = useState(null); 
  const [unlocking, setUnlocking] = useState(false);

  const handleForceUnlock = async (unlockType) => {
    if (!selectedKpi) return;
    setUnlocking(true);
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/unlock-kpi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpi_id: selectedKpi.id, employee_id: employee.id, unlock_type: unlockType })
      });

      if (response.ok) {
        onUnlockSuccess(employee.id, selectedKpi.id, unlockType); // 🚀 Passed unlockType up
        alert(`Successfully unlocked! Emails dispatched to Employee and Manager.`);
      } else {
        alert("Failed to unlock objective on backend.");
      }
    } catch (err) {
      console.error("Unlock Error:", err);
    } finally {
      setUnlocking(false);
      setSelectedKpi(null);
    }
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2rem', position: 'relative' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E5E7EB', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', marginBottom: '1rem', fontWeight: '600' }}>
            <ArrowLeft size={16} /> Back to Directory
          </button>
          <h2 style={{ margin: '0 0 0.2rem 0', color: '#111827' }}>{employee.name}'s Objectives</h2>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>{employee.email}</p>
        </div>
      </div>

      <div>
        <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>{quarter} KPI Submissions</h4>
        
        {employee.objectives && employee.objectives.length > 0 ? (
          employee.objectives.map((kpi) => {
            const isLocked = kpi.admin_locked === true || kpi.manager_locked === true;

            return (
              <div key={kpi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB', padding: '1.2rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #E5E7EB' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <div style={{ fontWeight: '700', color: '#111827', marginBottom: '0.3rem' }}>{kpi.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '0.5rem' }}>{kpi.description}</div>
                  <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', fontWeight: '600' }}>
                    <span style={{ color: '#1D4ED8' }}>Weightage: {kpi.weightage}%</span>
                    <span style={{ color: '#059669' }}>Target: {kpi.target} {kpi.uom}</span>
                  </div>
                </div>
                
                <div>
                  {isLocked ? (
                    <button 
                      onClick={() => setSelectedKpi(kpi)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#EF4444', color: '#FFF', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      <Unlock size={14} /> Admin Unlock
                    </button>
                  ) : (
                    <button 
                      disabled
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F3F4F6', color: '#9CA3AF', border: '1px solid #E5E7EB', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: '700', cursor: 'not-allowed', fontSize: '0.85rem' }}
                    >
                      <CheckCircle size={14} /> Unlocked
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ color: '#9CA3AF', fontStyle: 'italic', background: '#F9FAFB', padding: '1.5rem', borderRadius: '8px', border: '1px dashed #E5E7EB', textAlign: 'center' }}>
            No objectives found for {quarter}.
          </p>
        )}
      </div>

      {/* 🚀 DUAL-MODE UNLOCK MODAL */}
      {selectedKpi && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', zIndex: 10 }}>
          <div style={{ background: '#FFF', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB', textAlign: 'center', maxWidth: '600px' }}>
            <AlertTriangle size={40} color="#EF4444" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Select Unlock Action</h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              How do you want to unlock <strong style={{ color: '#111827' }}>"{selectedKpi.title}"</strong>?<br/>
              Automated email notifications will be sent to the employee and manager.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              
              <button onClick={() => handleForceUnlock('actuals')} disabled={unlocking} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #6EE7B7', background: '#D1FAE5', color: '#065F46', cursor: 'pointer', fontWeight: '700', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={24} />
                Allow Actuals Update
                <span style={{ fontSize: '0.7rem', fontWeight: '500' }}>(Revokes Admin Lock only)</span>
              </button>

              <button onClick={() => handleForceUnlock('targets')} disabled={unlocking} style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', cursor: 'pointer', fontWeight: '700', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Target size={24} />
                Allow Objective Changes
                <span style={{ fontSize: '0.7rem', fontWeight: '500' }}>(Revokes Both Locks)</span>
              </button>

            </div>

            <button onClick={() => setSelectedKpi(null)} disabled={unlocking} style={{ padding: '0.6rem 2rem', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectiveUnlocker;