"""
SIMULATORE VERSIONE 3.1 — PROGRAMMA / APP CORE v3.1 MICROACTIONDAMPING
=================================================

Questo file è pensato come nucleo applicativo del Simulatore 3.1, ottimizzato per cooperare con ChatGPT, Gemini o altra AI.
Non è una suite di test. Non è un semplice manuale. È un motore Python importabile,
eseguibile e predisposto per essere usato da:

- ChatGPT o altra AI come modulo di calcolo;
- una futura app web o mobile;
- un backend API;
- un software online con interfaccia guidata;
- una CLI dimostrativa.

Principio canonico conservato:
    Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)

La formula calcola il singolo nodo. La complessità della vita entra tramite:
scenari, famiglie V001-V040, livelli temporali, supporto/delega, adattamento,
profilo, costo nascosto, report e stato lungo.

Aggiornamento v3.1 canonico:
- formula madre invariata;
- distinzione STR baseline / Delta STR prodotto dalla scena;
- MicroActionDamping nello state updater per micro-azioni semplici, sicure e di cura personale;
- separazione più netta tra stress mentale e carico concreto nell'inizializzazione;
- report e trace espliciti su damping, micro-recupero e qualità input.

Il file è monolitico per portabilità, ma è scritto a sezioni modulari in modo da poterlo
spezzare in futuro in package Python.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from enum import Enum
from random import Random
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple, Union
import json
import math
import re


# =============================================================================
# 0. SERIALIZZAZIONE E UTILITY GENERALI
# =============================================================================


def _safe_number(value: Any, default: float = 0.0) -> float:
    """Converte input numerici da JSON/AI/UI senza far esplodere il motore su valori sporchi.

    Nota metodologica: non cambia la matematica canonica per input validi; evita solo che
    valori come None, "bad", NaN o Infinity producano eccezioni non controllate.
    """
    try:
        number = float(value)
    except Exception:
        return float(default)
    if not math.isfinite(number):
        return float(default)
    return number


def clamp_int(value: int, minimum: int, maximum: int) -> int:
    default = 0 if minimum <= 0 <= maximum else minimum
    return max(minimum, min(maximum, int(round(_safe_number(value, default)))))


def clamp_float(value: float, minimum: float, maximum: float) -> float:
    default = 0.0 if minimum <= 0.0 <= maximum else float(minimum)
    return max(minimum, min(maximum, _safe_number(value, default)))


def enum_value(value: Any) -> Any:
    return value.value if isinstance(value, Enum) else value


def to_plain_data(value: Any) -> Any:
    """Converte dataclass, enum, dict e liste in dati JSON-serializzabili.

    Timeout audit v3.1: evita dataclasses.asdict(), che esegue deepcopy ricorsivo
    dell'intero oggetto. Nei loop API lunghi, soprattutto con DayResult/SceneResult
    ripetuti, il deepcopy profondo era più costoso del necessario e poteva contribuire
    a timeout del test harness. Qui usiamo una conversione ricorsiva shallow e
    controllata: stesso output logico, meno memoria temporanea e meno rischio di
    rallentamenti.
    """
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value) and not isinstance(value, type):
        return {f.name: to_plain_data(getattr(value, f.name)) for f in fields(value)}
    if isinstance(value, Mapping):
        return {str(k): to_plain_data(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_plain_data(v) for v in value]
    return value


def safe_enum(enum_cls: type[Enum], value: Any, default: Enum) -> Enum:
    if isinstance(value, enum_cls):
        return value
    if value is None:
        return default
    try:
        return enum_cls(value)
    except Exception:
        normalized = str(value).strip().lower()
        for item in enum_cls:
            if item.name.lower() == normalized or str(item.value).lower() == normalized:
                return item
    return default


def nonempty(text: Optional[str], fallback: str = "") -> str:
    text = "" if text is None else str(text).strip()
    return text or fallback


def as_mapping(value: Any) -> Mapping[str, Any]:
    """Ritorna un mapping sicuro per builder JSON/API.

    Serve a impedire che input sporchi provenienti da AI/UI, come liste, stringhe,
    numeri o None, facciano esplodere i costruttori con AttributeError su .get().
    Non cambia il comportamento degli input validi.
    """
    return value if isinstance(value, Mapping) else {}


def as_mapping_list(value: Any) -> List[Mapping[str, Any]]:
    """Filtra sequenze di possibili dizionari senza trattare stringhe come sequenze."""
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [item for item in value if isinstance(item, Mapping)]
    return []


def normalize_tags(value: Any) -> List[str]:
    """Normalizza tags evitando che una stringa diventi lista di caratteri."""
    if value is None:
        return []
    if isinstance(value, str):
        tag = value.strip()
        return [tag] if tag else []
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [str(item) for item in value if str(item).strip()]
    return [str(value)] if str(value).strip() else []


def parse_bool(value: Any, default: bool = False) -> bool:
    """Converte booleani provenienti da JSON/AI/UI evitando che 'false' diventi True.

    Accetta anche alcune forme italiane/operative frequenti nei payload naturali
    (reale, attivo, ok). NaN/Infinity tornano al default invece di diventare True.
    """
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = _safe_number(value, float('nan'))
        if not math.isfinite(number):
            return default
        return bool(number)
    normalized = str(value).strip().lower()
    truthy = {"si", "sì", "yes", "true", "vero", "1", "y", "t", "on", "ok", "presente", "attivo", "real", "reale"}
    falsy = {"no", "false", "falso", "0", "n", "f", "off", "assente", "none", "null", "non", ""}
    if normalized in truthy:
        return True
    if normalized in falsy:
        return False
    return default


# =============================================================================
# 1. ENUM CANONICHE E OPERATIVE
# =============================================================================


class OutcomeKind(str, Enum):
    SUCCESSO_PULITO = "successo_pulito"
    SUCCESSO_COSTOSO = "successo_costoso_sostenibile"
    SUCCESSO_DANNEGGIATO = "successo_danneggiato"
    SUCCESSO_TOSSICO = "successo_tossico"
    SUCCESSO_TECNICO_FALLIMENTO_UMANO = "successo_tecnico_fallimento_umano"
    FALLIMENTO_TECNICO = "fallimento_tecnico"
    FALLIMENTO_LIEVE = "fallimento_lieve"
    FALLIMENTO_SISTEMICO = "fallimento_sistemico"
    QUASI_COLLASSO = "quasi_collasso"


class RipKind(str, Enum):
    ASSENTE = "assente"
    FINTA = "finta"
    DEBOLE = "debole"
    VERA = "vera"
    TARDIVA = "tardiva"
    PIENA = "piena"


class SupportKind(str, Enum):
    ASSENTE = "assente"
    EMOTIVO = "emotivo"
    PRATICO = "pratico"
    INFORMATIVO = "informativo"
    LOGISTICO = "logistico"
    SIMBOLICO = "simbolico"
    INEFFICACE = "inefficace"
    INVASIVO = "invasivo"
    PROFESSIONALE = "professionale"


class DelegationKind(str, Enum):
    ASSENTE = "assente"
    PARZIALE = "parziale"
    REALE = "reale"
    FINTA = "finta"
    TARDIVA = "tardiva"
    INCOMPETENTE = "incompetente"
    INVASIVA = "invasiva"


class AdaptationKind(str, Enum):
    NESSUNO = "nessuno"
    CHIEDERE_AIUTO = "chiedere_aiuto"
    SEMPLIFICARE = "semplificare"
    DELEGARE = "delegare"
    RINVIARE_SENZA_EVITARE = "rinviare_senza_evitare"
    CAMBIARE_AMBIENTE = "cambiare_ambiente"
    CAMBIARE_OBIETTIVO = "cambiare_obiettivo"
    RIPARARE = "riparare"
    SPEZZARE_COMPITO = "spezzare_compito"
    PAUSA_REALE = "pausa_reale"
    CAMBIARE_SEQUENZA = "cambiare_sequenza"
    AVVISARE_QUALCUNO = "avvisare_qualcuno"


class AvailabilityKind(str, Enum):
    REALE = "reale"
    PARZIALE = "parziale"
    TEORICA = "teorica"
    TARDIVA = "tardiva"
    FINTA = "finta"
    NON_DISPONIBILE = "non_disponibile"


class MacroRegime(str, Enum):
    MACRO_0_EPISODIO_ISOLATO = "macro_0_episodio_isolato"
    MACRO_1_CATENA_BREVE = "macro_1_catena_breve"
    MACRO_2_MINI_SETTIMANA_LEGGERA = "macro_2_mini_settimana_leggera"
    MACRO_3_RIPETIZIONE_PESANTE_RECUPERABILE = "macro_3_ripetizione_pesante_recuperabile"
    MACRO_4_SPIRALE_IN_FORMAZIONE = "macro_4_spirale_in_formazione"
    MACRO_5_SPIRALE_STABILIZZATA = "macro_5_spirale_stabilizzata"


class HumanProfileKind(str, Enum):
    NEUTRO = "neutro"
    FRAGILE = "fragile"
    RESISTENTE = "resistente"
    IMPULSIVO = "impulsivo"
    IPER_RESPONSABILE = "iper_responsabile"
    CAREGIVER = "caregiver"
    GENITORE_SOVRACCARICO = "genitore_sovraccarico"
    LAVORATORE_SOTTO_PRESSIONE = "lavoratore_sotto_pressione"
    PARTNER_COMPENSANTE = "partner_compensante"
    CHIEDE_AIUTO = "chiede_aiuto"
    NON_CHIEDE_AIUTO = "non_chiede_aiuto"
    COMPETENTE_MA_STANCO = "competente_ma_stanco"
    COMPETENTE_MA_ISOLATO = "competente_ma_isolato"


class TemporalLevel(str, Enum):
    NODO = "nodo"
    SCENA = "scena"
    CATENA_BREVE = "catena_breve"
    MINI_SETTIMANA = "mini_settimana"
    TRAIETTORIA_LUNGA = "traiettoria_lunga"
    SPIRALE_LUNGA = "spirale_lunga"


class RiskLevel(str, Enum):
    ORDINARIO = "ordinario"
    FRAGILE_LIEVE = "fragile_lieve"
    FRAGILE_MEDIO = "fragile_medio"
    FRAGILE_GRAVE = "fragile_grave_pre_rosso"
    ROSSO_CONTROLLABILE = "rosso_controllabile"
    ROSSO_SISTEMICO = "rosso_sistemico"
    ESTREMO_DIAGNOSTICO = "estremo_diagnostico"
    QUASI_COLLASSO = "quasi_collasso"


class LifeArea(str, Enum):
    CURA_PERSONALE_CORPO = "cura_personale_corpo"
    CASA_OGGETTI = "casa_oggetti"
    MOBILITA_STRADA = "mobilita_strada"
    DIGITALE_BUROCRAZIA = "digitale_burocrazia"
    LAVORO_SCUOLA = "lavoro_scuola"
    COPPIA_FAMIGLIA = "coppia_famiglia"


# =============================================================================
# 2. CONFIGURAZIONE MATEMATICA
# =============================================================================


@dataclass(frozen=True)
class EngineConfig:
    min_probability: int = 5
    max_probability: int = 95
    complexity_weight: int = 5
    debt_weight: int = 5
    node_success_fragile_margin_max: int = 9
    node_success_normal_margin_max: int = 24
    str_threshold_low_max: int = 39
    str_threshold_medium_max: int = 59
    str_threshold_high_max: int = 69
    str_threshold_red_controlled_max: int = 79
    str_threshold_red_severe_max: int = 89
    # Recupero parziale tra scene/giorni. Valori prudenziali.
    scene_recovery_factor: float = 0.20
    day_recovery_factor: float = 0.35
    cooldown_min_after_red: int = 1


DEFAULT_CONFIG = EngineConfig()

# Limite prudenziale della history interna: evita crescita indefinita in sessioni/API molto lunghe.
# Non modifica la formula madre né gli esiti: conserva tracce compatte recenti e contatori totali.
MAX_HISTORY_RECORDS = 5000
HISTORY_TRIM_BATCH = 1000
# Limite duro per chiamata bulk: sopra questa soglia si lavora a chunk successivi.
# Serve a evitare timeout del test harness/API dovuti a chiamate monolitiche troppo lunghe.
# Non modifica formula, esiti o state updater: cambia solo la strategia di esecuzione.
BULK_MAX_ITERATIONS_PER_CALL = 10000
BULK_RECOMMENDED_CHUNK_SIZE = 10000
# Evita risposte JSON enormi se sample_every=1 in bulk da 10.000 iterazioni.
# Non cambia gli esiti; limita solo il numero di campioni serializzati in output.
MAX_BULK_SAMPLES = 1000


def _trim_history_in_place(history: List[Dict[str, Any]], max_records: int = MAX_HISTORY_RECORDS) -> None:
    # Trim a blocchi, non a ogni singolo append: evita costo O(n) ripetuto e pause GC
    # nelle simulazioni lunghe. Mantiene circa gli ultimi max_records eventi, con piccolo buffer.
    overflow = len(history) - max_records
    if overflow > HISTORY_TRIM_BATCH:
        del history[:overflow]


def str_penalty(str_value: int, config: EngineConfig = DEFAULT_CONFIG) -> int:
    str_value = clamp_int(str_value, 0, 100)
    if str_value <= config.str_threshold_low_max:
        return 0
    if str_value <= config.str_threshold_medium_max:
        return 5
    if str_value <= config.str_threshold_high_max:
        return 10
    if str_value <= config.str_threshold_red_controlled_max:
        return 15
    if str_value <= config.str_threshold_red_severe_max:
        return 20
    return 25


# =============================================================================
# 3. DATACLASS DEL MODELLO
# =============================================================================


@dataclass
class Modifiers:
    energy_e: int = 0
    information_i: int = 0
    time_t: int = 0
    material_m: int = 0
    protective_bonus_bp: int = 0
    complexity_c: int = 0

    def sigma_mod(self) -> int:
        return self.energy_e + self.information_i + self.time_t + self.material_m

    def normalized(self) -> "Modifiers":
        return Modifiers(
            energy_e=clamp_int(self.energy_e, -30, 30),
            information_i=clamp_int(self.information_i, -30, 30),
            time_t=clamp_int(self.time_t, -30, 30),
            material_m=clamp_int(self.material_m, -30, 30),
            protective_bonus_bp=clamp_int(self.protective_bonus_bp, 0, 20),
            complexity_c=clamp_int(self.complexity_c, 0, 10),
        )


@dataclass
class Ri4State:
    """ri4 scomposto: rientro, riparazione, riduzione, ripresa."""

    rientro: float = 0.50
    riparazione: float = 0.50
    riduzione: float = 0.50
    ripresa: float = 0.50

    @property
    def score(self) -> float:
        return clamp_float((self.rientro + self.riparazione + self.riduzione + self.ripresa) / 4, 0.0, 1.0)

    def normalized(self) -> "Ri4State":
        return Ri4State(
            rientro=clamp_float(self.rientro, 0.0, 1.0),
            riparazione=clamp_float(self.riparazione, 0.0, 1.0),
            riduzione=clamp_float(self.riduzione, 0.0, 1.0),
            ripresa=clamp_float(self.ripresa, 0.0, 1.0),
        )


@dataclass
class SystemState:
    stress_str: int = 0
    position_pos: int = 60
    debt_deb: int = 0
    protective_bonus_bp: int = 0
    rip: RipKind = RipKind.ASSENTE
    or1_orientation: float = 0.50
    ri4: Ri4State = field(default_factory=Ri4State)
    macro: MacroRegime = MacroRegime.MACRO_0_EPISODIO_ISOLATO
    cooldown_remaining: int = 0
    floor1_active: bool = False
    floor1_reason: str = ""
    hidden_cost: int = 0

    @property
    def ri4_recovery(self) -> float:
        return self.ri4.score

    def normalized(self) -> "SystemState":
        return SystemState(
            stress_str=clamp_int(self.stress_str, 0, 100),
            position_pos=clamp_int(self.position_pos, 0, 100),
            debt_deb=max(0, int(round(_safe_number(self.debt_deb, 0.0)))),
            protective_bonus_bp=clamp_int(self.protective_bonus_bp, 0, 20),
            rip=safe_enum(RipKind, self.rip, RipKind.ASSENTE),
            or1_orientation=clamp_float(self.or1_orientation, 0.0, 1.0),
            ri4=self.ri4.normalized(),
            macro=safe_enum(MacroRegime, self.macro, MacroRegime.MACRO_0_EPISODIO_ISOLATO),
            cooldown_remaining=max(0, int(round(_safe_number(self.cooldown_remaining, 0.0)))),
            floor1_active=parse_bool(self.floor1_active, False),
            floor1_reason=str(self.floor1_reason or ""),
            hidden_cost=clamp_int(self.hidden_cost, 0, 100),
        )


@dataclass
class FieldResponse:
    active: bool = False
    label: str = ""
    strength: int = 0
    field_roll: Optional[int] = None

    def normalized(self) -> "FieldResponse":
        return FieldResponse(
            active=parse_bool(self.active, False),
            label=nonempty(self.label),
            strength=clamp_int(self.strength, 0, 100),
            field_roll=None if self.field_roll is None else clamp_int(self.field_roll, 0, 100),
        )


@dataclass
class SupportContext:
    support_kind: SupportKind = SupportKind.ASSENTE
    delegation_kind: DelegationKind = DelegationKind.ASSENTE
    load_reduction_score: float = 0.0
    competence_score: float = 0.0
    timely: bool = False
    boundary_cost: float = 0.0
    note: str = ""

    def normalized(self) -> "SupportContext":
        return SupportContext(
            support_kind=safe_enum(SupportKind, self.support_kind, SupportKind.ASSENTE),
            delegation_kind=safe_enum(DelegationKind, self.delegation_kind, DelegationKind.ASSENTE),
            load_reduction_score=clamp_float(self.load_reduction_score, 0.0, 1.0),
            competence_score=clamp_float(self.competence_score, 0.0, 1.0),
            timely=parse_bool(self.timely, False),
            boundary_cost=clamp_float(self.boundary_cost, 0.0, 1.0),
            note=nonempty(self.note),
        )

    def is_real_support(self) -> bool:
        s = self.normalized()
        return (
            s.support_kind in {SupportKind.PRATICO, SupportKind.INFORMATIVO, SupportKind.LOGISTICO, SupportKind.PROFESSIONALE}
            and s.load_reduction_score > 0.25
            and s.competence_score > 0.25
            and s.timely
        )

    def is_fake_or_symbolic(self) -> bool:
        s = self.normalized()
        return s.support_kind in {SupportKind.SIMBOLICO, SupportKind.INEFFICACE, SupportKind.EMOTIVO} and s.load_reduction_score < 0.25

    def is_real_delegation(self) -> bool:
        s = self.normalized()
        return s.delegation_kind == DelegationKind.REALE and s.load_reduction_score >= 0.50 and s.competence_score >= 0.40

    def is_invasive(self) -> bool:
        s = self.normalized()
        return s.support_kind == SupportKind.INVASIVO or s.delegation_kind == DelegationKind.INVASIVA or s.boundary_cost >= 0.60


@dataclass
class AdaptationContext:
    kind: AdaptationKind = AdaptationKind.NESSUNO
    availability: AvailabilityKind = AvailabilityKind.NON_DISPONIBILE
    expected_load_reduction: float = 0.0
    expected_clarity_gain: int = 0
    expected_time_gain: int = 0
    expected_complexity_reduction: int = 0
    expected_material_gain: int = 0
    expected_energy_gain: int = 0
    creates_real_rip: bool = False
    cost_of_adaptation: int = 0
    note: str = ""

    def normalized(self) -> "AdaptationContext":
        return AdaptationContext(
            kind=safe_enum(AdaptationKind, self.kind, AdaptationKind.NESSUNO),
            availability=safe_enum(AvailabilityKind, self.availability, AvailabilityKind.NON_DISPONIBILE),
            expected_load_reduction=clamp_float(self.expected_load_reduction, 0.0, 1.0),
            expected_clarity_gain=clamp_int(self.expected_clarity_gain, -20, 20),
            expected_time_gain=clamp_int(self.expected_time_gain, -20, 20),
            expected_complexity_reduction=clamp_int(self.expected_complexity_reduction, 0, 10),
            expected_material_gain=clamp_int(self.expected_material_gain, -20, 20),
            expected_energy_gain=clamp_int(self.expected_energy_gain, -20, 20),
            creates_real_rip=parse_bool(self.creates_real_rip, False),
            cost_of_adaptation=clamp_int(self.cost_of_adaptation, 0, 30),
            note=nonempty(self.note),
        )

    def is_operational(self) -> bool:
        return self.normalized().availability in {AvailabilityKind.REALE, AvailabilityKind.PARZIALE}

    def is_late_or_fake(self) -> bool:
        return self.normalized().availability in {
            AvailabilityKind.TARDIVA,
            AvailabilityKind.FINTA,
            AvailabilityKind.TEORICA,
            AvailabilityKind.NON_DISPONIBILE,
        }


@dataclass
class NodeInput:
    node_id: str
    description: str
    base_probability_p0: int
    modifiers: Modifiers
    state_before: SystemState
    field_response: FieldResponse = field(default_factory=FieldResponse)
    support: SupportContext = field(default_factory=SupportContext)
    adaptation: AdaptationContext = field(default_factory=AdaptationContext)
    profile: HumanProfileKind = HumanProfileKind.NEUTRO
    family_code: str = ""
    tags: List[str] = field(default_factory=list)

    def normalized(self) -> "NodeInput":
        return NodeInput(
            node_id=nonempty(self.node_id, "node"),
            description=nonempty(self.description, "Nodo operativo"),
            base_probability_p0=clamp_int(self.base_probability_p0, 1, 99),
            modifiers=self.modifiers.normalized(),
            state_before=self.state_before.normalized(),
            field_response=self.field_response.normalized(),
            support=self.support.normalized(),
            adaptation=self.adaptation.normalized(),
            profile=safe_enum(HumanProfileKind, self.profile, HumanProfileKind.NEUTRO),
            family_code=nonempty(self.family_code),
            tags=(list(self.tags) if isinstance(self.tags, Sequence) and not isinstance(self.tags, (str, bytes, bytearray)) else ([str(self.tags)] if self.tags else [])),
        )


@dataclass
class NodeResult:
    node_id: str
    description: str
    family_code: str
    probability_pn: int
    roll: int
    success_before_field: bool
    raw_margin: int
    field_margin: int
    net_margin: int
    outcome: OutcomeKind
    risk_level: RiskLevel
    state_before: SystemState
    state_after: SystemState
    hidden_cost_delta: int
    warnings: List[str] = field(default_factory=list)
    operational_notes: List[str] = field(default_factory=list)
    levers: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SceneInput:
    scene_id: str
    title: str
    nodes: List[NodeInput]
    family_code: str = ""
    notes: str = ""


@dataclass
class SceneResult:
    scene_id: str
    title: str
    family_code: str
    node_results: List[NodeResult]
    initial_state: SystemState
    final_state: SystemState
    scene_outcome: OutcomeKind
    risk_level: RiskLevel
    report: Dict[str, Any]


@dataclass
class ChainInput:
    chain_id: str
    title: str
    scenes: List[SceneInput]
    notes: str = ""


@dataclass
class ChainResult:
    chain_id: str
    title: str
    scene_results: List[SceneResult]
    initial_state: SystemState
    final_state: SystemState
    chain_outcome: OutcomeKind
    risk_level: RiskLevel
    report: Dict[str, Any]


@dataclass
class MiniWeekInput:
    miniweek_id: str
    title: str
    chains_by_day: List[ChainInput]
    notes: str = ""


@dataclass
class MiniWeekResult:
    miniweek_id: str
    title: str
    day_results: List[ChainResult]
    initial_state: SystemState
    final_state: SystemState
    outcome: OutcomeKind
    risk_level: RiskLevel
    report: Dict[str, Any]


@dataclass
class TrajectoryInput:
    trajectory_id: str
    title: str
    miniweeks: List[MiniWeekInput]
    notes: str = ""


@dataclass
class TrajectoryResult:
    trajectory_id: str
    title: str
    miniweek_results: List[MiniWeekResult]
    initial_state: SystemState
    final_state: SystemState
    outcome: OutcomeKind
    risk_level: RiskLevel
    report: Dict[str, Any]


# =============================================================================
# 4. SCENARIO UNIVERSE — FAMIGLIE V001-V040
# =============================================================================


@dataclass(frozen=True)
class LifeFamilySpec:
    code: str
    name: str
    area: LifeArea
    typical_nodes: Tuple[str, ...]
    sensitive_levers: Tuple[str, ...]
    typical_kpd: Tuple[str, ...]
    adaptations: Tuple[AdaptationKind, ...]
    report_flags: Tuple[str, ...]


# Catalogo essenziale ma completo a 40 famiglie. Le descrizioni possono crescere senza
# cambiare il codice del motore.
LIFE_FAMILIES: Dict[str, LifeFamilySpec] = {
    "V001": LifeFamilySpec("V001", "svegliarsi", LifeArea.CURA_PERSONALE_CORPO, ("aprire gli occhi", "orientarsi", "alzarsi"), ("E", "STR", "POS", "cooldown"), ("sveglia non sentita", "rumore", "urgenza"), (AdaptationKind.PAUSA_REALE, AdaptationKind.SPEZZARE_COMPITO), ("sonno", "rientro")),
    "V002": LifeFamilySpec("V002", "alzarsi e muoversi", LifeArea.CURA_PERSONALE_CORPO, ("sedersi", "mettersi in piedi", "camminare"), ("E", "POS", "M", "STR"), ("capogiro", "ostacolo", "animale tra i piedi"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.CHIEDERE_AIUTO), ("sicurezza fisica", "instabilità")),
    "V003": LifeFamilySpec("V003", "igiene personale", LifeArea.CURA_PERSONALE_CORPO, ("lavarsi", "denti", "doccia"), ("E", "M", "C", "T"), ("acqua fredda", "oggetto mancante"), (AdaptationKind.CAMBIARE_SEQUENZA, AdaptationKind.SEMPLIFICARE), ("fatica", "routine")),
    "V004": LifeFamilySpec("V004", "vestirsi", LifeArea.CURA_PERSONALE_CORPO, ("scegliere vestiti", "indossare", "prepararsi"), ("I", "T", "C", "POS"), ("vestito mancante", "ritardo"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.CAMBIARE_OBIETTIVO), ("pressione", "decisione")),
    "V005": LifeFamilySpec("V005", "farmaci e routine salute", LifeArea.CURA_PERSONALE_CORPO, ("ricordare", "dosare", "assumere"), ("I", "T", "STR", "C"), ("confezione finita", "dubbio dose"), (AdaptationKind.AVVISARE_QUALCUNO, AdaptationKind.CHIEDERE_AIUTO), ("prudenza", "non clinico")),
    "V006": LifeFamilySpec("V006", "dolore fatica sintomi", LifeArea.CURA_PERSONALE_CORPO, ("valutare corpo", "ridurre carico", "scegliere azione"), ("E", "STR", "POS", "RIP"), ("peggioramento", "instabilità"), (AdaptationKind.PAUSA_REALE, AdaptationKind.RINVIARE_SENZA_EVITARE), ("sicurezza", "stop prudenziale")),
    "V007": LifeFamilySpec("V007", "mangiare bere", LifeArea.CURA_PERSONALE_CORPO, ("raggiungere cucina", "preparare", "consumare"), ("E", "M", "C", "STR"), ("oggetto cade", "cibo mancante"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.SPEZZARE_COMPITO), ("bisogno corporeo", "micro recupero")),
    "V008": LifeFamilySpec("V008", "porta chiavi uscita", LifeArea.CASA_OGGETTI, ("trovare chiavi", "aprire porta", "uscire"), ("I", "M", "T", "C"), ("porta incastrata", "chiavi smarrite"), (AdaptationKind.CAMBIARE_SEQUENZA, AdaptationKind.CHIEDERE_AIUTO), ("oggetti", "fretta")),
    "V009": LifeFamilySpec("V009", "cucina preparazione", LifeArea.CASA_OGGETTI, ("prendere oggetti", "preparare", "riporre"), ("E", "M", "C", "T"), ("strumento non funziona", "oggetto scivola"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.SPEZZARE_COMPITO), ("materialità", "rischio domestico")),
    "V010": LifeFamilySpec("V010", "pulizie casa", LifeArea.CASA_OGGETTI, ("scegliere area", "pulire", "riordinare"), ("E", "C", "STR", "POS"), ("interruzione", "sporco maggiore"), (AdaptationKind.SPEZZARE_COMPITO, AdaptationKind.DELEGARE), ("over-functioning", "carico invisibile")),
    "V011": LifeFamilySpec("V011", "bucato", LifeArea.CASA_OGGETTI, ("raccogliere", "lavare", "stendere"), ("E", "T", "M", "C"), ("lavatrice occupata", "pioggia"), (AdaptationKind.CAMBIARE_SEQUENZA, AdaptationKind.RINVIARE_SENZA_EVITARE), ("routine", "incastri")),
    "V012": LifeFamilySpec("V012", "oggetti smarriti", LifeArea.CASA_OGGETTI, ("ricordare", "cercare", "trovare"), ("I", "STR", "T", "POS"), ("oggetto non nel posto", "pressione"), (AdaptationKind.PAUSA_REALE, AdaptationKind.SPEZZARE_COMPITO), ("frustrazione", "or1")),
    "V013": LifeFamilySpec("V013", "guasti domestici", LifeArea.CASA_OGGETTI, ("capire guasto", "contenere", "chiedere aiuto"), ("I", "M", "C", "STR"), ("guasto peggiora", "tecnico non disponibile"), (AdaptationKind.CHIEDERE_AIUTO, AdaptationKind.DELEGARE), ("fallimento tecnico", "supporto reale")),
    "V014": LifeFamilySpec("V014", "spesa preparazione lista", LifeArea.CASA_OGGETTI, ("fare lista", "priorità", "preparare borse"), ("I", "C", "T", "STR"), ("lista incompleta", "richieste familiari"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.SPEZZARE_COMPITO), ("carico mentale", "priorità")),
    "V015": LifeFamilySpec("V015", "gestione spesa", LifeArea.CASA_OGGETTI, ("entrare", "trovare prodotti", "cassa", "uscire"), ("I", "M", "T", "C", "STR"), ("folla", "prodotto mancante", "cassa bloccata"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.CAMBIARE_OBIETTIVO), ("campo", "successo costoso")),
    "V016": LifeFamilySpec("V016", "uscire di casa", LifeArea.MOBILITA_STRADA, ("prepararsi", "controllare oggetti", "chiudere"), ("T", "I", "C", "POS"), ("telefonata", "chiavi", "ritardo"), (AdaptationKind.CAMBIARE_SEQUENZA, AdaptationKind.SEMPLIFICARE), ("transizione", "fretta")),
    "V017": LifeFamilySpec("V017", "guidare", LifeArea.MOBILITA_STRADA, ("salire", "guidare", "parcheggiare"), ("E", "T", "M", "STR", "POS"), ("traffico", "pioggia", "clacson"), (AdaptationKind.RINVIARE_SENZA_EVITARE, AdaptationKind.CAMBIARE_AMBIENTE), ("sicurezza", "stop prudenziale")),
    "V018": LifeFamilySpec("V018", "fare benzina", LifeArea.MOBILITA_STRADA, ("arrivare", "pagare", "erogare"), ("I", "M", "T", "C"), ("pompa guasta", "carta rifiutata"), (AdaptationKind.CHIEDERE_AIUTO, AdaptationKind.CAMBIARE_AMBIENTE), ("tecnico", "campo")),
    "V019": LifeFamilySpec("V019", "mezzi pubblici", LifeArea.MOBILITA_STRADA, ("raggiungere fermata", "attendere", "salire"), ("T", "M", "I", "STR"), ("ritardo mezzo", "folla"), (AdaptationKind.CAMBIARE_SEQUENZA, AdaptationKind.AVVISARE_QUALCUNO), ("incertezza", "campo")),
    "V020": LifeFamilySpec("V020", "camminare spostarsi", LifeArea.MOBILITA_STRADA, ("orientarsi", "camminare", "arrivare"), ("E", "M", "POS", "T"), ("ostacolo", "pavimento", "cane"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.PAUSA_REALE), ("instabilità", "materialità")),
    "V021": LifeFamilySpec("V021", "imprevisti stradali", LifeArea.MOBILITA_STRADA, ("rilevare", "decidere", "adattare"), ("I", "T", "M", "POS"), ("ostacolo improvviso", "deviazione"), (AdaptationKind.CAMBIARE_SEQUENZA, AdaptationKind.AVVISARE_QUALCUNO), ("K/Pd", "sicurezza")),
    "V022": LifeFamilySpec("V022", "messaggi e comunicazioni", LifeArea.DIGITALE_BUROCRAZIA, ("leggere", "interpretare", "rispondere"), ("I", "T", "STR", "POS"), ("tono ambiguo", "risposta attiva"), (AdaptationKind.PAUSA_REALE, AdaptationKind.RIPARARE), ("tono", "relazione")),
    "V023": LifeFamilySpec("V023", "telefonate", LifeArea.DIGITALE_BUROCRAZIA, ("chiamare", "ascoltare", "rispondere"), ("I", "T", "STR", "C"), ("attesa", "operatore", "interruzione"), (AdaptationKind.AVVISARE_QUALCUNO, AdaptationKind.SPEZZARE_COMPITO), ("pressione", "informazione")),
    "V024": LifeFamilySpec("V024", "password app accessi", LifeArea.DIGITALE_BUROCRAZIA, ("accedere", "verificare", "recuperare"), ("I", "C", "T", "STR"), ("OTP rifiutato", "password errata"), (AdaptationKind.PAUSA_REALE, AdaptationKind.CHIEDERE_AIUTO), ("frustrazione tecnica", "fallimento non personale")),
    "V025": LifeFamilySpec("V025", "pagamenti", LifeArea.DIGITALE_BUROCRAZIA, ("scegliere metodo", "pagare", "confermare"), ("I", "T", "M", "C"), ("carta respinta", "app bloccata"), (AdaptationKind.CAMBIARE_AMBIENTE, AdaptationKind.CHIEDERE_AIUTO), ("tecnico", "campo")),
    "V026": LifeFamilySpec("V026", "documenti online", LifeArea.DIGITALE_BUROCRAZIA, ("caricare", "compilare", "inviare"), ("I", "C", "T", "STR"), ("form ambiguo", "file respinto"), (AdaptationKind.SPEZZARE_COMPITO, AdaptationKind.CHIEDERE_AIUTO), ("I/C", "frustrazione")),
    "V027": LifeFamilySpec("V027", "pratiche burocratiche", LifeArea.DIGITALE_BUROCRAZIA, ("capire richiesta", "raccogliere dati", "inviare"), ("I", "C", "T", "STR"), ("ufficio chiuso", "documento mancante"), (AdaptationKind.DELEGARE, AdaptationKind.SPEZZARE_COMPITO), ("complessità", "supporto informativo")),
    "V028": LifeFamilySpec("V028", "iniziare lavoro studio", LifeArea.LAVORO_SCUOLA, ("orientarsi", "aprire compito", "iniziare"), ("I", "E", "STR", "or1"), ("interruzione", "richiesta improvvisa"), (AdaptationKind.SPEZZARE_COMPITO, AdaptationKind.CAMBIARE_SEQUENZA), ("avvio", "or1")),
    "V029": LifeFamilySpec("V029", "compito difficile", LifeArea.LAVORO_SCUOLA, ("capire", "eseguire", "verificare"), ("I", "C", "E", "STR"), ("errore", "strumento mancante"), (AdaptationKind.CHIEDERE_AIUTO, AdaptationKind.SPEZZARE_COMPITO), ("competenza", "costo")),
    "V030": LifeFamilySpec("V030", "capo responsabile autorità", LifeArea.LAVORO_SCUOLA, ("ascoltare", "rispondere", "negoziare"), ("I", "T", "POS", "STR"), ("tono", "richiesta extra"), (AdaptationKind.AVVISARE_QUALCUNO, AdaptationKind.CAMBIARE_OBIETTIVO), ("confine", "successo tossico")),
    "V031": LifeFamilySpec("V031", "colleghi gruppo", LifeArea.LAVORO_SCUOLA, ("coordinare", "rispondere", "gestire"), ("I", "C", "POS", "STR"), ("conflitto", "ambiguità"), (AdaptationKind.RIPARARE, AdaptationKind.SEMPLIFICARE), ("gruppo", "confini")),
    "V032": LifeFamilySpec("V032", "insegnare spiegare", LifeArea.LAVORO_SCUOLA, ("preparare", "spiegare", "verificare"), ("I", "E", "C", "STR"), ("domanda inattesa", "classe rumorosa"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.CAMBIARE_SEQUENZA), ("comunicazione", "energia")),
    "V033": LifeFamilySpec("V033", "deadline consegne", LifeArea.LAVORO_SCUOLA, ("priorità", "esecuzione", "consegna"), ("T", "STR", "C", "E"), ("errore finale", "richiesta extra"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.DELEGARE), ("burnout", "successo tecnico")),
    "V034": LifeFamilySpec("V034", "dialogo di coppia", LifeArea.COPPIA_FAMIGLIA, ("aprire tema", "ascoltare", "rispondere"), ("I", "POS", "STR", "RIP"), ("difesa", "tono", "silenzio"), (AdaptationKind.RIPARARE, AdaptationKind.PAUSA_REALE), ("RIP vera/finta", "relazione")),
    "V035": LifeFamilySpec("V035", "micro conflitto familiare", LifeArea.COPPIA_FAMIGLIA, ("innesco", "risposta", "riparazione"), ("POS", "STR", "I", "RIP"), ("ribattuta", "escalation"), (AdaptationKind.RIPARARE, AdaptationKind.PAUSA_REALE), ("escalation", "DEB")),
    "V036": LifeFamilySpec("V036", "figli", LifeArea.COPPIA_FAMIGLIA, ("cura", "risposta", "organizzazione"), ("E", "T", "STR", "C"), ("pianto", "capriccio", "urgenza"), (AdaptationKind.DELEGARE, AdaptationKind.SEMPLIFICARE), ("sonno", "carico")),
    "V037": LifeFamilySpec("V037", "organizzazione familiare", LifeArea.COPPIA_FAMIGLIA, ("pianificare", "distribuire", "controllare"), ("C", "STR", "POS", "supporto"), ("richiesta nuova", "delega finta"), (AdaptationKind.DELEGARE, AdaptationKind.SPEZZARE_COMPITO), ("carico mentale", "over-functioning")),
    "V038": LifeFamilySpec("V038", "suoceri genitori confini", LifeArea.COPPIA_FAMIGLIA, ("confine", "risposta", "riparazione"), ("POS", "I", "STR", "RIP"), ("interferenza", "alleanza"), (AdaptationKind.RIPARARE, AdaptationKind.AVVISARE_QUALCUNO), ("confini", "alleanze")),
    "V039": LifeFamilySpec("V039", "decisioni di coppia famiglia", LifeArea.COPPIA_FAMIGLIA, ("proporre", "negoziare", "decidere"), ("I", "POS", "C", "STR"), ("disaccordo", "pressione"), (AdaptationKind.SPEZZARE_COMPITO, AdaptationKind.RIPARARE), ("decisione", "tempo")),
    "V040": LifeFamilySpec("V040", "cura persona fragile", LifeArea.COPPIA_FAMIGLIA, ("assistere", "monitorare", "organizzare"), ("E", "STR", "C", "supporto"), ("crisi", "supporto assente"), (AdaptationKind.DELEGARE, AdaptationKind.CHIEDERE_AIUTO), ("caregiver", "quasi-collasso")),
}


# =============================================================================
# 5. CALCOLO DEL NODO
# =============================================================================


def calculate_pn(node: NodeInput, config: EngineConfig = DEFAULT_CONFIG) -> int:
    node = node.normalized()
    state = node.state_before
    modifiers = node.modifiers
    raw_value = (
        node.base_probability_p0
        + modifiers.sigma_mod()
        + modifiers.protective_bonus_bp
        + state.protective_bonus_bp
        - config.complexity_weight * modifiers.complexity_c
        - str_penalty(state.stress_str, config)
        - config.debt_weight * state.debt_deb
    )
    return clamp_int(raw_value, config.min_probability, config.max_probability)


def calculate_field_margin(field: FieldResponse) -> int:
    field = field.normalized()
    if not field.active:
        return 0
    if field.field_roll is not None:
        return clamp_int(field.field_roll, 0, 100)
    return field.strength


def detects_over_adaptation_risk(node: NodeInput) -> bool:
    node = node.normalized()
    profile_risk = node.profile in {
        HumanProfileKind.IPER_RESPONSABILE,
        HumanProfileKind.CAREGIVER,
        HumanProfileKind.GENITORE_SOVRACCARICO,
        HumanProfileKind.PARTNER_COMPENSANTE,
        HumanProfileKind.NON_CHIEDE_AIUTO,
        HumanProfileKind.LAVORATORE_SOTTO_PRESSIONE,
        HumanProfileKind.COMPETENTE_MA_ISOLATO,
    }
    no_real_support = not node.support.is_real_support() and not node.support.is_real_delegation()
    high_load = node.state_before.stress_str >= 70
    low_load_reduction = node.support.load_reduction_score < 0.25
    adaptation_costly = node.adaptation.cost_of_adaptation >= 10 or node.adaptation.is_late_or_fake()
    return profile_risk and no_real_support and high_load and (low_load_reduction or adaptation_costly)


def classify_risk(state: SystemState, outcome: Optional[OutcomeKind] = None) -> RiskLevel:
    state = state.normalized()
    if outcome == OutcomeKind.QUASI_COLLASSO:
        return RiskLevel.QUASI_COLLASSO
    if state.stress_str >= 90 and state.position_pos <= 20 and state.debt_deb >= 1:
        return RiskLevel.QUASI_COLLASSO
    if state.stress_str >= 85 and state.position_pos <= 30:
        return RiskLevel.ESTREMO_DIAGNOSTICO
    if state.stress_str >= 80 and state.position_pos <= 35:
        return RiskLevel.ROSSO_SISTEMICO
    if state.stress_str >= 70 or state.position_pos <= 35:
        return RiskLevel.ROSSO_CONTROLLABILE
    if state.stress_str >= 60 or state.position_pos <= 45 or state.debt_deb >= 2:
        return RiskLevel.FRAGILE_GRAVE
    if state.stress_str >= 50 or state.position_pos <= 55 or state.debt_deb == 1:
        return RiskLevel.FRAGILE_MEDIO
    if state.stress_str >= 40 or state.position_pos <= 60:
        return RiskLevel.FRAGILE_LIEVE
    return RiskLevel.ORDINARIO


# -----------------------------------------------------------------------------
# V3.1 — MicroActionDamping
# -----------------------------------------------------------------------------
# Queste funzioni NON modificano la formula madre del nodo.
# Agiscono solo sulla classificazione fine e sull'aggiornamento degli stati dopo il nodo.
# Razionale canonico: STR iniziale alto resta severo nella formula tramite piSTR,
# ma una micro-azione semplice, sicura e di cura personale non deve far esplodere
# automaticamente lo STR prodotto dalla scena.

MICRO_ACTION_KEYWORDS = (
    "bere", "acqua", "idrata", "idratazione", "bicchiere", "bottiglia",
    "sedersi", "alzarsi", "lavarsi", "viso", "respirare", "respiro",
    "appoggiarsi", "appoggio", "tisana", "medicina", "farmaco", "denti",
    "micro", "cura", "rientro", "recupero", "pausa"
)

CARE_RECOVERY_KEYWORDS = (
    "bere", "acqua", "idrata", "idratazione", "sedersi", "respirare",
    "lavarsi", "viso", "appoggiarsi", "tisana", "medicina", "farmaco",
    "rientro", "recupero", "pausa"
)

MICRO_STRESSOR_KEYWORDS = (
    "micro_stressor", "stressor", "imprevisto", "imprevisti", "fretta",
    "urgente", "ritardo", "errore", "mancante", "perso", "persa",
    "smarrito", "chiavi", "chiave", "telefono", "scarico", "batteria",
    "porta", "gas", "luci", "finestra",
    "portafoglio", "documento", "documenti", "interruzione", "deviazione"
)

MICRO_FAMILY_CODES = {"V001", "V002", "V003", "V005", "V006", "V007", "V020"}


def _node_text_for_detection(node: NodeInput) -> str:
    tags = " ".join(str(t) for t in (node.tags or []))
    return f"{node.node_id} {node.description} {node.family_code} {tags}".lower()


def is_micro_action(node: NodeInput) -> bool:
    """Rileva micro-azioni semplici/corporee senza creare nuove variabili canoniche."""
    node = node.normalized()
    text = _node_text_for_detection(node)
    family_ok = node.family_code in MICRO_FAMILY_CODES
    keyword_ok = any(k in text for k in MICRO_ACTION_KEYWORDS)
    complexity_ok = node.modifiers.complexity_c <= 2
    no_debt = node.state_before.debt_deb == 0
    no_strong_kpd = (not node.field_response.active) or node.field_response.strength <= 15
    no_hard_time_pressure = node.modifiers.time_t >= -5
    no_costly_adaptation = node.adaptation.cost_of_adaptation <= 8
    return bool((family_ok or keyword_ok) and complexity_ok and no_debt and no_strong_kpd and no_hard_time_pressure and no_costly_adaptation)


def is_care_recovery_action(node: NodeInput) -> bool:
    """Rileva micro-azioni che possono produrre micro-recupero se riescono bene."""
    node = node.normalized()
    text = _node_text_for_detection(node)
    return is_micro_action(node) and (node.family_code in {"V003", "V005", "V006", "V007"} or any(k in text for k in CARE_RECOVERY_KEYWORDS))


def is_micro_stressor_action(node: NodeInput) -> bool:
    """Rileva micronodi brevi ma non tranquilli: imprevisti, controlli critici, oggetti essenziali."""
    node = node.normalized()
    text = _node_text_for_detection(node)
    return is_micro_action(node) and any(re.search(rf"(?<!\w){re.escape(k)}(?!\w)", text) for k in MICRO_STRESSOR_KEYWORDS)


def micro_action_damping_factor(node: NodeInput) -> float:
    """Fattore di smorzamento V3.1 applicato solo al delta STR/costo post-nodo."""
    node = node.normalized()
    if not is_micro_action(node):
        return 1.0
    # Ambiente e campo: un K/Pd reale o materiale sfavorevole rendono il gesto meno 'micro-safe'.
    material = node.modifiers.material_m
    complexity = node.modifiers.complexity_c
    field_strength = node.field_response.strength if node.field_response.active else 0
    time_pressure = min(0, node.modifiers.time_t)
    adaptation_cost = node.adaptation.cost_of_adaptation
    safety_load = 0
    if material < 0:
        safety_load += abs(material)
    if complexity > 1:
        safety_load += complexity - 1
    if field_strength > 0:
        safety_load += int(field_strength / 10)
    if time_pressure < 0:
        safety_load += int(abs(time_pressure) / 3)
    if adaptation_cost > 0:
        safety_load += int(adaptation_cost / 5)
    if safety_load <= 1:
        return 0.15
    if safety_load <= 4:
        return 0.25
    if safety_load <= 8:
        return 0.50
    return 1.0


def recovery_credit(node: NodeInput, outcome: OutcomeKind, net_margin: int) -> float:
    """Credito di micro-recupero sottratto al delta STR se il gesto è cura/rientro e riesce."""
    if not is_care_recovery_action(node):
        return 0.0
    if outcome == OutcomeKind.SUCCESSO_PULITO and net_margin >= 10:
        return 1.0
    if outcome == OutcomeKind.SUCCESSO_COSTOSO and net_margin >= 0:
        return 0.5
    return 0.0


def micro_damping_metadata(node: NodeInput) -> Dict[str, Any]:
    """Metadata da inserire nel trace/report per rendere trasparente il damping V3.1."""
    micro = is_micro_action(node)
    care = is_care_recovery_action(node)
    stressor = is_micro_stressor_action(node)
    damping = micro_action_damping_factor(node)
    return {
        "v3_1_micro_action": micro,
        "v3_1_care_recovery_action": care,
        "v3_1_micro_stressor_action": stressor,
        "v3_1_damping_factor": damping,
        "v3_1_rule": (
            "MicroActionDamping applicato allo state updater con eccezione micro-stressor: "
            "STR iniziale resta nella formula, ma imprevisti/oggetti essenziali possono produrre delta STR più visibili."
            if stressor else
            "MicroActionDamping applicato allo state updater: STR iniziale resta nella formula, "
            "ma il delta STR prodotto dal micro-gesto viene smorzato."
            if micro else
            "Nessun MicroActionDamping: scena trattata con aggiornamento ordinario."
        ),
    }


def classify_node_outcome(node: NodeInput, pn: int, roll: int, success_before_field: bool, net_margin: int) -> OutcomeKind:
    node = node.normalized()
    state = node.state_before
    high_str = state.stress_str >= 70
    very_high_str = state.stress_str >= 85
    low_pos = state.position_pos <= 35
    very_low_pos = state.position_pos <= 20
    debt_active = state.debt_deb >= 1
    bad_rip = state.rip in {RipKind.ASSENTE, RipKind.FINTA, RipKind.DEBOLE}
    real_support = node.support.is_real_support() or node.support.is_real_delegation()
    fake_support = node.support.is_fake_or_symbolic()
    over_risk = detects_over_adaptation_risk(node)
    costly_adaptation = node.adaptation.cost_of_adaptation >= 15

    if very_high_str and very_low_pos and debt_active and bad_rip and not real_support:
        return OutcomeKind.QUASI_COLLASSO

    if net_margin < -30:
        if high_str and low_pos and bad_rip:
            return OutcomeKind.FALLIMENTO_SISTEMICO
        return OutcomeKind.FALLIMENTO_TECNICO

    if success_before_field and net_margin >= 0:
        micro = is_micro_action(node)
        care_recovery = is_care_recovery_action(node)
        if over_risk or costly_adaptation or (very_high_str and low_pos and bad_rip) or fake_support:
            return OutcomeKind.SUCCESSO_TOSSICO
        if state.stress_str >= 85 and state.position_pos <= 35 and not micro:
            return OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO
        if high_str or low_pos or debt_active or state.hidden_cost >= 50:
            # V3.1: nelle micro-azioni sicure lo STR alto resta severo, ma non basta
            # da solo a trasformare il nodo in successo danneggiato. Il danno richiede
            # convergenza con POS basso, DEB, costo alto, K/Pd o margine fragile.
            if micro and not low_pos and not debt_active and state.hidden_cost < 50 and not node.field_response.active:
                if net_margin >= 10 and care_recovery:
                    return OutcomeKind.SUCCESSO_COSTOSO
                if net_margin <= 9:
                    return OutcomeKind.SUCCESSO_COSTOSO
                return OutcomeKind.SUCCESSO_COSTOSO
            return OutcomeKind.SUCCESSO_DANNEGGIATO
        if net_margin <= 9 or state.stress_str >= 55 or node.adaptation.cost_of_adaptation >= 8:
            return OutcomeKind.SUCCESSO_COSTOSO
        return OutcomeKind.SUCCESSO_PULITO

    if not success_before_field or net_margin < 0:
        if high_str and low_pos and bad_rip and debt_active:
            return OutcomeKind.FALLIMENTO_SISTEMICO
        if abs(net_margin) <= 15:
            return OutcomeKind.FALLIMENTO_LIEVE
        return OutcomeKind.FALLIMENTO_TECNICO

    return OutcomeKind.FALLIMENTO_LIEVE


def estimate_hidden_cost_delta(node: NodeInput, outcome: OutcomeKind, net_margin: int) -> int:
    node = node.normalized()
    base = 0
    if outcome == OutcomeKind.SUCCESSO_PULITO:
        base = 0
    elif outcome == OutcomeKind.SUCCESSO_COSTOSO:
        base = 5
    elif outcome == OutcomeKind.SUCCESSO_DANNEGGIATO:
        base = 10
    elif outcome == OutcomeKind.SUCCESSO_TOSSICO:
        base = 18
    elif outcome == OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO:
        base = 22
    elif outcome == OutcomeKind.FALLIMENTO_LIEVE:
        base = 6
    elif outcome == OutcomeKind.FALLIMENTO_TECNICO:
        base = 7
    elif outcome == OutcomeKind.FALLIMENTO_SISTEMICO:
        base = 18
    elif outcome == OutcomeKind.QUASI_COLLASSO:
        base = 25

    if abs(net_margin) <= 9:
        base += 3
    if node.support.is_real_support() or node.support.is_real_delegation():
        base -= int(6 * node.support.load_reduction_score)
    if node.support.is_fake_or_symbolic() or node.support.is_invasive():
        base += 5
    if node.adaptation.cost_of_adaptation:
        base += int(node.adaptation.cost_of_adaptation * 0.5)

    # V3.1: micro-azioni sicure/corporee non devono generare costo nascosto
    # sproporzionato. La formula madre resta invariata; si smorza solo il costo post-nodo.
    if is_micro_action(node):
        damping = micro_action_damping_factor(node)
        base = int(round(base * damping))
        if is_care_recovery_action(node) and outcome in {OutcomeKind.SUCCESSO_PULITO, OutcomeKind.SUCCESSO_COSTOSO} and net_margin >= 0:
            base = max(0, base - int(recovery_credit(node, outcome, net_margin)))
    return clamp_int(base, 0, 30)


def estimate_delta_str(node: NodeInput, outcome: OutcomeKind, net_margin: int) -> int:
    node = node.normalized()
    if outcome == OutcomeKind.SUCCESSO_PULITO:
        base = -2
    elif outcome == OutcomeKind.SUCCESSO_COSTOSO:
        base = 4
    elif outcome == OutcomeKind.SUCCESSO_DANNEGGIATO:
        base = 8
    elif outcome == OutcomeKind.SUCCESSO_TOSSICO:
        base = 12
    elif outcome == OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO:
        base = 15
    elif outcome == OutcomeKind.FALLIMENTO_TECNICO:
        base = 5
    elif outcome == OutcomeKind.FALLIMENTO_LIEVE:
        base = 7
    elif outcome == OutcomeKind.FALLIMENTO_SISTEMICO:
        base = 15
    else:
        base = 20

    if node.support.is_real_support() or node.support.is_real_delegation():
        base -= int(8 * node.support.load_reduction_score)
    if node.state_before.rip in {RipKind.VERA, RipKind.PIENA}:
        base -= 4
    if node.adaptation.is_operational():
        base -= int(5 * node.adaptation.expected_load_reduction)
    if node.field_response.active and node.field_response.strength >= 25:
        base += 4
    if node.support.is_invasive():
        base += 3

    # V3.1 — MicroActionDamping nello state updater.
    # STR iniziale resta severo nella formula tramite piSTR; qui correggiamo solo
    # l'incremento prodotto da micro-azioni semplici, sicure e di cura/rientro.
    if is_micro_action(node):
        damping = micro_action_damping_factor(node)
        stressor = is_micro_stressor_action(node)
        if base > 0:
            base = int(round(base * (max(damping, 0.65) if stressor else damping)))
        credit = recovery_credit(node, outcome, net_margin)
        base = int(round(base - credit))
        # Range prudenziale per micro-azioni: non esplodere, ma nemmeno ignorare
        # fallimenti, K/Pd o piccole frizioni reali.
        if stressor and outcome == OutcomeKind.SUCCESSO_PULITO:
            resolved = -4 if net_margin >= 35 else (-3 if net_margin >= 10 else -2)
            base = clamp_int(min(base, resolved), -4, -2)
        elif stressor and outcome == OutcomeKind.SUCCESSO_COSTOSO:
            base = clamp_int(base, 2, 3)
        elif stressor and outcome == OutcomeKind.FALLIMENTO_LIEVE:
            base = clamp_int(base, 2, 3)
        elif stressor and outcome in {OutcomeKind.FALLIMENTO_TECNICO, OutcomeKind.FALLIMENTO_SISTEMICO, OutcomeKind.QUASI_COLLASSO}:
            base = 4
        elif stressor and node.field_response.active and node.field_response.strength >= 25:
            base = clamp_int(base + 2, 2, 4)
        elif stressor:
            base = clamp_int(base, -4, 4)
        elif outcome == OutcomeKind.FALLIMENTO_LIEVE:
            base = clamp_int(base, 0, 2)
        elif outcome in {OutcomeKind.FALLIMENTO_TECNICO, OutcomeKind.FALLIMENTO_SISTEMICO, OutcomeKind.QUASI_COLLASSO}:
            base = clamp_int(base, 1, 4)
        elif node.field_response.active and node.field_response.strength >= 25:
            base = clamp_int(base + 2, 1, 4)
        else:
            base = clamp_int(base, -2, 2)
    return base


def estimate_delta_pos(node: NodeInput, outcome: OutcomeKind, net_margin: int) -> int:
    node = node.normalized()
    if outcome == OutcomeKind.SUCCESSO_PULITO:
        delta = 2
    elif outcome == OutcomeKind.SUCCESSO_COSTOSO:
        delta = -1
    elif outcome == OutcomeKind.SUCCESSO_DANNEGGIATO:
        delta = -4
    elif outcome == OutcomeKind.SUCCESSO_TOSSICO:
        delta = -7
    elif outcome == OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO:
        delta = -9
    elif outcome == OutcomeKind.FALLIMENTO_TECNICO:
        delta = -3
    elif outcome == OutcomeKind.FALLIMENTO_LIEVE:
        delta = -5
    elif outcome == OutcomeKind.FALLIMENTO_SISTEMICO:
        delta = -10
    else:
        delta = -15

    if node.support.is_real_support() or node.support.is_real_delegation():
        delta += int(5 * node.support.load_reduction_score)
    if node.adaptation.creates_real_rip:
        delta += 3
    if node.support.is_invasive():
        delta -= 4

    # V3.1: micro-recupero riuscito può proteggere o migliorare POS, anche se
    # lo STR iniziale rende l'esito 'costoso sostenibile'.
    if is_micro_action(node):
        if is_care_recovery_action(node) and outcome in {OutcomeKind.SUCCESSO_PULITO, OutcomeKind.SUCCESSO_COSTOSO} and net_margin >= 0:
            delta = max(delta, 1)
        elif outcome == OutcomeKind.SUCCESSO_COSTOSO and net_margin >= 0:
            delta = max(delta, 0)
        elif outcome == OutcomeKind.FALLIMENTO_LIEVE:
            delta = max(delta, -2)
    return delta


def estimate_delta_deb(node: NodeInput, outcome: OutcomeKind) -> int:
    node = node.normalized()
    state = node.state_before
    high_str = state.stress_str >= 70
    bad_rip = state.rip in {RipKind.ASSENTE, RipKind.FINTA, RipKind.DEBOLE}
    bad_outcome = outcome in {
        OutcomeKind.SUCCESSO_TOSSICO,
        OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO,
        OutcomeKind.FALLIMENTO_SISTEMICO,
        OutcomeKind.QUASI_COLLASSO,
        OutcomeKind.SUCCESSO_DANNEGGIATO,
    }
    no_real_adaptation = not node.adaptation.is_operational()
    if high_str and bad_rip and bad_outcome and no_real_adaptation:
        return 1
    if node.adaptation.is_operational() or node.support.is_real_support() or state.rip in {RipKind.VERA, RipKind.PIENA}:
        return -1 if state.debt_deb > 0 else 0
    return 0


def estimate_next_bp(node: NodeInput, outcome: OutcomeKind) -> int:
    node = node.normalized()
    if outcome in {OutcomeKind.FALLIMENTO_SISTEMICO, OutcomeKind.QUASI_COLLASSO, OutcomeKind.SUCCESSO_TOSSICO}:
        return 0
    bp = 0
    if node.support.is_real_support():
        bp += 5
    if node.support.is_real_delegation():
        bp += 8
    if node.adaptation.is_operational():
        bp += 5
    if node.adaptation.creates_real_rip:
        bp += 5
    return clamp_int(bp, 0, 15)


def estimate_next_rip(node: NodeInput, outcome: OutcomeKind) -> RipKind:
    node = node.normalized()
    if node.adaptation.creates_real_rip and outcome != OutcomeKind.QUASI_COLLASSO:
        if node.adaptation.availability == AvailabilityKind.TARDIVA:
            return RipKind.TARDIVA
        return RipKind.VERA
    if outcome == OutcomeKind.SUCCESSO_PULITO:
        return RipKind.ASSENTE
    if outcome == OutcomeKind.SUCCESSO_COSTOSO and node.adaptation.is_operational():
        return RipKind.DEBOLE
    if outcome in {OutcomeKind.SUCCESSO_TOSSICO, OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO}:
        return RipKind.FINTA
    if outcome in {OutcomeKind.FALLIMENTO_SISTEMICO, OutcomeKind.QUASI_COLLASSO}:
        return RipKind.ASSENTE
    return node.state_before.rip


def update_ri4(node: NodeInput, outcome: OutcomeKind, hidden_cost_delta: int) -> Ri4State:
    node = node.normalized()
    ri4 = node.state_before.ri4.normalized()
    dr = dd = dp = du = 0.0

    if outcome == OutcomeKind.SUCCESSO_PULITO:
        dr += 0.03; dd += 0.02; dp += 0.02; du += 0.04
    elif outcome == OutcomeKind.SUCCESSO_COSTOSO:
        dr += 0.01; dd += 0.01; dp -= 0.01; du += 0.02
    elif outcome == OutcomeKind.SUCCESSO_DANNEGGIATO:
        dr -= 0.03; dd -= 0.02; dp -= 0.04; du -= 0.02
    elif outcome in {OutcomeKind.SUCCESSO_TOSSICO, OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO}:
        dr -= 0.08; dd -= 0.05; dp -= 0.08; du -= 0.07
    elif outcome == OutcomeKind.FALLIMENTO_TECNICO:
        dr -= 0.02; dd += 0.00; dp -= 0.03; du -= 0.02
    elif outcome == OutcomeKind.FALLIMENTO_LIEVE:
        dr -= 0.03; dd -= 0.01; dp -= 0.04; du -= 0.03
    elif outcome == OutcomeKind.FALLIMENTO_SISTEMICO:
        dr -= 0.10; dd -= 0.08; dp -= 0.10; du -= 0.08
    elif outcome == OutcomeKind.QUASI_COLLASSO:
        dr -= 0.18; dd -= 0.15; dp -= 0.18; du -= 0.15

    if node.support.is_real_delegation():
        dp += 0.10; dr += 0.06
    elif node.support.is_real_support():
        dp += 0.06; dr += 0.04
    if node.adaptation.creates_real_rip:
        dd += 0.10; du += 0.05
    if node.support.is_fake_or_symbolic():
        dp -= 0.04
    if hidden_cost_delta >= 15:
        dr -= 0.04; du -= 0.04

    return Ri4State(
        rientro=clamp_float(ri4.rientro + dr, 0.0, 1.0),
        riparazione=clamp_float(ri4.riparazione + dd, 0.0, 1.0),
        riduzione=clamp_float(ri4.riduzione + dp, 0.0, 1.0),
        ripresa=clamp_float(ri4.ripresa + du, 0.0, 1.0),
    )


def estimate_next_or1(node: NodeInput, outcome: OutcomeKind) -> float:
    node = node.normalized()
    current = node.state_before.or1_orientation
    deltas = {
        OutcomeKind.SUCCESSO_PULITO: 0.05,
        OutcomeKind.SUCCESSO_COSTOSO: -0.02,
        OutcomeKind.SUCCESSO_DANNEGGIATO: -0.06,
        OutcomeKind.SUCCESSO_TOSSICO: -0.10,
        OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO: -0.12,
        OutcomeKind.FALLIMENTO_TECNICO: -0.03,
        OutcomeKind.FALLIMENTO_LIEVE: -0.05,
        OutcomeKind.FALLIMENTO_SISTEMICO: -0.15,
        OutcomeKind.QUASI_COLLASSO: -0.25,
    }
    current += deltas.get(outcome, 0.0)
    if node.adaptation.is_operational():
        current += 0.08
    if node.support.is_real_support() or node.support.is_real_delegation():
        current += 0.06
    return clamp_float(current, 0.0, 1.0)


def update_floor_and_cooldown(state: SystemState, outcome: OutcomeKind, config: EngineConfig = DEFAULT_CONFIG) -> Tuple[bool, str, int]:
    state = state.normalized()
    floor = state.floor1_active
    reason = state.floor1_reason
    cooldown = max(0, state.cooldown_remaining - 1)

    if state.stress_str >= 85 or state.position_pos <= 25 or state.hidden_cost >= 70:
        floor = True
        reason = "STR/POS/costo in area rossa: il sistema non risale subito con una sola pausa."
        cooldown = max(cooldown, config.cooldown_min_after_red + 1)
    elif outcome in {OutcomeKind.FALLIMENTO_SISTEMICO, OutcomeKind.QUASI_COLLASSO, OutcomeKind.SUCCESSO_TOSSICO}:
        floor = True
        reason = "Esito critico: serve rientro reale prima di caricare nuovi compiti."
        cooldown = max(cooldown, config.cooldown_min_after_red)
    elif state.stress_str <= 55 and state.position_pos >= 50 and state.hidden_cost <= 35 and state.ri4.score >= 0.50:
        floor = False
        reason = ""

    return floor, reason, cooldown


def update_state_after_node(node: NodeInput, outcome: OutcomeKind, net_margin: int, hidden_cost_delta: int, config: EngineConfig = DEFAULT_CONFIG) -> SystemState:
    node = node.normalized()
    state = node.state_before
    delta_str = estimate_delta_str(node, outcome, net_margin)
    delta_pos = estimate_delta_pos(node, outcome, net_margin)
    delta_deb = estimate_delta_deb(node, outcome)
    new_ri4 = update_ri4(node, outcome, hidden_cost_delta)
    provisional = SystemState(
        stress_str=clamp_int(state.stress_str + delta_str, 0, 100),
        position_pos=clamp_int(state.position_pos + delta_pos, 0, 100),
        debt_deb=max(0, state.debt_deb + delta_deb),
        protective_bonus_bp=estimate_next_bp(node, outcome),
        rip=estimate_next_rip(node, outcome),
        or1_orientation=estimate_next_or1(node, outcome),
        ri4=new_ri4,
        macro=state.macro,
        cooldown_remaining=state.cooldown_remaining,
        floor1_active=state.floor1_active,
        floor1_reason=state.floor1_reason,
        hidden_cost=clamp_int(state.hidden_cost + hidden_cost_delta, 0, 100),
    ).normalized()
    floor, reason, cooldown = update_floor_and_cooldown(provisional, outcome, config)
    provisional.floor1_active = floor
    provisional.floor1_reason = reason
    provisional.cooldown_remaining = cooldown
    return provisional.normalized()


def build_levers(node: NodeInput, pn: int, field_margin: int) -> Dict[str, Any]:
    node = node.normalized()
    return {
        "P0": node.base_probability_p0,
        "E": node.modifiers.energy_e,
        "I": node.modifiers.information_i,
        "T": node.modifiers.time_t,
        "M": node.modifiers.material_m,
        "BP_node": node.modifiers.protective_bonus_bp,
        "BP_state": node.state_before.protective_bonus_bp,
        "C": node.modifiers.complexity_c,
        "STR": node.state_before.stress_str,
        "piSTR": str_penalty(node.state_before.stress_str),
        "DEB": node.state_before.debt_deb,
        "DEB_penalty": 5 * node.state_before.debt_deb,
        "POS": node.state_before.position_pos,
        "RIP": node.state_before.rip.value,
        "K/Pd_active": node.field_response.active,
        "K/Pd_margin": field_margin,
        "support": node.support.support_kind.value,
        "delegation": node.support.delegation_kind.value,
        "adaptation": node.adaptation.kind.value,
        "adaptation_availability": node.adaptation.availability.value,
        "profile": node.profile.value,
        "micro_action_v3_1": micro_damping_metadata(node),
        "Pn": pn,
    }


def build_node_warnings(node: NodeInput, outcome: OutcomeKind, state_after: SystemState) -> List[str]:
    node = node.normalized()
    warnings: List[str] = []
    if outcome == OutcomeKind.SUCCESSO_TOSSICO:
        warnings.append("Successo tecnico con possibile costo tossico: non va letto come riuscita sana.")
    if outcome == OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO:
        warnings.append("Prestazione completata, ma costo umano troppo alto: successo tecnico / fallimento umano.")
    if detects_over_adaptation_risk(node):
        warnings.append("Rischio over-functioning: il sistema può funzionare perché una sola persona si consuma.")
    if node.support.is_fake_or_symbolic():
        warnings.append("Supporto presente ma con scarico reale basso o nullo.")
    if node.support.delegation_kind == DelegationKind.FINTA:
        warnings.append("Delega finta: il carico sembra trasferito ma resta sulla persona.")
    if node.support.is_invasive():
        warnings.append("Supporto/delega invasiva: possibile peggioramento di POS o dei confini.")
    if node.adaptation.is_late_or_fake():
        warnings.append("Adattamento non pienamente disponibile: teorico, tardivo, finto o assente.")
    if state_after.stress_str >= 85:
        warnings.append("STR finale molto alta: serve rientro reale, non solo chiusura della scena.")
    if state_after.position_pos <= 30:
        warnings.append("POS finale bassa: assetto operativo, corporeo o relazionale compromesso.")
    if state_after.floor1_active:
        warnings.append("floor1 attivo: il sistema non recupera subito con una singola pausa.")
    if is_micro_action(node):
        warnings.append("V3.1: micro-azione riconosciuta; STR iniziale resta severo, ma l'accumulo prodotto dal gesto è smorzato.")
    if outcome == OutcomeKind.QUASI_COLLASSO:
        warnings.append("Quasi-collasso: poche priorità praticabili, riduzione immediata del carico.")
    return warnings


def build_operational_notes(node: NodeInput, outcome: OutcomeKind, state_after: SystemState) -> List[str]:
    node = node.normalized()
    notes: List[str] = []
    if outcome == OutcomeKind.SUCCESSO_PULITO:
        notes.append("Mantenere la strategia: esito pulito e costo basso.")
    elif outcome == OutcomeKind.SUCCESSO_COSTOSO:
        notes.append("Prevedere recupero breve e riduzione del carico successivo.")
    elif outcome == OutcomeKind.SUCCESSO_DANNEGGIATO:
        notes.append("Non caricare subito un nuovo compito pesante: controllare STR, POS e recupero.")
    elif outcome in {OutcomeKind.SUCCESSO_TOSSICO, OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO}:
        notes.append("Separare risultato esterno e costo interno: serve supporto reale, delega o riduzione scope.")
    elif outcome == OutcomeKind.FALLIMENTO_TECNICO:
        notes.append("Trattare come problema tecnico o di campo, non come fallimento personale.")
    elif outcome == OutcomeKind.FALLIMENTO_SISTEMICO:
        notes.append("Ridurre complessità, attivare supporto reale e interrompere perseverazione.")
    elif outcome == OutcomeKind.QUASI_COLLASSO:
        notes.append("Priorità: sicurezza, riduzione carico, supporto reale, rinvio del non urgente.")

    if node.adaptation.availability == AvailabilityKind.TEORICA:
        notes.append("Il ramo adattivo è solo teorico: trasformarlo in azione concreta o non premiarlo nel calcolo.")
    if node.support.support_kind == SupportKind.EMOTIVO and node.support.load_reduction_score < 0.25:
        notes.append("Il supporto emotivo può aiutare POS, ma non sostituisce scarico pratico del carico.")
    if is_micro_action(node):
        notes.append("Applicato criterio V3.1 MicroActionDamping: evitare di trasformare un micro-gesto sicuro in accumulo STR sproporzionato.")
    if state_after.cooldown_remaining > 0:
        notes.append(f"Cooldown residuo: {state_after.cooldown_remaining}. Evitare nuova sequenza pesante immediata.")
    return notes


def run_node(node: NodeInput, *, roll: Optional[int] = None, rng: Optional[Random] = None, config: EngineConfig = DEFAULT_CONFIG) -> NodeResult:
    node = node.normalized()
    rng = rng or Random()
    pn = calculate_pn(node, config)
    actual_roll = clamp_int(roll if roll is not None else rng.randint(1, 100), 1, 100)
    success_before_field = actual_roll <= pn
    raw_margin = pn - actual_roll if success_before_field else actual_roll - pn
    field_margin = calculate_field_margin(node.field_response)
    net_margin = raw_margin - field_margin if success_before_field else -raw_margin - field_margin
    outcome = classify_node_outcome(node, pn, actual_roll, success_before_field, net_margin)
    hidden_cost_delta = estimate_hidden_cost_delta(node, outcome, net_margin)
    state_after = update_state_after_node(node, outcome, net_margin, hidden_cost_delta, config)
    risk = classify_risk(state_after, outcome)
    warnings = build_node_warnings(node, outcome, state_after)
    notes = build_operational_notes(node, outcome, state_after)
    levers = build_levers(node, pn, field_margin)
    return NodeResult(
        node_id=node.node_id,
        description=node.description,
        family_code=node.family_code,
        probability_pn=pn,
        roll=actual_roll,
        success_before_field=success_before_field,
        raw_margin=raw_margin,
        field_margin=field_margin,
        net_margin=net_margin,
        outcome=outcome,
        risk_level=risk,
        state_before=node.state_before,
        state_after=state_after,
        hidden_cost_delta=hidden_cost_delta,
        warnings=warnings,
        operational_notes=notes,
        levers=levers,
    )


# =============================================================================
# 6. MOTORI TEMPORALI: SCENA, CATENA, MINI-SETTIMANA, TRAIETTORIA
# =============================================================================


def apply_state_to_node(node: NodeInput, state: SystemState) -> NodeInput:
    n = node.normalized()
    return NodeInput(
        node_id=n.node_id,
        description=n.description,
        base_probability_p0=n.base_probability_p0,
        modifiers=n.modifiers,
        state_before=state.normalized(),
        field_response=n.field_response,
        support=n.support,
        adaptation=n.adaptation,
        profile=n.profile,
        family_code=n.family_code,
        tags=n.tags,
    )


def classify_aggregate_outcome(outcomes: Sequence[OutcomeKind], final_state: SystemState) -> OutcomeKind:
    final_state = final_state.normalized()
    outcomes = list(outcomes)
    if not outcomes:
        return OutcomeKind.FALLIMENTO_TECNICO
    if OutcomeKind.QUASI_COLLASSO in outcomes:
        return OutcomeKind.QUASI_COLLASSO
    if OutcomeKind.FALLIMENTO_SISTEMICO in outcomes and final_state.stress_str >= 75:
        return OutcomeKind.FALLIMENTO_SISTEMICO
    if OutcomeKind.SUCCESSO_TOSSICO in outcomes:
        return OutcomeKind.SUCCESSO_TOSSICO
    if OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO in outcomes:
        return OutcomeKind.SUCCESSO_TECNICO_FALLIMENTO_UMANO
    if final_state.stress_str >= 80 and final_state.position_pos <= 35:
        return OutcomeKind.SUCCESSO_DANNEGGIATO
    if any(o == OutcomeKind.FALLIMENTO_TECNICO for o in outcomes):
        if final_state.stress_str < 70 and final_state.position_pos >= 45:
            return OutcomeKind.FALLIMENTO_TECNICO
        return OutcomeKind.SUCCESSO_DANNEGGIATO
    if any(o == OutcomeKind.SUCCESSO_DANNEGGIATO for o in outcomes):
        return OutcomeKind.SUCCESSO_DANNEGGIATO
    if any(o == OutcomeKind.SUCCESSO_COSTOSO for o in outcomes):
        return OutcomeKind.SUCCESSO_COSTOSO
    if all(o == OutcomeKind.SUCCESSO_PULITO for o in outcomes):
        return OutcomeKind.SUCCESSO_PULITO
    return OutcomeKind.FALLIMENTO_LIEVE


def partial_recovery_between_scenes(state: SystemState, config: EngineConfig = DEFAULT_CONFIG) -> SystemState:
    state = state.normalized()
    # Recupero parziale prudenziale: non azzera STR/DEB né ripristina POS magicamente.
    factor = config.scene_recovery_factor
    str_reduction = int(max(0, state.stress_str - 35) * factor * state.ri4.score)
    pos_gain = int(max(0, 65 - state.position_pos) * factor * state.ri4.score)
    hidden_reduction = int(max(0, state.hidden_cost - 20) * factor * state.ri4.score)
    new_deb = state.debt_deb
    if state.rip in {RipKind.VERA, RipKind.PIENA} and state.ri4.score >= 0.60 and new_deb > 0:
        new_deb -= 1
    return SystemState(
        stress_str=clamp_int(state.stress_str - str_reduction, 0, 100),
        position_pos=clamp_int(state.position_pos + pos_gain, 0, 100),
        debt_deb=max(0, new_deb),
        protective_bonus_bp=max(0, int(state.protective_bonus_bp * 0.5)),
        rip=state.rip,
        or1_orientation=clamp_float(state.or1_orientation + 0.02 * state.ri4.score, 0.0, 1.0),
        ri4=state.ri4,
        macro=state.macro,
        cooldown_remaining=max(0, state.cooldown_remaining - 1),
        floor1_active=state.floor1_active,
        floor1_reason=state.floor1_reason,
        hidden_cost=clamp_int(state.hidden_cost - hidden_reduction, 0, 100),
    ).normalized()


def partial_recovery_between_days(state: SystemState, config: EngineConfig = DEFAULT_CONFIG) -> SystemState:
    state = state.normalized()
    factor = config.day_recovery_factor
    # floor1 e cooldown limitano il recupero anche tra giorni.
    if state.floor1_active or state.cooldown_remaining > 0:
        factor *= 0.45
    str_reduction = int(max(0, state.stress_str - 30) * factor * state.ri4.score)
    pos_gain = int(max(0, 70 - state.position_pos) * factor * state.ri4.score)
    hidden_reduction = int(max(0, state.hidden_cost - 15) * factor * state.ri4.score)
    new_deb = state.debt_deb
    if state.rip in {RipKind.VERA, RipKind.PIENA} and state.ri4.score >= 0.65 and new_deb > 0:
        new_deb -= 1
    return SystemState(
        stress_str=clamp_int(state.stress_str - str_reduction, 0, 100),
        position_pos=clamp_int(state.position_pos + pos_gain, 0, 100),
        debt_deb=max(0, new_deb),
        protective_bonus_bp=0,
        rip=RipKind.ASSENTE if state.rip == RipKind.DEBOLE else state.rip,
        or1_orientation=clamp_float(state.or1_orientation + 0.04 * state.ri4.score, 0.0, 1.0),
        ri4=state.ri4,
        macro=state.macro,
        cooldown_remaining=max(0, state.cooldown_remaining - 1),
        floor1_active=state.floor1_active and not (state.stress_str < 65 and state.position_pos > 45),
        floor1_reason=state.floor1_reason,
        hidden_cost=clamp_int(state.hidden_cost - hidden_reduction, 0, 100),
    ).normalized()


def build_report_summary(level: TemporalLevel, title: str, outcome: OutcomeKind, risk: RiskLevel, initial: SystemState, final: SystemState, counts: Dict[str, int], warnings: List[str], notes: List[str]) -> Dict[str, Any]:
    return {
        "level": level.value,
        "title": title,
        "esito_apparente": outcome.value,
        "rischio": risk.value,
        "stato_iniziale": to_plain_data(initial),
        "stato_finale": to_plain_data(final),
        "delta": {
            "STR": final.stress_str - initial.stress_str,
            "POS": final.position_pos - initial.position_pos,
            "DEB": final.debt_deb - initial.debt_deb,
            "hidden_cost": final.hidden_cost - initial.hidden_cost,
            "or1": round(final.or1_orientation - initial.or1_orientation, 3),
            "ri4": round(final.ri4.score - initial.ri4.score, 3),
        },
        "conteggi_esiti": counts,
        "avvisi": warnings,
        "indicazioni": notes,
        "limite_metodologico": "Simulazione logico-matematica orientativa: non diagnosi clinica, non predizione certa, non sostituto di professionisti.",
    }


def run_scene(scene: SceneInput, *, rng: Optional[Random] = None, rolls: Optional[Sequence[int]] = None, config: EngineConfig = DEFAULT_CONFIG) -> SceneResult:
    rng = rng or Random()
    if not scene.nodes:
        empty = SystemState()
        report = build_report_summary(TemporalLevel.SCENA, scene.title, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, empty, empty, {}, ["Scena senza nodi."], [])
        return SceneResult(scene.scene_id, scene.title, scene.family_code, [], empty, empty, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, report)

    initial_state = scene.nodes[0].state_before.normalized()
    current_state = initial_state
    results: List[NodeResult] = []
    rolls = list(rolls or [])
    for index, node in enumerate(scene.nodes):
        node_with_state = apply_state_to_node(node, current_state)
        result = run_node(node_with_state, roll=rolls[index] if index < len(rolls) else None, rng=rng, config=config)
        results.append(result)
        current_state = result.state_after

    outcome = classify_aggregate_outcome([r.outcome for r in results], current_state)
    risk = classify_risk(current_state, outcome)
    counts = count_outcomes([r.outcome for r in results])
    warnings = aggregate_unique([w for r in results for w in r.warnings])
    notes = aggregate_unique([n for r in results for n in r.operational_notes])
    report = build_report_summary(TemporalLevel.SCENA, scene.title, outcome, risk, initial_state, current_state, counts, warnings, notes)
    report["nodi"] = [node_result_card(r) for r in results]
    return SceneResult(scene.scene_id, scene.title, scene.family_code, results, initial_state, current_state, outcome, risk, report)


def run_chain(chain: ChainInput, *, rng: Optional[Random] = None, config: EngineConfig = DEFAULT_CONFIG) -> ChainResult:
    rng = rng or Random()
    if not chain.scenes:
        empty = SystemState(macro=MacroRegime.MACRO_1_CATENA_BREVE)
        report = build_report_summary(TemporalLevel.CATENA_BREVE, chain.title, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, empty, empty, {}, ["Catena senza scene."], [])
        return ChainResult(chain.chain_id, chain.title, [], empty, empty, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, report)

    # La prima scena contiene lo stato iniziale. Le successive vengono alimentate dal trasferimento.
    initial_state = chain.scenes[0].nodes[0].state_before.normalized() if chain.scenes[0].nodes else SystemState()
    initial_state.macro = MacroRegime.MACRO_1_CATENA_BREVE
    current_state = initial_state
    scene_results: List[SceneResult] = []

    for scene in chain.scenes:
        patched_nodes = [apply_state_to_node(node, current_state) for node in scene.nodes]
        patched_scene = SceneInput(scene.scene_id, scene.title, patched_nodes, scene.family_code, scene.notes)
        scene_result = run_scene(patched_scene, rng=rng, config=config)
        scene_results.append(scene_result)
        current_state = partial_recovery_between_scenes(scene_result.final_state, config=config)
        current_state.macro = MacroRegime.MACRO_1_CATENA_BREVE

    final_state = scene_results[-1].final_state if scene_results else current_state
    outcome = classify_aggregate_outcome([s.scene_outcome for s in scene_results], final_state)
    risk = classify_risk(final_state, outcome)
    counts = count_outcomes([s.scene_outcome for s in scene_results])
    warnings = aggregate_unique([w for s in scene_results for w in s.report.get("avvisi", [])])
    notes = aggregate_unique([n for s in scene_results for n in s.report.get("indicazioni", [])])
    report = build_report_summary(TemporalLevel.CATENA_BREVE, chain.title, outcome, risk, initial_state, final_state, counts, warnings, notes)
    report["scene"] = [s.report for s in scene_results]
    return ChainResult(chain.chain_id, chain.title, scene_results, initial_state, final_state, outcome, risk, report)


def run_miniweek(miniweek: MiniWeekInput, *, rng: Optional[Random] = None, config: EngineConfig = DEFAULT_CONFIG) -> MiniWeekResult:
    rng = rng or Random()
    if not miniweek.chains_by_day:
        empty = SystemState(macro=MacroRegime.MACRO_2_MINI_SETTIMANA_LEGGERA)
        report = build_report_summary(TemporalLevel.MINI_SETTIMANA, miniweek.title, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, empty, empty, {}, ["Mini-settimana senza catene."], [])
        return MiniWeekResult(miniweek.miniweek_id, miniweek.title, [], empty, empty, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, report)

    first_chain = miniweek.chains_by_day[0]
    initial_state = first_chain.scenes[0].nodes[0].state_before.normalized() if first_chain.scenes and first_chain.scenes[0].nodes else SystemState()
    initial_state.macro = MacroRegime.MACRO_2_MINI_SETTIMANA_LEGGERA
    current_state = initial_state
    day_results: List[ChainResult] = []

    for day_idx, chain in enumerate(miniweek.chains_by_day, start=1):
        patched_scenes: List[SceneInput] = []
        for s_idx, scene in enumerate(chain.scenes):
            nodes = [apply_state_to_node(node, current_state if s_idx == 0 else node.state_before) for node in scene.nodes]
            patched_scenes.append(SceneInput(scene.scene_id, scene.title, nodes, scene.family_code, scene.notes))
        patched_chain = ChainInput(chain.chain_id or f"day_{day_idx}", chain.title, patched_scenes, chain.notes)
        chain_result = run_chain(patched_chain, rng=rng, config=config)
        day_results.append(chain_result)
        current_state = partial_recovery_between_days(chain_result.final_state, config=config)
        current_state.macro = MacroRegime.MACRO_2_MINI_SETTIMANA_LEGGERA

    final_state = day_results[-1].final_state if day_results else current_state
    outcome = classify_aggregate_outcome([d.chain_outcome for d in day_results], final_state)
    risk = classify_risk(final_state, outcome)
    counts = count_outcomes([d.chain_outcome for d in day_results])
    warnings = aggregate_unique([w for d in day_results for w in d.report.get("avvisi", [])])
    notes = aggregate_unique([n for d in day_results for n in d.report.get("indicazioni", [])])
    report = build_report_summary(TemporalLevel.MINI_SETTIMANA, miniweek.title, outcome, risk, initial_state, final_state, counts, warnings, notes)
    report["giorni"] = [d.report for d in day_results]
    return MiniWeekResult(miniweek.miniweek_id, miniweek.title, day_results, initial_state, final_state, outcome, risk, report)


def run_trajectory(trajectory: TrajectoryInput, *, rng: Optional[Random] = None, config: EngineConfig = DEFAULT_CONFIG) -> TrajectoryResult:
    rng = rng or Random()
    if not trajectory.miniweeks:
        empty = SystemState(macro=MacroRegime.MACRO_3_RIPETIZIONE_PESANTE_RECUPERABILE)
        report = build_report_summary(TemporalLevel.TRAIETTORIA_LUNGA, trajectory.title, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, empty, empty, {}, ["Traiettoria senza mini-settimane."], [])
        return TrajectoryResult(trajectory.trajectory_id, trajectory.title, [], empty, empty, OutcomeKind.FALLIMENTO_TECNICO, RiskLevel.ORDINARIO, report)

    first = trajectory.miniweeks[0]
    initial_state = first.chains_by_day[0].scenes[0].nodes[0].state_before.normalized() if first.chains_by_day and first.chains_by_day[0].scenes and first.chains_by_day[0].scenes[0].nodes else SystemState()
    initial_state.macro = MacroRegime.MACRO_3_RIPETIZIONE_PESANTE_RECUPERABILE
    current_state = initial_state
    miniweek_results: List[MiniWeekResult] = []

    for idx, mw in enumerate(trajectory.miniweeks, start=1):
        patched_chains: List[ChainInput] = []
        for c_idx, chain in enumerate(mw.chains_by_day):
            patched_scenes = []
            for s_idx, scene in enumerate(chain.scenes):
                nodes = [apply_state_to_node(node, current_state if c_idx == 0 and s_idx == 0 else node.state_before) for node in scene.nodes]
                patched_scenes.append(SceneInput(scene.scene_id, scene.title, nodes, scene.family_code, scene.notes))
            patched_chains.append(ChainInput(chain.chain_id, chain.title, patched_scenes, chain.notes))
        mw_result = run_miniweek(MiniWeekInput(mw.miniweek_id or f"mw_{idx}", mw.title, patched_chains, mw.notes), rng=rng, config=config)
        miniweek_results.append(mw_result)
        current_state = partial_recovery_between_days(mw_result.final_state, config=config)
        current_state.macro = choose_macro_by_state(current_state)

    final_state = miniweek_results[-1].final_state if miniweek_results else current_state
    final_state.macro = choose_macro_by_state(final_state)
    outcome = classify_aggregate_outcome([m.outcome for m in miniweek_results], final_state)
    risk = classify_risk(final_state, outcome)
    counts = count_outcomes([m.outcome for m in miniweek_results])
    warnings = aggregate_unique([w for m in miniweek_results for w in m.report.get("avvisi", [])])
    notes = aggregate_unique([n for m in miniweek_results for n in m.report.get("indicazioni", [])])
    report = build_report_summary(TemporalLevel.TRAIETTORIA_LUNGA, trajectory.title, outcome, risk, initial_state, final_state, counts, warnings, notes)
    report["mini_settimane"] = [m.report for m in miniweek_results]
    return TrajectoryResult(trajectory.trajectory_id, trajectory.title, miniweek_results, initial_state, final_state, outcome, risk, report)


def choose_macro_by_state(state: SystemState) -> MacroRegime:
    state = state.normalized()
    if state.stress_str >= 85 and state.position_pos <= 30 and state.debt_deb >= 1:
        return MacroRegime.MACRO_5_SPIRALE_STABILIZZATA
    if state.stress_str >= 75 or state.hidden_cost >= 65:
        return MacroRegime.MACRO_4_SPIRALE_IN_FORMAZIONE
    if state.stress_str >= 60 or state.hidden_cost >= 45:
        return MacroRegime.MACRO_3_RIPETIZIONE_PESANTE_RECUPERABILE
    if state.stress_str >= 45:
        return MacroRegime.MACRO_2_MINI_SETTIMANA_LEGGERA
    return MacroRegime.MACRO_1_CATENA_BREVE



# =============================================================================
# 6B. STRUMENTI AI-FIRST: TRACCE, VALIDAZIONE, SCHEMI, PACKET CHATGPT/GEMINI
# =============================================================================

class AICooperationMode(str, Enum):
    CHATGPT = "chatgpt"
    GEMINI = "gemini"
    GENERIC = "generic_ai"


@dataclass
class ValidationIssue:
    level: str  # "error", "warning", "info"
    field: str
    message: str
    suggestion: str = ""


@dataclass
class ValidationReport:
    ok: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    normalized_payload: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return to_plain_data(self)


def normalize_text_for_search(text: str) -> str:
    return " ".join(str(text or "").lower().replace("/", " ").replace("-", " ").split())


def family_keywords(spec: LifeFamilySpec) -> List[str]:
    raw: List[str] = [spec.code, spec.name, spec.area.value]
    raw.extend(spec.typical_nodes)
    raw.extend(spec.sensitive_levers)
    raw.extend(spec.typical_kpd)
    raw.extend([a.value for a in spec.adaptations])
    raw.extend(spec.report_flags)
    return [normalize_text_for_search(x) for x in raw if str(x).strip()]


def search_life_families(query: str, *, limit: int = 8) -> List[Dict[str, Any]]:
    """Ricerca leggera nel catalogo V001-V040, utile prima del parser AI."""
    q = normalize_text_for_search(query)
    if not q:
        return [to_plain_data(spec) for spec in list(LIFE_FAMILIES.values())[:limit]]
    tokens = [t for t in q.split() if len(t) >= 3]
    scored: List[Tuple[int, LifeFamilySpec, List[str]]] = []
    semantic_boosts: Dict[str, Tuple[str, ...]] = {
        "V001": ("svegliarsi", "sveglia", "letto", "mattina"),
        "V002": ("alzarsi", "divano", "camminare", "muoversi", "instabilità", "capogiro", "equilibrio"),
        "V007": ("bere", "acqua", "bicchiere", "bottiglia", "mangiare", "sete"),
        "V009": ("cucina", "preparare", "versare", "prendere oggetti", "fornello"),
        "V015": ("spesa", "supermercato", "cassa", "prodotti"),
        "V017": ("guidare", "macchina", "auto", "traffico"),
        "V024": ("password", "otp", "app", "login"),
        "V034": ("coppia", "partner", "dialogo", "litigio"),
        "V037": ("organizzazione familiare", "carico mentale", "casa figli lavoro"),
        "V040": ("cura", "persona fragile", "caregiver", "assistenza"),
    }
    for spec in LIFE_FAMILIES.values():
        kws = [kw for kw in family_keywords(spec) if len(kw) >= 3 or kw.upper().startswith("V")]
        score = 0
        matched: List[str] = []
        for kw in kws:
            if not kw:
                continue
            # Match robusto a parola/frase intera: evita che "app" intercetti
            # parole corporee come "appoggio", "appoggiarsi", "appoggiarmi".
            if kw.upper() == spec.code and _contains_any(q, (kw.lower(),)):
                score += 20
                matched.append(kw)
            elif len(kw) >= 3 and _contains_any(q, (kw,)):
                score += 5
                matched.append(kw)
            else:
                kw_tokens = set(kw.split())
                for token in tokens:
                    # Richiamo debole solo per token interi, non per sottostringhe.
                    if len(token) >= 3 and token in kw_tokens:
                        score += 1
                        matched.append(kw)
                        break
        for boost in semantic_boosts.get(spec.code, ()):  # sinonimi e parole ponte
            b = normalize_text_for_search(boost)
            if b and _contains_any(q, (b,)):
                score += 7
                matched.append(b)
        if score > 0:
            scored.append((score, spec, matched[:8]))
    scored.sort(key=lambda x: (-x[0], x[1].code))
    return [
        {
            "code": spec.code,
            "name": spec.name,
            "area": spec.area.value,
            "score": score,
            "matched": matched,
            "sensitive_levers": list(spec.sensitive_levers),
            "typical_kpd": list(spec.typical_kpd),
            "adaptations": [a.value for a in spec.adaptations],
            "report_flags": list(spec.report_flags),
        }
        for score, spec, matched in scored[:limit]
    ]


def formula_trace(node: NodeInput, config: EngineConfig = DEFAULT_CONFIG) -> Dict[str, Any]:
    """Restituisce la scomposizione completa della formula madre per spiegazioni AI."""
    node = node.normalized()
    state = node.state_before
    modifiers = node.modifiers
    sigma_mod = modifiers.sigma_mod()
    pi_str = str_penalty(state.stress_str, config)
    complexity_penalty = config.complexity_weight * modifiers.complexity_c
    debt_penalty = config.debt_weight * state.debt_deb
    raw_value = (
        node.base_probability_p0
        + sigma_mod
        + modifiers.protective_bonus_bp
        + state.protective_bonus_bp
        - complexity_penalty
        - pi_str
        - debt_penalty
    )
    pn = clamp_int(raw_value, config.min_probability, config.max_probability)
    return {
        "formula": "Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)",
        "node_id": node.node_id,
        "description": node.description,
        "family_code": node.family_code,
        "components": {
            "P0": node.base_probability_p0,
            "E": modifiers.energy_e,
            "I": modifiers.information_i,
            "T": modifiers.time_t,
            "M": modifiers.material_m,
            "SigmaMod": sigma_mod,
            "BP_node": modifiers.protective_bonus_bp,
            "BP_state": state.protective_bonus_bp,
            "C": modifiers.complexity_c,
            "complexity_penalty": complexity_penalty,
            "STR": state.stress_str,
            "piSTR": pi_str,
            "DEB": state.debt_deb,
            "DEB_penalty": debt_penalty,
        },
        "raw_value_before_clamp": raw_value,
        "Pn": pn,
        "outside_formula_but_relevant": {
            "POS": state.position_pos,
            "RIP": state.rip.value,
            "K/Pd": to_plain_data(node.field_response),
            "support": to_plain_data(node.support),
            "adaptation": to_plain_data(node.adaptation),
            "profile": node.profile.value,
            "macro": state.macro.value,
            "or1": state.or1_orientation,
            "ri4": to_plain_data(state.ri4),
            "cooldown_remaining": state.cooldown_remaining,
            "floor1_active": state.floor1_active,
            "hidden_cost": state.hidden_cost,
        },
    }


def node_progressive_trace(result: NodeResult) -> Dict[str, Any]:
    """Traccia leggibile per ChatGPT/Gemini: cosa è successo nel nodo, passo per passo."""
    return {
        "node": {
            "id": result.node_id,
            "description": result.description,
            "family_code": result.family_code,
        },
        "probability_and_roll": {
            "Pn": result.probability_pn,
            "roll_d100": result.roll,
            "success_before_field": result.success_before_field,
            "raw_margin": result.raw_margin,
            "field_margin_KPd": result.field_margin,
            "net_margin": result.net_margin,
        },
        "classification": {
            "outcome": result.outcome.value,
            "risk_level": result.risk_level.value,
            "hidden_cost_delta": result.hidden_cost_delta,
        },
        "state_transition": {
            "before": to_plain_data(result.state_before),
            "after": to_plain_data(result.state_after),
            "delta": {
                "STR": result.state_after.stress_str - result.state_before.stress_str,
                "POS": result.state_after.position_pos - result.state_before.position_pos,
                "DEB": result.state_after.debt_deb - result.state_before.debt_deb,
                "hidden_cost": result.state_after.hidden_cost - result.state_before.hidden_cost,
                "or1": round(result.state_after.or1_orientation - result.state_before.or1_orientation, 3),
                "ri4": round(result.state_after.ri4.score - result.state_before.ri4.score, 3),
            },
        },
        "levers": result.levers,
        "warnings": result.warnings,
        "operational_notes": result.operational_notes,
        "human_reading_hint": (
            "Spiega prima la struttura del nodo, poi formula/tiro/margine, poi costo e stato finale. "
            "Non trasformare il successo tecnico in successo sano se il costo è alto."
        ),
    }


def scene_progressive_trace(result: SceneResult) -> Dict[str, Any]:
    return {
        "scene": {"id": result.scene_id, "title": result.title, "family_code": result.family_code},
        "aggregate": {
            "outcome": result.scene_outcome.value,
            "risk_level": result.risk_level.value,
            "initial_state": to_plain_data(result.initial_state),
            "final_state": to_plain_data(result.final_state),
            "report": result.report,
        },
        "nodes": [node_progressive_trace(r) for r in result.node_results],
    }


def node_payload_schema() -> Dict[str, Any]:
    """Schema pragmatico, non JSON-Schema formale: è facile da usare con ChatGPT/Gemini."""
    return {
        "node_id": "N01",
        "description": "descrizione breve del nodo",
        "family_code": "V001-V040 opzionale",
        "base_probability_p0": "int 1-99",
        "modifiers": {"E": 0, "I": 0, "T": 0, "M": 0, "BP": 0, "C": 0},
        "state_before": {
            "STR": 0,
            "POS": 60,
            "DEB": 0,
            "BP": 0,
            "RIP": "assente|finta|debole|vera|tardiva|piena",
            "or1": 0.5,
            "ri4": {"rientro": 0.5, "riparazione": 0.5, "riduzione": 0.5, "ripresa": 0.5},
            "macro": "macro_0_episodio_isolato",
            "cooldown": 0,
            "floor1": False,
            "hidden_cost": 0,
        },
        "field_response": {"active": False, "label": "", "strength": 0, "field_roll": None},
        "support": {
            "support_kind": "assente|emotivo|pratico|informativo|logistico|simbolico|inefficace|invasivo|professionale",
            "delegation_kind": "assente|parziale|reale|finta|tardiva|incompetente|invasiva",
            "load_reduction_score": 0.0,
            "competence_score": 0.0,
            "timely": False,
            "boundary_cost": 0.0,
            "note": "",
        },
        "adaptation": {
            "kind": "nessuno|chiedere_aiuto|semplificare|delegare|rinviare_senza_evitare|cambiare_ambiente|cambiare_obiettivo|riparare|spezzare_compito|pausa_reale|cambiare_sequenza|avvisare_qualcuno",
            "availability": "reale|parziale|teorica|tardiva|finta|non_disponibile",
            "expected_load_reduction": 0.0,
            "expected_clarity_gain": 0,
            "expected_time_gain": 0,
            "expected_complexity_reduction": 0,
            "expected_material_gain": 0,
            "expected_energy_gain": 0,
            "creates_real_rip": False,
            "cost_of_adaptation": 0,
            "note": "",
        },
        "profile": "neutro",
        "tags": [],
    }


def scene_payload_schema() -> Dict[str, Any]:
    return {
        "level": "scene",
        "scene": {
            "scene_id": "S001",
            "title": "titolo scena",
            "family_code": "V001-V040 opzionale",
            "notes": "ipotesi e taratura usate",
            "nodes": [node_payload_schema()],
        },
        "rolls": "opzionale: lista di d100 per esecuzione determinata/esempio, altrimenti casuale",
    }


def app_command_schema() -> Dict[str, Any]:
    return {
        "commands": {
            "manifest": {"command": "manifest"},
            "protocol": {"command": "protocol"},
            "families": {"command": "families"},
            "search_families": {"command": "search_families", "query": "testo utente"},
            "questions": {"command": "questions", "family_code": "V007", "level": "scene"},
            "intake_packet": {"command": "intake_packet", "description": "testo utente", "family_code": "V007", "level": "scene"},
            "schema": {"command": "schema", "schema": "node|scene|commands"},
            "validate": {"command": "validate", "level": "scene", "scene": {"...": "..."}},
            "run": {"level": "scene", "scene": {"...": "..."}},
            "session": {"command": "session"},
            "reset_session": {"command": "reset_session"},
            "demo": {"command": "demo"},
        }
    }


def validate_node_payload(data: Mapping[str, Any]) -> ValidationReport:
    issues: List[ValidationIssue] = []
    normalized: Dict[str, Any] = {}
    try:
        node = node_from_dict(data)
        normalized = to_plain_data(node)
        if not node.description or node.description == "Nodo operativo":
            issues.append(ValidationIssue("warning", "description", "Descrizione nodo generica.", "Specificare l'azione concreta."))
        if not (5 <= node.base_probability_p0 <= 95):
            issues.append(ValidationIssue("warning", "P0", "P0 fuori fascia operativa tipica.", "Usare 5-95 salvo casi tecnici."))
        if node.modifiers.complexity_c >= 5 and node.description.lower().count(" e ") >= 2:
            issues.append(ValidationIssue("warning", "C", "Nodo forse troppo grande.", "Spezzare in più nodi se contiene molte azioni."))
        if node.field_response.active and node.modifiers.material_m <= -15:
            issues.append(ValidationIssue("info", "M/KPd", "Controllare doppio conteggio: M ostile e K/Pd attivo insieme.", "M è passivo; K/Pd è risposta attiva dopo P."))
        if node.support.support_kind != SupportKind.ASSENTE and node.support.load_reduction_score <= 0.0:
            issues.append(ValidationIssue("warning", "support", "Supporto dichiarato ma senza scarico carico.", "Indicare se è reale, simbolico, tardivo o invasivo."))
        if node.adaptation.kind != AdaptationKind.NESSUNO and node.adaptation.availability == AvailabilityKind.NON_DISPONIBILE:
            issues.append(ValidationIssue("warning", "adaptation", "Adattamento indicato ma non disponibile.", "Valutare disponibilità reale, parziale, teorica, tardiva o finta."))
    except Exception as exc:
        issues.append(ValidationIssue("error", "node", f"Payload nodo non valido: {exc}", "Confrontare con node_payload_schema()."))
    ok = not any(i.level == "error" for i in issues)
    return ValidationReport(ok=ok, issues=issues, normalized_payload=normalized)


def validate_scene_payload(data: Mapping[str, Any]) -> ValidationReport:
    issues: List[ValidationIssue] = []
    normalized: Dict[str, Any] = {}
    try:
        scene = scene_from_dict(data)
        normalized = to_plain_data(scene)
        if not scene.nodes:
            issues.append(ValidationIssue("error", "nodes", "La scena non contiene nodi.", "Aggiungere almeno 1 nodo, meglio 3-7 per scena breve."))
        if len(scene.nodes) > 9:
            issues.append(ValidationIssue("warning", "nodes", "Scena molto lunga.", "Valutare catena breve invece di scena."))
        for idx, node in enumerate(scene.nodes, start=1):
            rep = validate_node_payload(to_plain_data(node))
            for issue in rep.issues:
                issue.field = f"nodes[{idx}].{issue.field}"
                issues.append(issue)
    except Exception as exc:
        issues.append(ValidationIssue("error", "scene", f"Payload scena non valido: {exc}", "Confrontare con scene_payload_schema()."))
    ok = not any(i.level == "error" for i in issues)
    return ValidationReport(ok=ok, issues=issues, normalized_payload=normalized)


def validate_app_payload(payload: Mapping[str, Any]) -> ValidationReport:
    if not isinstance(payload, Mapping):
        return ValidationReport(False, [ValidationIssue("error", "payload", "Payload non valido: deve essere un oggetto/dizionario.", "Inviare un dizionario JSON con command/level/type.")], {"received_type": type(payload).__name__})
    command = str(payload.get("command", "")).lower().strip()
    if "level" in payload or "type" in payload:
        level = str(payload.get("level", payload.get("type", "scene"))).lower()
    elif command in {"run", "execute", "simulate", "simula", "calcola"}:
        # I comandi espliciti di esecuzione senza level/type ricadono su scene,
        # ma devono essere validati come scene PRIMA di accedere a payload["scene"].
        level = "scene"
    else:
        level = str(command or "scene").lower()
    if level in {"node", "nodo"}:
        if "node" not in payload:
            return ValidationReport(False, [ValidationIssue("error", "node", "Payload nodo mancante.", "Aggiungere la chiave 'node'.")], dict(payload))
        return validate_node_payload(payload["node"])
    if level in {"scene", "scena", "run"}:
        if "scene" not in payload:
            return ValidationReport(False, [ValidationIssue("error", "scene", "Payload scena mancante.", "Aggiungere la chiave 'scene'.")], dict(payload))
        return validate_scene_payload(payload["scene"])
    if level in {"chain", "catena", "catena_breve"}:
        # Validazione leggera: la costruzione vera avviene in chain_from_dict.
        if "chain" not in payload:
            return ValidationReport(False, [ValidationIssue("error", "chain", "Payload catena mancante.", "Aggiungere la chiave 'chain'.")], dict(payload))
        try:
            chain = chain_from_dict(payload["chain"])
            issues: List[ValidationIssue] = []
            if not chain.scenes:
                issues.append(ValidationIssue("error", "scenes", "La catena non contiene scene.", "Aggiungere almeno una scena."))
            return ValidationReport(ok=not any(i.level == "error" for i in issues), issues=issues, normalized_payload=to_plain_data(chain))
        except Exception as exc:
            return ValidationReport(False, [ValidationIssue("error", "chain", str(exc), "Controllare schema catena.")], {})
    if level in {"miniweek", "mini_settimana", "mini-settimana"}:
        if "miniweek" not in payload:
            return ValidationReport(False, [ValidationIssue("error", "miniweek", "Payload mini-settimana mancante.", "Aggiungere la chiave 'miniweek'.")], dict(payload))
        try:
            miniweek = miniweek_from_dict(payload["miniweek"])
            issues: List[ValidationIssue] = []
            if not miniweek.chains_by_day:
                issues.append(ValidationIssue("error", "chains_by_day", "La mini-settimana non contiene giorni/catene.", "Aggiungere almeno una catena/giorno."))
            return ValidationReport(ok=not any(i.level == "error" for i in issues), issues=issues, normalized_payload=to_plain_data(miniweek))
        except Exception as exc:
            return ValidationReport(False, [ValidationIssue("error", "miniweek", str(exc), "Controllare schema miniweek.")], {})
    if level in {"trajectory", "traiettoria", "traiettoria_lunga"}:
        if "trajectory" not in payload:
            return ValidationReport(False, [ValidationIssue("error", "trajectory", "Payload traiettoria mancante.", "Aggiungere la chiave 'trajectory'.")], dict(payload))
        try:
            trajectory = trajectory_from_dict(payload["trajectory"])
            issues: List[ValidationIssue] = []
            if not trajectory.miniweeks:
                issues.append(ValidationIssue("error", "miniweeks", "La traiettoria non contiene mini-settimane.", "Aggiungere almeno una mini-settimana."))
            return ValidationReport(ok=not any(i.level == "error" for i in issues), issues=issues, normalized_payload=to_plain_data(trajectory))
        except Exception as exc:
            return ValidationReport(False, [ValidationIssue("error", "trajectory", str(exc), "Controllare schema traiettoria.")], {})
    return ValidationReport(True, [ValidationIssue("info", "payload", "Nessuna validazione specifica necessaria per questo comando.")], dict(payload))


def build_ai_parser_system_prompt(mode: Union[AICooperationMode, str] = AICooperationMode.CHATGPT) -> str:
    mode = safe_enum(AICooperationMode, mode, AICooperationMode.CHATGPT)
    name = "ChatGPT" if mode == AICooperationMode.CHATGPT else ("Gemini" if mode == AICooperationMode.GEMINI else "AI")
    return f"""
