# 🚀 Atomberg Performance Portal - Hackathon 1.0
**Enterprise-Grade In-House Goal Setting & Tracking System**

## 1. 🎯 Problem Statement
Organizations that rely on manual or fragmented goal-tracking methods (like spreadsheets, emails, and offline documents) often struggle with alignment, visibility, and accountability. These traditional methods create blind spots where managers cannot monitor team progress in real-time, employees lack clarity on organizational priorities, and HR teams struggle to piece together data at appraisal time.

**Our Solution:** We built a highly structured, digital, and scalable Goal Setting & Tracking Portal that supports the full lifecycle of employee performance—from goal creation to automated quarterly check-ins—ensuring an intuitive, reliable, and 100% audit-ready ecosystem.

---

## 2. 🌟 Functionality & BRD Feature Mapping

We have successfully implemented **all** mandatory and good-to-have features requested in the BRD document, completely matching the business constraints, except for one external integration.

| Feature Category | Requested Functionality (BRD) | Implementation Status |
| :--- | :--- | :--- |
| **Goal Creation** | Max 8 goals, Total weightage exactly 100%, Min 10% per goal. | ✅ Implemented (Strict Frontend + Backend validation) |
| **UoM Logic** | Support for Numeric, %, Timeline, and Zero-based inputs. | ✅ Implemented (Dynamic Server-Side Regex Engine) |
| **Manager Workflow** | L1 Managers can review, edit, approve, or request revisions. | ✅ Implemented (Multi-row Batch Review System) |
| **Shared Goals** | Managers can broadcast mandatory goals to the team. | ✅ Implemented (Algorithmic Broadcasting Engine) |
| **Check-in Phase** | System to track actual achievements against targets. | ✅ Implemented (Quarter-locked automated formulas) |
| **Admin Control** | HR tools to freeze quarters and unlock specific exceptions. | ✅ Implemented (Granular Overrides via Global Tree) |
| **Company Reports** | Export complete performance data into CSV/Excel. | ✅ Implemented (Memory-Buffered Zero-RAM Streams) |
| **Automated SLA** | Auto-approve goals if L1 Manager delays > 7 days. | ✅ Implemented (Midnight Cron APScheduler Daemon) |
| **Notifications** | Alerts for submissions, approvals, and reminders. | ✅ Implemented (Async Gmail SMTP & MS Teams Webhooks) |
| **External Auth** | Azure AD / SSO Integration. | ❌ Not Implemented (Opted for Secure Scrypt Passwords) |

---

## 3. 🔄 The Core User Lifecycle & Execution Flow

Our application follows a tightly coupled, interconnected lifecycle between the three primary roles:

1. **Employee Submission:** The employee enters the Optimistic UI Sandbox to draft goals. They must balance exactly 100% weightage across max 8 goals.
2. **Manager Approval & Locks:** The manager reviews the sheet. Once approved, the goal receives a `manager_locked = true` state. Manager targets become completely immutable. 
3. **Automated Admin Freezes:** At the end of the goal-setting phase, the system or HR Admin applies an `admin_locked = true` state organization-wide.
4. **Performance Calculation:** Employees enter their 'Actuals'. The backend applies a **Semantic Inverted Inference Engine** (e.g., if target is "Reduce TAT", lower is better, triggering inverted math) and SLA timeline caps (80% penalty for late completion).
5. **The Power of the Admin:** Only the Admin has the ultimate power to bypass these strict locks using the Exception Handling tool. The admin can selectively drop locks for *Targets* (resetting the entire flow) or *Actuals* (allowing check-in edits without unlocking manager targets).

---

## 4. ⚡ System Design, Caching & Advanced Load Handling

To replicate the performance of enterprise SaaS applications, we implemented a state-of-the-art caching and distributed data architecture:

* **Optimistic UI Caching:** Instead of making redundant API calls to the database, the React frontend relies heavily on `sessionStorage`. For example, the Admin Dashboard builds its complex Accordion views entirely from a cached `atomberg_admin_global_stream`.
* **Zero-RAM Data Export:** Exporting corporate data doesn't crash the server. We use Python's `io.StringIO()` to compile CSV records into memory buffers and stream them directly as Byte-Blobs to the client, preventing high RAM footprint spikes.
* **Non-Blocking Background Threads:** Sending Emails and MS Teams Webhooks does not block the user interface. We use `threading.Thread` to offload communication protocols while immediately returning a `200 OK` response to the client.

