// components/Chatbot.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, CheckCircle, X, Mic, MicOff, Download, Trash2 } from 'lucide-react';

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
      text: `🛒 Bienvenue sur SmartShopper ! 

Je vous aide à comparer les prix entre IGA et Metro.

🎯 Comment utiliser :
• Listez vos produits (ex: "lait, œufs, pain")
• Je trouve les meilleurs prix automatiquement
• Obtenez des conseils personnalisés

💡 Exemples :
"Je veux faire un gâteau au chocolat"
"Comparer les prix des fruits et légumes"
"Qu'est-ce qui est moins cher cette semaine ?"`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions] = useState<string[]>([
    "lait, œufs, pain",
    "poulet, riz, légumes",
    "café, sucre, farine",
    "pâtes, sauce tomate, fromage"
  ]);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistance de l'historique
  useEffect(() => {
    const savedMessages = localStorage.getItem('smartshopper-chat-history');
    const savedShoppingList = localStorage.getItem('smartshopper-shopping-list');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
    if (savedShoppingList) {
      setShoppingList(JSON.parse(savedShoppingList));
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('smartshopper-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('smartshopper-shopping-list', JSON.stringify(shoppingList));
  }, [shoppingList]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addToShoppingList = (newItems: string[]) => {
    setShoppingList(prev => {
      const updated = [...prev, ...newItems.filter(item => !prev.includes(item))];
      return updated;
    });
  };

  const removeFromShoppingList = (index: number) => {
    setShoppingList(prev => prev.filter((_, i) => i !== index));
  };

  const clearShoppingList = () => {
    setShoppingList([]);
  };

  const exportShoppingList = () => {
    const content = `🛒 Liste de courses SmartShopper\n\n${shoppingList.map(item => `☐ ${item}`).join('\n')}\n\n📅 Générée le ${new Date().toLocaleDateString('fr-FR')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-courses-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      setIsListening(true);
    } else {
      const errorMsg: Message = {
        sender: 'bot',
        text: "❌ La reconnaissance vocale n'est pas supportée par votre navigateur.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
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
    addToShoppingList(newProducts);

    // Simuler l'écriture du bot
    setIsTyping(true);
    
    // Message de chargement
    const loadingMessage: Message = {
      sender: 'bot',
      text: '🔍 Analyse en cours... Je compare les prix pour vous.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, loadingMessage]);

    setLoading(true);

    try {
      // Simulation de délai pour l'effet "typing"
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsTyping(false);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: allItems }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setLoading(false);

      // Retirer le message de chargement
      setMessages(prev => prev.slice(0, -1));

      if (!data.success) {
        const errorMessage: Message = {
          sender: 'bot',
          text: "❌ Désolé, je n'ai pas pu comparer les produits. Veuillez réessayer avec des noms plus génériques.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Afficher les résultats avec composant structuré
      const resultsMessage: Message = {
        sender: 'bot',
        text: `📊 Comparaison des prix

${data.summary.bestStore} est le plus avantageux pour vos ${allItems.length} produits.

${renderPriceComparison(data)}`,
        timestamp: new Date()
      };

      // Message d'analyse IA
      const analysisMessage: Message = {
        sender: 'bot',
        text: data.analysis || "💡 Conseil : Pensez à vérifier les dates de péremption et les promotions en magasin pour optimiser davantage vos économies !",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, resultsMessage, analysisMessage]);

      // Callback optionnel
      if (onCompare) {
        onCompare(allItems);
      }

    } catch (error: any) {
      setLoading(false);
      setIsTyping(false);
      setMessages(prev => prev.slice(0, -1));
      
      let errorMessage = "⚠️ Erreur de connexion. Vérifiez votre connexion internet et réessayez.";
      
      if (error.name === 'AbortError') {
        errorMessage = "⏱️ La requête a pris trop de temps. Veuillez réessayer avec moins de produits.";
      } else if (error.message.includes('500')) {
        errorMessage = "🔧 Service temporairement indisponible. Réessayez dans quelques minutes.";
      } else if (error.message.includes('404')) {
        errorMessage = "🔍 Service de comparaison non disponible. Contactez le support.";
      }

      const errorMsg: Message = {
        sender: 'bot',
        text: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const renderPriceComparison = (data: any) => {
    return `🏪 IGA : ${data.summary.totalIga?.toFixed(2) || '0.00'}$
🏪 Metro : ${data.summary.totalMetro?.toFixed(2) || '0.00'}$
💰 Économie : ${data.summary.savings?.toFixed(2) || '0.00'}$
📦 Produits trouvés : ${data.summary.productsFound || 0}/${data.summary.totalProducts || 0}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  return (
    <div className="card shadow-lg border-0" style={{ height: '45rem', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="card-header bg-success text-white py-3">
        <div className="d-flex align-items-center">
          <Bot size={24} className="me-2" />
          <h5 className="mb-0 fw-bold">Assistant SmartShopper</h5>
          <span className="badge bg-light text-success ms-auto">
            {isTyping ? '✍️ En train d\'écrire...' : '🟢 En ligne'}
          </span>
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
                  : 'bg-white text-dark border'
              }`}
              style={{ maxWidth: '85%' }}
            >
              <div className="d-flex align-items-center mb-2">
                {msg.sender === 'bot' ? (
                  <Bot size={16} className="me-2 text-success" />
                ) : (
                  <User size={16} className="me-2 text-white" />
                )}
                <small className="fw-bold">
                  {msg.sender === 'bot' ? 'SmartShopper' : 'Vous'}
                </small>
                <small className="ms-auto opacity-75" style={{ fontSize: '0.7rem' }}>
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
              <div style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: '1.4' }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="d-flex justify-content-start mb-3">
            <div className="bg-white rounded-3 p-3 shadow-sm border">
              <div className="d-flex align-items-center">
                <Bot size={16} className="me-2 text-success" />
                <small className="fw-bold">SmartShopper</small>
              </div>
              <div className="typing-dots mt-2">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
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

      {/* Liste de courses persistante */}
      {shoppingList.length > 0 && (
        <div className="px-3 py-2 bg-warning bg-opacity-10 border-top">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted fw-bold">🛒 Liste de courses:</small>
            <div>
              <button
                className="btn btn-sm btn-outline-success me-1"
                onClick={exportShoppingList}
                title="Télécharger la liste"
              >
                <Download size={14} />
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={clearShoppingList}
                title="Vider la liste"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {shoppingList.map((item, i) => (
              <span
                key={i}
                className="badge bg-warning text-dark d-flex align-items-center gap-1"
                style={{ fontSize: '0.85rem' }}
              >
                ☐ {item}
                <button
                  onClick={() => removeFromShoppingList(i)}
                  className="btn-close"
                  style={{ fontSize: '0.6rem', marginLeft: '4px' }}
                  aria-label="Retirer"
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="px-3 py-2 bg-light border-top">
        <Suggestions 
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>

      {/* Input Zone */}
      <div className="card-footer bg-white border-top p-3">
        <div className="input-group">
          <button
            className="btn btn-outline-secondary"
            onClick={startListening}
            disabled={isListening}
            type="button"
            title="Parler"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            type="text"
            className="form-control border-2"
            placeholder="Ex: lait, œufs, pain... ou parlez-moi de vos courses"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button
            className="btn btn-success px-4"
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
          💡 Appuyez sur Entrée pour envoyer • Cliquez sur 🎤 pour parler
        </small>
      </div>

      {/* Styles pour l'animation de typing */}
      <style jsx>{`
        .typing-dots {
          display: inline-flex;
          gap: 4px;
        }
        .typing-dots span {
          height: 8px;
          width: 8px;
          background-color: #6c757d;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Composant Suggestions séparé
const Suggestions = ({ suggestions, onSuggestionClick }: { suggestions: string[], onSuggestionClick: (suggestion: string) => void }) => (
  <div>
    <small className="text-muted d-block mb-1">💡 Suggestions rapides :</small>
    <div className="d-flex flex-wrap gap-2">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          className="btn btn-outline-primary btn-sm py-1 px-2"
          onClick={() => onSuggestionClick(suggestion)}
          style={{ fontSize: '0.8rem' }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  </div>
);