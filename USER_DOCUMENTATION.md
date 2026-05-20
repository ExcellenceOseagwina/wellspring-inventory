# Wellspring University Inventory System User Documentation

## Introduction

The Wellspring University Inventory System is a web-based application for recording, viewing, updating, and monitoring departmental equipment. It helps authorized users manage inventory records for departments such as Computing, Nursing, Accounting, Public Health, Mass Communication, Bio Chemistry, and Biological Science.

This user documentation explains how to access the system, use the dashboard, manage equipment records, generate reports, troubleshoot common issues, and follow basic security practices.

## System Requirements

To use the system successfully, users need:

- A desktop, laptop, tablet, or smartphone.
- A modern web browser such as Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.
- A stable internet connection.
- A valid user account for the Wellspring University Inventory System.
- Access to the backend server, normally running at `http://localhost:5000` during local use.

For local installation or demonstration, the computer should also have:

- Node.js installed.
- npm installed with Node.js.
- A configured Supabase project.
- A Supabase storage bucket named `inventory`.

## Installation Guide

Follow these steps to set up the system locally:

1. Open the project folder on the computer.
2. Open a terminal or command prompt.
3. Move into the backend folder:

   ```bash
   cd backend
   ```

4. Install the backend dependencies:

   ```bash
   npm install
   ```

