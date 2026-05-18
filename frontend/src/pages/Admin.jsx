import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Unlock, FileSpreadsheet, User, LogOut, UserPlus, BarChart3 } from 'lucide-react';
import AdminControlCenter from '../admin/AdminControlCenter';
import ExceptionHandling from '../admin/ExceptionHandling';
import EmployeeOnboarding from '../admin/EmployeeOnboarding';
import CompanyReports from '../admin/CompanyReports';
import AdminAnalytics from '../admin/AdminAnalytics'; // 🚀 IMPORTING THE NEW SCREEN

const AdminSidebar = ({ activeTab, setActiveTab, navigate }) => {
  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  const adminEmail = sessionUser.email || 'hr.admin@atomberg.com';

  const menuItems = [
    { name: 'Control Center', icon: <Shield size={20} /> },
    { name: 'Exception Handling', icon: <Unlock size={20} /> },
    { name: 'Macro Analytics', icon: <BarChart3 size={20} /> }, // 🚀 NEW OPTION ADDED
    { name: 'Company Reports', icon: <FileSpreadsheet size={20} /> },
    { name: 'Onboard Employee', icon: <UserPlus size={20} /> },
    
  ];

  const handleSignOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/', { replace: true });
  };

  return (
    <div style={{ width: '280px', backgroundColor: '#111827', display: 'flex', flexDirection: 'column', margin: '1.2rem', height: 'calc(100vh - 2.4rem)', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', color: '#FFFFFF', flexShrink: 0, overflow: 'hidden' }}>
      
      {/* 🚀 ADDING CUSTOM SCROLLBAR CSS INTERNALLY */}
      <style>
        {`
          .premium-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .premium-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          /* 🟡 BY DEFAULT ATOMBERG YELLOW CODE */
          .premium-scrollbar::-webkit-scrollbar-thumb {
            background: var(--atomberg-yellow); /* Faint white ki jagah direct yellow kar diya */
            border-radius: 10px;
          }
          /* 💡 HOVER EFFECT (OPTIONAL BUT PREMIUM) */
          .premium-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #D9A300; /* Hover karne par thoda sa darker yellow taaki response feel ho */
          }
        `}
      </style>

      {/* TOP LOGO AREA */}
      <div style={{ padding: '2.5rem 1.5rem 2rem 1.5rem', flexShrink: 0 }}>
        <img src="https://atomberg.com/icons/Atomberg-logo.svg?width=256" alt="Atomberg" style={{ width: '130px', display: 'block', marginBottom: '0.3rem', filter: 'brightness(0) invert(1)' }} />
        <div style={{ fontSize: '0.65rem', color: 'var(--atomberg-yellow)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800', paddingLeft: '2px' }}>HR Admin Portal</div>
      </div>

      {/* 🚀 MIDDLE MENU AREA: Added 'premium-scrollbar' class */}
      <div className="premium-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0 1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
        {menuItems.map((item) => (
          <div key={item.name} onClick={() => setActiveTab(item.name)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.85rem 1rem', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', backgroundColor: activeTab === item.name ? 'var(--atomberg-yellow)' : 'transparent', color: activeTab === item.name ? '#000000' : '#9CA3AF', transition: 'all 0.2s ease', flexShrink: 0 }}>
            {item.icon} {item.name}
          </div>
        ))}
      </div>

      {/* BOTTOM FOOTER AREA */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '1rem', paddingLeft: '0.5rem', fontWeight: '600' }}>{adminEmail}</div>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: '#EF4444', border: 'none', color: '#FFFFFF', padding: '0.8rem', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: 'transform 0.1s ease' }} onMouseOver={(e) => e.target.style.transform = 'scale(0.98)'} onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Control Center');

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Poppins, sans-serif', backgroundColor: '#F4F6F8' }}>
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
      <div style={{ flex: 1, padding: '2.5rem 3.5rem', overflowY: 'auto' }}>
        {activeTab === 'Control Center' && <AdminControlCenter setActiveTab={setActiveTab} />}
        {activeTab === 'Exception Handling' && <ExceptionHandling />}
        {activeTab === 'Macro Analytics' && <AdminAnalytics />} {/* 🚀 RENDER COMPONENT */}
        {activeTab === 'Company Reports' && <CompanyReports />}
        {activeTab === 'Onboard Employee' && <EmployeeOnboarding />} 
      </div>
    </div>
  );
};

export default Admin;