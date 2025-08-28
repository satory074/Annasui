"use client";

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    logger.error("[ERROR BOUNDARY] Caught error:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("[ERROR BOUNDARY] Error details:", {
      error: error.toString(),
      errorInfo: errorInfo,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              アプリケーションエラーが発生しました
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                {this.state.error?.message || "不明なエラー"}
              </p>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                詳細情報（開発者向け）
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-caramel-600 hover:bg-caramel-700 text-white px-4 py-2 rounded transition-colors"
            >
              ページをリロード
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}