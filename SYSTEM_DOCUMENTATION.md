# Wellspring University Inventory System Documentation

## 1. Introduction

### 1.1 Purpose

The purpose of the Wellspring University Inventory System is to provide a simple web-based platform for recording, viewing, updating, and managing departmental equipment. The system helps the university keep track of equipment quantity, condition, acquisition date, comments, images, and videos.

### 1.2 Scope

This documentation covers the frontend, backend API, authentication flow, Supabase database, storage integration, installation steps, configuration, testing approach, deployment process, and maintenance information for the system.

### 1.3 Audience

This document is intended for:

- Project supervisors and examiners
- Developers maintaining the system
- System administrators deploying the system
- Departmental users who need to understand the system workflow

## 2. System Overview

The Wellspring University Inventory System is made up of a static web frontend and a Node.js backend API. Users sign up or log in, then manage inventory items by department. Inventory records are stored in Supabase, while uploaded images and videos are stored in a Supabase Storage bucket.

### 2.1 Architecture

```text
User Browser
  |
  | HTML, CSS, JavaScript
  v
Frontend Pages
  |
  | HTTP requests with Bearer token
  v
Node.js / Express API
  |
  | Supabase client
  v
Supabase Auth, Database, and Storage
```

Main folders:

- `frontend/`: Contains HTML pages, CSS, JavaScript, images, and icons.
- `backend/`: Contains the Express server, routes, controllers, middleware, Supabase configuration, and SQL helper scripts.

### 2.2 Technologies Used

- HTML5 for page structure
- CSS3 for styling
- JavaScript for frontend logic
- Node.js for backend runtime
- Express.js for API routing
- Supabase Auth for user authentication
- Supabase Database for inventory records
- Supabase Storage for uploaded media
- Multer for handling file uploads
- dotenv for environment variables
- CORS for allowing frontend-backend communication

### 2.3 Dependencies

Backend dependencies:

- `@supabase/supabase-js`
- `bcryptjs`
- `cors`
- `dotenv`
- `express`
- `jsonwebtoken`
- `multer`

Development dependency:

- `nodemon`

## 3. Installation Guide

### 3.1 Prerequisites

Before installing the system, ensure the following are available:

- Node.js installed on the computer
- npm installed with Node.js
- A Supabase project
- A modern web browser
- Internet connection for Supabase services

### 3.2 System Requirements

Minimum requirements:

- Operating system: Windows, Linux, or macOS
- RAM: 4 GB or higher
- Browser: Chrome, Edge, Firefox, or any modern browser
- Backend port: `5000`
- Supabase storage bucket named `inventory`

### 3.3 Installation Steps

1. Open the project folder.
2. Move into the backend folder:

   ```bash
   cd backend
   ```

3. Install backend dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file inside the `backend/` folder.
5. Add Supabase environment variables to `.env`.
6. Create the required `inventory_items` table in Supabase.
7. Create a public Supabase storage bucket named `inventory`.
8. Start the backend server:

   ```bash
   npm start
   ```

9. Open `frontend/home.html` in a browser.

## 4. Configuration Guide

### 4.1 Configuration Parameters

The backend uses the following environment variables:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional fallback key:

```env
SUPABASE_ANON_KEY=your-anon-key
```

### 4.2 Environment Setup

The `.env` file must be placed inside the `backend/` folder. The service role key should not be exposed in frontend files because it gives privileged access to Supabase resources.

The frontend expects the API to run at:

```text
http://localhost:5000
```

### 4.3 External Services Integration

The system integrates with Supabase for:

- User registration and login
- Password reset
- Inventory database storage
- Image and video file storage

Supabase setup requires:

- A project URL
- A service role key or anon key
- An `inventory_items` table
- An `inventory` storage bucket

## 5. Usage Guide

### 5.1 User Interface Overview

The frontend includes:

- Home page
- About page
- Signup page
- Login page
- Forgot password page
- Reset password page
- Dashboard page
- Recent activity page
- Department inventory pages

Department pages include:

- Computing
- Nursing
- Accounting
- Public Health
- Mass Communication
- Bio Chemistry
- Biological Science

### 5.2 User Authentication

