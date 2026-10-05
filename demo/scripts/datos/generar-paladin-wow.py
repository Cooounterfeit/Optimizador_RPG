"""
Uso (desde la raiz del proyecto):
  mkdir -p /tmp/simc && cd /tmp/simc
  curl -O https://www.raidbots.com/static/data/live/talents.json
  curl -O https://www.raidbots.com/static/data/live/encounter-items.json
  curl -O https://www.raidbots.com/static/data/live/instances.json
  # De SimulationCraft (rama midnight, engine/dbc/generated): sc_scale_data.inc y rand_prop_points.inc,
  # Los valores del nivel de objeto 311 ya extraidos de ahi estan en scripts/datos/scale311.json.
  python3 scripts/datos/generar-paladin-wow.py

Genera las plantillas de World of Warcraft: Midnight — Paladin (3 especializaciones)
a partir de datos del juego:
  - talents.json (Raidbots, build 12.1.0.69933): arboles, posiciones, rangos, elecciones, umbrales.
  - encounter-items.json (Raidbots): botin de la banda de la Temporada 2 y piezas de catalizador.
  - SimulationCraft (rama midnight): puntos de propiedad aleatoria, multiplicadores de indice,
    valores de indice por nivel, curva de rendimientos decrecientes, coeficientes de maestria.
"""
import json, re, unicodedata, datetime

SIMC = '/tmp/simc'
OUT = 'public/examples'
ILVL = 311
BUILD = '12.1.0.69933'

talents = json.load(open(f'{SIMC}/talents.json'))
items_all = json.load(open(f'{SIMC}/encounter-items.json'))
instances = {i['id']: i for i in json.load(open(f'{SIMC}/instances.json'))}
scale = json.load(open('scripts/datos/scale311.json'))  # valores de SimulationCraft para el nivel de objeto 311
EPIC, CRM, STM = scale['epic'], scale['crm'], scale['stm']

# ----------------------------------------------------------------- objetos
RAID_ENCS = {e['id']: e['name'] for e in instances[-102]['encounters']}
INV = {1: 'head', 2: 'neck', 3: 'shoulder', 5: 'chest', 20: 'chest', 6: 'waist', 7: 'legs', 8: 'feet',
       9: 'wrist', 10: 'hands', 11: 'ring', 12: 'trinket', 13: 'onehand', 21: 'onehand', 14: 'shield', 16: 'back', 17: 'twohand'}

def slot_type(it):
    c, sc, t = it['itemClass'], it['itemSubClass'], it['inventoryType']
    if c == 2:
        return 0 if sc in (1, 5, 6, 8, 10) else 3
    if t in (1, 5, 7, 20): return 0
    if t in (3, 6, 8, 10, 12): return 1
    if t in (2, 11, 16, 9): return 2
    if t in (14, 22, 23): return 3
    return None

def cr_type(it):
    t = it['inventoryType']
    if t in (2, 11): return 3
    if t == 12: return 2
    if t in (13, 17, 21, 22, 15, 26): return 1
    return 0

STAT = {4: ['str'], 5: ['int'], 7: ['sta'], 32: ['crit'], 36: ['haste'], 49: ['mastery'], 40: ['vers'],
        71: ['str', 'int'], 72: ['str'], 74: ['str', 'int']}
RATINGS = {'crit', 'haste', 'mastery', 'vers'}

def item_stats(it):
    alloc = {}
    for s in it.get('stats', []):
        if s['id'] == 3:          # agilidad: el paladin no la usa
            continue
        if s['id'] not in STAT:
            return None           # estadistica desconocida para este modelo: no se inventa
        for k in STAT[s['id']]:
            alloc[k] = alloc.get(k, 0) + s['alloc']
    st = slot_type(it)
    if st is None: return None
    out = {}
    for k, a in alloc.items():
        v = a * EPIC[st] * 1e-4
        if k in RATINGS: v *= CRM[cr_type(it)]
        elif k == 'sta': v *= STM[cr_type(it)]
        out[k] = int(round(v))
    return out

def usable(it):
    c, sc, t = it['itemClass'], it['itemSubClass'], it['inventoryType']
    if it.get('allowableClasses') and 2 not in it['allowableClasses']: return False
    if c == 4 and sc == 4: return True                 # placas
    if c == 4 and t in (2, 11, 12, 16): return True    # cuello, anillo, abalorio, capa
    if c == 4 and sc == 6: return True                 # escudo
    if c == 2 and sc in (0, 1, 4, 5, 7, 8): return True  # hachas, mazas, espadas (1M y 2M)
    return False

