import { Component, type ErrorInfo, type ReactNode } from 'react'
import { errorReport, friendlyMessage, reportError } from './errors'

/**
 * Error Boundary (TEC-18)
 * =======================
 * Si un componente falla al dibujarse, React desmonta TODO el arbol y deja la
 * pantalla en blanco. Este componente atrapa el error y muestra en su lugar un
 * mensaje con salidas: reintentar, volver al inicio o recargar.
 *
 * Se usa en dos niveles (ver main.tsx y App.tsx):
 *  - alrededor de cada seccion: si falla el Optimizador, la cabecera y el menu
 *    siguen funcionando y se puede ir a otra seccion;
 *  - alrededor de toda la app: la ultima red, por si falla la propia cabecera.
 *
 * `resetKey`: cuando cambia (por ejemplo, la ruta), el error se olvida y se
 * vuelve a intentar dibujar. Asi navegar a otra seccion "cura" el fallo.
 */
interface Props {
  children: ReactNode
  /** Donde esta el limite, para el registro ("seccion /optimizador"). */
  where: string
  resetKey?: string
  /** Version compacta (dentro de una seccion) o de pantalla completa. */
  full?: boolean
}
interface State { error: Error | null; copiado: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copiado: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const err = new Error(error.message)
    err.stack = `${error.stack ?? ''}\n\nComponentes:${info.componentStack ?? ''}`
    reportError(err, `render ${this.props.where}`)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null, copiado: false })
  }

  private copiar = async () => {
    try {
      await navigator.clipboard.writeText(errorReport())
      this.setState({ copiado: true })
    } catch { /* sin portapapeles: los detalles siguen visibles abajo */ }
  }

  render() {
    const { error, copiado } = this.state
    if (!error) return this.props.children
    const dev = import.meta.env.DEV
    return (
      <div className={`card err-boundary${this.props.full ? ' full' : ''}`} role="alert">
        <div className="err-icon" aria-hidden="true">!</div>
        <h2>Algo salió mal</h2>
        <p>{friendlyMessage(error.message) !== error.message
          ? friendlyMessage(error.message)
          : 'Esta sección tuvo un problema al mostrarse. Tus juegos e inventario no se perdieron.'}</p>
        <div className="err-actions">
          <button className="primary" onClick={() => this.setState({ error: null, copiado: false })}>Reintentar</button>
          <button className="mini" onClick={() => { location.href = '/' }}>Volver al inicio</button>
          <button className="mini" onClick={() => location.reload()}>Recargar la página</button>
          <button className="mini" onClick={this.copiar}>{copiado ? 'Detalles copiados' : 'Copiar detalles del error'}</button>
        </div>
        <details className="err-details" open={dev}>
          <summary>Detalles técnicos</summary>
          <pre className="code wrap">{error.message}{dev && error.stack ? `\n\n${error.stack}` : ''}</pre>
        </details>
      </div>
    )
  }
}
