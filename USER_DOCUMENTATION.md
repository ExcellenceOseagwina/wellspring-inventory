# Wellspring University Inventory System User Documentation

## Introduction

The Wellspring University Inventory System helps authorized users record, view, update, monitor, and report departmental equipment. Users can create departments, add equipment records, upload item media, search department inventory, review recent activity, and print inventory reports.

## System Requirements

Users need:

- A desktop, laptop, tablet, or smartphone.
- A modern browser such as Chrome, Edge, Firefox, or Safari.
- Internet access for Supabase authentication, database, and storage.
- A valid email since confirmation requests will be sent to that email.
- Access to the running system, normally `http://localhost:5000` during local use.

For local demonstration, the computer also needs Node.js, npm, a configured Supabase project, and a public Supabase Storage bucket named `inventory`.

## Accessing the System

For local usage:

1. Start the backend server.
2. Open `http://localhost:5000` in a browser.
3. Use the navigation links to sign up or log in.

If the frontend is opened directly from the `frontend/` folder, the pages still expect the backend API to be running at `http://localhost:5000`.

## Account Management

### Create an Account

1. Open the signup page.
2. Enter your full name, email address, and password.
3. Submit the form.
4. Confirm your email address if email confirmation is enabled.
5. Return to the login page and sign in.

### Log In

1. Open the login page.
2. Enter your email address and password.
3. Submit the form.
4. After successful login, the dashboard opens.

### Reset a Forgotten Password

1. Open the forgot password page.
2. Enter your registered email address.
3. Submit the form.
4. Open the password reset link sent to your email.
5. Enter and confirm the new password.
6. Return to the login page and sign in.

### Sign Out

1. Select Sign out from the navigation area.
2. Confirm the action.
3. The system clears the saved session and returns to the login page.

## Dashboard

The dashboard is the main working area after login. It displays the:

- Total Equipment
- Departments
- Good
- Outdated
- For Repair
- For Replacement
- Missing

Dashboard totals are based on equipment quantity, not only the number of records. The department cards show each department and its item quantity total.

### Search Departments

1. Open the dashboard.
2. Use the Search departments field above the department cards.
3. Enter all or part of a department name or department slug.
4. Review the filtered department cards and match count.
5. Select Clear to remove the search filter.

## Department Management

### Add a Department
1. Open the dashboard.
2. Select Add Department.
3. Enter the department name.
4. Save the department.

The system creates a URL-friendly department slug automatically. For example, `Computer Science` becomes `computer-science`.

### Open a Department
1. Open the dashboard.
2. Select the department card.
3. The department inventory page opens with that department's records.

### Delete a Department

1. Open the dashboard.
2. Select Delete on the department card.
3. Confirm the action.

A department can only be deleted when it has no equipment records. Move or delete the department's equipment first.

## Equipment Management

### Add Equipment

1. Open the correct department page.
2. Select Add Equipment.
3. Enter the equipment name.
4. Enter the quantity.
5. Select the condition.
6. Enter the acquisition date if available.
7. Add comments where necessary.
8. Upload an image or video if available.
9. Save the equipment record.

Supported equipment conditions:

- Good
- Outdated
- For Repair
- For Replacement
- Missing

### Edit Equipment

1. Open the department page containing the equipment.
2. Find the equipment card.
3. Select Edit.
4. Update the required details.
5. Save the changes.

### Delete Equipment

1. Open the department page containing the equipment.
2. Find the equipment card.
3. Select Delete.
4. Confirm the action.

Deleted equipment is removed from the department list. The recent activity history keeps a snapshot of deleted item details when the activity table is configured.

### Search Equipment

1. Open a department page.
2. Use the Search added items field.
3. Search by equipment name, quantity, condition, acquisition date, or comments.
4. Select Clear to remove the search filter.

## Media Gallery

The All Media page displays uploaded item images and videos across departments.

To view media:

1. Log in.
2. Open All Media.
3. Select an image or video preview.
4. Use the viewer modal to inspect the file.

Media files are stored in the Supabase `inventory` bucket.

## Recent Activity

The Recent Activity page shows equipment actions such as:

- Added
- Edited
- Deleted

Each activity entry includes the department, equipment name, quantity, condition, acquisition date, comments, and time. If the permanent activity table has not been created yet, the system falls back to showing recently added inventory records.

## Reports

The dashboard includes a Generate Report button. Reports include:

- Generated date and time
- Prepared-by user name
- Overall summary totals
- Department summary totals
- Full equipment list
- Recent activity list

To print or save a report:

1. Open the dashboard.
2. Select Generate Report.
3. Review the report.
4. Select Print Report.
5. Choose a printer or save as PDF from the browser print dialog.

## User Permissions

The current version uses authenticated access. Any logged-in user can:

- View the dashboard.
- Create and delete empty departments.
- View department inventory.
- Add, edit, and delete equipment.
- Upload media.
- View all media.
- View recent activity.
- Generate and print reports.

Separate administrator, staff, and viewer roles are not currently enforced. Users should follow the university's internal rules about who may change inventory records.

## Troubleshooting

| Problem | Possible Cause | Solution |
| --- | --- | --- |
| Network error | Backend is not running | Start the server with `npm start` |
| Login fails | Incorrect credentials or unconfirmed email | Check details and confirm the email account |
| Dashboard redirects to login | Session is missing or expired | Log in again |
| Dashboard does not load | Backend or Supabase connection issue | Confirm server and environment variables |
| Department cannot be added | Department already exists or migration is missing | Use a different name or run `backend/sql/add-departments.sql` |
| Department cannot be deleted | Department still has equipment records | Delete or move those records first |
| Equipment cannot be saved | Missing field, invalid quantity, invalid condition, or missing department | Check all form fields |
| Upload fails | Storage bucket is missing | Create a public Supabase bucket named `inventory` |
| Missing condition cannot be saved | Old database condition constraint | Run `backend/sql/allow-missing-condition.sql` |
| Acquisition date cannot be saved | Missing database column | Run `backend/sql/add-acquisition-date.sql` |
| Recent activity is incomplete | Activity table is missing | Run `backend/sql/add-inventory-activity.sql` |
| Report does not print cleanly | Browser print settings | Use the browser's print preview and select Save as PDF if needed |

## Security and Safety Tips

- Use a strong password and a valid email.
- Do not share login details.
- Sign out after using a shared computer.
- Confirm equipment details before saving.
- Delete records only when authorized.
- Upload only relevant equipment images or videos.
- Report suspicious account activity to the administrator.


## Support Information

For help, contact the project developer, project supervisor, or the person responsible for maintaining the Supabase project and backend server.

When reporting an issue, include the page, action attempted, error message, date and time, and a screenshot if available.
