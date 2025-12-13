"use client";
import { useState, FormEvent } from 'react';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, SUCCESS, ERROR
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if(!question.trim()) return;

    setStatus('LOADING');
    setAnswer('');
    setLogs([]);
    addLog("🚀 Sending request to Kestra Agent...");

    try {
      // 1. Trigger the Flow
      const triggerRes = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      if (!triggerRes.ok) throw new Error("Failed to trigger flow");
      
      const { executionId } = await triggerRes.json();
      addLog(`✅ Job started! ID: ${executionId}`);
      addLog("⏳ Waiting for PDF analysis (this may take 15-30s)...");

      // 2. Start Polling Loop
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/status?id=${executionId}`);
        const data = await statusRes.json();

        if (data.status === 'SUCCESS') {
          clearInterval(pollInterval);
          setAnswer(data.answer);
          setStatus('SUCCESS');
          addLog("✨ Analysis complete!");
        } else if (data.status === 'FAILED') {
          clearInterval(pollInterval);
          setStatus('ERROR');
          addLog("❌ Job failed. Check Kestra logs.");
        } else {
          // Still running...
          console.log("Still running...");
        }
      }, 2000); // Check every 2 seconds

    } catch (err: any) {
      console.error(err);
      setStatus('ERROR');
      addLog("❌ Error: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        
        {/* Header */}
        <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-blue-600 mb-2">🏭 ScrapIntel Agent</h1>
          <p className="text-slate-500">Ask complex questions about vehicle sales, scrap metal, and recycling trends.</p>
        </div>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              className="w-full p-4 border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition text-lg"
              rows={3}
              placeholder="e.g. Calculate the total scrap potential for Florida in 2030..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={status === 'LOADING' || !question.trim()}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99]
              ${status === 'LOADING' 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-200'}`}
          >
            {status === 'LOADING' ? 'Agent is Thinking...' : 'Ask Agent'}
          </button>
        </form>

        {/* Status Logs (Visible while loading) */}
        {status === 'LOADING' && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 font-mono text-sm text-slate-600 animate-pulse">
            {logs.map((log, i) => (
              <div key={i} className="mb-1"> {log} </div>
            ))}
          </div>
        )}

        {/* Final Result */}
        {status === 'SUCCESS' && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
              <h3 className="text-green-800 font-bold mb-3 flex items-center gap-2">
                <span>🤖</span> AI Analysis Result
              </h3>
              <div className="prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{answer}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === 'ERROR' && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-center">
            Something went wrong. Please ensure Kestra is running on port 8080.
          </div>
        )}

      </div>
    </div>
  );
}