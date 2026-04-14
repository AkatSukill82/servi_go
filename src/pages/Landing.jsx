import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Loader2, ChevronRight, Star, Shield, Clock, CheckCircle,
  Wrench, Zap, Search, FileText, Home, Droplets, Paintbrush,
  Truck, Scissors, Leaf, Hammer, Plug, ArrowRight, Users,
  Award, Phone, Mail, MapPin, Menu, X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const ICON_MAP = {
  Wrench, Droplets, Paintbrush, Truck, Scissors, Leaf, Hammer, Plug, Home, Zap,
};

const STEPS = [
  { icon: Search, title: 'Décrivez votre besoin', desc: 'Choisissez votre catégorie et répondez à quelques questions rapides.', color: '#EBF8FF', iconColor: '#2B6CB0' },
  { icon: Users, title: 'Un artisan vous répond', desc: 'Un professionnel vérifié accepte votre mission en quelques minutes.', color: '#F0FFF4', iconColor: '#38A169' },
  { icon: FileText, title: 'Contrat signé en ligne', desc: 'Signez un contrat numérique qui protège les deux parties.', color: '#FEF9E7', iconColor: '#D69E2E' },
  { icon: CheckCircle, title: 'Mission accomplie', desc: 'Le professionnel intervient et vous validez la fin de mission.', color: '#FFF5F5', iconColor: '#E53E3E' },
];

const STATS = [
  { value: '500+', label: 'Artisans vérifiés' },
  { value: '4.8/5', label: 'Note de satisfaction' },
  { value: '48h', label: 'Délai moyen intervention' },
  { value: '100%', label: 'Contrats sécurisés' },
];

const REVIEWS = [
  { name: 'Marie D.', rating: 5, comment: 'Service impeccable ! Mon plombier est arrivé en moins de 2h. Contrat clair, travail soigné. Je recommande vivement ServiGo.', category: 'Plomberie' },
  { name: 'Jean-Pierre M.', rating: 5, comment: 'Enfin une plateforme sérieuse ! Le processus de vérification des artisans me rassure vraiment. Mission réalisée parfaitement.', category: 'Électricité' },
  { name: 'Sophie L.', rating: 5, comment: 'Réservation simple, communication fluide via le chat. Le contrat numérique est une excellente idée. Très satisfaite !', category: 'Peinture' },
];

function StepItem({ step, i }) {
  const Icon = step.icon;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.12 }}
      className="relative text-center"
    >
      {i < STEPS.length - 1 && (
        <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#E2E8F0] to-[#CBD5E0] z-0" />
      )}
      <div className="relative z-10 flex flex-col items-center">
        <div style={{ background: step.color }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <Icon style={{ color: step.iconColor }} className="w-8 h-8" />
        </div>
        <div className="w-6 h-6 rounded-full bg-[#1A365D] text-white text-xs font-black flex items-center justify-center mb-3">
          {i + 1}
        </div>
        <h3 className="font-bold text-[#1A365D] mb-2">{step.title}</h3>
        <p className="text-sm text-[#718096] leading-relaxed">{step.desc}</p>
      </div>
    </motion.div>
  );
}

function ReviewItem({ r, i }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.1 }}
      className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm"
    >
      <div className="flex gap-0.5 mb-3">
        {Array(r.rating).fill(0).map((_, s) => (
          <Star key={s} className="w-4 h-4 fill-[#F6AD55] text-[#F6AD55]" />
        ))}
      </div>
      <p className="text-[#4A5568] text-sm leading-relaxed mb-4">"{r.comment}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1A365D] flex items-center justify-center text-white font-bold text-sm">
          {r.name[0]}
        </div>
        <div>
          <p className="font-bold text-[#1A365D] text-sm">{r.name}</p>
          <p className="text-xs text-[#718096]">{r.category}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ value, label, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay }} className="text-center">
      <p className="text-3xl md:text-4xl font-black text-[#1A365D]">{value}</p>
      <p className="text-sm text-[#718096] mt-1 font-medium">{label}</p>
    </motion.div>
  );
}

function CategoryCard({ category, index, onClick }) {
  const Icon = ICON_MAP[category.icon] || Wrench;
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 text-left border border-[#E2E8F0] hover:border-[#2B6CB0] hover:shadow-lg transition-all duration-200 group w-full"
    >
      <div className="w-12 h-12 rounded-xl bg-[#EBF8FF] flex items-center justify-center mb-3 group-hover:bg-[#2B6CB0] transition-colors duration-200">
        <Icon className="w-6 h-6 text-[#2B6CB0] group-hover:text-white transition-colors duration-200" />
      </div>
      <p className="font-bold text-[#1A365D] text-sm mb-1">{category.name}</p>
      <p className="text-xs text-[#718096] line-clamp-2">{category.description || 'Service professionnel à domicile'}</p>

    </motion.button>
  );
}

