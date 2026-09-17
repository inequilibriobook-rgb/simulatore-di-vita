/* =============================================================================
   SIMULATORE 3.0 — Banca domande e territori
   =============================================================================
   LE OTTANTA DOMANDE non sono state inventate: sono estratte una per una dal
   report ufficiale della run da 500 nodi (Q001-Q080), con l'area e gli effetti
   sulle variabili così come sono documentati.

   ⚠️  Il campo `riferimento` riporta la risposta data in quella run e gli
   effetti che ne sono derivati. È il punto di taratura documentato, non una
   regola generale: la scala di risposta e l'interpolazione fra i valori sono
   una scelta di questa implementazione.

   I SETTE TERRITORI vengono dal Capitolo 19 del libro pubblicato. I codici V
   restano come dettaglio tecnico e non compaiono nell'interfaccia: il libro
   li nomina una volta sola, e per metterne in guardia.
   ========================================================================== */

window.Territori = [
 {
  "id": "cura_corpo",
  "nome": "Cura personale e corpo",
  "descrizione": "Il corpo, il sonno, il dolore, i gesti di cura di sé.",
  "famiglie": [
   "V001",
   "V002",
   "V003",
   "V005",
   "V006",
   "V007"
  ]
 },
 {
  "id": "casa",
  "nome": "Casa e oggetti",
  "descrizione": "Lo spazio dove si vive, gli oggetti, la routine domestica.",
  "famiglie": [
   "V008",
   "V013",
   "V014",
   "V015"
  ]
 },
 {
  "id": "mobilita",
  "nome": "Mobilità e strada",
  "descrizione": "Uscire, spostarsi, guidare, il traffico e gli imprevisti fuori casa.",
  "famiglie": [
   "V016",
   "V017",
   "V018"
  ]
 },
 {
  "id": "digitale",
  "nome": "Digitale e burocrazia",
  "descrizione": "Pratiche online, codici, moduli, sportelli, attese.",
  "famiglie": [
   "V022",
   "V023",
   "V024",
   "V025"
  ]
 },
 {
  "id": "lavoro_studio",
  "nome": "Lavoro e studio",
  "descrizione": "Compiti, scadenze, riunioni, esami, carico cognitivo.",
  "famiglie": [
   "V029",
   "V030",
   "V033"
  ]
 },
 {
  "id": "relazione",
  "nome": "Relazione, coppia, famiglia",
  "descrizione": "Dialoghi difficili, conflitti, richieste, figli.",
  "famiglie": [
   "V035",
   "V036",
   "V037"
  ]
 },
 {
  "id": "cura_fragilita",
  "nome": "Cura e fragilità",
  "descrizione": "Assistere una persona fragile, il carico di chi si prende cura.",
  "famiglie": [
   "V040"
  ]
 }
];

