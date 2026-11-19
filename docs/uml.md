# Diagramas UML

Dos vistas del sistema: el **contrato** que hace que el motor sirva para cualquier juego, y
las **dos funcionalidades principales** en el tiempo —el alta de usuario y el cálculo de la
mejor build—.

Los diagramas se escriben en Mermaid para que vivan versionados junto al código y se
actualicen con un pull request. Ninguno se dibuja a mano en una herramienta externa, donde
quedaría desactualizado en la siguiente iteración.

## Diagrama de clases: el contrato del juego

`GameTemplate` es el único dato específico de un juego. El motor no conoce Genshin, WoW ni
Elden Ring: conoce esta estructura. Todo lo demás —interface, listado de atributos, orden de
cálculo, objetivos— se deriva de ella.

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

**Por qué esta forma.** `Item` no conoce `GameTemplate`: solo declara ranura, conjunto y
estadísticas por clave. Esa indirección es la que permite que el mismo binario del motor
resuelva cuatro juegos distintos sin una línea de código condicional por juego. Cuando una
pieza necesita algo propio del género, va en `extensions`, que el core **no interpreta**.

`SolveRequest` es serializable: viaja por `postMessage` a un Web Worker sin transformación,
así que el motor nunca bloquea la interfaz.

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

**Lo que este diagrama demuestra:** el perfil no lo crea el cliente. Lo crea un trigger cuando
nace el usuario en `auth.users`, así que no existe una ventana en la que haya una cuenta sin
perfil. Y el `redirect_to` que viaja en el registro es el origen real desde donde se registró
—producción, preview o local—, que es lo que hace que el enlace funcione en los tres entornos.

**El modo de falla conocido** está en `supabase/README.md`: el SMTP integrado de Supabase
limita los envíos por hora y devuelve `429 over_email_send_rate_limit`. Con confirmación
activada, el usuario queda sin poder entrar hasta que el correo llegue. Para una demo hace
falta un SMTP propio.

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
        W->>E: evaluar(...) en un segundo worker
        E-->>W: grafo de dependencias del objetivo
        W-->>U: de dónde sale cada número
    end
```

**Lo que este diagrama demuestra:** el cálculo ocurre en el navegador, en un Web Worker, y la
interfaz nunca se bloquea. El motor informa progreso *y* cota, así que el usuario ve crecer la
exploración y el podado en vivo: cuando el resultado dice "es la mejor combinación posible",
no es una expresión de confianza, es que `provenOptimal` salió de haber agotado el espacio. Y
cuando el usuario cancela, el resultado parcial se marca como tal en lugar de presentarse como
óptimo.

La evaluación del perfil y del daño usa un segundo worker separado del solver, para que
auditar un número no interrumpa una búsqueda en curso.
