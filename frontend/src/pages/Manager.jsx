import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Users, User, LogOut } from 'lucide-react';
import TeamDashboard from '../manager/TeamDashboard';
import GoalApprovals from '../manager/GoalApprovals';
import TeamProgress from '../manager/TeamProgress';
import Profile from './Profile';

// ==========================================
// 🚀 FIX: Custom Scrollbar CSS String (Designer Blue Color & Increased Width)
// ==========================================
const scrollbarCSS = `
  .sidebar-nav-menu::-webkit-scrollbar {
    width: 10px; /* 👈 WIDTH BADHA DI HAI (10px) */
  }
  .sidebar-nav-menu::-webkit-scrollbar-track {
    background: transparent; /* No track background for cleaner look */
    border-radius: 10px;
  }
  .sidebar-nav-menu::-webkit-scrollbar-thumb {
    background-color: #0f1113; /* Designer blue color - clearly visible against yellow */
    border-radius: 10px; /* Fully rounded thumb */
    border: 1px solid var(--atomberg-yellow); /* Small gap around the thumb */
  }
  .sidebar-nav-menu::-webkit-scrollbar-thumb:hover {
    background-color: #0e0e0f; /* Darker blue on hover */
  }
`;

// ==========================================
// COMPONENT 1: THE MANAGER SIDEBAR (Yellow, Rounded & Premium)
// ==========================================
const ManagerSidebar = ({ activeTab, setActiveTab, navigate }) => {
  // 💾 Fetch logged-in user details dynamically from session cache
  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  const managerEmail = sessionUser.email || 'manager@atomberg.com';

  const menuItems = [
    { name: 'Team Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Goal Approvals', icon: <CheckSquare size={20} /> },
    { name: 'Team Progress', icon: <Users size={20} /> },
    { name: 'Profile', icon: <User size={20} /> },
  ];

  // 🚀 HARD RESET LOGOUT ENGINE
  const handleSignOut = () => {
    localStorage.clear();       // Wipe out authorization roles and active session maps
    sessionStorage.clear();     // Purge local master cache parameters completely
    navigate('/', { replace: true }); // Redirect to login screen and clear browser routing stacks
  };

  return (
    <>
      <style>{scrollbarCSS}</style> {/* 🚀 FIX: Injecting the scrollbar styles */}
      <div style={{ 
        boxSizing: 'border-box', /* 🚀 FIX */
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
        <div style={{ padding: '2.5rem 1.5rem 2rem 1.5rem', flexShrink: 0 /* 🚀 FIX */ }}>
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
        <div className="sidebar-nav-menu" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0 0.7rem 0 1rem', overflowY: 'auto', minHeight: 0 /* 🚀 FIX */ }}>
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
                flexShrink: 0 /* 🚀 FIX */
              }}>
              {item.icon}
              {item.name}
            </div>
          ))}
        </div>

        {/* MANAGER PROFILE & SECURE HARD CLEAR LOGOUT */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: 'auto', flexShrink: 0, boxSizing: 'border-box' /* 🚀 FIX */ }}>
          <div style={{ fontSize: '0.8rem', color: '#333', marginBottom: '1rem', paddingLeft: '0.5rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {managerEmail}
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
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
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
// MAIN MANAGER PAGEROUTER
// ==========================================
const Manager = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Team Dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Poppins, sans-serif', backgroundColor: '#F4F6F8' }}>
      
      {/* Sidebar with Manager context */}
      <ManagerSidebar activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '2.5rem 3.5rem', overflowY: 'auto' }}>
        
        {activeTab === 'Team Dashboard' && <TeamDashboard setActiveTab={setActiveTab} />}
        
        {activeTab === 'Goal Approvals' && <GoalApprovals />}
        
        {activeTab === 'Team Progress' && <TeamProgress />}

        {activeTab === 'Profile' && <Profile role="manager" />}
      </div>
    </div>
  );
};

export default Manager;