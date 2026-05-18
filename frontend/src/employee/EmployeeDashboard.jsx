import React, { useState, useEffect } from 'react';
import { Bell, ChevronLeft, ChevronRight, Filter, CircleAlert, Target } from 'lucide-react';

const EmployeeDashboard = () => {
  // --- REAL-TIME STATES ---
  const [masterGoals, setMasterGoals] = useState([]); // 🔥 Holds EVERYTHING
  const [quarter, setQuarter] = useState('Annual'); // 🔥 Default set to Annual
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session'));
  const userName = sessionUser?.name ? sessionUser.name.split(' ')[0] : 'Employee'; 
  const userRole = sessionUser?.role === 'employee' ? 'Senior Growth Executive' : 'Professional';
  const userId = sessionUser?.id;

  // 2. 🚀 THE MASTER CACHE FETCH ENGINE (Runs ONCE per session) 🚀
  useEffect(() => {
    const fetchMasterGoals = async () => {
      if (!userId) return;

      const cacheKey = `atomberg_master_goals_${userId}`;
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        setMasterGoals(JSON.parse(cachedData));
        return; 
      }

      setLoading(true);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        // Hits the route that returns ALL goals (Drafts + Locked)
        const response = await fetch(`${apiBaseUrl}/api/dashboard/goals?user_id=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          sessionStorage.setItem(cacheKey, JSON.stringify(data.goals));
          setMasterGoals(data.goals);
        } else {
          console.error("Dashboard fetch error:", data.error);
        }
      } catch (err) {
        console.error("Network Link Failure:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMasterGoals();
  }, [userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [quarter, statusFilter]);

  // 3. 🔒 FRONTEND DASHBOARD FILTERING LOGIC
  
  // STEP A: Dashboard ONLY cares about Manager Locked goals
  const lockedGoals = masterGoals.filter(g => g.manager_locked === true);

  // STEP B: Filter by Quarter OR show ALL if 'Annual' is selected
  const quarterGoals = quarter === 'Annual' 
    ? lockedGoals 
    : lockedGoals.filter(g => g.quarter === quarter);

  // STEP C: Apply the user's local Status Filter
  const filteredGoals = quarterGoals.filter(goal => {
    const currentStatus = goal.performance_status || 'Not Started';
    return statusFilter === 'All' || currentStatus === statusFilter;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredGoals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGoals = filteredGoals.slice(startIndex, startIndex + itemsPerPage);

  // 🔥 DYNAMIC PERCENTAGE ENGINE (Scales perfectly for Annual view too!)
  const totalWeightInView = quarterGoals.reduce((sum, goal) => sum + goal.weightage, 0);
  const completedWeightInView = quarterGoals
    .filter(g => g.performance_status === 'Completed')
    .reduce((sum, goal) => sum + goal.weightage, 0);
  
  const percentage = totalWeightInView === 0 ? 0 : Math.round((completedWeightInView / totalWeightInView) * 100);

  // SVG Circle Math
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const notifications = [
    { id: 1, text: "Manager approved your Q1 Goal Sheet", time: "2 hours ago", unread: true },
    { id: 2, text: "Reminder: Update actuals for Q1 Check-in", time: "1 day ago", unread: true }
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
      
      <style>
        {`
          @keyframes slideIn { 0% { opacity: 0; transform: translateX(-20px); } 100% { opacity: 1; transform: translateX(0); } }
          .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
          .table-row-hover { transition: all 0.2s ease; background-color: #FFFFFF; }
          .table-row-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); z-index: 10; position: relative; }
        `}
      </style>

      {/* TOP HEADER ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '1.2rem', fontWeight: '700' }}>Dashboard Overview</h2>
        
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifs(!showNotifs)} style={{ background: '#FFF', border: '1px solid #E5E7EB', padding: '0.6rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <Bell size={20} color="#4B5563" />
            {unreadCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: '#EF4444', color: 'white', fontSize: '0.6rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFF' }}>{unreadCount}</span>}
          </button>

          {showNotifs && (
            <div style={{ position: 'absolute', top: '120%', right: 0, width: '320px', background: '#FFF', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', fontWeight: '700', color: '#111827' }}>Notifications</div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: '1rem', borderBottom: '1px solid #F3F4F6', background: n.unread ? '#FEFCE8' : '#FFF', display: 'flex', gap: '10px' }}>
                    <div style={{ marginTop: '2px' }}><CircleAlert size={16} color={n.unread ? "var(--atomberg-yellow)" : "#9CA3AF"} /></div>
                    <div>
                      <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.85rem', color: '#111827', fontWeight: n.unread ? '600' : '400' }}>{n.text}</p>
                      <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOP BANNER */}
      <div style={{ background: '#FFFFFF', padding: '2rem 3rem', borderRadius: '16px', border: '1px solid #E5E7EB', borderLeft: '8px solid var(--atomberg-yellow)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        
        <div className="animate-slide-in" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h1 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Welcome back, <span style={{ color: 'var(--atomberg-yellow)' }}>{userName}</span>
          </h1>
          <div style={{ background: '#F3F4F6', color: '#4B5563', padding: '0.35rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', border: '1px solid #E5E7EB' }}>
            {userRole}
          </div>
        </div>

        {/* Dynamic Circular Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px' }}>
            <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="45" cy="45" r={radius} fill="transparent" stroke="#F3F4F6" strokeWidth="8" />
              <circle cx="45" cy="45" r={radius} fill="transparent" stroke="var(--atomberg-yellow)" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: '800', color: '#111827' }}>
              {percentage}<span style={{ fontSize: '0.8rem', marginLeft: '2px', color: '#4B5563' }}>%</span>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            {quarter === 'Annual' ? 'Annual Total' : quarter} Achieved
          </div>
        </div>
      </div>

      {/* LOCKED GOALS TABLE SECTION */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', paddingBottom: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        
        <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem', fontWeight: '700', marginRight: '1rem' }}>Locked Goals Focus</h3>
            
            {/* 🔥 ADDED ANNUAL OPTION HERE 🔥 */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0.4rem 0.8rem' }}>
              <select value={quarter} onChange={(e) => setQuarter(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: '700', color: '#111827', cursor: 'pointer' }}>
                <option value="Annual">Annual (All Quarters)</option>
                <option value="Q1">Quarter 1</option>
                <option value="Q2">Quarter 2</option>
                <option value="Q3">Quarter 3</option>
                <option value="Q4">Quarter 4</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '0.4rem 0.8rem' }}>
              <Filter size={14} color="#6B7280" style={{ marginRight: '8px' }} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: '600', color: '#4B5563', cursor: 'pointer' }}>
                <option value="All">All Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Track">On Track</option>
                <option value="Not Started">Not Started</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: '600' }}>
              {filteredGoals.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, filteredGoals.length)} of {filteredGoals.length}
            </span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ background: 'transparent', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.3 : 1, padding: '0.2rem' }}>
                <ChevronLeft size={20} color="#111827" />
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} style={{ background: 'transparent', border: 'none', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (currentPage === totalPages || totalPages === 0) ? 0.3 : 1, padding: '0.2rem' }}>
                <ChevronRight size={20} color="#111827" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Table Rendering */}
        <div style={{ padding: '0 1rem', minHeight: '320px' }}>
          {loading ? (
             <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280', fontWeight: '600' }}>Loading your performance data...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '0.5rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40%', padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Goal Description</th>
                  <th style={{ width: '20%', padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Thrust Area</th>
                  <th style={{ width: '15%', padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Target</th>
                  <th style={{ width: '15%', padding: '1rem', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGoals.length > 0 ? (
                  paginatedGoals.map((goal) => {
                    const status = goal.performance_status || 'Not Started';
                    return (
                      <tr key={goal.id} className="table-row-hover" style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1.2rem 1rem', color: '#111827', fontWeight: '600', fontSize: '0.9rem' }}>
                          {goal.title}
                          {/* Small indicator if looking at Annual view to show which quarter this goal belongs to */}
                          {quarter === 'Annual' && <span style={{ display: 'inline-block', marginLeft: '8px', padding: '2px 6px', fontSize: '0.65rem', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: '4px' }}>{goal.quarter}</span>}
                        </td>
                        <td style={{ padding: '1.2rem 1rem', color: '#4B5563', fontWeight: '600', fontSize: '0.85rem' }}>{goal.thrust_area}</td>
                        <td style={{ padding: '1.2rem 1rem', color: '#111827', fontWeight: '700', fontSize: '0.9rem' }}>
                           {goal.uom === '%' ? `${goal.target}%` : goal.target}
                        </td>
                        <td style={{ padding: '1.2rem 1rem' }}>
                          <span style={{ 
                            padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700',
                            backgroundColor: status === 'Completed' ? '#D1FAE5' : status === 'On Track' ? '#DBEAFE' : '#F3F4F6',
                            color: status === 'Completed' ? '#065F46' : status === 'On Track' ? '#1E40AF' : '#4B5563'
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '4rem', textAlign: 'center' }}>
                      <Target size={32} color="#D1D5DB" style={{ marginBottom: '1rem' }} />
                      <div style={{ color: '#4B5563', fontWeight: '600', fontSize: '1rem' }}>No approved goals found for {quarter === 'Annual' ? 'this year' : quarter}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;