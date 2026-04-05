# Smart Mess System - Project Summary for Review

## 1. Project Overview

Smart Mess System is a role-based mess management platform built with a React frontend and a Node.js microservice backend. It supports three main user roles:

- Student
- Admin
- Staff

The system lets students:

- view daily menus
- submit meal responses
- receive notifications when menus are updated
- send messages to admin and staff
- view their own previous responses and messages

The system lets admin:

- manage menus
- view response-based ingredient calculations
- inspect waste and leftover analytics
- view student messages

The system lets staff:

- record waste and leftovers
- review student messages

The backend is accessed through a gateway on port 5000, which load-balances requests to service instances.

---

## 2. High-Level Architecture

The project follows a microservice-style structure.

### Main flow

Browser -> React Frontend -> API Gateway -> Service Instance -> MongoDB / Redis / RabbitMQ -> Response back to UI

### Services

- `gateway/`
  - reverse proxy and round-robin load balancer
- `auth-service/`
  - login, registration, token-based auth, role handling
- `menu-service/`
  - menu CRUD, menu retrieval, menu notifications, notification read tracking
- `response-service/`
  - student meal responses and student messages
- `calculation-service/`
  - ingredient calculation, waste calculation, RabbitMQ consumer, scheduled calculation
- `staff-service/`
  - staff-facing operations and related APIs
- `notification-service/`
  - notification-related work if required by service split
- `frontend/`
  - React dashboards for student, admin, and staff

---

## 3. Gateway and Load Balancing

### Important files

- [gateway/server.js](gateway/server.js)
- [gateway/load-balancer.js](gateway/load-balancer.js)

### What the gateway does

The gateway listens on port 5000 and forwards requests to the right service:

- `/api/auth` -> auth service
- `/api/menu` -> menu service
- `/api/response` -> response service
- `/api/calculate` -> calculation service
- `/api/dashboard` -> calculation service
- `/api/waste` -> calculation service
- `/api/recipe` -> calculation service

### Load balancing

Each service has multiple instances, and the gateway distributes requests in round-robin order.

Example:

- Auth service -> ports 5001, 5011, 5021
- Menu service -> ports 5002, 5012, 5022
- Response service -> ports 5003, 5013, 5023
- Calculation service -> ports 5004, 5014, 5024

This means one request goes to one instance, next request goes to the next instance, and so on.

### Why this matters

You can explain to your teacher that the gateway is the single entry point and it improves scalability and separation of concerns.

---

## 4. Frontend Overview

### Main frontend files

- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)
- [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)
- [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)
- [frontend/src/styles/AdminPanel.css](frontend/src/styles/AdminPanel.css)
- [frontend/src/styles/StudentDashboard.css](frontend/src/styles/StudentDashboard.css)
- [frontend/src/styles/StaffDashboard.css](frontend/src/styles/StaffDashboard.css)

### Frontend tech stack

- React
- Vite
- React Router
- Lucide icons
- fetch API for backend calls

The frontend is a dashboard-based interface. Each role has its own page and its own tabs/sections.

---

## 5. Student Dashboard

### File

- [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)

### Main tabs

- View Menu
- Submit Response
- My Responses
- Messages

### What each tab does

#### View Menu

Student selects a date and fetches the menu for that day.

#### Submit Response

Student chooses:

- breakfast portion
- lunch portion
- dinner portion

Then submits a response for the selected date.

#### My Responses

Student can see all responses they have submitted, and they can edit or delete them if allowed by backend rules.

#### Messages

Student can send a free-form message to admin and staff. The same tab also shows previously sent messages from that student.

### Key student-side features

- notification bell with unread count
- mark one notification read
- mark all notifications read
- polling every 30 seconds for fresh notifications
- message submission and own-message history

### Important code areas

The student dashboard uses functions such as:

- `handleFetchMenu()`
- `handleSubmissionDateChange()`
- `handleSubmitResponse()`
- `handleGetMyResponses()`
- `handleUpdateResponse()`
- `handleDeleteResponse()`
- `handleFetchNotifications()`
- `handleMarkNotificationRead()`
- `handleMarkAllNotificationsRead()`
- `handleSubmitStudentMessage()`
- `handleFetchMyMessages()`

### Student data flow

1. Student selects date.
2. Frontend requests menu from gateway.
3. Frontend submits response or message.
4. Gateway forwards request to response or menu service.
5. Backend saves data in MongoDB and clears caches where needed.
6. Student UI refreshes with new data.

---

## 6. Admin Panel

### File

- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)

### Main sections

- Dashboard
- Menu Management
- Calculations
- Waste Tracking
- Student Messages

### Menu Management section

