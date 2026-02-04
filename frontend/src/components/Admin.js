import React, { useEffect, useState } from 'react';

export default function Admin() {
  const [stats, setStats] = useState([]);
  const [activeTab, setActiveTab] = useState("results"); // "results" or "upload"
  
  // State for adding new content
  const [newSentence, setNewSentence] = useState({
    sentence: "",
    graph_data: "",
    questions: [{ q: "", options: ["", "", "", ""], answer: "" }]
  });

  useEffect(() => {
    if (activeTab === "results") fetchStats();
  }, [activeTab]);

  const fetchStats = () => {
    fetch("http://localhost:8000/admin/stats")
      .then(res => res.json())
      .then(data => {
        console.log("Stats fetched from database:", data);
        setStats(data);
      })
      .catch(err => console.error("Error fetching stats:", err));
  };

  /**
   * Helper Logic: Group stats by Student Name
   * This ensures that if Padmasri answered 3 sentences, all 3 appear in one card.
   */
  const groupedStats = stats.reduce((acc, current) => {
    const name = current.student_name || "Unknown Student";
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(current);
    return acc;
  }, {});

  // --- Upload Form Handlers ---
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...newSentence.questions];
    updatedQuestions[index][field] = value;
    setNewSentence({ ...newSentence, questions: updatedQuestions });
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updatedQuestions = [...newSentence.questions];
    updatedQuestions[qIndex].options[oIndex] = value;
    setNewSentence({ ...newSentence, questions: updatedQuestions });
  };

  const addQuestion = () => {
    setNewSentence({
      ...newSentence,
      questions: [...newSentence.questions, { q: "", options: ["", "", "", ""], answer: "" }]
    });
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:8000/admin/upload-sentence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSentence),
    });
    if (res.ok) {
      alert("Sentence and Quiz uploaded successfully!");
      setNewSentence({ sentence: "", graph_data: "", questions: [{ q: "", options: ["", "", "", ""], answer: "" }] });
    }
  };

  return (
    <div className="admin-wrapper">
      <div className="admin-nav">
        <button className={activeTab === "results" ? "nav-btn active" : "nav-btn"} onClick={() => setActiveTab("results")}>Student Performance</button>
        <button className={activeTab === "upload" ? "nav-btn active" : "nav-btn"} onClick={() => setActiveTab("upload")}>Upload Content</button>
      </div>

      {activeTab === "results" ? (
        <div className="results-container">
          {Object.keys(groupedStats).length === 0 ? (
            <div className="card empty-state">
              <h3>No results found in the database.</h3>
              <p>Wait for students to complete the test or check your database connection.</p>
            </div>
          ) : (
            Object.entries(groupedStats).map(([studentName, attempts]) => (
              <div key={studentName} className="card student-report-card">
                <div className="student-report-header">
                  <div>
                    <h3>Student: {studentName}</h3>
                    <p className="student-sub">Class: {attempts[0].student_class}</p>
                  </div>
                  <div className="total-sentences-badge">
                    {attempts.length} Sentence(s) Analyzed
                  </div>
                </div>

                

                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Sentence ID</th>
                      <th>Phase 1 (Sentence)</th>
                      <th>Phase 2 (Flow Format)</th>
                      <th>Total Qs</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((s, i) => {
                      const improved = s.flowchart_score > s.sentence_score;
                      return (
                        <tr key={i}>
                          <td><strong>Sentence #{s.sentence_id}</strong></td>
                          <td className="score-cell">{s.sentence_score} / {s.total_questions}</td>
                          <td className="score-cell">{s.flowchart_score} / {s.total_questions}</td>
                          <td>{s.total_questions}</td>
                          <td>
                            <span className={improved ? "status-good" : "status-neutral"}>
                              {improved ? "⬆ Improved" : "No Change"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card upload-card">
          <h3>Add New Evaluation Set</h3>
          <form onSubmit={submitUpload}>
            <div className="form-section">
              <label>Sentence Text</label>
              <input 
                type="text" 
                value={newSentence.sentence} 
                onChange={(e) => setNewSentence({...newSentence, sentence: e.target.value})} 
                required 
              />
            </div>

            <div className="form-section">
              <label>Flowchart Structure (Semantic Format)</label>
              <textarea 
                rows="6"
                placeholder="<sent_id=x> ... paste graph data here ..."
                value={newSentence.graph_data}
                onChange={(e) => setNewSentence({...newSentence, graph_data: e.target.value})}
                required
              />
            </div>

            <div className="quiz-upload-section">
                <h4>Quiz Questions (4 Options Each)</h4>
                {newSentence.questions.map((q, qIdx) => (
                <div key={qIdx} className="admin-question-box">
                    <input 
                    type="text" 
                    className="q-input"
                    placeholder={`Question ${qIdx + 1}`} 
                    value={q.q}
                    onChange={(e) => handleQuestionChange(qIdx, "q", e.target.value)} 
                    required
                    />
                    <div className="admin-options-grid">
                    {q.options.map((opt, oIdx) => (
                        <input 
                        key={oIdx} 
                        type="text" 
                        placeholder={`Option ${oIdx + 1}`} 
                        value={opt}
                        onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                        required
                        />
                    ))}
                    </div>
                    <input 
                    className="correct-ans-input"
                    type="text" 
                    placeholder="Exact Correct Answer" 
                    value={q.answer}
                    onChange={(e) => handleQuestionChange(qIdx, "answer", e.target.value)}
                    required
                    />
                </div>
                ))}
            </div>

            <div className="admin-actions">
              <button type="button" className="btn-add" onClick={addQuestion}>+ Add Question</button>
              <button type="submit" className="btn-save">Save All to Database</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}