raid = [i for i in items_all if 'inventoryType' in i and usable(i)
        and any(s.get('encounterId') in RAID_ENCS for s in i.get('sources', []))]
catalyst = [i for i in items_all if 'inventoryType' in i and 2 in (i.get('allowableClasses') or [])
            and any(s.get('instanceId') == -100 for s in i.get('sources', []))]
TIER_SET = 2062

def source_of(it):
    for s in it.get('sources', []):
        if s.get('encounterId') in RAID_ENCS:
            n = RAID_ENCS[s['encounterId']]
            return 'banda (otros enemigos)' if n == 'Trash Drop' else n
    return 'catalizador'

# ----------------------------------------------------------------- talentos
SPEC = {
    'Retribution': dict(key='reprension', es='Reprension', primary='str', coef=1.35, mastery='Juicio del Gran Senor (Highlord\'s Judgment)',
                        objetivo=('dano', 'Dano (modelo de estadisticas)', 'Fuerza multiplicada por critico, celeridad, versatilidad y maestria.')),
    'Protection': dict(key='proteccion', es='Proteccion', primary='str', coef=2.0, mastery='Baluarte divino (Divine Bulwark)',
                       objetivo=('dano', 'Dano (modelo de estadisticas)', 'Fuerza multiplicada por critico, celeridad, versatilidad y maestria.')),
    'Holy': dict(key='sagrado', es='Sagrado', primary='int', coef=1.5, mastery='Portador de la Luz (Lightbringer)',
                 objetivo=('sanacion', 'Sanacion (modelo de estadisticas)', 'Intelecto multiplicado por critico, celeridad, versatilidad y maestria (como si estuvieras cerca del objetivo).')),
}
HERO_ES = {'Herald of the Sun': 'Heraldo del Sol', 'Lightsmith': 'Forjador de Luz', 'Templar': 'Templario'}

# Talentos pasivos que modifican estadisticas (efectos leidos de los datos de hechizos):
#   Sanctified Plates 402964: Aguante +5% por rango.   Seal of Might 385450: Fuerza/Intelecto +2% y maestria +2 por rango.
#   Holy Aegis 385515: critico +4%.                    Seek Deliverance 1271016: maestria +5 (sin Colera vengadora activa).
STAT_TALENTS = {
    402964: {'staPct': 5},
    385450: {'primPct': 2, 'masteryPts': 2},
    385515: {'critExtra': 4},
    1271016: {'masteryPts': 5},
}

def slug(name):
    s = unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^A-Za-z0-9]+', '_', s).strip('_').lower()
    if not s or s[0].isdigit(): s = 'h_' + s
    return s

CARD_W, CARD_H, GAP = 200, 100, 12

def layout(nodes_xy):
    """nodes_xy: lista de (id, posX, posY, desplazamiento_de_eleccion). Busca la escala minima sin solapes."""
    if not nodes_xy: return {}
    mx = min(p[1] for p in nodes_xy); my = min(p[2] for p in nodes_xy)
    def solapa(pos):
        v = list(pos.values())
        for a in range(len(v)):
            for b in range(a + 1, len(v)):
                if abs(v[a][0] - v[b][0]) < CARD_W + GAP and abs(v[a][1] - v[b][1]) < CARD_H + GAP:
                    return True
        return False
    for k in range(60):
        sx, sy = 0.37 + 0.02 * k, 0.38 + 0.02 * k
        pos = {i: ((x - mx) * sx, (y - my) * sy + off * (CARD_H + GAP + 4)) for i, x, y, off in nodes_xy}
        if not solapa(pos):
            return {i: (round(x), round(y)) for i, (x, y) in pos.items()}
    raise RuntimeError('no se pudo ubicar sin solapes')

