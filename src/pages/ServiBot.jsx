import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Bot, User, Loader2, Ticket, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

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

Si tu ne peux pas résoudre le problème après quelques échanges, ou si l'utilisateur demande à parler à un humain, ou si le problème est complexe (bug critique, litige, remboursement), indique que tu vas créer un ticket de support et demande confirmation.

Règles importantes :
- Sois empathique et professionnel
- Ne promets jamais de remboursement ou de compensation sans validation admin
- Pour les urgences de sécurité, renvoie vers les services d'urgence (112)
- Limite tes réponses à 3-4 phrases maximum sauf si plus de détails sont nécessaires`;

const CATEGORY_DETECT_PROMPT = `Analyse cette conversation et détermine la catégorie parmi : support_technique, question_service, faq_generale, facturation, compte, autre. Réponds avec UN SEUL mot parmi ces valeurs.`;

const PRIORITY_DETECT_PROMPT = `Analyse cette conversation et détermine la priorité parmi : low, medium, high, urgent. 
- urgent: problème de sécurité, données compromises, bug bloquant total
- high: bug majeur, impossible d'utiliser l'app, mission bloquée
- medium: question technique, besoin d'aide
- low: question générale, curiosité
Réponds avec UN SEUL mot parmi ces valeurs.`;

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-2 h-2 rounded-full bg-gray-400"
              animate={{ y: [0, -6, 0] }}
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isBot ? '' : 'flex-row-reverse'}`}
    >
      {isBot ? (
        <div className="w-7 h-7 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-[#e94560] flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isBot
          ? 'bg-gray-100 text-gray-800 rounded-bl-sm'
          : 'text-white rounded-br-sm'
      }`}
        style={!isBot ? { backgroundColor: '#1a1a2e' } : {}}
      >
        {isBot ? (
          <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {msg.content}
          </ReactMarkdown>
        ) : (
          <p>{msg.content}</p>
        )}
        {msg.ticketCreated && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-100 rounded-xl px-3 py-1.5">
            <Ticket className="w-3.5 h-3.5" />
            Ticket #{msg.ticketId?.slice(-6).toUpperCase()} créé
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ServiBot() {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 60000 });

  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'vous';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Bonjour ${firstName} ! 👋 Je suis **ServiBot**, votre assistant ServiGo.\n\nJe peux vous aider avec :\n- 🔧 Le support technique\n- 📋 Les questions sur les services\n- ❓ La FAQ générale\n\nComment puis-je vous aider aujourd'hui ?`,
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [ticketCreated, setTicketCreated] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const createTicketMutation = useMutation({
    mutationFn: async ({ summary, conversation, category, priority, originalRequest }) => {
      const ticket = await base44.entities.SupportTicket.create({
        customer_name: user?.full_name || user?.first_name || 'Utilisateur',
        customer_email: user?.email || '',
        subject: summary,
        ai_summary: summary,
        conversation_context: conversation,
        customer_request: originalRequest,
        category,
        priority,
        status: 'new',
      });
      return ticket;
    },
  });

  const shouldEscalate = (msgs, newMsg) => {
    const lower = newMsg.toLowerCase();
    // Seulement si l'utilisateur demande EXPLICITEMENT un humain
    const humanKeywords = ['parler à un humain', 'parler à un agent', 'parler à quelqu\'un', 'vrai personne', 'support humain', 'agent humain', 'je veux un conseiller'];
    if (humanKeywords.some(k => lower.includes(k))) return true;
    // Ou si l'utilisateur exprime très clairement une frustration répétée (5+ messages + mots forts)
    const userMessages = msgs.filter(m => m.role === 'user');
    if (userMessages.length >= 5) {
      const lastFive = userMessages.slice(-5).map(m => m.content.toLowerCase());
      const strongFrustration = ['toujours pas résolu', 'rien ne fonctionne', 'inutile', 'nul', 'remboursement', 'avocat', 'plainte'];
      const frustrated = lastFive.filter(m => strongFrustration.some(w => m.includes(w))).length >= 2;
      if (frustrated) return true;
    }
    return false;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');

    const newUserMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setUserMsgCount(c => c + 1);
    setIsTyping(true);

    const needsEscalation = !ticketCreated && shouldEscalate(messages, text);

    if (needsEscalation) {
      // Pre-escalation message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Je vois que votre problème nécessite l'intervention d'un agent ServiGo. Je vais créer un ticket de support pour vous. Un conseiller vous contactera par email dans les plus brefs délais. 🎫"
      }]);

      // Build conversation string
      const conversationStr = updatedMessages.map(m => `[${m.role === 'user' ? 'Client' : 'ServiBot'}]: ${m.content}`).join('\n');
      const firstUserMsg = messages.find(m => m.role === 'user')?.content || text;

      try {
        // Detect category and priority in parallel
        const [catRes, prioRes, summaryRes] = await Promise.all([
          base44.integrations.Core.InvokeLLM({
            prompt: `${CATEGORY_DETECT_PROMPT}\n\nConversation:\n${conversationStr}`,
          }),
          base44.integrations.Core.InvokeLLM({
            prompt: `${PRIORITY_DETECT_PROMPT}\n\nConversation:\n${conversationStr}`,
          }),
          base44.integrations.Core.InvokeLLM({
            prompt: `Résume en 1 phrase (max 100 caractères) le problème de l'utilisateur dans cette conversation:\n${conversationStr}`,
          }),
        ]);

        const category = ['support_technique', 'question_service', 'faq_generale', 'facturation', 'compte', 'autre'].includes(catRes?.trim()) ? catRes.trim() : 'autre';
        const priority = ['low', 'medium', 'high', 'urgent'].includes(prioRes?.trim()) ? prioRes.trim() : 'medium';
        const subject = summaryRes?.trim() || text.slice(0, 100);

        const ticket = await createTicketMutation.mutateAsync({
          summary: subject,
          conversation: conversationStr,
          category,
          priority,
          originalRequest: firstUserMsg,
        });

        setTicketCreated(true);
        setMessages(prev => {
          const last = [...prev];
          last[last.length - 1] = {
            ...last[last.length - 1],
            ticketCreated: true,
            ticketId: ticket.id,
            content: `Votre ticket de support a bien été créé ✅\n\n**Référence :** #${ticket.id.slice(-6).toUpperCase()}\n**Priorité :** ${priority}\n\nUn conseiller ServiGo va examiner votre demande et vous contactera à l'adresse **${user?.email}** dans les meilleurs délais.\n\nY a-t-il autre chose que je puisse faire pour vous ?`,
          };
          return last;
        });
      } catch (e) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Je n'ai pas pu créer le ticket automatiquement. Veuillez contacter directement notre support à **contact@servigo.be** en précisant votre problème."
        }]);
      }
      setIsTyping(false);
      return;
    }

    // Normal AI response
    try {
      const history = updatedMessages.map(m => `${m.role === 'user' ? 'Utilisateur' : 'ServiBot'}: ${m.content}`).join('\n');
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SERVIBOT_SYSTEM_PROMPT}\n\n---\nHistorique de la conversation:\n${history}\n\nRéponds en tant que ServiBot à la dernière question de l'utilisateur.`,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response || "Je n'ai pas pu générer une réponse. Veuillez réessayer." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Une erreur est survenue. Veuillez réessayer ou contacter **contact@servigo.be**." }]);
    }
    setIsTyping(false);
  };

  const quickReplies = userMsgCount === 0 ? [
    "Comment réserver un service ?",
    "Je ne peux pas me connecter",
    "Problème avec ma mission",
    "Comment m'inscrire comme pro ?",
  ] : [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base">ServiBot</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Assistant ServiGo · En ligne
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {isTyping && <TypingIndicator />}

        {/* Quick replies */}
        {quickReplies.length > 0 && !isTyping && (
          <div className="flex flex-wrap gap-2 mt-2">
            {quickReplies.map((q, i) => (
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
      <div className="shrink-0 px-4 py-3 border-t border-border bg-card" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Posez votre question..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring max-h-28"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#1a1a2e' }}
          >
            {isTyping ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          ServiBot peut faire des erreurs. Pour les urgences : <a href="tel:112" className="underline">112</a>
        </p>
      </div>
    </div>
  );
}