Sei {name} come modulo interpretativo del Simulatore Versione 3.1.
Il tuo compito NON è calcolare a mano se Python è disponibile: devi trasformare la descrizione dell'utente in dati puliti per il motore Python.

Regole non negoziabili:
1. Prima taratura, poi numeri.
2. Non presumere normalità se corpo, ambiente, tempo, carico precedente o supporto sono decisivi.
3. Non inventare nuove variabili canoniche.
4. Usa solo P0, E, I, T, M, BP, C, STR, DEB, POS, RIP, K/Pd, supporto, delega, adattamento, profilo, MACRO/ri4/cooldown/floor1/or1 quando servono.
5. K/Pd è risposta attiva del campo dopo P, non ambiente passivo.
6. POS e RIP non vanno messi dentro la formula madre.
7. Supporto e delega contano solo se scaricano carico reale.
8. Il successo deve essere letto col costo.
9. Non fare diagnosi clinica.

Output richiesto:
- scenario;
- famiglia V001-V040 più probabile;
- livello: nodo/scena/catena_breve/mini_settimana/traiettoria_lunga;
- domande mancanti essenziali;
- ipotesi dichiarate;
- bozza JSON secondo lo schema fornito dal motore Python.
""".strip()


def build_ai_report_system_prompt(mode: Union[AICooperationMode, str] = AICooperationMode.CHATGPT) -> str:
    mode = safe_enum(AICooperationMode, mode, AICooperationMode.CHATGPT)
    name = "ChatGPT" if mode == AICooperationMode.CHATGPT else ("Gemini" if mode == AICooperationMode.GEMINI else "AI")
    return f"""
