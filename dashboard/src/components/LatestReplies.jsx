import { useState, useEffect } from 'react';
import axios from 'axios';

function LatestReplies() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReplies();
    const interval = setInterval(fetchReplies, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchReplies = async () => {
    try {
      const res = await axios.get('/api/replies?limit=5');
      setReplies(res.data);
    } catch (err) {
      console.error('Failed to fetch replies', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && replies.length === 0) return <div className="text-slate-500 animate-pulse">Loading activity...</div>;

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-2xl w-full">
      <h2 className="text-xl font-semibold mb-4 border-b border-slate-800 pb-2 text-indigo-400">Latest Activity</h2>
      <div className="space-y-4">
        {replies.length === 0 ? (
          <div className="text-slate-500 text-sm">No recent activity.</div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <img 
                    src={reply.avatarurl || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                    alt={reply.displayname || reply.username} 
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <span className="font-bold text-lg text-slate-50">{reply.displayname || reply.username}</span>
                    <span className="text-xs text-slate-400 ml-2">@{reply.username}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-600">in {reply.guildname} at {new Date(reply.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-sm text-slate-400 border-l-2 border-slate-700 pl-3 italic">
                  <span className="font-medium text-slate-300 block mb-1">User Message:</span>
                  "{reply.usermessage}"
                </div>
                <div className="text-sm text-indigo-300 border-l-2 border-indigo-700 pl-3">
                  <span className="font-medium text-indigo-300 block mb-1">Bot Reply:</span>
                  {reply.botreply}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LatestReplies;