window.Domande = [
 {
  "id": "Q001",
  "area": "Sonno/energia",
  "territorio": "cura_corpo",
  "livello": "rapida",
  "domanda": "Quante ore ha dormito Marco prima della giornata simulata?",
  "riferimento": {
   "risposta": "6 ore e 30 minuti, sonno leggero ma sufficiente",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 3
    },
    {
     "campo": "V001_E",
     "delta": -1
    },
    {
     "campo": "V002_E",
     "delta": -1
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q002",
  "area": "Sonno/energia",
  "territorio": "cura_corpo",
  "livello": "rapida",
  "domanda": "Come si sveglia di solito nelle mattine lavorative?",
  "riferimento": {
   "risposta": "Confuso per alcuni minuti",
   "effetti": [
    {
     "campo": "V001_P0",
     "delta": -5
    },
    {
     "campo": "V001_I",
     "delta": -3
    },
    {
     "campo": "initial_STR",
     "delta": 3
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q003",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "rapida",
  "domanda": "Marco ha rigidità o dolore lombare al risveglio?",
  "riferimento": {
   "risposta": "Rigidità lieve ma presente",
   "effetti": [
    {
     "campo": "V002_E",
     "delta": -2
    },
    {
     "campo": "V002_M",
     "delta": -1
    },
    {
     "campo": "V006_E",
     "delta": -3
    },
    {
     "campo": "V006_KPD",
     "delta": 3
    },
    {
     "campo": "initial_STR",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q004",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "rapida",
  "domanda": "Quanto è bravo a muoversi lentamente se sente la schiena sensibile?",
  "riferimento": {
   "risposta": "Molto bravo: applica routine corporea automatica",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 7
    },
    {
     "campo": "V006_I",
     "delta": 3
    },
    {
     "campo": "initial_POS",
     "delta": 4
    },
    {
     "campo": "initial_BP",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q005",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "rapida",
  "domanda": "La camera è ordinata e prevedibile?",
  "riferimento": {
   "risposta": "Parzialmente: qualche oggetto fuori posto",
   "effetti": [
    {
     "campo": "V002_M",
     "delta": -1
    },
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q006",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "rapida",
  "domanda": "Il silenzio della casa lo aiuta o lo mette in allerta?",
  "riferimento": {
   "risposta": "Lo mette leggermente in allerta per i figli",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 2
    },
    {
     "campo": "V001_E",
     "delta": -1
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q007",
  "area": "Famiglia/figli",
  "territorio": "relazione",
  "livello": "standard",
  "domanda": "I figli sono ancora addormentati nel primo blocco della mattina?",
  "riferimento": {
   "risposta": "Sì, nessuna interferenza reale nel primo blocco",
   "effetti": [
    {
     "campo": "V001_P0",
     "delta": 2
    },
    {
     "campo": "V002_P0",
     "delta": 2
    },
    {
     "campo": "initial_BP",
     "delta": 1
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q008",
  "area": "Lavoro/pressione",
  "territorio": "lavoro_studio",
  "livello": "standard",
  "domanda": "Marco pensa già al lavoro appena sveglio?",
  "riferimento": {
   "risposta": "Sì, ma resta gestibile",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 3
    },
    {
     "campo": "initial_POS",
     "delta": -1
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q009",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Ha margine temporale rispetto alla routine?",
  "riferimento": {
   "risposta": "È già in ritardo",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 6
    },
    {
     "campo": "V002_P0",
     "delta": -2
    },
    {
     "campo": "V006_KPD",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q010",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Prima di alzarsi, sa fare una micro-pausa di orientamento?",
  "riferimento": {
   "risposta": "Sì, breve e reale",
   "effetti": [
    {
     "campo": "initial_BP",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 3
    },
    {
     "campo": "V001_P0",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q011",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Il respiro lento gli riduce davvero il carico?",
  "riferimento": {
   "risposta": "No, non lo usa davvero",
   "effetti": [
    {
     "campo": "V006_P0",
     "delta": -2
    },
    {
     "campo": "initial_STR",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q012",
  "area": "Profilo cognitivo",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Quanto è capace di distinguere fatica momentanea e stress persistente?",
  "riferimento": {
   "risposta": "Buona consapevolezza",
   "effetti": [
    {
     "campo": "V001_I",
     "delta": 2
    },
    {
     "campo": "V006_I",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 3
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q013",
  "area": "Organizzazione",
  "territorio": "casa",
  "livello": "standard",
  "domanda": "Quanto è preparata la routine della mattina?",
  "riferimento": {
   "risposta": "Abbastanza preparata la sera prima",
   "effetti": [
    {
     "campo": "initial_BP",
     "delta": 2
    },
    {
     "campo": "V001_P0",
     "delta": 1
    },
    {
     "campo": "V002_P0",
     "delta": 1
    },
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q014",
  "area": "Temperamento",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Come reagisce alla prima piccola frizione corporea?",
  "riferimento": {
   "risposta": "Rallenta e controlla",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 3
    },
    {
     "campo": "V006_I",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q015",
  "area": "Supporto/delega",
  "territorio": "relazione",
  "livello": "standard",
  "domanda": "Nel primo blocco mattutino c’è supporto pratico esterno?",
  "riferimento": {
   "risposta": "No, e questo pesa mentalmente",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 3
    },
    {
     "campo": "initial_POS",
     "delta": -1
    }
   ]
  },
  "variante": false
 },
 {
  "id": "Q016",
  "area": "Sonno/energia",
  "territorio": "cura_corpo",
  "livello": "standard",
  "domanda": "Livello di stanchezza appena sveglio? [variante 1]",
  "riferimento": {
   "risposta": "Basso-medio",
   "effetti": [
    {
     "campo": "V001_E",
     "delta": 0
    },
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q017",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "standard",
  "domanda": "Sensibilità ai movimenti di rotazione? [variante 1]",
  "riferimento": {
   "risposta": "Lieve",
   "effetti": [
    {
     "campo": "V002_E",
     "delta": -1
    },
    {
     "campo": "V006_E",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q018",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "standard",
  "domanda": "Letto, appoggio e spazio aiutano il movimento? [variante 1]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_M",
     "delta": 2
    },
    {
     "campo": "V002_P0",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q019",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Pressione dei minuti tra 05:42 e 05:50? [variante 1]",
  "riferimento": {
   "risposta": "Bassa",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q020",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "standard",
  "domanda": "Capacità di micro-rientro dopo una sensazione di rigidità? [variante 1]",
  "riferimento": {
   "risposta": "Buona",
   "effetti": [
    {
     "campo": "V006_P0",
     "delta": 3
    },
    {
     "campo": "V006_I",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q021",
  "area": "Profilo cognitivo",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Quanto usa segnali corporei come informazione, non come allarme? [variante 2]",
  "riferimento": {
   "risposta": "A tratti",
   "effetti": [
    {
     "campo": "V006_I",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q022",
  "area": "Famiglia/figli",
  "territorio": "relazione",
  "livello": "profonda",
  "domanda": "Pensiero anticipatorio sui figli durante il risveglio? [variante 2]",
  "riferimento": {
   "risposta": "Lieve",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q023",
  "area": "Lavoro/pressione",
  "territorio": "lavoro_studio",
  "livello": "profonda",
  "domanda": "Pensiero anticipatorio su email e scadenze? [variante 2]",
  "riferimento": {
   "risposta": "Alto",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 5
    },
    {
     "campo": "initial_POS",
     "delta": -2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q024",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Automatismi di risveglio già consolidati? [variante 2]",
  "riferimento": {
   "risposta": "Parziali",
   "effetti": [
    {
     "campo": "V001_P0",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q025",
  "area": "Temperamento",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Tendenza a iperfunzionare già al mattino? [variante 2]",
  "riferimento": {
   "risposta": "Moderata",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q026",
  "area": "Supporto/delega",
  "territorio": "relazione",
  "livello": "profonda",
  "domanda": "Quanto si sente solo nel carico mattutino complessivo? [variante 2]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 0
    },
    {
     "campo": "initial_POS",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q027",
  "area": "Qualità input",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Quanto sono affidabili le risposte simulate? [variante 2]",
  "riferimento": {
   "risposta": "Alta coerenza interna",
   "effetti": []
  },
  "variante": true
 },
 {
  "id": "Q028",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "profonda",
  "domanda": "Il dolore tende a generare paura del movimento? [variante 2]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 0
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q029",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Marco usa il rallentamento come strategia vera? [variante 2]",
  "riferimento": {
   "risposta": "No",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": -3
    },
    {
     "campo": "initial_STR",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q030",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Rumori domestici nel primo blocco? [variante 2]",
  "riferimento": {
   "risposta": "Minimi",
   "effetti": [
    {
     "campo": "V001_I",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q031",
  "area": "Organizzazione",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Capacità di non anticipare tutta la giornata mentre si alza? [variante 2]",
  "riferimento": {
   "risposta": "Discreta",
   "effetti": [
    {
     "campo": "initial_POS",
     "delta": 2
    },
    {
     "campo": "initial_STR",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q032",
  "area": "Profilo emotivo",
  "territorio": "cura_corpo",
  "livello": "profonda",
  "domanda": "Umore di base appena sveglio? [variante 2]",
  "riferimento": {
   "risposta": "Irritabile",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 4
    },
    {
     "campo": "initial_POS",
     "delta": -3
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q033",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "profonda",
  "domanda": "Quanto incide la rigidità lombare sul P0 dei movimenti? [variante 2]",
  "riferimento": {
   "risposta": "Moderatamente",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": -2
    },
    {
     "campo": "V002_E",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q034",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Quanto si fida della propria sequenza mattutina? [variante 2]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "initial_POS",
     "delta": -3
    },
    {
     "campo": "initial_STR",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q035",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Sa evitare accelerazione inutile nei primi minuti? [variante 2]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 3
    },
    {
     "campo": "V006_P0",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q036",
  "area": "Sonno/energia",
  "territorio": "cura_corpo",
  "livello": "profonda",
  "domanda": "Livello di stanchezza appena sveglio? [variante 2]",
  "riferimento": {
   "risposta": "Basso-medio",
   "effetti": [
    {
     "campo": "V001_E",
     "delta": 0
    },
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q037",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "profonda",
  "domanda": "Sensibilità ai movimenti di rotazione? [variante 2]",
  "riferimento": {
   "risposta": "Lieve",
   "effetti": [
    {
     "campo": "V002_E",
     "delta": -1
    },
    {
     "campo": "V006_E",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q038",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Letto, appoggio e spazio aiutano il movimento? [variante 2]",
  "riferimento": {
   "risposta": "Neutro",
   "effetti": []
  },
  "variante": true
 },
 {
  "id": "Q039",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Pressione dei minuti tra 05:42 e 05:50? [variante 2]",
  "riferimento": {
   "risposta": "Moderata",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q040",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Capacità di micro-rientro dopo una sensazione di rigidità? [variante 2]",
  "riferimento": {
   "risposta": "Bassa",
   "effetti": [
    {
     "campo": "V006_P0",
     "delta": -3
    },
    {
     "campo": "initial_STR",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q041",
  "area": "Profilo cognitivo",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Quanto usa segnali corporei come informazione, non come allarme? [variante 3]",
  "riferimento": {
   "risposta": "A tratti",
   "effetti": [
    {
     "campo": "V006_I",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q042",
  "area": "Famiglia/figli",
  "territorio": "relazione",
  "livello": "profonda",
  "domanda": "Pensiero anticipatorio sui figli durante il risveglio? [variante 3]",
  "riferimento": {
   "risposta": "Lieve",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q043",
  "area": "Lavoro/pressione",
  "territorio": "lavoro_studio",
  "livello": "profonda",
  "domanda": "Pensiero anticipatorio su email e scadenze? [variante 3]",
  "riferimento": {
   "risposta": "Moderato ma contenuto",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 3
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q044",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Automatismi di risveglio già consolidati? [variante 3]",
  "riferimento": {
   "risposta": "Parziali",
   "effetti": [
    {
     "campo": "V001_P0",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q045",
  "area": "Temperamento",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Tendenza a iperfunzionare già al mattino? [variante 3]",
  "riferimento": {
   "risposta": "Bassa",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": -1
    },
    {
     "campo": "initial_POS",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q046",
  "area": "Supporto/delega",
  "territorio": "relazione",
  "livello": "profonda",
  "domanda": "Quanto si sente solo nel carico mattutino complessivo? [variante 3]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 0
    },
    {
     "campo": "initial_POS",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q047",
  "area": "Qualità input",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Quanto sono affidabili le risposte simulate? [variante 3]",
  "riferimento": {
   "risposta": "Alta coerenza interna",
   "effetti": []
  },
  "variante": true
 },
 {
  "id": "Q048",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "profonda",
  "domanda": "Il dolore tende a generare paura del movimento? [variante 3]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 0
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q049",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "profonda",
  "domanda": "Marco usa il rallentamento come strategia vera? [variante 3]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 4
    },
    {
     "campo": "V006_P0",
     "delta": 2
    },
    {
     "campo": "initial_BP",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q050",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "profonda",
  "domanda": "Rumori domestici nel primo blocco? [variante 3]",
  "riferimento": {
   "risposta": "Minimi",
   "effetti": [
    {
     "campo": "V001_I",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q051",
  "area": "Organizzazione",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Capacità di non anticipare tutta la giornata mentre si alza? [variante 3]",
  "riferimento": {
   "risposta": "Media",
   "effetti": []
  },
  "variante": true
 },
 {
  "id": "Q052",
  "area": "Profilo emotivo",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Umore di base appena sveglio? [variante 3]",
  "riferimento": {
   "risposta": "Leggermente teso",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q053",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Quanto incide la rigidità lombare sul P0 dei movimenti? [variante 3]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 0
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q054",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Quanto si fida della propria sequenza mattutina? [variante 3]",
  "riferimento": {
   "risposta": "Abbastanza",
   "effetti": [
    {
     "campo": "initial_POS",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q055",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Sa evitare accelerazione inutile nei primi minuti? [variante 3]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 3
    },
    {
     "campo": "V006_P0",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q056",
  "area": "Sonno/energia",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Livello di stanchezza appena sveglio? [variante 3]",
  "riferimento": {
   "risposta": "Alto",
   "effetti": [
    {
     "campo": "V001_E",
     "delta": -3
    },
    {
     "campo": "V002_E",
     "delta": -3
    },
    {
     "campo": "initial_STR",
     "delta": 5
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q057",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Sensibilità ai movimenti di rotazione? [variante 3]",
  "riferimento": {
   "risposta": "Lieve",
   "effetti": [
    {
     "campo": "V002_E",
     "delta": -1
    },
    {
     "campo": "V006_E",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q058",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Letto, appoggio e spazio aiutano il movimento? [variante 3]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_M",
     "delta": 2
    },
    {
     "campo": "V002_P0",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q059",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Pressione dei minuti tra 05:42 e 05:50? [variante 3]",
  "riferimento": {
   "risposta": "Alta",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 4
    },
    {
     "campo": "V001_E",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q060",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Capacità di micro-rientro dopo una sensazione di rigidità? [variante 3]",
  "riferimento": {
   "risposta": "Buona",
   "effetti": [
    {
     "campo": "V006_P0",
     "delta": 3
    },
    {
     "campo": "V006_I",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q061",
  "area": "Profilo cognitivo",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Quanto usa segnali corporei come informazione, non come allarme? [variante 4]",
  "riferimento": {
   "risposta": "A tratti",
   "effetti": [
    {
     "campo": "V006_I",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q062",
  "area": "Famiglia/figli",
  "territorio": "relazione",
  "livello": "professionale",
  "domanda": "Pensiero anticipatorio sui figli durante il risveglio? [variante 4]",
  "riferimento": {
   "risposta": "Assente",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q063",
  "area": "Lavoro/pressione",
  "territorio": "lavoro_studio",
  "livello": "professionale",
  "domanda": "Pensiero anticipatorio su email e scadenze? [variante 4]",
  "riferimento": {
   "risposta": "Alto",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 5
    },
    {
     "campo": "initial_POS",
     "delta": -2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q064",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Automatismi di risveglio già consolidati? [variante 4]",
  "riferimento": {
   "risposta": "Parziali",
   "effetti": [
    {
     "campo": "V001_P0",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q065",
  "area": "Temperamento",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Tendenza a iperfunzionare già al mattino? [variante 4]",
  "riferimento": {
   "risposta": "Moderata",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 2
    },
    {
     "campo": "initial_POS",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q066",
  "area": "Supporto/delega",
  "territorio": "relazione",
  "livello": "professionale",
  "domanda": "Quanto si sente solo nel carico mattutino complessivo? [variante 4]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 0
    },
    {
     "campo": "initial_POS",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q067",
  "area": "Qualità input",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Quanto sono affidabili le risposte simulate? [variante 4]",
  "riferimento": {
   "risposta": "Alta coerenza interna",
   "effetti": []
  },
  "variante": true
 },
 {
  "id": "Q068",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Il dolore tende a generare paura del movimento? [variante 4]",
  "riferimento": {
   "risposta": "Molto",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": -5
    },
    {
     "campo": "V006_KPD",
     "delta": 4
    },
    {
     "campo": "initial_POS",
     "delta": -2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q069",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Marco usa il rallentamento come strategia vera? [variante 4]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 4
    },
    {
     "campo": "V006_P0",
     "delta": 2
    },
    {
     "campo": "initial_BP",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q070",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Rumori domestici nel primo blocco? [variante 4]",
  "riferimento": {
   "risposta": "Qualche rumore",
   "effetti": [
    {
     "campo": "V001_I",
     "delta": 0
    },
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q071",
  "area": "Organizzazione",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Capacità di non anticipare tutta la giornata mentre si alza? [variante 4]",
  "riferimento": {
   "risposta": "Discreta",
   "effetti": [
    {
     "campo": "initial_POS",
     "delta": 2
    },
    {
     "campo": "initial_STR",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q072",
  "area": "Profilo emotivo",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Umore di base appena sveglio? [variante 4]",
  "riferimento": {
   "risposta": "Neutro-stabile",
   "effetti": [
    {
     "campo": "initial_POS",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q073",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Quanto incide la rigidità lombare sul P0 dei movimenti? [variante 4]",
  "riferimento": {
   "risposta": "Poco",
   "effetti": [
    {
     "campo": "V002_P0",
     "delta": 0
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q074",
  "area": "Routine mattutina",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Quanto si fida della propria sequenza mattutina? [variante 4]",
  "riferimento": {
   "risposta": "Abbastanza",
   "effetti": [
    {
     "campo": "initial_POS",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q075",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Sa evitare accelerazione inutile nei primi minuti? [variante 4]",
  "riferimento": {
   "risposta": "Non sempre",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": 1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q076",
  "area": "Sonno/energia",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Livello di stanchezza appena sveglio? [variante 4]",
  "riferimento": {
   "risposta": "Alto",
   "effetti": [
    {
     "campo": "V001_E",
     "delta": -3
    },
    {
     "campo": "V002_E",
     "delta": -3
    },
    {
     "campo": "initial_STR",
     "delta": 5
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q077",
  "area": "Corpo/schiena",
  "territorio": "cura_corpo",
  "livello": "professionale",
  "domanda": "Sensibilità ai movimenti di rotazione? [variante 4]",
  "riferimento": {
   "risposta": "Lieve",
   "effetti": [
    {
     "campo": "V002_E",
     "delta": -1
    },
    {
     "campo": "V006_E",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q078",
  "area": "Ambiente",
  "territorio": "casa",
  "livello": "professionale",
  "domanda": "Letto, appoggio e spazio aiutano il movimento? [variante 4]",
  "riferimento": {
   "risposta": "Sì",
   "effetti": [
    {
     "campo": "V002_M",
     "delta": 2
    },
    {
     "campo": "V002_P0",
     "delta": 2
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q079",
  "area": "Tempo",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Pressione dei minuti tra 05:42 e 05:50? [variante 4]",
  "riferimento": {
   "risposta": "Bassa",
   "effetti": [
    {
     "campo": "initial_STR",
     "delta": -1
    }
   ]
  },
  "variante": true
 },
 {
  "id": "Q080",
  "area": "Recupero/RIP",
  "territorio": "trasversale",
  "livello": "professionale",
  "domanda": "Capacità di micro-rientro dopo una sensazione di rigidità? [variante 4]",
  "riferimento": {
   "risposta": "Media",
   "effetti": [
    {
     "campo": "V006_P0",
     "delta": 1
    }
   ]
  },
  "variante": true
 }
];

/* LivelliTaratura stava qui, ed è stato tolto il 03/09/2026.

   Era una copia di `LIVELLI` in app/dati/questionario.js: stessi
   identificativi, stessi testi, più un campo `domande` con i numeri
   6/20/50/80. Nessuno la leggeva — né l'interfaccia né il motore — ma i
   suoi numeri erano SBAGLIATI, e sono finiti nel libro.

   Quelli veri si contano, non si scrivono: ogni livello prende le domande
   che hanno certi prefissi, e vengono 6, 26, 44 e 49. Il conto lo fa
   `Questionario.perLivello(id)`, ed è l'unico posto in cui esiste.

   È lo stesso errore che il progetto ha già pagato tre volte sulla parità
   e una sulle tarature del punto di non ritorno: un numero scritto due
   volte è un numero che prima o poi diverge. */
