import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPanel.css';

function AdminPanel() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuTab, setMenuTab] = useState('view');

  // Dashboard Stats States
  const [dashboardStats, setDashboardStats] = useState({
    totalResponses: 0,
    totalMenus: 0,
    activeStudents: 0,
    totalWaste: 0
  });
  const [calculateHistory, setCalculateHistory] = useState([]);
  const [calculationDate, setCalculationDate] = useState('');
  const [calculationData, setCalculationData] = useState(null);

  // FIXED MENU ITEMS - These MUST match the database for calculations to work
  const MENU_ITEMS = {
    breakfast: ['Rice', 'Dosa', 'Idli', 'Poha', 'Upma', 'Puri', 'Paratha', 'Bread Butter'],
    lunch: ['Dal Rice', 'Chicken Curry', 'Veg Curry', 'Fish Curry', 'Roti', 'Biryani', 'Sambhar', 'Rasam'],
    dinner: ['Rice Curry', 'Noodles', 'Pasta', 'Khichdi', 'Pulao', 'Fried Rice']
  };

  // Menu Management States
  const [newMenu, setNewMenu] = useState({ date: '', breakfast: [], lunch: [], dinner: [] });
  const [updateMenuData, setUpdateMenuData] = useState({ date: '', breakfast: [], lunch: [], dinner: [] });
  const [deleteDate, setDeleteDate] = useState('');
  const [viewDate, setViewDate] = useState('');
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  // Fetch dashboard stats when component mounts
  useEffect(() => {
    fetchDashboardStats();
    fetchCalculationHistory();
  }, []);

  // Fetch dashboard stats for today
  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];

      const response = await fetch(`http://localhost:5000/api/dashboard/${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardStats({
          totalResponses: data.data?.totalResponses || 0,
          totalMenus: 1, // Will be calculated separately if needed
          activeStudents: data.data?.totalResponses || 0, // Approximation based on responses
          totalWaste: data.data?.totalWasteQuantity || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Fetch calculation history
  const fetchCalculationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/calculate/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCalculateHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching calculation history:', error);
    }
  };

  // Fetch calculation for specific date
  const handleFetchCalculation = async () => {
    if (!calculationDate) {
      setMessage('Please select a date');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/calculate/${calculationDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCalculationData(data.data);
        setMessage('✓ Calculation loaded');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setCalculationData(null);
        setMessage('✗ No calculation found for this date');
      }
    } catch (error) {
      setCalculationData(null);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Seed recipes
  const handleSeedRecipes = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/recipe/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✓ ${data.message}`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.message}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete calculation
  const handleDeleteCalculation = async (date) => {
    if (!window.confirm('Are you sure you want to delete this calculation? You can recalculate it anytime.')) {
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/calculate/${date}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setCalculationData(null);
        setMessage('✓ Calculation deleted. You can recalculate it now.');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.message}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ADD MENU HANDLER
  const handleAddMenu = async () => {
    if (!newMenu.date) {
      setMessage('Please select a date');
      return;
    }
    if (newMenu.breakfast.length === 0 || newMenu.lunch.length === 0 || newMenu.dinner.length === 0) {
      setMessage('Please select at least one dish for each meal');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/menu/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMenu)
      });

      if (response.ok) {
        setMessage('✓ Menu added successfully');
        setNewMenu({ date: '', breakfast: [], lunch: [], dinner: [] });
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.message || 'Failed to add menu'}`);
      }
    } catch (error) {
      setMessage(`✗ Connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // VIEW MENUS HANDLER
  const handleViewMenus = async () => {
    if (!viewDate) {
      setMessage('Please select a date');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/menu/${viewDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMenus(Array.isArray(data) ? data : [data]);
        setMessage(`✓ Found ${Array.isArray(data) ? data.length : 1} menu(s)`);
      } else {
        setMenus([]);
        setMessage('✗ No menus found for this date');
      }
    } catch (error) {
      setMenus([]);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // UPDATE MENU HANDLER
  const handleUpdateMenu = async () => {
    if (!updateMenuData.date) {
      setMessage('Please select a date');
      return;
    }
    if (updateMenuData.breakfast.length === 0 || updateMenuData.lunch.length === 0 || updateMenuData.dinner.length === 0) {
      setMessage('Please select at least one dish for each meal');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/menu/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateMenuData)
      });

      if (response.ok) {
        setMessage('✓ Menu updated successfully');
        setUpdateMenuData({ date: '', breakfast: [], lunch: [], dinner: [] });
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.message || 'Failed to update menu'}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // DELETE MENU HANDLER
  const handleDeleteMenu = async () => {
    if (!deleteDate) {
      setMessage('Please select a date');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this menu?')) {
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/menu/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: deleteDate })
      });

      if (response.ok) {
        setMessage('✓ Menu deleted successfully');
        setDeleteDate('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`✗ Error: ${error.message || 'Failed to delete menu'}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // CHECKBOX HANDLERS
  const toggleDish = (mealType, dish, isUpdate = false) => {
    if (isUpdate) {
      setUpdateMenuData(prev => ({
        ...prev,
        [mealType]: prev[mealType].includes(dish)
          ? prev[mealType].filter(d => d !== dish)
          : [...prev[mealType], dish]
      }));
    } else {
      setNewMenu(prev => ({
        ...prev,
        [mealType]: prev[mealType].includes(dish)
          ? prev[mealType].filter(d => d !== dish)
          : [...prev[mealType], dish]
      }));
    }
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">◆</span>
            <span className="nav-text">Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveSection('menu')}
          >
            <span className="nav-icon">≡</span>
            <span className="nav-text">Menu Management</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'calculations' ? 'active' : ''}`}
            onClick={() => setActiveSection('calculations')}
          >
            <span className="nav-icon">∑</span>
            <span className="nav-text">Calculations</span>
          </button>

          <button
            className={`nav-item ${activeSection === 'waste' ? 'active' : ''}`}
            onClick={() => setActiveSection('waste')}
          >
            <span className="nav-icon">◉</span>
            <span className="nav-text">Waste Tracking</span>
          </button>

          <div className="nav-divider"></div>

          <button className="nav-item logout" onClick={handleLogout}>
            <span className="nav-icon">⟵</span>
            <span className="nav-text">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
          <h1 className="page-title">
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'menu' && 'Menu Management'}
            {activeSection === 'calculations' && 'Calculations'}
            {activeSection === 'waste' && 'Waste Tracking'}
          </h1>
          <div className="header-user">
            <span>Admin User</span>
          </div>
        </header>

        {/* Content */}
        <div className="content-wrapper">
          {/* DASHBOARD SECTION */}
          {activeSection === 'dashboard' && (
            <div className="page-section">
              <div className="dashboard-header">
                <h2>Dashboard Overview</h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    fetchDashboardStats();
                    fetchCalculationHistory();
                  }}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>
              <div className="stats-container">
                <div className="stat-card">
                  <div className="stat-icon">M</div>
                  <div className="stat-info">
                    <p className="stat-label">Total Menus</p>
                    <p className="stat-value">{dashboardStats.totalMenus}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">S</div>
                  <div className="stat-info">
                    <p className="stat-label">Active Students</p>
                    <p className="stat-value">{dashboardStats.activeStudents}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">R</div>
                  <div className="stat-info">
                    <p className="stat-label">Total Responses</p>
                    <p className="stat-value">{dashboardStats.totalResponses}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">W</div>
                  <div className="stat-info">
                    <p className="stat-label">Total Waste (kg)</p>
                    <p className="stat-value">{dashboardStats.totalWaste.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="cards-grid">
                <div className="info-card">
                  <h3>Recent Menus</h3>
                  <div className="empty-state"><p>No menus created yet</p></div>
                </div>
                <div className="info-card">
                  <h3>Quick Stats</h3>
                  <div className="empty-state"><p>Manage your system metrics</p></div>
                </div>
              </div>
            </div>
          )}

          {/* MENU MANAGEMENT SECTION */}
          {activeSection === 'menu' && (
            <div className="page-section">
              <div className="menu-section">
                {/* Tab Buttons */}
                <div className="menu-tabs">
                  <button
                    className={`menu-tab-btn ${menuTab === 'view' ? 'active' : ''}`}
                    onClick={() => setMenuTab('view')}
                  >
                    View Menus
                  </button>
                  <button
                    className={`menu-tab-btn ${menuTab === 'add' ? 'active' : ''}`}
                    onClick={() => setMenuTab('add')}
                  >
                    Add Menu
                  </button>
                  <button
                    className={`menu-tab-btn ${menuTab === 'update' ? 'active' : ''}`}
                    onClick={() => setMenuTab('update')}
                  >
                    Update Menu
                  </button>
                  <button
                    className={`menu-tab-btn ${menuTab === 'delete' ? 'active' : ''}`}
                    onClick={() => setMenuTab('delete')}
                  >
                    Delete Menu
                  </button>
                </div>

                {/* Status Message */}
                {message && (
                  <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
                    {message}
                  </div>
                )}

                {/* VIEW MENUS TAB */}
                {menuTab === 'view' && (
                  <div className="menu-tab-content">
                    <h3>View Menus by Date</h3>
                    <div className="form-group">
                      <label>Select Date</label>
                      <input
                        type="date"
                        value={viewDate}
                        onChange={(e) => setViewDate(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleViewMenus}
                      disabled={loading}
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </button>

                    {menus.length > 0 && (
                      <div className="menu-results">
                        {menus.map((menu, idx) => (
                          <div key={idx} className="menu-card">
                            <p><strong>Date:</strong> {menu.date}</p>
                            <p><strong>Breakfast:</strong> {menu.breakfast.join(', ')}</p>
                            <p><strong>Lunch:</strong> {menu.lunch.join(', ')}</p>
                            <p><strong>Dinner:</strong> {menu.dinner.join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ADD MENU TAB */}
                {menuTab === 'add' && (
                  <div className="menu-tab-content">
                    <h3>Add New Menu</h3>
                    
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={newMenu.date}
                        onChange={(e) => setNewMenu({ ...newMenu, date: e.target.value })}
                      />
                    </div>

                    {/* Breakfast */}
                    <div className="meal-section">
                      <h4>Breakfast</h4>
                      <div className="dishes-grid">
                        {MENU_ITEMS.breakfast.map(dish => (
                          <div key={dish} className="dish-checkbox">
                            <input
                              type="checkbox"
                              id={`breakfast-${dish}`}
                              checked={newMenu.breakfast.includes(dish)}
                              onChange={() => toggleDish('breakfast', dish, false)}
                            />
                            <label htmlFor={`breakfast-${dish}`}>{dish}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="meal-section">
                      <h4>Lunch</h4>
                      <div className="dishes-grid">
                        {MENU_ITEMS.lunch.map(dish => (
                          <div key={dish} className="dish-checkbox">
                            <input
                              type="checkbox"
                              id={`lunch-${dish}`}
                              checked={newMenu.lunch.includes(dish)}
                              onChange={() => toggleDish('lunch', dish, false)}
                            />
                            <label htmlFor={`lunch-${dish}`}>{dish}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="meal-section">
                      <h4>Dinner</h4>
                      <div className="dishes-grid">
                        {MENU_ITEMS.dinner.map(dish => (
                          <div key={dish} className="dish-checkbox">
                            <input
                              type="checkbox"
                              id={`dinner-${dish}`}
                              checked={newMenu.dinner.includes(dish)}
                              onChange={() => toggleDish('dinner', dish, false)}
                            />
                            <label htmlFor={`dinner-${dish}`}>{dish}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleAddMenu}
                      disabled={loading}
                    >
                      {loading ? 'Adding...' : 'Add Menu'}
                    </button>
                  </div>
                )}

                {/* UPDATE MENU TAB */}
                {menuTab === 'update' && (
                  <div className="menu-tab-content">
                    <h3>Update Menu</h3>
                    
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={updateMenuData.date}
                        onChange={(e) => setUpdateMenuData({ ...updateMenuData, date: e.target.value })}
                      />
                    </div>

                    {/* Breakfast */}
                    <div className="meal-section">
                      <h4>Breakfast</h4>
                      <div className="dishes-grid">
                        {MENU_ITEMS.breakfast.map(dish => (
                          <div key={dish} className="dish-checkbox">
                            <input
                              type="checkbox"
                              id={`update-breakfast-${dish}`}
                              checked={updateMenuData.breakfast.includes(dish)}
                              onChange={() => toggleDish('breakfast', dish, true)}
                            />
                            <label htmlFor={`update-breakfast-${dish}`}>{dish}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="meal-section">
                      <h4>Lunch</h4>
                      <div className="dishes-grid">
                        {MENU_ITEMS.lunch.map(dish => (
                          <div key={dish} className="dish-checkbox">
                            <input
                              type="checkbox"
                              id={`update-lunch-${dish}`}
                              checked={updateMenuData.lunch.includes(dish)}
                              onChange={() => toggleDish('lunch', dish, true)}
                            />
                            <label htmlFor={`update-lunch-${dish}`}>{dish}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="meal-section">
                      <h4>Dinner</h4>
                      <div className="dishes-grid">
                        {MENU_ITEMS.dinner.map(dish => (
                          <div key={dish} className="dish-checkbox">
                            <input
                              type="checkbox"
                              id={`update-dinner-${dish}`}
                              checked={updateMenuData.dinner.includes(dish)}
                              onChange={() => toggleDish('dinner', dish, true)}
                            />
                            <label htmlFor={`update-dinner-${dish}`}>{dish}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={handleUpdateMenu}
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Menu'}
                    </button>
                  </div>
                )}

                {/* DELETE MENU TAB */}
                {menuTab === 'delete' && (
                  <div className="menu-tab-content">
                    <h3>Delete Menu</h3>
                    <div className="form-group">
                      <label>Select Date to Delete</label>
                      <input
                        type="date"
                        value={deleteDate}
                        onChange={(e) => setDeleteDate(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={handleDeleteMenu}
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Delete Menu'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CALCULATIONS SECTION */}
          {activeSection === 'calculations' && (
            <div className="page-section">
              <h2>Calculate Ingredients Needed</h2>
              
              <div className="recipe-setup">
                <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
                  💡 <strong>First time setup:</strong> Click "Seed Recipes" to load all dish recipes into the system.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleSeedRecipes}
                  disabled={loading}
                  style={{ marginBottom: '2rem' }}
                >
                  {loading ? 'Seeding...' : '🌱 Seed Recipes'}
                </button>
              </div>
              
              <div className="form-group">
                <label>Select Date</label>
                <input
                  type="date"
                  value={calculationDate}
                  onChange={(e) => setCalculationDate(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleFetchCalculation}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Calculate'}
                </button>
              </div>

              {calculationData && (
                <div className="calculation-results">
                  <div className="calculation-summary">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3>Date: {calculationData.date}</h3>
                        <p><strong>Total Responses:</strong> {calculationData.totalResponses}</p>
                      </div>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteCalculation(calculationData.date)}
                        disabled={loading}
                        style={{ height: 'fit-content' }}
                      >
                        {loading ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>

                  <div className="meal-calculations">
                    <div className="meal-calc-card">
                      <h4>Breakfast</h4>
                      <div className="ingredients-list">
                        {calculationData.breakfast ? (
                          Object.entries(calculationData.breakfast).map(([ingredient, quantity]) => (
                            <div key={ingredient} className="ingredient-item">
                              <span className="ingredient-name">{ingredient}</span>
                              <span className="ingredient-qty">{quantity.toFixed(2)} kg</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">No breakfast data</p>
                        )}
                      </div>
                    </div>

                    <div className="meal-calc-card">
                      <h4>Lunch</h4>
                      <div className="ingredients-list">
                        {calculationData.lunch ? (
                          Object.entries(calculationData.lunch).map(([ingredient, quantity]) => (
                            <div key={ingredient} className="ingredient-item">
                              <span className="ingredient-name">{ingredient}</span>
                              <span className="ingredient-qty">{quantity.toFixed(2)} kg</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">No lunch data</p>
                        )}
                      </div>
                    </div>

                    <div className="meal-calc-card">
                      <h4>Dinner</h4>
                      <div className="ingredients-list">
                        {calculationData.dinner ? (
                          Object.entries(calculationData.dinner).map(([ingredient, quantity]) => (
                            <div key={ingredient} className="ingredient-item">
                              <span className="ingredient-name">{ingredient}</span>
                              <span className="ingredient-qty">{quantity.toFixed(2)} kg</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-data">No dinner data</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calculateHistory.length > 0 && (
                <div className="calculation-history">
                  <h3>Calculation History</h3>
                  <div className="history-table">
                    <div className="table-header">
                      <div className="table-cell">Date</div>
                      <div className="table-cell">Total Responses</div>
                      <div className="table-cell">Saved At</div>
                    </div>
                    {calculateHistory.slice(0, 10).map((history, idx) => (
                      <div key={idx} className="table-row">
                        <div className="table-cell">{history.date}</div>
                        <div className="table-cell">{history.totalResponses}</div>
                        <div className="table-cell">{new Date(history.savedAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WASTE TRACKING SECTION */}
          {activeSection === 'waste' && (
            <div className="page-section">
              <h2>Waste Tracking</h2>
              <div className="empty-state">
                <p>Waste tracking section coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPanel;