---

## 5. 🔌 Backend Routing & DB Optimization Engine

Our Flask application is decoupled into **Blueprints**, protecting our logic and enabling maximum optimization.

| Backend File | Handles Which Routes? | Why It's Best & DB Optimizations |
| :--- | :--- | :--- |
| `employee.py` | `/api/dashboard/goals`, `/api/goals/submit`, `/api/goals/bulk-log-progress` | **1-Hit Atomic CTEs:** Database insertions and Audit Log creation happen in a single SQL transaction using `WITH` clauses, preventing incomplete records and data corruption. |
| `manager.py` | `/api/manager/dashboard-summary`, `/api/manager/review-sheet`, `/api/manager/broadcast` | **O(K) Aggregations:** Uses `LEFT JOIN` and conditional `SUM(CASE WHEN)` statements to fetch an entire team's statistics in fractions of a millisecond without linear looping. |
| `admin.py` | `/api/admin/global-master-stream`, `/api/admin/unlock-kpi`, `/api/admin/export-csv` | **O(N) Hierarchical JSON:** Fetches flattened database tuples and computationally builds the entire corporate hierarchy nested graph in Python memory, avoiding N+1 database querying issues. |
| `automation.py`| Midnight Trigger: `run_auto_escalation_job` | **Stateless Processing:** Uses `APScheduler` to run a 7-day delta scan ($\Delta t = \text{Now} - \text{Creation} > 7 \text{ Days}$). Commits mass `UPDATE` queries in a single db-hit. |

---

## 6. 🛠️ Tech Stack & Cloud Infrastructure Justification

We architected this portal to be scalable, secure, and blazing fast. Here is *why* we chose this stack:

### Frontend Layer
* **React (Vite) + Custom CSS:** Vite provides instant HMR (Hot Module Replacement) and highly optimized build sizes. We utilized a completely stateless authentication architecture utilizing local/session storage to manage JWT-like tokens seamlessly.

### Backend Application Layer
* **Python Flask (Gunicorn + Gevent):** Flask's lightweight nature allowed us to build highly customized Microservice-like Blueprints. Gunicorn running Gevent WebSocket workers enables us to handle hundreds of concurrent operational connections simultaneously without thread blocking.

### Database Layer
* **Supabase (Managed PostgreSQL):** Standard SQL databases fail under high concurrent write loads. Supabase provides an elite connection pooling gateway. We applied **B-Tree Composite Indexing** (`idx_users_manager_id` and `idx_kpis_user_quarter`) to drop query latency from $O(N)$ sequential scans down to $O(\log N)$ binary tree searches.

### Cloud Infrastructure & Edge
* **AWS CloudFront (CDN):** Frontend assets are distributed globally via AWS Edge locations for zero-latency loading.
* **AWS EC2 + Nginx Reverse Proxy:** Our Flask engine runs securely behind Nginx, which handles CORS stripping, protects our internal 5000 port from the outside world, and enforces strict HTTP/HTTPS routing.


## 📂 6. Complete System File & Component Architecture

Our React (Vite) frontend is structured hierarchically based on Role-Based Access Control, ensuring components are completely decoupled and cleanly nested.

### 💻 Frontend Component Hierarchy (React)
* **`App.jsx` & `Login.jsx`:** The core entry points. Handles Global Interceptors and securely authenticates users, caching their identity in `localStorage`.
  
* 🧑‍💻 **`Employee.jsx` (Employee Workspace Portal)**
  * **`GoalSheet.jsx`:** The primary interface for users to define their quarterly objectives.
  * **`GoalDraftView.jsx`:** The Optimistic Sandbox nested inside GoalSheet. Evaluates the 100% total weightage rule in real-time before database submission.
  * **`AchievementTracking.jsx`:** The check-in interface where employees log their actual performance against locked targets.

