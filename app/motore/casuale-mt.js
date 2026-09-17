/* =============================================================================
   SIMULATORE 3.0 — Generatore casuale compatibile con Python
   =============================================================================
   Replica esatta di random.Random di Python (Mersenne Twister MT19937).

   PERCHE' SERVE
   Il motore originale e' scritto in Python e usa rng.randint(1, 100) per il dado.
   Math.random() di JavaScript usa un algoritmo diverso: a parita' di seme darebbe
   numeri diversi. Con questo file, invece, lo stesso seme produce ESATTAMENTE la
   stessa sequenza di dadi in Python e nel browser. Cosi' ogni esempio stampato nel
   libro si riproduce identico sullo schermo del lettore.

   COSA REPLICA
   - random.seed(n) con n intero      -> init_by_array (CPython _randommodule.c)
   - random.getrandbits(k), k <= 32
   - random._randbelow(n)             -> campionamento con rifiuto
   - random.randint(a, b)
   ========================================================================== */

(function (globale) {
  'use strict';

  var N = 624;
  var M = 397;
  var MATRIX_A = 0x9908b0df;
  var UPPER_MASK = 0x80000000;
  var LOWER_MASK = 0x7fffffff;

  function CasualePython(seme) {
    if (!(this instanceof CasualePython)) { return new CasualePython(seme); }
    this.mt = new Uint32Array(N);
    this.indice = N;
    this.seed(seme);
  }

  /* init_genrand di CPython */
  CasualePython.prototype._initGenrand = function (s) {
    var mt = this.mt;
    mt[0] = s >>> 0;
    for (var i = 1; i < N; i++) {
      var prec = mt[i - 1] ^ (mt[i - 1] >>> 30);
      // 1812433253 * prec + i, in aritmetica a 32 bit
      mt[i] = (Math.imul(1812433253, prec) + i) >>> 0;
    }
    this.indice = N;
  };

  /* init_by_array di CPython */
  CasualePython.prototype._initByArray = function (chiave) {
    this._initGenrand(19650218);
    var mt = this.mt;
    var i = 1, j = 0;
    var k = (N > chiave.length) ? N : chiave.length;

    for (; k; k--) {
      var prec = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (((mt[i] ^ Math.imul(prec, 1664525)) >>> 0) + chiave[j] + j) >>> 0;
      i++; j++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
      if (j >= chiave.length) { j = 0; }
    }
    for (k = N - 1; k; k--) {
      var prec2 = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (((mt[i] ^ Math.imul(prec2, 1566083941)) >>> 0) - i) >>> 0;
      i++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    }
    mt[0] = 0x80000000;
    this.indice = N;
  };

  /* Python usa il valore ASSOLUTO del seme, spezzato in parole da 32 bit
     (little-endian). Per semi fino a 2^53 bastano due parole. */
  CasualePython.prototype.seed = function (seme) {
    var n = (seme === undefined || seme === null) ? 0 : Math.abs(Math.floor(Number(seme)));
    if (!isFinite(n)) { n = 0; }
    var chiave = [];
    if (n === 0) {
      chiave = [0];
    } else {
      while (n > 0) {
        chiave.push(n >>> 0 === n ? n : (n % 4294967296) >>> 0);
        n = Math.floor(n / 4294967296);
      }
    }
    this._initByArray(chiave);
  };

  /* genrand_uint32 */
  CasualePython.prototype._genrand = function () {
    var mt = this.mt, y, kk;
    if (this.indice >= N) {
      for (kk = 0; kk < N - M; kk++) {
        y = ((mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK)) >>> 0;
        mt[kk] = (mt[kk + M] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0)) >>> 0;
      }
      for (; kk < N - 1; kk++) {
        y = ((mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK)) >>> 0;
        mt[kk] = (mt[kk + (M - N)] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0)) >>> 0;
      }
      y = ((mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK)) >>> 0;
      mt[N - 1] = (mt[M - 1] ^ (y >>> 1) ^ ((y & 1) ? MATRIX_A : 0)) >>> 0;
      this.indice = 0;
    }
    y = mt[this.indice++];
    y = (y ^ (y >>> 11)) >>> 0;
    y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
    y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
    y = (y ^ (y >>> 18)) >>> 0;
    return y;
  };

  /* getrandbits(k) — implementato per k da 1 a 32, che e' quanto serve al dado */
  CasualePython.prototype.getrandbits = function (k) {
    if (k <= 0) { throw new Error('getrandbits: mi è stato chiesto un numero da ' + k +
      ' bit, ma i bit devono essere almeno uno. È un errore di chi chiama, non del dado.'); }
    if (k > 32) { throw new Error('getrandbits: mi sono stati chiesti ' + k + ' bit, e ' +
      'questa copia del generatore ne sa dare al massimo trentadue — tanti quanti ne ' +
      'servono al dado da 1 a 100. Per numeri più grandi va ampliata.'); }
    return this._genrand() >>> (32 - k);
  };

  function lunghezzaBit(n) {
    var b = 0;
    while (n > 0) { b++; n = Math.floor(n / 2); }
    return b;
  }

  /* _randbelow_with_getrandbits: campionamento con rifiuto */
  CasualePython.prototype._randbelow = function (n) {
    if (!n) { return 0; }
    var k = lunghezzaBit(n);
    var r = this.getrandbits(k);
    while (r >= n) { r = this.getrandbits(k); }
    return r;
  };

  CasualePython.prototype.randint = function (a, b) {
    return a + this._randbelow(b - a + 1);
  };

  /* IL SEME SI LEGGE IN UN POSTO SOLO, E QUEL POSTO È QUI.
     Cinque pagine scrivevano «parseInt(campo.value, 10) || 424242». Sembra
     innocuo e non lo è: in JavaScript lo zero è falso, quindi «0 || 424242»
     vale 424242. Chi scriveva 0 come seme otteneva, senza saperlo, la stessa
     identica sequenza di chi scriveva 424242 — dado per dado. Su IL-GESTO e
     su MONTECARLO, che leggevano il campo in un altro modo, lo zero funzionava
     e dava una sequenza sua: lo stesso numero voleva dire due cose diverse a
     seconda della pagina, e tutto il progetto si regge sul contrario.
     Trovato provando il simulatore il 10/09/2026.
     Sta qui, accanto al dado, perché è del dado che parla — e perché tutte le
     pagine che hanno un campo «seme» caricano già questo file. */
  function semeDa(valore, difetto) {
    var n = parseInt(valore, 10);
    return isFinite(n) ? n : (difetto === undefined ? 424242 : difetto);
  }

  globale.CasualePython = CasualePython;
  globale.semeDa = semeDa;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CasualePython: CasualePython, semeDa: semeDa };
  }

})(typeof window !== 'undefined' ? window : globalThis);
