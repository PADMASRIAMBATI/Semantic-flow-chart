import React, { useState, useEffect, useCallback } from "react";
import Quiz from "./components/Quiz";
import Admin from "./components/Admin";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("login");
  const [sentences, setSentences] = useState([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [loading, setLoading] = useState(true); // Added to prevent flickering
  const [formData, setFormData] = useState({
    name: "", class: "", email: "", password: "", confirmPassword: ""
  });

  // 1. Helper: Sync index with database progress
  // Wrapped in useCallback to prevent unnecessary re-renders
  const checkProgressAndSetView = useCallback(async (userData, allSentences) => {
    if (userData.role === "admin") {
      setView("admin");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/admin/stats`);
      const allStats = await res.json();
      
      // Filter results for THIS specific student
      const userAttempts = allStats.filter(s => s.student_name === userData.name);
      const completedCount = userAttempts.length;

      setCurrentSentenceIdx(completedCount);

      // logic: If sentences are loaded and user finished them all
      if (allSentences.length > 0 && completedCount >= allSentences.length) {
        setView("completed");
      } else {
        setView("quiz");
      }
    } catch (err) {
      console.error("Error syncing progress:", err);
      setView("quiz");
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Initial Load: Fetch Data and Restore Session
  useEffect(() => {
    const initApp = async () => {
      let fetchedSentences = [];
      try {
        const res = await fetch("http://localhost:8000/sentences");
        fetchedSentences = await res.json();
        setSentences(fetchedSentences);
      } catch (err) {
        console.error("Failed to fetch sentences:", err);
      }

      const savedUser = localStorage.getItem("nlp_user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Pass the fresh sentences directly to avoid waiting for state update
        await checkProgressAndSetView(parsedUser, fetchedSentences);
      } else {
        setLoading(false);
      }
    };

    initApp();
  }, [checkProgressAndSetView]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem("nlp_user", JSON.stringify(data));
        setUser(data);
        await checkProgressAndSetView(data, sentences);
      } else {
        alert("Invalid Credentials");
      }
    } catch (err) {
      alert("Server connection failed");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return alert("Passwords mismatch");
    
    await fetch("http://localhost:8000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        student_class: formData.class,
        email: formData.email,
        password: formData.password,
      }),
    });
    alert("Signup successful! Please login.");
    setView("login");
  };

  const handleLogout = () => {
    localStorage.removeItem("nlp_user");
    setUser(null);
    setView("login");
    setCurrentSentenceIdx(0);
  };

  const handleQuizComplete = async (sScore, fScore, total) => {
    const payload = {
      student_name: user.name,
      student_class: user.class,
      sentence_id: sentences[currentSentenceIdx].id,
      sentence_score: sScore,
      flowchart_score: fScore,
      total_questions: total,
    };

    try {
      const response = await fetch("http://localhost:8000/submit-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Submission failed");

      const nextIdx = currentSentenceIdx + 1;
      if (nextIdx < sentences.length) {
        setCurrentSentenceIdx(nextIdx);
      } else {
        setView("completed");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving results.");
    }
  };

  if (loading) {
    return (
      <div className="App loading-screen">
        <div className="spinner"></div>
        <p>Restoring session...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <nav className="navbar">
        <h2>NLP Evaluation Portal</h2>
        {user && (
          <div className="user-info">
            <span>{user.role === 'admin' ? 'Admin' : 'Student'}: <strong>{user.name}</strong></span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </nav>

      <div className="container">
        {view === "login" && (
          <div className="auth-card">
            <h3>Login</h3>
            <form onSubmit={handleLogin}>
              <input type="text" placeholder="Email" onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} />
              <button type="submit" className="btn-primary">Login</button>
            </form>
            <p className="toggle-link" onClick={() => setView("signup")}>Sign up here</p>
          </div>
        )}

        {view === "signup" && (
          <div className="auth-card">
            <h3>Student Registration</h3>
            <form onSubmit={handleSignup}>
              <input type="text" placeholder="Name" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input type="text" placeholder="Class" onChange={(e) => setFormData({...formData, class: e.target.value})} />
              <input type="email" placeholder="Email" onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} />
              <input type="password" placeholder="Confirm Password" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
              <button type="submit" className="btn-primary">Register</button>
            </form>
            <p className="toggle-link" onClick={() => setView("login")}>Back to Login</p>
          </div>
        )}

        {view === "quiz" && sentences.length > 0 && sentences[currentSentenceIdx] && (
          <Quiz 
            key={sentences[currentSentenceIdx].id || currentSentenceIdx} 
            sentenceData={sentences[currentSentenceIdx]} 
            onComplete={handleQuizComplete} 
          />
        )}

        {view === "admin" && <Admin />}

        {view === "completed" && (
          <div className="card result-card" style={{ textAlign: "center", borderTop: "5px solid var(--primary)" }}>
            <h3>Evaluation Status</h3>
            <p style={{ margin: "20px 0", fontSize: "1.1rem" }}>
              Thank you, <strong>{user?.name}</strong>. You have completed all available sentences. 
              Our records show you have submitted your analysis.
            </p>
            <button className="btn-primary" style={{ width: "auto" }} onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;