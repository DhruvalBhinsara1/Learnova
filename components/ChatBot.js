"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Code, 
  Compass,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Bot
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const LearnovaChatbot = () => {
  // --- State Management ---
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am **Learnova AI**, your dedicated learning companion. Select a category below or ask me anything to get started!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("general");
  const [activeTab, setActiveTab] = useState("all");
  const [hasApiKey, setHasApiKey] = useState(true);

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // --- Static Configuration ---
  const categories = [
    { id: "all", label: "General", icon: MessageSquare },
    { id: "academics", label: "Academics", icon: GraduationCap },
    { id: "coding", label: "Coding Help", icon: Code },
    { id: "career", label: "Career Guidance", icon: Compass }
  ];

  const fallbackResponses = {
    academics: "To understand complex academic topics, it's best to break them down into foundational principles. Could you specify which subject or concept you're analyzing?",
    coding: "When debugging code, always start by isolating the error message and verifying your environment variables. What language or framework are we working with?",
    career: "Navigating your career path involves mapping your technical skills against current market demands. Are you looking to explore industry trends, resume building, or interview prep?",
    all: "I'm here to assist with any questions you have. Could you provide a bit more detail or context so I can give you a precise answer?"
  };

  // --- Auto-scroll to Latest Message ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // --- API Configuration Check on Mount ---
  useEffect(() => {
    let isMounted = true;

    fetch("/api/check-groq-config")
      .then((res) => {
        if (!res.ok) throw new Error("Validation check failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) setHasApiKey(!!data.hasKey);
      })
      .catch(() => {
        if (isMounted) setHasApiKey(false); // Fallback gracefully to client handling if route is missing
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Dynamic Textarea Height Adjuster ---
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // --- Message Processing & API Interaction ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userQuery = inputMessage.trim();
    setInputMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Append User Message Locally
    const updatedMessages = [...messages, { role: "user", content: userQuery }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          category: activeTab
        })
      });

      if (!response.ok) throw new Error("Network response encountered an error");
      
      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.choices[0].message.content }
      ]);

      // Background tracking sync
      saveToMongoDB(userQuery, data.choices[0].message.content);

    } catch (error) {
      console.error("Chat Error:", error);
      
      // Client-side fallback response generation
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { 
            role: "assistant", 
            content: `**System Note:** I'm currently running in offline simulation mode. \n\n${fallbackResponses[activeTab]}` 
          }
        ]);
        setIsLoading(false);
      }, 800);
      return;
    }

    setIsLoading(false);
  };

  // --- Helper: MongoDB Synchronization ---
  const saveToMongoDB = async (userMessage, botMessage) => {
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: userMessage,
          botReply: botMessage,
          timestamp: new Date(),
          categoryTag: activeTab
        })
      });
    } catch (err) {
      console.warn("Database sync deferred:", err.message);
    }
  };

  // --- Render Layout ---
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-slate-50 border-x border-slate-200 shadow-sm">
      
      {/* Header Panel */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Learnova AI</h1>
            <p className="text-xs text-slate-500 font-medium">Next-Gen Learning Assistant</p>
          </div>
        </div>
        
        {/* Environment Banner */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
          {hasApiKey ? (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={13} /> Live Engine
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              <AlertCircle size={13} /> Sandbox Mode
            </span>
          )}
        </div>
      </header>

      {/* Category Selection Tabs */}
      <nav className="flex items-center gap-2 px-6 py-3 bg-white border-b border-slate-100 overflow-x-auto">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isSelected = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isSelected 
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <IconComponent size={15} className={isSelected ? "text-indigo-600" : "text-slate-400"} />
              {cat.label}
            </button>
          );
        })}
      </nav>

      {/* Main Message Interface */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div key={index} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              <div className={`p-2 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                isUser ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-indigo-600"
              }`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`px-4 py-3 rounded-2xl shadow-xs text-sm leading-relaxed ${
                isUser 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none prose prose-slate max-w-none"
              }`}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Visual Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="p-2 h-9 w-9 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center animate-pulse">
              <Bot size={16} />
            </div>
<div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Form Panel */}
      <footer className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={`Ask a question in ${categories.find(c => c.id === activeTab)?.label}...`}
            className="flex-1 bg-transparent border-0 outline-none resize-none max-h-32 text-sm text-slate-800 pl-2 py-1.5 placeholder-slate-400 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`p-2.5 rounded-lg transition-all ${
              inputMessage.trim() && !isLoading
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
          Powered by Groq Cloud API Engine • Shift + Enter for new lines
        </p>
      </footer>

    </div>
  );
};

export default LearnovaChatbot;