Sei {name} come report AI del Simulatore Versione 3.1.
Riceverai output JSON già calcolato da Python.

Regole:
1. Non modificare i numeri.
2. Non inventare risultati non presenti nel payload.
3. Spiega in modo progressivo: taratura, nodi, Pn, tiro, margine, K/Pd, esito, stato finale.
4. Distingui esito apparente, qualità dell'esito, costo interno, danno residuo e rischio differito.
5. Evidenzia supporto reale/finto, adattamento disponibile/finto, over-functioning e successo tossico se presenti.
6. Sii severo ma non colpevolizzante.
7. Non fare diagnosi clinica.
""".strip()


def build_ai_cooperation_packet(
    raw_user_description: str = "",
    *,
    family_code: str = "",
    level: Union[str, TemporalLevel] = TemporalLevel.SCENA,
    mode: Union[str, AICooperationMode] = AICooperationMode.CHATGPT,
) -> Dict[str, Any]:
    lvl = safe_enum(TemporalLevel, level, TemporalLevel.SCENA)
    families = search_life_families(raw_user_description, limit=6) if raw_user_description else []
    chosen_family = family_code or (families[0]["code"] if families else "")
    return {
        "simulator": "Simulatore Versione 3.1",
        "purpose": "Pacchetto operativo per cooperazione AI + Python.",
        "raw_user_description": raw_user_description,
        "suggested_families": families,
        "selected_family_code": chosen_family,
        "level": lvl.value,
        "parser_system_prompt": build_ai_parser_system_prompt(mode),
        "report_system_prompt": build_ai_report_system_prompt(mode),
        "calibration_questions": intake_questions(chosen_family, lvl),
        "scene_schema": scene_payload_schema(),
        "node_schema": node_payload_schema(),
        "commands_schema": app_command_schema(),
        "canonical_formula": "Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)",
        "hard_rules": [
            "La formula calcola il nodo, non tutta la vita.",
            "K/Pd entra dopo P.",
            "POS resta fuori formula diretta ma centrale nel report.",
            "RIP è riassetto reale, non pausa generica.",
            "Supporto/delega contano solo se reali.",
            "V3.1: nelle micro-azioni sicure applicare MicroActionDamping allo state updater, non alla formula madre.",
            "Niente diagnosi e niente numeri inventati.",
        ],
    }


def build_ai_report_packet(result: Union[NodeResult, SceneResult, ChainResult, MiniWeekResult, TrajectoryResult]) -> Dict[str, Any]:
    if isinstance(result, NodeResult):
        return {
            "type": "node",
            "system_prompt": build_ai_report_system_prompt(),
            "payload": node_progressive_trace(result),
        }
    if isinstance(result, SceneResult):
        return {
            "type": "scene",
            "system_prompt": build_ai_report_system_prompt(),
            "payload": scene_progressive_trace(result),
            "report_text_compact": build_user_readable_report(result.report),
        }
    return {
        "type": result.__class__.__name__,
        "system_prompt": build_ai_report_system_prompt(),
        "payload": to_plain_data(result),
        "report_text_compact": build_user_readable_report(result.report),
    }


# =============================================================================
# 7. REPORT E API PER APP / AI
# =============================================================================


def aggregate_unique(items: Iterable[str]) -> List[str]:
    seen = set()
    out = []
    for item in items:
        item = str(item).strip()
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def count_outcomes(outcomes: Iterable[OutcomeKind]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for outcome in outcomes:
        key = outcome.value if isinstance(outcome, Enum) else str(outcome)
        counts[key] = counts.get(key, 0) + 1
    return counts


def node_result_card(result: NodeResult) -> Dict[str, Any]:
    return {
        "node_id": result.node_id,
        "description": result.description,
        "family_code": result.family_code,
        "Pn": result.probability_pn,
        "roll": result.roll,
        "success_before_field": result.success_before_field,
        "raw_margin": result.raw_margin,
        "field_margin": result.field_margin,
        "net_margin": result.net_margin,
        "outcome": result.outcome.value,
        "risk_level": result.risk_level.value,
        "hidden_cost_delta": result.hidden_cost_delta,
        "state_after": to_plain_data(result.state_after),
        "warnings": result.warnings,
        "notes": result.operational_notes,
        "levers": result.levers,
    }


def build_user_readable_report(report: Dict[str, Any]) -> str:
    """Report testuale compatto, pronto per CLI o UI semplice."""
    lines = []
    lines.append(f"Titolo: {report.get('title', '')}")
    lines.append(f"Livello: {report.get('level', '')}")
    lines.append(f"Esito: {report.get('esito_apparente', '')}")
    lines.append(f"Rischio: {report.get('rischio', '')}")
    delta = report.get("delta", {})
    lines.append(f"Delta — STR {delta.get('STR')}, POS {delta.get('POS')}, DEB {delta.get('DEB')}, costo nascosto {delta.get('hidden_cost')}")
    if report.get("avvisi"):
        lines.append("Avvisi:")
        for w in report["avvisi"]:
            lines.append(f"- {w}")
    if report.get("indicazioni"):
        lines.append("Indicazioni:")
        for n in report["indicazioni"]:
            lines.append(f"- {n}")
    lines.append(f"Limite: {report.get('limite_metodologico', '')}")
    return "\n".join(lines)


def intake_questions(family_code: str = "", level: TemporalLevel = TemporalLevel.SCENA) -> List[Dict[str, str]]:
    """Domande di taratura proporzionata. L'app può mostrarle come form dinamico."""
    family = LIFE_FAMILIES.get(family_code.upper()) if family_code else None
    questions = [
        {"area": "Corpo/E", "question": "La persona è sana, stanca, dolorante, instabile o con energia ridotta?", "variables": "E, P0, POS, STR"},
        {"area": "Azione/P0-C", "question": "Per quella persona questa azione è facile, media o difficile?", "variables": "P0, C"},
        {"area": "Ambiente/M-K", "question": "Lo spazio è libero o ci sono ostacoli, rumore, buio, oggetti, persone, animali o app/strumenti problematici?", "variables": "M, C, K/Pd"},
        {"area": "Tempo/T", "question": "C'è fretta reale, scadenza, ritardo o solo pressione percepita?", "variables": "T, STR, POS"},
        {"area": "Carico/STR-DEB", "question": "È un episodio isolato o arriva dopo ore/giorni di stress, sonno scarso, conflitto o sovraccarico?", "variables": "STR, DEB, RIP, MACRO"},
        {"area": "Assetto/POS", "question": "La persona parte stabile, orientata e organizzata o già scomposta/agita/scomoda?", "variables": "POS, I, E"},
        {"area": "Supporto/BP-RIP", "question": "Ci sono aiuto, appoggio, delega, pausa vera o semplificazione realmente disponibili?", "variables": "BP, I, T, M, C, RIP"},
    ]
    if family:
        questions.append({
            "area": f"Famiglia {family.code}",
            "question": f"Per '{family.name}', controlla soprattutto: {', '.join(family.sensitive_levers)}. K/Pd tipici: {', '.join(family.typical_kpd)}.",
            "variables": ", ".join(family.sensitive_levers),
        })
    if level in {TemporalLevel.CATENA_BREVE, TemporalLevel.MINI_SETTIMANA, TemporalLevel.TRAIETTORIA_LUNGA, TemporalLevel.SPIRALE_LUNGA}:
        questions.append({"area": "Lungo periodo", "question": "Quante scene/giorni si ripetono e quanto recupero reale c'è tra una scena e l'altra?", "variables": "MACRO, ri4, cooldown, floor1, or1"})
    return questions



