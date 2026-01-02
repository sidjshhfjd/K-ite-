import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Chat, GenerateContentResponse, Content, Part } from "@google/genai";
import { Message, Sender, ModelId, Attachment, ChatSession } from '../types';
import { createChatSession, generateImage } from '../services/gemini';

const getFriendlyErrorMessage = (error: any): string => {
    const errString = JSON.stringify(error);
    if (
        error?.status === 429 || 
        error?.code === 429 || 
        errString.includes('429') || 
        errString.includes('RESOURCE_EXHAUSTED') ||
        errString.includes('quota')
    ) {
        return 'Hệ thống đang bận hoặc đã hết hạn mức sử dụng miễn phí (429 Resource Exhausted). Vui lòng thử lại sau ít phút.';
    }
    return 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.';
};

export const useChat = (userEmail: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelId>('gemini-3-flash-preview');
  
  const chatSessionRef = useRef<Chat | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startNewChat = useCallback((shouldClearMessages = true) => {
    setCurrentSessionId(null); // Reset session ID

    if (shouldClearMessages) {
        setMessages([]); // Start with empty messages (No welcome message)
    }
    
    // Reset Gemini Chat instance
    chatSessionRef.current = null;
    abortControllerRef.current = null;
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // Important: Do NOT set to null here immediately. 
      // Let the sendMessage function handle the cleanup or checking.
    }
    setIsLoading(false);
  }, []);

  // Load sessions from local storage when user logs in
  useEffect(() => {
    if (userEmail) {
      const stored = localStorage.getItem(`kite_sessions_${userEmail}`);
      if (stored) {
        try {
          const parsedSessions = JSON.parse(stored).map((s: any) => ({
            ...s,
            messages: s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          }));
          // Sort by newest first
          parsedSessions.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
          setSessions(parsedSessions);
          
          // Start fresh AND clear previous messages to prevent data leak between accounts
          startNewChat(true);
        } catch (e) {
          console.error("Failed to parse sessions", e);
          startNewChat(true);
        }
      } else {
        setSessions([]); // Clear sessions if new user has none
        startNewChat(true);
      }
    } else {
        setSessions([]); // Clear sessions on logout
        setMessages([]); // Clear messages on logout
        setCurrentSessionId(null);
    }
  }, [userEmail, startNewChat]);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    if (userEmail) {
      localStorage.setItem(`kite_sessions_${userEmail}`, JSON.stringify(sessions));
    }
  }, [sessions, userEmail]);

  // Sync current messages to the active session in the sessions list
  useEffect(() => {
    // Only update if we have a valid Session ID
    if (currentSessionId && messages.length > 0) {
      setSessions(prev => {
        const existingSessionIndex = prev.findIndex(s => s.id === currentSessionId);
        if (existingSessionIndex === -1) return prev;

        const currentSession = prev[existingSessionIndex];
        const lastSessionMsg = currentSession.messages[currentSession.messages.length - 1];
        const lastMsg = messages[messages.length - 1];

        // Optimization: Prevent unnecessary updates, BUT check text content to capture streaming
        if (currentSession.messages.length === messages.length && 
            lastSessionMsg && lastMsg &&
            lastSessionMsg.id === lastMsg.id &&
            lastSessionMsg.text === lastMsg.text && // Vital: Check if text changed
            lastSessionMsg.isError === lastMsg.isError &&
            lastSessionMsg.attachment === lastMsg.attachment
        ) {
            return prev;
        }

        const updatedSessions = [...prev];
        let title = currentSession.title;
        
        // Auto-generate title from first user message if it's currently default
        if (title === 'Cuộc trò chuyện mới' && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.sender === Sender.User);
            if (firstUserMsg) {
                title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
            }
        }

        updatedSessions[existingSessionIndex] = {
            ...currentSession,
            messages: messages,
            title: title,
            updatedAt: Date.now()
        };

        // Re-sort by updated time
        return updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      });
    }
  }, [messages, currentSessionId]);

  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        setCurrentSessionId(session.id);
        setMessages(session.messages);
        chatSessionRef.current = null; 
    }
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSessions(prev => {
        const newSessions = prev.filter(s => s.id !== sessionId);
        return newSessions;
    });

    // If we deleted the current session being viewed, reset to a new chat
    if (sessionId === currentSessionId) {
        startNewChat();
    }
  }, [currentSessionId, startNewChat]);

  const clearAllSessions = useCallback(() => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat không? Hành động này không thể hoàn tác.')) {
        setSessions([]);
        startNewChat();
    }
  }, [startNewChat]);

  // Initialize Chat Session (Gemini)
  useEffect(() => {
    const history: Content[] = messages
      .filter(m => !m.isError && (m.text.trim() !== '' || m.attachment))
      .map(m => {
        const parts: Part[] = [];
        if (m.attachment) {
            parts.push({ inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.data } });
        }
        if (m.text) {
            parts.push({ text: m.text });
        }
        return {
            role: m.sender === Sender.User ? 'user' : 'model',
            parts: parts
        };
      });

    chatSessionRef.current = createChatSession(currentModel, history);
  }, [currentModel, currentSessionId]); 

  // Helper for image generation inside the hook
  const handleImageGeneration = async (prompt: string, botMsgId: string, controller: AbortController) => {
     try {
        const response = await generateImage(prompt);
        // Strict check: if aborted, stop immediately
        if (controller.signal.aborted) return;

        let generatedAttachment: Attachment | undefined;
        let generatedText = '';

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    generatedAttachment = {
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data
                    };
                } else if (part.text) {
                    generatedText += part.text;
                }
            }
        }

        if (controller.signal.aborted) return;

        setMessages((prev) => {
             return prev.map(msg => {
                if (msg.id === botMsgId) {
                    if (generatedAttachment) {
                        return {
                            ...msg,
                            text: generatedText || 'Đây là hình ảnh mình vừa tạo theo yêu cầu của bạn:',
                            attachment: generatedAttachment
                        };
                    } else {
                         return {
                            ...msg,
                            text: 'Xin lỗi, mình không thể tạo hình ảnh lúc này.',
                            isError: true
                        };
                    }
                }
                return msg;
             });
        });
     } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error("Image Gen Error", err);
        setMessages((prev) => prev.map(msg => 
            msg.id === botMsgId ? { ...msg, text: getFriendlyErrorMessage(err), isError: true } : msg
        ));
     }
  };

  const sendMessage = useCallback(async (text: string, attachment?: Attachment, isImageGen?: boolean) => {
    if (!text.trim() && !attachment) return;

    // 0. Setup AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 1. Prepare User Message
    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      sender: Sender.User,
      text: text,
      attachment: attachment,
      timestamp: new Date(),
    };

    // 2. Logic for New Session vs Existing Session
    let activeSessionId = currentSessionId;

    if (!activeSessionId) {
        activeSessionId = Date.now().toString();
        setCurrentSessionId(activeSessionId);

        const newSession: ChatSession = {
            id: activeSessionId,
            title: text.slice(0, 30) || 'Cuộc trò chuyện mới',
            messages: [...messages, userMessage], 
            updatedAt: Date.now()
        };
        
        setSessions(prev => [newSession, ...prev]);
    }

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        sender: Sender.Model,
        text: isImageGen ? 'Đang vẽ hình...' : '', 
        timestamp: new Date(),
      },
    ]);

    try {
      if (isImageGen) {
        await handleImageGeneration(text, botMsgId, controller);
      } else {
        if (!chatSessionRef.current) {
            chatSessionRef.current = createChatSession(currentModel);
        }

        const parts: Part[] = [];
        if (attachment) {
            parts.push({
                inlineData: {
                    mimeType: attachment.mimeType,
                    data: attachment.data
                }
            });
        }
        if (text) parts.push({ text: text });

        const result = await chatSessionRef.current.sendMessageStream({ message: parts });

        let isFunctionCallDetected = false;

        for await (const chunk of result) {
            // CRITICAL: Check the LOCAL controller instance
            if (controller.signal.aborted) {
                break;
            }

            const functionCalls = chunk.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                if (call.name === 'generate_image') {
                    isFunctionCallDetected = true;
                    const prompt = (call.args as any).prompt || text;
                    setMessages((prev) => prev.map(msg => 
                        msg.id === botMsgId ? { ...msg, text: "Đang tạo hình ảnh tự động..." } : msg
                    ));
                    await handleImageGeneration(prompt, botMsgId, controller);
                    break; 
                }
            }

            if (!isFunctionCallDetected) {
                const c = chunk as GenerateContentResponse;
                const chunkText = c.text || '';
                
                if (chunkText) {
                    setMessages((prev) => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg.id === botMsgId) {
                            return [
                                ...prev.slice(0, -1),
                                { ...lastMsg, text: lastMsg.text + chunkText }
                            ];
                        }
                        return prev;
                    });
                }
            }
        }
      }

    } catch (error: any) {
      // If aborted, do nothing, just exit
      if (controller.signal.aborted || error.name === 'AbortError') {
          console.log("Generation stopped by user");
          return;
      }

      console.error("AI Error:", error);
      
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: Sender.Model,
          text: getFriendlyErrorMessage(error),
          timestamp: new Date(),
          isError: true,
        },
      ]);
      chatSessionRef.current = createChatSession(currentModel);
    } finally {
      // Cleanup: Only clear if this is still the active controller
      if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsLoading(false);
      }
    }
  }, [currentModel, currentSessionId, messages, startNewChat]);

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    currentModel,
    setCurrentModel,
    sessions,
    currentSessionId,
    startNewChat,
    loadSession,
    deleteSession,
    clearAllSessions
  };
};