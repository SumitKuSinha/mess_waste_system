import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Signup request to API Gateway
      const response = await axios.post(
        `http://localhost:5000/api/auth/signup`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        }
      );

      if (response.data.token && response.data.user) {
        setSuccess('Account created successfully! Redirecting...');
        
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('role', response.data.user.role);

        // Redirect based on role
        setTimeout(() => {
          const role = response.data.user.role;
          if (role === 'student') {
            navigate('/student-dashboard');
          } else if (role === 'admin') {
            navigate('/admin-panel');
          } else if (role === 'staff') {
            navigate('/staff-panel');
          }
        }, 1500);
      }
    } catch (err) {
      const errorMessage = 
        err.response?.data?.message || 
        err.message || 
        'Signup failed. Please try again.';
      setError(errorMessage);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box signup-box">
          <div className="auth-header">
            <h1>Smart Mess System</h1>
            <p>Create your account</p>
          </div>

          {error && (
            <div className="error-alert">
              <span className="error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-alert">
              <span className="success-icon">OK</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password (min 6 chars)"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Select Role</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-option ${formData.role === 'student' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('student')}
                  disabled={loading}
                >
                  <span className="role-icon">STU</span>
                  <span className="role-label">Student</span>
                  <span className="role-desc">Submit meal preferences</span>
                </button>

                <button
                  type="button"
                  className={`role-option ${formData.role === 'admin' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('admin')}
                  disabled={loading}
                >
                  <span className="role-icon">ADM</span>
                  <span className="role-label">Admin</span>
                  <span className="role-desc">Manage menu & analytics</span>
                </button>

                <button
                  type="button"
                  className={`role-option ${formData.role === 'staff' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('staff')}
                  disabled={loading}
                >
                  <span className="role-icon">STF</span>
                  <span className="role-label">Staff</span>
                  <span className="role-desc">Track waste & inventory</span>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>

        <div className="auth-illustration">
          <div className="illustration-content">
            <h2>Join Our Community!</h2>
            <p>Be part of the smart meal management revolution.</p>
            <div className="illustration-items">
              <div className="item">Easy to use</div>
              <div className="item">Secure & Private</div>
              <div className="item">Fast Processing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