def MODEL_MANIFEST_V2() -> Dict[str, Any]:
    return {
        "name": "Simulatore Versione 3.1 — App Core v2 ChatGPT/Gemini",
        "purpose": "Motore applicativo per trasformare situazioni concrete in scenari, nodi, calcoli, stati e report AI.",
        "core_formula": "Pn = clamp[5,95](P0 + E + I + T + M + BP - 5C - piSTR(STR) - 5DEB)",
        "not_a_test_suite": True,
        "canonical_rules": [
            "Formula madre invariata.",
            "La complessità entra tramite scenari, livelli, supporto, adattamento, costo e report.",
            "K/Pd dopo P.",
            "POS fuori formula diretta ma centrale nel report.",
            "RIP come riassetto reale.",
            "Supporto/delega solo se scaricano carico reale.",
            "Nessuna diagnosi clinica.",
        ],
        "app_features": [
            "Scenario Universe V001-V040",
            "domande di taratura proporzionata",
            "schema JSON per AI/app",
            "validazione payload",
            "formula trace",
            "progressive trace nodo/scena",
            "report packet per ChatGPT/Gemini",
            "memoria sessione",
            "motore nodo/scena/catena/mini-settimana/traiettoria",
        ],
        "roles": {
            "python": "calcola, valida, normalizza, produce payload, aggiorna stati, conserva sessione",
            "ai": "interpreta linguaggio naturale, fa domande di taratura, costruisce payload, spiega report senza inventare numeri",
        },
    }


