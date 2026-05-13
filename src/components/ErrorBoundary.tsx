import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isTranslateBug =
        this.state.error?.message?.includes("insertBefore") ||
        this.state.error?.message?.includes("removeChild");
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-xl font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              {isTranslateBug
                ? "Parece que o tradutor automatico do navegador esta interferindo na pagina. Desative a traducao (clique no icone de traducao na barra do Chrome) e recarregue."
                : this.state.error?.message ?? "Erro inesperado."}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.reset}
                className="px-3 py-1.5 rounded bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
              >
                Tentar de novo
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                Recarregar pagina
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
