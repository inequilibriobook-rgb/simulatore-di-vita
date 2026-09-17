/* =============================================================================
   SIMULATORE 3.0 — Le 40 famiglie di vita (V001-V040)
   =============================================================================
   ESTRATTE dalla guida 3.2 v6, § 8 «Scenario Universe V001-V040»: per ognuna
   la guida dichiara area, LEVE SENSIBILI, K/Pd tipici e adattamenti coerenti.
   Nessuno di questi valori e' stato inventato o interpretato.

   ⚠️ REGOLA VINCOLANTE                                  [guida v6 § 6.10]
   «V001-V040 orientano scenari, NON aggiungono punteggi automatici.
    Usare la famiglia per domande, leve sensibili e report, non come
    malus/bonus.»

   Qui infatti la famiglia serve a UNA COSA SOLA: scegliere quali domande
   fare. Non tocca nessun numero. Un'ora al supermercato non deve chiedere
   dei suoceri, e una mattina di lavoro non deve chiedere della guida lunga.

   Le `chiavi` sono le parole con cui si riconosce la famiglia dalla
   descrizione della scena. Sono una scelta di questa implementazione, non
   della guida: e' il modo piu' semplice di fare scenario-first senza IA.
   Il lettore puo' sempre correggere la famiglia a mano.

   ⚠️ NOTA SULL'ESTRAZIONE
   Alla prima estrazione dal PDF tre famiglie erano contaminate: il pie' di
   pagina della guida spezza i blocchi JSON a meta', e il testo del pie' di
   pagina era finito dentro le liste. V011 dichiarava fra le proprie leve
   sensibili «typical_kpd» e «lavatrice occupata». Il test se ne e' accorto
   perche' controlla che ogni leva sia una variabile che il modello conosce
   davvero. Rifatta l'estrazione togliendo prima i pie' di pagina.
   ========================================================================== */