def CHATGPT_GEMINI_START_PROTOCOL() -> Dict[str, Any]:
    return {
        "start_instruction": "Leggi la descrizione dell'utente, cerca la famiglia V001-V040, fai taratura proporzionata, costruisci payload JSON, usa Python per calcolare, poi genera report AI.",
        "steps": [
            "1. Descrizione utente",
            "2. Ricerca famiglie scenario",
            "3. Taratura iniziale proporzionata",
            "4. Distinzione nodo/scena/catena/mini-settimana/traiettoria",
            "5. Costruzione payload JSON",
            "6. Validazione payload",
            "7. Esecuzione Python",
            "8. Lettura progressive_trace",
            "9. Report severo, pratico, non clinico",
            "10. Domande successive / what-if / nuova scena",
        ],
        "never_do": [
            "non calcolare prima della taratura",
            "non inventare numeri",
            "non aggiungere variabili canoniche",
            "non confondere M con K/Pd",
            "non chiamare sano un successo tossico o danneggiato",
            "non fare diagnosi",
        ],
        "quick_command_examples": [
            {"command": "intake_packet", "description": "devo alzarmi dal divano e bere acqua", "level": "scene"},
            {"command": "search_families", "query": "fare spesa con cane in ritardo"},
            {"command": "questions", "family_code": "V015", "level": "scene"},
            {"level": "scene", "scene": {"scene_id": "S001", "title": "...", "nodes": []}},
        ],
    }


@dataclass
class SessionMemory:
    session_id: str = "default"
    current_state: SystemState = field(default_factory=SystemState)
    history: List[Dict[str, Any]] = field(default_factory=list)
    total_events: int = 0

    def push(self, level: str, title: str, result: Any) -> None:
        """Salva una traccia compatta della sessione.

        La versione precedente serializzava l'intero risultato dentro history a ogni
        nodo/scena/catena. Nei loop lunghi questo non rompeva la formula, ma poteva
        produrre crescita di memoria e rallentamenti progressivi del test harness.
        La sessione conserva quindi solo metadati essenziali e stato finale; il
        risultato completo resta restituito immediatamente al chiamante.
        """
        final_state = None
        if hasattr(result, "final_state"):
            final_state = result.final_state
        elif hasattr(result, "state_after"):
            final_state = result.state_after

        compact: Dict[str, Any] = {
            "result_type": type(result).__name__,
            "state_after": to_plain_data(final_state) if isinstance(final_state, SystemState) else None,
        }
        if isinstance(result, NodeResult):
            compact.update({
                "node_id": result.node_id,
                "outcome": result.outcome.value,
                "risk": result.risk_level.value,
                "probability_pn": result.probability_pn,
                "roll": result.roll,
                "net_margin": result.net_margin,
                "hidden_cost_delta": result.hidden_cost_delta,
            })
        elif isinstance(result, SceneResult):
            compact.update({
                "scene_id": result.scene_id,
                "node_count": len(result.node_results),
                "outcome": result.scene_outcome.value,
                "risk": result.risk_level.value,
            })
        elif isinstance(result, ChainResult):
            compact.update({
                "chain_id": result.chain_id,
                "scene_count": len(result.scene_results),
                "outcome": result.chain_outcome.value,
                "risk": result.risk_level.value,
            })
        elif isinstance(result, MiniWeekResult):
            compact.update({
                "miniweek_id": result.miniweek_id,
                "day_count": len(result.day_results),
                "outcome": result.outcome.value,
                "risk": result.risk_level.value,
            })
        elif isinstance(result, TrajectoryResult):
            compact.update({
                "trajectory_id": result.trajectory_id,
                "miniweek_count": len(result.miniweek_results),
                "outcome": result.outcome.value,
                "risk": result.risk_level.value,
            })

        self.history.append({"level": level, "title": title, "result": compact})
        self.total_events += 1
        _trim_history_in_place(self.history)
        if isinstance(final_state, SystemState):
            self.current_state = final_state.normalized()

    def snapshot(self) -> Dict[str, Any]:
        last = self.history[-1] if self.history else None
        return {
            "session_id": self.session_id,
            "current_state": to_plain_data(self.current_state),
            "history_length": self.total_events,
            "retained_history_length": len(self.history),
            "history_capped_at": MAX_HISTORY_RECORDS + HISTORY_TRIM_BATCH,
            "history_trim_target": MAX_HISTORY_RECORDS,
            "history_trim_batch": HISTORY_TRIM_BATCH,
            "history_retention_note": "soft cap: la history può arrivare temporaneamente a target+batch prima del trimming",
            "last": (
                {
                    "level": last.get("level"),
                    "title": last.get("title"),
                    "result_type": (
                        last.get("result", {}).get("result_type")
                        if isinstance(last, Mapping) and isinstance(last.get("result"), Mapping)
                        else None
                    ),
                }
                if last else None
            ),
        }


class SimulatorAppCore:
    """
    Facciata applicativa.

    Un'app può usare questa classe per:
    - mostrare famiglie scenario;
    - generare domande di taratura;
    - eseguire node/scene/chain/miniweek/trajectory;
    - ottenere output JSON;
    - mantenere memoria di sessione.
    """

    def __init__(self, *, seed: Optional[int] = None, config: EngineConfig = DEFAULT_CONFIG, session_id: str = "default") -> None:
        self.config = config
        self.rng = Random(seed)
        self.memory = SessionMemory(session_id=session_id)

    def list_families(self) -> List[Dict[str, Any]]:
        return [to_plain_data(spec) for spec in LIFE_FAMILIES.values()]

    def get_family(self, code: str) -> Optional[Dict[str, Any]]:
        spec = LIFE_FAMILIES.get(code.upper())
        return to_plain_data(spec) if spec else None

    def questions(self, family_code: str = "", level: Union[str, TemporalLevel] = TemporalLevel.SCENA) -> List[Dict[str, str]]:
        lvl = safe_enum(TemporalLevel, level, TemporalLevel.SCENA)
        return intake_questions(family_code, lvl)

    def run_node(self, node: NodeInput, *, roll: Optional[int] = None) -> NodeResult:
        result = run_node(node, roll=roll, rng=self.rng, config=self.config)
        self.memory.push("node", node.description, result)
        return result

    def run_scene(self, scene: SceneInput, *, rolls: Optional[Sequence[int]] = None) -> SceneResult:
        result = run_scene(scene, rng=self.rng, rolls=rolls, config=self.config)
        self.memory.push("scene", scene.title, result)
        return result

    def run_chain(self, chain: ChainInput) -> ChainResult:
        result = run_chain(chain, rng=self.rng, config=self.config)
        self.memory.push("chain", chain.title, result)
        return result

    def run_miniweek(self, miniweek: MiniWeekInput) -> MiniWeekResult:
        result = run_miniweek(miniweek, rng=self.rng, config=self.config)
        self.memory.push("miniweek", miniweek.title, result)
        return result

    def run_trajectory(self, trajectory: TrajectoryInput) -> TrajectoryResult:
        result = run_trajectory(trajectory, rng=self.rng, config=self.config)
        self.memory.push("trajectory", trajectory.title, result)
        return result

    def search_families(self, query: str, *, limit: int = 8) -> List[Dict[str, Any]]:
        return search_life_families(query, limit=limit)

    def intake_packet(self, description: str = "", *, family_code: str = "", level: Union[str, TemporalLevel] = TemporalLevel.SCENA, mode: Union[str, AICooperationMode] = AICooperationMode.CHATGPT) -> Dict[str, Any]:
        return build_ai_cooperation_packet(description, family_code=family_code, level=level, mode=mode)

    def validate_payload(self, payload: Mapping[str, Any]) -> Dict[str, Any]:
        return validate_app_payload(payload).to_dict()

    def schema(self, schema_name: str = "commands") -> Dict[str, Any]:
        key = str(schema_name or "commands").lower()
        if key in {"node", "nodo"}:
            return node_payload_schema()
        if key in {"scene", "scena"}:
            return scene_payload_schema()
        return app_command_schema()

    def trace_node_formula(self, node: NodeInput) -> Dict[str, Any]:
        return formula_trace(node, self.config)

    def report_packet(self, result: Union[NodeResult, SceneResult, ChainResult, MiniWeekResult, TrajectoryResult]) -> Dict[str, Any]:
        return build_ai_report_packet(result)

    def run_batch_payloads(self, payloads: Sequence[Mapping[str, Any]]) -> List[Dict[str, Any]]:
        """Esecuzione batch applicativa, utile per app/AI. Non è stress test."""
        outputs: List[Dict[str, Any]] = []
        for idx, payload in enumerate(payloads, start=1):
            try:
                outputs.append({"index": idx, **self.run_payload(payload)})
            except Exception as exc:
                outputs.append({"index": idx, "ok": False, "error": str(exc), "session": self.memory.snapshot()})
        return outputs

    def reset_session(self) -> Dict[str, Any]:
        self.memory = SessionMemory(session_id=self.memory.session_id)
        return self.memory.snapshot()

    def run_payload(self, payload: Mapping[str, Any]) -> Dict[str, Any]:
        """
        API JSON-friendly per uso ChatGPT/Gemini/app.

        Può ricevere:
        - comandi di servizio: manifest, protocol, families, search_families, questions,
          intake_packet, schema, validate, session, reset_session, demo;
        - payload di esecuzione: node, scene, chain, miniweek, trajectory.
        """
        if not isinstance(payload, Mapping):
            return {"ok": False, "type": "validation_error", "error": "Payload non valido: deve essere un oggetto/dizionario.", "received_type": type(payload).__name__, "session": self.memory.snapshot()}
        command = str(payload.get("command", "")).lower().strip()
        if command:
            if command in {"manifest", "model_manifest"}:
                return {"ok": True, "type": "manifest", "manifest": MODEL_MANIFEST_V2(), "session": self.memory.snapshot()}
            if command in {"protocol", "start", "chatgpt_start"}:
                return {"ok": True, "type": "protocol", "protocol": CHATGPT_GEMINI_START_PROTOCOL(), "session": self.memory.snapshot()}
            if command in {"families", "list_families"}:
                return {"ok": True, "type": "families", "families": self.list_families(), "session": self.memory.snapshot()}
            if command in {"search_families", "suggest_families"}:
                return {"ok": True, "type": "search_families", "results": self.search_families(str(payload.get("query", "")), limit=clamp_int(payload.get("limit", 8), 1, 40)), "session": self.memory.snapshot()}
            if command == "questions":
                return {"ok": True, "type": "questions", "questions": self.questions(str(payload.get("family_code", "")), payload.get("level", TemporalLevel.SCENA)), "session": self.memory.snapshot()}
            if command in {"intake_packet", "ai_packet", "cooperation_packet"}:
                return {"ok": True, "type": "intake_packet", "packet": self.intake_packet(str(payload.get("description", payload.get("raw_user_description", ""))), family_code=str(payload.get("family_code", "")), level=payload.get("level", TemporalLevel.SCENA), mode=payload.get("mode", AICooperationMode.CHATGPT)), "session": self.memory.snapshot()}
            if command == "schema":
                return {"ok": True, "type": "schema", "schema": self.schema(str(payload.get("schema", "commands"))), "session": self.memory.snapshot()}
            if command == "validate":
                return {"ok": True, "type": "validation", "validation": self.validate_payload(payload), "session": self.memory.snapshot()}
            if command == "session":
                return {"ok": True, "type": "session", "session": self.memory.snapshot()}
            if command == "reset_session":
                return {"ok": True, "type": "reset_session", "session": self.reset_session()}
            if command == "demo":
                return {"ok": True, "type": "demo", "demo": demo()}
            # Comando presente ma non riconosciuto: non deve cadere sul default "scene"
            # generando KeyError. Solo i comandi espliciti di esecuzione proseguono
            # verso la logica level/type sottostante.
            if command not in {"run", "execute", "simulate", "simula", "calcola"}:
                return {
                    "ok": False,
                    "type": "unknown_command",
                    "error": f"Comando non riconosciuto: {command}",
                    "schema": app_command_schema(),
                    "session": self.memory.snapshot(),
                }

        level = str(payload.get("level", payload.get("type", "scene"))).lower()
        validation = validate_app_payload(payload)
        if not validation.ok:
            return {"ok": False, "type": "validation_error", "validation": validation.to_dict(), "session": self.memory.snapshot()}

        if level in {"node", "nodo"}:
            node = node_from_dict(payload["node"])
            result = self.run_node(node, roll=payload.get("roll"))
            return {
                "ok": True,
                "type": "node",
                "result": to_plain_data(result),
                "card": node_result_card(result),
                "formula_trace": formula_trace(node, self.config),
                "progressive_trace": node_progressive_trace(result),
                "ai_report_packet": build_ai_report_packet(result),
                "session": self.memory.snapshot(),
            }
        if level in {"scene", "scena"}:
            result = self.run_scene(scene_from_dict(payload["scene"]), rolls=payload.get("rolls"))
            return {
                "ok": True,
                "type": "scene",
                "result": to_plain_data(result),
                "progressive_trace": scene_progressive_trace(result),
                "report_text": build_user_readable_report(result.report),
                "ai_report_packet": build_ai_report_packet(result),
                "session": self.memory.snapshot(),
            }
        if level in {"chain", "catena", "catena_breve"}:
            result = self.run_chain(chain_from_dict(payload["chain"]))
            return {"ok": True, "type": "chain", "result": to_plain_data(result), "report_text": build_user_readable_report(result.report), "ai_report_packet": build_ai_report_packet(result), "session": self.memory.snapshot()}
        if level in {"miniweek", "mini_settimana", "mini-settimana"}:
            result = self.run_miniweek(miniweek_from_dict(payload["miniweek"]))
            return {"ok": True, "type": "miniweek", "result": to_plain_data(result), "report_text": build_user_readable_report(result.report), "ai_report_packet": build_ai_report_packet(result), "session": self.memory.snapshot()}
        if level in {"trajectory", "traiettoria", "traiettoria_lunga"}:
            result = self.run_trajectory(trajectory_from_dict(payload["trajectory"]))
            return {"ok": True, "type": "trajectory", "result": to_plain_data(result), "report_text": build_user_readable_report(result.report), "ai_report_packet": build_ai_report_packet(result), "session": self.memory.snapshot()}
        return {"ok": False, "error": f"Livello non riconosciuto: {level}", "schema": app_command_schema(), "session": self.memory.snapshot()}


# =============================================================================
# 8. COSTRUTTORI DA DICT PER API / JSON / UI
# =============================================================================


def modifiers_from_dict(data: Optional[Mapping[str, Any]]) -> Modifiers:
    data = as_mapping(data)
    return Modifiers(
        energy_e=clamp_int(data.get("energy_e", data.get("E", 0)), -30, 30),
        information_i=clamp_int(data.get("information_i", data.get("I", 0)), -30, 30),
        time_t=clamp_int(data.get("time_t", data.get("T", 0)), -30, 30),
        material_m=clamp_int(data.get("material_m", data.get("M", 0)), -30, 30),
        protective_bonus_bp=clamp_int(data.get("protective_bonus_bp", data.get("BP", 0)), 0, 20),
        complexity_c=clamp_int(data.get("complexity_c", data.get("C", 0)), 0, 10),
    ).normalized()


def ri4_from_dict(data: Optional[Mapping[str, Any]]) -> Ri4State:
    data = as_mapping(data)
    if "ri4_recovery" in data:
        x = clamp_float(data["ri4_recovery"], 0.0, 1.0)
        return Ri4State(x, x, x, x).normalized()
    return Ri4State(
        rientro=clamp_float(data.get("rientro", 0.5), 0.0, 1.0),
        riparazione=clamp_float(data.get("riparazione", 0.5), 0.0, 1.0),
        riduzione=clamp_float(data.get("riduzione", 0.5), 0.0, 1.0),
        ripresa=clamp_float(data.get("ripresa", 0.5), 0.0, 1.0),
    ).normalized()


def state_from_dict(data: Optional[Mapping[str, Any]]) -> SystemState:
    data = as_mapping(data)
    ri4_data = data.get("ri4", data)
    return SystemState(
        stress_str=clamp_int(data.get("stress_str", data.get("STR", 0)), 0, 100),
        position_pos=clamp_int(data.get("position_pos", data.get("POS", 60)), 0, 100),
        debt_deb=max(0, clamp_int(data.get("debt_deb", data.get("DEB", 0)), 0, 9999)),
        protective_bonus_bp=clamp_int(data.get("protective_bonus_bp", data.get("BP", 0)), 0, 20),
        rip=safe_enum(RipKind, data.get("rip", data.get("RIP", RipKind.ASSENTE)), RipKind.ASSENTE),
        or1_orientation=clamp_float(data.get("or1_orientation", data.get("or1", 0.5)), 0.0, 1.0),
        ri4=ri4_from_dict(ri4_data if isinstance(ri4_data, Mapping) else {}),
        macro=safe_enum(MacroRegime, data.get("macro", MacroRegime.MACRO_0_EPISODIO_ISOLATO), MacroRegime.MACRO_0_EPISODIO_ISOLATO),
        cooldown_remaining=clamp_int(data.get("cooldown_remaining", data.get("cooldown", 0)), 0, 9999),
        floor1_active=parse_bool(data.get("floor1_active", data.get("floor1", False)), False),
        floor1_reason=str(data.get("floor1_reason", "")),
        hidden_cost=clamp_int(data.get("hidden_cost", 0), 0, 100),
    ).normalized()


def field_from_dict(data: Optional[Mapping[str, Any]]) -> FieldResponse:
    data = as_mapping(data)
    strength_value = data.get(
        "strength",
        data.get("KPd", data.get("K/Pd", data.get("kpd", data.get("field_margin", data.get("field_strength", 0))))),
    )
    field_roll_value = data.get("field_roll", data.get("KPd_roll", data.get("kpd_roll")))
    active_value = parse_bool(data.get("active", data.get("field_active", False)), False)
    numeric_strength = clamp_int(strength_value, 0, 100)
    numeric_roll = None if field_roll_value is None else clamp_int(field_roll_value, 0, 100)
    # Se K/Pd/strength è maggiore di zero, il campo viene considerato attivo.
    if numeric_strength > 0 or (numeric_roll is not None and numeric_roll > 0):
        active_value = True
    return FieldResponse(
        active=active_value,
        label=str(data.get("label", data.get("field_label", ""))),
        strength=numeric_strength,
        field_roll=numeric_roll,
    ).normalized()


def support_from_dict(data: Optional[Mapping[str, Any]]) -> SupportContext:
    data = as_mapping(data)
    return SupportContext(
        support_kind=safe_enum(SupportKind, data.get("support_kind", data.get("kind", SupportKind.ASSENTE)), SupportKind.ASSENTE),
        delegation_kind=safe_enum(DelegationKind, data.get("delegation_kind", data.get("delegation", DelegationKind.ASSENTE)), DelegationKind.ASSENTE),
        load_reduction_score=clamp_float(data.get("load_reduction_score", 0.0), 0.0, 1.0),
        competence_score=clamp_float(data.get("competence_score", 0.0), 0.0, 1.0),
        timely=parse_bool(data.get("timely", False), False),
        boundary_cost=clamp_float(data.get("boundary_cost", 0.0), 0.0, 1.0),
        note=str(data.get("note", "")),
    ).normalized()


def adaptation_from_dict(data: Optional[Mapping[str, Any]]) -> AdaptationContext:
    data = as_mapping(data)
    return AdaptationContext(
        kind=safe_enum(AdaptationKind, data.get("kind", AdaptationKind.NESSUNO), AdaptationKind.NESSUNO),
        availability=safe_enum(AvailabilityKind, data.get("availability", AvailabilityKind.NON_DISPONIBILE), AvailabilityKind.NON_DISPONIBILE),
        expected_load_reduction=clamp_float(data.get("expected_load_reduction", 0.0), 0.0, 1.0),
        expected_clarity_gain=clamp_int(data.get("expected_clarity_gain", 0), -20, 20),
        expected_time_gain=clamp_int(data.get("expected_time_gain", 0), -20, 20),
        expected_complexity_reduction=clamp_int(data.get("expected_complexity_reduction", 0), 0, 10),
        expected_material_gain=clamp_int(data.get("expected_material_gain", 0), -20, 20),
        expected_energy_gain=clamp_int(data.get("expected_energy_gain", 0), -20, 20),
        creates_real_rip=parse_bool(data.get("creates_real_rip", False), False),
        cost_of_adaptation=clamp_int(data.get("cost_of_adaptation", 0), 0, 30),
        note=str(data.get("note", "")),
    ).normalized()


def node_from_dict(data: Mapping[str, Any]) -> NodeInput:
    data = as_mapping(data)
    # Alias accettati per cooperazione ChatGPT/Gemini/app:
    # base_probability_p0, P0, p0, probability, probabilita/probabilità.
    p0_value = data.get(
        "base_probability_p0",
        data.get("P0", data.get("p0", data.get("probability", data.get("probabilita", data.get("probabilità", 60))))),
    )
    return NodeInput(
        node_id=str(data.get("node_id", data.get("id", "node"))),
        description=str(data.get("description", data.get("title", "Nodo operativo"))),
        base_probability_p0=clamp_int(p0_value, 1, 99),
        modifiers=modifiers_from_dict(data.get("modifiers", data)),
        state_before=state_from_dict(data.get("state_before", data.get("state", {}))),
        field_response=field_from_dict(data.get("field_response", data.get("field", data))),
        support=support_from_dict(data.get("support", {})),
        adaptation=adaptation_from_dict(data.get("adaptation", {})),
        profile=safe_enum(HumanProfileKind, data.get("profile", HumanProfileKind.NEUTRO), HumanProfileKind.NEUTRO),
        family_code=str(data.get("family_code", "")),
        tags=normalize_tags(data.get("tags", [])),
    ).normalized()


def scene_from_dict(data: Mapping[str, Any]) -> SceneInput:
    data = as_mapping(data)
    nodes = [node_from_dict(n) for n in as_mapping_list(data.get("nodes", []))]
    return SceneInput(
        scene_id=str(data.get("scene_id", data.get("id", "scene"))),
        title=str(data.get("title", "Scena operativa")),
        nodes=nodes,
        family_code=str(data.get("family_code", "")),
        notes=str(data.get("notes", "")),
    )


def chain_from_dict(data: Mapping[str, Any]) -> ChainInput:
    data = as_mapping(data)
    return ChainInput(
        chain_id=str(data.get("chain_id", data.get("id", "chain"))),
        title=str(data.get("title", "Catena breve")),
        scenes=[scene_from_dict(s) for s in as_mapping_list(data.get("scenes", []))],
        notes=str(data.get("notes", "")),
    )


def miniweek_from_dict(data: Mapping[str, Any]) -> MiniWeekInput:
    data = as_mapping(data)
    return MiniWeekInput(
        miniweek_id=str(data.get("miniweek_id", data.get("id", "miniweek"))),
        title=str(data.get("title", "Mini-settimana")),
        chains_by_day=[chain_from_dict(c) for c in as_mapping_list(data.get("chains_by_day", data.get("days", [])))],
        notes=str(data.get("notes", "")),
    )


def trajectory_from_dict(data: Mapping[str, Any]) -> TrajectoryInput:
    data = as_mapping(data)
    return TrajectoryInput(
        trajectory_id=str(data.get("trajectory_id", data.get("id", "trajectory"))),
        title=str(data.get("title", "Traiettoria lunga")),
        miniweeks=[miniweek_from_dict(m) for m in as_mapping_list(data.get("miniweeks", []))],
        notes=str(data.get("notes", "")),
    )


# =============================================================================
# 9. ESEMPIO APPLICATIVO MINIMO, NON TEST
# =============================================================================


