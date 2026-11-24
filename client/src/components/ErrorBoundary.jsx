import { Component } from 'react';

/** Catches render errors in a page and offers a retry. Resets when resetKey changes. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel panel--alert state" role="alert">
        <h2>System fault</h2>
        <p>{this.state.error.message || 'Something went wrong.'}</p>
        <button className="button" onClick={() => this.setState({ error: null })}>
          Retry
        </button>
      </div>
    );
  }
}
