import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ element, requiredRole }) {
  // Get token and role from localStorage
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // If no token, user is not logged in - redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If role is required, check if user has the required role
  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    if (userRole === 'student') {
      return <Navigate to="/student-dashboard" replace />;
    } else if (userRole === 'admin') {
      return <Navigate to="/admin-panel" replace />;
    } else if (userRole === 'staff') {
      return <Navigate to="/staff-dashboard" replace />;
    }
    // If role doesn't match and no specific redirect, go to login
    return <Navigate to="/login" replace />;
  }

  // Token exists and role matches (if required) - render the component
  return element;
}

export default ProtectedRoute;