5. Create a `.env` file inside the `backend` folder.
6. Add the required Supabase settings:

   ```env
   PORT=5000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

7. In Supabase, create the required `inventory_items` table.
8. In Supabase Storage, create a public bucket named `inventory`.
9. Start the backend server:

   ```bash
   npm start
   ```

10. Open `frontend/home.html` in a web browser.

## User Login Procedure

To log in:

1. Open the system in a web browser.
2. Click the login option or open the login page.
3. Enter your registered email address.
4. Enter your password.
5. Click the login button.
6. If the details are correct, the system opens the dashboard.

To create a new account:

1. Open the signup page.
2. Enter your full name, email address, and password.
3. Submit the form.
4. Confirm your email address if Supabase email confirmation is enabled.
5. Return to the login page and sign in.

To reset a forgotten password:

1. Open the forgot password page.
2. Enter your registered email address.
3. Submit the form.
4. Check your email for the password reset link.
5. Open the link and enter a new password.
6. Return to the login page and sign in with the new password.

## Dashboard Overview

The dashboard is the main page users see after logging in. It provides a summary of the university inventory records.

The dashboard displays:

- Total Equipment: the total quantity of equipment recorded.
- Departments: the number of departments available in the system.
- Good: equipment marked as being in good condition.
- Outdated: equipment marked as outdated.
- For Repair: equipment that needs repair.
- For Replacement: equipment that needs replacement.
- Missing: equipment marked as missing.

The dashboard also provides links to each department inventory page and includes a Generate Report button for creating a printable inventory report.

## Features and Functions

The system includes the following major features:

- User account signup and login.
- Password reset through email.
- Protected dashboard access for logged-in users.
- Department-based inventory pages.
- Add, edit, and delete equipment records.
- Record equipment name, quantity, condition, acquisition date, and comments.
- Upload equipment images and videos.
- Preview uploaded images and videos.
- Search department records by name, condition, acquisition date, quantity, or comments.
- View recent inventory activity.
- Generate and print inventory reports.
- Sign out securely after use.

Supported departments:

- Computing
- Nursing
- Accounting
- Public Health
- Mass Communication
- Bio Chemistry
- Biological Science

Supported equipment conditions:

- Good
- Outdated
- For Repair
- For Replacement
- Missing

## User Roles and Permissions

The current version uses authenticated access. This means users must be logged in before they can use protected inventory pages.

Authenticated users can:

- View the dashboard.
- View department inventory records.
- Add new equipment records.
- Edit existing equipment records.
- Delete equipment records.
- Upload images and videos.
- Generate inventory reports.
- View recent activity.

Separate roles such as administrator, staff, and viewer are not currently enforced in the application. Users should therefore follow the university's internal rules about who is allowed to add, update, or delete inventory records.

## How to Perform Common Tasks

### Add Equipment

1. Log in to the system.
2. Open the dashboard.
3. Select the correct department.
4. Click the option to add new equipment.
5. Enter the equipment name.
6. Enter the quantity.
7. Select the equipment condition.
8. Enter the acquisition date if available.
9. Add comments where necessary.
10. Upload an image or video if available.
11. Save the equipment record.

### Edit Equipment

1. Open the department page containing the equipment.
2. Find the equipment record.
3. Click Edit.
4. Update the required details.
5. Save the changes.

### Delete Equipment

1. Open the department page containing the equipment.
2. Find the equipment record.
3. Click Delete.
4. Confirm the deletion.

Only delete a record when you are sure it is no longer needed, because deletion removes the record from the department list.

### Search for Equipment

1. Open the required department page.
2. Use the search box above the equipment list.
3. Type the equipment name, condition, date, quantity, or comment keyword.
4. Review the filtered results.
5. Click Clear to remove the search filter.

### View Recent Activity

1. Log in to the system.
2. Open the dashboard.
3. Click Recent Activity.
4. Review the latest inventory records added to the system.

### Generate and Print a Report

1. Log in to the system.
2. Open the dashboard.
3. Click Generate Report.
4. Review the report summary and item details.
5. Click Print Report to print or save the report as a PDF.

### Sign Out

1. Click Sign out from the dashboard or navigation area.
2. Confirm the sign-out action.
3. The system returns you to the login page.

## Troubleshooting Guide

| Problem | Possible Cause | Solution |
| --- | --- | --- |
| The system shows a network error | Backend server is not running | Start the backend with `npm start` inside the `backend` folder |
| Login fails | Email or password is incorrect | Check the login details and try again |
| Login fails after signup | Email confirmation may be required | Check your email and confirm the account |
| Dashboard does not load | Session expired or token is missing | Sign out and log in again |
| Equipment records do not appear | Backend or Supabase connection issue | Confirm the backend is running and Supabase settings are correct |
| File upload fails | Supabase storage bucket is missing | Create a public bucket named `inventory` |
| Missing condition cannot be saved | Database condition constraint is outdated | Run `backend/sql/allow-missing-condition.sql` in Supabase |
| Acquisition date cannot be saved | Database column is missing | Run `backend/sql/add-acquisition-date.sql` in Supabase |
| Report does not generate | Backend cannot fetch report data | Check server status and log in again |
| Search returns no result | Search term does not match existing records | Clear the search field and try another keyword |

## Frequently Asked Questions (FAQ)

**Do I need an account to use the system?**  
Yes. You must log in before accessing the dashboard and inventory records.

**Can I manage records for all departments?**  
Yes. In the current version, any authenticated user can access all department pages.

**Can I upload both images and videos?**  
Yes. Equipment records can include uploaded images and videos.

**Where are uploaded files stored?**  
Uploaded media files are stored in the Supabase `inventory` storage bucket.

**Can I print an inventory report?**  
Yes. Use the Generate Report button on the dashboard, then click Print Report.

**Can deleted records be restored?**  
The system does not currently provide a restore option. Delete records carefully.

**Why am I redirected to the login page?**  
You may not be logged in, or your session may have expired. Log in again to continue.

**Can the system work without internet?**  
No. The system requires Supabase services for authentication, database records, and file storage.

## Security and Safety Tips

- Use a strong password that is difficult to guess.
- Do not share your login details with another person.
- Sign out after using the system, especially on a shared computer.
- Confirm equipment details before saving records.
- Delete records only when authorized to do so.
- Avoid uploading unrelated images or videos.
- Report suspicious account activity to the system administrator.
- Keep the Supabase service role key private and never place it in frontend files.
- Use trusted computers and secure internet connections when managing inventory records.

## Contact and Support Information

For help with the Wellspring University Inventory System, contact the project developer or the department responsible for maintaining the system.

Suggested support details:

- System name: Wellspring University Inventory System
- Developer: Excellence Oseagwina
- Support channel: Department or project supervisor
- Technical support: Backend/server administrator or Supabase project administrator

When reporting an issue, include:

- The page where the issue occurred.
- The action you were trying to perform.
- The error message displayed, if any.
- The date and time the issue happened.
- A screenshot, if available.
