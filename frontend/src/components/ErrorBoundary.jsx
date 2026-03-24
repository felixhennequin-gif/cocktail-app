import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">
                Oops ! Une erreur est survenue
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Quelque chose s'est mal passé. Veuillez réessayer ou retourner à l'accueil.
              </p>
            </div>

            <button
              onClick={() => {
                window.location.href = '/'
              }}
              className="inline-block px-6 py-2.5 bg-gold-400 text-ink-900 rounded-lg hover:bg-gold-300 transition-colors font-medium text-sm"
            >
              Retour à l'accueil
            </button>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 text-left">
                <details className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <summary className="cursor-pointer font-mono text-sm text-red-800 dark:text-red-200 font-medium">
                    Détails de l'erreur (dev)
                  </summary>
                  <pre className="mt-2 font-mono text-xs text-red-700 dark:text-red-300 overflow-auto max-h-64 whitespace-pre-wrap break-words">
                    {this.state.error.toString()}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