This section is now broken into separate internal tabs:

- View Menus
- Add Menu
- Update Menu
- Delete Menu

Inside Add and Update menu screens, there are meal-specific sub-tabs:

- Breakfast
- Lunch
- Dinner

This was intentionally done so Menu Management feels like a dashboard with distinct sections, not a long form.

### Menu management behavior

Admin can:

- choose a date
- select menu items for breakfast, lunch, dinner
- save a new menu
- update a menu
- delete a menu
- view menus for a specific date

### Visual UI changes in menu management

The menu page uses:

- section cards
- meal cards
- meal-specific tabs
- selectable item cards
- custom checkboxes
- distinct meal theme colors

### Breakfast/Lunch/Dinner section styling

Each meal section has its own look:

- Breakfast -> orange accent
- Lunch -> green accent
- Dinner -> blue accent

This makes the screen easier to scan and explains to the teacher that the UI is grouped by meal category.

### Calculations section

Admin can load ingredient calculation data for a selected date.

This section shows:

- date
- total responses
- breakfast ingredients
- lunch ingredients
- dinner ingredients
- calculation history

### Waste Tracking section

This is one of the most visually important parts of the project.

It contains three internal tabs, similar to a dashboard analytics view:

- Summary
- Breakdown
- Graphs

#### Summary tab

Shows:

- leftover ingredients
- waste ingredients
- total loss
- total quantity
- top leftover item
- top wasted ingredient
- top wasted recipe

#### Breakdown tab

Shows ingredient-level breakdown tables.

#### Graphs tab

Shows chart-based views for waste analytics.

### Student Messages section

Admin can see all student messages in a separate section.

Each message card shows:

- student name
- student email
- message content
- created time

### Important admin functions

- `handleViewMenus()`
- `handleAddMenu()`
- `handleUpdateMenu()`
- `handleDeleteMenu()`
- `handleFetchCalculation()`
- `handleDeleteCalculation()`
- `handleFetchWasteData()`
- `handleFetchStudentMessages()`

### Important admin-side data flow

1. Admin adds or updates a menu.
2. Menu service stores the update.
3. Menu service clears cache and creates notification.
4. Students receive notification in their dashboard.
5. Admin can later inspect menu response calculations and waste analytics.
6. Admin can also read messages submitted by students.

---

## 7. Staff Dashboard

### File

- [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)

### Main tabs

- Record Waste
- Student Messages

### Record Waste tab

Staff can record:

- total bin waste
- leftovers per dish

The screen is designed for the v2 mode, which is the current active flow.

### Student Messages tab

Staff can see all student messages in a separate panel.

Each card shows:

- student name
- student email
- message
- date/time

### Important staff-side behavior

- uses the same backend message endpoint as admin
- refresh button fetches latest messages
- same dark dashboard theme as the rest of the app

---

## 8. Backend Request Flow in Detail

### Menu update flow

1. Admin submits menu from frontend.
2. Request goes to gateway.
3. Gateway forwards to menu service.
4. Menu service stores menu in MongoDB.
5. Menu service clears Redis cache for that menu date.
6. Menu service creates a notification for students.
7. Student dashboard shows the notification and unread count.

### Student response flow

1. Student chooses date and meal portions.
2. Student submits response.
3. Request goes to gateway -> response service.
4. Response service validates user role and time window.
5. Response is saved in MongoDB.
6. Caches are invalidated.
7. RabbitMQ message is published to `meal_queue`.
8. Calculation service consumer receives the message and runs calculations.
9. Admin dashboard later shows those updated calculations and waste values.

### Student message flow

1. Student writes a message.
2. Message is sent to response service.
3. Response service stores it in the `student messages` collection.
4. Admin and staff fetch from `/message/all`.
5. Student fetches own messages from `/message/my`.

### Notification flow

1. Admin adds/updates menu.
2. Menu service creates notification record.
3. Student polls notification endpoint.
4. Student sees unread badge.
5. Read state is stored per user.

---

## 9. Redis, RabbitMQ, and MongoDB Roles

### MongoDB

MongoDB stores:

- menus
- student responses
- calculation data
- waste data
- notifications
- notification read receipts
- student messages

### Redis

Redis is used for caching to reduce repeated database reads.

Examples:

- menu by date
- student responses
- student messages
- notifications

### RabbitMQ

RabbitMQ is used for background processing of meal responses.

The queue name is `meal_queue`.

Why this matters:

- student submits response quickly
- calculation happens asynchronously
- backend remains responsive

---

## 10. Important Advanced CSS Work

A lot of the visible polish was done with CSS, and this is worth mentioning in your review.

### Main design goals

