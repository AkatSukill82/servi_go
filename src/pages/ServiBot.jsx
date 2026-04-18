import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Bot, Loader2, Ticket, Plus, ArrowLeft, CheckCircle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVIBOT_SYSTEM_PROMPT = `Tu es ServiBot, l'assistant virtuel de ServiGo — une plateforme belge de mise en relation entre particuliers et professionnels de services à domicile (plomberie, électricité, serrurerie, déménagement, jardinage, nettoyage, etc.).

Tu réponds UNIQUEMENT en français, de façon claire, concise et chaleureuse.

Contexte de la plateforme ServiGo :
- Plateforme basée en Belgique
- Met en relation des clients (particuliers) avec des professionnels vérifiés (BCE, assurance RC pro, eID)
- Les professionnels paient 10€/mois d'abonnement pour recevoir des missions
- Les missions sont encadrées par un contrat électronique signé par les deux parties
- Paiement direct entre client et professionnel
- Application mobile disponible (iOS/Android)
- Support : contact@servigo.be

Tu peux aider pour :
1. Support technique : bugs, navigation dans l'app, fonctionnalités
2. Questions sur les services : catégories disponibles, prix, comment commander
3. Questions professionnels : inscription, abonnement, missions, contrats
4. FAQ générale : sécurité, vérifications, litiges, annulations

Règles importantes :
- Sois empathique et professionnel
- Ne promets jamais de remboursement ou de compensation sans validation admin
- Pour les urgences de sécurité, renvoie vers les services d'urgence (112)
- Limite tes réponses à 3-4 phrases maximum sauf si plus de détails sont nécessaires
- Si l'utilisateur demande explicitement un agent humain, indique que tu vas créer un ticket`;

const WELCOME_MESSAGE = (firstName) => ({
  id: 'welcome',
  role: 'assistant',
  content: `Bonjour ${firstName} ! 👋 Je suis **ServiBot**, votre assistant ServiGo.\n\nJe peux vous aider avec :\n- 🔧 Le support technique\n- 📋 Les questions sur les services\n- ❓ La FAQ générale\n\nComment puis-je vous aider aujourd'hui ?`,
  timestamp: new Date().toISOString(),
});

const QUICK_REPLIES = [
  "Comment réserver un service ?",
  "Je ne peux pas me connecter",
  "Problème avec ma mission",
  "Comment m'inscrire comme pro ?",
];

// ─── Storage helpers (localStorage) ──────────────────────────────────────────

const STORAGE_KEY = (email) => `servibot_chats_${email}`;

function loadChats(email) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(email)) || '[]');
  } catch { return []; }
}

