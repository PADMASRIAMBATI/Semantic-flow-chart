import React, { useState, useEffect } from 'react';
import FlowChart from './FlowChart';

export default function Quiz({ sentenceData, onComplete }) {
  const [phase, setPhase] = useState(1);
  const [qIndex, setQIndex] = useState(0);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  
  // NEW: State to track selected answer before clicking Next
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    setPhase(1);
    setQIndex(0);
    setScores({ p1: 0, p2: 0 });
    setSelectedAnswer(null);
  }, [sentenceData]);

  // Logic to move to next question/phase
  const handleNext = () => {
    if (!selectedAnswer) {
      alert("Please select an answer first!");
      return;
    }

    const currentQuestion = sentenceData.questions[qIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer;
    
    let currentP1 = scores.p1;
    let currentP2 = scores.p2;

    if (phase === 1) {
      if (isCorrect) {
        currentP1 += 1;
        setScores(s => ({ ...s, p1: s.p1 + 1 }));
      }
    } else {
      if (isCorrect) {
        currentP2 += 1;
        setScores(s => ({ ...s, p2: s.p2 + 1 }));
      }
    }

    // Reset selection for the next question
    setSelectedAnswer(null);

    // Navigation logic
    if (qIndex < sentenceData.questions.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      if (phase === 1) {
        alert("Sentence Phase Complete! Now starting Flowchart Analysis.");
        setPhase(2);
        setQIndex(0);
      } else {
        onComplete(currentP1, currentP2, sentenceData.questions.length);
      }
    }
  };

  if (!sentenceData || !sentenceData.questions || sentenceData.questions.length === 0) {
    return <div className="card">Loading evaluation data from database...</div>;
  }

  return (
    <div className="quiz-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
      {/* Left Card: Sentence & Flowchart View */}
      <div className="card" style={{ flex: '1 1 500px', minHeight: '450px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>Phase {phase}</h2>
          <span className={`badge ${phase === 1 ? 'phase-1' : 'phase-2'}`}>
            {phase === 1 ? "Text Only" : "Visual Analysis"}
          </span>
        </div>
        
        <div className="sentence-display">
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '5px' }}>Analyze this sentence:</p>
          <div style={{ 
            fontSize: '1.4rem', 
            padding: '20px', 
            background: '#f8f9fa', 
            borderLeft: '5px solid #6200ee',
            borderRadius: '4px',
            lineHeight: '1.5'
          }}>
            "{sentenceData.sentence}"
          </div>
        </div>
        
        {phase === 2 && (
          <div className="flowchart-section" style={{ marginTop: '25px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
              <strong>Semantic Structure:</strong> Click nodes to expand/collapse.
            </p>
            <div style={{ background: '#fcfcfc', borderRadius: '8px', border: '1px solid #ddd' }}>
              <FlowChart externalInput={sentenceData.graph_data} />
            </div>
          </div>
        )}
      </div>

      {/* Right Card: Dynamic Questions */}
      <div className="card" style={{ flex: '1 1 350px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <span style={{ color: '#6200ee', fontWeight: 'bold' }}>Progress</span>
            <span>Question {qIndex + 1} / {sentenceData.questions.length}</span>
        </div>
        
        <h3 style={{ marginBottom: '25px', lineHeight: '1.4' }}>{sentenceData.questions[qIndex].q}</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sentenceData.questions[qIndex].options.map((opt, i) => (
            <button 
              key={i} 
              onClick={() => setSelectedAnswer(opt)} 
              className="option-btn"
              style={{
                textAlign: 'left',
                padding: '14px 18px',
                border: selectedAnswer === opt ? '2px solid #6200ee' : '1px solid #ddd',
                borderRadius: '10px',
                background: selectedAnswer === opt ? '#f0eaff' : 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{ 
                marginRight: '15px', 
                color: '#6200ee', 
                fontWeight: 'bold',
                background: selectedAnswer === opt ? '#6200ee' : '#f0eaff',
                color: selectedAnswer === opt ? 'white' : '#6200ee',
                padding: '4px 8px',
                borderRadius: '4px',
                minWidth: '25px',
                textAlign: 'center'
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>

        {/* NEW: Next Question / Submit Button */}
        <button 
          onClick={handleNext}
          disabled={!selectedAnswer}
          className="btn-primary"
          style={{ 
            marginTop: '25px', 
            opacity: selectedAnswer ? 1 : 0.5,
            cursor: selectedAnswer ? 'pointer' : 'not-allowed'
          }}
        >
          {qIndex === sentenceData.questions.length - 1 ? "Submit Phase" : "Next Question"}
        </button>
      </div>
    </div>
  );
}