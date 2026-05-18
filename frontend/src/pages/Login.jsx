import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 🔥 .env se API Base URL use ho raha hai yahan
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          password: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      // 💾 SESSION CACHING: Storing entire parsed user object in localStorage
      localStorage.setItem('atomberg_session', JSON.stringify(data.user));

      // 🚦 DYNAMIC ROUTING BASED ON BACKEND RETURNED ROLE
      if (data.user.role === 'employee') {
        navigate('/employee');
      } else if (data.user.role === 'manager') {
        navigate('/manager');
      } else if (data.user.role === 'admin') {
        navigate('/admin');
      }

    } catch (err) {
      console.error("Login Handler Connection Error:", err);
      setError("Cannot reach backend server. Make sure Flask is running!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-modal">
        {/* Left Side - The Brand */}
        <div className="modal-left">
          <div className="logo-wrapper">
            <img 
              src="https://atomberg.com/images/Logo-new.svg" 
              alt="Atomberg Official Logo" 
              className="official-logo" 
            />
          </div>
          <div className="logo-subtext-large">Goal Portal 1.0</div>
        </div>

        {/* Right Side - The Inputs */}
        <div className="modal-right">
          <h2>Portal Login</h2>
          
          {error && <div className="error-text" style={{ color: '#EF4444', backgroundColor: '#FEF2F2', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: '600', border: '1px solid #FEE2E2' }}>{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Work Email</label>
              <input 
                type="email" 
                placeholder="employee@atomberg.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;