import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Phone, Briefcase, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const EmployeeOnboarding = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'employee',
    manager_id: ''
  });

  // Live Error State
  const [liveErrors, setLiveErrors] = useState({
    name: '',
    email: '',
    mobile: '',
    manager_id: ''
  });

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  // 🕒 10-Minute Cache Settings
  const MGR_CACHE_KEY = 'atomberg_onboarding_managers';
  const MGR_CACHE_TIME = 'atomberg_onboarding_managers_time';
  const CACHE_DURATION = 10 * 60 * 1000; // 10 Minutes

  useEffect(() => {
    const cachedStream = sessionStorage.getItem('atomberg_admin_global_stream');
    
    if (cachedStream) {
      const parsed = JSON.parse(cachedStream);
      // 🚀 Blazing Fast Array Map: Extract only required baseline nodes for the dropdown selector
      const extractedManagers = (parsed.hierarchy || []).map(mgr => ({
        id: mgr.id,
        name: mgr.name,
        email: mgr.email
      }));
      setManagers(extractedManagers);
    } else {
      // Fallback fallback trigger if admin navigates directly into onboarding context
      const pullFreshStream = async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/api/admin/global-master-stream`);
          const data = await res.json();
          if (res.ok) {
            sessionStorage.setItem('atomberg_admin_global_stream', JSON.stringify(data));
            const extractedManagers = (data.hierarchy || []).map(mgr => ({
              id: mgr.id, name: mgr.name, email: mgr.email
            }));
            setManagers(extractedManagers);
          }
        } catch (err) {
          console.error("Fallback reference parsing crash:", err);
        }
      };
      pullFreshStream();
    }
  }, [apiBaseUrl]);

  // 🛡️ Live Field Evaluator and Validator
  const validateField = (name, value) => {
    let errorText = '';

    if (name === 'name') {
      if (!value.strip ? !value.trim() : !value.trim()) {
        errorText = 'Full Name is required.';
      } else if (!/^[A-Za-z\s]+$/.test(value)) {
        errorText = 'Name can only contain alphabets and spaces.';
      }
    }

    if (name === 'email') {
      if (!value) {
        errorText = 'Work Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errorText = 'Please enter a valid work email address.';
      }
    }

    if (name === 'mobile') {
      if (!value) {
        errorText = 'Mobile number is required.';
      } else if (value.length !== 10) {
        errorText = 'Mobile number must be exactly 10 digits long.';
      } else if (!/^[6-9]/.test(value)) {
        errorText = 'Mobile number must start with 6, 7, 8, or 9.';
      }
    }

    if (name === 'manager_id' && formData.role === 'employee' && !value) {
      errorText = 'Please assign a manager to this employee.';
    }

    setLiveErrors(prev => ({ ...prev, [name]: errorText }));
    return errorText;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let filteredValue = value;

    // 🔒 Mobile input guard: only digits, max 10 characters
    if (name === 'mobile') {
      filteredValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData(prev => {
      const updatedForm = { ...prev, [name]: filteredValue };
      // Validate field live with updated context
      validateField(name, filteredValue);
      return updatedForm;
    });
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setFormData(prev => ({
      ...prev,
      role: newRole,
      manager_id: newRole === 'manager' ? '' : prev.manager_id
    }));
    setLiveErrors(prev => ({ ...prev, manager_id: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // Trigger explicit complete validation sweep across fields before firing payload
    const e1 = validateField('name', formData.name);
    const e2 = validateField('email', formData.email);
    const e3 = validateField('mobile', formData.mobile);
    const e4 = formData.role === 'employee' ? validateField('manager_id', formData.manager_id) : '';

    if (e1 || e2 || e3 || e4) {
      setErrorMsg('Please resolve all validation errors before proceeding.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          manager_id: formData.role === 'manager' ? null : parseInt(formData.manager_id)
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message);
        setFormData({ name: '', email: '', mobile: '', role: 'employee', manager_id: '' });
        setLiveErrors({ name: '', email: '', mobile: '', manager_id: '' });
        
        // Clear manager cache context to trigger a refresh if a new manager node is registered
        if (formData.role === 'manager') {
          sessionStorage.removeItem(MGR_CACHE_KEY);
          sessionStorage.removeItem(MGR_CACHE_TIME);
        }
      } else {
        setErrorMsg(data.error || 'Failed to onboarding employee account node.');
      }
    } catch (err) {
      setErrorMsg("Server loop coordinator execution crash.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800' }}>Onboard New Hire</h1>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Add a new employee or manager to the Atomberg system.</p>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
        
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#D1FAE5', color: '#065F46', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '600' }}>
            <CheckCircle2 size={20} /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', color: '#991B1B', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: '600', border: '1px solid #FCA5A5' }}>
            <AlertCircle size={20} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Row 1: Name & Mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>Full Name *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', border: liveErrors.name ? '1px solid #EF4444' : '1px solid #D1D5DB', borderRadius: '8px', padding: '0.6rem 1rem', transition: 'border 0.2s' }}>
                <User size={18} color={liveErrors.name ? '#EF4444' : '#9CA3AF'} style={{ marginRight: '10px' }} />
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Rahul Verma" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#111827' }} />
              </div>
              {liveErrors.name && <span style={{ color: '#EF4444', fontSize: '0.78rem', display: 'block', marginTop: '4px', fontWeight: '500' }}>{liveErrors.name}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>Mobile Number *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', border: liveErrors.mobile ? '1px solid #EF4444' : '1px solid #D1D5DB', borderRadius: '8px', padding: '0.6rem 1rem', transition: 'border 0.2s' }}>
                <Phone size={18} color={liveErrors.mobile ? '#EF4444' : '#9CA3AF'} style={{ marginRight: '10px' }} />
                <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required placeholder="9876543210" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#111827' }} />
              </div>
              {liveErrors.mobile && <span style={{ color: '#EF4444', fontSize: '0.78rem', display: 'block', marginTop: '4px', fontWeight: '500' }}>{liveErrors.mobile}</span>}
            </div>
          </div>

          {/* Row 2: Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>Work Email *</label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', border: liveErrors.email ? '1px solid #EF4444' : '1px solid #D1D5DB', borderRadius: '8px', padding: '0.6rem 1rem', transition: 'border 0.2s' }}>
              <Mail size={18} color={liveErrors.email ? '#EF4444' : '#9CA3AF'} style={{ marginRight: '10px' }} />
              <input type="text" name="email" value={formData.email} onChange={handleChange} required placeholder="rahul@atomberg.com" style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#111827' }} />
            </div>
            {liveErrors.email && <span style={{ color: '#EF4444', fontSize: '0.78rem', display: 'block', marginTop: '4px', fontWeight: '500' }}>{liveErrors.email}</span>}
          </div>

          {/* Row 3: Role & Manager Assignment Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>System Role *</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '0.6rem 1rem' }}>
                <Briefcase size={18} color="#9CA3AF" style={{ marginRight: '10px' }} />
                <select name="role" value={formData.role} onChange={handleRoleChange} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#111827', cursor: 'pointer' }}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            {formData.role === 'employee' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>Assign Manager *</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', border: liveErrors.manager_id ? '1px solid #EF4444' : '1px solid #D1D5DB', borderRadius: '8px', padding: '0.6rem 1rem' }}>
                  <UserPlus size={18} color={liveErrors.manager_id ? '#EF4444' : '#9CA3AF'} style={{ marginRight: '10px' }} />
                  <select name="manager_id" value={formData.manager_id} onChange={handleChange} required style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#111827', cursor: 'pointer' }}>
                    <option value="" disabled>Select a manager...</option>
                    {managers.map(mgr => (
                      <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                    ))}
                  </select>
                </div>
                {liveErrors.manager_id && <span style={{ color: '#EF4444', fontSize: '0.78rem', display: 'block', marginTop: '4px', fontWeight: '500' }}>{liveErrors.manager_id}</span>}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #E5E7EB', margin: '1rem 0' }}></div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontStyle: 'italic' }}>* Default password "atomberg123" will be assigned.</span>
            <button 
              type="submit" 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--atomberg-yellow)', color: '#000', border: 'none', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: '800', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={18} />}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EmployeeOnboarding;