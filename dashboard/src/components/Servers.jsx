import { useState, useEffect } from 'react';
import axios from 'axios';

function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [botInfo, setBotInfo] = useState(null);

  useEffect(() => {
    fetchServers();
    fetchBotInfo();
  }, []);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/servers');
      setServers(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      setError('Failed to load server data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBotInfo = async () => {
    try {
      const response = await axios.get('/api/bot-info');
      setBotInfo(response.data);
    } catch (err) {
      console.error('Failed to fetch bot info:', err);
    }
  };

  const handleLeaveServer = async (serverId) => {
    if (window.confirm(`Are you sure you want to remove the bot from server "${servers.find(s => s.id === serverId)?.name}"?`)) {
      try {
        await axios.delete(`/api/servers/${serverId}`);
        // Refresh the server list after removal
        fetchServers();
      } catch (err) {
        console.error('Failed to leave server:', err);
        alert('Failed to remove bot from server');
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-2xl w-full">
        <h2 className="text-xl font-semibold mb-4 border-b border-slate-800 pb-2">Servers</h2>
        <div className="text-slate-500 animate-pulse">Loading servers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-2xl w-full">
        <h2 className="text-xl font-semibold mb-4 border-b border-slate-800 pb-2">Servers</h2>
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-2xl w-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
        <h2 className="text-xl font-semibold text-indigo-400">Servers</h2>
        {botInfo && (
          <a 
            href={botInfo.inviteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
          >
            Invite Bot to Server
          </a>
        )}
      </div>
      
      {servers.length === 0 ? (
        <div className="text-slate-500">The bot is not in any servers.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Server Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Join Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {servers.map((server) => (
                <tr key={server.id} className="hover:bg-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{server.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                    {server.joinedAt ? new Date(server.joinedAt).toLocaleString() : 'Unknown'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleLeaveServer(server.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors mr-2"
                    >
                      Remove Bot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Servers;