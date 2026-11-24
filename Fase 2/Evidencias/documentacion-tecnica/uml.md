# Diagramas UML

Este documento presenta dos vistas del sistema. La primera es el contrato que permite que el motor sirva para cualquier juego. La segunda corresponde a las dos funcionalidades principales en el tiempo. Se trata del alta de usuario y del cálculo de la mejor build.

Los diagramas se escriben en Mermaid. De esta forma se versionan junto al código y se actualizan
mediante un pull request. Ninguno se dibuja a mano en una herramienta externa, donde quedaría
desactualizado en la siguiente iteración.

## Diagrama de clases: el contrato del juego

`GameTemplate` es el único dato específico de un juego. El motor no conoce Genshin, WoW ni Elden
Ring: conoce esta estructura. El resto de los elementos (interfaz, listado de atributos, orden de
cálculo y objetivos) se deriva de ella.

```mermaid
classDiagram
    direction LR

    class GameTemplate {
        +string schemaVersion
        +string gameId
        +string name
        +StatDef[] stats
        +SlotDef[] slots
        +SetDef[] sets
        +DerivedDef[] derived
        +ObjectiveDef[] objectives
        +BaseProfile[] baseProfiles
        +string[] constrainableStats
        +Budget[] budgets
        +DamageCalculator damageCalculator
        +GameExtensions extensions
    }

    class StatDef {
        +string id
        +string name
        +string kind
        +string aggregate
        +string group
    }

    class SlotDef {
        +string id
        +string name
        +boolean optional
    }

    class SetDef {
        +string id
        +string name
        +SetTier[] tiers
    }

    class SetTier {
        +number pieces
        +string label
        +Record effects
    }

    class DerivedDef {
        +string id
        +string formula
        +string[] dependsOn
    }

    class ObjectiveDef {
        +string id
        +string name
        +string formula
        +boolean maximize
    }

    class BaseProfile {
        +string id
        +string name
        +Record stats
        +Allocation leveling
    }

    class DamageCalculator {
        +DamageCalculatorField[] fields
        +string formula
    }

    class Item {
        +string id
        +string slot
        +string[] slots
        +string setId
        +string name
        +Record stats
        +Record requires
        +string exclusiveGroup
    }

    class SolveRequest {
        +GameTemplate template
        +Item[] items
        +string profileId
        +string objectiveId
        +Constraint[] constraints
        +number topN
        +SkillSelection skills
    }

    class Constraint {
        +string statId
        +number min
        +number max
    }

    class BuildResult {
        +Item[] pieces
        +Record stats
        +number score
        +SetBonus[] sets
    }

    class SolveStats {
        +number totalCombinations
        +number searchSpace
        +number boundFiltered
        +boolean provenOptimal
        +string stoppedBy
    }

    class SkillTreeDef {
        +string id
        +string name
        +SkillNode[] nodes
    }

    class SkillNode {
        +string id
        +number maxRank
        +string[] requires
        +Record effects
    }

    GameTemplate "1" *-- "*" StatDef : declara atributos
    GameTemplate "1" *-- "*" SlotDef : declara ranuras
    GameTemplate "1" *-- "*" SetDef : declara conjuntos
    GameTemplate "1" *-- "*" DerivedDef : declara derivadas
    GameTemplate "1" *-- "*" ObjectiveDef : declara objetivos
    GameTemplate "1" *-- "*" BaseProfile : declara perfiles
    GameTemplate "1" *-- "0..1" DamageCalculator : opcional
    SetDef "1" *-- "*" SetTier
    SkillTreeDef "1" *-- "*" SkillNode

    SolveRequest "1" *-- "1" GameTemplate
    SolveRequest "1" *-- "*" Item
    SolveRequest "1" *-- "*" Constraint
    SolveRequest "1" *-- "0..1" SkillSelection
    SolveRequest ..> BuildResult : produce
    SolveRequest ..> SolveStats : informa

    Item ..> SetDef : setId
    Item ..> SlotDef : slot / slots

    class Solver {
        <<core-engine>>
        +solve(request, hooks) SolveResponse
        +solveBruteForceTop(request) SolveResponse
        +explainBuild(request, build)
    }

    class Evaluator {
        <<core-engine>>
        +evaluar(template, items, profile, selection)
        +scorer(template, objectiveId)
        +projectProfile(template, allocation)
        +evaluateCalculator(template, values)
    }

    class Validator {
        <<core-engine>>
        +validateTemplate(template) ValidationReport
    }

    Solver ..> SolveRequest : consume
    Solver ..> Evaluator : delega puntaje
    Validator ..> GameTemplate : valida antes de usar
```

**Justificación del diseño.** `Item` no conoce `GameTemplate`: solo declara ranura, conjunto y
estadísticas por clave. Esta indirección permite que el mismo binario del motor resuelva siete plantillas de cinco juegos distintos. No requiere una línea de código condicional por juego. Cuando una
pieza requiere un atributo propio del género, se declara en `extensions`, que el núcleo no
interpreta.