def build_water_scene_example() -> SceneInput:
    """Scenario di esempio: alzarsi, andare in cucina, prendere acqua, versare, bere."""
    state = SystemState(stress_str=45, position_pos=62, debt_deb=0, rip=RipKind.ASSENTE, or1_orientation=0.55, ri4=Ri4State(0.55, 0.50, 0.50, 0.55))
    family = "V007"
    return SceneInput(
        scene_id="demo_acqua_001",
        title="Alzarsi dal divano e bere acqua",
        family_code=family,
        nodes=[
            NodeInput("N01", "Alzarsi dal divano", 85, Modifiers(energy_e=-5, information_i=5, time_t=5, material_m=5, complexity_c=1), state, family_code=family),
            NodeInput("N02", "Camminare fino alla cucina vicina", 90, Modifiers(energy_e=-5, information_i=5, time_t=5, material_m=5, complexity_c=1), state, family_code=family),
            NodeInput("N03", "Prendere bottiglia e bicchiere", 90, Modifiers(energy_e=-5, information_i=5, time_t=5, material_m=5, complexity_c=0), state, family_code=family),
            NodeInput("N04", "Versare l'acqua nel bicchiere", 85, Modifiers(energy_e=-5, information_i=5, time_t=5, material_m=5, complexity_c=1), state, family_code=family),
            NodeInput("N05", "Bere l'acqua", 95, Modifiers(energy_e=0, information_i=5, time_t=5, material_m=5, complexity_c=0), state, family_code=family),
        ],
    )


def demo() -> Dict[str, Any]:
    """Esecuzione dimostrativa per verificare il comportamento applicativo del file."""
    app = SimulatorAppCore(seed=42, session_id="demo")
    scene = build_water_scene_example()
    result = app.run_scene(scene, rolls=[22, 54, 89, 54, 82])
    return {
        "families_count": len(app.list_families()),
        "questions_for_V007": app.questions("V007"),
        "search_example": app.search_families("alzarsi divano cucina bere acqua"),
        "intake_packet_example": app.intake_packet("Mi devo alzare dal divano, andare in cucina e bere acqua", family_code="V007", level="scene"),
        "scene_report": result.report,
        "progressive_trace": scene_progressive_trace(result),
        "report_text": build_user_readable_report(result.report),
        "session": app.memory.snapshot(),
    }



# =============================================================================
# 10. ESTENSIONE v3 — INIZIALIZZAZIONE, SCENARIO INTELLIGENCE E TEMPO LUNGO
# =============================================================================


class QuestionnaireMode(str, Enum):
    RAPIDA = "rapida"
    STANDARD = "standard"
    PROFONDA = "profonda"
    PROFESSIONALE = "professionale"


class InputQuality(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BASSA = "bassa"
    INSUFFICIENTE = "insufficiente"


class OverlayKind(str, Enum):
    SONNO_SCARSO = "sonno_scarso"
    FATICA = "fatica"
    DOLORE_SINTOMI = "dolore_sintomi"
    INSTABILITA = "instabilita"
    CONFLITTO = "conflitto"
    URGENZA = "urgenza"
    RISCHIO_FISICO = "rischio_fisico"
    RISCHIO_SICUREZZA = "rischio_sicurezza"
    MALATTIA = "malattia"
    FOLLA_PUBBLICO = "folla_pubblico"
    DIGITALE_TECNICO = "digitale_tecnico"
    ECONOMICO = "economico"
    LEGALE_AMMINISTRATIVO = "legale_amministrativo"
    ISOLAMENTO = "isolamento"
    SUPPORTO_FITTIZIO = "supporto_fittizio"
    CARICO_CURA = "carico_cura"
    OVER_FUNCTIONING = "over_functioning"
    VIOLENZA_MINACCIA = "violenza_minaccia"
    ARMA_PRESENTE = "arma_presente"
    VALUTAZIONE_PRESTAZIONE = "valutazione_prestazione"


class SafetySeverity(str, Enum):
    INFO = "info"
    ATTENZIONE = "attenzione"
    STOP_PRUDENZIALE = "stop_prudenziale"
    PRIORITA_SICUREZZA = "priorita_sicurezza"


class BlueprintStatus(str, Enum):
    PRONTO_PER_TARATURA = "pronto_per_taratura"
    DATI_INSUFFICIENTI = "dati_insufficienti"
    STOP_PRIMA_DI_CALCOLARE = "stop_prima_di_calcolare"
    CALCOLABILE_CON_IPOTESI = "calcolabile_con_ipotesi"


class LifeEventKind(str, Enum):
    SCENA = "scena"
    RECUPERO = "recupero"
    SONNO = "sonno"
    STRESSOR = "stressor"
    SUPPORTO = "supporto"
    DELEGA = "delega"
    RIPARAZIONE = "riparazione"
    PAUSA = "pausa"
    NOTA = "nota"


@dataclass(frozen=True)
class CalibrationQuestion:
    code: str
    text: str
    target: str
    why: str
    answer_type: str = "scale_0_10"
    required: bool = True
    options: Tuple[str, ...] = ()


@dataclass
class InitialStateProfile:
    profile_id: str = "profile_default"
    mode: QuestionnaireMode = QuestionnaireMode.RAPIDA
    input_quality: InputQuality = InputQuality.MEDIA
    baseline_state: SystemState = field(default_factory=SystemState)
    baseline_energy: int = 0
    sleep_hours: float = 7.0
    sleep_quality: float = 0.6
    recovery_status: float = 0.5
    support_baseline: SupportContext = field(default_factory=SupportContext)
    delegation_baseline: DelegationKind = DelegationKind.ASSENTE
    human_profile: HumanProfileKind = HumanProfileKind.NEUTRO
    detected_overlays: Tuple[OverlayKind, ...] = ()
    safety_flags: Tuple[str, ...] = ()
    missing_data: Tuple[str, ...] = ()
    notes: Tuple[str, ...] = ()

    def normalized(self) -> "InitialStateProfile":
        return InitialStateProfile(
            profile_id=nonempty(self.profile_id, "profile_default"),
            mode=safe_enum(QuestionnaireMode, self.mode, QuestionnaireMode.RAPIDA),
            input_quality=safe_enum(InputQuality, self.input_quality, InputQuality.MEDIA),
            baseline_state=self.baseline_state.normalized(),
            baseline_energy=clamp_int(self.baseline_energy, -20, 20),
            sleep_hours=clamp_float(self.sleep_hours, 0.0, 14.0),
            sleep_quality=clamp_float(self.sleep_quality, 0.0, 1.0),
            recovery_status=clamp_float(self.recovery_status, 0.0, 1.0),
            support_baseline=self.support_baseline.normalized(),
            delegation_baseline=safe_enum(DelegationKind, self.delegation_baseline, DelegationKind.ASSENTE),
            human_profile=safe_enum(HumanProfileKind, self.human_profile, HumanProfileKind.NEUTRO),
            detected_overlays=tuple(safe_enum(OverlayKind, x, OverlayKind.FATICA) for x in self.detected_overlays),
            safety_flags=tuple(str(x) for x in self.safety_flags),
            missing_data=tuple(str(x) for x in self.missing_data),
            notes=tuple(str(x) for x in self.notes),
        )


@dataclass(frozen=True)
class FamilySensitivityProfile:
    family_code: str
    priority_levers: Tuple[str, ...]
    sensitive_state_fields: Tuple[str, ...]
    likely_overlays: Tuple[OverlayKind, ...]
    typical_stop_triggers: Tuple[str, ...]
    report_focus: Tuple[str, ...]
    calibration_focus: Tuple[str, ...]


@dataclass(frozen=True)
class SubFamilySpec:
    code: str
    parent_family: str
    title: str
    keywords: Tuple[str, ...]
    sensitive_levers: Tuple[str, ...]
    overlays: Tuple[OverlayKind, ...]
    stop_policies: Tuple[str, ...]
    typical_nodes: Tuple[str, ...]
    calibration_questions: Tuple[str, ...]


@dataclass(frozen=True)
class RiskOverlaySpec:
    kind: OverlayKind
    keywords: Tuple[str, ...]
    target_levers: Tuple[str, ...]
    default_questions: Tuple[str, ...]
    report_warning: str
    safety_relevant: bool = False


@dataclass(frozen=True)
class SafetyStopPolicy:
    code: str
    severity: SafetySeverity
    triggers: Tuple[str, ...]
    message: str
    recommended_actions: Tuple[str, ...]
    blocks_calculation: bool = False


@dataclass(frozen=True)
class NodeTemplate:
    code: str
    title: str
    family_code: str
    description: str
    p0_hint: int
    sensitive_levers: Tuple[str, ...]
    likely_kpd: Tuple[str, ...]
    adaptation_options: Tuple[AdaptationKind, ...]


@dataclass(frozen=True)
class SceneTemplate:
    code: str
    title: str
    family_codes: Tuple[str, ...]
    node_titles: Tuple[str, ...]
    suggested_level: TemporalLevel
    calibration_focus: Tuple[str, ...]


@dataclass
class ScenarioBlueprint:
    description: str
    status: BlueprintStatus
    suggested_level: TemporalLevel
    families: List[Dict[str, Any]] = field(default_factory=list)
    subfamilies: List[Dict[str, Any]] = field(default_factory=list)
    overlays: List[Dict[str, Any]] = field(default_factory=list)
    safety: List[Dict[str, Any]] = field(default_factory=list)
    calibration_questions: List[Dict[str, Any]] = field(default_factory=list)
    node_templates: List[Dict[str, Any]] = field(default_factory=list)
    scene_templates: List[Dict[str, Any]] = field(default_factory=list)
    payload_draft: Dict[str, Any] = field(default_factory=dict)
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return to_plain_data(self)


@dataclass
class SleepRecoveryProfile:
    hours: float = 7.0
    quality: float = 0.6
    continuity: float = 0.6
    real_rest: bool = True
    notes: str = ""

    def normalized(self) -> "SleepRecoveryProfile":
        return SleepRecoveryProfile(
            hours=clamp_float(self.hours, 0.0, 14.0),
            quality=clamp_float(self.quality, 0.0, 1.0),
            continuity=clamp_float(self.continuity, 0.0, 1.0),
            real_rest=bool(self.real_rest),
            notes=nonempty(self.notes),
        )


@dataclass
class RecoveryEvent:
    kind: LifeEventKind = LifeEventKind.RECUPERO
    intensity: float = 0.5
    duration_units: float = 1.0
    real_recovery: bool = True
    description: str = ""


@dataclass
class LifeEvent:
    event_id: str
    kind: LifeEventKind
    description: str
    state_delta: Dict[str, Any] = field(default_factory=dict)
    tags: Tuple[str, ...] = ()


@dataclass
class DynamicLifeState:
    profile: InitialStateProfile = field(default_factory=InitialStateProfile)
    current_state: SystemState = field(default_factory=SystemState)
    day_index: int = 0
    week_index: int = 0
    month_index: int = 0
    year_index: int = 0
    cumulative_hidden_cost: int = 0
    costly_success_streak: int = 0
    toxic_success_count: int = 0
    over_functioning_count: int = 0
    history: List[Dict[str, Any]] = field(default_factory=list)
    history_total_count: int = 0

    def snapshot(self) -> Dict[str, Any]:
        """Snapshot compatto per API/report.

        La history completa resta disponibile internamente per long_report, ma non viene
        serializzata a ogni payload: serializzarla interamente produceva crescita quadratica
        nei test lunghi e poteva causare timeout del test harness.
        """
        return {
            "profile": to_plain_data(self.profile),
            "current_state": to_plain_data(self.current_state),
            "day_index": self.day_index,
            "week_index": self.week_index,
            "month_index": self.month_index,
            "year_index": self.year_index,
            "cumulative_hidden_cost": self.cumulative_hidden_cost,
            "costly_success_streak": self.costly_success_streak,
            "toxic_success_count": self.toxic_success_count,
            "over_functioning_count": self.over_functioning_count,
            "history_length": self.history_total_count,
            "retained_history_length": len(self.history),
            "history_capped_at": MAX_HISTORY_RECORDS + HISTORY_TRIM_BATCH,
            "history_trim_target": MAX_HISTORY_RECORDS,
            "history_trim_batch": HISTORY_TRIM_BATCH,
            "history_retention_note": "soft cap: la history può arrivare temporaneamente a target+batch prima del trimming",
            "last": (
                {
                    "kind": self.history[-1].get("kind"),
                    "level": self.history[-1].get("level"),
                    "title": self.history[-1].get("title"),
                    "day_id": self.history[-1].get("day_id"),
                }
                if self.history else None
            ),
        }


@dataclass
class StateTransitionLog:
    label: str
    state_before: SystemState
    state_after: SystemState
    deltas: Dict[str, Any]
    reasons: Tuple[str, ...] = ()


@dataclass
class DayPlan:
    day_id: str
    title: str
    scenes: List[SceneInput] = field(default_factory=list)
    sleep_after: Optional[SleepRecoveryProfile] = None
    notes: str = ""


@dataclass
class DayResult:
    day_id: str
    title: str
    scene_results: List[SceneResult]
    state_before: SystemState
    state_after: SystemState
    recovery_log: Optional[StateTransitionLog]
    report: Dict[str, Any]


# ----------------------------------------------------------------------------
# Cataloghi v3: overlay, safety, sottofamiglie e template.
# Sono metadata operativi: orientano la taratura, non modificano la formula madre.
# ----------------------------------------------------------------------------


def _contains_any(text: str, keywords: Sequence[str]) -> bool:
    """Match keyword robusto, evitando falsi positivi su sottostringhe.

    Esempio canonico V3.1: "app" deve attivare digitale_tecnico solo come parola autonoma
    ("l'app", "app bloccata"), non dentro parole come "appoggiare" o "appoggiarmi".
    """
    low = str(text or "").lower()
    for kw in keywords:
        key = str(kw or "").strip().lower()
        if not key:
            continue
        if re.search(r"(?<!\w)" + re.escape(key) + r"(?!\w)", low):
            return True
    return False


RISK_OVERLAY_CATALOG: Dict[OverlayKind, RiskOverlaySpec] = {
    OverlayKind.SONNO_SCARSO: RiskOverlaySpec(OverlayKind.SONNO_SCARSO, ("dormito poco", "insonnia", "sonno", "notte in bianco", "stanco"), ("E", "STR", "POS", "cooldown"), ("Quante ore hai dormito?", "La qualità del sonno com'è da 0 a 10?"), "Sonno scarso: E e POS possono peggiorare, STR può accumularsi."),
    OverlayKind.DOLORE_SINTOMI: RiskOverlaySpec(OverlayKind.DOLORE_SINTOMI, ("dolore", "male", "nausea", "febbre", "sintomo", "mal di schiena", "cervicale"), ("E", "POS", "STR", "RIP"), ("Dolore/sintomo da 0 a 10?", "È stabile, in miglioramento o in peggioramento?"), "Dolore/sintomi: priorità a taratura corporea e sicurezza.", True),
    OverlayKind.INSTABILITA: RiskOverlaySpec(OverlayKind.INSTABILITA, ("instabilità", "vertigini", "sbandamento", "equilibrio", "capogiro", "giramenti"), ("E", "POS", "M", "K/Pd"), ("Hai rischio di caduta?", "Puoi appoggiarti o sederti?"), "Instabilità: non trattare il nodo come routine normale.", True),
    OverlayKind.CONFLITTO: RiskOverlaySpec(OverlayKind.CONFLITTO, ("litigio", "discussione", "conflitto", "rabbia", "urla", "partner", "famiglia"), ("I", "POS", "STR", "RIP", "K/Pd"), ("Il tono è già acceso?", "C'è possibilità di pausa o riparazione reale?"), "Conflitto: attenzione a escalation, RIP finta e successo tossico."),
    OverlayKind.URGENZA: RiskOverlaySpec(OverlayKind.URGENZA, ("fretta", "ritardo", "urgente", "scadenza", "deadline", "devo correre"), ("T", "STR", "C", "POS"), ("La fretta è reale o percepita?", "Cosa succede se ritardi?"), "Urgenza: T può peggiorare e aumentare costo."),
    OverlayKind.RISCHIO_FISICO: RiskOverlaySpec(OverlayKind.RISCHIO_FISICO, ("cadere", "caduta", "scivolare", "traffico", "guidare", "macchina", "strada", "scale"), ("E", "M", "POS", "K/Pd"), ("C'è rischio fisico reale?", "Puoi rinviare, sederti o chiedere aiuto?"), "Rischio fisico: safety stop possibile.", True),
    OverlayKind.RISCHIO_SICUREZZA: RiskOverlaySpec(OverlayKind.RISCHIO_SICUREZZA, ("pericolo", "sicurezza", "minaccia", "aggressione", "violenza", "arma", "coltello", "pistola"), ("POS", "STR", "K/Pd", "supporto"), ("Sei al sicuro adesso?", "Puoi allontanarti o chiamare aiuto?"), "Sicurezza: priorità protezione e de-escalation.", True),
    OverlayKind.MALATTIA: RiskOverlaySpec(OverlayKind.MALATTIA, ("malattia", "influenza", "patologia", "cronico", "febbre", "medico"), ("E", "STR", "RIP", "floor1"), ("La condizione è acuta o cronica?", "Hai indicazioni professionali?"), "Malattia: il modello resta orientativo, non clinico.", True),
    OverlayKind.FOLLA_PUBBLICO: RiskOverlaySpec(OverlayKind.FOLLA_PUBBLICO, ("folla", "pubblico", "supermercato", "classe", "stazione", "gente"), ("M", "I", "STR", "K/Pd"), ("Quanto è affollato l'ambiente?", "La folla interferisce attivamente?"), "Folla/pubblico: distinguere M passivo da K/Pd attivo."),
    OverlayKind.DIGITALE_TECNICO: RiskOverlaySpec(OverlayKind.DIGITALE_TECNICO, ("app", "password", "otp", "computer", "sito", "online", "digitale"), ("I", "C", "T", "K/Pd"), ("Le istruzioni sono chiare?", "L'app/sito può rifiutare o bloccarsi?"), "Digitale tecnico: fallimento spesso tecnico, non personale."),
    OverlayKind.ECONOMICO: RiskOverlaySpec(OverlayKind.ECONOMICO, ("soldi", "pagare", "debito", "mutuo", "stipendio", "costo", "bolletta"), ("T", "I", "STR", "C"), ("C'è una scadenza economica?", "Hai alternative o supporto?"), "Economico: pressione e conseguenze differite da esplicitare."),
    OverlayKind.ISOLAMENTO: RiskOverlaySpec(OverlayKind.ISOLAMENTO, ("solo", "da solo", "nessuno", "isolato", "non posso chiedere"), ("supporto", "STR", "POS", "DEB"), ("Puoi chiedere aiuto a qualcuno?", "Esiste supporto reale o solo simbolico?"), "Isolamento: aumenta rischio successo costoso/over-functioning."),
    OverlayKind.CARICO_CURA: RiskOverlaySpec(OverlayKind.CARICO_CURA, ("caregiver", "assistere", "cura", "bambino", "figlio", "anziano", "persona fragile"), ("E", "T", "STR", "supporto"), ("Il carico è continuativo?", "Chi scarica davvero una parte?"), "Carico di cura: attenzione a over-functioning e delega finta."),
    OverlayKind.OVER_FUNCTIONING: RiskOverlaySpec(OverlayKind.OVER_FUNCTIONING, ("faccio tutto io", "reggo tutto", "nessuno mi aiuta", "sempre io", "compenso"), ("STR", "DEB", "supporto", "RIP"), ("Il sistema funziona perché compensi tu?", "Cosa puoi delegare davvero?"), "Over-functioning: efficienza esterna non equivale a salute."),
    OverlayKind.VALUTAZIONE_PRESTAZIONE: RiskOverlaySpec(OverlayKind.VALUTAZIONE_PRESTAZIONE, ("colloquio", "esame", "valutazione", "presentazione", "gara", "prestazione"), ("I", "T", "POS", "STR"), ("Quanto conta il giudizio esterno?", "Hai preparazione o piano B?"), "Valutazione/prestazione: distinguere competenza da pressione."),
}


SAFETY_POLICIES: Tuple[SafetyStopPolicy, ...] = (
    SafetyStopPolicy(
        code="STOP_GUIDA_INSTABILITA",
        severity=SafetySeverity.PRIORITA_SICUREZZA,
        triggers=("guidare", "macchina", "auto", "vertigini", "sbandamento", "sonnolenza", "capogiro"),
        message="Guida con instabilità/sonnolenza/vertigini: priorità alla sicurezza, non alla riuscita del nodo.",
        recommended_actions=("fermarsi o non partire", "chiedere passaggio/delega", "valutare aiuto reale", "evitare decisioni complesse in stato compromesso"),
        blocks_calculation=True,
    ),
    SafetyStopPolicy(
        code="STOP_CADUTA_DEBOLEZZA",
        severity=SafetySeverity.STOP_PRUDENZIALE,
        triggers=("debolezza estrema", "rischio caduta", "svenire", "confusione", "cadere", "scale"),
        message="Rischio fisico/caduta: prima ridurre rischio, sedersi, appoggiarsi o chiedere aiuto.",
        recommended_actions=("ridurre movimento", "sedersi", "rimuovere ostacoli", "chiedere supporto reale"),
        blocks_calculation=False,
    ),
    SafetyStopPolicy(
        code="STOP_VIOLENZA_ARMI",
        severity=SafetySeverity.PRIORITA_SICUREZZA,
        triggers=("violenza", "minaccia", "arma", "pistola", "coltello", "aggressione", "combattimento"),
        message="Scenario di violenza/minaccia/arma: il simulatore deve orientare a sicurezza, de-escalation, allontanamento e aiuto, non a tattiche offensive.",
        recommended_actions=("allontanarsi se possibile", "chiedere aiuto", "contattare servizi adeguati se c'è pericolo", "non ingaggiare escalation"),
        blocks_calculation=True,
    ),
    SafetyStopPolicy(
        code="STOP_BAMBINI_PERSONE_FRAGILI",
        severity=SafetySeverity.PRIORITA_SICUREZZA,
        triggers=("bambino in pericolo", "bambini in pericolo", "figlio in pericolo", "persona fragile in pericolo", "anziano in pericolo", "minore in pericolo"),
        message="Rischio per bambino, minore o persona fragile: priorità alla protezione e al supporto reale prima del calcolo operativo.",
        recommended_actions=("mettere in sicurezza la persona fragile", "ridurre il rischio immediato", "attivare supporto reale", "rinviare il non urgente"),
        blocks_calculation=True,
    ),
)


def build_family_sensitivity_catalog() -> Dict[str, FamilySensitivityProfile]:
    catalog: Dict[str, FamilySensitivityProfile] = {}
    for code, spec in LIFE_FAMILIES.items():
        overlays: List[OverlayKind] = []
        stops: List[str] = []
        focus: List[str] = list(spec.report_flags)
        area = spec.area
        levers = tuple(str(x) for x in spec.sensitive_levers)
        if area == LifeArea.CURA_PERSONALE_CORPO:
            overlays += [OverlayKind.FATICA, OverlayKind.DOLORE_SINTOMI, OverlayKind.INSTABILITA]
            stops += ["rischio caduta", "debolezza estrema", "sintomi acuti"]
            focus += ["corpo", "sicurezza", "recupero"]
        elif area == LifeArea.MOBILITA_STRADA:
            overlays += [OverlayKind.RISCHIO_FISICO, OverlayKind.URGENZA]
            stops += ["guida con vertigini", "sonnolenza intensa", "strada pericolosa"]
            focus += ["sicurezza", "campo", "tempo"]
        elif area == LifeArea.COPPIA_FAMIGLIA:
            overlays += [OverlayKind.CONFLITTO, OverlayKind.CARICO_CURA, OverlayKind.OVER_FUNCTIONING]
            stops += ["violenza", "paura", "coercizione"]
            focus += ["RIP", "supporto", "over-functioning"]
        elif area == LifeArea.LAVORO_SCUOLA:
            overlays += [OverlayKind.URGENZA, OverlayKind.VALUTAZIONE_PRESTAZIONE, OverlayKind.OVER_FUNCTIONING]
            focus += ["successo tecnico", "costo", "deadline"]
        elif area == LifeArea.DIGITALE_BUROCRAZIA:
            overlays += [OverlayKind.DIGITALE_TECNICO, OverlayKind.URGENZA, OverlayKind.LEGALE_AMMINISTRATIVO]
            focus += ["fallimento tecnico", "I/C", "frustrazione"]
        else:
            overlays += [OverlayKind.FATICA, OverlayKind.FOLLA_PUBBLICO]
        catalog[code] = FamilySensitivityProfile(
            family_code=code,
            priority_levers=levers,
            sensitive_state_fields=("STR", "POS", "DEB", "RIP", "ri4", "or1"),
            likely_overlays=tuple(aggregate_unique([o.value for o in overlays])),  # type: ignore[arg-type]
            typical_stop_triggers=tuple(aggregate_unique(stops)),
            report_focus=tuple(aggregate_unique(focus)),
            calibration_focus=tuple(aggregate_unique(list(levers) + ["supporto", "RIP", "tempo", "ambiente"])),
        )
    # Corregge tipo: aggregate_unique restituisce stringhe; riconverto negli enum.
    return {
        k: FamilySensitivityProfile(
            family_code=v.family_code,
            priority_levers=v.priority_levers,
            sensitive_state_fields=v.sensitive_state_fields,
            likely_overlays=tuple(safe_enum(OverlayKind, x, OverlayKind.FATICA) for x in v.likely_overlays),
            typical_stop_triggers=v.typical_stop_triggers,
            report_focus=v.report_focus,
            calibration_focus=v.calibration_focus,
        )
        for k, v in catalog.items()
    }


FAMILY_SENSITIVITY_CATALOG: Dict[str, FamilySensitivityProfile] = build_family_sensitivity_catalog()


SUBFAMILY_CATALOG: Tuple[SubFamilySpec, ...] = (
    SubFamilySpec("V002_SUB_INSTABILITA", "V002", "Alzarsi/muoversi con instabilità", ("alzarmi", "divano", "instabilità", "equilibrio"), ("E", "POS", "M", "STR"), (OverlayKind.INSTABILITA, OverlayKind.RISCHIO_FISICO), ("rischio caduta", "vertigini"), ("sedersi", "alzarsi", "stabilizzarsi", "camminare"), ("Hai vertigini o solo lieve instabilità?", "Puoi appoggiarti?")),
    SubFamilySpec("V007_SUB_BERE_ACQUA", "V007", "Bere/acqua/routine minima", ("bere", "acqua", "bicchiere", "bottiglia", "cucina"), ("E", "M", "C", "POS"), (OverlayKind.FATICA,), ("debolezza estrema", "rischio caduta"), ("alzarsi", "raggiungere cucina", "prendere oggetti", "versare", "bere"), ("Bottiglia e bicchiere sono vicini?", "Hai fretta o puoi farlo con calma?")),
    SubFamilySpec("V017_SUB_GUIDA_STANCA", "V017", "Guidare con stanchezza/sonno scarso", ("guidare", "auto", "macchina", "sonno", "stanco"), ("E", "T", "M", "STR", "POS", "K/Pd"), (OverlayKind.SONNO_SCARSO, OverlayKind.RISCHIO_FISICO), ("sonnolenza intensa", "vertigini", "farmaci sedativi"), ("prepararsi", "salire in auto", "guidare", "parcheggiare"), ("Quante ore hai dormito?", "La guida è evitabile o delegabile?")),
    SubFamilySpec("V030_SUB_COLLOQUIO", "V030", "Colloquio/valutazione con autorità", ("colloquio", "responsabile", "capo", "selezione", "domanda"), ("I", "T", "POS", "STR", "or1"), (OverlayKind.VALUTAZIONE_PRESTAZIONE, OverlayKind.URGENZA), (), ("arrivare", "presentarsi", "ascoltare domanda", "rispondere", "chiudere"), ("Quanto sei preparato?", "Hai tempo di arrivare prima?")),
    SubFamilySpec("V034_SUB_DIALOGO_TESO", "V034", "Dialogo di coppia teso", ("partner", "coppia", "discussione", "litigio", "parlare"), ("I", "POS", "STR", "RIP", "K/Pd"), (OverlayKind.CONFLITTO,), ("paura", "violenza", "coercizione"), ("aprire tema", "ascoltare", "rispondere", "riparare"), ("Il tono è già acceso?", "È possibile una pausa vera?")),
    SubFamilySpec("V040_SUB_CAREGIVER", "V040", "Cura persona fragile/caregiver", ("caregiver", "anziano", "persona fragile", "assistere", "cura"), ("E", "STR", "C", "supporto", "DEB"), (OverlayKind.CARICO_CURA, OverlayKind.OVER_FUNCTIONING, OverlayKind.ISOLAMENTO), ("quasi-collasso", "supporto assente", "sicurezza fragile"), ("monitorare", "assistere", "organizzare", "chiedere supporto"), ("Da quanto dura il carico?", "Chi scarica davvero una parte?")),
)


NODE_TEMPLATES: Tuple[NodeTemplate, ...] = (
    NodeTemplate("NT_BERE_01", "Alzarsi dal divano", "V002", "Passare da seduto a in piedi con stabilizzazione minima", 80, ("E", "POS", "M", "STR"), ("capogiro", "ostacolo"), (AdaptationKind.SEMPLIFICARE, AdaptationKind.PAUSA_REALE)),
    NodeTemplate("NT_BERE_02", "Prendere bottiglia e bicchiere", "V007", "Afferrare e gestire due oggetti semplici", 88, ("E", "M", "C", "POS"), ("oggetto scivoloso", "bicchiere mancante"), (AdaptationKind.SPEZZARE_COMPITO,)),
    NodeTemplate("NT_GUIDA_01", "Guidare tratto breve", "V017", "Guidare un tratto noto con campo stradale ordinario", 70, ("E", "T", "M", "POS", "STR"), ("traffico", "ostacolo", "pioggia"), (AdaptationKind.DELEGARE, AdaptationKind.RINVIARE_SENZA_EVITARE)),
    NodeTemplate("NT_COLLOQUIO_01", "Rispondere a domanda difficile", "V030", "Gestire una domanda valutativa sotto pressione", 60, ("I", "T", "POS", "STR"), ("incalzare", "interruzione", "tono giudicante"), (AdaptationKind.SPEZZARE_COMPITO, AdaptationKind.PAUSA_REALE)),
    NodeTemplate("NT_CONFLITTO_01", "Rispondere a tono provocatorio", "V035", "Risposta breve senza escalation", 55, ("I", "POS", "STR", "RIP"), ("ribattuta", "escalation"), (AdaptationKind.PAUSA_REALE, AdaptationKind.RIPARARE)),
)


SCENE_TEMPLATES: Tuple[SceneTemplate, ...] = (
    SceneTemplate("ST_BERE_ACQUA", "Alzarsi e bere acqua", ("V002", "V007", "V009"), ("alzarsi", "camminare", "prendere bottiglia e bicchiere", "versare", "bere"), TemporalLevel.SCENA, ("corpo", "instabilità", "ambiente", "tempo")),
    SceneTemplate("ST_GUIDA_COLLOQUIO", "Prepararsi, guidare e sostenere colloquio", ("V001", "V017", "V030"), ("svegliarsi", "prepararsi", "guidare", "arrivare", "rispondere"), TemporalLevel.CATENA_BREVE, ("sonno", "sicurezza guida", "valutazione", "tempo")),
    SceneTemplate("ST_DIALOGO_COPPIA", "Aprire dialogo di coppia teso", ("V034", "V035"), ("aprire tema", "ascoltare", "rispondere", "riparare o sospendere"), TemporalLevel.SCENA, ("tono", "RIP", "POS", "conflitto")),
    SceneTemplate("ST_CAREGIVER_DAY", "Giornata di cura fragile", ("V036", "V037", "V040"), ("organizzare", "assistere", "gestire imprevisto", "recuperare"), TemporalLevel.CATENA_BREVE, ("supporto reale", "delega", "STR", "over-functioning")),
)


# ----------------------------------------------------------------------------
# Scenario Intelligence
# ----------------------------------------------------------------------------


def detect_risk_overlays(description: str) -> List[RiskOverlaySpec]:
    text = description or ""
    found: List[RiskOverlaySpec] = []
    for spec in RISK_OVERLAY_CATALOG.values():
        if _contains_any(text, spec.keywords):
            found.append(spec)
    return found


def detect_safety_stops(description: str, overlays: Optional[Sequence[RiskOverlaySpec]] = None) -> List[SafetyStopPolicy]:
    text = description or ""
    overlay_kinds = {o.kind for o in overlays or []}
    hits: List[SafetyStopPolicy] = []
    for policy in SAFETY_POLICIES:
        # Trigger forte: almeno un termine del dominio + uno del rischio quando possibile.
        if policy.code == "STOP_GUIDA_INSTABILITA":
            if _contains_any(text, ("guidare", "macchina", "auto")) and _contains_any(text, ("vertigini", "sbandamento", "sonnolenza", "capogiro", "dormito poco")):
                hits.append(policy)
        elif policy.code == "STOP_VIOLENZA_ARMI":
            if OverlayKind.VIOLENZA_MINACCIA in overlay_kinds or OverlayKind.ARMA_PRESENTE in overlay_kinds or _contains_any(text, policy.triggers):
                hits.append(policy)
        elif _contains_any(text, policy.triggers):
            hits.append(policy)
    return hits


def suggest_subfamilies(description: str, family_codes: Sequence[str], *, limit: int = 8) -> List[Dict[str, Any]]:
    text = description or ""
    codes = {c.upper() for c in family_codes}
    scored: List[Tuple[int, SubFamilySpec]] = []
    for sub in SUBFAMILY_CATALOG:
        score = 0
        if sub.parent_family in codes:
            score += 4
        score += sum(1 for kw in sub.keywords if kw.lower() in text.lower()) * 3
        if score > 0:
            scored.append((score, sub))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"score": score, **to_plain_data(sub)} for score, sub in scored[:limit]]


