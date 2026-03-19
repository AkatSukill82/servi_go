import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import QuestionStep from '@/components/request/QuestionStep';
import PriceQuote from '@/components/request/PriceQuote';
import { motion, AnimatePresence } from 'framer-motion';

export default function ServiceRequest() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('categoryId');

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showQuote, setShowQuote] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const categories = await base44.entities.ServiceCategory.filter({ id: categoryId });
      return categories[0];
    },
    enabled: !!categoryId,
  });

  const questions = category?.questions || [];
  const totalSteps = questions.length;

  const basePrice = category?.base_price || 50;
  const commission = basePrice * 0.10;
  const totalPrice = basePrice + commission;

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const request = await base44.entities.ServiceRequest.create(data);
      await base44.entities.Invoice.create({
        request_id: request.id,
        invoice_number: `INV-${Date.now()}`,
        category_name: data.category_name,
        professional_name: 'À assigner',
        base_price: data.base_price,
        commission: data.commission,
        total_price: data.total_price,
        payment_method: data.payment_method,
        payment_status: data.payment_method === 'cash' ? 'unpaid' : 'paid',
        customer_name: data.customer_name,
        customer_email: data.customer_email,
      });
      return request;
    },
    onSuccess: () => {
      toast.success('Demande envoyée avec succès !');
      navigate('/Invoices');
    },
  });

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [step]: value });
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      setShowQuote(true);
    }
  };

  const handleBack = () => {
    if (showQuote) {
      setShowQuote(false);
    } else if (step > 0) {
      setStep(step - 1);
    } else {
      navigate('/Home');
    }
  };

  const handleAccept = async () => {
    const user = await base44.auth.me();
    const answersArray = questions.map((q, i) => ({
      question: q.question,
      answer: answers[i] || '',
    }));

    createRequestMutation.mutate({
      category_id: categoryId,
      category_name: category.name,
      answers: answersArray,
      base_price: basePrice,
      commission: commission,
      total_price: totalPrice,
      status: 'accepted',
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'cash' ? 'unpaid' : 'paid',
      customer_name: user?.full_name || '',
      customer_email: user?.email || '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-muted-foreground">Service non trouvé</p>
        <Button variant="outline" onClick={() => navigate('/Home')} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{category.name}</h1>
          <p className="text-sm text-muted-foreground">
            {showQuote ? 'Devis' : `Question ${step + 1} / ${totalSteps}`}
          </p>
        </div>
      </div>

      {/* Progress */}
      {!showQuote && totalSteps > 0 && (
        <Progress value={((step + 1) / totalSteps) * 100} className="mb-6 h-1.5" />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {showQuote ? (
          <PriceQuote
            key="quote"
            basePrice={basePrice}
            commission={commission}
            totalPrice={totalPrice}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onAccept={handleAccept}
            onDecline={() => navigate('/Home')}
            isSubmitting={createRequestMutation.isPending}
          />
        ) : totalSteps > 0 ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <QuestionStep
              question={questions[step]}
              answer={answers[step]}
              onChange={handleAnswer}
            />
            <Button
              onClick={handleNext}
              disabled={!answers[step]}
              className="w-full h-14 rounded-xl text-base"
            >
              {step < totalSteps - 1 ? 'Suivant' : 'Voir le prix'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <PriceQuote
            key="quote-no-questions"
            basePrice={basePrice}
            commission={commission}
            totalPrice={totalPrice}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onAccept={handleAccept}
            onDecline={() => navigate('/Home')}
            isSubmitting={createRequestMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}