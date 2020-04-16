import { Component, ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }> {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return {
      hasError: true,
      error,
    }
  }
  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
