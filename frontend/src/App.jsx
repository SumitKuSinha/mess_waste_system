import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminPanel from './pages/AdminPanel';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* Protected Routes - Require authentication and specific role */}
        <Route path="/admin-panel" element={<ProtectedRoute element={<AdminPanel />} requiredRole="admin" />} />
        <Route path="/student-dashboard" element={<ProtectedRoute element={<StudentDashboard />} requiredRole="student" />} />
        <Route path="/staff-dashboard" element={<ProtectedRoute element={<StaffDashboard />} requiredRole="staff" />} />
      </Routes>
    </Router>
  );
}

export default App;
