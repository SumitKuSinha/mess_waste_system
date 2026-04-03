import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  UtensilsCrossed,
  ShieldCheck,
  Calculator,
  ClipboardCheck,
  Leaf,
  Clock3,
  BarChart3,
  Lock,
  Quote
} from 'lucide-react';
import '../styles/LandingPage.css';

function LandingPage() {
  useEffect(() => {
    AOS.init({
      duration: 700,
      once: false,
      mirror: true,
      easing: 'ease-out-cubic'
    });
  }, []);

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="logo">
            <img src="/clean-plate-logo.svg" alt="cleanPlate" className="logo-icon" />
            <span className="brand-name" aria-label="CleanPlate brand">
              <span className="brand-clean">Clean</span>
              <span className="brand-plate">Plate</span>
            </span>
          </div>
          <ul className="nav-menu">
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
            <li><Link to="/login" className="nav-login">Login</Link></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" style={{backgroundImage: 'url(https://images.pexels.com/photos/20408444/pexels-photo-20408444.jpeg)'}}>
        <div className="hero-overlay"></div>
        <div className="hero-content" data-aos="fade-up">
          <h1 className="hero-title">
            Optimize Your <span className="highlight">Mess</span> Management
          </h1>
          <p className="hero-subtitle">
            Smart meal planning, ingredient calculation, and waste tracking for your institution
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary btn-large">
              Get Started
            </Link>
            <a href="#about" className="btn btn-secondary btn-large">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 data-aos="fade-up">Key Features</h2>
        <div className="features-grid">
          {/* Student Features */}
          <div className="feature-card" data-aos="fade-up" data-aos-delay="60">
            <img src="/student_feature.png" alt="Student Portal" className="card-image" />
            <div className="feature-icon"><UtensilsCrossed size={18} /></div>
            <h3>Student Portal</h3>
            <ul className="feature-list">
              <li>Submit meal preferences</li>
              <li>View daily menu</li>
              <li>Modify responses anytime</li>
              <li>Time-locked submissions (9 AM - 9 PM)</li>
            </ul>
          </div>

          {/* Admin Features */}
          <div className="feature-card" data-aos="fade-up" data-aos-delay="120">
            <img src="/admin_feature.png" alt="Admin Dashboard" className="card-image" />
            <div className="feature-icon"><ShieldCheck size={18} /></div>
            <h3>Admin Dashboard</h3>
            <ul className="feature-list">
              <li>Create & manage daily menus</li>
              <li>Calculate ingredient requirements</li>
              <li>View waste analytics</li>
              <li>Generate reports</li>
            </ul>
          </div>

          {/* Staff Features */}
          <div className="feature-card" data-aos="fade-up" data-aos-delay="180">
            <img src="/staff_feature.png" alt="Staff Management" className="card-image" />
            <div className="feature-icon"><ClipboardCheck size={18} /></div>
            <h3>Staff Management</h3>
            <ul className="feature-list">
              <li>Track ingredient usage</li>
              <li>Submit waste data</li>
              <li>View staff dashboard</li>
              <li>Inventory optimization</li>
            </ul>
          </div>

          {/* Smart Calculation */}
          <div className="feature-card" data-aos="fade-up" data-aos-delay="240">
            <img src="/calculation_feature.png" alt="Smart Calculation" className="card-image" />
            <div className="feature-icon"><Calculator size={18} /></div>
            <h3>Smart Calculation</h3>
            <ul className="feature-list">
              <li>Automatic ingredient calculation</li>
              <li>10% wastage buffer</li>
              <li>Real-time processing</li>
              <li>Accurate planning</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="about" className="how-it-works">
        <h2 data-aos="fade-up">How It Works</h2>
        <div className="steps-container">
          <div className="step" data-aos="zoom-in" data-aos-delay="40">
            <div className="step-number">1</div>
            <h4>Create Menu</h4>
            <p>Admin creates daily menu with recipes</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step" data-aos="zoom-in" data-aos-delay="120">
            <div className="step-number">2</div>
            <h4>Student Responds</h4>
            <p>Students submit their meal preferences</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step" data-aos="zoom-in" data-aos-delay="200">
            <div className="step-number">3</div>
            <h4>Calculate</h4>
            <p>System calculates required ingredients</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step" data-aos="zoom-in" data-aos-delay="280">
            <div className="step-number">4</div>
            <h4>Track Waste</h4>
            <p>Staff logs waste and optimizes inventory</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <h2 data-aos="fade-up">Why Choose SmartMess?</h2>
        <div className="benefits-grid">
          <div className="benefit-item" data-aos="fade-up" data-aos-delay="60">
            <div className="benefit-icon"><Leaf size={18} /></div>
            <h3>Cost Reduction</h3>
            <p>Reduce food waste by 25% through smart planning and tracking</p>
          </div>
          <div className="benefit-item" data-aos="fade-up" data-aos-delay="120">
            <div className="benefit-icon"><Clock3 size={18} /></div>
            <h3>Efficiency</h3>
            <p>Automate calculations and save hours of manual planning</p>
          </div>
          <div className="benefit-item" data-aos="fade-up" data-aos-delay="180">
            <div className="benefit-icon"><BarChart3 size={18} /></div>
            <h3>Analytics</h3>
            <p>Get insights into waste patterns and optimize accordingly</p>
          </div>
          <div className="benefit-item" data-aos="fade-up" data-aos-delay="240">
            <div className="benefit-icon"><Lock size={18} /></div>
            <h3>Secure</h3>
            <p>Role-based access control ensures data security</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <h2 data-aos="fade-up">What People Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card" data-aos="fade-up" data-aos-delay="50">
            <Quote size={20} className="quote-icon" />
            <p>"Meal planning became predictable. We cut emergency ingredient purchases by a huge margin."</p>
            <h4>Mess Administrator</h4>
            <span>Engineering Campus</span>
          </div>
          <div className="testimonial-card" data-aos="fade-up" data-aos-delay="120">
            <Quote size={20} className="quote-icon" />
            <p>"Daily waste tracking helped us identify which dishes create recurring leftovers."</p>
            <h4>Kitchen Supervisor</h4>
            <span>Residential Hostel</span>
          </div>
          <div className="testimonial-card" data-aos="fade-up" data-aos-delay="190">
            <Quote size={20} className="quote-icon" />
            <p>"As a student, responding is easy and fast. Menu visibility is way better now."</p>
            <h4>Student Representative</h4>
            <span>Central Dining Block</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stat" data-aos="fade-up" data-aos-delay="50">
          <h3>22+</h3>
          <p>Recipes Available</p>
        </div>
        <div className="stat" data-aos="fade-up" data-aos-delay="100">
          <h3>3</h3>
          <p>User Roles</p>
        </div>
        <div className="stat" data-aos="fade-up" data-aos-delay="150">
          <h3>100%</h3>
          <p>Accurate Calculations</p>
        </div>
        <div className="stat" data-aos="fade-up" data-aos-delay="200">
          <h3>Real-time</h3>
          <p>Data Processing</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>Ready to Transform Your Mess?</h2>
        <p>Join thousands of institutions optimizing their meal planning</p>
        <Link to="/signup" className="btn btn-large">
          Start Free Today
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>cleanPlate</h4>
            <p>Intelligent mess management system</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#about">About</a></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#docs">Documentation</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 cleanPlate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
