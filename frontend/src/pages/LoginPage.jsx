import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login request to API Gateway
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password }
      );

      if (response.data.token && response.data.user) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('role', response.data.user.role);

        // Redirect based on role
        const role = response.data.user.role;
        if (role === 'student') {
          navigate('/student-dashboard');
        } else if (role === 'admin') {
          navigate('/admin-panel');
        } else if (role === 'staff') {
          navigate('/staff-panel');
        }
      }
    } catch (err) {
      const errorMessage = 
        err.response?.data?.message || 
        err.message || 
        'Login failed. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>🍽️ Smart Mess System</h1>
            <p>Login to your account</p>
          </div>

          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
            <p className="forgot-password">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
          </div>

          <div className="demo-info">
            <h4>📝 Demo Credentials</h4>
            <div className="demo-item">
              <strong>Student:</strong>
              <code>student@example.com / password123</code>
            </div>
            <div className="demo-item">
              <strong>Admin:</strong>
              <code>admin@example.com / password123</code>
            </div>
            <div className="demo-item">
              <strong>Staff:</strong>
              <code>staff@example.com / password123</code>
            </div>
          </div>
        </div>

        <div className="auth-illustration">
          <div className="illustration-content">
            <h2>Welcome Back!</h2>
            <p>Access your meal management dashboard and track everything in one place.</p>
            <div className="illustration-items">
              <div className="item">📊 Real-time Analytics</div>
              <div className="item">🍲 Smart Meal Planning</div>
              <div className="item">📈 Waste Tracking</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
