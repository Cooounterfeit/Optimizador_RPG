"""Genera public/examples/rpg.zenith.json: RPG clasico con niveles (TEC-12, SIM-02..04).
Datos inventados. El Guerrero reproduce el ejemplo del Jira: nivel 10, Fuerza 20,
crece 1.6 por nivel -> nivel 15 = 28 (+8).
    python scripts/datos/generar-rpg.py
"""
import json, os

STATS = [
    ("atk", "Ataque de arma", "flat", "Ataque"),
    ("magia", "Poder magico", "flat", "Ataque"),
    ("critico", "Critico", "percent", "Ataque"),
    ("def", "Defensa", "flat", "Defensa"),
    ("vidaExtra", "Vida adicional", "flat", "Defensa"),
    ("manaExtra", "Mana adicional", "flat", "Recursos"),
]
SLOTS = [("arma", "Arma"), ("casco", "Casco"), ("armadura", "Armadura"), ("accesorio", "Accesorio")]
LABELS = {"nivel": "Nivel", "fuerza": "Fuerza", "destreza": "Destreza", "inteligencia": "Inteligencia",
          "vida": "Vida base", "mana": "Mana base"}

def perfil(pid, name, nivel, f, d, i, vida, mana, cf, cd, ci, cv, cm):
    return {"id": pid, "name": name, "base": {
        "nivel": nivel, "fuerza": f, "destreza": d, "inteligencia": i, "vida": vida, "mana": mana,
        "crecFuerza": cf, "crecDestreza": cd, "crecInteligencia": ci, "crecVida": cv, "crecMana": cm},
        "levelable": [], "labels": dict(LABELS, crecFuerza="Crecimiento de fuerza",
            crecDestreza="Crecimiento de destreza", crecInteligencia="Crecimiento de inteligencia",
            crecVida="Crecimiento de vida", crecMana="Crecimiento de mana")}

template = {
    "schemaVersion": "0.1", "gameId": "rpg", "name": "RPG clasico (con niveles)",
    "description": "Tres clases con curvas de crecimiento distintas. Proyecta tus estadisticas a cualquier nivel, guarda tu historial y compara pasado, presente y futuro.",
    "stats": [{"id": a, "name": b, "unit": c, "group": g} for a, b, c, g in STATS],
    "slots": [{"id": a, "name": b} for a, b in SLOTS],
    "sets": [],
    "derived": [
        {"id": "ataqueFisico", "name": "Ataque fisico", "group": "Ataque",
         "formula": "atk * (1 + base_fuerza / 50) + base_destreza * 0.5"},
        {"id": "ataqueMagico", "name": "Ataque magico", "group": "Ataque",
         "formula": "magia * (1 + base_inteligencia / 40)"},
        {"id": "probCritico", "name": "Probabilidad de critico", "group": "Ataque", "unit": "%",
         "formula": "min(5 + critico + base_destreza * 0.4, 100)"},
        {"id": "vidaTotal", "name": "Vida total", "group": "Defensa", "formula": "base_vida + vidaExtra"},
        {"id": "manaTotal", "name": "Mana total", "group": "Recursos", "formula": "base_mana + manaExtra"},
    ],
    "objectives": [
        {"id": "fisico", "name": "Dano fisico", "kind": "nonlinear", "monotonic": True, "decimals": 1,
         "description": "Ataque fisico con el critico promedio (los criticos hacen x1.5).",
         "formula": "ataqueFisico * (1 + probCritico / 100 * 0.5)"},
        {"id": "magico", "name": "Dano magico", "kind": "nonlinear", "monotonic": True, "decimals": 1,
         "description": "Ataque magico limitado por el mana: sin mana suficiente pierdes hechizos.",
         "formula": "ataqueMagico * min(manaTotal / 150, 1.5)"},
        {"id": "aguante", "name": "Supervivencia", "kind": "linear", "monotonic": True, "decimals": 0,
         "description": "Vida total mas la defensa ponderada.",
         "formula": "vidaTotal + def * 8"},
    ],
    "baseProfiles": [
        perfil("guerrero", "Guerrero", 10, 20, 15, 12, 180, 40, 1.6, 1.0, 0.4, 12, 2),
        perfil("mago", "Mago", 8, 8, 11, 24, 110, 120, 0.4, 0.8, 2.0, 6, 9),
        perfil("picaro", "Picaro", 12, 14, 26, 13, 150, 60, 0.8, 1.8, 0.6, 9, 4),
    ],
    "constrainableStats": ["def", "critico", "vidaExtra"],
    "budgets": [],
    "leveling": {
        "levelKey": "nivel", "min": 1, "max": 60,
        "growth": {
            "fuerza": "base_crecFuerza",
            "destreza": "base_crecDestreza",
            "inteligencia": "base_crecInteligencia",
            "vida": "base_crecVida + floor(nivel / 10) * 4",
            "mana": "base_crecMana",
        },
    },
    "notes": "Plantilla de demostracion con datos inventados para la proyeccion por nivel. Cada clase guarda en su perfil cuanto crece cada atributo por nivel (crecFuerza, etc.) y la plantilla declara las curvas en 'leveling.growth'. La vida acelera: cada 10 niveles gana 4 puntos extra por nivel. Varias armas exigen atributos que el personaje alcanza al subir, asi que la build optima cambia con el nivel.",
}

