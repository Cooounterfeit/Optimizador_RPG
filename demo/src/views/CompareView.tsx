import { Banner } from '../ui/components'

const Y = () => <span className="yes">Si</span>
const N = () => <span className="no">No</span>
const P = ({ children }: { children: React.ReactNode }) => <span className="part">{children}</span>

export default function CompareView() {
  return (
    <>
      <div className="hero">
        <h2>Zenith frente a Genshin Optimizer</h2>
        <p>
          Genshin Optimizer es la referencia obligada del rubro. Antes de defender por que
          Zenith tiene sentido, conviene saber exactamente contra que se compara.
        </p>
      </div>

      <div className="card">
        <Banner kind="warn">
          <b>Primer hallazgo incomodo, y es mejor saberlo antes de la presentacion:</b> Genshin
          Optimizer <b>ya es multijuego</b>. Hoy tiene tres frontends (Genshin Impact, Zenless
          Zone Zero en alfa y Honkai: Star Rail en desarrollo) sobre un monorepo NX con librerias
          compartidas, y un motor de calculo propio llamado <b>Pando</b> pensado justamente para
          ser agnostico al juego. El argumento «somos multijuego y ellos no» no se sostiene.
        </Banner>

        <h3>Comparativa punto por punto</h3>
        <div className="tablescroll">
          <table className="cmp">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Genshin Optimizer</th>
                <th>Zenith Optimizer (propuesta)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Juegos soportados</td>
                <td>Genshin, Zenless Zone Zero (alfa), Star Rail (en desarrollo)</td>
                <td>Cualquiera que tenga plantilla. En esta demo, 2</td>
              </tr>
              <tr>
                <td>Como se anade un juego</td>
                <td>Programando una app y librerias nuevas, y desplegando</td>
                <td><b>Escribiendo un archivo JSON</b></td>
              </tr>
              <tr>
                <td>Quien puede anadirlo</td>
                <td>El equipo de desarrollo</td>
                <td><b>Cualquier usuario de la comunidad</b></td>
              </tr>
              <tr>
                <td>Motor de formulas</td>
                <td>Pando (nodos con consultas etiquetadas); Waverider heredado</td>
                <td>Interprete de expresiones definido en la plantilla</td>
              </tr>
              <tr>
                <td>Algoritmo de optimizacion</td>
                <td>Solver con Web Workers en paralelo</td>
                <td>Branch and bound con poda exacta demostrable</td>
              </tr>
              <tr>
                <td>Almacenamiento local</td>
                <td>IndexedDB</td>
                <td>IndexedDB + Dexie (planificado)</td>
              </tr>
              <tr>
                <td>Escaneo por OCR</td>
                <td><Y /> tesseract.js</td>
                <td><P>Planificado</P>, mismo enfoque</td>
              </tr>
              <tr>
                <td>Equipos y loadouts</td>
                <td><Y /></td>
                <td><N /></td>
              </tr>
              <tr>
                <td>Marketplace de plantillas</td>
                <td><N /></td>
                <td><b>Si</b> — publicar, votar, comentar</td>
              </tr>
              <tr>
                <td>Bifurcacion (fork) de configuraciones</td>
                <td><N /></td>
                <td><b>Si</b> — con herencia de assets</td>
              </tr>
              <tr>
                <td>Modelo de negocio</td>
                <td>Open source, sin monetizacion</td>
                <td>Freemium + anuncios + donaciones a creadores</td>
              </tr>
              <tr>
                <td>Madurez</td>
                <td>Anos de desarrollo, comunidad activa</td>
                <td>Prototipo de proyecto de titulo</td>
              </tr>
              <tr>
                <td>Precision del modelo de juego</td>
                <td>Muy alta: talentos, reacciones, buffs de equipo, pasivas de arma</td>
                <td>Simplificada</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="twocol">
        <div className="card">
          <h2>Donde Genshin Optimizer nos gana</h2>
          <h3>Precision</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Modela constelaciones, refinamientos de arma, curvas de talento, reacciones
            elementales y buffs de compañeros de equipo. Zenith hoy modela sumas, porcentajes y
            bonos de conjunto. Para un jugador de Genshin, esa diferencia lo es todo.
          </p>
          <h3>Madurez</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Anos de trabajo, comunidad establecida y datos del juego actualizados parche a parche.
            Competir de frente en Genshin seria perder.
          </p>
          <h3>Ya resolvieron lo dificil</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Optimizacion paralela, OCR, persistencia local, internacionalizacion. Todo lo que el
            documento de tecnologias de Zenith plantea como pilares, ellos ya lo tienen andando.
          </p>
        </div>

        <div className="card">
          <h2>Donde esta la apuesta real de Zenith</h2>
          <h3>La barrera de entrada, no el numero de juegos</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            En Genshin Optimizer, soportar un juego nuevo es un proyecto de ingenieria. En Zenith
            deberia ser escribir un archivo de datos. Esa es la diferencia que importa, y es la
            unica que justifica el proyecto.
          </p>
          <h3>La cola larga</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Nadie va a construir un optimizador dedicado para Terraria con el mod Calamity, para
            Valheim o para un juego con 8.000 jugadores. Ahi no hay competencia, y ahi es donde
            una plantilla escrita por la comunidad gana.
          </p>
          <h3>Supervivencia de la herramienta</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            El fork con herencia ataca el problema que mata a estas herramientas: que el autor
            original se aburre y todo queda desactualizado. Genshin Optimizer no ofrece nada
            equivalente.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>La pregunta abierta</h2>
        <Banner kind="info">
          Genshin Optimizer no construyo <b>Pando</b>, un motor de nodos etiquetados, por gusto.
          Lo construyo porque las reglas de un juego real no son ecuaciones: son condicionales,
          umbrales, estados y ordenes de aplicacion. Que ellos necesitaran un motor entero es la
          mejor evidencia disponible de que <b>una plantilla JSON declarativa puede quedarse
          corta</b>.
        </Banner>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Esa es la hipotesis central de Zenith y todavia no esta validada. La forma de validarla
          no es escribir mas documentacion: es tomar tres mecanicas reales y dificiles de juegos
          distintos e intentar expresarlas en el formato de plantilla. Si se puede, el proyecto
          se sostiene. Si no, el diseno tiene que cambiar ahora y no en el mes cuatro.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
          Esta demo cubre el primer tramo: el motor evalua formulas declaradas en la plantilla,
          incluidas no lineales, y resuelve dos juegos con estructuras distintas sin cambiar una
          linea de codigo. Lo que falta por probar es el techo de expresividad del formato.
        </p>
      </div>

      <div className="card">
        <h2>Nota sobre el stack</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Conviene tenerlo presente: las versiones que aparecen en el documento «Definicion de
          tecnologias» de Zenith coinciden una a una con las de Genshin Optimizer.
        </p>
        <pre className="code wrap">{`NX 20.5.0      Vite 6.0.0      TypeScript 5.7.3
React 18.3.1   i18next 23.6.0  tesseract.js 5.0.2`}</pre>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 11 }}>
          No tiene nada de malo tomar como referencia el stack del proyecto lider del rubro: es
          una decision razonable y defendible. Pero si un evaluador lo nota primero, la
          conversacion se vuelve incomoda. Es mucho mejor decirlo ustedes: <i>«estudiamos como lo
          resolvio Genshin Optimizer y adoptamos su stack porque esta validado en produccion; en
          lo que nos diferenciamos es en quien puede anadir un juego»</i>.
        </p>
        <p style={{ color: 'var(--dim)', fontSize: 12, marginBottom: 0 }}>
          Fuentes: repositorio y documentacion tecnica de frzyc/genshin-optimizer, consultadas en
          agosto de 2026.
        </p>
      </div>
    </>
  )
}
