import React from 'react';
import { Calendar } from 'lucide-react';

const ApprovalQueueList = ({ cycle, setCycle, approvalQueue, initiateDrilldownReview }) => {
  
  // 🕒 TIME-AWARE QUARTER ENGINE
  const currentMonth = new Date().getMonth() + 1; // 1-12
  let activeQIndex = 1;
  if (currentMonth >= 7 && currentMonth <= 9) activeQIndex = 2;
  else if (currentMonth >= 10 && currentMonth <= 12) activeQIndex = 3;
  else if (currentMonth >= 1 && currentMonth <= 3) activeQIndex = 4;

  return (
    <div>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Goal Approvals</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Review and sign off on your direct reports' proposed target architectures.</p>
        </div>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.4rem 0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Calendar size={14} color="#9CA3AF" style={{ marginRight: '6px' }} />
            
            {/* 🚀 FIXED SECURE DROPDOWN */}
            <select 
              value={cycle} 
              onChange={(e) => setCycle(e.target.value)} 
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '700', color: '#111827', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
            >
              <option value="Q1" disabled={activeQIndex < 1}>Q1 (Apr - Jun) {activeQIndex < 1 ? '🔒' : ''}</option>
              <option value="Q2" disabled={activeQIndex < 2}>Q2 (Jul - Sep) {activeQIndex < 2 ? '🔒' : ''}</option>
              <option value="Q3" disabled={activeQIndex < 3}>Q3 (Oct - Dec) {activeQIndex < 3 ? '🔒' : ''}</option>
              <option value="Q4" disabled={activeQIndex < 4}>Q4 (Jan - Mar) {activeQIndex < 4 ? '🔒' : ''}</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '0.95rem', fontWeight: '700' }}>Review Queue ({cycle} Plans)</h3>
        </div>

        <div style={{ padding: '0 1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Employee</th>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Total Weightage</th>
                <th style={{ padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #E5E7EB' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {approvalQueue.length > 0 ? (
                approvalQueue.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.85rem' }}>{emp.name}</div>
                      <div style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: '500', marginTop: '2px' }}>{emp.role}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#111827', fontWeight: '700', fontSize: '0.85rem' }}>
                      {emp.totalWeight}% <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: '600' }}>(Valid)</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                        backgroundColor: emp.status === 'Approved' ? '#D1FAE5' : emp.status === 'Revision Requested' ? '#FEE2E2' : '#FEF3C7',
                        color: emp.status === 'Approved' ? '#065F46' : emp.status === 'Revision Requested' ? '#991B1B' : '#92400E'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => initiateDrilldownReview(emp)}
                        style={{ background: emp.status === 'Approved' ? '#F3F4F6' : 'var(--atomberg-yellow)', color: '#000000', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        {emp.status === 'Approved' ? 'View Details' : 'Review Sheet'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontWeight: '600' }}>
                    No goals submitted for approval in {cycle}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueueList;