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
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'Unknown error';
      return (
        <div className="container mt-5">
          <div className="alert alert-danger" role="alert">
            <h4>Something went wrong</h4>
            <p>{message}</p>
            <p className="mb-0"><small>Please refresh the page or contact support.</small></p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;