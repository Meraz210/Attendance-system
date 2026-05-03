# Smart Attendance System

Full-stack attendance app built with React, Node.js, Express, MongoDB, and Mongoose.

## Project Structure

```text
attendance-system/
  backend/
    models/
      Attendance.js
      Student.js
      User.js
    server.js
    package.json
  frontend/
    public/
    src/
      App.css
      App.js
    package.json
```

## Backend API

Base URL: `http://localhost:5000`

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an admin or student user account |
| `POST` | `/auth/login` | Login and receive a JWT token |
| `GET` | `/auth/me` | Get current logged-in user |
| `POST` | `/add-student` | Add a student with `name`, `email`, and `studentId` |
| `GET` | `/students` | Get all students |
| `POST` | `/mark-attendance` | Mark a student present for today |
| `GET` | `/attendance` | Get all attendance records |
| `GET` | `/attendance/:studentId` | Get attendance records for one student |
| `GET` | `/attendance-by-date?date=YYYY-MM-DD` | Get attendance records by date |

## How To Run

1. Start MongoDB locally.

   The backend defaults to:

   ```text
   mongodb://127.0.0.1:27017/attendanceDB
   ```

   To use a different MongoDB URI, create `backend/.env`:

   ```text
   MONGO_URI=mongodb://127.0.0.1:27017/attendanceDB
   PORT=5000
   JWT_SECRET=replace-with-a-long-random-secret
   ```

2. Start the backend.

   ```bash
   cd backend
   npm install
   npm start
   ```

3. Start the frontend in a second terminal.

   ```bash
   cd frontend
   npm install
   npm start
   ```

4. Open the app.

   ```text
   http://localhost:3000
   ```

## Login Flow

1. Register an admin account from the app.
2. Login as admin.
3. Add student profiles from the Admin Panel.
4. Register a student/user account using the same `studentId` that admin created.
5. Login as student/user to mark attendance.

Admin users can manage students and view/export reports. Student users can only view and mark attendance for their own `studentId`.

## Attendance Behavior

Attendance is stored with:

- `studentId`
- `date` in `YYYY-MM-DD` format
- `time` in `HH:mm:ss` format
- `status` set to `Present`
- `markedAt` as a full JavaScript date

The database has a unique compound index on `studentId + date`, so a student can only be marked present once per day.
