#!/usr/bin/env python3
"""Genera il file di riferimento: N nodi casuali calcolati dal MOTORE PYTHON ORIGINALE.

Il file prodotto (riferimento.json) contiene, per ogni nodo, sia l'input sia il
risultato atteso. Il motore JavaScript deve riprodurlo esattamente.
"""
import json, sys, importlib.util
from random import Random
from pathlib import Path

CORE = Path(sys.argv[1])
N_NODI = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
SEME = 20260817

spec = importlib.util.spec_from_file_location("core", CORE)
core = importlib.util.module_from_spec(spec)
sys.modules["core"] = core
spec.loader.exec_module(core)

gen = Random(SEME)          # genera gli INPUT
dado = Random(424242)       # genera i DADI (stream separato, come nel runner)

FAMIGLIE = ["", "V001", "V003", "V005", "V007", "V010", "V017", "V022", "V030", "V040"]
DESCRIZIONI = [
    "Bere un bicchiere d'acqua dal divano",
    "Alzarsi e raggiungere la cucina con fretta",
    "Compilare una pratica online con OTP",
    "Dialogo di coppia teso dopo una giornata lunga",
    "Guidare al buio con pioggia",
    "Preparare il farmaco della sera",
    "Rispondere a una telefonata di lavoro urgente",
    "Cercare le chiavi perse prima di uscire",
    "Cucinare per quattro persone con poco tempo",
    "Assistere una persona fragile durante il pasto",
]
PROFILI = [p.value for p in core.HumanProfileKind]
RIPS = [r.value for r in core.RipKind]
SUPPORTI = [s.value for s in core.SupportKind]
DELEGHE = [d.value for d in core.DelegationKind]
DISPO = [a.value for a in core.AvailabilityKind]

def nodo_casuale(i):
    return {
        "id": "nodo_%05d" % i,
        "descrizione": gen.choice(DESCRIZIONI),
        "p0": gen.randint(1, 99),
        "famiglia": gen.choice(FAMIGLIE),
        "profilo": gen.choice(PROFILI),
        "etichette": gen.choice([[], ["micro"], ["stressor"], ["imprevisto", "fretta"]]),
        "modificatori": {
            "energia_e":      gen.randint(-35, 35),   # oltre il clamp, per testarlo
            "informazione_i": gen.randint(-35, 35),
            "tempo_t":        gen.randint(-35, 35),
            "materiale_m":    gen.randint(-35, 35),
            "bonus_bp":       gen.randint(-3, 25),
            "complessita_c":  gen.randint(-2, 12),
        },
        "stato_prima": {
            "stress_str":     gen.randint(-10, 110),
            "posizione_pos":  gen.randint(-10, 110),
            "debito_deb":     gen.randint(-1, 6),
            "bonus_bp":       gen.randint(0, 22),
            "rip":            gen.choice(RIPS),
            "or1":            round(gen.random(), 3),
            "cooldown":       gen.randint(0, 4),
            "costo_nascosto": gen.randint(0, 100),
        },
        "campo": {
            "attivo": gen.choice([True, False]),
            "forza":  gen.randint(0, 60),
            "tiro":   gen.choice([None, gen.randint(0, 100)]),
        },
        "supporto": {
            "tipo":             gen.choice(SUPPORTI),
            "delega":           gen.choice(DELEGHE),
            "riduzione_carico": round(gen.random(), 3),
            "competenza":       round(gen.random(), 3),
            "tempestivo":       gen.choice([True, False]),
            "costo_confine":    round(gen.random(), 3),
        },
        "adattamento": {
            "disponibilita": gen.choice(DISPO),
            "costo":         gen.randint(0, 30),
        },
    }

def verso_python(d):
    """Costruisce le dataclass del core dal dizionario in italiano."""
    m = d["modificatori"]; s = d["stato_prima"]; c = d["campo"]
    sup = d["supporto"]; ad = d["adattamento"]
    return core.NodeInput(
        node_id=d["id"], description=d["descrizione"],
        base_probability_p0=d["p0"], family_code=d["famiglia"],
        profile=core.safe_enum(core.HumanProfileKind, d["profilo"], core.HumanProfileKind.NEUTRO),
        tags=list(d["etichette"]),
        modifiers=core.Modifiers(
            energy_e=m["energia_e"], information_i=m["informazione_i"],
            time_t=m["tempo_t"], material_m=m["materiale_m"],
            protective_bonus_bp=m["bonus_bp"], complexity_c=m["complessita_c"]),
        state_before=core.SystemState(
            stress_str=s["stress_str"], position_pos=s["posizione_pos"],
            debt_deb=s["debito_deb"], protective_bonus_bp=s["bonus_bp"],
            rip=core.safe_enum(core.RipKind, s["rip"], core.RipKind.ASSENTE),
            or1_orientation=s["or1"], cooldown_remaining=s["cooldown"],
            hidden_cost=s["costo_nascosto"]),
        field_response=core.FieldResponse(active=c["attivo"], strength=c["forza"], field_roll=c["tiro"]),
        support=core.SupportContext(
            support_kind=core.safe_enum(core.SupportKind, sup["tipo"], core.SupportKind.ASSENTE),
            delegation_kind=core.safe_enum(core.DelegationKind, sup["delega"], core.DelegationKind.ASSENTE),
            load_reduction_score=sup["riduzione_carico"], competence_score=sup["competenza"],
            timely=sup["tempestivo"], boundary_cost=sup["costo_confine"]),
        adaptation=core.AdaptationContext(
            availability=core.safe_enum(core.AvailabilityKind, ad["disponibilita"], core.AvailabilityKind.NON_DISPONIBILE),
            cost_of_adaptation=ad["costo"]),
    )

