import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, BarChart3, UtensilsCrossed, Recycle } from 'lucide-react';
import '../styles/Auth.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

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
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

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
          navigate('/staff-dashboard');
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
            <h1>Smart Mess System</h1>
            <p>Login to your account</p>
          </div>

          {error && <p className="auth-error-text">{error}</p>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap input-wrap-email">
                <span className="input-icon" aria-hidden="true">
                  <Mail size={16} />
                </span>
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
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap input-wrap-password">
                <span className="input-icon" aria-hidden="true">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="remember-row">
              <label className="remember-label" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
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

        </div>

        <div className="auth-illustration">
          <div className="illustration-content">
            <h2>Welcome Back!</h2>
            <p>Access your meal management dashboard and track everything in one place.</p>
            <div className="illustration-items">
              <div className="item">
                <span className="item-icon" aria-hidden="true">
                  <BarChart3 size={18} />
                </span>
                <span>Real-time Analytics</span>
              </div>
              <div className="item">
                <span className="item-icon" aria-hidden="true">
                  <UtensilsCrossed size={18} />
                </span>
                <span>Smart Meal Planning</span>
              </div>
              <div className="item">
                <span className="item-icon" aria-hidden="true">
                  <Recycle size={18} />
                </span>
                <span>Waste Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
