import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'; // 🚀 Added Icons for custom alert
import Login from './pages/Login';
import Employee from './pages/Employee';
import Manager from './pages/Manager';
import Admin from './pages/Admin';
import './App.css';

// ==========================================
// 🚀 MAGIC 1: GLOBAL FETCH INTERCEPTOR (Cookies)
// ==========================================
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const newOptions = {
    ...options,
    credentials: options.credentials || 'include' 
  };
  return originalFetch(url, newOptions);
};

// ==========================================
// 🚀 MAGIC 2: GLOBAL ALERT INTERCEPTOR (Premium UI)
// ==========================================
// Default alert ko hijack karke ek Custom Event fire kar rahe hain
window.alert = (message) => {
  const event = new CustomEvent('atomberg-alert', { detail: message });
  window.dispatchEvent(event);
};

// ==========================================
// 🌟 CUSTOM GLOBAL ALERT COMPONENT
// ==========================================
const GlobalAlertModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAlert = (e) => {
      setMessage(e.detail);
      setIsOpen(true);
    };

    window.addEventListener('atomberg-alert', handleAlert);
    return () => window.removeEventListener('atomberg-alert', handleAlert);
  }, []);

  if (!isOpen) return null;

  // 🧠 Smart detector: Checks message text to set colors & icons automatically
  const isError = message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') || message.includes('❌') || message.includes('⚠️');
  const isSuccess = message.toLowerCase().includes('success') || message.includes('✅') || message.includes('🎉');
  
  const icon = isError ? <AlertCircle size={28} color="#EF4444" /> : isSuccess ? <CheckCircle2 size={28} color="#10B981" /> : <Info size={28} color="#3B82F6" />;
  const color = isError ? '#EF4444' : isSuccess ? '#10B981' : '#3B82F6';
  const bgColor = isError ? '#FEF2F2' : isSuccess ? '#ECFDF5' : '#EFF6FF';
  const borderColor = isError ? '#FCA5A5' : isSuccess ? '#6EE7B7' : '#93C5FD';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      
      <style>
        {`@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}
      </style>

      <div style={{ background: '#FFFFFF', padding: '0', borderRadius: '20px', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E5E7EB', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', overflow: 'hidden' }}>
        
        {/* Top Color Bar & Icon */}
        <div style={{ background: bgColor, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ background: '#FFFFFF', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
            {icon}
          </div>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '1.2rem', fontWeight: '800' }}>
            {isError ? 'Action Failed' : isSuccess ? 'Success' : 'System Notification'}
          </h3>
        </div>

        {/* Message Body */}
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#4B5563', fontSize: '0.95rem', lineHeight: '1.5', fontWeight: '500' }}>
            {/* Remove emojis from the text since we have big icons now */}
            {message.replace(/[✅❌⚠️🎉]/g, '').trim()}
          </p>
        </div>

        {/* Footer Button */}
        <div style={{ padding: '1rem', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ background: color, color: '#FFFFFF', border: 'none', padding: '0.6rem 2.5rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', boxShadow: `0 4px 10px ${color}40`, transition: 'transform 0.1s ease' }}
            onMouseOver={(e) => e.target.style.transform = 'scale(0.96)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Okay, got it
          </button>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// 🛡️ HELPER 1: PROTECTED ROUTE GUARD
// ==========================================
const ProtectedRoute = ({ children, allowedRole }) => {
  const sessionData = localStorage.getItem('atomberg_session');
  if (!sessionData) return <Navigate to="/" replace />;

  const user = JSON.parse(sessionData);
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'employee' ? '/employee' : user.role === 'manager' ? '/manager' : '/admin'} replace />;
  }
  return children;
};

// ==========================================
// 🚦 HELPER 2: PUBLIC ROUTE (AUTO-DASHBOARD REDIRECT)
// ==========================================
const PublicRoute = ({ children }) => {
  const sessionData = localStorage.getItem('atomberg_session');
  if (sessionData) {
    const user = JSON.parse(sessionData);
    if (user.role === 'employee') return <Navigate to="/employee" replace />;
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      {/* 🚀 INJECT GLOBAL ALERT MODAL HERE SO IT WORKS ON EVERY PAGE */}
      <GlobalAlertModal />

      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        
        <Route path="/employee" element={<ProtectedRoute allowedRole="employee"><Employee /></ProtectedRoute>} /> 
        <Route path="/manager" element={<ProtectedRoute allowedRole="manager"><Manager /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><Admin /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;