def suggest_scene_templates(description: str, family_codes: Sequence[str], overlays: Sequence[RiskOverlaySpec], *, limit: int = 5) -> List[Dict[str, Any]]:
    text = description or ""
    codes = {c.upper() for c in family_codes}
    overlay_words = " ".join(o.kind.value for o in overlays)
    scored: List[Tuple[int, SceneTemplate]] = []
    for tpl in SCENE_TEMPLATES:
        score = sum(5 for c in tpl.family_codes if c in codes)
        score += sum(2 for node in tpl.node_titles if node.lower() in text.lower())
        score += sum(1 for focus in tpl.calibration_focus if focus.lower() in text.lower() or focus.lower() in overlay_words)
        if score > 0:
            scored.append((score, tpl))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"score": score, **to_plain_data(tpl)} for score, tpl in scored[:limit]]


def suggest_node_templates(description: str, family_codes: Sequence[str], *, limit: int = 8) -> List[Dict[str, Any]]:
    text = description or ""
    codes = {c.upper() for c in family_codes}
    scored: List[Tuple[int, NodeTemplate]] = []
    for tpl in NODE_TEMPLATES:
        score = 0
        if tpl.family_code in codes:
            score += 4
        if any(w in text.lower() for w in tpl.title.lower().split()):
            score += 2
        if score > 0:
            scored.append((score, tpl))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"score": score, **to_plain_data(tpl)} for score, tpl in scored[:limit]]


def infer_temporal_level(description: str, families: Sequence[Dict[str, Any]], overlays: Sequence[RiskOverlaySpec]) -> TemporalLevel:
    text = description.lower()
    if _contains_any(text, ("mesi", "anni", "da anni", "traiettoria", "sempre", "da mesi")):
        return TemporalLevel.TRAIETTORIA_LUNGA
    if _contains_any(text, ("settimana", "giorni", "tutti i giorni", "tre giorni", "mini settimana")):
        return TemporalLevel.MINI_SETTIMANA
    if _contains_any(text, ("poi", "dopo", "prima", "domani", "mattina", "andare al lavoro", "colloquio")) or len(families) >= 3:
        return TemporalLevel.CATENA_BREVE
    if len(families) >= 2 or len(overlays) >= 2:
        return TemporalLevel.SCENA
    return TemporalLevel.NODO


def build_v3_questionnaire(
    mode: Union[str, QuestionnaireMode] = QuestionnaireMode.RAPIDA,
    *,
    description: str = "",
    family_codes: Sequence[str] = (),
    overlays: Sequence[RiskOverlaySpec] = (),
) -> List[CalibrationQuestion]:
    mode = safe_enum(QuestionnaireMode, mode, QuestionnaireMode.RAPIDA)
    questions: List[CalibrationQuestion] = [
        CalibrationQuestion("Q_BODY", "Condizione fisica generale adesso da 0 a 10?", "E/POS", "Stima energia corporea e assetto iniziale."),
        CalibrationQuestion("Q_SLEEP", "Quante ore hai dormito e com'è stata la qualità del sonno?", "E/STR/cooldown", "Il sonno aggiorna energia e recupero."),
        CalibrationQuestion("Q_STRESS", "Stress/carico accumulato negli ultimi giorni da 0 a 10?", "STR", "Distingue episodio isolato da carico persistente."),
        CalibrationQuestion("Q_POS", "Ti senti stabile, orientato e in controllo della scena da 0 a 10?", "POS/or1", "Misura assetto operativo/mentale/corporeo."),
        CalibrationQuestion("Q_SUPPORT", "Hai supporto o delega reale, oppure solo aiuto simbolico?", "supporto/delega", "Serve a distinguere scarico reale da falso supporto.", "choice", False, ("assente", "emotivo", "pratico", "logistico", "delega reale", "simbolico")),
    ]
    for overlay in overlays:
        for idx, q in enumerate(overlay.default_questions, start=1):
            questions.append(CalibrationQuestion(f"Q_OV_{overlay.kind.value}_{idx}", q, "/".join(overlay.target_levers), overlay.report_warning, "text", True))
    for code in family_codes:
        sens = FAMILY_SENSITIVITY_CATALOG.get(code.upper())
        if sens:
            questions.append(CalibrationQuestion(f"Q_FAM_{code}_LEVERS", f"Per {code}, quali leve pesano di più: {', '.join(sens.priority_levers)}?", "/".join(sens.priority_levers), "Taratura famiglia-specifica.", "text", False))
    if mode in {QuestionnaireMode.STANDARD, QuestionnaireMode.PROFONDA, QuestionnaireMode.PROFESSIONALE}:
        questions.extend([
            CalibrationQuestion("Q_RIP", "Hai avuto un recupero/riassetto reale oppure solo pausa apparente?", "RIP/ri4", "RIP vera modifica costo e rientro.", "choice", False, ("assente", "finta", "debole", "vera", "piena")),
            CalibrationQuestion("Q_DEB", "Stai insistendo da tempo con una strategia che non funziona?", "DEB", "Serve a stimare debito da perseverazione.", "scale_0_10", False),
            CalibrationQuestion("Q_LOAD", "Carico familiare/lavorativo medio dell'ultimo periodo da 0 a 10?", "STR/MACRO", "Aiuta a scegliere MACRO iniziale.", "scale_0_10", False),
        ])
    if mode in {QuestionnaireMode.PROFONDA, QuestionnaireMode.PROFESSIONALE}:
        questions.extend([
            CalibrationQuestion("Q_HISTORY", "Da quanto tempo dura questa condizione o traiettoria?", "MACRO/floor1", "Il lungo periodo non si legge come nodo isolato.", "text", False),
            CalibrationQuestion("Q_OVERFUNCTION", "Il sistema funziona perché compensi quasi tutto tu?", "over-functioning/supporto", "Rileva falso successo sistemico.", "scale_0_10", False),
            CalibrationQuestion("Q_INPUT_CONFIDENCE", "Quanto sono affidabili/completi i dati che stai dando da 0 a 10?", "input_quality", "Evita precisione finta.", "scale_0_10", False),
        ])
    return questions


def build_scenario_blueprint(description: str, *, level: Optional[Union[str, TemporalLevel]] = None, mode: Union[str, QuestionnaireMode] = QuestionnaireMode.RAPIDA) -> ScenarioBlueprint:
    families = search_life_families(description, limit=8)
    family_codes = [f["code"] for f in families]
    overlays = detect_risk_overlays(description)
    safety = detect_safety_stops(description, overlays)
    lvl = safe_enum(TemporalLevel, level, infer_temporal_level(description, families, overlays)) if level else infer_temporal_level(description, families, overlays)
    subfamilies = suggest_subfamilies(description, family_codes)
    scene_templates = suggest_scene_templates(description, family_codes, overlays)
    node_templates = suggest_node_templates(description, family_codes)
    questions = build_v3_questionnaire(mode, description=description, family_codes=family_codes[:3], overlays=overlays)
    blocks = any(p.blocks_calculation for p in safety)
    status = BlueprintStatus.STOP_PRIMA_DI_CALCOLARE if blocks else BlueprintStatus.PRONTO_PER_TARATURA
    payload_draft = {
        "level": lvl.value,
        "needs_calibration": True,
        "suggested_family_codes": family_codes[:5],
        "suggested_subfamilies": [s.get("code") for s in subfamilies[:5]],
        "detected_overlays": [o.kind.value for o in overlays],
        "safety_blocks_calculation": blocks,
        "next_step": "fare taratura iniziale/adattiva prima del calcolo",
    }
    notes = [
        "Blueprint non calcolato: serve per orientare taratura e payload.",
        "Le sottofamiglie sono metadata operativi, non nuove variabili del nodo.",
    ]
    if blocks:
        notes.append("Presente stop prudenziale: priorità sicurezza prima del calcolo.")
    return ScenarioBlueprint(
        description=description,
        status=status,
        suggested_level=lvl,
        families=families,
        subfamilies=subfamilies,
        overlays=[to_plain_data(o) for o in overlays],
        safety=[to_plain_data(p) for p in safety],
        calibration_questions=[to_plain_data(q) for q in questions],
        node_templates=node_templates,
        scene_templates=scene_templates,
        payload_draft=payload_draft,
        notes=notes,
    )


# ----------------------------------------------------------------------------
# Initial Calibration Engine
# ----------------------------------------------------------------------------


def _num_answer(answers: Mapping[str, Any], *keys: str, default: float = 0.0) -> float:
    """Legge un numero dalla taratura iniziale in modo robusto.

    Non modifica la matematica per input validi; evita solo che valori sporchi
    come NaN/Infinity, liste, dict o stringhe non numeriche arrivino fino a
    round()/clamp generando OverflowError o ValueError nei payload fuzz/API.
    """
    for key in keys:
        if key in answers and answers[key] is not None:
            try:
                number = float(answers[key])
            except Exception:
                continue
            if math.isfinite(number):
                return number
    return _safe_number(default, 0.0)


def _bool_answer(answers: Mapping[str, Any], *keys: str, default: bool = False) -> bool:
    truthy = {"si", "sì", "yes", "true", "vero", "1", "presente"}
    falsy = {"no", "false", "falso", "0", "assente"}
    for key in keys:
        if key in answers:
            v = answers[key]
            if isinstance(v, bool):
                return v
            s = str(v).strip().lower()
            if s in truthy:
                return True
            if s in falsy:
                return False
    return default


def estimate_input_quality(answers: Mapping[str, Any], mode: QuestionnaireMode) -> InputQuality:
    provided = sum(1 for v in answers.values() if v not in (None, ""))
    if mode == QuestionnaireMode.RAPIDA:
        if provided >= 6:
            return InputQuality.ALTA
        if provided >= 4:
            return InputQuality.MEDIA
        if provided >= 2:
            return InputQuality.BASSA
        return InputQuality.INSUFFICIENTE
    if provided >= 12:
        return InputQuality.ALTA
    if provided >= 7:
        return InputQuality.MEDIA
    if provided >= 4:
        return InputQuality.BASSA
    return InputQuality.INSUFFICIENTE


def initialize_profile_from_answers(answers: Mapping[str, Any], *, mode: Union[str, QuestionnaireMode] = QuestionnaireMode.RAPIDA, description: str = "") -> InitialStateProfile:
    mode_enum = safe_enum(QuestionnaireMode, mode, QuestionnaireMode.RAPIDA)
    energy_0_10 = _num_answer(answers, "energy", "energia", "energia_fisica", "body", "Q_BODY", default=6.0)
    sleep_hours = _num_answer(answers, "sleep_hours", "sonno_ore", "ore_sonno", "hours_sleep", default=7.0)
    sleep_quality_0_10 = _num_answer(answers, "sleep_quality", "qualita_sonno", "qualità_sonno", "sonno_qualita", "sonno_qualità", default=6.0)
    stress_0_10 = _num_answer(
        answers,
        "stress_mentale", "stress", "stress_carico", "carico_stress", "STR", "Q_STRESS", "pressione_interna",
        default=4.0,
    )
    pos_0_10 = _num_answer(answers, "pos", "POS", "stabilita", "stabilità", "Q_POS", default=6.0)
    pain_0_10 = _num_answer(answers, "pain", "dolore", "sintomi", default=0.0)
    instability_0_10 = _num_answer(answers, "instability", "instabilita", "instabilità", "vertigini", default=0.0)
    load_0_10 = _num_answer(
        answers,
        "carico_concreto", "load", "carico", "carico_accumulato", "family_work_load", "carico_familiare_lavorativo",
        default=stress_0_10,
    )
    debt_0_10 = _num_answer(answers, "debt", "deb", "perseverazione", default=0.0)
    support_score = _num_answer(answers, "support_score", "supporto", default=0.0)
    delegation_real = _bool_answer(answers, "delegation_real", "delega_reale", default=False)
    real_recovery = _bool_answer(answers, "real_recovery", "rip_vera", default=False)

    baseline_energy = clamp_int(round((energy_0_10 - 5) * 3 - pain_0_10 - instability_0_10), -20, 20)
    str_base = clamp_int(round(stress_0_10 * 7 + max(0, load_0_10 - 5) * 3 + max(0, 6 - sleep_quality_0_10) * 2), 0, 100)
    pos_base = clamp_int(round(pos_0_10 * 10 - instability_0_10 * 4 - pain_0_10 * 2), 0, 100)
    debt = 0
    if debt_0_10 >= 7 and str_base >= 60:
        debt = 2
    elif debt_0_10 >= 4 and str_base >= 50:
        debt = 1
    rip = RipKind.VERA if real_recovery else RipKind.ASSENTE
    ri4_score = clamp_float((sleep_quality_0_10 / 10 + (1.0 if real_recovery else 0.45) + max(0.0, 1 - stress_0_10 / 10)) / 3, 0.0, 1.0)
    ri4 = Ri4State(ri4_score, ri4_score if real_recovery else ri4_score * 0.75, clamp_float(support_score / 10, 0.0, 1.0), clamp_float(energy_0_10 / 10, 0.0, 1.0)).normalized()
    floor1 = str_base >= 80 or pos_base <= 30 or debt >= 2
    cooldown = 2 if floor1 else (1 if str_base >= 70 else 0)
    state = SystemState(
        stress_str=str_base,
        position_pos=pos_base,
        debt_deb=debt,
        protective_bonus_bp=0,
        rip=rip,
        or1_orientation=clamp_float(pos_base / 100, 0.0, 1.0),
        ri4=ri4,
        macro=choose_macro_by_state(SystemState(stress_str=str_base, position_pos=pos_base, debt_deb=debt, hidden_cost=0)),
        cooldown_remaining=cooldown,
        floor1_active=floor1,
        floor1_reason="baseline compromessa" if floor1 else "",
        hidden_cost=clamp_int(round(max(0, stress_0_10 - 5) * 4 + max(0, 5 - energy_0_10) * 3), 0, 100),
    ).normalized()
    support = SupportContext(
        support_kind=SupportKind.PRATICO if support_score >= 6 else (SupportKind.EMOTIVO if support_score > 0 else SupportKind.ASSENTE),
        delegation_kind=DelegationKind.REALE if delegation_real else DelegationKind.ASSENTE,
        load_reduction_score=clamp_float(support_score / 10, 0.0, 1.0),
        competence_score=clamp_float(support_score / 10, 0.0, 1.0),
        timely=support_score >= 5,
    ).normalized()
    overlays = tuple(o.kind for o in detect_risk_overlays(description + " " + json.dumps(dict(answers), ensure_ascii=False)))
    safety = tuple(p.code for p in detect_safety_stops(description, detect_risk_overlays(description)))
    iq = estimate_input_quality(answers, mode_enum)
    missing: List[str] = []
    def _has_any(*keys: str) -> bool:
        return any(k in answers for k in keys)

    required_alias_groups = (
        ("energy", "energia", "energia_fisica", "body", "Q_BODY"),
        ("sleep_hours", "sonno_ore", "ore_sonno", "hours_sleep"),
        ("sleep_quality", "qualita_sonno", "qualità_sonno", "sonno_qualita", "sonno_qualità"),
        ("stress_mentale", "stress", "stress_carico", "carico_stress", "STR", "Q_STRESS", "pressione_interna"),
        ("carico_concreto", "load", "carico", "carico_accumulato", "family_work_load", "carico_familiare_lavorativo"),
        ("pos", "POS", "stabilita", "stabilità", "Q_POS"),
        ("support_score", "supporto"),
    )
    canonical_missing_names = (
        "energia", "ore_sonno", "qualita_sonno", "stress_mentale",
        "carico_concreto", "stabilita", "supporto",
    )
    for canonical_name, aliases in zip(canonical_missing_names, required_alias_groups):
        if not _has_any(*aliases):
            missing.append(canonical_name)
    notes = ["Profilo iniziale euristico: da confermare con taratura più profonda se la simulazione è lunga."]
    if (
        "stress_mentale" not in answers
        and "stress" in answers
        and "carico_concreto" not in answers
        and "load" not in answers
        and "carico" not in answers
        and "carico_accumulato" not in answers
        and "carico_stress" not in answers
    ):
        notes.append(
            "Taratura severa: il valore unico di stress è stato usato anche come carico concreto. "
            "Per maggiore precisione separare stress_mentale e carico_concreto."
        )
    if iq in {InputQuality.BASSA, InputQuality.INSUFFICIENTE}:
        notes.append("Qualità input fragile: evitare precisione numerica eccessiva.")
    return InitialStateProfile(
        profile_id=str(answers.get("profile_id", "profile_v3")),
        mode=mode_enum,
        input_quality=iq,
        baseline_state=state,
        baseline_energy=baseline_energy,
        sleep_hours=sleep_hours,
        sleep_quality=clamp_float(sleep_quality_0_10 / 10, 0.0, 1.0),
        recovery_status=ri4.score,
        support_baseline=support,
        delegation_baseline=support.delegation_kind,
        human_profile=safe_enum(HumanProfileKind, answers.get("human_profile", HumanProfileKind.NEUTRO), HumanProfileKind.NEUTRO),
        detected_overlays=overlays,
        safety_flags=safety,
        missing_data=tuple(missing),
        notes=tuple(notes),
    ).normalized()


# ----------------------------------------------------------------------------
# Temporal Evolution Engine
# ----------------------------------------------------------------------------


def apply_sleep_recovery(state: SystemState, sleep: SleepRecoveryProfile, config: EngineConfig = DEFAULT_CONFIG) -> StateTransitionLog:
    state = state.normalized()
    sleep = sleep.normalized()
    before = state
    sleep_factor = clamp_float((sleep.hours / 8.0) * 0.45 + sleep.quality * 0.35 + sleep.continuity * 0.20, 0.0, 1.25)
    if not sleep.real_rest:
        sleep_factor *= 0.45
    if state.floor1_active or state.cooldown_remaining > 0:
        sleep_factor *= 0.55
    str_drop = int(max(0, state.stress_str - 30) * 0.28 * sleep_factor)
    pos_gain = int(max(0, 70 - state.position_pos) * 0.24 * sleep_factor)
    hidden_drop = int(max(0, state.hidden_cost - 10) * 0.20 * sleep_factor)
    new_deb = state.debt_deb
    if sleep.real_rest and sleep.quality >= 0.75 and state.rip in {RipKind.VERA, RipKind.PIENA} and new_deb > 0:
        new_deb -= 1
    new_ri4 = Ri4State(
        rientro=clamp_float(state.ri4.rientro + 0.12 * sleep_factor, 0, 1),
        riparazione=clamp_float(state.ri4.riparazione + (0.06 if sleep.real_rest else 0.01), 0, 1),
        riduzione=clamp_float(state.ri4.riduzione + 0.08 * sleep_factor, 0, 1),
        ripresa=clamp_float(state.ri4.ripresa + 0.10 * sleep_factor, 0, 1),
    ).normalized()
    after = SystemState(
        stress_str=clamp_int(state.stress_str - str_drop, 0, 100),
        position_pos=clamp_int(state.position_pos + pos_gain, 0, 100),
        debt_deb=max(0, new_deb),
        protective_bonus_bp=0,
        rip=state.rip,
        or1_orientation=clamp_float(state.or1_orientation + 0.06 * sleep_factor, 0, 1),
        ri4=new_ri4,
        macro=state.macro,
        cooldown_remaining=max(0, state.cooldown_remaining - (1 if sleep_factor >= 0.65 else 0)),
        floor1_active=state.floor1_active and not (state.stress_str < 70 and state.position_pos > 40 and new_deb <= 1),
        floor1_reason=state.floor1_reason,
        hidden_cost=clamp_int(state.hidden_cost - hidden_drop, 0, 100),
    ).normalized()
    after.macro = choose_macro_by_state(after)
    return StateTransitionLog(
        label="sleep_recovery",
        state_before=before,
        state_after=after,
        deltas={
            "STR": after.stress_str - before.stress_str,
            "POS": after.position_pos - before.position_pos,
            "DEB": after.debt_deb - before.debt_deb,
            "hidden_cost": after.hidden_cost - before.hidden_cost,
            "cooldown": after.cooldown_remaining - before.cooldown_remaining,
        },
        reasons=("recupero notturno prudenziale", "floor1/cooldown limitano recuperi troppo ottimistici"),
    )


def day_plan_from_dict(data: Mapping[str, Any]) -> DayPlan:
    scenes = [scene_from_dict(s) for s in data.get("scenes", [])]
    sleep_data = data.get("sleep_after") or data.get("sleep")
    sleep = None
    if isinstance(sleep_data, Mapping):
        sleep = SleepRecoveryProfile(
            hours=clamp_float(sleep_data.get("hours", sleep_data.get("sleep_hours", 7.0)), 0.0, 14.0),
            quality=clamp_float(sleep_data.get("quality", sleep_data.get("sleep_quality", 0.6)), 0.0, 1.0),
            continuity=clamp_float(sleep_data.get("continuity", 0.6), 0.0, 1.0),
            real_rest=parse_bool(sleep_data.get("real_rest", True), True),
            notes=str(sleep_data.get("notes", "")),
        ).normalized()
    return DayPlan(
        day_id=str(data.get("day_id", "day_1")),
        title=str(data.get("title", "Giornata simulata")),
        scenes=scenes,
        sleep_after=sleep,
        notes=str(data.get("notes", "")),
    )


def build_long_report_from_history(history: Sequence[Dict[str, Any]], current_state: SystemState) -> Dict[str, Any]:
    state = current_state.normalized()
    warnings: List[str] = []
    if state.stress_str >= 70:
        warnings.append("STR alta: la traiettoria richiede recupero reale e riduzione del carico.")
    if state.position_pos <= 40:
        warnings.append("POS fragile: l'assetto operativo/mentale/corporeo è compromesso.")
    if state.debt_deb >= 1:
        warnings.append("DEB attivo: possibile perseverazione senza cambio strategia.")
    if state.floor1_active:
        warnings.append("floor1 attivo: non aspettarsi recupero immediato con una singola pausa.")
    if state.hidden_cost >= 55:
        warnings.append("Costo nascosto alto: attenzione a successo tecnico ma danno umano.")
    return {
        "state": to_plain_data(state),
        "history_length": len(history),
        "macro": state.macro.value,
        "risk": classify_risk(state).value,
        "warnings": warnings,
        "lettura": "Report lungo orientativo: descrive traiettoria e costo, non diagnosi clinica.",
    }


# ----------------------------------------------------------------------------
# Manifest v3 e facciata applicativa estesa
# ----------------------------------------------------------------------------


def MODEL_MANIFEST_V3() -> Dict[str, Any]:
    base = MODEL_MANIFEST_V2()
    base.update({
        "version": "3.1-definitiva-microactiondamping-chatgpt-gemini-scenario-temporal",
        "type": "core applicativo, non test suite",
        "new_layers": [
            "InitialCalibrationEngine",
            "ScenarioIntelligenceLayer",
            "FamilySensitivityProfile",
            "SubFamilySpec",
            "RiskOverlay",
            "SafetyStopPolicy",
            "ScenarioBlueprint",
            "TemporalEvolutionEngine",
            "DynamicLifeState",
            "LongReportBuilder",
            "MicroActionDamping",
            "STR baseline / delta STR scena",
        ],
        "new_commands": [
            "v3_manifest",
            "initial_questionnaire",
            "initialize_profile",
            "build_blueprint",
            "detect_overlays",
            "safety_check",
            "family_sensitivity",
            "subfamilies",
            "scene_templates",
            "node_templates",
            "run_day",
            "apply_sleep_recovery",
            "dynamic_state",
            "long_report",
        ],
        "hard_boundary": "La formula madre resta invariata; MicroActionDamping agisce solo sullo state updater post-nodo.",
    })
    return base



def compact_scene_result(result: SceneResult) -> Dict[str, Any]:
    """Riassunto compatto di SceneResult per loop API lunghi."""
    return {
        "scene_id": result.scene_id,
        "title": result.title,
        "family_code": result.family_code,
        "node_count": len(result.node_results),
        "outcome": result.scene_outcome.value,
        "risk": result.risk_level.value,
        "state_after": to_plain_data(result.final_state),
        "warnings": list(result.report.get("avvisi", []))[:6],
    }


