import { useState, useEffect } from 'react'
import axios from 'axios'

function Settings() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [models, setModels] = useState([])

  useEffect(() => {
    fetchConfig()
    fetchModels()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/config')
      setConfig(res.data)
    } catch (err) {
      console.error('Failed to fetch config', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchModels = async () => {
    try {
      const res = await axios.get('/api/models')
      setModels(res.data)
    } catch (err) {
      console.error('Failed to fetch models', err)
      // Fallback if API fails
      setModels(['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await axios.post('/api/config', config)
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Failed to save config', err)
      setMessage('Error saving settings.')
    } finally {
      setSaving(false)
    }
  }

  const updateBotField = (field, value) => {
    setConfig({
      ...config,
      bot: {
        ...config.bot,
        [field]: value
      }
    })
  }

  const updateApiField = (field, value) => {
    setConfig({
      ...config,
      api: {
        ...config.api,
        [field]: value
      }
    })
  }

  const updateMemoryField = (field, value) => {
    setConfig({
      ...config,
      memory: {
        ...config.memory,
        [field]: value
      }
    })
  }

  const updateLoggerField = (field, value) => {
    setConfig({
      ...config,
      logger: {
        ...config.logger,
        [field]: value
      }
    })
  }

  const updateReplyField = (field, value) => {
    setConfig({
      ...config,
      replyBehavior: {
        ...config.replyBehavior,
        [field]: value
      }
    })
  }

  const handleArrayChange = (section, field, index, value) => {
    const newArray = [...config[section][field]]
    newArray[index] = value
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: newArray
      }
    })
  }

  const addArrayItem = (section, field) => {
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: [...config[section][field], '']
      }
    })
  }

  const removeArrayItem = (section, field, index) => {
    const newArray = config[section][field].filter((_, i) => i !== index)
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: newArray
      }
    })
  }

  if (loading) return <div className="text-slate-500">Loading configuration...</div>
  if (!config) return <div className="text-red-500">Error loading configuration.</div>

  return (
    <div className="w-full max-w-4xl space-y-8 pb-12">
      {/* Bot Persona */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 border-b border-slate-800 pb-2 text-indigo-400 flex items-center">
          <span className="mr-2">👤</span> Bot Persona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={config.bot.name}
                onChange={(e) => updateBotField('name', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={config.bot.username}
                onChange={(e) => updateBotField('username', e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
              <textarea
                value={config.bot.description}
                onChange={(e) => updateBotField('description', e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Speaking Style</label>
              <div className="space-y-2">
                {config.bot.speakingStyle.map((style, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={style}
                      onChange={(e) => handleArrayChange('bot', 'speakingStyle', index, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button onClick={() => removeArrayItem('bot', 'speakingStyle', index)} className="text-red-400 hover:text-red-300 px-2">×</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('bot', 'speakingStyle')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Add Style</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LLM & Memory */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 border-b border-slate-800 pb-2 text-indigo-400 flex items-center">
          <span className="mr-2">🧠</span> LLM & Memory
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Gemini Model</label>
            <select
              value={config.api?.geminiModel || 'gemini-2.0-flash'}
              onChange={(e) => updateApiField('geminiModel', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Context Window (Messages)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.memory?.maxMessages || 25}
              onChange={(e) => updateMemoryField('maxMessages', parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Retention (Days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={config.memory?.maxMessageAgeDays || 30}
              onChange={(e) => updateMemoryField('maxMessageAgeDays', parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Global Rules */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 border-b border-slate-800 pb-2 text-indigo-400 flex items-center">
          <span className="mr-2">📜</span> Global Rules
        </h2>
        <div className="space-y-2">
          {config.bot?.globalRules?.map((rule, index) => (
            <div key={index} className="flex space-x-2">
              <input
                type="text"
                value={rule}
                onChange={(e) => handleArrayChange('bot', 'globalRules', index, e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                placeholder="Enter a global rule..."
              />
              <button onClick={() => removeArrayItem('bot', 'globalRules', index)} className="text-red-400 hover:text-red-300 px-2">×</button>
            </div>
          ))}
          <button onClick={() => addArrayItem('bot', 'globalRules')} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">+ Add Rule</button>
        </div>
      </div>

      {/* Reply Behavior */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 border-b border-slate-800 pb-2 text-indigo-400 flex items-center">
          <span className="mr-2">🤖</span> Reply Behavior
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Mode</label>
            <select
              value={config.replyBehavior.mode}
              onChange={(e) => updateReplyField('mode', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="mention-only">Mention Only</option>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Reply Probability</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.replyBehavior.replyProbability}
              onChange={(e) => updateReplyField('replyProbability', parseFloat(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.replyBehavior.requireMention}
                onChange={(e) => updateReplyField('requireMention', e.target.checked)}
                className="w-4 h-4 bg-slate-950 border-slate-700 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-slate-400">Require Mention</span>
            </label>
          </div>
        </div>

        {/* Response Timing */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-lg font-medium text-slate-300 mb-4">Response Timing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Min Delay (ms)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={config.replyBehavior.minDelayMs || 500}
                onChange={(e) => updateReplyField('minDelayMs', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Max Delay (ms)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={config.replyBehavior.maxDelayMs || 3000}
                onChange={(e) => updateReplyField('maxDelayMs', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Ignore Lists */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-lg font-medium text-slate-300 mb-4">Ignore Lists</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Ignored Channels</label>
              <div className="space-y-2">
                {config.replyBehavior.ignoreChannels?.map((channel, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={channel}
                      onChange={(e) => handleArrayChange('replyBehavior', 'ignoreChannels', index, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="Channel ID"
                    />
                    <button onClick={() => removeArrayItem('replyBehavior', 'ignoreChannels', index)} className="text-red-400 hover:text-red-300 px-2">×</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('replyBehavior', 'ignoreChannels')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Add Channel</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Ignored Users</label>
              <div className="space-y-2">
                {config.replyBehavior.ignoreUsers?.map((user, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={user}
                      onChange={(e) => handleArrayChange('replyBehavior', 'ignoreUsers', index, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="User ID"
                    />
                    <button onClick={() => removeArrayItem('replyBehavior', 'ignoreUsers', index)} className="text-red-400 hover:text-red-300 px-2">×</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('replyBehavior', 'ignoreUsers')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Add User</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Ignored Keywords</label>
              <div className="space-y-2">
                {config.replyBehavior.ignoreKeywords?.map((keyword, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => handleArrayChange('replyBehavior', 'ignoreKeywords', index, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="Keyword"
                    />
                    <button onClick={() => removeArrayItem('replyBehavior', 'ignoreKeywords', index)} className="text-red-400 hover:text-red-300 px-2">×</button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('replyBehavior', 'ignoreKeywords')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Add Keyword</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logging & Debugging */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-semibold mb-6 border-b border-slate-800 pb-2 text-indigo-400 flex items-center">
          <span className="mr-2">🐛</span> Logging & Debugging
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.logger?.logReplyDecisions || false}
                onChange={(e) => updateLoggerField('logReplyDecisions', e.target.checked)}
                className="w-4 h-4 bg-slate-950 border-slate-700 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-slate-400">Log Reply Decisions</span>
            </label>
          </div>
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.logger?.logSql || false}
                onChange={(e) => updateLoggerField('logSql', e.target.checked)}
                className="w-4 h-4 bg-slate-950 border-slate-700 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm font-medium text-slate-400">Log SQL Queries</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Bar */}
      <div className="sticky bottom-8 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-8 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 ${
              saving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
          {message && (
            <span className={`text-sm font-medium animate-in fade-in slide-in-from-left-2 ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </span>
          )}
        </div>
        <button 
          onClick={fetchConfig}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Discard Changes
        </button>
      </div>
    </div>
  )
}

export default Settings
