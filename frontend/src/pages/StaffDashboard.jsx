import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StaffDashboard.css';

function StaffDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [expectedData, setExpectedData] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [recipeWasteData, setRecipeWasteData] = useState({
    breakfast: {},
    lunch: {},
    dinner: {}
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [inputMode] = useState('v2');
  const [totalWasteBin, setTotalWasteBin] = useState('');
  const [leftoverData, setLeftoverData] = useState({
    breakfast: {},
    lunch: {},
    dinner: {}
  });

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

  // Fetch expected quantities and menu for selected date
  const handleFetchExpectedQuantities = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const calcResponse = await fetch(`http://localhost:5000/api/calculate/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const menuResponse = await fetch(`http://localhost:5000/api/menu/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (calcResponse.ok && menuResponse.ok) {
        const calcData = await calcResponse.json();
        const menu = await menuResponse.json();

        setExpectedData(calcData.data);
        setMenuData(menu);

        const initialRecipeWaste = {
          breakfast: {},
          lunch: {},
          dinner: {}
        };
        const initialLeftovers = {
          breakfast: {},
          lunch: {},
          dinner: {}
        };

        ['breakfast', 'lunch', 'dinner'].forEach((meal) => {
          (menu[meal] || []).forEach((recipeName) => {
            initialRecipeWaste[meal][recipeName] = '';
            initialLeftovers[meal][recipeName] = '';
          });
        });

        setRecipeWasteData(initialRecipeWaste);
        setLeftoverData(initialLeftovers);
        setTotalWasteBin('');
        setMessage('[OK] Menu and expected quantities loaded');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setExpectedData(null);
        setMenuData(null);
        setRecipeWasteData({ breakfast: {}, lunch: {}, dinner: {} });
        setMessage('[ERR] Missing data for this date. Please ask admin to run calculation and verify menu.');
      }
    } catch (error) {
      setExpectedData(null);
      setMenuData(null);
      setRecipeWasteData({ breakfast: {}, lunch: {}, dinner: {} });
      setMessage(`[ERR] Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update recipe wastage quantity (kg)
  const handleRecipeWasteInputChange = (meal, recipeName, value) => {
    setRecipeWasteData((prev) => ({
      ...prev,
      [meal]: {
        ...prev[meal],
        [recipeName]: value
      }
    }));
  };

  // Update leftover quantity (kg)
  const handleLeftoverInputChange = (meal, recipeName, value) => {
    setLeftoverData((prev) => ({
      ...prev,
      [meal]: {
        ...prev[meal],
        [recipeName]: value
      }
    }));
  };

  // Submit recipe-wise wastage quantity data
  const handleSubmitWasteData = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      return;
    }

    if (!expectedData) {
      setMessage('Please fetch expected quantities first');
      return;
    }

    // Validate that at least one recipe has wastage quantity entered
    const hasData = ['breakfast', 'lunch', 'dinner'].some((meal) =>
      Object.values(recipeWasteData[meal] || {}).some((val) => val !== '' && Number(val) > 0)
    );

    if (!hasData) {
      setMessage('Please enter wastage quantity (kg) for at least one recipe');
      return;
    }

    const submissionRecipeWaste = {
      breakfast: {},
      lunch: {},
      dinner: {}
    };

    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      for (const [recipeName, value] of Object.entries(recipeWasteData[meal] || {})) {
        const wasteKg = parseFloat(value);
        if (!Number.isNaN(wasteKg) && wasteKg > 0) {
          submissionRecipeWaste[meal][recipeName] = wasteKg;
        }
      }
    }

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
          recipeWaste: submissionRecipeWaste,
          inputType: 'recipe-kg'
        })
      });

      if (response.ok) {
        setMessage('[OK] Recipe wastage submitted successfully');
        // Reset form
        setRecipeWasteData({ breakfast: {}, lunch: {}, dinner: {} });
        setExpectedData(null);
        setMenuData(null);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`[ERR] Error: ${error.message || 'Failed to submit'}`);
      }
    } catch (error) {
      setMessage(`[ERR] Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Submit v2 waste data (bin waste + leftovers)
  const handleSubmitV2WasteData = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      return;
    }

    if (!expectedData) {
      setMessage('Please fetch expected quantities first');
      return;
    }

    const totalBinKg = parseFloat(totalWasteBin);
    if (Number.isNaN(totalBinKg) || totalBinKg < 0) {
      setMessage('Please enter a valid total waste bin weight (kg)');
      return;
    }

    // Validate that at least one leftover is entered
    const hasLeftoverData = ['breakfast', 'lunch', 'dinner'].some((meal) =>
      Object.values(leftoverData[meal] || {}).some((val) => val !== '' && Number(val) > 0)
    );

    if (!hasLeftoverData) {
      setMessage('Please enter leftover quantity (kg) for at least one recipe');
      return;
    }

    const submissionLeftovers = {
      breakfast: {},
      lunch: {},
      dinner: {}
    };

    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      for (const [recipeName, value] of Object.entries(leftoverData[meal] || {})) {
        const leftoverKg = parseFloat(value);
        if (!Number.isNaN(leftoverKg) && leftoverKg > 0) {
          submissionLeftovers[meal][recipeName] = leftoverKg;
        }
      }
    }

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
          totalWasteBin: totalBinKg,
          leftovers: submissionLeftovers,
          inputType: 'v2-bin-leftover'
        })
      });

      if (response.ok) {
        setMessage('[OK] Waste and leftovers submitted successfully (v2)');
        // Reset form
        setTotalWasteBin('');
        setLeftoverData({ breakfast: {}, lunch: {}, dinner: {} });
        setExpectedData(null);
        setMenuData(null);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`[ERR] Error: ${error.message || 'Failed to submit'}`);
      }
    } catch (error) {
      setMessage(`[ERR] Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
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
          <div className={`message ${message.startsWith('[OK]') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="staff-tabs">
          <button
            className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            Record Waste
          </button>
        </div>

        <div className="input-mode-selector">
          <label>Input Mode:</label>
          <div className="mode-buttons">
            <button className="mode-btn active" disabled>
              v2: Bin Waste + Leftovers
            </button>
          </div>
        </div>

        {/* TAB: INPUT RECIPE WASTAGE */}
        {activeTab === 'input' && (
          <div className="tab-content">
            {/* V1 MODE: Recipe Waste Input */}
            {false && (
              <>
                <h2>Mode: Record Recipe Waste (kg)</h2>

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
                    {loading ? 'Loading...' : 'Load Menu & Expected Data'}
                  </button>
                </div>

                {/* Display menu recipes and recipe-wastage input form */}
                {expectedData && menuData ? (
                  <div className="usage-form">
                    <h3>Date: {selectedDate}</h3>

                    {/* Breakfast Section */}
                    {menuData.breakfast && menuData.breakfast.length > 0 && (
                      <div className="meal-input-section">
                        <h4>
                          Breakfast Recipes
                          {expectedData.mealCounts?.breakfast !== undefined ? ` (Expected servings: ${expectedData.mealCounts.breakfast})` : ''}
                        </h4>
                        <div className="ingredients-grid">
                          {menuData.breakfast.map((recipeName) => (
                            <div key={recipeName} className="ingredient-input-row">
                              <label>
                                {recipeName}
                                <span className="expected-qty">Waste (kg)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter waste quantity in kg"
                                value={recipeWasteData.breakfast?.[recipeName] || ''}
                                onChange={(e) => handleRecipeWasteInputChange('breakfast', recipeName, e.target.value)}
                                className="qty-input"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lunch Section */}
                    {menuData.lunch && menuData.lunch.length > 0 && (
                      <div className="meal-input-section">
                        <h4>
                          Lunch Recipes
                          {expectedData.mealCounts?.lunch !== undefined ? ` (Expected servings: ${expectedData.mealCounts.lunch})` : ''}
                        </h4>
                        <div className="ingredients-grid">
                          {menuData.lunch.map((recipeName) => (
                            <div key={recipeName} className="ingredient-input-row">
                              <label>
                                {recipeName}
                                <span className="expected-qty">Waste (kg)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter waste quantity in kg"
                                value={recipeWasteData.lunch?.[recipeName] || ''}
                                onChange={(e) => handleRecipeWasteInputChange('lunch', recipeName, e.target.value)}
                                className="qty-input"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dinner Section */}
                    {menuData.dinner && menuData.dinner.length > 0 && (
                      <div className="meal-input-section">
                        <h4>
                          Dinner Recipes
                          {expectedData.mealCounts?.dinner !== undefined ? ` (Expected servings: ${expectedData.mealCounts.dinner})` : ''}
                        </h4>
                        <div className="ingredients-grid">
                          {menuData.dinner.map((recipeName) => (
                            <div key={recipeName} className="ingredient-input-row">
                              <label>
                                {recipeName}
                                <span className="expected-qty">Waste (kg)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter waste quantity in kg"
                                value={recipeWasteData.dinner?.[recipeName] || ''}
                                onChange={(e) => handleRecipeWasteInputChange('dinner', recipeName, e.target.value)}
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
                        {loading ? 'Submitting...' : 'Submit Recipe Waste (kg)'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Select a date and click "Load Menu & Expected Data" to begin</p>
                  </div>
                )}
              </>
            )}

            {/* V2 MODE: Bin Waste + Leftovers */}
            {inputMode === 'v2' && (
              <>
                <h2>Mode: Total Bin Waste + Per-Dish Leftovers</h2>
                <p className="mode-description">
                  Enter total waste from the bin and measured leftovers from each dish. The system will estimate waste per recipe.
                </p>

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
                    {loading ? 'Loading...' : 'Load Menu & Expected Data'}
                  </button>
                </div>

                {/* Display v2 form */}
                {expectedData && menuData ? (
                  <div className="usage-form v2-form">
                    <h3>Date: {selectedDate}</h3>

                    {/* Total Waste Bin Input */}
                    <div className="total-waste-section">
                      <h4>Total Waste from Bin</h4>
                      <div className="form-group">
                        <label>Total Waste Bin Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter total waste in kg (e.g., 15.5)"
                          value={totalWasteBin}
                          onChange={(e) => setTotalWasteBin(e.target.value)}
                          className="qty-input large-input"
                        />
                      </div>
                    </div>

                    {/* Breakfast Leftovers Section */}
                    {menuData.breakfast && menuData.breakfast.length > 0 && (
                      <div className="meal-input-section">
                        <h4>
                          Breakfast Leftovers
                          {expectedData.mealCounts?.breakfast !== undefined ? ` (Expected servings: ${expectedData.mealCounts.breakfast})` : ''}
                        </h4>
                        <div className="ingredients-grid">
                          {menuData.breakfast.map((recipeName) => (
                            <div key={recipeName} className="ingredient-input-row">
                              <label>
                                {recipeName}
                                <span className="expected-qty">Leftover (kg)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter leftover quantity in kg"
                                value={leftoverData.breakfast?.[recipeName] || ''}
                                onChange={(e) => handleLeftoverInputChange('breakfast', recipeName, e.target.value)}
                                className="qty-input"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lunch Leftovers Section */}
                    {menuData.lunch && menuData.lunch.length > 0 && (
                      <div className="meal-input-section">
                        <h4>
                          Lunch Leftovers
                          {expectedData.mealCounts?.lunch !== undefined ? ` (Expected servings: ${expectedData.mealCounts.lunch})` : ''}
                        </h4>
                        <div className="ingredients-grid">
                          {menuData.lunch.map((recipeName) => (
                            <div key={recipeName} className="ingredient-input-row">
                              <label>
                                {recipeName}
                                <span className="expected-qty">Leftover (kg)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter leftover quantity in kg"
                                value={leftoverData.lunch?.[recipeName] || ''}
                                onChange={(e) => handleLeftoverInputChange('lunch', recipeName, e.target.value)}
                                className="qty-input"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dinner Leftovers Section */}
                    {menuData.dinner && menuData.dinner.length > 0 && (
                      <div className="meal-input-section">
                        <h4>
                          Dinner Leftovers
                          {expectedData.mealCounts?.dinner !== undefined ? ` (Expected servings: ${expectedData.mealCounts.dinner})` : ''}
                        </h4>
                        <div className="ingredients-grid">
                          {menuData.dinner.map((recipeName) => (
                            <div key={recipeName} className="ingredient-input-row">
                              <label>
                                {recipeName}
                                <span className="expected-qty">Leftover (kg)</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Enter leftover quantity in kg"
                                value={leftoverData.dinner?.[recipeName] || ''}
                                onChange={(e) => handleLeftoverInputChange('dinner', recipeName, e.target.value)}
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
                        onClick={handleSubmitV2WasteData}
                        disabled={loading}
                      >
                        {loading ? 'Submitting...' : 'Submit Waste & Leftovers (v2)'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Select a date and click "Load Menu & Expected Data" to begin</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDashboard;
