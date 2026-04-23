import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'monospace',
          color: '#f87171',
          background: '#0d0d12',
          minHeight: '100vh',
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
            Something went wrong
          </h2>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.85rem',
            color: '#fca5a5',
          }}>
            {String(this.state.error)}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.25rem',
              background: '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
