import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StaffDashboard.css';

function StaffDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [expectedData, setExpectedData] = useState(null);
  const [wasteData, setWasteData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('input');

  // Load user info on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Fetch expected quantities for selected date
  const handleFetchExpectedQuantities = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/calculate/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExpectedData(data.data);
        // Initialize waste data with ingredient names
        const initialWaste = {};
        
        // Combine all ingredients from all meals
        if (data.data.breakfast) {
          Object.keys(data.data.breakfast).forEach(item => {
            initialWaste[item] = '';
          });
        }
        if (data.data.lunch) {
          Object.keys(data.data.lunch).forEach(item => {
            initialWaste[item] = '';
          });
        }
        if (data.data.dinner) {
          Object.keys(data.data.dinner).forEach(item => {
            initialWaste[item] = '';
          });
        }
        
        setWasteData(initialWaste);
        setMessage('✓ Expected quantities loaded');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setExpectedData(null);
        setWasteData({});
        setMessage('✗ No calculation found for this date. Please ask admin to run calculation.');
      }
    } catch (error) {
      setExpectedData(null);
      setWasteData({});
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update waste data when input changes
  const handleWasteInputChange = (ingredient, value) => {
    setWasteData({
      ...wasteData,
      [ingredient]: value
    });
  };

  // Submit waste data
  const handleSubmitWasteData = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      return;
    }

    if (!expectedData) {
      setMessage('Please fetch expected quantities first');
      return;
    }

    // Validate that at least some data is entered
    const hasData = Object.values(wasteData).some(val => val !== '' && val !== '0');
    if (!hasData) {
      setMessage('Please enter actual quantities for at least one ingredient');
      return;
    }

    // Convert string values to numbers and filter empty ones
    const submissionData = {};
    Object.entries(wasteData).forEach(([ingredient, value]) => {
      if (value !== '' && value !== '0') {
        submissionData[ingredient] = parseFloat(value);
      }
    });

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/waste/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          waste: submissionData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('✓ Waste data submitted successfully');
        // Reset form
        setWasteData({});
        setExpectedData(null);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.message || 'Failed to submit'}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <header className="staff-header">
        <h1>Staff Dashboard</h1>
        <div className="header-actions">
          <div className="header-user">
            <span>{user?.name || user?.email || 'Staff'}</span>
          </div>
          <button 
            className="btn-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="staff-content">
        {/* Message */}
        {message && (
          <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="staff-tabs">
          <button
            className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            Record Actual Usage
          </button>
        </div>

        {/* TAB: INPUT ACTUAL USAGE */}
        {activeTab === 'input' && (
          <div className="tab-content">
            <h2>Record Actual Ingredient Usage</h2>

            {/* Date and Fetch Section */}
            <div className="fetch-section">
              <div className="form-group">
                <label>Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary fetch-btn"
                onClick={handleFetchExpectedQuantities}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load Expected Quantities'}
              </button>
            </div>

            {/* Display Expected Quantities and Input Form */}
            {expectedData ? (
              <div className="usage-form">
                <h3>Date: {selectedDate}</h3>

                {/* Breakfast Section */}
                {expectedData.breakfast && Object.keys(expectedData.breakfast).length > 0 && (
                  <div className="meal-input-section">
                    <h4>Breakfast Ingredients</h4>
                    <div className="ingredients-grid">
                      {Object.entries(expectedData.breakfast).map(([ingredient, expectedQty]) => (
                        <div key={ingredient} className="ingredient-input-row">
                          <label>
                            {ingredient}
                            <span className="expected-qty">
                              (Expected: {expectedQty.toFixed(2)} kg)
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Actual quantity used (kg)"
                            value={wasteData[ingredient] || ''}
                            onChange={(e) => handleWasteInputChange(ingredient, e.target.value)}
                            className="qty-input"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lunch Section */}
                {expectedData.lunch && Object.keys(expectedData.lunch).length > 0 && (
                  <div className="meal-input-section">
                    <h4>Lunch Ingredients</h4>
                    <div className="ingredients-grid">
                      {Object.entries(expectedData.lunch).map(([ingredient, expectedQty]) => (
                        <div key={ingredient} className="ingredient-input-row">
                          <label>
                            {ingredient}
                            <span className="expected-qty">
                              (Expected: {expectedQty.toFixed(2)} kg)
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Actual quantity used (kg)"
                            value={wasteData[ingredient] || ''}
                            onChange={(e) => handleWasteInputChange(ingredient, e.target.value)}
                            className="qty-input"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dinner Section */}
                {expectedData.dinner && Object.keys(expectedData.dinner).length > 0 && (
                  <div className="meal-input-section">
                    <h4>Dinner Ingredients</h4>
                    <div className="ingredients-grid">
                      {Object.entries(expectedData.dinner).map(([ingredient, expectedQty]) => (
                        <div key={ingredient} className="ingredient-input-row">
                          <label>
                            {ingredient}
                            <span className="expected-qty">
                              (Expected: {expectedQty.toFixed(2)} kg)
                            </span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Actual quantity used (kg)"
                            value={wasteData[ingredient] || ''}
                            onChange={(e) => handleWasteInputChange(ingredient, e.target.value)}
                            className="qty-input"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="submit-section">
                  <button
                    className="btn btn-success"
                    onClick={handleSubmitWasteData}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Actual Usage'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Select a date and click "Load Expected Quantities" to begin</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDashboard;
