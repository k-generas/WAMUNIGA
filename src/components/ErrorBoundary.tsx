import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendly = 'Something went wrong while communicating with the shop database.';
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Database access note: ${parsed.error}`;
        }
      } catch {
        friendly = this.state.message || friendly;
      }

      return (
        <div className="min-h-screen bg-[#F9F8F5] text-[#18191B] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl p-8">
            <h1 className="text-xl font-semibold mb-3">Action Could Not Be Completed</h1>
            <p className="text-sm text-[#5A5C63] leading-relaxed mb-6 break-words">{friendly}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
