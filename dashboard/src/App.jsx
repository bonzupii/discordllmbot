import { useState, useEffect } from 'react'
import axios from 'axios'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Settings from './components/Settings'
import Relationships from './components/Relationships'
import Logs from './components/Logs'

function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('/api/health')
        .then(res => setHealth(res.data))
        .catch(err => console.error('Failed to fetch health', err))
    }, 5000)
    
    axios.get('/api/health')
      .then(res => setHealth(res.data))
      .catch(err => console.error('Failed to fetch health', err))

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center p-8">
      <header className="w-full max-w-5xl flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-indigo-400">DiscordLLMBot</h1>
        <nav className="flex space-x-4">
          <NavLink to="/" label="Status" />
          <NavLink to="/settings" label="Settings" />
          <NavLink to="/relationships" label="Relationships" />
          <NavLink to="/logs" label="Logs" />
        </nav>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center">
        <Routes>
          <Route path="/" element={(
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
          )} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/relationships" element={<Relationships />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </main>

      <footer className="mt-auto pt-12 text-slate-600 text-xs">
        DiscordLLMBot Dashboard v0.1.0
      </footer>
    </div>
  )
}

function NavLink({ to, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to}
      className={`px-4 py-2 rounded-md transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
    >
      {label}
    </Link>
  );
}

export default App
