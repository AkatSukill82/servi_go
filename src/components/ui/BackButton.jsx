import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallback = '/Home', className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };

  return (
    <button
      onClick={handleBack}
      aria-label="Retour"
      className={`p-2 -ml-2 rounded-xl hover:bg-muted transition-colors active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}