casi = []
for i in range(N_NODI):
    d = nodo_casuale(i)
    n = verso_python(d)
    r = core.run_node(n, rng=dado)
    casi.append({"in": d, "atteso": {
        "pn": r.probability_pn, "tiro": r.roll,
        "successo": r.success_before_field,
        "margine_grezzo": r.raw_margin, "margine_campo": r.field_margin,
        "margine_netto": r.net_margin,
        "esito": r.outcome.value,
        "micro": core.is_micro_action(n), "cura": core.is_care_recovery_action(n),
        "d_costo": r.hidden_cost_delta,
        "rischio": r.risk_level.value,
        "stato_dopo": {
            "stress_str": r.state_after.stress_str,
            "posizione_pos": r.state_after.position_pos,
            "debito_deb": r.state_after.debt_deb,
            "bonus_bp": r.state_after.protective_bonus_bp,
            "rip": r.state_after.rip.value,
            "or1": round(r.state_after.or1_orientation, 6),
            "ri4": [round(r.state_after.ri4.rientro,6), round(r.state_after.ri4.riparazione,6),
                    round(r.state_after.ri4.riduzione,6), round(r.state_after.ri4.ripresa,6)],
            "cooldown": r.state_after.cooldown_remaining,
            "floor1": r.state_after.floor1_active,
            "costo_nascosto": r.state_after.hidden_cost,
        },
    }})

# --- CATENE: 300 scene da 3 a 40 nodi, stato che si propaga -----------------
gen2 = Random(777001)
dado2 = Random(555002)
catene = []
for c in range(300):
    lung = gen2.randint(3, 40)
    nodi_d = []
    for k in range(lung):
        d = nodo_casuale(900000 + c*100 + k)
        nodi_d.append(d)
    nodi_py = [verso_python(d) for d in nodi_d]
    scena = core.SceneInput(scene_id="s%03d" % c, title="scena %d" % c, nodes=nodi_py)
    res = core.run_scene(scena, rng=dado2)
    catene.append({
        "in": nodi_d,
        "atteso": {
            "esito": res.scene_outcome.value,
            "rischio": res.risk_level.value,
            "stato_finale": {
                "stress_str": res.final_state.stress_str,
                "posizione_pos": res.final_state.position_pos,
                "debito_deb": res.final_state.debt_deb,
                "costo_nascosto": res.final_state.hidden_cost,
                "rip": res.final_state.rip.value,
                "or1": round(res.final_state.or1_orientation, 6),
                "cooldown": res.final_state.cooldown_remaining,
                "floor1": res.final_state.floor1_active,
            },
            "tiri": [n.roll for n in res.node_results],
            "esiti": [n.outcome.value for n in res.node_results],
            "str_per_nodo": [n.state_after.stress_str for n in res.node_results],
        }})

# recupero fra scene
gen3 = Random(313131)
recuperi = []
for i in range(200):
    st = core.SystemState(stress_str=gen3.randint(0,100), position_pos=gen3.randint(0,100),
        debt_deb=gen3.randint(0,4), protective_bonus_bp=gen3.randint(0,20),
        rip=core.safe_enum(core.RipKind, gen3.choice(RIPS), core.RipKind.ASSENTE),
        or1_orientation=round(gen3.random(),3), cooldown_remaining=gen3.randint(0,3),
        hidden_cost=gen3.randint(0,100),
        ri4=core.Ri4State(round(gen3.random(),3), round(gen3.random(),3), round(gen3.random(),3), round(gen3.random(),3)))
    r = core.partial_recovery_between_scenes(st)
    recuperi.append({"in": {"stress_str":st.stress_str,"posizione_pos":st.position_pos,
        "debito_deb":st.debt_deb,"bonus_bp":st.protective_bonus_bp,"rip":st.rip.value,
        "or1":st.or1_orientation,"cooldown":st.cooldown_remaining,"costo_nascosto":st.hidden_cost,
        "ri4":{"rientro":st.ri4.rientro,"riparazione":st.ri4.riparazione,"riduzione":st.ri4.riduzione,"ripresa":st.ri4.ripresa}},
        "atteso": {"stress_str":r.stress_str,"posizione_pos":r.position_pos,"debito_deb":r.debt_deb,
        "bonus_bp":r.protective_bonus_bp,"or1":round(r.or1_orientation,6),"cooldown":r.cooldown_remaining,
        "costo_nascosto":r.hidden_cost}})

# prova separata del solo generatore casuale
prova_rng = []
for seme in (0, 1, 42, 12345, 424242, 20260817, 999999999):
    r2 = Random(seme)
    prova_rng.append({"seme": seme, "tiri": [r2.randint(1, 100) for _ in range(20)]})

out = {"seme_input": SEME, "seme_dado": 424242, "n": N_NODI,
       "prova_generatore": prova_rng, "casi": casi,
       "catene": catene, "seme_catene": 555002, "recuperi": recuperi}
Path(__file__).parent.joinpath("riferimento.json").write_text(
    json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("Generati %d casi di riferimento dal motore Python." % N_NODI)
