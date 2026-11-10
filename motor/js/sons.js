/* Duelo de Saberes 2.0 · Sons do jogo (Fase 5)
   Tudo é gerado por código (Web Audio): não há arquivos de áudio, então funciona offline e não pesa.
   Cada tema pode trocar o som de um evento; o que o tema não define cai no conjunto "padrao".
   Uso: SONS.tocar("revelar"), SONS.definirTema("biologia"), SONS.ligar(false). */

window.SONS = (function () {
  "use strict";
  var ctx = null, saida = null, ligado = true, tema = "padrao", ruidoBuf = null;

  function audio() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      var comp = ctx.createDynamicsCompressor();
      saida = ctx.createGain();
      saida.gain.value = 0.55;
      saida.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* ---------- peças básicas ---------- */
  /* nota: oscilador com envelope. o = { t: atraso (s), f: frequência, f2: frequência final, d: duração, v: volume, tipo, a: ataque } */
  function nota(o) {
    var t0 = ctx.currentTime + (o.t || 0), d = o.d || 0.2, v = o.v === undefined ? 0.3 : o.v, a = o.a || 0.008;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.tipo || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.df || d));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    var destino = saida;
    if (o.filtro) {
      var fl = ctx.createBiquadFilter();
      fl.type = "lowpass"; fl.frequency.setValueAtTime(o.filtro, t0);
      if (o.filtro2) fl.frequency.exponentialRampToValueAtTime(o.filtro2, t0 + d);
      fl.connect(saida); destino = fl;
    }
    osc.connect(g); g.connect(destino);
    osc.start(t0); osc.stop(t0 + d + 0.05);
  }
  /* sopro: ruído filtrado. o = { t, d, v, f: frequência do filtro, f2, q, tipoFiltro } */
  function sopro(o) {
    if (!ruidoBuf) {
      ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var dados = ruidoBuf.getChannelData(0);
      for (var i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    }
    var t0 = ctx.currentTime + (o.t || 0), d = o.d || 0.2, v = o.v === undefined ? 0.2 : o.v;
    var src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = ruidoBuf; src.loop = true;
    fl.type = o.tipoFiltro || "bandpass"; fl.Q.value = o.q || 1;
    fl.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(fl); fl.connect(g); g.connect(saida);
    src.start(t0); src.stop(t0 + d + 0.05);
  }
  /* bolha: um "blup" que sobe de tom bem rápido */
  function bolha(t, f, v, d) {
    nota({ t: t, f: f, f2: f * 2.3, d: d || 0.11, df: (d || 0.11) * 0.8, v: v === undefined ? 0.28 : v, a: 0.004 });
  }
  /* sino: nota limpa com um harmônico, para os momentos de destaque */
  function sino(t, f, v, d) {
    nota({ t: t, f: f, d: d || 0.7, v: v === undefined ? 0.26 : v, tipo: "sine" });
    nota({ t: t, f: f * 2.01, d: (d || 0.7) * 0.6, v: (v === undefined ? 0.26 : v) * 0.35, tipo: "triangle" });
  }

  /* ---------- conjuntos de sons ---------- */
  var CONJUNTOS = {
    /* Palco e demais temas, até cada um ganhar o seu */
    padrao: {
      revelar: function () {
        sopro({ d: 0.45, v: 0.16, f: 500, f2: 3200, q: 0.8 });
        sino(0.42, 880, 0.24, 0.6); sino(0.52, 1318, 0.18, 0.7);
      },
      acertar: function () {
        [523, 659, 784, 1047].forEach(function (f, i) { nota({ t: i * 0.09, f: f, d: 0.35, v: 0.24, tipo: "triangle" }); });
        sino(0.4, 1047, 0.22, 0.9); sino(0.4, 1568, 0.14, 0.9);
      },
      errar: function () {
        nota({ f: 150, d: 0.5, v: 0.2, tipo: "square", filtro: 900 });
        nota({ f: 143, d: 0.5, v: 0.2, tipo: "square", filtro: 900 });
      },
      tique: function () { nota({ f: 900, d: 0.06, v: 0.22, tipo: "square", filtro: 2500 }); },
      tempo: function () {
        nota({ f: 196, d: 0.28, v: 0.22, tipo: "square", filtro: 1200 });
        nota({ t: 0.3, f: 147, d: 0.55, v: 0.22, tipo: "square", filtro: 1200 });
      },
      passe: function () { sopro({ d: 0.35, v: 0.18, f: 2600, f2: 500, q: 0.9 }); nota({ t: 0.28, f: 392, d: 0.25, v: 0.2, tipo: "triangle" }); },
      foco: function () { nota({ f: 1200, d: 0.04, v: 0.16, tipo: "square", filtro: 3000 }); },
      escolhida: function () { sino(0, 784, 0.24, 0.5); sino(0.14, 1175, 0.24, 0.8); }
    },

    /* Biologia: bolhas, gotas e batimento */
    biologia: {
      /* acompanha a mitose: a célula estica, borbulha, separa em duas e o valor aparece */
      revelar: function (op) {
        if (op && op.curto) { bolha(0, 320, 0.26); sino(0.12, 988, 0.22, 0.6); return; }
        nota({ f: 95, f2: 175, d: 2.1, v: 0.2, a: 0.3, tipo: "sine" });
        nota({ f: 190, f2: 340, d: 2.1, v: 0.05, a: 0.35, tipo: "triangle" });
        [0.45, 0.7, 0.95, 1.2, 1.42, 1.62, 1.8].forEach(function (t, i) { bolha(t, 380 + i * 65 + Math.random() * 60, 0.1); });
        sopro({ t: 1.4, d: 0.6, v: 0.06, f: 700, f2: 1900, q: 2 });
        bolha(2.02, 260, 0.3, 0.14); bolha(2.18, 330, 0.3, 0.14);
        sino(2.5, 784, 0.22, 0.7); sino(2.62, 1175, 0.2, 0.8);
      },
      acertar: function () {
        [523, 659, 784, 1047, 1319].forEach(function (f, i) { bolha(i * 0.08, f * 0.5, 0.24, 0.13); });
        sino(0.42, 1047, 0.2, 1); sino(0.42, 1319, 0.14, 1); sino(0.5, 1568, 0.12, 1);
      },
      errar: function () {
        nota({ f: 240, f2: 62, d: 0.55, v: 0.3, tipo: "sawtooth", filtro: 900, filtro2: 160 });
        sopro({ t: 0.02, d: 0.3, v: 0.12, f: 500, f2: 120, q: 1.5 });
        bolha(0.5, 110, 0.18, 0.16);
      },
      /* últimos segundos: batimento do coração */
      tique: function () {
        nota({ f: 78, f2: 46, d: 0.16, v: 0.5 });
        nota({ t: 0.2, f: 66, f2: 40, d: 0.2, v: 0.38 });
      },
      tempo: function () {
        nota({ f: 440, d: 0.9, v: 0.16, tipo: "sine", a: 0.02 });
        nota({ f: 220, f2: 80, d: 0.9, v: 0.2, tipo: "triangle", filtro: 800 });
      },
      /* a lâmina de vidro entra na platina */
      passe: function () {
        nota({ f: 2093, d: 0.25, v: 0.14 }); nota({ t: 0.05, f: 2794, d: 0.3, v: 0.1 });
        sopro({ t: 0.02, d: 0.22, v: 0.08, f: 4200, q: 3 });
      },
      /* o foco pula de uma célula para outra */
      foco: function () { sopro({ d: 0.035, v: 0.2, f: 2600, q: 2 }); bolha(0, 520 + Math.random() * 260, 0.12, 0.07); },
      /* a objetiva trava na célula sorteada */
      escolhida: function () {
        sopro({ d: 0.05, v: 0.3, f: 1500, q: 1 }); nota({ f: 180, d: 0.08, v: 0.3 });
        sino(0.12, 659, 0.22, 0.6); sino(0.26, 988, 0.24, 0.9);
      }
    }
  };

  function tocar(nome, op) {
    if (!ligado || !audio()) return;
    var fn = (CONJUNTOS[tema] && CONJUNTOS[tema][nome]) || CONJUNTOS.padrao[nome];
    if (!fn) return;
    try { fn(op); } catch (e) { /* sem som, o jogo segue */ }
  }

  /* o navegador só libera áudio depois de um toque: o primeiro clique ou tecla acorda o som */
  function acordar() { if (ligado) audio(); }
  document.addEventListener("pointerdown", acordar, { passive: true });
  document.addEventListener("keydown", acordar);

  return {
    tocar: tocar,
    definirTema: function (t) { tema = CONJUNTOS[t] ? t : "padrao"; },
    ligar: function (v) { ligado = !!v; },
    ligado: function () { return ligado; },
    eventos: function () { return Object.keys(CONJUNTOS.padrao); }
  };
})();