`SolveRequest` es serializable. Viaja por `postMessage` a un Web Worker sin transformación, de modo
que el motor nunca bloquea la interfaz.

## Secuencia 1: registro de usuario con confirmación por correo

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant R as RegisterPage
    participant A as Supabase Auth (GoTrue)
    participant M as Servicio de correo
    participant P as AuthProvider
    participant DB as Postgres (RLS)

    U->>R: nombre, correo y contraseña
    R->>R: valida el formulario
    R->>A: signUp({ email, password, options.emailRedirectTo: origin })
    A->>A: valida dominio y políticas de contraseña
    alt correo ya registrado
        A-->>R: user sin identidades
        R-->>U: "esa cuenta ya existe"
    else registro válido
        A->>DB: insert en auth.users
        DB->>DB: trigger on_auth_user_created
        Note over DB: crea profiles y subscriptions<br/>en la misma transacción
        A->>M: envía enlace de confirmación
        A-->>R: user, session = null
        R-->>U: "revisa tu correo para confirmarla"
    end

    U->>M: abre el enlace
    M-->>U: redirige a la app con el token
    U->>P: carga la aplicación
    P->>P: detectSessionInUrl lee el token de la URL
    P->>A: intercambia el token por una sesión
    A-->>P: access_token + refresh_token
    P->>P: onAuthStateChange(SIGNED_IN)
    P-->>U: sesión activa, redirige al catálogo
```

**Qué demuestra este diagrama.** El perfil no lo crea el cliente. Lo crea un trigger cuando nace el
usuario en `auth.users`. Por esta razón no existe una ventana en la que haya una cuenta sin perfil.
El `redirect_to` que viaja en el registro corresponde al origen real desde donde se registró
(producción, preview o local). Esto permite que el enlace funcione en los tres entornos.

**Modo de falla conocido.** Está documentado en `supabase/README.md`. El SMTP integrado de Supabase
limita los envíos por hora y devuelve `429 over_email_send_rate_limit`. Con la confirmación
activada, el usuario no puede ingresar hasta que el correo llegue. Para una demostración se requiere
un SMTP propio.

## Secuencia 2: cálculo de la mejor build

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant W as OptimizerWorkspace
    participant H as useOptimizer
    participant K as optimizer.worker
    participant S as Solver (core-engine)
    participant E as Evaluator
    participant D as IndexedDB (Dexie)

    U->>W: elige objetivo, perfil y restricciones
    W->>D: lee inventario, equipo y habilidades
    D-->>W: items + selección
    W->>W: muestra el tamaño del espacio de búsqueda
    U->>W: "optimizar"
    W->>H: run(request)
    H->>K: postMessage({ type: 'solve', request })
    K->>S: solve(request, hooks)

    loop ramificación y poda
        S->>E: evalúa una combinación completa
        E-->>S: puntaje del objetivo
        S->>S: actualiza la cota del top N
        S->>S: descarta ramas que no pueden superarla
        opt cada cierto número de nodos
            S-->>K: onProgress({ evaluadas, podadas, mejor })
            K-->>H: postMessage({ type: 'progress' })
            H-->>W: barra de avance
        end
    end

    alt el usuario cancela
        U->>W: cancelar
        W->>H: cancel()
        H->>K: terminate()
        H-->>W: resultado parcial, provenOptimal = false
    else búsqueda completa
        S-->>K: { builds, stats }
        K-->>H: postMessage({ type: 'done', result })
        H-->>W: mejor build + estadísticas del solver
        W-->>U: build óptima con desglose por pieza
    end

    opt el usuario pide auditar el cálculo
        W->>K: postMessage({ type: 'evaluate', request, equipment })
        K->>E: evaluar(template, items, equipment, profileId, skills)
        E-->>K: evaluación con el desglose del objetivo
        K-->>W: postMessage({ type: 'evaluated', evaluation })
        W-->>U: de dónde sale cada número
    end
```

**Qué demuestra este diagrama.** El cálculo ocurre en el navegador, dentro de un Web Worker, y la
interfaz nunca se bloquea. El motor informa progreso y cota, de modo que el usuario observa la
exploración y el podado en tiempo real. Un resultado no se declara óptimo por confianza.
`provenOptimal` indica que la búsqueda agotó el espacio. Cuando el usuario cancela, el resultado
parcial se marca como tal y no se presenta como óptimo.

La evaluación y la auditoría del cálculo utilizan el mismo Worker, mediante el mensaje `evaluate`.
No existe un segundo Worker. El Worker atiende un mensaje a la vez. El modo `evaluate` no ejecuta
búsqueda: solo puntúa un equipo ya equipado. Esto permite auditar un número sin lanzar una nueva
optimización.
