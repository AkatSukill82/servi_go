import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { User, Briefcase, MapPin, CheckCircle, XCircle, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Belgique: zones linguistiques approximatives par longitude
// <4.0 = Wallonie (fr), >4.8 = Flandre (nl), entre les deux = Bruxelles (fr/nl)
// Province de Liège est incluse (~5.5-6.0) avec communauté germanophone
function detectLanguage(lat, lon) {
  if (lon > 5.7 && lat < 50.7) return 'de'; // Communauté germanophone (Eupen/Malmedy)
  if (lon > 4.7) return 'nl'; // Flandre
  return 'fr'; // Wallonie + Bruxelles (par défaut)
}

async function reverseGeocode(lat, lon) {
  const lang = detectLanguage(lat, lon);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${lang}`
  );
  const data = await res.json();
  return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

const LANG_TEXTS = {
  fr: {
    title: 'Une dernière étape !',
    subtitle: 'Comment souhaitez-vous utiliser ServiConnect ?',
    customer: 'Particulier', customerSub: 'Je cherche un professionnel',
    pro: 'Professionnel', proSub: 'Je propose mes services',
    detecting: 'Détection de votre position…',
    detectingSub: 'Autorisez la géolocalisation pour pré-remplir votre adresse automatiquement.',
    addressTitle: 'Votre adresse détectée',
    addressSub: 'Confirmez-vous que c\'est bien votre adresse habituelle ?',
    confirm: 'Oui, c\'est bien mon adresse',
    reject: 'Non, je saisirai manuellement',
    skipped: 'Géolocalisation ignorée. Vous pourrez la saisir plus tard.',
  },
  nl: {
    title: 'Nog één stap!',
    subtitle: 'Hoe wilt u ServiConnect gebruiken?',
    customer: 'Particulier', customerSub: 'Ik zoek een professional',
    pro: 'Professional', proSub: 'Ik bied mijn diensten aan',
    detecting: 'Uw locatie detecteren…',
    detectingSub: 'Sta geolokalisatie toe om uw adres automatisch in te vullen.',
    addressTitle: 'Gedetecteerd adres',
    addressSub: 'Bevestigt u dat dit uw gewone adres is?',
    confirm: 'Ja, dit is mijn adres',
    reject: 'Nee, ik vul het handmatig in',
    skipped: 'Geolokalisatie overgeslagen. U kunt dit later invullen.',
  },
  de: {
    title: 'Noch ein letzter Schritt!',
    subtitle: 'Wie möchten Sie ServiConnect nutzen?',
    customer: 'Privatperson', customerSub: 'Ich suche einen Fachmann',
    pro: 'Fachmann', proSub: 'Ich biete meine Dienste an',
    detecting: 'Ihren Standort ermitteln…',
    detectingSub: 'Erlauben Sie die Geolokalisierung, um Ihre Adresse automatisch auszufüllen.',
    addressTitle: 'Erkannte Adresse',
    addressSub: 'Bestätigen Sie, dass dies Ihre übliche Adresse ist?',
    confirm: 'Ja, das ist meine Adresse',
    reject: 'Nein, ich gebe sie manuell ein',
    skipped: 'Geolokalisierung übersprungen. Sie können sie später eingeben.',
  },
};

export default function SelectUserType() {
  const navigate = useNavigate();
  const [step, setStep] = useState('choose');
  const [pendingType, setPendingType] = useState(null);
  const [detectedAddress, setDetectedAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [lang, setLang] = useState('fr');

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (_, data) => {
      if (data.user_type === 'particulier') navigate('/Home');
      else navigate('/ProDashboard');
    },
  });

  const handleChoose = async (type) => {
    setPendingType(type);
    setStep('geolocating');

    if (!navigator.geolocation) {
      // No geolocation support, skip directly
      updateMutation.mutate({ user_type: type });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        try {
          const address = await reverseGeocode(latitude, longitude);
          setDetectedAddress(address);
          setStep('confirm');
        } catch {
          // Geocoding failed, use coords only
          setDetectedAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setStep('confirm');
        }
      },
      () => {
        // User denied or error — skip geolocation
        toast.info('Géolocalisation ignorée. Vous pourrez la saisir plus tard.');
        updateMutation.mutate({ user_type: type });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirmAddress = () => {
    updateMutation.mutate({
      user_type: pendingType,
      address: detectedAddress,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    });
  };

  const handleRejectAddress = () => {
    // Save user type but without the address
    updateMutation.mutate({ user_type: pendingType });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">

        {/* STEP: Choose type */}
        {step === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-black text-white">S</span>
              </div>
              <h1 className="text-2xl font-bold">Une dernière étape !</h1>
              <p className="text-muted-foreground mt-2">Comment souhaitez-vous utiliser ServiConnect ?</p>
            </div>

            <div className="space-y-4">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => handleChoose('particulier')}
                className="w-full bg-card border-2 border-border hover:border-primary/40 rounded-2xl p-6 text-left transition-all active:scale-95 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Particulier</h2>
                    <p className="text-sm text-muted-foreground">Je cherche un professionnel</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => handleChoose('professionnel')}
                className="w-full bg-card border-2 border-border hover:border-accent/40 rounded-2xl p-6 text-left transition-all active:scale-95 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Briefcase className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Professionnel</h2>
                    <p className="text-sm text-muted-foreground">Je propose mes services</p>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* STEP: Geolocating */}
        {step === 'geolocating' && (
          <motion.div
            key="geolocating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-5"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Navigation className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-bold">Détection de votre position…</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Autorisez la géolocalisation pour pré-remplir votre adresse automatiquement lors de vos demandes.
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </motion.div>
        )}

        {/* STEP: Confirm address */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Votre adresse détectée</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Confirmez-vous que c'est bien votre adresse habituelle ?
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{detectedAddress}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConfirmAddress}
                disabled={updateMutation.isPending}
                className="w-full h-14 rounded-xl text-base"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Oui, c'est bien mon adresse
              </Button>
              <Button
                variant="outline"
                onClick={handleRejectAddress}
                disabled={updateMutation.isPending}
                className="w-full h-14 rounded-xl text-base"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Non, je saisirai mon adresse manuellement
              </Button>
            </div>

            {updateMutation.isPending && (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}