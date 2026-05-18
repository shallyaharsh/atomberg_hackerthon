import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Target, CalendarCheck, User, LogOut } from 'lucide-react';
import EmployeeDashboard from '../employee/EmployeeDashboard'; 
import GoalSheet from '../employee/GoalSheet';
import AchievementTracking from '../employee/AchievementTracking';
import Profile from './Profile';

// ==========================================
// 🚀 FIX: Custom Scrollbar CSS String (Designer Blue Color)
// ==========================================
const scrollbarCSS = `
  .sidebar-nav-menu::-webkit-scrollbar {
    width: 10px; /* Narrow and sleek */
  }
  .sidebar-nav-menu::-webkit-scrollbar-track {
    background: transparent; /* No track background for cleaner look */
    border-radius: 10px;
  }
  .sidebar-nav-menu::-webkit-scrollbar-thumb {
    background-color: #25292d; /* Designer blue color - clearly visible against yellow */
    border-radius: 10px; /* Fully rounded thumb */
    border: 1px solid var(--atomberg-yellow); /* Small gap around the thumb */
  }
  .sidebar-nav-menu::-webkit-scrollbar-thumb:hover {
    background-color: #003d80; /* Darker blue on hover */
  }
`;

// ==========================================
// COMPONENT 1: THE SIDEBAR (Fixed Width & Dynamic Session Clearing)
// ==========================================
const Sidebar = ({ activeTab, setActiveTab, navigate }) => {
  // 💾 Fetch logged-in user details dynamically from session cache
  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  const userEmail = sessionUser.email || 'employee@atomberg.com';

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Goal Sheet', icon: <Target size={20} /> },
    { name: 'Achievement Tracking', icon: <CalendarCheck size={20} /> }, 
    { name: 'Profile', icon: <User size={20} /> },
  ];

  // 🚀 HARD RESET LOGOUT ENGINE
  const handleSignOut = () => {
    localStorage.clear();       // Wipe out authorization roles and sessions
    sessionStorage.clear();     // Purge local master goals cache completely
    navigate('/', { replace: true }); // Redirect to login page and flush history stack
  };

  return (
    <>
      <style>{scrollbarCSS}</style> {/* 🚀 FIX: Injecting the scrollbar styles */}
      <div style={{ 
        boxSizing: 'border-box', /* 🚀 FIX: Keeps padding strictly inside */
        width: '280px', 
        backgroundColor: 'var(--atomberg-yellow)', 
        display: 'flex', 
        flexDirection: 'column', 
        margin: '1.2rem', 
        height: 'calc(100vh - 2.4rem)', 
        borderRadius: '24px', 
        boxShadow: '0 10px 30px rgba(255, 198, 0, 0.2)', 
        color: '#000000', 
        overflow: 'hidden',
        flexShrink: 0 
      }}>
        {/* PERFECTLY LEFT-ALIGNED LOGO AREA */}
        <div style={{ padding: '2.5rem 1.5rem 2rem 1.5rem', flexShrink: 0 /* 🚀 FIX: Protects logo from shrinking */ }}>
          <img 
            src="https://atomberg.com/icons/Atomberg-logo.svg?width=256" 
            alt="Atomberg" 
            style={{ width: '130px', display: 'block', marginBottom: '0.3rem', filter: 'brightness(0)' }} 
          />
          <div style={{ 
            fontSize: '0.65rem', 
            color: '#333', 
            letterSpacing: '2px', 
            textTransform: 'uppercase', 
            fontWeight: '800',
            paddingLeft: '2px' 
          }}>
            Performance Portal
          </div>
        </div>

        {/* NAVIGATION MENU */}
        {/* 🚀 FIX: Added className="sidebar-nav-menu" & adjusted padding for scrollbar */}
        <div className="sidebar-nav-menu" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0 0.7rem 0 1rem', overflowY: 'auto', minHeight: 0 }}>
          {menuItems.map((item) => (
            <div 
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.88rem', 
                whiteSpace: 'nowrap', 
                backgroundColor: activeTab === item.name ? '#000000' : 'transparent', 
                color: activeTab === item.name ? 'var(--atomberg-yellow)' : '#222', 
                transition: 'all 0.2s ease',
                flexShrink: 0 /* 🚀 FIX: Keeps menu items proper size */
              }}>
              {item.icon}
              {item.name}
            </div>
          ))}
        </div>

        {/* USER PROFILE & LOGOUT */}
        {/* 🚀 FIX: Added marginTop: 'auto', flexShrink: 0, and boxSizing */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: 'auto', flexShrink: 0, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.8rem', color: '#333', marginBottom: '1rem', paddingLeft: '0.5rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {userEmail}
          </div>
          <button 
            onClick={handleSignOut} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px',
              width: '100%', 
              background: '#000000', 
              border: 'none', 
              color: 'var(--atomberg-yellow)', 
              padding: '0.8rem', 
              borderRadius: '12px', 
              fontWeight: '700', 
              cursor: 'pointer',
              transition: 'transform 0.1s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};


// ==========================================
// MAIN WORKSPACE LAYOUT COMPONENT
// ==========================================
const Employee = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: "'Poppins', sans-serif", backgroundColor: '#F4F6F8' }}>
      
      {/* Premium Floating Yellow Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '2.5rem 3.5rem', overflowY: 'auto' }}>
        
        {activeTab === 'Dashboard' && <EmployeeDashboard />}
        
        {activeTab === 'Goal Sheet' && <GoalSheet />}
        
        {activeTab === 'Achievement Tracking' && <AchievementTracking />}

        {activeTab === 'Profile' && <Profile role="employee" />}
      </div>
    </div>
  );
};

export default Employee;