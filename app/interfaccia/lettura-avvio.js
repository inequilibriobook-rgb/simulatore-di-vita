/* SIMULATORE 3.0 — I due comandi della lettura lunga.
   La barra in alto (percorso-vista.js) non fa il lavoro da se': preme i
   bottoni che la pagina ha gia'. Questa pagina li deve avere, come tutte
   le altre, e qui si limitano a fare le due cose che fanno ovunque. */
(function () {
  'use strict';
  function q(id) { return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', function () {
    var st = q('stampa');
    if (st) { st.addEventListener('click', function () { window.print(); }); }
    var te = q('tema');
    if (te) {
      te.addEventListener('click', function () {
        var attuale = document.documentElement.getAttribute('data-tema');
        var nuovo = attuale === 'scuro' ? 'chiaro' : 'scuro';
        document.documentElement.setAttribute('data-tema', nuovo);
        te.textContent = nuovo === 'scuro' ? 'Tema chiaro' : 'Tema scuro';
      });
    }
  });
})();
