import { useState, useCallback } from 'react';
import { chatApi, botInfoApi } from '../services/api';

export function useChat(initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [botName, setBotName] = useState('Bot');

  const fetchBotName = useCallback(async () => {
    try {
      const response = await botInfoApi.getBotInfo();
      setBotName(response.data.clientId ? 'DiscordLLMBot' : 'Bot');
    } catch {
      setBotName('Bot');
    }
  }, []);

  const sendMessage = useCallback(async (message, username = 'You', guildName = 'Playground Server') => {
    if (!message.trim() || isLoading) return null;

    setIsLoading(true);
    setError(null);

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      username,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      await fetchBotName();
      
      const response = await chatApi.sendMessage(message, username, guildName);

      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.reply,
        timestamp: response.data.timestamp,
        username: botName,
        usage: response.data.usage,
      };

      setMessages((prev) => [...prev, botMsg]);
      return botMsg;
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'system',
        content: 'Error: Failed to get response from bot.',
        timestamp: new Date().toISOString(),
        username: 'System',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError('Failed to get response from bot. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, botName, fetchBotName]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return { 
    messages, 
    isLoading, 
    error, 
    botName,
    sendMessage, 
    clearChat, 
    addMessage,
    setMessages 
  };
}
