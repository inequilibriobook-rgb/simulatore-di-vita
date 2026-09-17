/* Esito della verifica di parita' Python <-> JavaScript.
   GENERATO da _test/confronta.js — non modificare a mano.
   La data e' quella dell'ultima volta in cui uno di questi numeri e'
   CAMBIATO: se la suite gira e trova gli stessi risultati, il file resta
   com'e'. Serve a non far comparire una modifica a ogni esecuzione. */
(function (globale) {
  var V = {
    data: "2026-09-10",
    confronti: 204042,
    differenze: 0,
    nodi: 10000,
    semi_generatore_verificati: 7,
    livelli: [
      { nome: "il dado, seme per seme", quanti: 7, confronti: 7 },
      { nome: "nodi singoli, con lo stato dopo", quanti: 10000, confronti: 200000 },
      { nome: "catene di gesti", quanti: 300, confronti: 1800 },
      { nome: "recuperi fra una scena e l’altra", quanti: 200, confronti: 200 },
      { nome: "giornate intere", quanti: 120, confronti: 600 },
      { nome: "mini-settimane", quanti: 60, confronti: 360 },
      { nome: "traiettorie", quanti: 25, confronti: 75 },
      { nome: "recuperi fra un giorno e l’altro", quanti: 300, confronti: 300 },
      { nome: "notti di sonno", quanti: 300, confronti: 300 },
      { nome: "regimi ricavati dallo stato", quanti: 400, confronti: 400 }
    ],
    /* Misura di velocita': banco a parte, non rifatto da questa suite.
       Resta datato perche' si veda che non e' stato rimisurato. */
    velocita: { data: "2026-08-17", nodi_al_secondo_js: 59371, nodi_al_secondo_py: 1027 }
  };
  globale.Verifica = V;
  if (typeof module !== 'undefined' && module.exports) { module.exports = V; }
})(typeof window !== 'undefined' ? window : globalThis);
