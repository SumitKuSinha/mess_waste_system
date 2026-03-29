import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StudentDashboard.css';

function StudentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('menu');
  const [selectedDate, setSelectedDate] = useState('');
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  // Response submission states
  const [response, setResponse] = useState({
    date: '',
    breakfast: '',
    lunch: '',
    dinner: ''
  });
  
  // Menu for response submission
  const [submissionMenu, setSubmissionMenu] = useState(null);

  // My responses states
  const [myResponses, setMyResponses] = useState([]);
  const [responseToUpdate, setResponseToUpdate] = useState({
    id: '',
    date: '',
    breakfast: '',
    lunch: '',
    dinner: ''
  });

  // Fetch menu by date
  const handleFetchMenu = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/menu/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMenu(data);
        setMessage('✓ Menu loaded');
        setTimeout(() => setMessage(''), 2000);
      } else {
        setMenu(null);
        setMessage('✗ No menu available for this date');
      }
    } catch (error) {
      setMenu(null);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch menu for submission when date changes
  const handleSubmissionDateChange = async (date) => {
    setResponse({ ...response, date, breakfast: '', lunch: '', dinner: '' });
    
    if (!date) {
      setSubmissionMenu(null);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/menu/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionMenu(data);
      } else {
        setSubmissionMenu(null);
        setMessage('✗ No menu available for this date');
      }
    } catch (error) {
      setSubmissionMenu(null);
    } finally {
      setLoading(false);
    }
  };

  // Submit response
  const handleSubmitResponse = async () => {
    if (!response.date) {
      setMessage('Please select a date');
      return;
    }
    if (!response.breakfast || !response.lunch || !response.dinner) {
      setMessage('Please select portions for all meals');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      // Send in correct format with meals object
      const submitData = {
        date: response.date,
        meals: {
          breakfast: response.breakfast.toLowerCase(),
          lunch: response.lunch.toLowerCase(),
          dinner: response.dinner.toLowerCase()
        }
      };

      const res = await fetch('http://localhost:5000/api/response/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        setMessage('✓ Response submitted successfully');
        setResponse({ date: '', breakfast: '', lunch: '', dinner: '' });
        // Add a small delay to ensure backend has processed
        setTimeout(() => {
          handleGetMyResponses();
        }, 500);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.json();
        setMessage(`✗ Error: ${error.message || 'Failed to submit'}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get my responses
  const handleGetMyResponses = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/response/my-all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Responses fetched:', data);
        
        // Handle both array and single object responses
        let responsesArray = [];
        if (Array.isArray(data)) {
          responsesArray = data;
        } else if (data && typeof data === 'object') {
          // If it's a single response object
          if (data._id || data.id) {
            responsesArray = [data];
          } else if (data.responses && Array.isArray(data.responses)) {
            responsesArray = data.responses;
          } else if (data.data && Array.isArray(data.data)) {
            responsesArray = data.data;
          } else {
            responsesArray = [data];
          }
        }
        
        setMyResponses(responsesArray);
        if (responsesArray.length > 0) {
          setMessage(`✓ Loaded ${responsesArray.length} response(s)`);
          setTimeout(() => setMessage(''), 2000);
        }
      } else {
        setMyResponses([]);
        setMessage('✗ No responses found');
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      setMyResponses([]);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update response
  const handleUpdateResponse = async () => {
    if (!responseToUpdate.id || !responseToUpdate.date) {
      setMessage('Please fill all fields');
      return;
    }
    if (!responseToUpdate.breakfast || !responseToUpdate.lunch || !responseToUpdate.dinner) {
      setMessage('Please select portions for all meals');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      // Send in correct format with meals object
      const updateData = {
        id: responseToUpdate.id,
        date: responseToUpdate.date,
        meals: {
          breakfast: responseToUpdate.breakfast.toLowerCase(),
          lunch: responseToUpdate.lunch.toLowerCase(),
          dinner: responseToUpdate.dinner.toLowerCase()
        }
      };

      const res = await fetch('http://localhost:5000/api/response/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setMessage('✓ Response updated successfully');
        setResponseToUpdate({ id: '', date: '', breakfast: '', lunch: '', dinner: '' });
        setTimeout(() => {
          handleGetMyResponses();
        }, 500);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.json();
        setMessage(`✗ Error: ${error.message || 'Failed to update'}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete response
  const handleDeleteResponse = async (date) => {
    if (!window.confirm('Are you sure you want to delete this response?')) {
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/response/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date })
      });

      if (res.ok) {
        setMessage('✓ Response deleted successfully');
        setTimeout(() => {
          handleGetMyResponses();
        }, 500);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.json();
        setMessage(`✗ Error: ${error.message || 'Failed to delete'}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load my responses on component mount
  useEffect(() => {
    handleGetMyResponses();
    // Load user info from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Logout handler
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="student-header">
        <h1>Student Dashboard</h1>
        <div className="header-actions">
          <div className="header-user">
            <span>{user?.name || user?.email || 'Student'}</span>
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
      <div className="student-content">
        {/* Message */}
        {message && (
          <div className={`message ${message.startsWith('✓') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="student-tabs">
          <button
            className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            View Menu
          </button>
          <button
            className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => setActiveTab('submit')}
          >
            Submit Response
          </button>
          <button
            className={`tab-btn ${activeTab === 'myResponses' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('myResponses');
              handleGetMyResponses();
            }}
          >
            My Responses
          </button>
        </div>

        {/* TAB: VIEW MENU */}
        {activeTab === 'menu' && (
          <div className="tab-content">
            <h2>View Menu</h2>
            <div className="form-group">
              <label>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleFetchMenu}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View Menu'}
            </button>

            {menu && (
              <div className="menu-display">
                <h3>Menu for {menu.date}</h3>
                
                <div className="meal-display">
                  <h4>Breakfast</h4>
                  <div className="dishes-list">
                    {menu.breakfast && menu.breakfast.map(dish => (
                      <span key={dish} className="dish-item">{dish}</span>
                    ))}
                  </div>
                </div>

                <div className="meal-display">
                  <h4>Lunch</h4>
                  <div className="dishes-list">
                    {menu.lunch && menu.lunch.map(dish => (
                      <span key={dish} className="dish-item">{dish}</span>
                    ))}
                  </div>
                </div>

                <div className="meal-display">
                  <h4>Dinner</h4>
                  <div className="dishes-list">
                    {menu.dinner && menu.dinner.map(dish => (
                      <span key={dish} className="dish-item">{dish}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: SUBMIT RESPONSE */}
        {activeTab === 'submit' && (
          <div className="tab-content">
            <h2>Submit Your Response</h2>
            
            <div className="form-group">
              <label>Select Date</label>
              <input
                type="date"
                value={response.date}
                onChange={(e) => handleSubmissionDateChange(e.target.value)}
              />
            </div>

            {submissionMenu ? (
              <>
                <div className="menu-display-info">
                  <p><strong>Menu Date:</strong> {response.date}</p>
                  <p><strong>Available Meals:</strong></p>
                  <ul className="menu-info-list">
                    <li><strong>Breakfast:</strong> {submissionMenu.breakfast?.join(', ')}</li>
                    <li><strong>Lunch:</strong> {submissionMenu.lunch?.join(', ')}</li>
                    <li><strong>Dinner:</strong> {submissionMenu.dinner?.join(', ')}</li>
                  </ul>
                </div>

                <div className="meal-section">
                  <h4>Breakfast Portion</h4>
                  <select
                    value={response.breakfast}
                    onChange={(e) => setResponse({ ...response, breakfast: e.target.value })}
                    className="dish-select"
                  >
                    <option value="">-- Select Portion --</option>
                    <option value="Full">Full</option>
                    <option value="Half">Half</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div className="meal-section">
                  <h4>Lunch Portion</h4>
                  <select
                    value={response.lunch}
                    onChange={(e) => setResponse({ ...response, lunch: e.target.value })}
                    className="dish-select"
                  >
                    <option value="">-- Select Portion --</option>
                    <option value="Full">Full</option>
                    <option value="Half">Half</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div className="meal-section">
                  <h4>Dinner Portion</h4>
                  <select
                    value={response.dinner}
                    onChange={(e) => setResponse({ ...response, dinner: e.target.value })}
                    className="dish-select"
                  >
                    <option value="">-- Select Portion --</option>
                    <option value="Full">Full</option>
                    <option value="Half">Half</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSubmitResponse}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Response'}
                </button>
              </>
            ) : (
              <div className="empty-state">
                <p>Please select a date to see available menu options</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: MY RESPONSES */}
        {activeTab === 'myResponses' && (
          <div className="tab-content">
            <h2>My Responses</h2>

            {myResponses.length > 0 ? (
              <div className="responses-list">
                {myResponses.map((resp) => (
                  <div key={resp._id} className="response-card">
                  <div className="response-header">
                      <h4>Date: {resp.date}</h4>
                      <div className="response-actions">
                        <button
                          className="btn-edit"
                          onClick={async () => {
                            // Fetch menu for this date when editing
                            const token = localStorage.getItem('token');
                            try {
                              const res = await fetch(`http://localhost:5000/api/menu/${resp.date}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (res.ok) {
                                const menuData = await res.json();
                                setSubmissionMenu(menuData);
                              }
                            } catch (error) {
                              console.error('Error fetching menu:', error);
                            }
                            
                            // Get portion values with fallback
                            const breakfast = (resp.meals?.breakfast || resp.breakfast || '').toUpperCase();
                            const lunch = (resp.meals?.lunch || resp.lunch || '').toUpperCase();
                            const dinner = (resp.meals?.dinner || resp.dinner || '').toUpperCase();
                            
                            setResponseToUpdate({
                              id: resp._id,
                              date: resp.date,
                              breakfast: breakfast,
                              lunch: lunch,
                              dinner: dinner
                            });
                            setActiveTab('update');
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteResponse(resp.date)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p><strong>Breakfast Portion:</strong> {(resp.meals?.breakfast || resp.breakfast || 'Not selected').toUpperCase()}</p>
                    <p><strong>Lunch Portion:</strong> {(resp.meals?.lunch || resp.lunch || 'Not selected').toUpperCase()}</p>
                    <p><strong>Dinner Portion:</strong> {(resp.meals?.dinner || resp.dinner || 'Not selected').toUpperCase()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No responses submitted yet</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: UPDATE RESPONSE */}
        {activeTab === 'update' && (
          <div className="tab-content">
            <h2>Update Response</h2>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={responseToUpdate.date}
                onChange={(e) => setResponseToUpdate({ ...responseToUpdate, date: e.target.value })}
              />
            </div>

            <div className="meal-section">
              <h4>Breakfast Portion</h4>
              <select
                value={responseToUpdate.breakfast}
                onChange={(e) => setResponseToUpdate({ ...responseToUpdate, breakfast: e.target.value })}
                className="dish-select"
              >
                <option value="">-- Select Portion --</option>
                <option value="Full">Full</option>
                <option value="Half">Half</option>
                <option value="None">None</option>
              </select>
            </div>

            <div className="meal-section">
              <h4>Lunch Portion</h4>
              <select
                value={responseToUpdate.lunch}
                onChange={(e) => setResponseToUpdate({ ...responseToUpdate, lunch: e.target.value })}
                className="dish-select"
              >
                <option value="">-- Select Portion --</option>
                <option value="Full">Full</option>
                <option value="Half">Half</option>
                <option value="None">None</option>
              </select>
            </div>

            <div className="meal-section">
              <h4>Dinner Portion</h4>
              <select
                value={responseToUpdate.dinner}
                onChange={(e) => setResponseToUpdate({ ...responseToUpdate, dinner: e.target.value })}
                className="dish-select"
              >
                <option value="">-- Select Portion --</option>
                <option value="Full">Full</option>
                <option value="Half">Half</option>
                <option value="None">None</option>
              </select>
            </div>

            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleUpdateResponse}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Response'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setActiveTab('myResponses');
                  setResponseToUpdate({ id: '', date: '', breakfast: '', lunch: '', dinner: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
