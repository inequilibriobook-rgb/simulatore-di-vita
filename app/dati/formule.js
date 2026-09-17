/* =============================================================================
   SIMULATORE 3.0 — Le formule del libro, gia' composte
   =============================================================================
   FILE GENERATO. Non si scrive a mano.

       python3 scripts/genera_formule.py

   Lo genera lo script leggendo il Canone: ogni formula qui dentro sta nel
   libro esattamente con quel LaTeX, ed e' stata tradotta in MathML dallo
   stesso traduttore che compone l'edizione HTML del libro. Se il libro
   cambia una formula e questo file non viene rigenerato, _test/libro.js se
   ne accorge — confronta il LaTeX di qui con quello del Canone.

   MathML e non una libreria: le pagine si aprono da disco, senza rete
   (capitolo 48), e MathML lo disegnano i browser da soli.

   Generato il 15/09/2026 dal Canone.
   ========================================================================== */
(function (globale) {
  'use strict';

  var FORMULE = {
    "madre": {
      latex: "P_n = \\operatorname{clamp}\\bigl(P_0 + E + I + T + M + \\mathrm{BP} - 5C - \\operatorname{Pen}_{\\mathrm{STR}}(\\mathrm{STR}) - 5\\,\\mathrm{DEB}\\bigr)",
      spiega: "La formula canonica del nodo, come sta nel capitolo 5.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_n = \\operatorname{clamp}\\bigl(P_0 + E + I + T + M + \\mathrm{BP} - 5C - \\operatorname{Pen}_{\\mathrm{STR}}(\\mathrm{STR}) - 5\\,\\mathrm{DEB}\\bigr)\"><mrow><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mi mathvariant=\"normal\">clamp</mi><mo stretchy=\"true\" fence=\"true\">(</mo><msub><mi>P</mi><mn>0</mn></msub><mo>+</mo><mi>E</mi><mo>+</mo><mi>I</mi><mo>+</mo><mi>T</mi><mo>+</mo><mi>M</mi><mo>+</mo><mi mathvariant=\"normal\">BP</mi><mo>\u2212</mo><mn>5</mn><mi>C</mi><mo>\u2212</mo><msub><mi mathvariant=\"normal\">Pen</mi><mrow><mi mathvariant=\"normal\">STR</mi></mrow></msub><mo stretchy=\"true\" fence=\"true\">(</mo><mi mathvariant=\"normal\">STR</mi><mo stretchy=\"true\" fence=\"true\">)</mo><mo>\u2212</mo><mn>5</mn><mspace width=\"0.1667em\"/><mi mathvariant=\"normal\">DEB</mi><mo stretchy=\"true\" fence=\"true\">)</mo></mrow></math>"
    },
    "grezza": {
      latex: "P_{\\mathrm{raw}} = P_0 + E + I + T + M + \\mathrm{BP} - 5C - \\operatorname{Pen}_{\\mathrm{STR}}(\\mathrm{STR}) - 5\\,\\mathrm{DEB}",
      spiega: "La somma grezza, prima del taglio ai bordi.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = P_0 + E + I + T + M + \\mathrm{BP} - 5C - \\operatorname{Pen}_{\\mathrm{STR}}(\\mathrm{STR}) - 5\\,\\mathrm{DEB}\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><msub><mi>P</mi><mn>0</mn></msub><mo>+</mo><mi>E</mi><mo>+</mo><mi>I</mi><mo>+</mo><mi>T</mi><mo>+</mo><mi>M</mi><mo>+</mo><mi mathvariant=\"normal\">BP</mi><mo>\u2212</mo><mn>5</mn><mi>C</mi><mo>\u2212</mo><msub><mi mathvariant=\"normal\">Pen</mi><mrow><mi mathvariant=\"normal\">STR</mi></mrow></msub><mo stretchy=\"true\" fence=\"true\">(</mo><mi mathvariant=\"normal\">STR</mi><mo stretchy=\"true\" fence=\"true\">)</mo><mo>\u2212</mo><mn>5</mn><mspace width=\"0.1667em\"/><mi mathvariant=\"normal\">DEB</mi></mrow></math>"
    },
    "clamp": {
      latex: "\\operatorname{clamp}(x) = \\min\\bigl(95,\\ \\max(5,\\ x)\\bigr)",
      spiega: "Il taglio ai bordi, scritto per esteso.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\operatorname{clamp}(x) = \\min\\bigl(95,\\ \\max(5,\\ x)\\bigr)\"><mrow><mi mathvariant=\"normal\">clamp</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mi>x</mi><mo stretchy=\"true\" fence=\"true\">)</mo><mo>=</mo><mi mathvariant=\"normal\">min</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mn>95</mn><mo separator=\"true\">,</mo><mspace width=\"0.25em\"/><mi mathvariant=\"normal\">max</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mn>5</mn><mo separator=\"true\">,</mo><mspace width=\"0.25em\"/><mi>x</mi><mo stretchy=\"true\" fence=\"true\">)</mo><mo stretchy=\"true\" fence=\"true\">)</mo></mrow></math>"
    },
    "confini": {
      latex: "5 \\le P_n \\le 95",
      spiega: "Lo stesso taglio, detto come intervallo.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"5 \\le P_n \\le 95\"><mrow><mn>5</mn><mo>\u2264</mo><msub><mi>P</mi><mi>n</mi></msub><mo>\u2264</mo><mn>95</mn></mrow></math>"
    },
    "penstr": {
      latex: "\\operatorname{Pen}_{\\mathrm{STR}}(s) = \\begin{cases}\n0 & \\text{se } 0 \\le s \\le 39 \\\\\n5 & \\text{se } 40 \\le s \\le 59 \\\\\n10 & \\text{se } 60 \\le s \\le 69 \\\\\n15 & \\text{se } 70 \\le s \\le 79 \\\\\n20 & \\text{se } 80 \\le s \\le 89 \\\\\n25 & \\text{se } 90 \\le s \\le 100\n\\end{cases}",
      spiega: "La penalit\u00e0 da carico persistente: una funzione a gradini, sei fasce.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\operatorname{Pen}_{\\mathrm{STR}}(s) = \\begin{cases}\n0 &amp; \\text{se } 0 \\le s \\le 39 \\\\\n5 &amp; \\text{se } 40 \\le s \\le 59 \\\\\n10 &amp; \\text{se } 60 \\le s \\le 69 \\\\\n15 &amp; \\text{se } 70 \\le s \\le 79 \\\\\n20 &amp; \\text{se } 80 \\le s \\le 89 \\\\\n25 &amp; \\text{se } 90 \\le s \\le 100\n\\end{cases}\"><mrow><msub><mi mathvariant=\"normal\">Pen</mi><mrow><mi mathvariant=\"normal\">STR</mi></mrow></msub><mo stretchy=\"true\" fence=\"true\">(</mo><mi>s</mi><mo stretchy=\"true\" fence=\"true\">)</mo><mo>=</mo><mrow><mo stretchy=\"true\" fence=\"true\">{</mo><mtable columnalign=\"left left\" class=\"cases\"><mtr><mtd><mrow><mn>0</mn></mrow></mtd><mtd><mrow><mtext>se </mtext><mn>0</mn><mo>\u2264</mo><mi>s</mi><mo>\u2264</mo><mn>39</mn></mrow></mtd></mtr><mtr><mtd><mrow><mn>5</mn></mrow></mtd><mtd><mrow><mtext>se </mtext><mn>40</mn><mo>\u2264</mo><mi>s</mi><mo>\u2264</mo><mn>59</mn></mrow></mtd></mtr><mtr><mtd><mrow><mn>10</mn></mrow></mtd><mtd><mrow><mtext>se </mtext><mn>60</mn><mo>\u2264</mo><mi>s</mi><mo>\u2264</mo><mn>69</mn></mrow></mtd></mtr><mtr><mtd><mrow><mn>15</mn></mrow></mtd><mtd><mrow><mtext>se </mtext><mn>70</mn><mo>\u2264</mo><mi>s</mi><mo>\u2264</mo><mn>79</mn></mrow></mtd></mtr><mtr><mtd><mrow><mn>20</mn></mrow></mtd><mtd><mrow><mtext>se </mtext><mn>80</mn><mo>\u2264</mo><mi>s</mi><mo>\u2264</mo><mn>89</mn></mrow></mtd></mtr><mtr><mtd><mrow><mn>25</mn></mrow></mtd><mtd><mrow><mtext>se </mtext><mn>90</mn><mo>\u2264</mo><mi>s</mi><mo>\u2264</mo><mn>100</mn></mrow></mtd></mtr></mtable></mrow></mrow></math>"
    },
    "debito": {
      latex: "\\text{penalit\u00e0 da debito} = 5\\,\\mathrm{DEB}",
      spiega: "Il debito pesa cinque punti per unit\u00e0.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\text{penalit\u00e0 da debito} = 5\\,\\mathrm{DEB}\"><mrow><mtext>penalit\u00e0 da debito</mtext><mo>=</mo><mn>5</mn><mspace width=\"0.1667em\"/><mi mathvariant=\"normal\">DEB</mi></mrow></math>"
    },
    "dado": {
      latex: "\\text{successo} \\iff d \\le P_n",
      spiega: "La regola del dado, senza eccezioni.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\text{successo} \\iff d \\le P_n\"><mrow><mtext>successo</mtext><mo>\u27fa</mo><mi>d</mi><mo>\u2264</mo><msub><mi>P</mi><mi>n</mi></msub></mrow></math>"
    },
    "probabilita": {
      latex: "\\Pr(\\text{successo}) = \\Pr(d \\le P_n) = \\frac{P_n}{100}",
      spiega: "Che cosa vuol dire davvero \u00absettanta per cento\u00bb.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\Pr(\\text{successo}) = \\Pr(d \\le P_n) = \\frac{P_n}{100}\"><mrow><mi mathvariant=\"normal\">Pr</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mtext>successo</mtext><mo stretchy=\"true\" fence=\"true\">)</mo><mo>=</mo><mi mathvariant=\"normal\">Pr</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mi>d</mi><mo>\u2264</mo><msub><mi>P</mi><mi>n</mi></msub><mo stretchy=\"true\" fence=\"true\">)</mo><mo>=</mo><mfrac><mrow><msub><mi>P</mi><mi>n</mi></msub></mrow><mrow><mn>100</mn></mrow></mfrac></mrow></math>"
    },
    "margini": {
      latex: "\\begin{cases}\n\\mathrm{MS} = P_n - d & \\text{se } d \\le P_n \\\\\n\\mathrm{MF} = d - P_n & \\text{se } d > P_n\n\\end{cases}",
      spiega: "I due margini, in un caso solo con due rami.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\begin{cases}\n\\mathrm{MS} = P_n - d &amp; \\text{se } d \\le P_n \\\\\n\\mathrm{MF} = d - P_n &amp; \\text{se } d &gt; P_n\n\\end{cases}\"><mrow><mrow><mo stretchy=\"true\" fence=\"true\">{</mo><mtable columnalign=\"left left\" class=\"cases\"><mtr><mtd><mrow><mi mathvariant=\"normal\">MS</mi><mo>=</mo><msub><mi>P</mi><mi>n</mi></msub><mo>\u2212</mo><mi>d</mi></mrow></mtd><mtd><mrow><mtext>se </mtext><mi>d</mi><mo>\u2264</mo><msub><mi>P</mi><mi>n</mi></msub></mrow></mtd></mtr><mtr><mtd><mrow><mi mathvariant=\"normal\">MF</mi><mo>=</mo><mi>d</mi><mo>\u2212</mo><msub><mi>P</mi><mi>n</mi></msub></mrow></mtd><mtd><mrow><mtext>se </mtext><mi>d</mi><mo>&gt;</mo><msub><mi>P</mi><mi>n</mi></msub></mrow></mtd></mtr></mtable></mrow></mrow></math>"
    },
    "margine_netto": {
      latex: "\\mathrm{MS}_{\\text{net}} = \\mathrm{MS} - \\mathrm{MS}_{\\text{campo}}",
      spiega: "Il margine dopo la risposta attiva del campo: entra dopo il dado, mai dentro.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\mathrm{MS}_{\\text{net}} = \\mathrm{MS} - \\mathrm{MS}_{\\text{campo}}\"><mrow><msub><mi mathvariant=\"normal\">MS</mi><mrow><mtext>net</mtext></mrow></msub><mo>=</mo><mi mathvariant=\"normal\">MS</mi><mo>\u2212</mo><msub><mi mathvariant=\"normal\">MS</mi><mrow><mtext>campo</mtext></mrow></msub></mrow></math>"
    },
    "intervallo": {
      latex: "\\bar{x} \\pm 1{,}96\\,\\frac{s}{\\sqrt{n}}",
      spiega: "La fascia al 95 % intorno alla media: il denominatore \u00e8 la radice di n.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\bar{x} \\pm 1{,}96\\,\\frac{s}{\\sqrt{n}}\"><mrow><mover accent=\"true\"><mrow><mi>x</mi></mrow><mo>\u00af</mo></mover><mo>\u00b1</mo><mn>1,96</mn><mspace width=\"0.1667em\"/><mfrac><mrow><mi>s</mi></mrow><mrow><msqrt><mrow><mi>n</mi></mrow></msqrt></mrow></mfrac></mrow></math>"
    },
    "quante_ripetizioni": {
      latex: "n \\ge \\left(\\frac{1{,}96\\,s}{\\varepsilon}\\right)^{2}",
      spiega: "Quante ripetizioni servono per una precisione voluta.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"n \\ge \\left(\\frac{1{,}96\\,s}{\\varepsilon}\\right)^{2}\"><mrow><mi>n</mi><mo>\u2265</mo><mo stretchy=\"true\" fence=\"true\">(</mo><mfrac><mrow><mn>1,96</mn><mspace width=\"0.1667em\"/><mi>s</mi></mrow><mrow><mi>\u03b5</mi></mrow></mfrac><msup><mo stretchy=\"true\" fence=\"true\">)</mo><mrow><mn>2</mn></mrow></msup></mrow></math>"
    },
    "granularita": {
      latex: "f(g) = \\min\\left(1,\\ \\frac{k}{g}\\right)",
      spiega: "Il peso di una giornata diviso per quanti nodi la descrivono.",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"f(g) = \\min\\left(1,\\ \\frac{k}{g}\\right)\"><mrow><mi>f</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mi>g</mi><mo stretchy=\"true\" fence=\"true\">)</mo><mo>=</mo><mi mathvariant=\"normal\">min</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mn>1</mn><mo separator=\"true\">,</mo><mspace width=\"0.25em\"/><mfrac><mrow><mi>k</mi></mrow><mrow><mi>g</mi></mrow></mfrac><mo stretchy=\"true\" fence=\"true\">)</mo></mrow></math>"
    }
  };

  /* Le dieci schede di calcolo del capitolo 39, nell'ordine del libro.
     Di ognuna: i nove valori dichiarati, il grezzo e il Pn stampati, la
     frase con cui il libro spiega i conti, e la riga composta. */
  var SCHEDE = [
    { titolo: "Bere acqua dopo una giornata pesante",
      valori: { P0: 90, E: -5, I: 0, T: 0, M: 0, BP: 0, C: 1, STR: 62, DEB: 0 },
      praw: 70, pn: 70,
      conti: "Novanta di base, perché il gesto è notissimo. Meno cinque per il corpo. Meno cinque per la complessità, che vale uno. Meno dieci per il carico persistente a 62, che cade nella fascia dei dieci punti.",
      latex: "P_{\\mathrm{raw}} = 90 - 5 - 5 - 10 = 70 \\qquad\\qquad P_n = 70",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 90 - 5 - 5 - 10 = 70 \\qquad\\qquad P_n = 70\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>90</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>=</mo><mn>70</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>70</mn></mrow></math>" },
    { titolo: "Pratica online con OTP bloccato",
      valori: { P0: 60, E: 0, I: -10, T: -5, M: -5, BP: 0, C: 3, STR: 55, DEB: 0 },
      praw: 20, pn: 20,
      conti: "Base sessanta, perché la procedura non è un gesto automatico. Meno dieci di chiarezza, perché le istruzioni non spiegano. Meno cinque di tempo e cinque di ambiente. Meno quindici di complessità, che vale tre: sono tre coordinamenti veri, credenziale, codice, caricamento. Meno cinque per il carico a 55.",
      latex: "P_{\\mathrm{raw}} = 60 - 10 - 5 - 5 - 15 - 5 = 20 \\qquad\\qquad P_n = 20",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 60 - 10 - 5 - 5 - 15 - 5 = 20 \\qquad\\qquad P_n = 20\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>60</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>15</mn><mo>\u2212</mo><mn>5</mn><mo>=</mo><mn>20</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>20</mn></mrow></math>" },
    { titolo: "Dialogo di coppia teso",
      valori: { P0: 55, E: 0, I: -5, T: 0, M: 0, BP: 5, C: 2, STR: 60, DEB: 0 },
      praw: 35, pn: 35,
      conti: "Base cinquantacinque: un dialogo teso non è un gesto tecnico ad alta riuscita. Meno cinque di chiarezza. Più cinque di protezione, l'unico segno positivo della scheda. Meno dieci di complessità, che vale due. Meno dieci per il carico a 60, appena dentro la fascia.",
      latex: "P_{\\mathrm{raw}} = 55 - 5 + 5 - 10 - 10 = 35 \\qquad\\qquad P_n = 35",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 55 - 5 + 5 - 10 - 10 = 35 \\qquad\\qquad P_n = 35\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>55</mn><mo>\u2212</mo><mn>5</mn><mo>+</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>10</mn><mo>=</mo><mn>35</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>35</mn></mrow></math>" },
    { titolo: "Deadline riuscita ma tossica",
      valori: { P0: 75, E: -10, I: 5, T: -15, M: 0, BP: 0, C: 3, STR: 82, DEB: 1 },
      praw: 15, pn: 15,
      conti: "Base settantacinque: la persona è competente. Più cinque di chiarezza: sa esattamente che cosa deve consegnare. Poi tutto il resto scende. Meno dieci di corpo. Meno quindici di tempo, compresso. Meno quindici di complessità. Meno venti di carico persistente, che a 82 è nella penultima fascia. Meno cinque di debito, che vale uno.",
      latex: "P_{\\mathrm{raw}} = 75 - 10 + 5 - 15 - 15 - 20 - 5 = 15 \\qquad\\qquad P_n = 15",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 75 - 10 + 5 - 15 - 15 - 20 - 5 = 15 \\qquad\\qquad P_n = 15\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>75</mn><mo>\u2212</mo><mn>10</mn><mo>+</mo><mn>5</mn><mo>\u2212</mo><mn>15</mn><mo>\u2212</mo><mn>15</mn><mo>\u2212</mo><mn>20</mn><mo>\u2212</mo><mn>5</mn><mo>=</mo><mn>15</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>15</mn></mrow></math>" },
    { titolo: "Cane che tira alla porta",
      valori: { P0: 80, E: -5, I: 0, T: -5, M: -5, BP: 0, C: 2, STR: 50, DEB: 0 },
      praw: 50, pn: 50,
      conti: "Base ottanta, gesto noto. Meno cinque di corpo, cinque di tempo, cinque di ambiente. Meno dieci di complessità. Meno cinque per il carico a 50.",
      latex: "P_{\\mathrm{raw}} = 80 - 5 - 5 - 5 - 10 - 5 = 50 \\qquad\\qquad P_n = 50",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 80 - 5 - 5 - 5 - 10 - 5 = 50 \\qquad\\qquad P_n = 50\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>80</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>5</mn><mo>=</mo><mn>50</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>50</mn></mrow></math>" },
    { titolo: "Oggetto pesante",
      valori: { P0: 40, E: -10, I: 0, T: 0, M: -10, BP: 0, C: 3, STR: 58, DEB: 0 },
      praw: 0, pn: 5,
      conti: "Base quaranta: il gesto è già difficile in condizioni neutre. Meno dieci di corpo, dieci di ambiente, quindici di complessità, cinque di carico.",
      latex: "P_{\\mathrm{raw}} = 40 - 10 - 10 - 15 - 5 = 0 \\qquad\\qquad P_n = \\operatorname{clamp}(0) = 5",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 40 - 10 - 10 - 15 - 5 = 0 \\qquad\\qquad P_n = \\operatorname{clamp}(0) = 5\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>40</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>15</mn><mo>\u2212</mo><mn>5</mn><mo>=</mo><mn>0</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mi mathvariant=\"normal\">clamp</mi><mo stretchy=\"true\" fence=\"true\">(</mo><mn>0</mn><mo stretchy=\"true\" fence=\"true\">)</mo><mo>=</mo><mn>5</mn></mrow></math>" },
    { titolo: "Messaggio scritto sotto stress",
      valori: { P0: 70, E: 0, I: -5, T: -5, M: 0, BP: 0, C: 2, STR: 68, DEB: 0 },
      praw: 40, pn: 40,
      conti: "Base settanta. Meno cinque di chiarezza, cinque di tempo, dieci di complessità, dieci per il carico a 68.",
      latex: "P_{\\mathrm{raw}} = 70 - 5 - 5 - 10 - 10 = 40 \\qquad\\qquad P_n = 40",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 70 - 5 - 5 - 10 - 10 = 40 \\qquad\\qquad P_n = 40\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>70</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>10</mn><mo>=</mo><mn>40</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>40</mn></mrow></math>" },
    { titolo: "Supermercato nuovo affollato",
      valori: { P0: 75, E: -5, I: -10, T: -5, M: -10, BP: 0, C: 2, STR: 60, DEB: 0 },
      praw: 25, pn: 25,
      conti: "Base settantacinque: fare la spesa non è difficile. Poi la scena la rende difficile. Meno cinque di corpo. Meno dieci di chiarezza, perché il supermercato è nuovo e non si sa dov'è niente. Meno cinque di tempo. Meno dieci di ambiente, per la folla. Meno dieci di complessità. Meno dieci per il carico a 60.",
      latex: "P_{\\mathrm{raw}} = 75 - 5 - 10 - 5 - 10 - 10 - 10 = 25 \\qquad\\qquad P_n = 25",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 75 - 5 - 10 - 5 - 10 - 10 - 10 = 25 \\qquad\\qquad P_n = 25\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>75</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>10</mn><mo>=</mo><mn>25</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>25</mn></mrow></math>" },
    { titolo: "Porta bloccata con fretta",
      valori: { P0: 85, E: 0, I: 0, T: -10, M: -10, BP: 0, C: 1, STR: 45, DEB: 0 },
      praw: 55, pn: 55,
      conti: "Base ottantacinque: aprire una porta è facile. Meno dieci di tempo, per la fretta. Meno dieci di ambiente, perché la serratura è quella che è. Meno cinque di complessità e cinque di carico.",
      latex: "P_{\\mathrm{raw}} = 85 - 10 - 10 - 5 - 5 = 55 \\qquad\\qquad P_n = 55",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 85 - 10 - 10 - 5 - 5 = 55 \\qquad\\qquad P_n = 55\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>85</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>5</mn><mo>\u2212</mo><mn>5</mn><mo>=</mo><mn>55</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>55</mn></mrow></math>" },
    { titolo: "Lezione da preparare stanchi",
      valori: { P0: 75, E: -10, I: 5, T: -10, M: 0, BP: 0, C: 3, STR: 70, DEB: 1 },
      praw: 25, pn: 25,
      conti: "Base settantacinque. Meno dieci di corpo. Più cinque di chiarezza: sa che cosa deve preparare, ed è l'unico segno positivo. Meno dieci di tempo. Meno quindici di complessità. Meno quindici per il carico a 70, prima riga della fascia dei quindici. Meno cinque di debito.",
      latex: "P_{\\mathrm{raw}} = 75 - 10 + 5 - 10 - 15 - 15 - 5 = 25 \\qquad\\qquad P_n = 25",
      mathml: "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"P_{\\mathrm{raw}} = 75 - 10 + 5 - 10 - 15 - 15 - 5 = 25 \\qquad\\qquad P_n = 25\"><mrow><msub><mi>P</mi><mrow><mi mathvariant=\"normal\">raw</mi></mrow></msub><mo>=</mo><mn>75</mn><mo>\u2212</mo><mn>10</mn><mo>+</mo><mn>5</mn><mo>\u2212</mo><mn>10</mn><mo>\u2212</mo><mn>15</mn><mo>\u2212</mo><mn>15</mn><mo>\u2212</mo><mn>5</mn><mo>=</mo><mn>25</mn><mspace width=\"2em\"/><mspace width=\"2em\"/><msub><mi>P</mi><mi>n</mi></msub><mo>=</mo><mn>25</mn></mrow></math>" }
  ];

  /* Le due schede del capitolo 39 in cui il libro NON calcola, con il
     motivo scritto come lo scrive il libro. Fermarsi e' il risultato. */
  var SENZA_CALCOLO = [
    { titolo: "Guidare con sonnolenza", perche: "Nessun calcolo.\nSafetyStop, e viene prima della formula." },
    { titolo: "Caregiver che compensa tutti", perche: "Nessun calcolo: non è un nodo, è una sequenza lunga.\nMACRO-3/4 · carico persistente in salita · posizione interna in calo\nsupporto simbolico" }
  ];

  /* Restituisce il MathML di una formula. Se la chiave non c'e' non si
     inventa niente: si torna null, e chi chiama decide che cosa mostrare. */
  function di(chiave) {
    return FORMULE[chiave] ? FORMULE[chiave].mathml : null;
  }
  function schedaPerTitolo(titolo) {
    for (var i = 0; i < SCHEDE.length; i++) {
      if (SCHEDE[i].titolo === titolo) { return SCHEDE[i]; }
    }
    return null;
  }

  var API = { FORMULE: FORMULE, SCHEDE: SCHEDE, SENZA_CALCOLO: SENZA_CALCOLO,
              di: di, schedaPerTitolo: schedaPerTitolo };
  globale.Formule = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
}(typeof window !== 'undefined' ? window : this));
