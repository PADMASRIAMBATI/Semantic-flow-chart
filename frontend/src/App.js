import React, { useState, useEffect, useCallback } from "react";
import Quiz from "./components/Quiz";
import Admin from "./components/Admin";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("login");
  const [sentences, setSentences] = useState([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionResults, setSessionResults] = useState(null); 
  const [formData, setFormData] = useState({
    name: "", class: "", email: "", password: "", confirmPassword: ""
  });

  const checkProgressAndSetView = useCallback(async (userData, allSentences) => {
    if (userData.role === "admin") {
      setView("admin");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/admin/stats`);
      const allStats = await res.json();
      
      const userAttempts = allStats.filter(s => s.student_name === userData.name);
      const completedCount = userAttempts.length;

      setCurrentSentenceIdx(completedCount);

      if (allSentences.length > 0 && completedCount >= allSentences.length) {
        // Calculate cumulative totals for the results screen
        const totalS = userAttempts.reduce((acc, curr) => acc + curr.sentence_score, 0);
        const totalF = userAttempts.reduce((acc, curr) => acc + curr.flowchart_score, 0);
        const totalQs = userAttempts.reduce((acc, curr) => acc + curr.total_questions, 0);
        
        setSessionResults({ 
            sScore: totalS, 
            fScore: totalF, 
            total: totalQs,
            sentenceCount: completedCount
        });
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
    setSessionResults(null);
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

      // Trigger progress check to update totals and switch view if finished
      await checkProgressAndSetView(user, sentences);
      
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
            <h2 style={{ color: "var(--primary)" }}>All Sentences Completed! 🎉</h2>
            
            {sessionResults ? (
                <div style={{ marginTop: "20px" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "20px" }}>
                        Final Report for {user?.name}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ background: '#f0f4ff', padding: '25px', borderRadius: '15px', border: '1px solid #d0e1ff', flex: 1 }}>
                            <p style={{ color: '#444', fontWeight: '600', marginBottom: "10px" }}>Total Marks (Phase 1)</p>
                            <h3 style={{ fontSize: '2.2rem', color: '#6200ee' }}>{sessionResults.sScore} / {sessionResults.total}</h3>
                        </div>
                        <div style={{ background: '#f0fff4', padding: '25px', borderRadius: '15px', border: '1px solid #c2f0d1', flex: 1 }}>
                            <p style={{ color: '#444', fontWeight: '600', marginBottom: "10px" }}>Total Marks (Phase 2)</p>
                            <h3 style={{ fontSize: '2.2rem', color: '#2e7d32' }}>{sessionResults.fScore} / {sessionResults.total}</h3>
                        </div>
                    </div>

                    <div style={{ padding: "20px", background: "#f8f9fa", borderRadius: "10px", marginBottom: "30px" }}>
                        <p>Total Sentences Completed: <strong>{sessionResults.sentenceCount}</strong></p>
                        <p>Total Correct Answers: <strong>{sessionResults.sScore + sessionResults.fScore}</strong></p>
                    </div>
                </div>
            ) : (
                <p>Loading your final marks...</p>
            )}

            <button className="btn-primary" style={{ width: "auto", padding: "12px 60px" }} onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;