const ROTATING_WORDS = ['plombier', 'électricien', 'déménageur', 'serrurier', 'peintre', 'jardinier'];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        color: '#FF6B35',
        fontWeight: 900,
        display: 'inline-block',
        transition: 'opacity 0.4s ease',
        opacity: visible ? 1 : 0,
        minWidth: '220px',
        whiteSpace: 'nowrap',
      }}
    >
      {ROTATING_WORDS[index]}
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const user = await base44.auth.me();
        if (user?.role === 'admin') navigate('/AdminDashboard', { replace: true });
        else if (user?.user_type === 'professionnel') navigate('/ProDashboard', { replace: true });
        else if (user?.user_type === 'particulier') navigate('/Home', { replace: true });
        else navigate('/SelectUserType', { replace: true }); // compte sans type → choisir rôle
      } else {
        setChecking(false);
      }
    });
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.ServiceCategory.list(),
    enabled: !checking,
    staleTime: 5 * 60 * 1000,
  });

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <Loader2 className="w-7 h-7 animate-spin text-[#2B6CB0]" />
      </div>
    );
  }

  return (
    <div className="bg-[#F7FAFC] overflow-y-auto" style={{ minHeight: '100dvh' }}>

      {/* ─── NAVBAR ─── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1A365D] flex items-center justify-center shadow">
              <span className="text-white font-black text-lg">S</span>
            </div>
            <span className="font-black text-[#1A365D] text-xl tracking-tight">ServiGo</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#categories" className="text-sm font-medium text-[#4A5568] hover:text-[#1A365D] transition-colors">Services</a>
            <a href="#how" className="text-sm font-medium text-[#4A5568] hover:text-[#1A365D] transition-colors">Comment ça marche</a>
            <a href="#reviews" className="text-sm font-medium text-[#4A5568] hover:text-[#1A365D] transition-colors">Avis clients</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="hidden md:block text-sm font-semibold text-[#1A365D] hover:underline"
            >
              Se connecter
            </button>
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-[#1A365D] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#2D4A7A] transition-colors shadow-sm"
            >
              Commencer
            </button>
            <button className="md:hidden p-1" onClick={() => setMenuOpen(m => !m)}>
              {menuOpen ? <X className="w-5 h-5 text-[#1A365D]" /> : <Menu className="w-5 h-5 text-[#1A365D]" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] bg-white px-5 py-4 space-y-3">
            <a href="#categories" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-[#4A5568]">Services</a>
            <a href="#how" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-[#4A5568]">Comment ça marche</a>
            <a href="#reviews" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-[#4A5568]">Avis clients</a>
            <button onClick={() => base44.auth.redirectToLogin()} className="block w-full text-left text-sm font-semibold text-[#2B6CB0]">Se connecter</button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-[#1A365D] via-[#2A4A7F] to-[#2B6CB0] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#38A169] blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
              <Shield className="w-4 h-4 text-[#68D391]" /> 500+ artisans vérifiés en Belgique
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-6xl font-black leading-tight mb-5"
          >
            Trouvez le bon <RotatingWord /><br />
            <span className="text-[#68D391] whitespace-nowrap inline-block">près de chez vous</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto"
          >
            Plomberie, électricité, peinture, déménagement... Connectez-vous à des professionnels vérifiés avec contrat sécurisé.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="flex items-center justify-center gap-2 bg-white text-[#1A365D] font-bold px-8 py-4 rounded-2xl hover:bg-[#EBF8FF] transition-all duration-200 shadow-lg text-base group"
            >
              <Home className="w-5 h-5" />
              Je cherche un artisan
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-200 text-base group"
            >
              <Wrench className="w-5 h-5" />
              Je suis artisan
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-white/70"
          >
            {[
              { icon: Shield, text: 'Artisans 100% vérifiés' },
              { icon: FileText, text: 'Contrat numérique inclus' },
              { icon: Clock, text: 'Réponse en moins de 30 min' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#68D391]" /> {text}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z" fill="#F7FAFC" />
          </svg>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-14 bg-[#F7FAFC]">
        <div className="max-w-4xl mx-auto px-5">
          <div className="bg-white rounded-3xl shadow-md border border-[#E2E8F0] py-10 px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => <StatCard key={s.label} value={s.value} label={s.label} delay={i * 0.1} />)}
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section id="categories" className="py-16 bg-[#F7FAFC]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-10">
            <span className="text-sm font-bold text-[#2B6CB0] uppercase tracking-widest">Nos services</span>
            <h2 className="text-3xl md:text-4xl font-black text-[#1A365D] mt-2">Tous les corps de métier</h2>
            <p className="text-[#718096] mt-3 max-w-xl mx-auto">Choisissez votre besoin parmi nos catégories et trouvez le bon professionnel en quelques clics.</p>
          </div>
          {categories.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-[#E2E8F0] animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-[#E2E8F0] mb-3" />
                  <div className="h-4 bg-[#E2E8F0] rounded w-3/4 mb-2" />
                  <div className="h-3 bg-[#E2E8F0] rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  index={i}
                  onClick={() => base44.auth.redirectToLogin()}
                />
              ))}
            </div>
          )}
          <div className="text-center mt-8">
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="inline-flex items-center gap-2 bg-[#1A365D] text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-[#2D4A7A] transition-colors shadow-md"
            >
              Faire une demande <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-16 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <span className="text-sm font-bold text-[#2B6CB0] uppercase tracking-widest">Simple et rapide</span>
            <h2 className="text-3xl md:text-4xl font-black text-[#1A365D] mt-2">Comment ça marche ?</h2>
            <p className="text-[#718096] mt-3">4 étapes suffisent pour que votre mission soit réalisée</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((step, i) => <StepItem key={i} step={step} i={i} />)}
          </div>
        </div>
      </section>

      {/* ─── REVIEWS ─── */}
      <section id="reviews" className="py-16 bg-[#F7FAFC] border-t border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <span className="text-sm font-bold text-[#2B6CB0] uppercase tracking-widest">Avis clients</span>
            <h2 className="text-3xl md:text-4xl font-black text-[#1A365D] mt-2">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((r, i) => <ReviewItem key={i} r={r} i={i} />)}
          </div>
        </div>
      </section>

      {/* ─── CTA BOTTOM ─── */}
      <section className="py-16 bg-gradient-to-r from-[#1A365D] to-[#2B6CB0] text-white">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Prêt à commencer ?</h2>
          <p className="text-white/80 mb-8 text-lg">Rejoignez des milliers de clients satisfaits et trouvez votre artisan dès aujourd'hui.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-white text-[#1A365D] font-bold px-8 py-4 rounded-2xl hover:bg-[#EBF8FF] transition-colors shadow-lg text-base"
            >
              Se connecter
            </button>
            <button
              onClick={() => navigate('/Register')}
              className="border-2 border-white text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors text-base"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#1A365D] text-white py-12">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="font-black text-white text-sm">S</span>
                </div>
                <span className="font-black text-white text-lg">ServiGo</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">La plateforme qui connecte particuliers et artisans vérifiés en Belgique.</p>
            </div>
            <div>
              <p className="font-bold mb-3 text-sm uppercase tracking-wide text-white/50">Services</p>
              <div className="space-y-2 text-sm text-white/70">
                <p className="hover:text-white cursor-pointer" onClick={() => base44.auth.redirectToLogin()}>Trouver un artisan</p>
                <p className="hover:text-white cursor-pointer" onClick={() => navigate('/Register', { state: { preselectedType: 'professionnel' } })}>Devenir artisan</p>
                <p className="hover:text-white cursor-pointer">Comment ça marche</p>
              </div>
            </div>
            <div>
              <p className="font-bold mb-3 text-sm uppercase tracking-wide text-white/50">Légal</p>
              <div className="space-y-2 text-sm text-white/70">
                <p className="hover:text-white cursor-pointer" onClick={() => navigate('/CGU')}>Conditions d'utilisation</p>
                <p className="hover:text-white cursor-pointer" onClick={() => navigate('/PrivacyPolicy')}>Politique de confidentialité</p>
              </div>
            </div>
            <div>
              <p className="font-bold mb-3 text-sm uppercase tracking-wide text-white/50">Contact</p>
              <div className="space-y-2 text-sm text-white/70">
                <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@servigo.be</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Belgique</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
            <p>© 2026 ServiGo. Tous droits réservés.</p>
            <button onClick={() => base44.auth.redirectToLogin()} className="text-white/60 hover:text-white transition-colors font-medium">
              Se connecter / Se connecter →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}