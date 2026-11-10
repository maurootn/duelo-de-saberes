/* Duelo de Saberes 2.0 · Tema de Química (Fase 5)
   Pacote do tema: este arquivo + tema.css, na pasta temas/quimica/. O app carrega os dois sozinho
   quando disciplinas.json marca a Química com "tema": true.
   Universo: bancada de laboratório e vidrarias. O que este arquivo desenha:
   - a bancada ao fundo, com azulejos, vidrarias, bico de Bunsen aceso e moléculas flutuando;
   - a revelação da carta: um béquer borbulha no fogo, muda de cor e o valor sobe no vapor;
   - a tela do passe: a tabela periódica acende elemento por elemento e o sorteio corre entre as equipes;
   - os sons do universo (bolhas, chama, vidro), registrados em SONS.
   As cores e as animações ficam em tema.css. Todos os desenhos são originais. */

window.TEMAS = window.TEMAS || {};
window.TEMAS.quimica = (function () {
  "use strict";

  /* tempo que o béquer leva para revelar o valor, antes de a pergunta abrir */
  var REVELACAO_MS = 3100;

  /* ---------- fundo: bancada de laboratório ---------- */
  var VIDRO = 'fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"';
  var PECAS = {
    erlenmeyer:
      '<svg viewBox="0 0 80 110"><path d="M30 6h20M33 6v34L8 98q-3 8 6 8h52q9 0 6-8L47 40V6" ' + VIDRO + '/>' +
      '<path d="M17 80h46l7 16q2 6-5 6H15q-7 0-5-6Z" class="qm-liq-a"/><path d="M24 62h32" stroke="currentColor" stroke-width="1.4" opacity=".6"/>' +
      '<g class="qm-bolhas"><circle cx="34" cy="92" r="2.4"/><circle cx="46" cy="88" r="1.8"/><circle cx="40" cy="96" r="1.5"/></g></svg>',
    balao:
      '<svg viewBox="0 0 80 120"><path d="M34 4h12M36 4v44a30 30 0 1 0 8 0V4" ' + VIDRO + '/>' +
      '<path d="M15 86a26 26 0 0 0 50 0Z" class="qm-liq-b"/><path d="M36 22h8" stroke="currentColor" stroke-width="1.6"/>' +
      '<g class="qm-bolhas"><circle cx="34" cy="100" r="2"/><circle cx="46" cy="96" r="2.6"/></g></svg>',
    tubos:
      '<svg viewBox="0 0 120 110"><g ' + VIDRO + '><path d="M18 14v70a8 8 0 0 0 16 0V14"/><path d="M48 14v70a8 8 0 0 0 16 0V14"/><path d="M78 14v70a8 8 0 0 0 16 0V14"/></g>' +
      '<path d="M18 56v28a8 8 0 0 0 16 0V56Z" class="qm-liq-a"/><path d="M48 44v40a8 8 0 0 0 16 0V44Z" class="qm-liq-b"/><path d="M78 64v20a8 8 0 0 0 16 0V64Z" class="qm-liq-c"/>' +
      '<path d="M6 40h108M6 48h108M14 48v58M106 48v58M6 106h108" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".75"/></svg>',
    bequer:
      '<svg viewBox="0 0 90 100"><path d="M10 8h66l-4 4v80q0 4-4 4H18q-4 0-4-4V12Z" ' + VIDRO + '/>' +
      '<path d="M16 54h56v38q0 2-2 2H18q-2 0-2-2Z" class="qm-liq-c"/>' +
      '<path d="M60 24h10M62 38h8M60 52h10M62 66h8" stroke="currentColor" stroke-width="1.5" opacity=".7"/></svg>',
    bunsen:
      '<svg viewBox="0 0 70 120"><g class="qm-chama"><path d="M35 8q14 18 8 34q-3 8-8 8t-8-8q-6-16 8-34Z" class="qm-fogo-1"/><path d="M35 22q7 10 4 20q-1 5-4 5t-4-5q-3-10 4-20Z" class="qm-fogo-2"/></g>' +
      '<path d="M29 52h12v44h-12Z" fill="currentColor" fill-opacity=".45" stroke="currentColor" stroke-width="2"/><path d="M41 80h14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M14 112q0-16 21-16t21 16Z" fill="currentColor" fill-opacity=".45" stroke="currentColor" stroke-width="2"/></svg>',
    hexagono:
      '<svg viewBox="0 0 100 100"><path d="M50 8 86 29v42L50 92 14 71V29Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 22 74 36v28L50 78 26 64V36Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 5"/>' +
      '<g fill="currentColor"><circle cx="50" cy="8" r="5"/><circle cx="86" cy="29" r="5"/><circle cx="86" cy="71" r="5"/><circle cx="50" cy="92" r="5"/><circle cx="14" cy="71" r="5"/><circle cx="14" cy="29" r="5"/></g></svg>',
    agua:
      '<svg viewBox="0 0 100 80"><path d="M50 30 20 60M50 30 80 60" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="30" r="16" class="qm-atomo-o"/><circle cx="20" cy="60" r="10" fill="currentColor"/><circle cx="80" cy="60" r="10" fill="currentColor"/></svg>',
    gas:
      '<svg viewBox="0 0 120 50"><path d="M24 25h72" stroke="currentColor" stroke-width="4"/><path d="M24 17h72M24 33h72" stroke="currentColor" stroke-width="2" opacity=".6"/><circle cx="60" cy="25" r="13" fill="currentColor"/><circle cx="18" cy="25" r="12" class="qm-atomo-o"/><circle cx="102" cy="25" r="12" class="qm-atomo-o"/></svg>'
  };
  /* bancada: [peça, posição horizontal (%), largura (rem)] */
  var BANCADA = [["tubos", 2, 7.5], ["erlenmeyer", 11, 5], ["bunsen", 17.5, 3.6], ["balao", 80, 4.6], ["bequer", 87, 5.4], ["erlenmeyer", 93.5, 4.2]];
  /* moléculas flutuando: [peça, x (%), y (%), largura (rem), duração da deriva (s)] */
  var MOLECULAS = [["hexagono", 6, 12, 5, 44], ["agua", 32, 6, 4.5, 38], ["gas", 66, 10, 6, 50], ["hexagono", 90, 30, 4, 41],
    ["agua", 22, 44, 3.5, 47], ["gas", 52, 52, 5, 36], ["hexagono", 74, 60, 4.5, 55], ["agua", 92, 64, 3.6, 39]];
  function fundo() {
    var agora = Date.now() / 1000;
    var h = '<div class="qm-lab" aria-hidden="true"><div class="qm-azulejo"></div><div class="qm-luz"></div>';
    MOLECULAS.forEach(function (m, i) {
      h += '<span class="qm-mol" style="left:' + m[1] + '%;top:' + m[2] + '%;width:' + m[3] + 'rem;--t:' + m[4] + 's;animation-delay:-' + (agora % m[4]).toFixed(2) + 's;--k:' + (i % 3) + '">' + PECAS[m[0]] + '</span>';
    });
    h += '<div class="qm-bancada"></div>';
    BANCADA.forEach(function (b) {
      h += '<span class="qm-vidraria" style="left:' + b[1] + '%;width:' + b[2] + 'rem">' + PECAS[b[0]] + '</span>';
    });
    return h + '</div>';
  }

  /* ---------- revelação: béquer no fogo ---------- */
  function camadaBequer(valor) {
    var bolhas = "";
    for (var i = 0; i < 14; i++) {
      var x = 76 + Math.random() * 48, r = 1.6 + Math.random() * 3;
      bolhas += '<circle cx="' + x.toFixed(1) + '" cy="136" r="' + r.toFixed(1) + '" style="--a:' + (0.35 + Math.random() * 1.5).toFixed(2) + 's;--v:' + (0.45 + Math.random() * 0.4).toFixed(2) + 's"/>';
    }
    var vapor = "";
    [[88, 0], [104, .12], [96, .25], [112, .36], [92, .5], [106, .62]].forEach(function (v, i) {
      vapor += '<circle cx="' + v[0] + '" cy="58" r="' + (9 + (i % 3) * 3) + '" style="--a:' + (1.55 + v[1]).toFixed(2) + 's"/>';
    });
    return '<span class="bequer" aria-hidden="true"><svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">' +
      '<defs><clipPath id="qm-dentro"><path d="M70 62h60v72q0 6-6 6H76q-6 0-6-6Z"/></clipPath>' +
      '<radialGradient id="qm-brilho" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE3B0" stop-opacity=".9"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse class="bq-aura" cx="100" cy="112" rx="70" ry="44" fill="url(#qm-brilho)"/>' +
      '<g class="bq-fogo"><path d="M86 150q2-12 8-16q-1 8 6 12q5-10 2-20q10 8 10 24Z"/><path class="bq-fogo-2" d="M92 150q2-8 6-10q1 6 4 6q2-5 1-10q6 6 5 14Z"/></g>' +
      '<g clip-path="url(#qm-dentro)"><rect class="bq-liquido" x="66" y="96" width="68" height="50"/>' +
        '<path class="bq-onda" d="M60 96q10-4 20 0t20 0t20 0t20 0v8H60Z"/>' +
        '<g class="bq-bolhas">' + bolhas + '</g></g>' +
      '<path class="bq-vidro" d="M64 58h72l-4 4v72q0 8-8 8H76q-8 0-8-8V62Z"/>' +
      '<path class="bq-escala" d="M118 78h8M120 90h6M118 102h8M120 114h6M118 126h8"/>' +
      '<path class="bq-reflexo" d="M74 68v60"/>' +
      '<g class="bq-vapor">' + vapor + '</g>' +
      '<text class="bq-valor" x="100" y="40" text-anchor="middle">' + valor + '</text>' +
      '</svg></span>';
  }
  function revelar(carta, tabuleiro, reduzir) {
    if (!carta || reduzir) return;
    var a = carta.getBoundingClientRect(), b = tabuleiro.getBoundingClientRect();
    var escala = Math.max(1.15, Math.min(2.6, (b.height * 0.62) / a.height, (b.width * 0.8) / a.width));
    carta.style.setProperty("--qm-x", ((b.left + b.width / 2) - (a.left + a.width / 2)).toFixed(1) + "px");
    carta.style.setProperty("--qm-y", ((b.top + b.height / 2) - (a.top + a.height / 2)).toFixed(1) + "px");
    carta.style.setProperty("--qm-e", escala.toFixed(3));
    var v = carta.querySelector(".carta-valor");
    carta.insertAdjacentHTML("beforeend", camadaBequer(v ? v.textContent : ""));
    carta.classList.add("no-bequer");
  }

  /* ---------- passe: tabela periódica ---------- */
  /* posição de cada elemento (sem lantanídeos e actinídeos): [período, grupo], em ordem de número atômico */
  var POS = (function () {
    var p = [[1, 1], [1, 18]];
    [2, 3].forEach(function (per) { p.push([per, 1], [per, 2]); for (var g = 13; g <= 18; g++) p.push([per, g]); });
    [4, 5, 6, 7].forEach(function (per) { for (var g = 1; g <= 18; g++) p.push([per, g]); });
    return p;
  })();
  function simbolo(nome) {
    var partes = String(nome).replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "?";
    if (partes.length > 1) return (partes[0][0] + partes[1][0]).toUpperCase().replace(/^(.)(.)$/, function (_, a, b) { return a + b.toLowerCase(); });
    return partes[0][0].toUpperCase() + (partes[0][1] || "").toLowerCase();
  }
  /* equipes: [{ nome, cor, ficha }] · foco: índice da equipe acesa (ou null) · classe: "pequeno" depois do sorteio */
  function tabela(equipes, foco, classe, etiqueta) {
    var h = '<div class="tp ' + (classe || "") + (foco !== null && foco !== undefined ? " parado" : "") + '">' +
      '<div class="tp-grade">';
    POS.forEach(function (q, k) {
      h += '<i class="tp-el" style="grid-row:' + q[0] + ';grid-column:' + q[1] + ';--n:' + k + '"></i>';
    });
    h += '<div class="tp-equipes n' + equipes.length + '">';
    equipes.forEach(function (e, k) {
      h += '<span class="tp-equipe' + (k === foco ? " acesa" : "") + '" style="--cor-equipe:' + e.cor + ';--k:' + k + '">' +
        '<b class="tp-num">' + (k + 1) + '</b><span class="tp-ficha">' + e.ficha + '</span>' +
        '<strong class="tp-sim">' + simbolo(e.nome) + '</strong><span class="tp-nome">' + e.nome + '</span></span>';
    });
    h += '</div>' +
      '<span class="tp-legenda" aria-hidden="true">' + String(etiqueta || "Passe").replace(/<br>/g, " · ") + '</span>' +
      '</div></div>';
    return h;
  }
  /* a luz pula de equipe em equipe, desacelera e para na sorteada */
  function sortear(raiz, alvo, op) {
    var tp = raiz.querySelector(".tp"), fim = op.aoFim || function () {};
    if (!tp) { fim(); return; }
    var eqs = tp.querySelectorAll(".tp-equipe"), n = eqs.length;
    function acender(k) { for (var i = 0; i < n; i++) eqs[i].classList.toggle("acesa", i === k); }
    function travar() {
      if (!op.vivo()) return;
      tp.classList.remove("sorteando"); tp.classList.add("parado", "travou");
      acender(alvo);
      if (op.aoTravar) op.aoTravar();
      setTimeout(function () { if (op.vivo()) fim(); }, op.reduzir ? 200 : 1100);
    }
    if (op.reduzir || n < 2) { travar(); return; }
    var inicio = Math.floor(Math.random() * n), passos = 2 * n + ((alvo - inicio + n) % n), k = 0;
    while (passos < 10) passos += n;
    tp.classList.add("sorteando");
    function passo() {
      if (!op.vivo()) return;
      if (k >= passos) { travar(); return; }
      var p = k / passos;
      acender((inicio + k) % n);
      if (op.aoPasso) op.aoPasso();
      k++;
      setTimeout(passo, 110 + Math.pow(p, 2.4) * 560);
    }
    passo();
  }

  /* ---------- sons: bolhas, chama e vidro ---------- */
  var P = window.SONS.pecas, nota = P.nota, sopro = P.sopro, bolha = P.bolha, sino = P.sino;
  /* vidro: toque limpo com parciais inarmônicas, como um béquer batendo */
  function vidro(t, f, v) {
    nota({ t: t, f: f, d: 0.7, v: v });
    nota({ t: t, f: f * 2.76, d: 0.35, v: v * 0.4 });
    nota({ t: t, f: f * 5.4, d: 0.16, v: v * 0.2 });
  }
  window.SONS.registrar("quimica", {
    /* acompanha o béquer: fogo acendendo, fervura crescendo, vapor subindo e o valor aparecendo */
    revelar: function (op) {
      if (op && op.curto) { bolha(0, 300, 0.24); vidro(0.1, 1568, 0.2); return; }
      sopro({ t: 0.3, d: 2.2, v: 0.14, f: 300, f2: 700, q: 0.6, tipoFiltro: "lowpass", a: 0.4 });
      for (var i = 0; i < 22; i++) { var t = 0.45 + Math.pow(i / 22, 0.8) * 1.6; bolha(t, 260 + Math.random() * 420, 0.08 + i * 0.004, 0.09); }
      sopro({ t: 1.3, d: 0.6, v: 0.05, f: 2500, f2: 5200, q: 4 });
      sopro({ t: 1.8, d: 0.8, v: 0.14, f: 600, f2: 3600, q: 0.8 });
      vidro(2.55, 1319, 0.2); vidro(2.68, 1976, 0.16);
    },
    acertar: function () {
      [1047, 1319, 1568, 2093].forEach(function (f, i) { vidro(i * 0.09, f, 0.16); });
      [0.1, 0.18, 0.26, 0.34].forEach(function (t, i) { bolha(t, 500 + i * 120, 0.12, 0.08); });
    },
    /* errou: a reação "chia" e apaga */
    errar: function () {
      sopro({ d: 0.7, v: 0.22, f: 3000, f2: 300, q: 0.7 });
      nota({ t: 0.05, f: 200, f2: 60, d: 0.5, v: 0.26, tipo: "sawtooth", filtro: 700, filtro2: 120 });
    },
    /* últimos segundos: gota caindo de uma bureta */
    tique: function () {
      nota({ f: 1500, f2: 520, d: 0.09, df: 0.06, v: 0.3 });
      bolha(0.06, 220, 0.16, 0.08);
    },
    tempo: function () {
      sopro({ d: 0.8, v: 0.2, f: 1600, f2: 200, q: 0.6, tipoFiltro: "lowpass" });
      nota({ t: 0.1, f: 330, f2: 110, d: 0.8, v: 0.18, tipo: "triangle" });
    },
    /* passe: dois vidros brindando */
    passe: function () { vidro(0, 1760, 0.2); vidro(0.12, 2349, 0.16); },
    /* sorteio do passe: a lâmpada de cada elemento acende */
    foco: function () {
      nota({ f: 1760, d: 0.05, v: 0.14, tipo: "square", filtro: 4000 });
      sopro({ d: 0.04, v: 0.12, f: 6000, q: 2 });
    },
    /* a equipe sorteada pega fogo como num teste de chama */
    escolhida: function () {
      sopro({ d: 0.6, v: 0.26, f: 200, f2: 1600, q: 0.5, tipoFiltro: "lowpass", a: 0.04 });
      sino(0.2, 784, 0.2, 0.6); vidro(0.32, 1568, 0.2);
    }
  });

  return {
    id: "quimica", nome: "Química",
    /* duas opções de fonte para os títulos; os textos continuam em Atkinson */
    fontes: [{ id: "a", nome: "Russo One" }, { id: "b", nome: "Chakra Petch" }],
    revelacaoMs: REVELACAO_MS,
    fundo: fundo,
    revelar: revelar,
    passe: tabela,
    sortear: sortear
  };
})();
