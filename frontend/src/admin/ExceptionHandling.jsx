import React, { useState, useEffect } from 'react';
import { Loader2, Filter } from 'lucide-react';
import ManagerAccordion from './ManagerAccordion';
import ObjectiveUnlocker from './ObjectiveUnlocker';

const ExceptionHandling = () => {
  const [loading, setLoading] = useState(true);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1'); 
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const CACHE_KEY = `atomberg_hierarchy_${selectedQuarter}`;
  const CACHE_TIME_KEY = `atomberg_hierarchy_time_${selectedQuarter}`;
  const TEN_MINUTES = 30 * 60 * 1000; 

  useEffect(() => {
    // 🚀 READ INSTANTLY FROM Live Global Master Stream Cache Layer
    const cachedStream = sessionStorage.getItem('atomberg_admin_global_stream');
    
    if (cachedStream) {
      const parsedStream = JSON.parse(cachedStream);
      
      // 🧠 Client-Side Translation Engine: Translate master quarters object to flat structures for accordion view
      const computedHierarchy = (parsedStream.hierarchy || []).map(mgr => ({
        ...mgr,
        employees: (mgr.employees || []).map(emp => {
          const qGoals = emp.quarters ? (emp.quarters[selectedQuarter] || []) : [];
          const hasGoals = qGoals.length > 0;
          return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            admin_lock: hasGoals ? qGoals.some(g => g.admin_locked) : false,
            manager_lock: hasGoals ? qGoals.some(g => g.manager_locked) : false,
            objectives: qGoals
          };
        })
      }));
      
      setHierarchyData(computedHierarchy);
      setLoading(false);
    } else {
      // Fallback network trigger if tab is directly hard-refreshed by admin
      const pullFreshStream = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${apiBaseUrl}/api/admin/global-master-stream`);
          const out = await res.json();
          if (res.ok) {
            sessionStorage.setItem('atomberg_admin_global_stream', JSON.stringify(out));
            window.location.reload(); // Hot-reload view smoothly from fresh cache
          }
        } catch (err) {
          console.error("Fallback snapshot error:", err);
        } finally {
          setLoading(false);
        }
      };
      pullFreshStream();
    }
  }, [selectedQuarter, apiBaseUrl]);

  // 🚀 FIXED: Now accepts unlockType to maintain local cache perfectly
  const handleSuccessfulUnlock = (employeeId, kpiId, unlockType) => {
    // 1. Maintain local visual view state mutations
    const updatedData = hierarchyData.map(manager => ({
      ...manager,
      employees: manager.employees.map(emp => {
        if (emp.id === employeeId) {
          const updatedObjectives = emp.objectives.map(obj => 
            obj.id === kpiId ? { ...obj, admin_locked: false, manager_locked: unlockType === 'targets' ? false : obj.manager_locked } : obj
          );
          return { ...emp, objectives: updatedObjectives, admin_lock: updatedObjectives.some(o => o.admin_locked), manager_lock: updatedObjectives.some(o => o.manager_locked) };
        }
        return emp;
      })
    }));
    setHierarchyData(updatedData);

    // 2. 🚀 HOT SYNC: Update the global core stream cache so other tabs sync without hitting DB!
    const streamCache = sessionStorage.getItem('atomberg_admin_global_stream');
    if (streamCache) {
      const parsedStream = JSON.parse(streamCache);
      parsedStream.hierarchy.forEach(mgr => {
        mgr.employees.forEach(emp => {
          if (emp.id === employeeId) {
            const qGoals = emp.quarters[selectedQuarter] || [];
            qGoals.forEach(g => {
              if (g.id === kpiId) {
                g.admin_locked = false;
                if (unlockType === 'targets') g.manager_locked = false;
              }
            });
          }
        });
      });
      sessionStorage.setItem('atomberg_admin_global_stream', JSON.stringify(parsedStream));
    }
    setSelectedEmployee(prevEmployee => {
      if (!prevEmployee) return prevEmployee;
      const updatedObjectives = prevEmployee.objectives.map(obj => 
        obj.id === kpiId ? { 
          ...obj, 
          admin_locked: false, 
          manager_locked: unlockType === 'targets' ? false : obj.manager_locked 
        } : obj
      );
      return { ...prevEmployee, objectives: updatedObjectives };
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800' }}>Exception Handling</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Override locked goal sheets for revisions.</p>
        </div>
        
        {!selectedEmployee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Cycle:</span>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', outline: 'none' }}
            >
              <option value="Q1">Q1 (Apr - Jun)</option>
              <option value="Q2">Q2 (Jul - Sep)</option>
              <option value="Q3">Q3 (Oct - Dec)</option>
              <option value="Q4">Q4 (Jan - Mar)</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#4B5563' }} />
        </div>
      ) : (
        <>
          {/* 🚀 FIXED ACCORDION BUG: Kept alive in DOM but visually hidden to preserve state */}
          <div style={{ display: selectedEmployee ? 'none' : 'block' }}>
            <ManagerAccordion data={hierarchyData} onSelectEmployee={setSelectedEmployee} />
          </div>
          
          {selectedEmployee && (
            <ObjectiveUnlocker 
              employee={selectedEmployee} 
              quarter={selectedQuarter}
              onBack={() => setSelectedEmployee(null)} 
              onUnlockSuccess={handleSuccessfulUnlock}
              apiBaseUrl={apiBaseUrl}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ExceptionHandling;