import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getToday = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const initialStudentForm = {
  name: '',
  email: '',
  studentId: ''
};

const initialAuthForm = {
  name: '',
  email: '',
  password: '',
  role: 'admin',
  studentId: ''
};

const roleDetails = {
  admin: {
    label: 'Admin Panel',
    title: 'Attendance Operations',
    description: 'Manage students, review daily attendance, and export reports.'
  },
  user: {
    label: 'User Panel',
    title: 'Student Check-in',
    description: 'Students can mark today\'s attendance and review recent records.'
  }
};

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [token, setToken] = useState(() => localStorage.getItem('attendanceToken') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('attendanceUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [form, setForm] = useState(initialStudentForm);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingStudent, setSavingStudent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingStudentId, setMarkingStudentId] = useState('');
  const [marked, setMarked] = useState({});

  const today = getToday();
  const activeRole = currentUser?.role || authForm.role;
  const currentUserStudentId = currentUser?.studentId || '';

  const authHeaders = useMemo(() => ({
    headers: {
      Authorization: `Bearer ${token}`
    }
  }), [token]);

  const studentById = useMemo(() => {
    return students.reduce((lookup, student) => {
      lookup[student.studentId] = student;
      return lookup;
    }, {});
  }, [students]);

  const attendanceByDate = useMemo(() => {
    return attendance.filter((record) => record.date === selectedDate);
  }, [attendance, selectedDate]);

  const markedToday = useMemo(() => {
    return new Set(
      attendance
        .filter((record) => record.date === today)
        .map((record) => record.studentId)
    );
  }, [attendance, today]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query)
    ));
  }, [searchTerm, students]);

  const selectedStudent = currentUserStudentId ? studentById[currentUserStudentId] : null;
  const selectedStudentAttendance = attendance.filter((record) => record.studentId === currentUserStudentId).slice(0, 5);
  const presentToday = markedToday.size;
  const absentToday = Math.max(students.length - presentToday, 0);
  const attendanceRate = students.length ? Math.round((presentToday / students.length) * 100) : 0;

  const storeSession = (authData) => {
    localStorage.setItem('attendanceToken', authData.token);
    localStorage.setItem('attendanceUser', JSON.stringify(authData.user));
    setToken(authData.token);
    setCurrentUser(authData.user);
    setMessage(authData.message);
    setError('');
  };

  const logout = () => {
    localStorage.removeItem('attendanceToken');
    localStorage.removeItem('attendanceUser');
    setToken('');
    setCurrentUser(null);
    setStudents([]);
    setAttendance([]);
    setMarked({});
    setMessage('');
    setError('');
    setAuthForm(initialAuthForm);
  };

  const fetchStudents = useCallback(async () => {
    const response = await axios.get(`${API_URL}/students`, authHeaders);
    setStudents(response.data);
  }, [authHeaders]);

  const fetchAttendance = useCallback(async () => {
    const response = await axios.get(`${API_URL}/attendance`, authHeaders);
    setAttendance(response.data);
  }, [authHeaders]);

  const refreshDashboard = useCallback(async ({ showMessage = false } = {}) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      setError('');
      await Promise.all([fetchStudents(), fetchAttendance()]);

      if (showMessage) {
        setMessage('Dashboard refreshed');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        setError('Session expired. Please login again.');
        return;
      }

      setError(err.response?.data?.message || 'Unable to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchAttendance, fetchStudents, token]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    setMarked((currentMarked) => {
      const nextMarked = { ...currentMarked };
      markedToday.forEach((studentId) => {
        nextMarked[studentId] = true;
      });

      return nextMarked;
    });
  }, [markedToday]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : authForm;
      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      storeSession(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const addStudent = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      setSavingStudent(true);
      const response = await axios.post(`${API_URL}/add-student`, form, authHeaders);

      setStudents((currentStudents) => [response.data.data, ...currentStudents]);
      setForm(initialStudentForm);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add student');
    } finally {
      setSavingStudent(false);
    }
  };

  const markAttendance = async (studentId) => {
    setMessage('');
    setError('');
    setMarkingStudentId(studentId);

    try {
      const response = await axios.post(`${API_URL}/mark-attendance`, { studentId }, authHeaders);

      setMarked((currentMarked) => ({
        ...currentMarked,
        [studentId]: true
      }));
      setAttendance((currentAttendance) => [response.data.data, ...currentAttendance]);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to mark attendance');
      await fetchAttendance();
    } finally {
      setMarkingStudentId('');
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Student Name', 'Student ID', 'Email', 'Date', 'Time', 'Status'],
      ...attendanceByDate.map((record) => {
        const student = studentById[record.studentId];

        return [
          student?.name || 'Unknown student',
          record.studentId,
          student?.email || '',
          record.date,
          record.time,
          record.status
        ];
      })
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-block auth-brand">
            <div className="brand-mark">SA</div>
            <div>
              <strong>Smart Attendance</strong>
              <span>Secure admin and student access</span>
            </div>
          </div>

          <div className="section-title">
            <h1>{authMode === 'login' ? 'Login' : 'Create Account'}</h1>
            <p>{authMode === 'login' ? 'Use your registered email and password.' : 'Create an admin or student user account.'}</p>
          </div>

          {(message || error) && (
            <div className={error ? 'alert alert-error' : 'alert alert-success'}>
              {error || message}
            </div>
          )}

          <section className="role-switch auth-mode-switch" aria-label="Authentication mode">
            <button
              className={authMode === 'login' ? 'role-button active' : 'role-button'}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'role-button active' : 'role-button'}
              type="button"
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </section>

          <form className="student-form auth-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <label>
                  Full Name
                  <input
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    placeholder="Your name"
                    required
                  />
                </label>

                <label>
                  Account Type
                  <select name="role" value={authForm.role} onChange={handleAuthChange}>
                    <option value="admin">Admin</option>
                    <option value="user">Student/User</option>
                  </select>
                </label>
              </>
            )}

            <label>
              Email
              <input
                name="email"
                type="email"
                value={authForm.email}
                onChange={handleAuthChange}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                name="password"
                type="password"
                value={authForm.password}
                onChange={handleAuthChange}
                placeholder="At least 6 characters"
                required
              />
            </label>

            {authMode === 'register' && authForm.role === 'user' && (
              <label>
                Student ID
                <input
                  name="studentId"
                  value={authForm.studentId}
                  onChange={handleAuthChange}
                  placeholder="Student ID from admin"
                  required
                />
              </label>
            )}

            <button className="primary-button" type="submit">
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="app-topbar">
        <div className="brand-block">
          <div className="brand-mark">SA</div>
          <div>
            <strong>Smart Attendance</strong>
            <span>{currentUser.name} · {currentUser.role === 'admin' ? 'Admin' : currentUser.studentId}</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => refreshDashboard({ showMessage: true })}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button className="ghost-button" type="button" onClick={logout}>
            Logout
          </button>
          <div className="today-panel">
            <span>Current Date</span>
            <strong>{today}</strong>
          </div>
        </div>
      </section>

      <section className="page-header">
        <div>
          <p className="eyebrow">{roleDetails[activeRole].label}</p>
          <h1>{roleDetails[activeRole].title}</h1>
          <p className="page-subtitle">{roleDetails[activeRole].description}</p>
        </div>
      </section>

      {(message || error) && (
        <div className={error ? 'alert alert-error' : 'alert alert-success'}>
          {error || message}
        </div>
      )}

      {activeRole === 'admin' ? (
        <>
          <section className="stats-grid" aria-label="Attendance summary">
            <article className="stat-card">
              <span>Total Students</span>
              <strong>{students.length}</strong>
            </article>
            <article className="stat-card">
              <span>Present Today</span>
              <strong>{presentToday}</strong>
            </article>
            <article className="stat-card">
              <span>Absent Today</span>
              <strong>{absentToday}</strong>
            </article>
            <article className="stat-card">
              <span>Attendance Rate</span>
              <strong>{attendanceRate}%</strong>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${attendanceRate}%` }} />
              </div>
            </article>
          </section>

          <section className="dashboard-grid">
            <form className="student-form" onSubmit={addStudent}>
              <div className="section-title">
                <h2>Add Student</h2>
                <p>Register a student profile before creating a student login.</p>
              </div>

              <label>
                Name
                <input name="name" value={form.name} onChange={handleChange} placeholder="Student name" required />
              </label>

              <label>
                Email
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@example.com" required />
              </label>

              <label>
                Student ID
                <input name="studentId" value={form.studentId} onChange={handleChange} placeholder="STD-1001" required />
              </label>

              <button className="primary-button" type="submit" disabled={savingStudent}>
                {savingStudent ? 'Adding...' : 'Add Student'}
              </button>
            </form>

            <section className="student-list">
              <div className="list-toolbar">
                <div className="section-title">
                  <h2>Student Directory</h2>
                  <p>{students.length} registered student{students.length === 1 ? '' : 's'}</p>
                </div>

                <label className="search-field">
                  Search
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Name, email, or ID" />
                </label>
              </div>

              {loading ? (
                <p className="empty-state">Loading student directory...</p>
              ) : students.length === 0 ? (
                <p className="empty-state">No students found.</p>
              ) : filteredStudents.length === 0 ? (
                <p className="empty-state">No students match your search.</p>
              ) : (
                <div className="student-table">
                  {filteredStudents.map((student) => (
                    <article className="student-row" key={student._id}>
                      <div className="student-identity">
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                        <small>{student.studentId}</small>
                      </div>

                      <span className={markedToday.has(student.studentId) ? 'status-pill' : 'status-pill muted'}>
                        {markedToday.has(student.studentId) ? 'Present today' : 'Not marked'}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="attendance-section">
            <div className="section-title attendance-title">
              <div>
                <h2>Attendance Records</h2>
                <p>{attendanceByDate.length} present record{attendanceByDate.length === 1 ? '' : 's'} for selected date.</p>
              </div>

              <div className="record-actions">
                <button className="ghost-button" type="button" onClick={() => setSelectedDate(today)}>
                  Today
                </button>
                <button className="ghost-button" type="button" onClick={exportCsv} disabled={attendanceByDate.length === 0}>
                  Export CSV
                </button>
                <label className="date-filter">
                  Date
                  <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                </label>
              </div>
            </div>

            {attendanceByDate.length === 0 ? (
              <p className="empty-state">No attendance records for this date.</p>
            ) : (
              <div className="records-table">
                <div className="records-head">
                  <span>Student</span>
                  <span>Student ID</span>
                  <span>Time</span>
                  <span>Status</span>
                </div>

                {attendanceByDate.map((record) => {
                  const student = studentById[record.studentId];

                  return (
                    <div className="records-row" key={record._id}>
                      <span>{student?.name || 'Unknown student'}</span>
                      <span>{record.studentId}</span>
                      <span>{record.time}</span>
                      <span className="status-pill">{record.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="user-layout">
          <section className="user-card">
            <div className="section-title">
              <h2>Mark My Attendance</h2>
              <p>Your attendance is linked to your logged-in student account.</p>
            </div>

            {selectedStudent && (
              <article className="profile-summary">
                <span>Student Profile</span>
                <strong>{selectedStudent.name}</strong>
                <small>{selectedStudent.email}</small>
                <em>{currentUserStudentId}</em>
              </article>
            )}

            <button
              className={marked[currentUserStudentId] || markedToday.has(currentUserStudentId) ? 'secondary-button wide-button' : 'primary-button wide-button'}
              type="button"
              disabled={!currentUserStudentId || marked[currentUserStudentId] || markedToday.has(currentUserStudentId) || markingStudentId === currentUserStudentId}
              onClick={() => markAttendance(currentUserStudentId)}
            >
              {marked[currentUserStudentId] || markedToday.has(currentUserStudentId)
                ? 'Present Today'
                : markingStudentId === currentUserStudentId
                  ? 'Marking...'
                  : 'Mark Present'}
            </button>
          </section>

          <section className="user-card">
            <div className="section-title">
              <h2>My Recent Attendance</h2>
              <p>Latest attendance entries for your account.</p>
            </div>

            {selectedStudentAttendance.length === 0 ? (
              <p className="empty-state">No attendance records found yet.</p>
            ) : (
              <div className="mini-records">
                {selectedStudentAttendance.map((record) => (
                  <div className="mini-record" key={record._id}>
                    <span>{record.date}</span>
                    <strong>{record.time}</strong>
                    <small>{record.status}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

export default App;
