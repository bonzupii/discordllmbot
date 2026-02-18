/**
 * Hook for the chat playground
 * @module hooks/useChat
 */

import { useState, useCallback } from 'react';
import { chatApi, botInfoApi } from '@services';
import { getCurrentTimestamp } from '@utils';
import type { ChatMessage } from '@types';

/**
 * Hook for chat playground functionality
 * Allows testing bot responses without affecting Discord
 * @param initialMessages - Starting messages
 */
export function useChat(initialMessages: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botName, setBotName] = useState('Bot');

  /**
   * Fetch bot name from API
   */
  const fetchBotName = useCallback(async () => {
    try {
      const response = await botInfoApi.getBotInfo();
      setBotName(response.data.clientId ? 'DiscordLLMBot' : 'Bot');
    } catch {
      setBotName('Bot');
    }
  }, []);

  /**
   * Send message to bot and get response
   * @param message - User message content
   * @param username - Display name for user
   * @param guildName - Simulated server name
   * @returns The bot's response message
   */
  const sendMessage = useCallback(async (
    message: string,
    username = 'You',
    guildName = 'Playground Server'
  ): Promise<ChatMessage | null> => {
    if (!message.trim() || isLoading) return null;

    setIsLoading(true);
    setError(null);

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: getCurrentTimestamp(),
      username,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      await fetchBotName();

      const response = await chatApi.sendMessage(message, username, guildName);

      // Add bot response to chat
      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.reply,
        timestamp: response.data.timestamp,
        username: botName,
        usage: response.data.usage,
      };

      setMessages((prev) => [...prev, botMsg]);
      return botMsg;
    } catch {
      // Add error message
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'system',
        content: 'Error: Failed to get response from bot.',
        timestamp: getCurrentTimestamp(),
        username: 'System',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError('Failed to get response from bot. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, botName, fetchBotName]);

  /**
   * Clear all messages
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Manually add a message
   * @param message - Message to add
   */
  const addMessage = useCallback((message: ChatMessage) => {
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