* 👔 **`Manager.jsx` (Manager Action Dashboard)**
  * **`GoalApprovals.jsx`:** The master component for reviewing direct reports' submissions.
  * **`ApprovalQueueList.jsx`:** A tabular queue nested inside approvals that displays pending vs. approved sheets.
  * **`TeamProgress.jsx`:** The final assessment hub where managers sign off on the employee's actual achievements.

* 🛡️ **`Admin.jsx` (HR Governance Control Center)**
  * **`AdminControlCenter.jsx`:** The master switch to globally freeze quarters (`admin_locked = true`) or open check-in windows.
  * **`AdminAnalytics.jsx`:** Generates macro-level operational charts (Manager Effectiveness, Goal Thrust distributions).
  * **`CompanyReports.jsx`:** Streams the fully aggregated backend performance data into a downloadable CSV report.
  * **`ExceptionHandling.jsx` & `ObjectiveUnlocker.jsx`:** Renders the dynamic company tree (Accordion) and allows the Admin to grant granular overrides (unlocking targets or actuals for specific users).


### ⚙️ Backend Core Files (Python / Flask)
* **`app.py`:** The Kernel. Configures Flask, AWS ProxyFix, WebSocket/SocketIO listeners, global CORS, and the APScheduler daemon.
* **`auth.py`:** The Security Gateway. Contains the `@role_required` decorators (`@employee_required`, etc.) to block Postman/API injection hacks.
* **`utils.py`:** The Utility Engine. Manages the `psycopg2` Connection Pool (`get_db_cursor`) and multi-threaded Webhook/SMTP configurations.
* **`automation.py`:** The Daemon Engine. Houses `run_auto_escalation_job` which executes at midnight to auto-lock SLA-breached goals (manager inactivity > 7 days).

---

## 🔌 7. Exhaustive API Route Catalog

The backend is decoupled using Flask Blueprints. Here is the strict mapping of every route active in our system:

### 🔐 Gateway Engine (`app.py`)
| Method | Endpoint | Guard | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Validates Scrypt/Bcrypt hashes, evaluates user hierarchy, and issues the session token. |

### 🧑‍💻 Employee Blueprint (`employee.py`)
| Method | Endpoint | Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/goals` | `@employee` | Fetches the complete multi-quarter objective matrix for the active user. |
| `POST` | `/api/goals/bulk-update` | `@employee` | Synchronizes the frontend staging sandbox with the DB. Evaluates constraints (max 8 goals). |
| `POST` | `/api/goals/submit` | `@employee` | Finalizes the draft. Commits the 100% weightage check and fires async Manager notification emails. |
| `POST` | `/api/goals/bulk-log-progress` | `@employee` | Receives check-in actuals, runs semantic inverted math formulas ("lower is better"), and updates records via CTEs. |

### 👔 Manager Blueprint (`manager.py`)
| Method | Endpoint | Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/manager/dashboard-summary` | `@manager` | O(K) aggregation query returning node inventory (total team, active KPIs, pending approvals). |
| `GET` | `/api/manager/team-kpis` | `@manager` | Fetches the specific operational targets associated with the manager's reporting tree. |
| `POST` | `/api/manager/review-sheet` | `@manager` | Multi-row batch mutation. Executes `manager_locked = true` and appends revision notes dynamically. |
| `POST` | `/api/manager/broadcast-goal` | `@manager` | Algorithmic deployment of a mandatory shared organizational goal (`is_shared=true`) to all direct reports. |
| `POST` | `/api/manager/submit-evaluations`| `@manager` | Commits the manager's qualitative assessment string on the employee's final actuals. |