I = []
def item(slot, name, stats, req=None):
    I.append({"id": f"r{len(I)+1}", "slot": slot, "setId": None, "name": name, "stats": stats,
              **({"requires": req} if req else {})})

item("arma", "Espada corta", {"atk": 18, "critico": 3})
item("arma", "Espada larga", {"atk": 30, "critico": 2}, {"fuerza": 22})
item("arma", "Mandoble", {"atk": 46}, {"fuerza": 28})
item("arma", "Hacha de guerra", {"atk": 58, "def": 2}, {"fuerza": 36})
item("arma", "Daga gemela", {"atk": 20, "critico": 9}, {"destreza": 24})
item("arma", "Estoque", {"atk": 28, "critico": 12}, {"destreza": 32})
item("arma", "Baculo de roble", {"magia": 26, "manaExtra": 20})
item("arma", "Cetro arcano", {"magia": 44, "manaExtra": 35}, {"inteligencia": 30})
item("arma", "Orbe del vacio", {"magia": 62, "manaExtra": 10}, {"inteligencia": 40})
item("casco", "Capucha de cuero", {"def": 3, "critico": 3})
item("casco", "Yelmo de hierro", {"def": 8, "vidaExtra": 20}, {"fuerza": 18})
item("casco", "Corona de sabio", {"def": 2, "magia": 8, "manaExtra": 30}, {"inteligencia": 20})
item("armadura", "Tunica", {"def": 4, "manaExtra": 25})
item("armadura", "Cota de mallas", {"def": 14, "vidaExtra": 30}, {"fuerza": 20})
item("armadura", "Placas de caballero", {"def": 24, "vidaExtra": 60}, {"fuerza": 30})
item("armadura", "Jubon de sombras", {"def": 9, "critico": 6}, {"destreza": 22})
item("accesorio", "Anillo de cobre", {"vidaExtra": 15})
item("accesorio", "Amuleto de furia", {"atk": 8, "critico": 4}, {"fuerza": 16})
item("accesorio", "Colgante de mana", {"manaExtra": 50, "magia": 6})
item("accesorio", "Anillo del halcon", {"critico": 10}, {"destreza": 28})

pkg = {"zenith": "0.1", "exportedAt": "2026-10-04T00:00:00.000Z", "template": template, "items": I}
root = os.path.join(os.path.dirname(__file__), "..", "..", "public", "examples")
with open(os.path.join(root, "rpg.zenith.json"), "w", encoding="utf-8") as f:
    json.dump(pkg, f, ensure_ascii=False, indent=1)
idx_path = os.path.join(root, "index.json")
idx = json.load(open(idx_path, encoding="utf-8"))
idx = [e for e in idx if e["id"] != "rpg"]
idx.insert(0, {"id": "rpg", "file": "rpg.zenith.json", "name": "RPG clasico (con niveles)", "items": len(I),
               "description": "Tres clases con curvas de crecimiento: proyecta tus estadisticas por nivel y compara pasado, presente y futuro."})
json.dump(idx, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok", len(I))