def build_tree(tree_id, tree_name, nodes, budget, taken_ids, spec_key, desc, choice_prefix, free_choice_group=None):
    """Convierte nodos de Raidbots a SkillNode. Devuelve (tree, idmap)."""
    idmap = {}          # nodeId del juego -> [ids nuestros] (2 si es eleccion)
    out = []
    xy = []
    for n in nodes:
        entries = n['entries'] if n['type'] == 'choice' else [n['entries'][0]]
        ours = []
        for k, e in enumerate(entries):
            base = slug(e['name'])
            nid = base
            c = 2
            while nid in taken_ids: nid = f'{base}_{c}'; c += 1
            taken_ids.add(nid)
            ours.append((nid, e, k))
        idmap[n['id']] = [o[0] for o in ours]
        for nid, e, k in ours:
            xy.append((nid, n['posX'], n['posY'], k))
    pos = layout(xy)
    for n in nodes:
        entries = n['entries'] if n['type'] == 'choice' else [n['entries'][0]]
        parents = [o for p in n.get('prev', []) for o in idmap.get(p, [])]
        for k, e in enumerate(entries):
            nid = idmap[n['id']][k]
            node = {'id': nid, 'name': e['name']}
            free = bool(n.get('freeNode'))
            if free: node['cost'] = 0
            mr = n['maxRanks'] if n['type'] != 'choice' else e.get('maxRanks', 1)
            if mr > 1: node['maxRank'] = mr
            if parents: node['requiresAny'] = parents
            if n.get('reqPoints'): node['requiresPoints'] = n['reqPoints']
            if n['type'] == 'choice': node['choiceGroup'] = f'{choice_prefix}_{n["id"]}'
            if free and free_choice_group: node['choiceGroup'] = free_choice_group
            eff = STAT_TALENTS.get(e.get('spellId'))
            if eff:
                node['effects'] = {('primPct' if k2 == 'primPct' else k2): v for k2, v in eff.items()}
            extra = []
            if free: extra.append('Nodo gratuito.')
            if n['type'] == 'tiered': extra.append('Talento apice: 4 rangos (se desbloquean en los niveles 81, 84 y 90).')
            if eff: extra.append('Sus efectos sobre estadisticas estan modelados.')
            else: extra.append('Efecto de habilidad: no cambia estadisticas, no se modela en el calculo.')
            if e.get('spellId'): extra.append(f'Descripcion oficial: es.wowhead.com/spell={e["spellId"]}')
            node['description'] = ' '.join(extra)
            node['x'], node['y'] = pos[nid]
            out.append(node)
    tree = {'id': tree_id, 'name': tree_name, 'description': desc, 'budget': budget, 'requireFullRanks': True, 'nodes': out}
    return tree

def dr(expr, pts):
    # curva 21024 (indices secundarios): 30→30, 40→39, 50→47, 60→54, 80→66, 100→76, 200→126
    x = expr
    return (f'min({x}, 30 + ({x} - 30) * 0.9, 39 + ({x} - 40) * 0.8, 47 + ({x} - 50) * 0.7, '
            f'54 + ({x} - 60) * 0.6, 66 + ({x} - 80) * 0.5)')

def dr_mit(x):
    # curva 21035 (versatilidad, mitigacion): 15→15, 20→19.5, 25→23.5, 30→27, 40→33, 50→38, 100→63
    return (f'min({x}, 15 + ({x} - 15) * 0.9, 19.5 + ({x} - 20) * 0.8, 23.5 + ({x} - 25) * 0.7, '
            f'27 + ({x} - 30) * 0.6, 33 + ({x} - 40) * 0.5)')

