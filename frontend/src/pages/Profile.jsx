import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, ShieldCheck, KeyRound, Save, Eye, EyeOff, Users, Briefcase } from 'lucide-react';

const Profile = ({ role = 'employee' }) => {
  // 💾 1. Fetch live logged-in user session from storage layers
  const sessionUser = JSON.parse(localStorage.getItem('atomberg_session')) || {};
  
  // 📋 2. Fetch cached team members if the profile is loaded as a manager node
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (role === 'manager' && sessionUser.id) {
      const cacheKey = `atomberg_manager_dashboard_${sessionUser.id}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        setTeamMembers(parsedCache.team_members || []);
      }
    }
  }, [role, sessionUser.id]);

  // --- PASSWORD CHANGE STATES ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill out all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Validation Error: New Password and Confirm Password do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Security Policy: New password must be at least 6 characters long.');
      return;
    }
    
    alert('SUCCESS! Security credentials updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Shared Style Templates
  const infoRowStyle = { display: 'flex', alignItems: 'center', gap: '12px', padding: '0.8rem 0', borderBottom: '1px solid #F3F4F6' };
  const inputStyle = { width: '100%', padding: '0.65rem 1rem', border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none', fontSize: '0.85rem', color: '#111827', fontFamily: "'Poppins', sans-serif" };
  const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#4B5563', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Header View */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px' }}>My Account Profile</h1>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>Manage your personal details, corporate alignment, and security settings.</p>
      </div>

      {/* Two-Column Structured Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* ==========================================
            COLUMN 1: PERSONAL & ALIGNMENT DETAILS (DYNAMIC)
           ========================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Core Info Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #F3F4F6', paddingBottom: '1rem' }}>
              <div style={{ background: 'var(--atomberg-yellow)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', color: '#000000' }}>
                {sessionUser.name ? sessionUser.name.charAt(0) : 'A'}
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#111827', fontSize: '1.1rem', fontWeight: '700' }}>{sessionUser.name || 'Atomberg User'}</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#FFFFFF', background: '#111827', padding: '2px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-block', letterSpacing: '0.5px' }}>
                  {role}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={infoRowStyle}>
                <User size={16} color="#9CA3AF" />
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>System Role</div>
                  <div style={{ fontSize: '0.88rem', color: '#111827', fontWeight: '600', textTransform: 'capitalize' }}>{sessionUser.role || role}</div>
                </div>
              </div>

              <div style={infoRowStyle}>
                <Mail size={16} color="#9CA3AF" />
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Email Address</div>
                  <div style={{ fontSize: '0.88rem', color: '#111827', fontWeight: '600' }}>{sessionUser.email || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 DYNAMIC MAPPING 1: EMPLOYEE SEES MANAGER NAME 🔥 */}
          {role === 'employee' && sessionUser.managerDetails && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '1.5rem 2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#10B981" /> L1 Reporting Manager
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#111827', fontWeight: '700', fontSize: '0.9rem' }}>{sessionUser.managerDetails.name || 'N/A'}</div>
                  <div style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: '2px' }}>{sessionUser.managerDetails.email || 'N/A'}</div>
                </div>
                <span style={{ fontSize: '0.7rem', background: '#D1FAE5', color: '#065F46', fontWeight: '700', padding: '4px 10px', borderRadius: '20px' }}>Active L1</span>
              </div>
            </div>
          )}

          {/* 🔥 DYNAMIC MAPPING 2: MANAGER SEES DIRECT TEAM RE-LIST 🔥 */}
          {role === 'manager' && (
            <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '1.5rem 2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#6B7280', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#1D4ED8" /> My Direct Reports ({teamMembers.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {teamMembers.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>No active direct reports found in cache loop.</p>
                ) : (
                  teamMembers.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 0', borderBottom: '1px solid #F3F4F6' }}>
                      <div style={{ background: '#EFF6FF', padding: '0.4rem', borderRadius: '50%' }}><Briefcase size={14} color="#1D4ED8" /></div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151' }}>{member.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{member.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            COLUMN 2: SECURITY & CHANGE PASSWORD FORM
           ========================================== */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            <KeyRound size={20} color="#111827" />
            <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem', fontWeight: '700' }}>Update Credentials</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass.current ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                <button type="button" onClick={() => setShowPass({ ...showPass, current: !showPass.current })} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                  {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass.new ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} />
                <button type="button" onClick={() => setShowPass({ ...showPass, new: !showPass.new })} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                  {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass.confirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-type new password" style={inputStyle} />
                <button type="button" onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                  {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" style={{ background: '#111827', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '0.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'transform 0.1s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <Save size={14} /> Update Security Key
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;