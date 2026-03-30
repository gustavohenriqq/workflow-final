import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-lg font-bold">
            !
          </div>
          <p className="text-sm font-medium text-neutral-800">Algo deu errado</p>
          <p className="text-xs text-neutral-400 max-w-sm text-center font-mono bg-neutral-50 px-3 py-2 rounded">
            {this.state.message}
          </p>
          <button
            className="text-xs text-blue-600 underline"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
