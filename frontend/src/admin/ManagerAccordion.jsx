import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, ArrowRight } from 'lucide-react';

const ManagerAccordion = ({ data, onSelectEmployee }) => {
  const [expandedManagers, setExpandedManagers] = useState({});

  const toggleManager = (managerId) => {
    setExpandedManagers(prev => ({
      ...prev,
      [managerId]: !prev[managerId]
    }));
  };

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#111827', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>Organization Directory</h3>
      
      {data.map((manager) => (
        <div key={manager.id} style={{ marginBottom: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          
          {/* Manager Header Row */}
          <div 
            onClick={() => toggleManager(manager.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: '#F9FAFB', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#DBEAFE', padding: '0.5rem', borderRadius: '50%' }}><User size={18} color="#1D4ED8" /></div>
              <div>
                <div style={{ fontWeight: '700', color: '#111827' }}>{manager.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{manager.email} • {manager.employees.length} Reports</div>
              </div>
            </div>
            {expandedManagers[manager.id] ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
          </div>

          {/* Expanded Employee List */}
          {expandedManagers[manager.id] && (
            <div style={{ padding: '0.5rem 1.5rem 1.5rem 1.5rem', background: '#FFFFFF' }}>
              {manager.employees.map(emp => (
                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Status: <span style={{ color: emp.admin_lock ? '#EF4444' : '#059669' }}>{emp.admin_lock ? 'Locked' : 'Unlocked'}</span></div>
                  </div>
                  <button 
                    onClick={() => onSelectEmployee(emp)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--atomberg-yellow)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Objectives <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ManagerAccordion;