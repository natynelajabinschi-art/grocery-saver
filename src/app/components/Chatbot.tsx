// components/Chatbot.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, CheckCircle, X } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatbotProps {
  onCompare?: (items: string[]) => void;
}

export default function Chatbot({ onCompare }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: '👋 Bonjour! Je suis votre assistant SmartShopper. Dites-moi quels produits vous souhaitez comparer entre IGA et Metro.\n\nExemple: "lait, œufs, pain, fromage"',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || loading) return;

    // Ajouter le message utilisateur
    const userMessage: Message = {
      sender: 'user',
      text: trimmed,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Extraire les produits
    const newProducts = trimmed
      .split(/[,;]/)
      .map(p => p.trim())
      .filter(Boolean);
    
    const allItems = [...items, ...newProducts];
    setItems(allItems);

    // Message de chargement
    const loadingMessage: Message = {
      sender: 'bot',
      text: '🔍 Analyse en cours... Je compare les prix pour vous.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, loadingMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems }),
      });

      const data = await response.json();
      setLoading(false);

      // Retirer le message de chargement
      setMessages(prev => prev.slice(0, -1));

      if (!data.success) {
        const errorMessage: Message = {
          sender: 'bot',
          text: "❌ Désolé, je n'ai pas pu comparer les produits. Veuillez réessayer.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Message de résumé
      const summary = `📊 **Résultat de la comparaison**

🏪 **Meilleur choix:** ${data.summary.bestStore}
💰 **Économie potentielle:** ${data.summary.savings.toFixed(2)}$

**Prix totaux:**
• IGA: ${data.summary.totalIga.toFixed(2)}$
• Metro: ${data.summary.totalMetro.toFixed(2)}$

📦 Produits trouvés: ${data.summary.productsFound}/${data.summary.totalProducts}`;

      const summaryMessage: Message = {
        sender: 'bot',
        text: summary,
        timestamp: new Date()
      };

      // Message d'analyse IA
      const analysisMessage: Message = {
        sender: 'bot',
        text: data.analysis,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, summaryMessage, analysisMessage]);

      // Callback optionnel
      if (onCompare) {
        onCompare(allItems);
      }

    } catch (error) {
      setLoading(false);
      setMessages(prev => prev.slice(0, -1));
      
      const errorMessage: Message = {
        sender: 'bot',
        text: "⚠️ Erreur de connexion. Vérifiez votre connexion internet et réessayez.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card shadow-lg border-0" style={{ height: '40rem', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="card-header bg-dark text-white py-3">
        <div className="d-flex align-items-center">
          <Bot size={24} className="me-2" />
          <h5 className="mb-0 fw-bold">Assistant SmartShopper</h5>
          <span className="badge bg-success ms-auto">En ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div className="card-body overflow-auto flex-grow-1 p-3" style={{ backgroundColor: '#f8f9fa' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
          >
            <div
              className={`rounded-3 p-3 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-white text-dark'
              }`}
              style={{ maxWidth: '75%' }}
            >
              <div className="d-flex align-items-center mb-2">
                {msg.sender === 'bot' ? (
                  <Bot size={16} className="me-2 text-primary" />
                ) : (
                  <User size={16} className="me-2" />
                )}
                <small className="fw-bold">
                  {msg.sender === 'bot' ? 'SmartShopper' : 'Vous'}
                </small>
                <small className="ms-auto opacity-75" style={{ fontSize: '0.7rem' }}>
                  {msg.timestamp.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
              <div style={{ whiteSpace: 'pre-line', fontSize: '0.95rem' }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Liste des produits ajoutés */}
      {items.length > 0 && (
        <div className="px-3 py-2 bg-light border-top">
          <small className="text-muted d-block mb-2">📦 Produits à comparer:</small>
          <div className="d-flex flex-wrap gap-2">
            {items.map((item, i) => (
              <span
                key={i}
                className="badge bg-success d-flex align-items-center gap-1"
                style={{ fontSize: '0.85rem' }}
              >
                <CheckCircle size={12} />
                {item}
                <button
                  onClick={() => removeItem(i)}
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.6rem', marginLeft: '4px' }}
                  aria-label="Retirer"
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Input Zone */}
      <div className="card-footer bg-white border-top p-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control border-2"
            placeholder="Ex: lait, œufs, pain..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button
            className="btn btn-primary px-4"
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
          >
            {loading ? (
              <Loader2 size={20} className="spinner-border spinner-border-sm" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <small className="text-muted d-block mt-2">
          💡 Séparez les produits par des virgules
        </small>
      </div>
    </div>
  );
}