function saveChats(email, chats) {
  try {
    localStorage.setItem(STORAGE_KEY(email), JSON.stringify(chats));
  } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isBot = msg.role === 'assistant';
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isBot ? 'bg-muted text-foreground rounded-bl-sm' : 'text-white rounded-br-sm'
      }`} style={!isBot ? { backgroundColor: '#1a1a2e' } : {}}>
        {isBot ? (
          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {msg.content}
          </ReactMarkdown>
        ) : (
          <p>{msg.content}</p>
        )}
        {msg.ticketCreated && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-100 rounded-xl px-3 py-1.5">
            <Ticket className="w-3.5 h-3.5" /> Ticket #{msg.ticketId?.slice(-6).toUpperCase()} créé
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Chat view ────────────────────────────────────────────────────────────────

function ChatView({ chat, user, onBack, onUpdateChat }) {
  const [messages, setMessages] = useState(chat.messages || []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(chat.ticketCreated || false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const isClosed = chat.status === 'closed';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveMessages = (newMsgs) => {
    setMessages(newMsgs);
    onUpdateChat({ ...chat, messages: newMsgs, lastMessage: newMsgs[newMsgs.length - 1]?.content?.slice(0, 60) });
  };

  const createTicket = async (updatedMessages) => {
    const conversationStr = updatedMessages.map(m => `[${m.role === 'user' ? 'Client' : 'ServiBot'}]: ${m.content}`).join('\n');
    const firstUserMsg = updatedMessages.find(m => m.role === 'user')?.content || '';
    const [catRes, prioRes, summaryRes] = await Promise.all([
      base44.integrations.Core.InvokeLLM({ prompt: `Catégorie parmi support_technique, question_service, faq_generale, facturation, compte, autre — UN SEUL MOT:\n${conversationStr}` }),
      base44.integrations.Core.InvokeLLM({ prompt: `Priorité parmi low, medium, high, urgent — UN SEUL MOT:\n${conversationStr}` }),
      base44.integrations.Core.InvokeLLM({ prompt: `Résume en 1 phrase le problème (max 100 caractères):\n${conversationStr}` }),
    ]);
    const category = ['support_technique', 'question_service', 'faq_generale', 'facturation', 'compte', 'autre'].includes(catRes?.trim()) ? catRes.trim() : 'autre';
    const priority = ['low', 'medium', 'high', 'urgent'].includes(prioRes?.trim()) ? prioRes.trim() : 'medium';
    const subject = summaryRes?.trim() || firstUserMsg.slice(0, 100);
    const ticket = await base44.entities.SupportTicket.create({
      customer_name: user?.full_name || user?.first_name || 'Utilisateur',
      customer_email: user?.email || '',
      subject, ai_summary: subject,
      conversation_context: conversationStr,
      customer_request: firstUserMsg,
      category, priority, status: 'new',
    });
    return { ticket, priority };
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || isClosed) return;
    setInput('');

    const newUserMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    // Escalation check
    const lower = text.toLowerCase();
    const wantsHuman = ['parler à un humain', 'parler à un agent', 'vrai personne', 'agent humain', 'je veux un conseiller'].some(k => lower.includes(k));

    if (wantsHuman && !ticketCreated) {
      const preMsg = { id: Date.now() + 1, role: 'assistant', content: "Je vais créer un ticket pour qu'un agent vous contacte. ⏳", timestamp: new Date().toISOString() };
      const withPre = [...updatedMessages, preMsg];
      setMessages(withPre);
      try {
        const { ticket, priority } = await createTicket(updatedMessages);
        setTicketCreated(true);
        const finalMsg = {
          id: Date.now() + 2, role: 'assistant', timestamp: new Date().toISOString(),
          ticketCreated: true, ticketId: ticket.id,
          content: `Ticket créé ✅\n\n**Référence :** #${ticket.id.slice(-6).toUpperCase()}\n**Priorité :** ${priority}\n\nUn conseiller vous contactera à **${user?.email}** dans les meilleurs délais.`,
        };
        const final = [...updatedMessages, finalMsg];
        setMessages(final);
        onUpdateChat({ ...chat, messages: final, ticketCreated: true, lastMessage: finalMsg.content.slice(0, 60) });
      } catch {
        const errMsg = { id: Date.now() + 2, role: 'assistant', content: "Je n'ai pas pu créer le ticket. Contactez **contact@servigo.be**.", timestamp: new Date().toISOString() };
        const final = [...updatedMessages, errMsg];
        setMessages(final);
        onUpdateChat({ ...chat, messages: final, lastMessage: errMsg.content.slice(0, 60) });
      }
      setIsTyping(false);
      return;
    }

    // Normal AI response
    try {
      const history = updatedMessages.map(m => `${m.role === 'user' ? 'Utilisateur' : 'ServiBot'}: ${m.content}`).join('\n');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SERVIBOT_SYSTEM_PROMPT}\n\n---\nHistorique:\n${history}\n\nRéponds à la dernière question.`,
      });
      const botMsg = { id: Date.now() + 1, role: 'assistant', content: response || "Je n'ai pas pu répondre, réessayez.", timestamp: new Date().toISOString() };
      const final = [...updatedMessages, botMsg];
      saveMessages(final);
    } catch {
      const errMsg = { id: Date.now() + 1, role: 'assistant', content: "Une erreur est survenue. Réessayez.", timestamp: new Date().toISOString() };
      saveMessages([...updatedMessages, errMsg]);
    }
    setIsTyping(false);
  };

  const userMsgCount = messages.filter(m => m.role === 'user').length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-card flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">ServiBot</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {isClosed
              ? <><X className="w-3 h-3 text-red-400" /> Conversation clôturée</>
              : <><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> En ligne</>}
          </p>
        </div>
        {!isClosed && (
          <button
            onClick={() => onUpdateChat({ ...chat, messages, status: 'closed', closedAt: new Date().toISOString() })}
            className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 bg-red-50 font-medium shrink-0"
          >
            Clôturer
          </button>
        )}
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div className="bg-gray-100 border-b border-border px-4 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">Cette discussion est clôturée · {chat.closedAt ? format(new Date(chat.closedAt), 'dd MMM yyyy à HH:mm', { locale: fr }) : ''}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => <MessageBubble key={msg.id || i} msg={msg} />)}
        {isTyping && <TypingIndicator />}
        {/* Quick replies — only on fresh chat */}
        {userMsgCount === 0 && !isTyping && !isClosed && (
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_REPLIES.map((q, i) => (
              <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                className="text-xs px-3 py-2 rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="shrink-0 px-4 py-3 border-t border-border bg-card" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <div className="flex items-end gap-2">
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Posez votre question..." rows={1}
              className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring max-h-28"
              style={{ minHeight: '44px' }} />
            <button onClick={handleSend} disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-40"
              style={{ backgroundColor: '#1a1a2e' }}>
              {isTyping ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-4 py-4 border-t border-border bg-card text-center" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button onClick={onBack} className="text-sm font-semibold text-primary underline">
            ← Retour aux discussions
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Discussions list ─────────────────────────────────────────────────────────

function ChatList({ chats, onOpen, onCreate }) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1a1a2e] flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base">ServiBot</h1>
            <p className="text-xs text-muted-foreground">Assistant ServiGo</p>
          </div>
        </div>
        <button onClick={onCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold"
          style={{ backgroundColor: '#1a1a2e' }}>
          <Plus className="w-4 h-4" /> Nouvelle discussion
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base">Aucune discussion</p>
              <p className="text-sm text-muted-foreground mt-1">Créez votre première discussion avec ServiBot pour obtenir de l'aide.</p>
            </div>
            <button onClick={onCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold"
              style={{ backgroundColor: '#1a1a2e' }}>
              <Plus className="w-4 h-4" /> Nouvelle discussion
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {chats.map((chat) => {
              const isClosed = chat.status === 'closed';
              const lastMsg = chat.messages?.[chat.messages.length - 1];
              const timeStr = chat.updatedAt ? (() => {
                try { return formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true, locale: fr }); } catch { return ''; }
              })() : '';
              return (
                <button key={chat.id} onClick={() => onOpen(chat)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left">
                  <div className="w-11 h-11 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0 relative">
                    <Bot className="w-5 h-5 text-white" />
                    {!isClosed && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">ServiBot</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeStr}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {lastMsg?.content?.slice(0, 55) || 'Nouvelle discussion'}...
                      </p>
                      {isClosed && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">Clôturée</span>
                      )}
                      {chat.ticketCreated && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0">Ticket</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ServiBot() {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 60000 });
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'vous';

  // Load chats from localStorage when user is ready
  useEffect(() => {
    if (user?.email) setChats(loadChats(user.email));
  }, [user?.email]);

  const persistChats = (newChats) => {
    setChats(newChats);
    if (user?.email) saveChats(user.email, newChats);
  };

  const handleCreate = () => {
    const newChat = {
      id: `chat_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [WELCOME_MESSAGE(firstName)],
      lastMessage: `Bonjour ${firstName} ! Je suis ServiBot...`,
      ticketCreated: false,
    };
    const updated = [newChat, ...chats];
    persistChats(updated);
    setActiveChat(newChat);
  };

  const handleUpdateChat = (updatedChat) => {
    const updated = chats.map(c => c.id === updatedChat.id ? { ...updatedChat, updatedAt: new Date().toISOString() } : c);
    persistChats(updated);
    setActiveChat({ ...updatedChat, updatedAt: new Date().toISOString() });
  };

  const handleBack = () => setActiveChat(null);

  return (
    <AnimatePresence mode="wait">
      {activeChat ? (
        <motion.div key="chat" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="h-full">
          <ChatView
            chat={activeChat}
            user={user}
            onBack={handleBack}
            onUpdateChat={handleUpdateChat}
          />
        </motion.div>
      ) : (
        <motion.div key="list" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="h-full">
          <ChatList chats={chats} onOpen={setActiveChat} onCreate={handleCreate} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}