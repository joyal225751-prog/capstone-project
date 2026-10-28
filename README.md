# CampusFix

CampusFix is a MERN capstone project for reporting and tracking campus maintenance issues. Students submit reports, facilities staff update progress, and admins assign work.

## Features

- Student, staff, and administrator roles
- Account registration and login with hashed passwords and JWT authentication
- Create, view, filter, update, assign, and delete issues according to role and ownership
- Status history through issue comments and status updates
- Server-side validation, pagination, centralized errors, and protected API routes
- Responsive React interface with loading, empty, and error states

## Stack

React + Vite, Node.js + Express, MongoDB + Mongoose.

## Run locally

Requirements: Node.js, npm, and a MongoDB database (local or Atlas).

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
2. Install dependencies in separate terminals:

   ```bash
   cd server && npm install && npm run dev
   cd client && npm install && npm run dev
   ```

3. Open the Vite URL printed in the client terminal. The API defaults to `http://localhost:5000`.

To make an administrator, register normally and change that user's `role` to `admin` directly in your development database. Never expose an admin registration option publicly.

## API overview

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a student |
| POST | `/api/auth/login` | Public | Log in |
| GET | `/api/auth/me` | Signed in | Current account |
| GET | `/api/issues?page=1&limit=10&status=Open&category=Electrical` | Signed in | Paginated issue list (students see their own) |
| POST | `/api/issues` | Student | Create issue |
| GET | `/api/issues/:id` | Authorized user | Issue details |
| PATCH | `/api/issues/:id/status` | Assigned staff/admin | Change status and add history comment |
| PATCH | `/api/issues/:id/assign` | Admin | Assign staff |
| POST | `/api/issues/:id/comments` | Authorized user | Add a comment |
| DELETE | `/api/issues/:id` | Admin | Delete issue |

Errors use `{ "message": "..." }`. Pagination responses include `items`, `page`, `pages`, and `total`.

## Project layout

```text
client/                 React app and API client
server/src/config/      MongoDB connection
server/src/models/      Mongoose schemas
server/src/routes/      API route mapping
server/src/controllers/ Request handling
server/src/middleware/  Authentication, validation, errors
```

## Security and privacy

Secrets belong in `server/.env`, which is ignored by Git. Only variable names are committed in `.env.example`. Passwords are hashed with bcrypt. The API enforces roles and issue ownership on the server. Use fictional data in demos, restrict production database access, configure CORS to the deployed client origin, and serve production over HTTPS.

## Project milestones

1. Define users, MVP, wireframes, data model, and API contract.
2. Build the project skeleton and database-backed API.
3. Add authentication, role checks, and ownership protection.
4. Build responsive client screens and connect them to the API.
5. Check core flows, invalid requests, and access rules; record results.
6. Deploy client, API, and database; document live links and limitations.

## Known limitations and next steps

Photo upload and email notifications are not part of the starter MVP. Add them after the reporting and assignment flows work. Before a real deployment, add automated tests, rate limiting, a production-grade token/session strategy, and an image storage provider.