def compact_day_result(result: DayResult) -> Dict[str, Any]:
    """Riassunto compatto di DayResult per loop API lunghi e prevenzione timeout."""
    return {
        "day_id": result.day_id,
        "title": result.title,
        "scene_count": len(result.scene_results),
        "state_before": to_plain_data(result.state_before),
        "state_after": to_plain_data(result.state_after),
        "recovery_applied": result.recovery_log is not None,
        "risk": result.report.get("risk") or classify_risk(result.state_after).value,
        "macro": result.report.get("macro") or result.state_after.macro.value,
        "warnings": list(result.report.get("warnings", []))[:8],
    }


def compact_state_report(state: SystemState) -> Dict[str, Any]:
    """Report minimale O(1), senza scansione della history, per modalità bulk/timeout-safe."""
    state = state.normalized()
    warnings: List[str] = []
    if state.stress_str >= 70:
        warnings.append("STR alta: serve recupero reale e riduzione del carico.")
    if state.position_pos <= 40:
        warnings.append("POS fragile: assetto operativo/corporeo/relazionale compromesso.")
    if state.debt_deb >= 1:
        warnings.append("DEB attivo: possibile perseverazione senza cambio strategia.")
    if state.floor1_active:
        warnings.append("floor1 attivo: recupero non immediato.")
    if state.hidden_cost >= 55:
        warnings.append("Costo nascosto alto: attenzione al successo tecnico ma dannoso.")
    return {
        "state": to_plain_data(state),
        "macro": state.macro.value,
        "risk": classify_risk(state).value,
        "warnings": warnings,
        "lettura": "Report compatto timeout-safe: orientativo, non clinico.",
    }


def run_scene_compact_core(scene: SceneInput, *, current_state: SystemState, rng: Random, config: EngineConfig = DEFAULT_CONFIG, max_node_samples: int = 8) -> Tuple[Dict[str, Any], SystemState]:
    """Esecuzione compatta di una scena per bulk/timeout.

    Usa la stessa formula madre e le stesse funzioni canoniche di outcome/state update,
    ma non costruisce NodeResult/SceneResult completi, report annidati, warning estesi o levers.
    È quindi adatta a migliaia di iterazioni nel motore temporale senza timeout.
    """
    initial_state = current_state.normalized()
    if not scene.nodes:
        summary = {
            "scene_id": scene.scene_id,
            "title": scene.title,
            "family_code": scene.family_code,
            "node_count": 0,
            "outcome": OutcomeKind.FALLIMENTO_TECNICO.value,
            "risk": classify_risk(initial_state).value,
            "state_after": to_plain_data(initial_state),
            "warnings": ["Scena senza nodi."],
            "nodes": [],
        }
        return summary, initial_state

    outcomes: List[OutcomeKind] = []
    node_samples: List[Dict[str, Any]] = []
    state = initial_state
    for idx, node in enumerate(scene.nodes, start=1):
        node_with_state = apply_state_to_node(node, state)
        pn = calculate_pn(node_with_state, config)
        actual_roll = clamp_int(rng.randint(1, 100), 1, 100)
        success_before_field = actual_roll <= pn
        raw_margin = pn - actual_roll if success_before_field else actual_roll - pn
        field_margin = calculate_field_margin(node_with_state.field_response)
        net_margin = raw_margin - field_margin if success_before_field else -raw_margin - field_margin
        outcome = classify_node_outcome(node_with_state, pn, actual_roll, success_before_field, net_margin)
        hidden_cost_delta = estimate_hidden_cost_delta(node_with_state, outcome, net_margin)
        state_after = update_state_after_node(node_with_state, outcome, net_margin, hidden_cost_delta, config)
        outcomes.append(outcome)
        if len(node_samples) < max_node_samples:
            node_samples.append({
                "node_id": node_with_state.node_id,
                "description": node_with_state.description,
                "Pn": pn,
                "roll": actual_roll,
                "MSnet": net_margin,
                "outcome": outcome.value,
                "risk": classify_risk(state_after, outcome).value,
                "micro_action_v3_1": is_micro_action(node_with_state),
                "hidden_cost_delta": hidden_cost_delta,
            })
        state = state_after

    scene_outcome = classify_aggregate_outcome(outcomes, state)
    risk = classify_risk(state, scene_outcome)
    summary = {
        "scene_id": scene.scene_id,
        "title": scene.title,
        "family_code": scene.family_code,
        "node_count": len(scene.nodes),
        "outcome": scene_outcome.value,
        "risk": risk.value,
        "state_after": to_plain_data(state),
        "nodes": node_samples,
        "nodes_truncated": max(0, len(scene.nodes) - len(node_samples)),
    }
    return summary, state

class SimulatorAppCoreV3(SimulatorAppCore):
    """Core v3 orientato a uso ChatGPT/Gemini e futura app.

    Estende il core v2 senza rimuovere i comandi precedenti.
    """

    def __init__(self, *, seed: Optional[int] = None, config: EngineConfig = DEFAULT_CONFIG, session_id: str = "default") -> None:
        super().__init__(seed=seed, config=config, session_id=session_id)
        self.dynamic = DynamicLifeState(current_state=self.memory.current_state)

    def initial_questionnaire(self, mode: Union[str, QuestionnaireMode] = QuestionnaireMode.RAPIDA, *, description: str = "") -> List[Dict[str, Any]]:
        blueprint = build_scenario_blueprint(description, mode=mode) if description else None
        family_codes = [f["code"] for f in (blueprint.families if blueprint else [])]
        overlays = [safe_enum(OverlayKind, o.get("kind"), OverlayKind.FATICA) for o in (blueprint.overlays if blueprint else [])]
        overlay_specs = [RISK_OVERLAY_CATALOG[o] for o in overlays if o in RISK_OVERLAY_CATALOG]
        return [to_plain_data(q) for q in build_v3_questionnaire(mode, description=description, family_codes=family_codes, overlays=overlay_specs)]

    def initialize_profile(self, answers: Mapping[str, Any], *, mode: Union[str, QuestionnaireMode] = QuestionnaireMode.RAPIDA, description: str = "") -> Dict[str, Any]:
        profile = initialize_profile_from_answers(answers, mode=mode, description=description)
        self.dynamic.profile = profile
        self.dynamic.current_state = profile.baseline_state
        self.memory.current_state = profile.baseline_state
        self.dynamic.history.append({"kind": "initialization", "profile": to_plain_data(profile)})
        self.dynamic.history_total_count += 1
        _trim_history_in_place(self.dynamic.history)
        return {"profile": to_plain_data(profile), "dynamic_state": self.dynamic.snapshot(), "session": self.memory.snapshot()}

    def build_blueprint(self, description: str, *, level: Optional[Union[str, TemporalLevel]] = None, mode: Union[str, QuestionnaireMode] = QuestionnaireMode.RAPIDA) -> Dict[str, Any]:
        return build_scenario_blueprint(description, level=level, mode=mode).to_dict()

    def apply_sleep_recovery_current(self, sleep_payload: Mapping[str, Any]) -> Dict[str, Any]:
        if not isinstance(sleep_payload, Mapping):
            return {"ok": False, "type": "sleep_recovery", "error": "sleep deve essere un oggetto/dizionario.", "received_type": type(sleep_payload).__name__, "dynamic_state": self.dynamic.snapshot(), "session": self.memory.snapshot()}
        sleep = SleepRecoveryProfile(
            hours=clamp_float(sleep_payload.get("hours", sleep_payload.get("sleep_hours", 7.0)), 0.0, 14.0),
            quality=clamp_float(sleep_payload.get("quality", sleep_payload.get("sleep_quality", 0.6)), 0.0, 1.0),
            continuity=clamp_float(sleep_payload.get("continuity", 0.6), 0.0, 1.0),
            real_rest=parse_bool(sleep_payload.get("real_rest", True), True),
            notes=str(sleep_payload.get("notes", "")),
        ).normalized()
        log = apply_sleep_recovery(self.dynamic.current_state, sleep, self.config)
        self.dynamic.current_state = log.state_after
        self.memory.current_state = log.state_after
        self.dynamic.history.append({"kind": "sleep_recovery", "log": to_plain_data(log), "sleep": to_plain_data(sleep)})
        self.dynamic.history_total_count += 1
        _trim_history_in_place(self.dynamic.history)
        return {"sleep": to_plain_data(sleep), "transition": to_plain_data(log), "dynamic_state": self.dynamic.snapshot(), "session": self.memory.snapshot()}

    def run_day(self, day: DayPlan) -> DayResult:
        state_before = self.dynamic.current_state.normalized()
        current_state = state_before
        scene_results: List[SceneResult] = []
        for idx, scene in enumerate(day.scenes, start=1):
            patched_nodes = [apply_state_to_node(n, current_state if n_idx == 0 else n.state_before) for n_idx, n in enumerate(scene.nodes)]
            patched_scene = SceneInput(scene.scene_id or f"{day.day_id}_scene_{idx}", scene.title, patched_nodes, scene.family_code, scene.notes)
            result = self.run_scene(patched_scene)
            scene_results.append(result)
            current_state = partial_recovery_between_scenes(result.final_state, self.config)
        recovery_log = None
        if day.sleep_after:
            recovery_log = apply_sleep_recovery(current_state, day.sleep_after, self.config)
            current_state = recovery_log.state_after
        current_state.macro = choose_macro_by_state(current_state)
        self.dynamic.current_state = current_state
        self.memory.current_state = current_state
        self.dynamic.day_index += 1
        report = build_long_report_from_history(self.dynamic.history, current_state)
        report.update({
            "day_id": day.day_id,
            "title": day.title,
            "scene_count": len(scene_results),
            "state_before": to_plain_data(state_before),
            "state_after": to_plain_data(current_state),
            "recovery_applied": recovery_log is not None,
        })
        day_result = DayResult(day.day_id, day.title, scene_results, state_before, current_state, recovery_log, report)
        # Conserviamo una traccia compatta, non l'intero DayResult con report annidati:
        # la serializzazione completa ripetuta può crescere in modo quadratico e causare
        # timeout nei test lunghi/API loop. Il DayResult completo resta restituito al chiamante.
        self.dynamic.history.append({
            "kind": "day",
            "day_id": day.day_id,
            "title": day.title,
            "scene_count": len(scene_results),
            "state_after": to_plain_data(current_state),
            "risk": classify_risk(current_state).value,
            "recovery_applied": recovery_log is not None,
        })
        self.dynamic.history_total_count += 1
        _trim_history_in_place(self.dynamic.history)
        return day_result

    def run_day_compact(self, day: DayPlan) -> Dict[str, Any]:
        """Esegue una giornata in modalità timeout-safe.

        Differenze rispetto a run_day():
        - non salva SceneResult completi nella memoria di sessione;
        - non costruisce DayResult completo con report annidati;
        - restituisce solo sommario compatto, stato finale e campioni essenziali;
        - mantiene invariati formula madre, K/Pd dopo P e state updater.
        """
        state_before = self.dynamic.current_state.normalized()
        current_state = state_before
        scene_summaries: List[Dict[str, Any]] = []
        for idx, scene in enumerate(day.scenes, start=1):
            patched_nodes = [apply_state_to_node(n, current_state if n_idx == 0 else n.state_before) for n_idx, n in enumerate(scene.nodes)]
            patched_scene = SceneInput(scene.scene_id or f"{day.day_id}_scene_{idx}", scene.title, patched_nodes, scene.family_code, scene.notes)
            # Motore compatto: stessa formula/stato, niente report annidati o NodeResult completi.
            scene_summary, scene_final_state = run_scene_compact_core(patched_scene, current_state=current_state, rng=self.rng, config=self.config)
            scene_summaries.append(scene_summary)
            current_state = partial_recovery_between_scenes(scene_final_state, self.config)
        recovery_summary = None
        if day.sleep_after:
            recovery_log = apply_sleep_recovery(current_state, day.sleep_after, self.config)
            current_state = recovery_log.state_after
            recovery_summary = {
                "state_before": to_plain_data(recovery_log.state_before),
                "state_after": to_plain_data(recovery_log.state_after),
                "deltas": to_plain_data(recovery_log.deltas),
                "reasons": list(recovery_log.reasons)[:6],
            }
        current_state.macro = choose_macro_by_state(current_state)
        self.dynamic.current_state = current_state.normalized()
        self.memory.current_state = self.dynamic.current_state
        self.dynamic.day_index += 1
        report = compact_state_report(self.dynamic.current_state)
        result = {
            "day_id": day.day_id,
            "title": day.title,
            "scene_count": len(scene_summaries),
            "state_before": to_plain_data(state_before),
            "state_after": to_plain_data(self.dynamic.current_state),
            "recovery_applied": recovery_summary is not None,
            "recovery": recovery_summary,
            "risk": report["risk"],
            "macro": report["macro"],
            "warnings": report["warnings"],
            "scenes": scene_summaries[:20],
            "scenes_truncated": max(0, len(scene_summaries) - 20),
        }
        self.dynamic.history.append({
            "kind": "day_compact",
            "day_id": day.day_id,
            "title": day.title,
            "scene_count": len(scene_summaries),
            "state_after": to_plain_data(self.dynamic.current_state),
            "risk": report["risk"],
            "recovery_applied": recovery_summary is not None,
        })
        self.dynamic.history_total_count += 1
        _trim_history_in_place(self.dynamic.history)
        self.memory.total_events += 1
        return {"result": result, "report": report, "dynamic_state": self.dynamic.snapshot(), "session": self.memory.snapshot()}

    def _advance_scene_state_only(self, scene: SceneInput, current_state: SystemState) -> Tuple[SystemState, OutcomeKind]:
        """Avanza una scena senza costruire report: percorso bulk ultra-compatto."""
        state = current_state.normalized()
        if not scene.nodes:
            return state, OutcomeKind.FALLIMENTO_TECNICO
        outcomes: List[OutcomeKind] = []
        for node in scene.nodes:
            node_with_state = apply_state_to_node(node, state)
            pn = calculate_pn(node_with_state, self.config)
            actual_roll = clamp_int(self.rng.randint(1, 100), 1, 100)
            success_before_field = actual_roll <= pn
            raw_margin = pn - actual_roll if success_before_field else actual_roll - pn
            field_margin = calculate_field_margin(node_with_state.field_response)
            net_margin = raw_margin - field_margin if success_before_field else -raw_margin - field_margin
            outcome = classify_node_outcome(node_with_state, pn, actual_roll, success_before_field, net_margin)
            hidden_cost_delta = estimate_hidden_cost_delta(node_with_state, outcome, net_margin)
            state = update_state_after_node(node_with_state, outcome, net_margin, hidden_cost_delta, self.config)
            outcomes.append(outcome)
        return state, classify_aggregate_outcome(outcomes, state)

    def _advance_day_state_only(self, day: DayPlan) -> Tuple[SystemState, bool, OutcomeKind]:
        """Avanza una giornata in modo ultra-compatto per bulk massivi.

        Non produce DayResult, non serializza report, non salva history per ogni iterazione.
        Mantiene però formula madre, K/Pd, outcome e state updater canonici.
        """
        current_state = self.dynamic.current_state.normalized()
        last_outcome = OutcomeKind.SUCCESSO_PULITO
        for idx, scene in enumerate(day.scenes, start=1):
            patched_nodes = [apply_state_to_node(n, current_state if n_idx == 0 else n.state_before) for n_idx, n in enumerate(scene.nodes)]
            patched_scene = SceneInput(scene.scene_id or f"{day.day_id}_scene_{idx}", scene.title, patched_nodes, scene.family_code, scene.notes)
            scene_state, scene_outcome = self._advance_scene_state_only(patched_scene, current_state)
            last_outcome = scene_outcome
            current_state = partial_recovery_between_scenes(scene_state, self.config)
        recovery_applied = False
        if day.sleep_after:
            recovery_log = apply_sleep_recovery(current_state, day.sleep_after, self.config)
            current_state = recovery_log.state_after
            recovery_applied = True
        current_state.macro = choose_macro_by_state(current_state)
        self.dynamic.current_state = current_state.normalized()
        self.memory.current_state = self.dynamic.current_state
        self.dynamic.day_index += 1
        self.dynamic.history_total_count += 1
        self.memory.total_events += 1
        return self.dynamic.current_state, recovery_applied, last_outcome

    def bulk_run_days(self, day_payloads: Sequence[Mapping[str, Any]], *, repeat: int = 1, sample_every: int = 0, max_iterations: int = BULK_RECOMMENDED_CHUNK_SIZE) -> Dict[str, Any]:
        """Esegue molte giornate in modalità bulk ultra-compatta e timeout-safe.

        Per evitare timeout in UI/API/test harness, questa funzione ha un limite duro
        per singola chiamata. Per simulazioni enormi si ripete la chiamata a chunk
        successivi conservando lo stato dinamico dell'app.
        """
        repeat = clamp_int(repeat, 0, BULK_MAX_ITERATIONS_PER_CALL * 1000)
        max_iterations = clamp_int(max_iterations, 1, BULK_MAX_ITERATIONS_PER_CALL)
        if repeat < 1:
            return {"ok": False, "type": "validation_error", "error": "repeat deve essere >= 1.", "recommended_chunk_size": BULK_RECOMMENDED_CHUNK_SIZE}
        if repeat > max_iterations:
            return {
                "ok": False,
                "type": "validation_error",
                "error": f"repeat supera il limite timeout-safe per chiamata: {max_iterations}.",
                "repeat": repeat,
                "max_iterations": max_iterations,
                "hard_cap_per_call": BULK_MAX_ITERATIONS_PER_CALL,
                "recommended_chunk_size": BULK_RECOMMENDED_CHUNK_SIZE,
                "how_to_continue": "Esegui più chiamate bulk_run_days consecutive da massimo recommended_chunk_size iterazioni."
            }
        plans = [day_plan_from_dict(d) for d in day_payloads if isinstance(d, Mapping)]
        if not plans:
            return {"ok": False, "type": "validation_error", "error": "bulk_run_days richiede almeno un day valido."}
        samples: List[Dict[str, Any]] = []
        samples_truncated = 0
        last_state = self.dynamic.current_state.normalized()
        last_recovery = False
        last_outcome = OutcomeKind.SUCCESSO_PULITO
        for i in range(repeat):
            plan = plans[i % len(plans)]
            last_state, last_recovery, last_outcome = self._advance_day_state_only(plan)
            if sample_every and (i == 0 or (i + 1) % sample_every == 0 or i == repeat - 1):
                if len(samples) < MAX_BULK_SAMPLES:
                    samples.append({
                        "iteration": i + 1,
                        "state_after": to_plain_data(last_state),
                        "risk": classify_risk(last_state, last_outcome).value,
                        "macro": last_state.macro.value,
                        "history_retained": len(self.dynamic.history),
                        "history_total": self.dynamic.history_total_count,
                    })
                else:
                    samples_truncated += 1
        risk = classify_risk(last_state, last_outcome)
        last_result = {
            "state_after": to_plain_data(last_state),
            "risk": risk.value,
            "macro": last_state.macro.value,
            "recovery_applied": last_recovery,
            "outcome": last_outcome.value,
        }
        self.dynamic.history.append({
            "kind": "bulk_run_days",
            "iterations": repeat,
            "day_templates": len(plans),
            "state_after": to_plain_data(last_state),
            "risk": risk.value,
        })
        _trim_history_in_place(self.dynamic.history)
        return {
            "ok": True,
            "type": "bulk_run_days",
            "iterations": repeat,
            "day_templates": len(plans),
            "last_result": last_result,
            "samples": samples,
            "samples_truncated": samples_truncated,
            "max_bulk_samples": MAX_BULK_SAMPLES,
            "dynamic_state": self.dynamic.snapshot(),
            "session": self.memory.snapshot(),
            "timeout_safe": True,
            "bulk_mode": "ultra_compact_state_only",
            "recommended_chunk_size": BULK_RECOMMENDED_CHUNK_SIZE,
            "hard_cap_per_call": BULK_MAX_ITERATIONS_PER_CALL,
        }

    def long_report(self) -> Dict[str, Any]:
        return build_long_report_from_history(self.dynamic.history, self.dynamic.current_state)

    def run_payload(self, payload: Mapping[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, Mapping):
            return {"ok": False, "type": "validation_error", "error": "Payload non valido: deve essere un oggetto/dizionario.", "received_type": type(payload).__name__, "session": self.memory.snapshot(), "dynamic_state": self.dynamic.snapshot()}
        command = str(payload.get("command", "")).lower().strip()
        if command in {"v3_manifest", "manifest_v3"}:
            return {"ok": True, "type": "v3_manifest", "manifest": MODEL_MANIFEST_V3(), "session": self.memory.snapshot(), "dynamic_state": self.dynamic.snapshot()}
        if command in {"initial_questionnaire", "questionnaire"}:
            return {"ok": True, "type": "initial_questionnaire", "questions": self.initial_questionnaire(payload.get("mode", QuestionnaireMode.RAPIDA), description=str(payload.get("description", ""))), "session": self.memory.snapshot()}
        if command in {"initialize_profile", "init_profile", "initial_calibration"}:
            answers = payload.get("answers", {})
            if not isinstance(answers, Mapping):
                return {"ok": False, "error": "answers deve essere un oggetto/dizionario."}
            return {"ok": True, "type": "initialize_profile", **self.initialize_profile(answers, mode=payload.get("mode", QuestionnaireMode.RAPIDA), description=str(payload.get("description", "")))}
        if command in {"build_blueprint", "blueprint", "scenario_blueprint"}:
            return {"ok": True, "type": "scenario_blueprint", "blueprint": self.build_blueprint(str(payload.get("description", "")), level=payload.get("level"), mode=payload.get("mode", QuestionnaireMode.RAPIDA)), "session": self.memory.snapshot()}
        if command in {"detect_overlays", "overlays"}:
            overlays = detect_risk_overlays(str(payload.get("description", "")))
            return {"ok": True, "type": "overlays", "overlays": [to_plain_data(o) for o in overlays]}
        if command in {"safety_check", "safety"}:
            desc = str(payload.get("description", ""))
            overlays = detect_risk_overlays(desc)
            return {"ok": True, "type": "safety_check", "safety": [to_plain_data(p) for p in detect_safety_stops(desc, overlays)], "overlays": [to_plain_data(o) for o in overlays]}
        if command in {"family_sensitivity", "sensitivity"}:
            code = str(payload.get("family_code", "")).upper()
            if code:
                return {"ok": True, "type": "family_sensitivity", "family_code": code, "profile": to_plain_data(FAMILY_SENSITIVITY_CATALOG.get(code))}
            return {"ok": True, "type": "family_sensitivity", "profiles": to_plain_data(FAMILY_SENSITIVITY_CATALOG)}
        if command == "subfamilies":
            family_code = str(payload.get("family_code", "")).upper()
            if family_code:
                data = [to_plain_data(s) for s in SUBFAMILY_CATALOG if s.parent_family == family_code]
            else:
                data = [to_plain_data(s) for s in SUBFAMILY_CATALOG]
            return {"ok": True, "type": "subfamilies", "subfamilies": data}
        if command == "scene_templates":
            return {"ok": True, "type": "scene_templates", "scene_templates": [to_plain_data(s) for s in SCENE_TEMPLATES]}
        if command == "node_templates":
            return {"ok": True, "type": "node_templates", "node_templates": [to_plain_data(n) for n in NODE_TEMPLATES]}
        if command in {"apply_sleep_recovery", "sleep_recovery"}:
            recovery_result = self.apply_sleep_recovery_current(payload.get("sleep", payload))
            if recovery_result.get("ok") is False:
                return recovery_result
            return {"ok": True, "type": "sleep_recovery", **recovery_result}
        if command in {"run_day", "day"}:
            day_payload = payload.get("day", payload)
            if not isinstance(day_payload, Mapping):
                return {"ok": False, "type": "validation_error", "error": "day deve essere un oggetto/dizionario.", "received_type": type(day_payload).__name__, "session": self.memory.snapshot(), "dynamic_state": self.dynamic.snapshot()}
            day_plan = day_plan_from_dict(day_payload)
            if not day_plan.scenes and day_plan.sleep_after is None:
                return {"ok": False, "type": "validation_error", "error": "day/run_day richiede almeno una scena o un recupero sleep_after.", "session": self.memory.snapshot(), "dynamic_state": self.dynamic.snapshot()}
            compact_mode = parse_bool(payload.get("compact", payload.get("timeout_safe", False)), False)
            include_report_text = parse_bool(payload.get("include_report_text", not compact_mode), not compact_mode)
            include_full = parse_bool(payload.get("include_full_result", False), False)
            if compact_mode and not include_full:
                compact = self.run_day_compact(day_plan)
                response = {"ok": True, "type": "day", **compact, "full_result_omitted_by_default": True, "compact_mode": True}
                if include_report_text:
                    response["report_text"] = build_user_readable_report(compact.get("report", {}))
                return response
            result = self.run_day(day_plan)
            response = {
                "ok": True,
                "type": "day",
                "result": compact_day_result(result),
                "dynamic_state": self.dynamic.snapshot(),
                "session": self.memory.snapshot(),
                "full_result_omitted_by_default": not include_full,
                "compact_mode": False,
            }
            if include_report_text:
                response["report_text"] = build_user_readable_report(result.report)
            if include_full:
                response["full_result"] = to_plain_data(result)
                response["full_result_omitted_by_default"] = False
            return response
        if command in {"run_day_compact", "day_compact"}:
            day_payload = payload.get("day", payload)
            if not isinstance(day_payload, Mapping):
                return {"ok": False, "type": "validation_error", "error": "day deve essere un oggetto/dizionario.", "received_type": type(day_payload).__name__, "session": self.memory.snapshot(), "dynamic_state": self.dynamic.snapshot()}
            day_plan = day_plan_from_dict(day_payload)
            if not day_plan.scenes and day_plan.sleep_after is None:
                return {"ok": False, "type": "validation_error", "error": "day_compact richiede almeno una scena o un recupero sleep_after.", "session": self.memory.snapshot(), "dynamic_state": self.dynamic.snapshot()}
            return {"ok": True, "type": "day_compact", **self.run_day_compact(day_plan)}
        if command in {"bulk_run_days", "bulk_days", "run_days_bulk"}:
            repeat = int(round(_safe_number(payload.get("repeat", payload.get("iterations", 1)), 1)))
            max_iterations = clamp_int(payload.get("max_iterations", BULK_RECOMMENDED_CHUNK_SIZE), 1, BULK_MAX_ITERATIONS_PER_CALL)
            sample_every = clamp_int(payload.get("sample_every", 0), 0, 1000000)
            if isinstance(payload.get("days"), Sequence) and not isinstance(payload.get("days"), (str, bytes, bytearray)):
                days_payload = [d for d in payload.get("days", []) if isinstance(d, Mapping)]
            else:
                day_payload = payload.get("day", payload)
                days_payload = [day_payload] if isinstance(day_payload, Mapping) else []
            return self.bulk_run_days(days_payload, repeat=repeat, sample_every=sample_every, max_iterations=max_iterations)
        if command in {"dynamic_state", "life_state"}:
            return {"ok": True, "type": "dynamic_state", "dynamic_state": self.dynamic.snapshot(), "session": self.memory.snapshot()}
        if command in {"long_report", "trajectory_report"}:
            return {"ok": True, "type": "long_report", "report": self.long_report(), "session": self.memory.snapshot()}
        if command == "demo_v3":
            return {"ok": True, "type": "demo_v3", "demo": demo_v3()}
        # Fallback: conserva TUTTI i comandi v2.
        return super().run_payload(payload)


def demo_v3() -> Dict[str, Any]:
    app = SimulatorAppCoreV3(seed=42, session_id="demo_v3")
    desc = "Domani ho un colloquio, ho dormito poco, devo guidare e sono agitato."
    blueprint = app.run_payload({"command": "build_blueprint", "description": desc, "mode": "standard"})
    profile = app.run_payload({
        "command": "initialize_profile",
        "description": desc,
        "mode": "standard",
        "answers": {
            "energy": 5,
            "sleep_hours": 5,
            "sleep_quality": 4,
            "stress": 6,
            "pos": 6,
            "pain": 0,
            "instability": 0,
            "load": 6,
            "support_score": 2,
            "real_recovery": False,
            "human_profile": "competente_ma_stanco",
        },
    })
    sleep = app.run_payload({"command": "apply_sleep_recovery", "sleep": {"hours": 7, "quality": 0.7, "continuity": 0.7, "real_rest": True}})
    return {
        "manifest_version": MODEL_MANIFEST_V3()["version"],
        "blueprint_status": blueprint["blueprint"]["status"],
        "suggested_level": blueprint["blueprint"]["suggested_level"],
        "families": [f["code"] for f in blueprint["blueprint"]["families"][:5]],
        "overlays": [o["kind"] for o in blueprint["blueprint"]["overlays"]],
        "profile_baseline": profile["profile"]["baseline_state"],
        "after_sleep": sleep["transition"]["state_after"],
        "long_report": app.long_report(),
    }



if __name__ == "__main__":
    print(json.dumps(demo_v3(), ensure_ascii=False, indent=2))