### 🛡️ Admin Blueprint (`admin.py`)
| Method | Endpoint | Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/global-master-stream` | `@admin` | Master pipeline that flattens relational DB tables into an O(N) nested JSON hierarchical graph. |
| `POST` | `/api/admin/freeze-cycle` | `@admin` | Global override enforcing `admin_locked = true` on the entire active workforce quarter. |
| `POST` | `/api/admin/open-checkins` | `@admin` | Global override dropping admin locks to initiate the Phase 2 'Actuals' logging window. |
| `POST` | `/api/admin/unlock-kpi` | `@admin` | Decoupled exception tool to drop `admin_locked` (Actuals edit) or `manager_locked` (Target edit) for specific KPIs. |
| `POST` | `/api/admin/employees` | `@admin` | Onboarding endpoint that hashes passwords securely and maps the new hire to the adjacency tree. |
| `GET` | `/api/admin/export-csv` | `@admin` | Leverages `io.StringIO` to generate an in-memory virtual Excel/CSV byte stream to prevent RAM spiking. |
| `GET` | `/api/admin/analytics-dashboard` | `@admin` | Computes macro intelligence variables (Manager effectiveness, Goal Thrust distributions, QoQ status trends). |


## 🗄️ 8. Enterprise Database Schema & Architecture
The platform utilizes a highly normalized, relational PostgreSQL architecture designed for hierarchical organization mapping, lock-based governance, and immutable audit logging. 

### 8.1 Identity & Hierarchy Engine (`public.users`)
This table manages all identities and dynamically maps the reporting structure using an **Adjacency List Model**.
* 📐 **Self-Referencing Hierarchy:** The `manager_id` recursively links back to `users(id)`, allowing the system to build infinite-depth organizational trees without redundant mapping tables.
* ⚡ **Performance Indexing:** A B-Tree Index (`idx_users_manager_id`) drops lookup latency from linear sequential scans to $O(\log N)$ binary searches, making team-fetching instant.

### 8.2 The Core Transactional Matrix (`public.kpis`)
The central engine storing goals, achievements, assessment remarks, and strict governance states.
* 🧠 **Polymorphic Target Engine:** By defining `target` and `actual_performance` as `VARCHAR(50)`, the schema natively supports heterogenous Metrics (Numeric, Percentages, Timelines) without crashing due to strict SQL type-casting.
* 🔒 **Dual-State Mutability Locks:** * `manager_locked = true`: Prevents employee edits on targets post Phase 1.
  * `admin_locked = true`: Globally freezes the quarter post Phase 2.
* 🧹 **Cascading Deletes:** `ON DELETE CASCADE` ensures that if an employee is removed, all associated KPIs are wiped out, preventing database bloat.

### 8.3 Immutable Compliance Ledger (`public.audit_logs`)
* ⚖️ **Transactionally Coupled Integrity:** Using Common Table Expressions (CTEs), every modification in the `kpis` table is inserted into `audit_logs` in the *exact same database transaction*.
* ⏱️ **Timestamp Auditing:** The system securely logs actions (`GOAL_APPROVED`, `ADMIN_UNLOCK`, `SYSTEM_AUTO_APPROVE`) with server-side timestamps, ensuring HR accountability.

---

## 🎭 9. Test Credentials & Interactive Evaluation Scenarios
To facilitate a comprehensive evaluation, we have seeded the database with realistic test data. Evaluators can use the following credentials to experience the interconnected lifecycle of the application:

| Role | Email ID (Username) | Password |
| :--- | :--- | :--- |
| **HR / Admin** | `admin@atomberg.com` | `atomberg@hr` |
| **L1 Manager** | `manager@atomberg.com` | `atomberg@manager` |
| **Employee 1** | `rahul@atomberg.com` | `atomberg@employee` |
| **Employee 2** | `priya@atomberg.com` | `atomberg@employee` |

#### Recommended Evaluation Flow:
1. **The Sandbox (Login as `rahul@atomberg.com`):** Navigate to the Goal Sheet. Observe the read-only broadcasted goal. Attempt to create goals and see how the system strictly blocks submission until exactly 100% weightage is met.
2. **The Approval Workflow (Login as `manager@atomberg.com`):** Go to 'Goal Approvals'. Review Priya's submitted goals. Approving them triggers `manager_locked = true`, freezing the target parameters.
3. **Phase 2 Tracking (Login as `priya@atomberg.com`):** Go to 'Achievement Tracking'. Notice targets are now immutable. Enter 'Actual Performance' to see the backend dynamically calculate completion percentages.
4. **Executive Governance (Login as `admin@atomberg.com`):** Open the 'Control Center' to view the corporate node tree. Review the 'Audit Logs' ledger. Test the Exception Handling tool to selectively grant overrides to locked KPI sheets.
