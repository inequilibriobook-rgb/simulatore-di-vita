/* =============================================================================
   SIMULATORE 3.0 — Le formule composte, dentro le pagine
   =============================================================================
   Script classico, nessuna libreria, nessuna rete.

   CHE COSA FA, IN UNA RIGA
   Ogni elemento che porta `data-formula="chiave"` riceve la formula gia'
   composta che sta in app/dati/formule.js — quel file lo genera uno script
   leggendo il Canone, quindi la formula che il lettore vede a schermo e' la
   stessa, carattere per carattere, che sta stampata nel libro.

   PERCHE' NON SI SCRIVE LA FORMULA DENTRO LA PAGINA
   Perche' allora sarebbe scritta due volte — nel libro e qui — e due copie
   della stessa cosa diventano due cose diverse il giorno in cui una cambia.
   E' la regola che questo progetto applica ai numeri, e una formula e' un
   numero lungo.

   SE UNA FORMULA NON C'E'
   Non si inventa niente e non si lascia un buco muto: si scrive che manca,
   con la chiave, cosi' chi guarda la pagina capisce che va rigenerato il
   file invece di pensare che la sezione sia vuota.
   ========================================================================== */
(function (globale) {
  'use strict';

  var F = globale.Formule;

  function inserisci(el, chiave) {
    if (!F) {
      el.innerHTML = '<code class="formula-manca">manca app/dati/formule.js</code>';
      return false;
    }
    var m = F.di(chiave);
    if (!m) {
      el.innerHTML = '<code class="formula-manca">formula «' + chiave +
        '» non generata: rilancia scripts/genera_formule.py</code>';
      return false;
    }
    el.innerHTML = m;
    el.classList.add('formula-pronta');
    setTimeout(function () { adatta(el.parentElement || document); }, 0);
    return true;
  }

  function riempi(dove) {
    var radice = dove || document;
    var quante = 0;
    Array.prototype.forEach.call(
      radice.querySelectorAll('[data-formula]:not(.formula-pronta)'),
      function (el) {
        if (inserisci(el, el.getAttribute('data-formula'))) { quante++; }
      });
    return quante;
  }

  /* la scheda del capitolo 39, cercata per il titolo che il libro le da' */
  function scheda(el, titolo) {
    if (!F) { return false; }
    var s = F.schedaPerTitolo(titolo);
    if (!s) { return false; }
    el.innerHTML = s.mathml;
    el.classList.add('formula-pronta');
    setTimeout(function () { adatta(el.parentElement || document); }, 0);
    return true;
  }

  /* LE FORMULE SI ADATTANO ALLO SCHERMO (17/09/2026).
     Una formula in MathML non va a capo. Su un telefono la formula madre
     misura 457 px in un riquadro da 324: prima restava tagliata a destra,
     e chi non scorreva non la vedeva intera. Qui si misura, e se non ci sta
     la si rimpicciolisce quanto basta, fino a 0,62 volte il corpo. Sotto
     quella misura non e' piu' leggibile: allora si lascia scorrere, e il
     riquadro prende la classe «scorre», che il foglio di stile segnala con
     un'ombra sul bordo destro. Si rifa' a ogni cambio di larghezza. */
  function adatta(radice) {
    var r = radice || document;
    Array.prototype.forEach.call(r.querySelectorAll('.formula-libro > math'), function (m) {
      /* la misura si mette sul riquadro, non sul <math>: in Chrome lo stile
         scritto direttamente sull'elemento MathML non cambia il corpo
         (misurato: restava 15,6 px qualunque cosa gli si scrivesse), mentre
         il corpo ereditato dal contenitore sì */
      var box = m.parentElement;
      box.style.fontSize = '';
      box.classList.remove('scorre');
      var stile = getComputedStyle(box);
      var spazio = box.clientWidth - parseFloat(stile.paddingLeft) - parseFloat(stile.paddingRight);
      var larga = m.getBoundingClientRect().width;
      if (!spazio || !larga || larga <= spazio) { return; }
      var scala = spazio / larga;
      if (scala >= 0.62) {
        box.style.fontSize = (scala * 0.98).toFixed(3) + 'em';
      } else {
        box.style.fontSize = '0.62em';
        box.classList.add('scorre');
      }
    });
  }
  var ritardo = null;
  function adattaPresto() {
    if (ritardo) { clearTimeout(ritardo); }
    ritardo = setTimeout(function () { ritardo = null; adatta(); }, 80);
  }

  var API = { inserisci: inserisci, riempi: riempi, scheda: scheda, adatta: adatta };
  globale.FormuleVista = API;
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { riempi(); adatta(); });
    } else { riempi(); adatta(); }
    /* le pagine inseriscono formule anche dopo (le schede di ESEMPI, i
       riquadri che si aprono): si rimisura quando la pagina e' tutta
       caricata e a ogni cambio di larghezza */
    globale.addEventListener('load', function () { adatta(); });
    globale.addEventListener('resize', adattaPresto);
    /* una formula dentro un riquadro chiuso (<details>) si misura solo quando
       il riquadro si apre: da chiuso la sua larghezza e' zero */
    document.addEventListener('toggle', adattaPresto, true);
  }
}(typeof window !== 'undefined' ? window : this));
