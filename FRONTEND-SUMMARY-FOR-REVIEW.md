# Smart Mess System - Frontend Summary for Review

## 1. What This Frontend Does

The frontend is the user-facing React application for the Smart Mess System. It provides separate experiences for:

- student
- admin
- staff

It handles:

- landing page marketing and navigation
- signup and login
- role-based routing
- protected dashboard access
- menu viewing and meal response submission
- admin menu management and analytics views
- staff waste tracking and message handling

The frontend talks to the backend through the API gateway.

---

## 2. Frontend Stack

### Important files

- [frontend/package.json](frontend/package.json)
- [frontend/src/main.jsx](frontend/src/main.jsx)
- [frontend/src/App.jsx](frontend/src/App.jsx)
- [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)

### Libraries and tools

- React 19
- Vite
- React Router
- axios for API requests
- lucide-react for icons
- AOS for scroll animations on the landing page

### Styling approach

The app uses custom CSS instead of a component library. The visual system is built around:

- dark background surfaces
- orange accent colors
- card-based layouts
- dashboard sections with strong spacing and contrast
- responsive behavior for smaller screens

The global style base lives in [frontend/src/App.css](frontend/src/App.css).

---

## 3. App Entry and Routing

### File: [frontend/src/main.jsx](frontend/src/main.jsx)

This is the React entry point.

What it does:

- imports React and ReactDOM
- imports the main app component
- mounts the app into the root DOM node

### File: [frontend/src/App.jsx](frontend/src/App.jsx)

This file defines the route map.

Main routes:

- `/` -> landing page
- `/login` -> login page
- `/signup` -> signup page
- `/admin-panel` -> admin dashboard
- `/student-dashboard` -> student dashboard
- `/staff-dashboard` -> staff dashboard

The dashboard routes are wrapped in `ProtectedRoute`, so the role-based screens are not directly accessible without auth.

### Why this matters

This is the main place to explain the app structure in a review:

- public pages are separate from logged-in pages
- role-specific dashboards are enforced at the route level
- the frontend is organized by user journey, not by backend service

---

## 4. Route Protection

### File: [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)

This component guards private routes.

What it checks:

- `token` from `localStorage`
- `role` from `localStorage`

Behavior:

- if there is no token, redirect to `/login`
- if the role does not match the requested dashboard role, redirect to the correct dashboard for the stored role
- if everything matches, render the requested dashboard

### Why it matters

This is the frontend access-control layer. It makes sure a student does not open admin pages and vice versa.

---

## 5. Landing Page

### File: [frontend/src/pages/LandingPage.jsx](frontend/src/pages/LandingPage.jsx)

The landing page is the public entry screen for the app.

What it contains:

- top navigation bar
- hero section with call-to-action buttons
- feature cards for student, admin, staff, and calculation capabilities
- a simple workflow explanation
- benefits section
- testimonials
- stats section
- final signup call to action

### Visual behavior

The page uses:

- AOS animations for reveal effects
- Lucide icons for a cleaner visual style
- image-backed hero presentation
- strong section separation for readability

### Why it matters

This page is the first impression of the system and communicates that the platform is a structured mess-management product rather than a simple menu form.

---

## 6. Login Page

### File: [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx)

The login page authenticates existing users.

Main fields:

- email
- password
- remember me checkbox

Main behaviors:

- sends login request to `/api/auth/login`
- stores token, user, and role in `localStorage`
- redirects users based on role after login
- shows loading and error states
- supports password visibility toggle

### UI details

The page also includes:

- icon-enhanced inputs
- illustration panel with product highlights
- a clean footer with signup link

### Why it matters

This page is the entry point for protected access, so it directly connects the frontend to the auth service and the role-based dashboards.

---

## 7. Signup Page

### File: [frontend/src/pages/SignupPage.jsx](frontend/src/pages/SignupPage.jsx)

The signup page creates new users.

Main fields:

- name
- email
- password
- confirm password
- role selection

Role choices:

- student
- admin
- staff

Main behaviors:

