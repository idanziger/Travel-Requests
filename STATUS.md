# Travel Request App - Project Status (March 31, 2026)

## ✅ Completed Features
- **Project Foundation**: Monorepo with React (Vite/TypeScript) and Node.js (Express/TypeScript).
- **Database**: Local PostgreSQL setup via Docker Compose with full schema.
- **Authentication**: Google OAuth 2.0 integration (Sign-in with Google).
- **Travel Form**: Logical form with traveler name, project code, and dynamic expense selection (Flight, Hotel, Meals, Transport).
- **Dashboard**: Professional grouped view (New, Approved, Rejected) with expandable rows.
- **Sub-items**: Automated creation of expense checklists based on form selection + ability to add custom expenses.
- **Notification Engine**: Gmail API integration built and ready for tokens.

## ⏳ Pending Setup (Tomorrow's Tasks)
- **Gmail API Token**: Need to get the `GOOGLE_REFRESH_TOKEN` from Google OAuth Playground and add to `.env`.
- **Approver Email**: Configure `APPROVER_EMAIL` in `.env`.
- **Environment Cleanup**: Move any remaining hardcoded values to environment variables.

## 📝 Awaiting Feedback (Questions for Yoav)
- **Submission Permissions**: Is it strictly Managers submitting for their team?
- **Approval Hierarchy**: Single approver or department-based?
- **Notification Logic**: Who else needs alerts (e.g., Finance)?
- **Expense Categories**: Are the four categories (Airfare, Hotel, Meals, Transport) sufficient as defaults?

## 🚀 Future Steps
- **Production Deployment**: Containerize via Docker and deploy to Kubernetes/Minikube.
- **Google Groups Integration**: Link permissions to Workspace Groups.
- **Document Upload**: Add "Info Upload" status for receipts/attachments.
