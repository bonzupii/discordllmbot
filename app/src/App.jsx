import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealth(res.data))
      .catch(err => console.error('Failed to fetch health', err))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4 text-indigo-400">DiscordLLMBot Dashboard</h1>
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-2xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 border-b border-slate-800 pb-2">System Status</h2>
        {health ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-green-400 font-mono uppercase">{health.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Uptime:</span>
              <span className="text-indigo-300 font-mono">{Math.floor(health.uptime)}s</span>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 animate-pulse">Connecting to API...</div>
        )}
      </div>
      <p className="mt-8 text-slate-500 text-sm">
        Phase 4: Frontend Scaffolding Complete
      </p>
    </div>
  )
}

export default App
