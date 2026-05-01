import axios from "axios";
import { useEffect, useState } from "react";

function App() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/students")
      .then(res => {
        console.log("DATA:", res.data);
        setStudents(res.data);
      })
      .catch(err => console.log(err));
  }, []);

  const markAttendance = (studentId) => {
    axios.post("http://localhost:5000/mark-attendance", {
      studentId
    })
      .then(res => {
        alert("Attendance Marked ✅");
        console.log(res.data);
      })
      .catch(err => {
        alert(err.response.data.message);
      });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📚 Student List</h2>

      {students.length === 0 ? (
        <p>No students found</p>
      ) : (
        students.map((s, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            👤 {s.name} | 🆔 {s.studentId}

            <button
              style={{ marginLeft: "10px" }}
              onClick={() => markAttendance(s.studentId)}
            >
              ✅ Mark Present
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
