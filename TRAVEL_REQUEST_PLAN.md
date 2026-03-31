# Travel Request Application Development Plan

## Objective
Develop a browser-based Travel Request application to replace the current monday.com workflow. The app will integrate with Google Workspace for authentication and notifications, utilizing a modern web stack containerized for deployment on Kubernetes (minikube/k8s).

## Analysis of Current Workflow (monday.com)
Based on the provided screenshot and automation list, the system requires:
1. **Form Submission:** Capture Traveler, Event, Department, Budget, Notes, and Date Range.
2. **Dynamic State Management:** Requests move through statuses: `New`, `Approved`, `Not Approved`, `Need More Info`.
3. **Sub-item Tracking:** Specific "Roles" (Morning/Evening) per request with their own completion status.
4. **Automated Notifications:** Notify Travelers, Requesters, and Approvers based on status changes.
5. **Google Workspace Integration:** Automatic identity capture (Requester = Creator).

## Proposed Architecture
### 1. Technology Stack
- **Frontend:** React with TypeScript and Tailwind CSS (for a polished, "Google-like" UI).
- **Backend:** Node.js (Express) with TypeScript.
- **Database:** PostgreSQL (reliable for structured workflow data and reporting).
- **Authentication:** Google OAuth 2.0 (Sign in with Google).
- **Version Control:** GitHub (personal repository).
- **Infrastructure:** Docker containers, deployable to your Minikube/K8s cluster.

### 2. Core Data Model
- **User:** ID, Email, Name, Role (Admin, Approver, Traveler).
- **TravelRequest:** ID, RequesterID, TravelerID, Event, Dept, Budget, Notes, RequestDate, StartDate, EndDate, Status (Enum).
- **SubItem (Roles):** ID, RequestID, RoleName (Morning/Evening), Status (Pending/Done).

## Implementation Phases

### Phase 1: Foundation & Auth (Current)
1. Initialize the project structure (Monorepo setup - DONE).
2. Set up GitHub repository and CI/CD basics (DONE - Git repo initialized).
3. Implement Google OAuth 2.0 for Workspace-only access.
4. Define the database schema and initialize PostgreSQL.

### Phase 2: Form & Request Management
1. Build the "Travel Request" form (matching the screenshot).
2. Implement backend APIs for creating and retrieving requests.
3. Develop the "Dashboard" for employees to see their own requests.

### Phase 3: Approval Workflow & Notifications
1. Build the "Admin/Approver View" to review pending requests.
2. Implement state transitions (Approve/Reject/Need Info).
3. Integrate Google Workspace APIs (Gmail or Google Chat) for automated notifications.

### Phase 4: Sub-items & Final Polish
1. Add functionality for Morning/Evening role tracking within requests.
2. Final UI/UX refinements to ensure a smooth, professional feel.
3. Containerization (Dockerfile & Kubernetes manifests).