Users must create an account or log in before accessing protected inventory pages. After login, the access token is stored in browser local storage and sent to the backend as a bearer token.

Authentication features:

- Signup
- Login
- Forgot password
- Reset password
- Logout

### 5.3 Core Functionality

Core system functions include:

- Add new equipment records
- View equipment by department
- Edit equipment records
- Delete equipment records
- Upload equipment images
- Upload equipment videos
- Search department items
- View dashboard totals
- Generate inventory report
- View recent activity

Inventory item fields:

- Department
- Name
- Quantity
- Condition
- Acquisition date
- Comments
- Image URL
- Video URL
- Created by
- Created at

### 5.4 Advanced Features

Advanced features include:

- Dashboard summary by condition
- Printable inventory report
- Recent activity display
- Media preview for images and videos
- Search by item name, condition, date, quantity, or comments
- Supabase token validation on protected API routes

### 5.5 Troubleshooting

Common issues:

- If the frontend shows a network error, confirm the backend server is running.
- If login fails, confirm the email and password are correct.
- If uploads fail, confirm the Supabase `inventory` storage bucket exists.
- If missing items cannot be saved, run `backend/sql/allow-missing-condition.sql` in Supabase.
- If acquisition date errors occur, run `backend/sql/add-acquisition-date.sql` in Supabase.

## 6. API Documentation

### 6.1 Endpoints

Authentication endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/signup` | Creates a new user account |
| POST | `/api/auth/login` | Logs in a user |
| POST | `/api/auth/forgot-password` | Sends password reset email |
| POST | `/api/auth/reset-password` | Updates user password |

Inventory endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/inventory` | Returns API information |
| GET | `/api/inventory/dashboard` | Returns dashboard statistics |
| GET | `/api/inventory/report` | Returns full report data |
| GET | `/api/inventory/activity` | Returns recent inventory activity |
| GET | `/api/inventory/department/:dept` | Returns department items |
| POST | `/api/inventory/items` | Creates inventory item |
| PUT | `/api/inventory/items/:id` | Updates inventory item |
| DELETE | `/api/inventory/items/:id` | Deletes inventory item |
| POST | `/api/inventory/upload` | Uploads image or video file |

### 6.2 Request and Response Formats

Signup request:

```json
{
  "full_name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

Login request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Create item request:

```json
{
  "department": "computing",
  "name": "Laptop",
  "quantity": 2,
  "condition": "good",
  "acquisition_date": "2026-05-18",
  "comments": "Used in computer laboratory",
  "image_url": "https://example.com/image.jpg",
  "video_url": null
}
```

Dashboard response:

```json
{
  "total": 20,
  "departments": 7,
  "good": 10,
  "outdated": 3,
  "repair": 2,
  "replacement": 4,
  "missing": 1
}
```

Error response:

```json
{
  "error": "Invalid or expired token"
}
```

### 6.3 Authentication and Authorization

Protected inventory routes require an authorization header:

```text
Authorization: Bearer user-access-token
```

The backend validates the token using Supabase Auth. If the token is missing, invalid, or expired, the API returns a `401` response.

## 7. Database Schema

### 7.1 Entity-Relationship Diagram

```text
auth.users
  1
  |
  | created_by
  v