def make(spec_name):
    S = SPEC[spec_name]
    t = [x for x in talents if x['className'] == 'Paladin' and x['specName'] == spec_name][0]
    prim = S['primary']
    prim_es = 'Fuerza' if prim == 'str' else 'Intelecto'

    stats = [
        {'id': 'str', 'name': 'Fuerza', 'unit': 'flat', 'group': 'Atributos'},
        {'id': 'int', 'name': 'Intelecto', 'unit': 'flat', 'group': 'Atributos'},
        {'id': 'sta', 'name': 'Aguante', 'unit': 'flat', 'group': 'Atributos'},
        {'id': 'crit', 'name': 'Golpe critico (indice)', 'unit': 'flat', 'group': 'Indices secundarios'},
        {'id': 'haste', 'name': 'Celeridad (indice)', 'unit': 'flat', 'group': 'Indices secundarios'},
        {'id': 'mastery', 'name': 'Maestria (indice)', 'unit': 'flat', 'group': 'Indices secundarios'},
        {'id': 'vers', 'name': 'Versatilidad (indice)', 'unit': 'flat', 'group': 'Indices secundarios'},
        {'id': 'primPct', 'name': f'{prim_es} %', 'unit': 'percent', 'group': 'Bonificaciones de talentos'},
        {'id': 'staPct', 'name': 'Aguante %', 'unit': 'percent', 'group': 'Bonificaciones de talentos'},
        {'id': 'critExtra', 'name': 'Critico extra %', 'unit': 'percent', 'group': 'Bonificaciones de talentos'},
        {'id': 'masteryPts', 'name': 'Maestria extra (puntos)', 'unit': 'flat', 'group': 'Bonificaciones de talentos'},
    ]
    derived = [
        {'id': 'primario', 'name': f'{prim_es} total', 'group': 'Personaje',
         'formula': f'(base_{prim} + {prim}) * (1 + primPct / 100) * base_placas'},
        {'id': 'aguanteTotal', 'name': 'Aguante total', 'group': 'Personaje',
         'formula': '(base_sta + sta) * (1 + staPct / 100)'},
        {'id': 'vida', 'name': 'Salud', 'group': 'Personaje', 'formula': 'aguanteTotal * base_saludPorAguante'},
        {'id': 'critPct', 'name': 'Probabilidad de critico', 'unit': '%', 'group': 'Ofensiva',
         'formula': 'base_critBase + critExtra + ' + dr('crit / base_indiceCrit', False)},
        {'id': 'celeridadPct', 'name': 'Celeridad', 'unit': '%', 'group': 'Ofensiva',
         'formula': dr('haste / base_indiceCeleridad', False)},
        {'id': 'maestriaPts', 'name': 'Maestria (puntos)', 'group': 'Ofensiva',
         'formula': 'base_maestriaBase + masteryPts + ' + dr('mastery / base_indiceMaestria', True)},
        {'id': 'maestriaPct', 'name': f'Maestria: {S["mastery"]}', 'unit': '%', 'group': 'Ofensiva',
         'formula': 'maestriaPts * base_coefMaestria'},
        {'id': 'versPct', 'name': 'Versatilidad (dano y sanacion)', 'unit': '%', 'group': 'Ofensiva',
         'formula': dr('vers / base_indiceVers', False)},
        {'id': 'versMitPct', 'name': 'Versatilidad (reduccion de dano)', 'unit': '%', 'group': 'Defensa',
         'formula': dr_mit('vers / base_indiceVersMit')},
    ]
    oid, oname, odesc = S['objetivo']
    objectives = [
        {'id': oid, 'name': oname, 'description': odesc + ' No simula la rotacion: compara equipos por el valor de sus estadisticas.',
         'kind': 'nonlinear', 'monotonic': True, 'decimals': 0,
         'formula': 'primario * (1 + critPct / 100) * (1 + celeridadPct / 100) * (1 + versPct / 100) * (1 + maestriaPct / 100)'},
        {'id': 'vidaEfectiva', 'name': 'Vida efectiva', 'description': 'Salud dividida por el dano que deja pasar la versatilidad.',
         'kind': 'nonlinear', 'monotonic': True, 'decimals': 0, 'formula': 'vida / (1 - versMitPct / 100)'},
    ]
    if spec_name == 'Protection':
        objectives.reverse()
    base = {'str': 620, 'int': 620, 'sta': 4600,
            'critBase': 5, 'maestriaBase': 8, 'coefMaestria': S['coef'], 'placas': 1.05, 'saludPorAguante': 20,
            'indiceCrit': 46, 'indiceCeleridad': 44, 'indiceMaestria': 46, 'indiceVers': 54, 'indiceVersMit': 108}

    two_hand = spec_name == 'Retribution'
    slots = [
        {'id': 'head', 'name': 'Cabeza'}, {'id': 'neck', 'name': 'Cuello'}, {'id': 'shoulder', 'name': 'Hombros'},
        {'id': 'back', 'name': 'Espalda'}, {'id': 'chest', 'name': 'Pecho'}, {'id': 'wrist', 'name': 'Munecas'},
        {'id': 'hands', 'name': 'Manos'}, {'id': 'waist', 'name': 'Cintura'}, {'id': 'legs', 'name': 'Piernas'},
        {'id': 'feet', 'name': 'Pies'}, {'id': 'ring1', 'name': 'Dedo 1'}, {'id': 'ring2', 'name': 'Dedo 2'},
        {'id': 'trinket1', 'name': 'Abalorio 1'}, {'id': 'trinket2', 'name': 'Abalorio 2'},
        {'id': 'mainhand', 'name': 'Arma a dos manos' if two_hand else 'Mano derecha'},
    ]
    if not two_hand:
        slots.append({'id': 'offhand', 'name': 'Mano izquierda (escudo)'})

    items = []
    skipped = []
    for it in raid + catalyst:
        kind = INV.get(it['inventoryType'])
        if kind is None: continue
        if two_hand and kind in ('onehand', 'shield'): continue
        if not two_hand and kind == 'twohand': continue
        st = item_stats(it)
        if st is None:
            skipped.append(it['name']); continue
        # Solo piezas con el atributo principal de la especializacion o sin atributo principal (cuello, anillos, abalorios de indice)
        has_prim = prim in st
        other_prim = ('int' if prim == 'str' else 'str') in st
        if not has_prim and other_prim: continue
        if not has_prim and kind in ('onehand', 'twohand', 'shield'): continue
        if not has_prim and kind not in ('neck', 'ring', 'trinket'): continue
        # el otro atributo principal no aporta nada a esta especializacion: se quita para no confundir
        for k in ('str', 'int'):
            if k != prim: st.pop(k, None)
        slot = {'head': 'head', 'neck': 'neck', 'shoulder': 'shoulder', 'back': 'back', 'chest': 'chest', 'wrist': 'wrist',
                'hands': 'hands', 'waist': 'waist', 'legs': 'legs', 'feet': 'feet', 'ring': 'ring1', 'trinket': 'trinket1',
                'onehand': 'mainhand', 'twohand': 'mainhand', 'shield': 'offhand'}[kind]
        item = {'id': f'wow{it["id"]}', 'slot': slot, 'setId': 'consagrada' if it.get('itemSetId') == TIER_SET else None,
                'name': it['name'], 'rarity': 4, 'level': ILVL, 'stats': st}
        if kind == 'ring': item['slots'] = ['ring2']
        if kind == 'trinket': item['slots'] = ['trinket2']
        items.append(item)

    taken = set()
    trees = [build_tree('clase', 'Paladin (arbol de clase)', t['classNodes'], 34, taken, S['key'],
                        '34 puntos a nivel 90. Los nodos gratis se toman sin gastar puntos. Umbrales de 8 y 23 puntos.', 'c')]
    trees.append(build_tree('especializacion', f'{S["es"]} (arbol de especializacion)', t['specNodes'], 34, taken, S['key'],
                            '34 puntos a nivel 90, incluido el talento apice de 4 rangos. Umbrales de 8 y 20 puntos.', 'e'))
    sub = {e['traitSubTreeId']: e['name'] for e in t['subTreeNodes'][0]['entries']}
    for sid, name in sub.items():
        nodes = [n for n in t['heroNodes'] if n.get('subTreeId') == sid]
        trees.append(build_tree(f'heroe_{slug(name)}', f'{HERO_ES.get(name, name)} ({name}) — talentos de heroe', nodes, 13, taken, S['key'],
                                'Solo se puede usar una clase de heroe: su primer nodo (gratis) es una eleccion con el de la otra. 13 puntos a nivel 90.',
                                'h', free_choice_group='clase_de_heroe'))

    notes = f"""World of Warcraft: Midnight — Paladin {S['es']} ({spec_name}).
Datos del juego, build {BUILD} (parche 12.1, Temporada 2).

QUE ES EXACTO
- Arboles de talentos: nodos, posiciones, rangos, elecciones, nodos gratis, umbrales de puntos (8/23 en clase, 8/20 en especializacion),
  talento apice y las dos clases de heroe de la especializacion. Fuente: datos de talentos de Raidbots para la build {BUILD}.
  Regla de WoW: para desbloquear un nodo basta con UNO de los nodos que llegan a el, y tiene que estar completo.
- Objetos: botin real de la banda de la Temporada 2 y las piezas del conjunto de catalizador "Radiance of the Consecrated Flame",
  con sus estadisticas calculadas a nivel de objeto {ILVL} (Heroe 3/6) con la misma formula que SimulationCraft
  (puntos de propiedad aleatoria x asignacion, multiplicadores de indice y de aguante por nivel de objeto).
- Conversion de indices a porcentaje a nivel 90: critico 46, celeridad 44, maestria 46, versatilidad 54 (108 para la reduccion de dano).
- Rendimientos decrecientes de los indices secundarios (curva oficial: 30%→30, 40→39, 50→47, 60→54, 80→66, 100→76).
- Coeficiente de maestria de {S['es']}: {S['coef']} por punto. Maestria base: 8 puntos.
- Talentos pasivos que cambian estadisticas: Sanctified Plates (+5% aguante por rango), Seal of Might (+2% {prim_es.lower()} y +2 maestria por rango),
  Holy Aegis (+4% critico){', Seek Deliverance (+5 maestria)' if spec_name == 'Holy' else ''}.

QUE ES UNA APROXIMACION (dicho claro)
- El objetivo "{oname}" NO simula la rotacion: multiplica el atributo principal por (1+critico)(1+celeridad)(1+versatilidad)(1+maestria).
  Sirve para comparar equipos por sus estadisticas, no para predecir el DPS real. Para eso existe SimulationCraft.
- La maestria se aplica como si afectara a todo el dano o sanacion.
- Los efectos especiales de abalorios, las bonificaciones del conjunto (son hechizos), los engarces, los encantamientos,
  el dano del arma y la armadura no se modelan. Las piezas tienen solo sus estadisticas.
- Atributos base del personaje (humano, nivel 90, sin equipo): Fuerza 620, Intelecto 620, Aguante 4600; critico base 5%;
  especializacion en placas +5% al atributo principal; 20 de salud por punto de aguante.
- Los nombres de talentos y objetos estan en ingles (asi vienen en los datos); la descripcion de cada talento enlaza a Wowhead en espanol.

Piezas omitidas por usar estadisticas que este modelo no conoce: {', '.join(sorted(set(skipped))) or 'ninguna'}.
"""
    template = {
        'schemaVersion': '0.1', 'gameId': f'wow-paladin-{S["key"]}',
        'name': f'WoW Midnight · Paladin {S["es"]}',
        'description': f'Clase completa: arbol de clase, {S["es"].lower()}, talento apice y dos clases de heroe (build {BUILD}). Botin de la banda de la Temporada 2 a nivel {ILVL}.',
        'category': 'MMORPG', 'accent': '#f2c14e',
        'stats': stats, 'slots': slots,
        'sets': [{'id': 'consagrada', 'name': 'Radiance of the Consecrated Flame', 'tiers': [
            {'pieces': 2, 'label': '2 piezas (hechizo, no modelado)', 'effects': {}},
            {'pieces': 4, 'label': '4 piezas (hechizo, no modelado)', 'effects': {}}]}],
        'derived': derived, 'objectives': objectives,
        'baseProfiles': [{'id': 'humano90', 'name': f'Paladin {S["es"]} · humano nivel 90', 'base': base, 'levelable': [],
                          'labels': {'critBase': 'Critico base %', 'maestriaBase': 'Maestria base'}}],
        'constrainableStats': ['crit', 'haste', 'mastery', 'vers', 'sta'],
        'skillTrees': trees,
        'notes': notes,
    }
    pkg = {'zenith': '0.1', 'exportedAt': datetime.datetime(2026, 10, 4).isoformat() + 'Z', 'template': template, 'items': items}
    fn = f'wow-paladin-{S["key"]}.zenith.json'
    json.dump(pkg, open(f'{OUT}/{fn}', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    n_nodes = sum(len(tr['nodes']) for tr in trees)
    print(fn, 'objetos', len(items), 'nodos', n_nodes, 'arboles', [(tr['name'], len(tr['nodes'])) for tr in trees], 'omitidos', sorted(set(skipped)))
    return fn, template, len(items)

idx = json.load(open(f'{OUT}/index.json'))
idx = [e for e in idx if not e['id'].startswith('wow-paladin')]
for spec in ('Retribution', 'Protection', 'Holy'):
    fn, tpl, n = make(spec)
    idx.append({'id': tpl['gameId'], 'file': fn, 'name': tpl['name'], 'items': n, 'description': tpl['description']})
json.dump(idx, open(f'{OUT}/index.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
