// app/page.tsx - DESIGN GLASSMORPHIQUE INSPIRÉ DE CODEPEN
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, ShoppingCart, Bot, User, Loader2, CheckCircle } from 'lucide-react';

export default function SmartShopperChat() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Ajout message utilisateur
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setInputValue('');
    const products = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    setItems(prev => [...prev, ...products]);

    // Message "chargement"
    setMessages(prev => [...prev, { sender: 'bot', text: 'Analyse en cours...' }]);
    setLoading(true);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [...items, ...products] }),
      });

      const data = await response.json();
      setLoading(false);

      if (!data.success) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { sender: 'bot', text: "❌ Impossible de comparer les produits." }
        ]);
        return;
      }

      const summary = `🧾 Résumé : 
Meilleur choix : ${data.summary.bestStore}
Économie : ${data.summary.savings.toFixed(2)}$
Prix IGA : ${data.summary.totalIga.toFixed(2)}$
Prix Metro : ${data.summary.totalMetro.toFixed(2)}$`;

      setMessages(prev => [
        ...prev.slice(0, -1),
        { sender: 'bot', text: summary },
        { sender: 'bot', text: data.analysis }
      ]);
    } catch {
      setLoading(false);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { sender: 'bot', text: "⚠️ Erreur de connexion au serveur." }
      ]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-600/60 via-indigo-600/50 to-pink-500/40 backdrop-blur-3xl relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent)]" />
      
      {/* Header */}
      <header className="py-6 text-center relative z-10">
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 shadow-lg">
          <ShoppingCart className="text-white" size={28} />
          <h1 className="text-3xl font-bold text-white tracking-tight">SmartShopper Chat</h1>
        </div>
        <p className="text-white/70 mt-2">Discutez avec votre assistant IA pour comparer les prix 🛒</p>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 space-y-4 relative z-10">
        {messages.length === 0 && (
          <div className="text-center text-white/70 mt-20">
            💬 Dites-moi les produits que vous souhaitez comparer (ex: lait, œufs, pain)
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl shadow-md text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-white/20 text-white backdrop-blur-lg'
                  : 'bg-white/90 text-gray-900 backdrop-blur-lg'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.sender === 'bot' ? (
                  <Bot className="text-purple-500" size={16} />
                ) : (
                  <User className="text-pink-300" size={16} />
                )}
                <span className="font-semibold text-xs opacity-70">
                  {msg.sender === 'bot' ? 'SmartShopper' : 'Vous'}
                </span>
              </div>
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* Liste des produits ajoutés */}
      {items.length > 0 && (
        <div className="mx-auto mb-2 flex flex-wrap gap-2 justify-center">
          {items.map((p, i) => (
            <span key={i} className="bg-white/10 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <CheckCircle size={12} className="text-green-300" /> {p}
            </span>
          ))}
        </div>
      )}

      {/* Input Zone */}
      <div className="p-4 bg-white/10 backdrop-blur-xl border-t border-white/20 relative z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            type="text"
            placeholder="Ex: lait, œufs, pain..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-white/70 text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
