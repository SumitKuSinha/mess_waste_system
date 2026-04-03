import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPanel.css';

function AdminPanel() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuTab, setMenuTab] = useState('view');
  const [dashboardView, setDashboardView] = useState('overview');
  const [wasteView, setWasteView] = useState('summary');
  const [selectedWasteGraph, setSelectedWasteGraph] = useState('intro');

  // Dashboard Stats States
  const [dashboardStats, setDashboardStats] = useState({
    totalResponses: 0,
    totalMenus: 0,
    uniqueResponders: 0,
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

  // Waste Tracking States
  const [wasteDate, setWasteDate] = useState('');
  const [wasteData, setWasteData] = useState(null);
  const [wasteHistory, setWasteHistory] = useState([]);

  const buildChartEntries = (source, limit = 6) => {
    return Object.entries(source || {})
      .filter(([, value]) => Number(value) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, limit);
  };

  const buildPercentageEntries = (source, limit = 6) => {
    return Object.entries(source || {})
      .filter(([, value]) => Number(value) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, limit);
  };

  const buildChartSeries = (source, limit = 6, palette = []) => {
    const entries = buildChartEntries(source, limit);
    const total = Math.max(entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0), 1);

    return entries.map(([label, value], index) => {
      const numericValue = Number(value) || 0;
      const percentage = (numericValue / total) * 100;

      return {
        label,
        value: numericValue,
        percentage,
        color: palette[index % palette.length] || '#D67229'
      };
    });
  };

  const buildRecipeEntries = (recipeWaste) => {
    return Object.entries(recipeWaste || {})
      .flatMap(([meal, recipes]) => Object.entries(recipes || {}).map(([recipe, value]) => ([`${recipe}`, Number(value) || 0, meal])))
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
  };

  const buildRecipeChartEntries = (recipeWaste, limit = 8) => {
    return buildRecipeEntries(recipeWaste)
      .map(([recipe, value, meal]) => ([`${recipe} (${meal})`, value]))
      .slice(0, limit);
  };

  const renderBarChart = (title, entries, valueSuffix = 'kg', barClass = 'chart-bar-primary') => {
    const normalizedEntries = entries || [];
    const totalValue = Math.max(normalizedEntries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0), 1);

    return (
      <div className="chart-card">
        <h4>{title}</h4>
        {normalizedEntries.length > 0 ? (
          <div className="chart-list">
            {normalizedEntries.map(([label, value]) => {
              const numericValue = Number(value) || 0;
              const share = (numericValue / totalValue) * 100;
              const width = Math.max(share, 6);

              return (
                <div key={label} className="chart-row">
                  <div className="chart-label">{label}</div>
                  <div className="chart-track">
                    <div className={`chart-bar ${barClass}`} style={{ width: `${width}%` }} />
                  </div>
                  <div className="chart-value">
                    {share.toFixed(1)}% {valueSuffix ? `• ${numericValue.toFixed(2)} ${valueSuffix}` : `• ${numericValue.toFixed(2)}`}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>No data available</p>
          </div>
        )}
      </div>
    );
  };

  const renderPercentBarChart = (title, entries, barClass = 'chart-bar-primary') => {
    const normalizedEntries = entries || [];
    const maxValue = Math.max(...normalizedEntries.map(([, value]) => Number(value) || 0), 1);

    return (
      <div className="chart-card">
        <h4>{title}</h4>
        {normalizedEntries.length > 0 ? (
          <div className="chart-list">
            {normalizedEntries.map(([label, value]) => {
              const numericValue = Number(value) || 0;
              const width = Math.max((numericValue / maxValue) * 100, 6);

              return (
                <div key={label} className="chart-row">
                  <div className="chart-label">{label}</div>
                  <div className="chart-track">
                    <div className={`chart-bar ${barClass}`} style={{ width: `${width}%` }} />
                  </div>
                  <div className="chart-value">{numericValue.toFixed(2)}%</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><p>No data available</p></div>
        )}
      </div>
    );
  };

  const renderStackedLossChart = (title, source, totalIngredients) => {
    const entries = Object.entries(source || {})
      .filter(([, value]) => Number(value) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 6);

    return (
      <div className="chart-card">
        <h4>{title}</h4>
        {entries.length > 0 ? (
          <div className="chart-list">
            {entries.map(([label, value]) => {
              const total = Number(totalIngredients?.[label] || 0);
              const loss = Number(value) || 0;
              const lossShare = total > 0 ? Math.min((loss / total) * 100, 100) : 0;
              const remainingShare = Math.max(100 - lossShare, 0);

              return (
                <div key={label} className="chart-row stacked-row">
                  <div className="chart-label">{label}</div>
                  <div className="chart-track stacked-track">
                    <div className="chart-segment chart-segment-loss" style={{ width: `${lossShare}%` }} />
                    <div className="chart-segment chart-segment-remaining" style={{ width: `${remainingShare}%` }} />
                  </div>
                  <div className="chart-value">
                    {lossShare.toFixed(1)}% loss
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><p>No data available</p></div>
        )}
      </div>
    );
  };

  const renderDonutChart = (title, source, centerLabel, palette) => {
    const series = buildChartSeries(source, 6, palette);
    const total = series.reduce((sum, item) => sum + item.value, 0);
    const gradientStops = series.length > 0
      ? series.map((item, index) => {
          const start = series.slice(0, index).reduce((sum, current) => sum + current.percentage, 0);
          const end = start + item.percentage;
          return `${item.color} ${start}% ${end}%`;
        }).join(', ')
      : '';

    return (
      <div className="chart-card donut-card">
        <h4>{title}</h4>
        {series.length > 0 ? (
          <div className="donut-layout">
            <div className="donut-chart" style={{ background: `conic-gradient(${gradientStops})` }}>
              <div className="donut-hole">
                <div className="donut-center-label">{centerLabel}</div>
                <div className="donut-center-value">{total.toFixed(2)} kg</div>
              </div>
            </div>
            <div className="donut-legend">
              {series.map((item) => (
                <div key={item.label} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: item.color }} />
                  <span className="legend-label">{item.label}</span>
                  <span className="legend-value">{item.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state"><p>No data available</p></div>
        )}
      </div>
    );
  };

  const renderPieChart = (title, entries, valueSuffix = 'kg', palette = [], valuesArePercent = false) => {
    const normalizedEntries = entries || [];
    const series = normalizedEntries.map(([label, value], index) => ({
      label,
      value: Number(value) || 0,
      color: palette[index % palette.length] || '#D67229'
    })).filter((item) => item.value > 0);

    const total = Math.max(series.reduce((sum, item) => sum + item.value, 0), 1);
    let cumulative = 0;
    const gradientStops = series.length > 0
      ? series.map((item) => {
          const start = cumulative;
          const end = start + (item.value / total) * 100;
          cumulative = end;
          return `${item.color} ${start}% ${end}%`;
        }).join(', ')
      : '';

    return (
      <div className="chart-card pie-card">
        <h4>{title}</h4>
        {series.length > 0 ? (
          <div className="pie-layout">
            <div className="pie-chart" style={{ background: `conic-gradient(${gradientStops})` }} />
            <div className="pie-legend">
              {series.map((item) => {
                const share = (item.value / total) * 100;
                return (
                  <div key={item.label} className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: item.color }} />
                    <span className="legend-label">{item.label}</span>
                    <span className="legend-value">
                      {valuesArePercent
                        ? `${item.value.toFixed(2)}%`
                        : `${share.toFixed(1)}% • ${item.value.toFixed(2)} ${valueSuffix}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state"><p>No data available</p></div>
        )}
      </div>
    );
  };

  const renderTrendChart = (title, points, lineClass = 'trend-line-primary') => {
    const series = (points || []).filter(([, value]) => Number(value) >= 0);
    if (series.length === 0) {
      return (
        <div className="chart-card">
          <h4>{title}</h4>
          <div className="empty-state"><p>No data available</p></div>
        </div>
      );
    }

    const values = series.map(([, value]) => Number(value) || 0);
    const maxValue = Math.max(...values, 1);
    const pointsString = series
      .map(([, value], index) => {
        const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
        const y = 100 - ((Number(value) || 0) / maxValue) * 100;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="chart-card trend-card">
        <h4>{title}</h4>
        <div className="trend-chart-wrap">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="trend-chart">
            <polyline className={`trend-polyline ${lineClass}`} points={pointsString} />
            {series.map(([, value], index) => {
              const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
              const y = 100 - ((Number(value) || 0) / maxValue) * 100;
              return <circle key={`${index}-${value}`} className="trend-point" cx={x} cy={y} r="1.8" />;
            })}
          </svg>
        </div>
        <div className="trend-labels">
          {series.map(([label]) => (
            <span key={label} className="trend-label">{label}</span>
          ))}
        </div>
      </div>
    );
  };

  const wasteGraphDefinitions = wasteData ? [
    {
      id: 'waste-ingredients-pie',
      label: 'Waste Ingredients Pie',
      description: 'Shows ingredient-wise waste percentages. Bigger slices mean higher waste percentage for that ingredient.',
      content: renderPieChart(
        'Waste Ingredients Pie (by Waste %)',
        buildPercentageEntries(wasteData.wastePercentage),
        '%',
        ['#ef4444', '#f97316', '#f59e0b', '#ea580c', '#fb7185', '#dc2626'],
        true
      )
    },
    {
      id: 'waste-recipes-pie',
      label: 'Waste Recipes Pie',
      description: 'Breaks down estimated waste quantity across recipes. It helps identify which dishes are contributing most to waste in kg.',
      content: renderPieChart(
        'Waste Recipes Pie',
        buildRecipeChartEntries(wasteData.recipeWaste),
        'kg',
        ['#3B82F6', '#8B5CF6', '#22C55E', '#06B6D4', '#F59E0B', '#EC4899']
      )
    },
    {
      id: 'waste-percent-bars',
      label: 'Waste % Bars',
      description: 'Ranks ingredients by waste percentage. This is the best chart for checking which ingredient has the highest waste rate.',
      content: renderPercentBarChart('Waste % by Ingredient', buildPercentageEntries(wasteData.wastePercentage), 'chart-bar-waste')
    },
    {
      id: 'leftover-share-bars',
      label: 'Leftover Share Bars',
      description: 'Shows how leftovers are distributed among ingredients as share plus quantity.',
      content: renderBarChart('Leftover Share by Ingredient', buildChartEntries(wasteData.leftovers), 'kg', 'chart-bar-leftover')
    },
    {
      id: 'total-loss-share-bars',
      label: 'Total Loss Share Bars',
      description: 'Shows combined loss share (waste + leftovers) by ingredient to identify overall biggest loss contributors.',
      content: renderBarChart('Total Loss Share by Ingredient', buildChartEntries(wasteData.totalLoss), 'kg', 'chart-bar-loss')
    },
    {
      id: 'ingredient-loss-mix',
      label: 'Ingredient Loss Mix',
      description: 'Compares each ingredient\'s loss with its expected amount. Higher red segment indicates stronger loss pressure.',
      content: renderStackedLossChart('Ingredient Loss Mix', wasteData.totalLoss, wasteData.totalIngredients)
    },
    {
      id: 'recipe-waste-impact',
      label: 'Recipe Waste Impact',
      description: 'Ranks recipes by estimated waste quantity in kg. Useful for menu-level corrective action.',
      content: renderBarChart(
        'Recipe Waste Impact',
        buildRecipeEntries(wasteData.recipeWaste).map(([recipe, value, meal]) => [`${recipe} (${meal})`, value]),
        'kg',
        'chart-bar-primary'
      )
    }
  ] : [];

  const validSelectedWasteGraph = selectedWasteGraph === 'intro' || selectedWasteGraph === 'all' || wasteGraphDefinitions.some((graph) => graph.id === selectedWasteGraph)
    ? selectedWasteGraph
    : 'intro';

  const visibleWasteGraphs = validSelectedWasteGraph === 'all'
    ? wasteGraphDefinitions
    : wasteGraphDefinitions.filter((graph) => graph.id === validSelectedWasteGraph);

  const selectedWasteGraphDetails = wasteGraphDefinitions.find((graph) => graph.id === validSelectedWasteGraph);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
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

      const [dashboardResponse, calculationResponse, menuResponse, responsesResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/dashboard/${today}?force=true&_t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
        }),
        fetch(`http://localhost:5000/api/calculate/${today}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/menu/${today}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/response/all?date=${today}&force=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      let totalResponses = 0;
      let totalWaste = 0;
      let totalMenus = 0;
      let uniqueResponders = 0;

      if (calculationResponse.ok) {
        const calcPayload = await calculationResponse.json();
        totalResponses = Number(calcPayload?.data?.totalResponses || 0);
      }

      if (menuResponse.ok) {
        totalMenus = 1;
      }

      if (dashboardResponse.ok) {
        const dashboardPayload = await dashboardResponse.json();
        totalResponses = Number(dashboardPayload?.data?.totalResponses ?? totalResponses);
        totalWaste = Number(dashboardPayload?.data?.summary?.waste?.totalWasteQuantity || 0);
      }

      if (responsesResponse.ok) {
        const responsesPayload = await responsesResponse.json();
        const responseList = Array.isArray(responsesPayload?.data) ? responsesPayload.data : [];
        const responderIds = responseList
          .map((response) => response?.studentId?.toString?.() || response?.studentId || '')
          .filter(Boolean);
        uniqueResponders = new Set(responderIds).size;
      }

      setDashboardStats({
        totalResponses,
        totalMenus,
        uniqueResponders,
        totalWaste
      });
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
        setMessage('[OK] Calculation loaded');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setCalculationData(null);
        setMessage('[ERR] No calculation found for this date');
      }
    } catch (error) {
      setCalculationData(null);
      setMessage(`[ERR] Error: ${error.message}`);
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
        setMessage('[OK] Calculation deleted. You can recalculate it now.');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const error = await response.json();
        setMessage(`[ERR] Error: ${error.message}`);
      }
    } catch (error) {
      setMessage(`[ERR] Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch waste data for a specific date
  const handleFetchWasteData = async () => {
    if (!wasteDate) {
      setMessage('Please select a date');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/dashboard/${wasteDate}?force=true&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const payload = await response.json();
        const normalizedData = {
          ...(payload?.data || {}),
          wasteInputType: payload?.data?.wasteInputType || payload?.data?.inputType || 'actual-usage'
        };
        setWasteData(normalizedData);
        setMessage('[OK] Waste data loaded');
        setTimeout(() => setMessage(''), 2000);
      } else {
        const errorPayload = await response.json().catch(() => ({}));
        setWasteData(null);
        setMessage(`[ERR] ${errorPayload?.message || 'No waste data found for this date. Staff may not have submitted yet.'}`);
      }
    } catch (error) {
      setWasteData(null);
      setMessage(`[ERR] Error: ${error.message}`);
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
        setMessage('[OK] Menu added successfully');
        setNewMenu({ date: '', breakfast: [], lunch: [], dinner: [] });
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`[ERR] Error: ${error.message || error.error || 'Failed to add menu'}`);
      }
    } catch (error) {
      setMessage(`[ERR] Connection error: ${error.message}`);
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
        setMessage(`[OK] Found ${Array.isArray(data) ? data.length : 1} menu(s)`);
      } else {
        setMenus([]);
        setMessage('[ERR] No menus found for this date');
      }
    } catch (error) {
      setMenus([]);
      setMessage(`[ERR] Error: ${error.message}`);
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
        setMessage('[OK] Menu updated successfully');
        setUpdateMenuData({ date: '', breakfast: [], lunch: [], dinner: [] });
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`[ERR] Error: ${error.message || 'Failed to update menu'}`);
      }
    } catch (error) {
      setMessage(`[ERR] Error: ${error.message}`);
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
        setMessage('[OK] Menu deleted successfully');
        setDeleteDate('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(`[ERR] Error: ${error.message || 'Failed to delete menu'}`);
      }
    } catch (error) {
      setMessage(`[ERR] Error: ${error.message}`);
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
                    <p className="stat-label">Menu Available Today</p>
                    <p className="stat-value">{dashboardStats.totalMenus}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">S</div>
                  <div className="stat-info">
                    <p className="stat-label">Unique Responders</p>
                    <p className="stat-value">{dashboardStats.uniqueResponders}</p>
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

              <div className="section-tabs compact-tabs">
                <button
                  className={`section-tab-btn ${dashboardView === 'overview' ? 'active' : ''}`}
                  onClick={() => setDashboardView('overview')}
                >
                  Overview
                </button>
                <button
                  className={`section-tab-btn ${dashboardView === 'graphs' ? 'active' : ''}`}
                  onClick={() => setDashboardView('graphs')}
                >
                  Graphs
                </button>
                <button
                  className={`section-tab-btn ${dashboardView === 'tasks' ? 'active' : ''}`}
                  onClick={() => setDashboardView('tasks')}
                >
                  Tasks
                </button>
              </div>

              {dashboardView === 'overview' && (
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
              )}

              {dashboardView === 'graphs' && (
                <div className="dashboard-graphs">
                  <div className="graph-grid">
                    {renderTrendChart(
                      'Response Trend',
                      calculateHistory.slice(0, 7).reverse().map((item) => [item.date, item.totalResponses]),
                      'trend-line-primary'
                    )}
                    {renderBarChart(
                      'Responses by Date',
                      calculateHistory.slice(0, 7).reverse().map((item) => [item.date, item.totalResponses]),
                      'responses',
                      'chart-bar-primary'
                    )}
                  </div>
                </div>
              )}

              {dashboardView === 'tasks' && (
                <div className="task-grid">
                  <button className="task-card" onClick={() => setActiveSection('menu')}>
                    <h3>Menu Management</h3>
                    <p>Create, update, and review daily menus.</p>
                  </button>
                  <button className="task-card" onClick={() => setActiveSection('calculations')}>
                    <h3>Calculations</h3>
                    <p>Run and inspect ingredient calculations.</p>
                  </button>
                  <button className="task-card" onClick={() => setActiveSection('waste')}>
                    <h3>Waste Tracking</h3>
                    <p>Review waste, leftovers, and graphs.</p>
                  </button>
                  <button className="task-card" onClick={fetchDashboardStats} disabled={loading}>
                    <h3>Refresh Dashboard</h3>
                    <p>{loading ? 'Refreshing data...' : 'Pull the latest metrics.'}</p>
                  </button>
                </div>
              )}
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
                  <div className={`message ${message.startsWith('[OK]') ? 'success' : 'error'}`}>
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
                        {loading ? 'Deleting...' : 'Delete'}
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
              <h2>Waste Tracking & Analysis</h2>

              {message && (
                <div className={`message ${message.startsWith('[OK]') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              {/* Date Selection */}
              <div className="form-group">
                <label>Select Date to View Waste Report</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    value={wasteDate}
                    onChange={(e) => setWasteDate(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleFetchWasteData}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'View Waste Report'}
                  </button>
                </div>
              </div>

              {/* Waste Report Display */}
              {wasteData ? (
                <div className="waste-report">
                  <div className="report-header">
                    <h3>Waste Analysis Report - {wasteData.date}</h3>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <p className="report-date">Total Responses: {wasteData.totalResponses}</p>
                      <p className="report-mode" style={{ fontSize: '0.9rem', color: '#D1D5DB', fontStyle: 'italic' }}>
                        Mode: v2 (Bin Waste + Leftovers)
                      </p>
                      {wasteData.totalWasteBinWeight !== undefined && wasteData.totalWasteBinWeight !== null && (
                        <p className="report-mode" style={{ fontSize: '0.9rem', color: '#A8E6CF' }}>
                          Total Bin Waste: {wasteData.totalWasteBinWeight.toFixed(2)} kg
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="section-tabs compact-tabs">
                    <button
                      className={`section-tab-btn ${wasteView === 'summary' ? 'active' : ''}`}
                      onClick={() => setWasteView('summary')}
                    >
                      Summary
                    </button>
                    <button
                      className={`section-tab-btn ${wasteView === 'breakdown' ? 'active' : ''}`}
                      onClick={() => setWasteView('breakdown')}
                    >
                      Breakdown
                    </button>
                    <button
                      className={`section-tab-btn ${wasteView === 'graphs' ? 'active' : ''}`}
                      onClick={() => setWasteView('graphs')}
                    >
                      Graphs
                    </button>
                  </div>

                  {wasteView === 'summary' && (
                    <>
                      <div className="waste-summary v2-summary">
                        <div className="summary-card leftover-card">
                          <h4>Leftover Ingredients</h4>
                          <div className="summary-items">
                            <div className="summary-item">
                              <span className="label">Total Items:</span>
                              <span className="value">{Object.keys(wasteData.leftovers || {}).length}</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Total Quantity:</span>
                              <span className="value">{Object.values(wasteData.leftovers || {}).reduce((a, b) => a + b, 0).toFixed(2)} kg</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Total %:</span>
                              <span className="value">{wasteData.summary?.leftovers?.overallLeftoverPercentage ?? 0}%</span>
                            </div>
                            {wasteData.summary?.leftovers?.topLeftoverItem && (
                              <div className="summary-item">
                                <span className="label">Top Leftover:</span>
                                <span className="value">{wasteData.summary.leftovers.topLeftoverItem.item} ({wasteData.summary.leftovers.topLeftoverItem.quantity} kg)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="summary-card waste-bin-card">
                          <h4>Waste Ingredients</h4>
                          <div className="summary-items">
                            <div className="summary-item">
                              <span className="label">Total Items:</span>
                              <span className="value">{Object.keys(wasteData.waste || {}).length}</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Total Quantity:</span>
                              <span className="value">{Object.values(wasteData.waste || {}).reduce((a, b) => a + b, 0).toFixed(2)} kg</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Total %:</span>
                              <span className="value">{wasteData.summary?.waste?.overallWastePercentage ?? 0}%</span>
                            </div>
                            {wasteData.summary?.waste?.topWastedItem && (
                              <div className="summary-item">
                                <span className="label">Top Ingredient:</span>
                                <span className="value">{wasteData.summary.waste.topWastedItem.item} ({wasteData.summary.waste.topWastedItem.quantity} kg)</span>
                              </div>
                            )}
                            {wasteData.summary?.waste?.topWastedRecipe && (
                              <div className="summary-item">
                                <span className="label">Top Recipe:</span>
                                <span className="value">{wasteData.summary.waste.topWastedRecipe.recipe} ({wasteData.summary.waste.topWastedRecipe.quantity} kg)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="summary-card total-loss-card">
                          <h4>Total Loss</h4>
                          <div className="summary-items">
                            <div className="summary-item">
                              <span className="label">Total Items:</span>
                              <span className="value">{Object.keys(wasteData.totalLoss || {}).length}</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Total Quantity:</span>
                              <span className="value">{Object.values(wasteData.totalLoss || {}).reduce((a, b) => a + b, 0).toFixed(2)} kg</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Total %:</span>
                              <span className="value">{wasteData.summary?.totalLoss?.overallLossPercentage ?? 0}%</span>
                            </div>
                            {wasteData.summary?.totalLoss?.topLossItem && (
                              <div className="summary-item">
                                <span className="label">Top Loss Ingredient:</span>
                                <span className="value">{wasteData.summary.totalLoss.topLossItem.item} ({wasteData.summary.totalLoss.topLossItem.quantity} kg)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {wasteData.summary?.waste?.highWasteItems?.length > 0 && (
                        <div className="alert alert-warning">
                          <h4>High Waste Items (&gt;10%)</h4>
                          {wasteData.summary.waste.highWasteItems.map((item) => (
                            <div key={item.item} className="alert-item">
                              {item.item}: {item.wastePercent}% waste
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {wasteView === 'breakdown' && (
                    <div className="waste-breakdown">
                      <h3>Detailed Ingredient Breakdown</h3>

                      {wasteData.leftovers && Object.keys(wasteData.leftovers).length > 0 && (
                        <div className="breakdown-section leftover-section">
                          <h4>Leftover Ingredients (from Plates)</h4>
                          <div className="breakdown-table">
                            <div className="table-header">
                              <div className="col-item">Ingredient</div>
                              <div className="col-qty">Expected (kg)</div>
                              <div className="col-qty">Leftover (kg)</div>
                              <div className="col-percent">Leftover %</div>
                            </div>
                            {Object.entries(wasteData.leftovers).map(([item, leftoverQty]) => (
                              <div key={`leftover-${item}`} className="table-row leftover-row">
                                <div className="col-item">{item}</div>
                                <div className="col-qty">{wasteData.totalIngredients[item]?.toFixed(2)}</div>
                                <div className="col-qty">{leftoverQty?.toFixed(2) || 0}</div>
                                <div className="col-percent">{wasteData.leftoverPercentage?.[item]}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Object.keys(wasteData.waste).length > 0 && (
                        <div className="breakdown-section waste-section">
                          <h4>Waste Ingredients (from Bin)</h4>
                          <div className="breakdown-table">
                            <div className="table-header">
                              <div className="col-item">Ingredient</div>
                              <div className="col-qty">Expected (kg)</div>
                              <div className="col-qty">Waste (kg)</div>
                              <div className="col-percent">Waste %</div>
                            </div>
                            {Object.entries(wasteData.waste).map(([item, wasteQty]) => (
                              <div key={`waste-${item}`} className="table-row waste-row">
                                <div className="col-item">{item}</div>
                                <div className="col-qty">{wasteData.totalIngredients[item]?.toFixed(2)}</div>
                                <div className="col-qty">{wasteQty?.toFixed(2) || 0}</div>
                                <div className="col-percent">{wasteData.wastePercentage?.[item]}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {wasteData.totalLoss && Object.keys(wasteData.totalLoss).length > 0 && (
                        <div className="breakdown-section total-loss-section">
                          <h4>Total Loss (Waste + Leftovers)</h4>
                          <div className="breakdown-table">
                            <div className="table-header">
                              <div className="col-item">Ingredient</div>
                              <div className="col-qty">Expected (kg)</div>
                              <div className="col-qty">Total Loss (kg)</div>
                              <div className="col-percent">Loss %</div>
                            </div>
                            {Object.entries(wasteData.totalLoss).map(([item, totalLossQty]) => (
                              <div key={`loss-${item}`} className="table-row loss-row">
                                <div className="col-item">{item}</div>
                                <div className="col-qty">{wasteData.totalIngredients[item]?.toFixed(2)}</div>
                                <div className="col-qty">{totalLossQty?.toFixed(2) || 0}</div>
                                <div className="col-percent">{wasteData.totalLossPercentage?.[item]}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {wasteView === 'graphs' && (
                    <div className="waste-graphs">
                      <div className="graph-controls">
                        <button
                          className={`graph-control-btn ${validSelectedWasteGraph === 'intro' ? 'active' : ''}`}
                          onClick={() => setSelectedWasteGraph('intro')}
                        >
                          Graph Guide
                        </button>
                        <button
                          className={`graph-control-btn ${validSelectedWasteGraph === 'all' ? 'active' : ''}`}
                          onClick={() => setSelectedWasteGraph('all')}
                        >
                          Show All Graphs
                        </button>
                        {wasteGraphDefinitions.map((graph) => (
                          <button
                            key={graph.id}
                            className={`graph-control-btn ${validSelectedWasteGraph === graph.id ? 'active' : ''}`}
                            onClick={() => setSelectedWasteGraph(graph.id)}
                          >
                            {graph.label}
                          </button>
                        ))}
                      </div>

                      {validSelectedWasteGraph === 'intro' ? (
                        <div className="graph-intro-panel">
                          <h4>How To Use Graphs</h4>
                          <p>Select any graph button above to open one graph, or use Show All Graphs to compare everything together.</p>
                          <p>Recommended order: Waste % Bars, then Waste Ingredients Pie, then Waste Recipes Pie, then Ingredient Loss Mix.</p>
                        </div>
                      ) : (
                        <div className="graph-grid">
                          {visibleWasteGraphs.map((graph) => (
                            <React.Fragment key={graph.id}>{graph.content}</React.Fragment>
                          ))}
                        </div>
                      )}

                      <div className="graph-explainer">
                        <h4>Graph Explanations</h4>
                        {validSelectedWasteGraph === 'intro' ? (
                          <div className="graph-explainer-item">
                            <h5>Graph Guide</h5>
                            <p>Use the controls above to focus on one graph at a time. This helps compare metrics clearly without visual overload.</p>
                          </div>
                        ) : validSelectedWasteGraph === 'all' ? (
                          <div className="graph-explainer-list">
                            {wasteGraphDefinitions.map((graph) => (
                              <div key={`${graph.id}-info`} className="graph-explainer-item">
                                <h5>{graph.label}</h5>
                                <p>{graph.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="graph-explainer-item">
                            <h5>{selectedWasteGraphDetails?.label}</h5>
                            <p>{selectedWasteGraphDetails?.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <p>Select a date and click "View Waste Report" to see waste analysis</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPanel;