inventory_items
```

### 7.2 Table Definitions

Table: `inventory_items`

| Column | Type | Description |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `department` | text | Department that owns the equipment |
| `name` | text | Equipment name |
| `quantity` | integer | Number of equipment units |
| `condition` | text | Current equipment condition |
| `acquisition_date` | date | Date equipment was acquired |
| `image_url` | text | Public image URL |
| `video_url` | text | Public video URL |
| `comments` | text | Additional notes |
| `created_by` | uuid | User who created the record |
| `created_at` | timestamptz | Record creation date and time |

Valid departments:

- `computing`
- `nursing`
- `accounting`
- `public-health`
- `mass-communication`
- `bio-chemistry`
- `biological-science`

Valid conditions:

- `good`
- `outdated`
- `for_repair`
- `for_replacement`
- `missing`

### 7.3 Relationships and Constraints

Relationships:

- `inventory_items.created_by` references `auth.users.id`.

Constraints:

- `id` is the primary key.
- `department` must be one of the supported departments.
- `condition` must be one of the supported condition values.
- `quantity` must be at least `1`.
- `created_at` defaults to the current timestamp.

## 8. Testing

### 8.1 Test Plan

Testing should confirm that:

- Users can sign up and log in.
- Protected pages redirect unauthenticated users.
- Dashboard statistics load correctly.
- Inventory records can be created, viewed, updated, and deleted.
- Image and video upload works.
- Reports and recent activity display correct data.
- Invalid inputs produce clear error messages.

### 8.2 Test Cases

| Test Case | Steps | Expected Result |
| --- | --- | --- |
| User signup | Enter full name, email, and password | Account is created |
| User login | Enter valid email and password | User is redirected to dashboard |
| Invalid login | Enter wrong credentials | Error message is displayed |
| Add equipment | Complete equipment form and submit | New item appears in department list |
| Edit equipment | Update an existing item | Item details are changed |
| Delete equipment | Delete an item and confirm action | Item is removed |
| Upload media | Select image or video file | File is uploaded and preview is shown |
| Generate report | Click generate report button | Report data is displayed |
| View activity | Open recent activity page | Latest inventory items are shown |

### 8.3 Test Results

The system should be considered successful when all major user workflows complete without errors and the stored Supabase data matches the actions performed in the frontend.

## 9. Deployment

### 9.1 Deployment Process

Basic deployment steps:

1. Prepare the Supabase project and database.
2. Upload or deploy the backend to a Node.js hosting platform.
3. Set production environment variables.
4. Deploy the frontend files to a static hosting platform.
5. Update frontend API URLs if the backend is no longer running on `localhost:5000`.
6. Test authentication, inventory actions, and uploads in production.

### 9.2 Release Notes

Current version: `1.0.0`

Included features:

- Authentication
- Dashboard summary
- Department inventory management
- Equipment media upload
- Search
- Recent activity
- Printable report

### 9.3 Known Issues and Limitations

- The frontend API URL is hardcoded to `http://localhost:5000`.
- No automated test suite is currently configured.
- The project depends on Supabase availability.
- The service role key must be protected carefully.
- User roles such as admin, staff, and viewer are not separately implemented.

## 10. Support and Maintenance

### 10.1 Troubleshooting Guide

| Problem | Possible Cause | Solution |
| --- | --- | --- |
| Backend does not start | Missing `.env` values | Add Supabase URL and key |
| Login fails | Invalid credentials or unconfirmed email | Check login details and Supabase Auth settings |
| Dashboard does not load | Missing or expired token | Log in again |
| Upload fails | Missing storage bucket | Create `inventory` bucket in Supabase |
| Date field error | Missing database column | Run `add-acquisition-date.sql` |
| Missing condition error | Old database constraint | Run `allow-missing-condition.sql` |

### 10.2 Frequently Asked Questions (FAQs)

**Can the system work without internet?**  
No. The system requires Supabase for authentication, database access, and media storage.

**Can one user manage all departments?**  
Yes. Any authenticated user can access the department pages and manage records.

**Where are uploaded images and videos stored?**  
They are stored in the Supabase `inventory` storage bucket.

**Can reports be printed?**  
Yes. The dashboard includes a report generation and print option.

### 10.3 Contact Information

For support, contact the project developer or the department responsible for maintaining the Wellspring University Inventory System.

## 11. Change Log

### 11.1 Version History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2026-05-18 | Initial documented version of the inventory system |

### 11.2 Change Summary

- Added system documentation.
- Documented frontend and backend structure.
- Documented API endpoints.
- Documented database schema.
- Documented installation, usage, testing, deployment, and maintenance details.

## Glossary

| Term | Meaning |
| --- | --- |
| API | Application Programming Interface used by the frontend to communicate with the backend |
| Backend | Server-side part of the system |
| Frontend | User-facing part of the system |
| Supabase | Cloud service used for authentication, database, and storage |
| Bearer token | Access token sent in the authorization header |
| Inventory item | A recorded equipment entry in the system |
| Department | Academic or administrative unit that owns inventory items |
| Storage bucket | Supabase container where uploaded files are saved |