- validates password confirmation
- validates minimum password length
- sends signup request to `/api/auth/signup`
- stores token, user, and role after successful signup
- redirects the user to the correct dashboard

### Role selector design

The role picker is intentionally presented as large selectable cards so the signup screen feels like a role assignment flow, not a generic form.

### Why it matters

This page establishes the identity of each user before they enter the dashboards, which is important for the rest of the app flow.

---

## 8. Dashboard Overview

### Main dashboard files

- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)
- [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)
- [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)

These pages are the main working screens for the application.

---

## 9. Student Dashboard

### File: [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)

The student dashboard lets a student interact with daily mess data.

Main areas:

- view menu
- submit response
- my responses
- messages

### Student features

- fetch menu for a selected date
- submit breakfast, lunch, and dinner preferences
- review submitted responses
- update or delete responses where allowed
- receive notifications about menu updates
- mark a notification read
- mark all notifications read
- send messages to admin and staff
- view sent messages

### Why it matters

This is the main student interaction point for the platform, so it combines menu visibility, response capture, notifications, and messaging in one screen.

---

## 10. Admin Panel

### File: [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)

The admin panel is the control center for the system.

Main sections:

- dashboard
- menu management
- calculations
- waste tracking
- student messages

### Menu management design

The menu management area is split into smaller UI sections so it behaves like a dashboard instead of a long form.

It includes:

- view menus
- add menu
- update menu
- delete menu

Inside add and update flows, the meal sections are separated into:

- breakfast
- lunch
- dinner

### Visual direction

The admin interface uses:

- section cards
- meal cards
- selectable item cards
- custom checkbox states
- distinct meal color accents

This makes the page easier to scan during a demo or viva.

### Why it matters

The admin panel is where the strongest frontend organization work happens, because the user needs to manage menus, inspect outputs, and review messages without the screen becoming cluttered.

---

## 11. Staff Dashboard

### File: [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)

The staff dashboard is focused on operational follow-up.

Main functions:

- record waste or leftover data
- review student messages
- support inventory and feedback tracking

### Why it matters

This screen keeps the staff workflow separate from the admin workflow while still giving access to the same core operational data.

---

## 12. Visual System

### Files

- [frontend/src/App.css](frontend/src/App.css)
- [frontend/src/styles/LandingPage.css](frontend/src/styles/LandingPage.css)
- [frontend/src/styles/Auth.css](frontend/src/styles/Auth.css)
- [frontend/src/styles/AdminPanel.css](frontend/src/styles/AdminPanel.css)
- [frontend/src/styles/StudentDashboard.css](frontend/src/styles/StudentDashboard.css)
- [frontend/src/styles/StaffDashboard.css](frontend/src/styles/StaffDashboard.css)

### Design choices

The frontend uses a consistent presentation style:

- dark theme base
- orange primary accent
- rounded card surfaces
- strong section spacing
- clean icon usage
- responsive layout adjustments

### Why this matters

The UI changes make the system feel like one coherent product rather than separate unrelated pages.

---

## 13. Data Flow From Frontend to Backend

Typical flow:

1. User opens the landing page.
2. User signs up or logs in.
3. Frontend sends auth requests through the gateway.
4. Token and role are stored in `localStorage`.
5. Protected routes send the user to the correct dashboard.
6. Dashboard actions call backend APIs for menus, responses, notifications, messages, calculations, or waste tracking.

This keeps the frontend thin and the business logic on the backend services.

---

## 14. Review Notes

### Strong points

- clean route separation between public and private screens
- role-based access control on the client side
- dashboard pages are organized by user task
- the UI has a consistent dark/orange identity
- the landing page explains the product clearly

### One thing to verify before review

- the signup flow currently routes staff users to `/staff-panel`, while the router defines `/staff-dashboard`

That path should be checked before presenting the frontend in a final demo.

---

## 15. Short Review Summary

The frontend is a React/Vite app with role-based routing, protected dashboards, and a consistent custom UI. It covers the full user journey from landing page to login/signup and then into student, admin, and staff dashboards.

The main value of the frontend is that it organizes mess management into separate role-based screens, while keeping the styling and navigation consistent across the whole system.