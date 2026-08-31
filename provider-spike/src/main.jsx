import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AssistantRuntimeProvider, ThreadPrimitive, useLocalRuntime } from '@assistant-ui/react';
import { RefinrRuntime } from './runtime.js';
import './styles.css';

function QuestionCard({ question, onAnswer, disabled }) {
  if (!question) return null;
  return <div className="question-card" data-question-id={question.id}>
    <p className="question-label">Refinr · next question</p>
    <h2>{question.text}</h2>
    <div className="options">
      {question.options.map((option) => <button key={option.id} disabled={disabled} onClick={() => onAnswer(option.label)}>{option.label}</button>)}
    </div>
    {question.allowFreeText && <form onSubmit={(event) => { event.preventDefault(); const value = event.currentTarget.elements.answer.value.trim(); if (value) { onAnswer(value); event.currentTarget.reset(); } }}>
      <input name="answer" aria-label="Your answer" placeholder="Or type your answer…" disabled={disabled} />
      <button type="submit" disabled={disabled}>Answer</button>
    </form>}
  </div>;
}

function App() {
  const runtime = useLocalRuntime({ run: async () => ({ content: [{ type: 'text', text: '' }] }) });
  const [refinr] = useState(() => new RefinrRuntime());
  const [prompt, setPrompt] = useState('');
  const [question, setQuestion] = useState(null);
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true); setError(''); setTurns([]);
    try { setQuestion(await refinr.ask(text, [])); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function answer(text) {
    if (busy || !question) return;
    const nextTurns = [...turns, { role: 'assistant', type: 'question', id: question.id, text: question.text }, { role: 'user', type: 'answer', text }];
    setTurns(nextTurns); setBusy(true); setError('');
    try { setQuestion(await refinr.ask(prompt.trim(), nextTurns)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <AssistantRuntimeProvider runtime={runtime}>
    <main className="shell">
      <header><strong>✦ Refinr</strong><span>External provider spike · assistant-ui</span></header>
      <ThreadPrimitive.Root><ThreadPrimitive.Viewport className="thread">
        <h1>Adaptive refinement</h1>
        <p className="intro">One real model question at a time. Each answer is returned to the conversation before the next question is selected.</p>
        {!turns.length && <form className="start" onSubmit={(event) => { event.preventDefault(); start(); }}>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Rough prompt" placeholder="Paste a rough prompt…" />
          <button type="submit" disabled={busy}>{busy ? 'Asking…' : 'Start refinement'}</button>
        </form>}
        {turns.map((turn, index) => <div className={`turn ${turn.role}`} key={`${turn.role}-${index}`}><b>{turn.role === 'user' ? 'You' : 'Refinr'}</b><span>{turn.text}</span></div>)}
        {question && <QuestionCard question={question} onAnswer={answer} disabled={busy} />}
        {error && <p className="error" role="alert">{error}</p>}
      </ThreadPrimitive.Viewport></ThreadPrimitive.Root>
    </main>
  </AssistantRuntimeProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