(function (globale) {
  'use strict';

  /* PERCHE' SEI AREE, E NON SETTE.
     Il libro ordina le situazioni di vita in sette territori (capitolo 30):
     cura personale e corpo, casa, digitale e burocrazia, lavoro e studio,
     mobilita', relazione, cura e fragilita'. Qui sotto ne compaiono sei.
     Non e' una svista: il libro stesso lo dichiara nel capitolo «Il settimo
     territorio non ha un'area». Il catalogo tecnico — quello da cui questa
     tabella e' estratta — non riserva un'area propria alla cura e alla
     fragilita': quella famiglia vive dentro «coppia e famiglia», come V040
     e poche schede sparse (V005, V006, V036). Il libro chiama la scelta
     «difendibile, ma va dichiarata», e questa nota e' la dichiarazione da
     questa parte. La voce «territori» in app/dati/spiegazioni.js racconta
     la stessa cosa al lettore della pagina. */
  var AREE = {
      "cura_personale_corpo": "Corpo e cura di sé",
      "casa_oggetti": "Casa e oggetti",
      "mobilita_strada": "Muoversi e strada",
      "digitale_burocrazia": "Digitale e burocrazia",
      "lavoro_scuola": "Lavoro e studio",
      "coppia_famiglia": "Coppia e famiglia"
  };

  /* I NOMI SI LEGGONO A SCHERMO, I CODICI NO.
     Il questionario stampa «V033 · scadenze e consegne» sotto la scena
     riconosciuta. Diciotto di questi nomi erano pile di sostantivi
     attaccati senza congiunzione — «deadline consegne», «suoceri genitori
     confini», «porta chiavi uscita» — nate dallo slug con cui la guida
     indicizza le schede, non da una frase italiana. Adesso portano le
     congiunzioni e le virgole che servono a leggerle, e le due parole
     inglesi («deadline», «routine») sono dette in italiano.
     NON e' cambiato niente di quello che il programma usa: `codice`,
     `area`, `leve`, `kpd`, `adattamenti` e `chiavi` sono intatti — il
     `nome` non e' mai una chiave, e nessun controllo lo confronta. */
  var FAMIGLIE = [
    { codice: "V001", nome: "svegliarsi", area: "cura_personale_corpo",
      leve: ["E", "STR", "POS", "cooldown"],
      kpd: ["sveglia non sentita", "rumore", "urgenza"],
      adattamenti: ["pausa_reale", "spezzare_compito"],
      chiavi: ["svegli", "sveglia", "aprire gli occhi", "alba", "mattina presto"] },
    { codice: "V002", nome: "alzarsi e muoversi", area: "cura_personale_corpo",
      leve: ["E", "POS", "M", "STR"],
      kpd: ["capogiro", "ostacolo", "animale tra i piedi"],
      adattamenti: ["semplificare", "chiedere_aiuto"],
      /* AUDIT 19/8: "letto" bare intercettava anche "ho letto il libro"
         (participio di leggere). Sostituito con frasi che indicano il
         mobile, non la lettura. */
      /* AUDIT 15/9: "mi sono rialzata dopo la caduta" non veniva riconosciuta:
         "rialzata"/"rialzarsi" non cominciano per "alzar" (la chiave deve
         cominciare dove comincia la parola). Aggiunto lo stesso stem col
         prefisso "ri". */
      chiavi: ["alzar", "alzo", "rialz", "in piedi", "divano", "dal letto", "nel letto",
               "camminare per casa", "muover"] },
    { codice: "V003", nome: "igiene personale", area: "cura_personale_corpo",
      leve: ["E", "M", "C", "T"],
      kpd: ["acqua fredda", "oggetto mancante"],
      adattamenti: ["cambiare_sequenza", "semplificare"],
      chiavi: ["doccia", "lavar", "denti", "igiene", "bagno", "barba", "capelli"] },
    { codice: "V004", nome: "vestirsi", area: "cura_personale_corpo",
      leve: ["I", "T", "C", "POS"],
      kpd: ["vestito mancante", "ritardo"],
      adattamenti: ["semplificare", "cambiare_obiettivo"],
      /* AUDIT 15/9: "non trovo niente da mettermi" finiva in V012 (oggetti
         smarriti) per via di "non trovo": qui vince perché queste due chiavi
         sono lunghe (peso 3 ciascuna) e V004 viene prima di V012 nell'elenco,
         quindi a parità di punteggio vince questa famiglia — coerente col
         significato reale della frase (vestirsi, non un oggetto perso). */
      chiavi: ["vestir", "vestit", "abbigl", "scarpe", "cambiarmi",
               "niente da mettermi", "cosa mettermi", "cosa indossare"] },
    { codice: "V005", nome: "farmaci e cure di ogni giorno", area: "cura_personale_corpo",
      leve: ["I", "T", "STR", "C"],
      kpd: ["confezione finita", "dubbio dose"],
      adattamenti: ["avvisare_qualcuno", "chiedere_aiuto"],
      /* AUDIT 15/9: "l'antibiotico" era un farmaco specifico non coperto
         dallo stem "farmac". */
      chiavi: ["farmac", "medicin", "pastigl", "terapia", "integrator", "antibiotic"] },
    { codice: "V006", nome: "dolore, fatica e sintomi", area: "cura_personale_corpo",
      leve: ["E", "STR", "POS", "RIP"],
      kpd: ["peggioramento", "instabilità"],
      adattamenti: ["pausa_reale", "rinviare_senza_evitare"],
      /* AUDIT 19/8: aggiunta la visita medica — non è una famiglia a parte
         nel catalogo della guida (verificato sulla fonte, § 8: sei aree,
         nessuna dedicata alla sanità), ma V006 copre già "valutare corpo,
         ridurre carico, scegliere azione", che è esattamente cosa succede
         andando a farsi visitare per un sintomo. */
      /* AUDIT 15/9: "mal di testa/schiena/pancia" non veniva riconosciuto
         ("male " con lo spazio finale non prende "mal"), e "sfinita/sfinito"
         (stanchezza forte, molto comune) non aveva uno stem dedicato. */
      chiavi: ["dolore", "male ", "mal di", "sintom", "stanchezza", "fatica", "sfinit",
               "emicrania", "febbre",
               "visita medica", "dal medico", "dal dottore", "dal dentista", "pronto soccorso",
               "ambulatorio", "esame medico", "controllo medico"] },
    { codice: "V007", nome: "mangiare e bere", area: "cura_personale_corpo",
      leve: ["E", "M", "C", "STR"],
      kpd: ["oggetto cade", "cibo mancante"],
      adattamenti: ["semplificare", "spezzare_compito"],
      chiavi: ["mangia", "bere", "bevo", "acqua", "colazione", "pranzo", "cena", "pasto", "fame", "sete"] },
    { codice: "V008", nome: "chiavi, porta e uscita di casa", area: "casa_oggetti",
      leve: ["I", "M", "T", "C"],
      kpd: ["porta incastrata", "chiavi smarrite"],
      adattamenti: ["cambiare_sequenza", "chiedere_aiuto"],
      /* AUDIT 15/9: "non trovo più le chiavi" finiva in V012 (oggetti
         smarriti) perché "non trovo" lì da solo vale già peso pieno (3),
         mentre "chiavi" da sola vale solo 2 (chiave corta). "le chiavi"
         aggiunge un secondo punteggio pieno (3): 2+3=5 batte il 3 di V012,
         a prescindere da cosa c'è fra "trovo" e "le chiavi" ("non trovo
         più le chiavi", "non trovo le chiavi", "dove ho messo le chiavi"). */
      chiavi: ["chiavi", "le chiavi", "porta ", "portone", "uscio", "serratura",
               "chiudere casa"] },
    { codice: "V009", nome: "cucina preparazione", area: "casa_oggetti",
      leve: ["E", "M", "C", "T"],
      kpd: ["strumento non funziona", "oggetto scivola"],
      adattamenti: ["semplificare", "spezzare_compito"],
      chiavi: ["cucin", "preparare da mangiare", "fornelli", "ricetta", "padella"] },
    { codice: "V010", nome: "pulizie di casa", area: "casa_oggetti",
      leve: ["E", "C", "STR", "POS"],
      kpd: ["interruzione", "sporco maggiore"],
      adattamenti: ["spezzare_compito", "delegare"],
      /* AUDIT 15/9: "sto lavando i piatti" non veniva riconosciuto: c'era
         solo l'infinito "lavare i piatti", non il gerundio/presente. */
      chiavi: ["puli", "riordin", "spazzar", "lavare i piatti", "lavando i piatti",
               "lavo i piatti", "aspirapolvere", "mettere a posto"] },
    { codice: "V011", nome: "bucato", area: "casa_oggetti",
      leve: ["E", "T", "M", "C"],
      kpd: ["lavatrice occupata", "pioggia"],
      adattamenti: ["cambiare_sequenza", "rinviare_senza_evitare"],
      chiavi: ["bucato", "lavatrice", "stender", "stirar", "panni"] },
    { codice: "V012", nome: "oggetti smarriti", area: "casa_oggetti",
      leve: ["I", "STR", "T", "POS"],
      kpd: ["oggetto non nel posto", "pressione"],
      adattamenti: ["pausa_reale", "spezzare_compito"],
      chiavi: ["smarrit", "perso ", "non trovo", "cercare ", "introvabil"] },
    { codice: "V013", nome: "guasti domestici", area: "casa_oggetti",
      leve: ["I", "M", "C", "STR"],
      kpd: ["guasto peggiora", "tecnico non disponibile"],
      adattamenti: ["chiedere_aiuto", "delegare"],
      /* AUDIT 15/9: "la caldaia si è rotta" e "il rubinetto perde acqua"
         non venivano riconosciuti — nessuna chiave nominava gli oggetti
         guasti più comuni. "rubinetto" serve anche a battere "acqua"
         (V007), che altrimenti vince da solo su "perde acqua". */
      chiavi: ["guasto", "rotto", "ripara", "perdita", "si è rotta", "non funziona",
               "caldaia", "rubinetto"] },
    { codice: "V014", nome: "preparare la spesa e la lista", area: "casa_oggetti",
      leve: ["I", "C", "T", "STR"],
      kpd: ["lista incompleta", "richieste familiari"],
      adattamenti: ["semplificare", "spezzare_compito"],
      /* AUDIT 19/8: solo 4 chiavi, una delle quali ("lista") troppo generica
         da sola. Aggiunte frasi vicine a "fare lista, priorità, preparare
         borse" (Nodi tipici, guida § 7.14). */
      chiavi: ["lista", "spesa da fare", "cosa comprare", "pianificare la spesa",
               "fare la lista della spesa", "preparare le borse per la spesa",
               "decidere cosa comprare", "controllare cosa manca in casa"] },
    { codice: "V015", nome: "fare la spesa", area: "casa_oggetti",
      leve: ["I", "M", "T", "C", "STR"],
      kpd: ["folla", "prodotto mancante", "cassa bloccata"],
      adattamenti: ["semplificare", "cambiare_obiettivo"],
      chiavi: ["supermercato", "spesa", "carrello", "cassa ", "coda ", "negozio"] },
    { codice: "V016", nome: "uscire di casa", area: "mobilita_strada",
      leve: ["T", "I", "C", "POS"],
      kpd: ["telefonata", "chiavi", "ritardo"],
      adattamenti: ["cambiare_sequenza", "semplificare"],
      chiavi: ["uscire di casa", "uscire", "esco", "andare via", "partire da casa"] },
    { codice: "V017", nome: "guidare", area: "mobilita_strada",
      leve: ["E", "T", "M", "STR", "POS"],
      kpd: ["traffico", "pioggia", "clacson"],
      adattamenti: ["rinviare_senza_evitare", "cambiare_ambiente"],
      chiavi: ["guidar", "guido", "auto ", "automobile", "macchina", "volante", "traffico"] },
    { codice: "V018", nome: "fare benzina", area: "mobilita_strada",
      leve: ["I", "M", "T", "C"],
      kpd: ["pompa guasta", "carta rifiutata"],
      adattamenti: ["chiedere_aiuto", "cambiare_ambiente"],
      chiavi: ["benzina", "distributore", "rifornimento", "carburante", "colonnina"] },
    { codice: "V019", nome: "mezzi pubblici", area: "mobilita_strada",
      leve: ["T", "M", "I", "STR"],
      kpd: ["ritardo mezzo", "folla"],
      adattamenti: ["cambiare_sequenza", "avvisare_qualcuno"],
      chiavi: ["autobus", "treno", "metro", "tram", "mezzi pubblici", "biglietto"] },
    { codice: "V020", nome: "camminare e spostarsi", area: "mobilita_strada",
      leve: ["E", "M", "POS", "T"],
      kpd: ["ostacolo", "pavimento", "cane"],
      adattamenti: ["semplificare", "pausa_reale"],
      /* AUDIT 15/9: "sto portando fuori il cane" non veniva riconosciuto —
         c'era solo l'infinito "portare fuori il cane", non il gerundio.
         "fuori il cane" da solo prende qualunque tempo verbale (porto,
         portando, portato, ho portato...). */
      chiavi: ["camminar", "a piedi", "passeggi", "marciapiede", "scale ",
               "portare fuori il cane", "portare a spasso il cane", "spasso col cane",
               "fuori il cane"] },
    { codice: "V021", nome: "imprevisti stradali", area: "mobilita_strada",
      leve: ["I", "T", "M", "POS"],
      kpd: ["ostacolo improvviso", "deviazione"],
      adattamenti: ["cambiare_sequenza", "avvisare_qualcuno"],
      chiavi: ["imprevisto in strada", "incidente", "deviazione", "coda in strada", "ingorgo"] },
    { codice: "V022", nome: "messaggi e comunicazioni", area: "digitale_burocrazia",
      leve: ["I", "T", "STR", "POS"],
      kpd: ["tono ambiguo", "risposta attiva"],
      adattamenti: ["pausa_reale", "riparare"],
      chiavi: ["messagg", "whatsapp", "sms", "chat", "scrivere a", "mail", "email"] },
    { codice: "V023", nome: "telefonate", area: "digitale_burocrazia",
      leve: ["I", "T", "STR", "C"],
      kpd: ["attesa", "operatore", "interruzione"],
      adattamenti: ["avvisare_qualcuno", "spezzare_compito"],
      chiavi: ["telefon", "chiamat", "chiamare", "squilla", "rispondere al telefono"] },
    { codice: "V024", nome: "password e accessi", area: "digitale_burocrazia",
      leve: ["I", "C", "T", "STR"],
      kpd: ["OTP rifiutato", "password errata"],
      adattamenti: ["pausa_reale", "chiedere_aiuto"],
      chiavi: ["password", "accesso", "login", "spid", "autentic", "codice otp"] },
    { codice: "V025", nome: "pagamenti", area: "digitale_burocrazia",
      leve: ["I", "T", "M", "C"],
      kpd: ["carta respinta", "app bloccata"],
      adattamenti: ["cambiare_ambiente", "chiedere_aiuto"],
      chiavi: ["pagam", "pagare", "bonific", "bolletta", "fattura", "carta di credito"] },
    { codice: "V026", nome: "documenti online", area: "digitale_burocrazia",
      leve: ["I", "C", "T", "STR"],
      kpd: ["form ambiguo", "file respinto"],
      adattamenti: ["spezzare_compito", "chiedere_aiuto"],
      chiavi: ["documento online", "modulo", "portale", "caricare il documento", "pdf da inviare"] },
    { codice: "V027", nome: "pratiche burocratiche", area: "digitale_burocrazia",
      leve: ["I", "C", "T", "STR"],
      kpd: ["ufficio chiuso", "documento mancante"],
      adattamenti: ["delegare", "spezzare_compito"],
      chiavi: ["burocra", "pratica", "ufficio pubblico", "comune", "agenzia", "anagrafe", "permesso"] },
    { codice: "V028", nome: "iniziare a lavorare o a studiare", area: "lavoro_scuola",
      leve: ["I", "E", "STR", "or1"],
      kpd: ["interruzione", "richiesta improvvisa"],
      adattamenti: ["spezzare_compito", "cambiare_sequenza"],
      /* AUDIT 19/8: solo 4 chiavi, tutte frasi rigide — "apro il pc per
         lavorare" non le intercettava. Aggiunte frasi vicine a "orientarsi,
         aprire compito, iniziare" (Nodi tipici, guida § 7.28). */
      /* AUDIT 15/9: "sto accendendo il computer per lavorare" non veniva
         riconosciuto — c'era solo "accendo il computer" al presente,
         non il gerundio. */
      chiavi: ["iniziare a lavorare", "cominciare il lavoro", "mettermi a studiare",
               "iniziare lo studio", "apro il pc per lavorare", "accendo il computer",
               "accendendo il computer",
               "mi metto al lavoro", "comincio il turno", "mi siedo alla scrivania",
               "inizio la giornata di lavoro", "studiare"] },
    { codice: "V029", nome: "compito difficile", area: "lavoro_scuola",
      leve: ["I", "C", "E", "STR"],
      kpd: ["errore", "strumento mancante"],
      adattamenti: ["chiedere_aiuto", "spezzare_compito"],
      /* AUDIT 19/8: "prepararsi per un colloquio" è citato dal questionario
         stesso (LIVELLI.standard.quando) come scena tipica, ma non veniva
         riconosciuta da nessuna delle 40 famiglie. Qui è il posto giusto:
         stessa ansia da valutazione/prestazione di un esame. */
      /* AUDIT 15/9: "devo finire una relazione difficile" (relazione =
         documento da scrivere, non rapporto di coppia — qui il contesto
         "difficile" lo lascia intendere) non veniva riconosciuto: c'era solo
         "relazione da scrivere". */
      chiavi: ["compito difficile", "progetto", "relazione da scrivere", "relazione difficile",
               "esame", "problema complesso", "colloquio"] },
    { codice: "V030", nome: "il capo e chi ha autorità", area: "lavoro_scuola",
      leve: ["I", "T", "POS", "STR"],
      kpd: ["tono", "richiesta extra"],
      adattamenti: ["avvisare_qualcuno", "cambiare_obiettivo"],
      /* AUDIT 19/8: "capo" bare intercettava anche "un capo nuovo"
         (d'abbigliamento) e "da capo" (dall'inizio). Sostituito con frasi
         che indicano la persona, non l'oggetto o l'avverbio. */
      chiavi: ["il capo", "col capo", "con il capo", "dal capo", "mio capo", "capo ufficio",
               "capo reparto", "dirigente", "responsabile", "superiore", "professore", "autorità"] },
    { codice: "V031", nome: "colleghi e gruppo di lavoro", area: "lavoro_scuola",
      leve: ["I", "C", "POS", "STR"],
      kpd: ["conflitto", "ambiguità"],
      adattamenti: ["riparare", "semplificare"],
      chiavi: ["colleghi", "collega", "riunione", "team", "gruppo di lavoro"] },
    { codice: "V032", nome: "insegnare e spiegare", area: "lavoro_scuola",
      leve: ["I", "E", "C", "STR"],
      kpd: ["domanda inattesa", "classe rumorosa"],
      adattamenti: ["semplificare", "cambiare_sequenza"],
      /* AUDIT 15/9: "sto spiegando" non veniva riconosciuto — c'era solo
         l'infinito "spiegare". */
      chiavi: ["spiegare", "spiegando", "insegnare", "presentazione", "lezione", "illustrare"] },
    { codice: "V033", nome: "scadenze e consegne", area: "lavoro_scuola",
      leve: ["T", "STR", "C", "E"],
      kpd: ["errore finale", "richiesta extra"],
      adattamenti: ["semplificare", "delegare"],
      /* AUDIT 15/9: "devo consegnare il progetto entro stasera" finiva in
         V029 (compito difficile) per via di "progetto": qui "consegna"
         (che prende anche "consegnare") e la preposizione "entro" — quasi
         sempre una scadenza — insieme pesano di più e la famiglia giusta
         vince. */
      chiavi: ["scadenza", "deadline", "consegna", "entro domani", "entro ", "termine"] },
    { codice: "V034", nome: "dialogo di coppia", area: "coppia_famiglia",
      leve: ["I", "POS", "STR", "RIP"],
      kpd: ["difesa", "tono", "silenzio"],
      adattamenti: ["riparare", "pausa_reale"],
      chiavi: ["coppia", "partner", "moglie", "marito", "compagn", "fidanzat", "dialogo con lei", "dialogo con lui"] },
    { codice: "V035", nome: "piccoli conflitti in famiglia", area: "coppia_famiglia",
      leve: ["POS", "STR", "I", "RIP"],
      kpd: ["ribattuta", "escalation"],
      adattamenti: ["riparare", "pausa_reale"],
      chiavi: ["litigio", "conflitto", "discussione in famiglia", "tensione in casa", "battibecco"] },
    { codice: "V036", nome: "figli", area: "coppia_famiglia",
      leve: ["E", "T", "STR", "C"],
      kpd: ["pianto", "capriccio", "urgenza"],
      adattamenti: ["delegare", "semplificare"],
      chiavi: ["figli", "figlio", "figlia", "bambin", "ragazzi", "scuola dei bambini"] },
    { codice: "V037", nome: "organizzazione familiare", area: "coppia_famiglia",
      leve: ["C", "STR", "POS", "supporto"],
      kpd: ["richiesta nuova", "delega finta"],
      adattamenti: ["delegare", "spezzare_compito"],
      /* AUDIT 19/8: solo 4 chiavi, e "turni" bare era generico e ambiguo
         fuori contesto (rischio: "i turni di lavoro" finisce qui invece che
         in V028/V033). Sostituito con frasi vicine a "pianificare,
         distribuire, controllare" (Nodi tipici, guida § 7.37). */
      chiavi: ["organizzare la famiglia", "incastri familiari", "calendario di famiglia",
               "turni in famiglia", "organizzare i turni di casa", "gestire gli impegni di famiglia",
               "pianificare la settimana in famiglia", "distribuire i compiti in casa"] },
    { codice: "V038", nome: "suoceri, genitori e confini", area: "coppia_famiglia",
      leve: ["POS", "I", "STR", "RIP"],
      kpd: ["interferenza", "alleanza"],
      adattamenti: ["riparare", "avvisare_qualcuno"],
      /* AUDIT 15/9: "mia suocera"/"mio suocero" al singolare non venivano
         riconosciuti — "suoceri" bare prende solo il plurale. */
      chiavi: ["suoceri", "suocer", "genitori", "mia madre", "mio padre", "confini con i genitori"] },
    { codice: "V039", nome: "decisioni di coppia e di famiglia", area: "coppia_famiglia",
      leve: ["I", "POS", "C", "STR"],
      kpd: ["disaccordo", "pressione"],
      adattamenti: ["spezzare_compito", "riparare"],
      chiavi: ["decisione di coppia", "decidere insieme", "scelta importante", "trasloco", "decisione familiare"] },
    { codice: "V040", nome: "cura di una persona fragile", area: "coppia_famiglia",
      leve: ["E", "STR", "C", "supporto"],
      kpd: ["crisi", "supporto assente"],
      adattamenti: ["delegare", "chiedere_aiuto"],
      /* AUDIT 15/9: due scene finivano in V038 (suoceri/genitori) perché
         "mia madre"/"mio padre" lì pesano quanto una sola chiave di V040:
         "anziano" (solo maschile) non prendeva "anziana", e "sto facendo
         da caregiver" aveva solo "caregiver" a fare punteggio. Corretto lo
         stem e aggiunta "da caregiver" come chiave a parte: così V040 somma
         più punteggio di V038 e vince, com'è giusto (qui il gesto è la
         cura, non il rapporto di parentela). */
      chiavi: ["assistenza", "persona fragile", "malato", "anzian", "caregiver",
               "da caregiver", "accudire"] }
  ];

  /* --------------------------------------------------------------------
     RICONOSCERE LA FAMIGLIA DALLA DESCRIZIONE
     Restituisce le famiglie che la scena attiva, in ordine di evidenza.
     Se non riconosce niente lo dice: non tira a indovinare.
     -------------------------------------------------------------------- */
  function riconosci(descrizione) {
    var testo = ' ' + String(descrizione || '').toLowerCase()
      .replace(/[^a-zàèéìòùç\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var punteggi = [];

    for (var i = 0; i < FAMIGLIE.length; i++) {
      var f = FAMIGLIE[i], p = 0, trovate = [];
      for (var k = 0; k < f.chiavi.length; k++) {
        /* La chiave deve cominciare dove comincia una parola.
           Senza questo controllo «importante» conteneva «porta», e
           «parlare con mia moglie» finiva nella famiglia delle chiavi
           di casa. Il confine a destra invece resta aperto apposta:
           «svegli» deve prendere «svegliarsi», «sveglia», «svegliato».
           Le chiavi corte e ambigue portano uno spazio finale scritto nel
           dato: «porta » non prende «portale», «auto » non prende
           «automatico». Si e' visto sul campo. */
        if (testo.indexOf(' ' + f.chiavi[k]) >= 0) {
          /* una chiave lunga e' piu' indicativa di una corta */
          p += f.chiavi[k].length >= 8 ? 3 : 2;
          trovate.push(f.chiavi[k]);
        }
      }
      if (p > 0) { punteggi.push({ famiglia: f, punteggio: p, parole: trovate }); }
    }
    punteggi.sort(function (a, b) { return b.punteggio - a.punteggio; });

    return {
      riconosciute: punteggi,
      prevalente: punteggi.length ? punteggi[0].famiglia : null,
      secondarie: punteggi.slice(1, 3).map(function (x) { return x.famiglia; }),
      sicura: punteggi.length > 0 && (punteggi.length === 1 || punteggi[0].punteggio > punteggi[1].punteggio)
    };
  }

  /* Le leve sensibili di tutte le famiglie attive, senza ripetizioni.

     IL NONO ERRORE DELLA STESSA FAMIGLIA — misurato il 19/8. Ogni scheda del
     catalogo dichiara «K/Pd possibili» (V016: telefonata, chiavi, ritardo;
     V017: traffico, pioggia, clacson…), ma quella lista viveva SOLO nel
     campo descrittivo `kpd`, mai in `leve`. Il filtro di selezione guarda
     `leve`: risultato, una domanda che tocca la variabile `campo` (K/Pd) —
     come T11 sulla casa o T16 sulla mobilità — veniva scartata da OGNI
     scena, di ogni famiglia, da quando esiste (18/8), perché "K/Pd" non
     compariva mai fra le leve sensibili di nessuna delle quaranta famiglie.
     Non una scena su quaranta la sceglieva mai. Il difetto non si vedeva
     leggendo il codice riga per riga: si vede solo chiedendo, come sempre,
     se la domanda può davvero mordere nella condizione in cui viene provata.

     La correzione: una famiglia che dichiara `kpd` non vuoto sta dicendo
     che il campo può rispondere in quella scena — è la stessa informazione
     di `leve`, scritta nell'altro campo. Le quaranta famiglie hanno tutte
     `kpd` non vuoto (è la specifica del catalogo), quindi qui basta
     accorgersene una volta sola. */
  function leveSensibili(famiglie) {
    var viste = {}, out = [];
    (famiglie || []).forEach(function (f) {
      (f.leve || []).forEach(function (l) {
        if (!viste[l]) { viste[l] = true; out.push(l); }
      });
      if ((f.kpd || []).length && !viste['K/Pd']) { viste['K/Pd'] = true; out.push('K/Pd'); }
    });
    return out;
  }

  function perCodice(codice) {
    for (var i = 0; i < FAMIGLIE.length; i++) {
      if (FAMIGLIE[i].codice === codice) { return FAMIGLIE[i]; }
    }
    return null;
  }
  function perArea(area) {
    return FAMIGLIE.filter(function (f) { return f.area === area; });
  }

  var API = {
    AREE: AREE,
    FAMIGLIE: FAMIGLIE,
    riconosci: riconosci,
    leveSensibili: leveSensibili,
    perCodice: perCodice,
    perArea: perArea
  };

  globale.Famiglie = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }

})(typeof window !== 'undefined' ? window : globalThis);
