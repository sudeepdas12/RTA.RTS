import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary caught an error:', error, info);
    // Log to window for debugging
    window.__LAST_ERROR__ = { error, info };
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || this.state.error?.toString() || 'Unknown error';
      return (
        <div className="container py-5">
          <div className="card border-0 shadow-lg" role="alert">
            <div className="card-body p-4 p-md-5 text-center">
              <h4 className="mb-3">Something went wrong</h4>
              <p className="text-secondary mb-4">{message}</p>
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    this.setState({ hasError: false, error: null, info: null });
                    window.location.href = '/dashboard';
                  }}
                >
                  Go to Dashboard
                </button>
              </div>
              <div className="mt-3 p-3 bg-light rounded" style={{ textAlign: 'left', fontSize: '0.85rem' }}>
                <details open>
                  <summary className="cursor-pointer"><strong>Error Details</strong></summary>
                  <pre style={{ marginTop: '10px', overflow: 'auto', maxHeight: '300px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px' }}>
{message}
{this.state.info?.componentStack ? `\n\nComponent Stack:\n${this.state.info.componentStack}` : ''}
                  </pre>
                </details>
              </div>
              <p className="mt-3 mb-0">
                <small className="text-muted">If this persists, contact system support.</small>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;