- make the app feel like a real dashboard
- avoid flat, generic forms
- use card-based sections
- keep it readable under a dark theme
- separate different meal categories clearly
- make tabs feel like real section selectors

### CSS patterns used

#### Card surfaces

Most panels use dark gradients like:

```css
background: linear-gradient(145deg, #1a1a1a, #111111);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
box-shadow: 0 10px 22px rgba(0, 0, 0, 0.26);
```

This gives depth without making the page too heavy.

#### Selectable cards for menu items

Each menu item is a card now, not a plain checkbox row.

```css
.dish-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dish-checkbox.active {
  border-color: #ff8c00;
  background: rgba(255, 140, 0, 0.1);
}
```

#### Custom checkbox styling

The default checkbox look was replaced with a custom one using `appearance: none`.

```css
.dish-checkbox input[type="checkbox"] {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
}
```

This makes the checkbox feel modern and consistent with the dashboard theme.

#### Meal-specific themes

Breakfast, lunch, and dinner have different accent colors and tinted backgrounds. This helps the teacher see clearly that sections are logically separated.

#### Tabs

Tabs were upgraded so they stand out when active and still look like part of the same design language.

#### Icons

Meal headings use Lucide icons instead of emoji:

- `Coffee`
- `UtensilsCrossed`
- `Soup`

That keeps the UI professional.

### Why the CSS work is important

This project is not just functionally correct, it is visually organized. You can mention that dashboard usability improved because:

- item grouping became clearer
- meal types are visually distinct
- cards reduce clutter
- active tabs are easier to spot
- the app feels like a proper product, not a raw form

---

## 11. What to Say During Review

Use this structure:

### A. Start with architecture

"The system is built as a microservice-based mess management platform. All frontend requests go through an API gateway, and the gateway forwards them to different service instances using round-robin load balancing."

### B. Explain role separation

"Students can view menus, submit responses, receive notifications, and send messages. Admin manages menus, calculations, and waste. Staff records waste and reviews student messages."

### C. Explain response handling

"When a student submits a response, the response service saves it and sends a RabbitMQ message. The calculation service consumes that message and updates ingredient calculations in the background."

### D. Explain notifications

"When admin changes a menu, the menu service stores a notification and students can see it in their dashboard. The app also tracks read and unread status per user."

### E. Explain UI work

"We used a dark dashboard system with gradient cards, selectable item cards, meal-specific colors, Lucide icons, and responsive grids to make the UI easier to scan."

---

## 12. Short Speaking Script

If you need a short explanation in class:

"Smart Mess System is a microservice-based mess application. The frontend is a React dashboard for students, admin, and staff. All requests go through a gateway with load balancing. Students can view menus, submit meal responses, receive notifications, and send messages. Admin manages menus, calculations, waste, and student messages. Staff records waste and views messages. Responses are sent to RabbitMQ so the calculation service can update ingredient usage asynchronously. Redis is used for caching, and MongoDB stores the main data. We also improved the UI with dark dashboard cards, meal-specific sections, custom checkboxes, and Lucide icons so it feels like a professional product."

---

## 13. Suggested Files to Open Before Review

- [gateway/server.js](gateway/server.js)
- [gateway/load-balancer.js](gateway/load-balancer.js)
- [menu-service/src/routes/menu.routes.js](menu-service/src/routes/menu.routes.js)
- [response-service/src/routes/response.routes.js](response-service/src/routes/response.routes.js)
- [calculation-service/src/consumer.js](calculation-service/src/consumer.js)
- [calculation-service/src/server.js](calculation-service/src/server.js)
- [frontend/src/pages/AdminPanel.jsx](frontend/src/pages/AdminPanel.jsx)
- [frontend/src/pages/StudentDashboard.jsx](frontend/src/pages/StudentDashboard.jsx)
- [frontend/src/pages/StaffDashboard.jsx](frontend/src/pages/StaffDashboard.jsx)
- [frontend/src/styles/AdminPanel.css](frontend/src/styles/AdminPanel.css)
- [frontend/src/styles/StudentDashboard.css](frontend/src/styles/StudentDashboard.css)
- [frontend/src/styles/StaffDashboard.css](frontend/src/styles/StaffDashboard.css)

---

## 14. Final Review Summary

The Smart Mess System is a fully integrated role-based mess management platform with:

- a gateway-based backend
- load-balanced microservices
- MongoDB persistence
- Redis caching
- RabbitMQ-based asynchronous calculation updates
- role-specific dashboards
- notification and read tracking
- student messaging
- waste and leftover analytics
- a polished dashboard-style UI

The frontend and backend are connected in a way that makes the system easy to explain as a real-world microservice application.
