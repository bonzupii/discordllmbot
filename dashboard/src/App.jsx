import { useState, useEffect } from 'react'
import axios from 'axios'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Settings from './components/Settings'
import Relationships from './components/Relationships'
import Logs from './components/Logs'
import Servers from './components/Servers'
import LatestReplies from './components/LatestReplies'

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
          <NavLink to="/servers" label="Servers" />
          <NavLink to="/logs" label="Logs" />
        </nav>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center">
        <Routes>
          <Route path="/" element={(
            <div className="flex flex-col items-center w-full space-y-8">
              <LatestReplies />
            </div>
          )} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/relationships" element={<Relationships />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </main>

      <footer className="mt-auto pt-12 w-full max-w-5xl flex justify-between items-center text-slate-600 text-xs">
        <div className="flex items-center space-x-4">
          <span>DiscordLLMBot Dashboard v0.1.0</span>
          {health ? (
            <span className={`font-mono uppercase text-xs px-2 py-0.5 rounded ${health.status === 'ok' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              API: {health.status}
            </span>
          ) : (
            <span className="text-slate-500 animate-pulse text-xs">Connecting...</span>
          )}
        </div>
        {health && (
          <span className="text-indigo-300 font-mono">Uptime: {Math.floor(health.uptime)}s</span>
        )}
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
