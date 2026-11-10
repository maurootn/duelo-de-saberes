/* Duelo de Saberes 2.0 · Sons do jogo (Fase 5)
   Tudo é gerado por código (Web Audio): não há arquivos de áudio, então funciona offline e não pesa.
   Cada tema registra, no próprio arquivo (temas/<id>/tema.js), os sons do seu universo; o que o tema não define
   cai no conjunto "padrao" (especiais, marcador e roletas ficam sempre no padrão, iguais em todos os temas).
   Uso: SONS.tocar("revelar"), SONS.definirTema("biologia"), SONS.ligar(false), SONS.volume(0.4). */

window.SONS = (function () {
  "use strict";
  var ctx = null, saida = null, ligado = true, tema = "padrao", ruidoBuf = null, volume = 1;  /* volume: 1 normal, 0.4 "mais baixos" (Fase 7) */

  function audio() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      var comp = ctx.createDynamicsCompressor();
      saida = ctx.createGain();
      saida.gain.value = 0.55 * volume;
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
      escolhida: function () { sino(0, 784, 0.24, 0.5); sino(0.14, 1175, 0.24, 0.8); },

      /* sorteio de carta: o marcador estala a cada carta; o tom cai um pouco conforme desacelera.
         op.p = quanto do sorteio já andou (0 a 1) */
      marcador: function (op) {
        var p = op && op.p || 0, f = 1500 - p * 600;
        nota({ f: f, f2: f * 0.7, d: 0.05, df: 0.04, v: 0.2 + p * 0.08, tipo: "square", filtro: 3200 });
        nota({ f: f / 2, d: 0.04, v: 0.1, tipo: "triangle" });
      },
      /* catraca das roletas: um estalo seco a cada fatia que passa pelo ponteiro */
      catraca: function () {
        sopro({ d: 0.03, v: 0.28, f: 3000, q: 1.5 });
        nota({ f: 520 + Math.random() * 60, f2: 300, d: 0.035, v: 0.14, tipo: "square", filtro: 2000 });
      },
      /* roleta de punição: "fom-fom-fom" de derrota, ou alívio no Escapou */
      punicao: function () {
        [392, 370, 349, 294].forEach(function (f, i) {
          nota({ t: i * 0.26, f: f, f2: i === 3 ? f * 0.85 : 0, d: i === 3 ? 0.7 : 0.24, v: 0.2, tipo: "sawtooth", filtro: 1300 });
        });
      },
      escapou: function () { sopro({ d: 0.5, v: 0.12, f: 700, f2: 300, q: 0.7 }); sino(0.2, 1047, 0.2, 0.6); sino(0.3, 1319, 0.18, 0.8); },

      /* ---------- especiais: o mesmo som em todos os temas, para a turma reconhecer na hora ---------- */
      /* Armadilha Congelou!: vento gelado, cristais tilintando e o gelo trincando */
      "esp-congelou": function () {
        sopro({ d: 1.6, v: 0.12, f: 900, f2: 2600, q: 0.6, a: 0.3 });
        [2637, 3136, 2794, 3520, 2349, 3951, 2960].forEach(function (f, i) { nota({ t: 0.15 + i * 0.12, f: f, d: 0.5, v: 0.08, tipo: "sine" }); });
        [0.9, 1.05, 1.25].forEach(function (t, i) {
          sopro({ t: t, d: 0.09, v: 0.35 - i * 0.06, f: 2400 - i * 300, q: 0.8, tipoFiltro: "highpass" });
          nota({ t: t, f: 180 - i * 30, f2: 60, d: 0.12, v: 0.2, tipo: "square", filtro: 900 });
        });
      },
      /* Armadilha Tudo ou Nada: sirene de alarme e fogo crepitando */
      "esp-tudo": function () {
        for (var i = 0; i < 4; i++) {
          nota({ t: i * 0.42, f: 660, f2: 990, d: 0.21, df: 0.2, v: 0.14, tipo: "square", filtro: 2400, a: 0.02 });
          nota({ t: i * 0.42 + 0.21, f: 990, f2: 660, d: 0.21, df: 0.2, v: 0.14, tipo: "square", filtro: 2400, a: 0.02 });
        }
        sopro({ t: 0.1, d: 1.7, v: 0.16, f: 500, f2: 1400, q: 0.5, a: 0.4 });
        for (var k = 0; k < 14; k++) sopro({ t: 0.2 + Math.random() * 1.5, d: 0.03, v: 0.22, f: 2500 + Math.random() * 2000, q: 2 });
      },
      /* Bônus Em Dobro: brilho subindo e chuva de moedas */
      "esp-dobro": function () {
        sopro({ d: 0.6, v: 0.1, f: 1500, f2: 7000, q: 1 });
        [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { nota({ t: i * 0.06, f: f, d: 0.3, v: 0.14, tipo: "triangle" }); });
        for (var i = 0; i < 16; i++) {
          var t = 0.45 + i * 0.09 + Math.random() * 0.05, f = 2200 + Math.random() * 1600;
          nota({ t: t, f: f, d: 0.22, v: 0.11, tipo: "sine" }); nota({ t: t, f: f * 1.5, d: 0.14, v: 0.05, tipo: "sine" });
        }
      },
      /* Bônus Tesoura: duas tesouradas e o poder voando para o placar */
      "esp-tesoura": function () {
        [0.15, 0.55].forEach(function (t) {
          sopro({ t: t, d: 0.06, v: 0.35, f: 5200, q: 2.5 });
          sopro({ t: t + 0.07, d: 0.12, v: 0.25, f: 3600, f2: 2400, q: 3 });
          nota({ t: t + 0.07, f: 1900, f2: 1300, d: 0.08, v: 0.12, tipo: "square", filtro: 4000 });
        });
        sopro({ t: 1.05, d: 0.7, v: 0.12, f: 600, f2: 4000, q: 1.2 });
        sino(1.55, 1319, 0.2, 0.7); sino(1.65, 1760, 0.16, 0.8);
      },
      /* consequências: errou na Congelou, errou na Tudo ou Nada, acertou no Em Dobro, ganhou a Tesoura */
      congelado: function () {
        nota({ f: 1200, f2: 300, d: 0.5, v: 0.14, tipo: "sine" });
        sopro({ t: 0.1, d: 0.12, v: 0.4, f: 2200, q: 0.8, tipoFiltro: "highpass" });
        nota({ t: 0.1, f: 140, f2: 50, d: 0.3, v: 0.25, tipo: "square", filtro: 700 });
        [3136, 2637, 2349].forEach(function (f, i) { nota({ t: 0.3 + i * 0.1, f: f, d: 0.6, v: 0.07 }); });
      },
      tudoperdido: function () {
        nota({ f: 110, f2: 38, d: 1.1, v: 0.45, tipo: "sine", a: 0.01 });
        sopro({ d: 1.2, v: 0.4, f: 1200, f2: 90, q: 0.4, tipoFiltro: "lowpass" });
        nota({ t: 0.05, f: 300, f2: 70, d: 0.6, v: 0.18, tipo: "sawtooth", filtro: 700 });
      },
      moedas: function () {
        for (var i = 0; i < 12; i++) {
          var t = i * 0.07, f = 2000 + Math.random() * 1500;
          nota({ t: t, f: f, d: 0.25, v: 0.12 }); nota({ t: t + 0.01, f: f * 1.48, d: 0.15, v: 0.06 });
        }
        [784, 1047, 1319, 1568].forEach(function (f, i) { nota({ t: 0.85 + i * 0.07, f: f, d: 0.4, v: 0.16, tipo: "triangle" }); });
      },
      poder: function () {
        nota({ f: 330, f2: 1320, d: 0.7, v: 0.16, tipo: "triangle" });
        sopro({ d: 0.7, v: 0.1, f: 800, f2: 5000, q: 1.5 });
        sino(0.6, 1319, 0.22, 0.8); sino(0.7, 1976, 0.16, 0.9);
      },
      /* a Tesoura em uso: tesouradas cortando as alternativas */
      corte: function (op) {
        var n = op && op.n || 1;
        for (var i = 0; i < n; i++) {
          var t = 0.1 + i * 0.32;
          sopro({ t: t, d: 0.05, v: 0.35, f: 5200, q: 2.5 });
          sopro({ t: t + 0.06, d: 0.1, v: 0.22, f: 3400, f2: 2200, q: 3 });
        }
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
    /* cada tema registra os sons do seu universo (em temas/<id>/tema.js); o que não registrar usa o padrão */
    registrar: function (id, conjunto) { CONJUNTOS[id] = conjunto; },
    /* peças para os temas montarem seus sons */
    pecas: { nota: nota, sopro: sopro, bolha: bolha, sino: sino },
    ligar: function (v) { ligado = !!v; },
    volume: function (v) { volume = Math.min(1, Math.max(0.05, Number(v) || 1)); if (saida) saida.gain.value = 0.55 * volume; },
    ligado: function () { return ligado; },
    eventos: function () { return Object.keys(CONJUNTOS.padrao); }
  };
})();
