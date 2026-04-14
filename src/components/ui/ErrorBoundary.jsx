import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold">Une erreur s'est produite</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Cette section a rencontré un problème. Revenez à l'accueil ou rechargez la page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium"
            >
              Réessayer
            </button>
            <button
              onClick={() => { window.location.href = '/Home'; }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}