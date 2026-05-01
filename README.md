# 📚 Smart Attendance System

A full-stack web application to manage student attendance efficiently.

---

## 🚀 Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js + Express.js
* **Database:** MongoDB
* **API Testing:** Postman

---

## ✨ Features

* 👤 Add new students
* 📋 View student list
* ✅ Mark attendance (Present)
* 📅 Track attendance by date
* 🔍 Filter attendance records
* 🚫 Prevent duplicate attendance per day

---

## 🖥️ Screenshots

> *(Add screenshots later for better presentation)*

---

## ⚙️ Installation & Setup

### 🔹 Clone Repository

```bash
git clone https://github.com/Meraz210/Attendance-system.git
cd Attendance-system
```

---

### 🔹 Backend Setup

```bash
npm install
node server.js
```

👉 Runs on: `http://localhost:5000`

---

### 🔹 Frontend Setup

```bash
cd frontend
npm install
npm start
```

👉 Runs on: `http://localhost:3000`

---

## 📡 API Endpoints

### 👤 Student

* `POST /add-student` → Add student
* `GET /students` → Get all students

---

### 📅 Attendance

* `POST /mark-attendance` → Mark attendance
* `GET /attendance` → Get all attendance
* `GET /attendance/:studentId` → Get by student
* `GET /attendance-by-date?date=YYYY-MM-DD` → Filter by date

---

## 🧠 Future Improvements

* 🔐 Authentication (Login/Signup)
* 📊 Dashboard with charts
* 📄 Export attendance (CSV/PDF)
* 🎨 Improved UI/UX

---

## 👨‍💻 Author

**Meraz**
Aspiring Full Stack Developer 🚀

---

## ⭐ Show Your Support

If you like this project, give it a ⭐ on GitHub!
