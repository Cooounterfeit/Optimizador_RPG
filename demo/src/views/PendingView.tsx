import { Link } from 'react-router-dom'

/**
 * Marcador para rutas que ya existen en la navegacion pero cuya funcionalidad
 * todavia no esta construida (login, registro, perfil). Mejor una pagina que
 * diga honestamente "pendiente" que un enlace roto.
 */
export default function PendingView({ titulo, historia }: { titulo: string; historia: string }) {
  return (
    <div className="card pending">
      <h2>{titulo}</h2>
      <p className="hint">
        Esta seccion todavia no esta disponible ({historia}). Por ahora todo funciona sin cuenta:
        tus juegos e inventario se guardan en este navegador.
      </p>
      <Link to="/" className="mini">Volver a Juegos</Link>
    </div>
  )
}
