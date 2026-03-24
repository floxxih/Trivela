import { Component } from 'react';

const DEFAULT_MESSAGE = 'Something went wrong while rendering this page.';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      retryKey: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || DEFAULT_MESSAGE,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught UI error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      errorMessage: '',
      retryKey: prevState.retryKey + 1,
    }));
  };

  handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    const { hasError, errorMessage, retryKey } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <main className="error-boundary" role="alert" aria-live="assertive">
          <div className="error-boundary-card">
            <p className="error-boundary-eyebrow">Oops</p>
            <h1 className="error-boundary-title">We hit an unexpected error</h1>
            <p className="error-boundary-message">{errorMessage || DEFAULT_MESSAGE}</p>
            <div className="error-boundary-actions">
              <button
                type="button"
                className="error-boundary-button error-boundary-button-primary"
                onClick={this.handleRetry}
              >
                Retry
              </button>
              <button
                type="button"
                className="error-boundary-button error-boundary-button-secondary"
                onClick={this.handleGoHome}
              >
                Go home
              </button>
            </div>
          </div>
        </main>
      );
    }

    return <div key={retryKey}>{children}</div>;
  }
}
