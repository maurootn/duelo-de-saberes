/* Duelo de Saberes 2.0 · Tema de Biologia (Fase 5)
   Pacote do tema: este arquivo + tema.css, na pasta temas/biologia/. O app carrega os dois sozinho
   quando disciplinas.json marca a Biologia com "tema": true.
   Universo: microscopia e células. O que este arquivo desenha:
   - o campo do microscópio ao fundo, com microrganismos à deriva;
   - a revelação da carta: a célula se divide em mitose e mostra o valor;
   - a tela do passe: lâmina sob o microscópio, com o sorteio no campo de visão.
   - os sons do universo (bolhas, gotas, batimento), registrados em SONS.
   As cores e as animações ficam em tema.css. Todos os desenhos são originais. */

window.TEMAS = window.TEMAS || {};
window.TEMAS.biologia = (function () {
  "use strict";

  /* tempo que a carta leva para se dividir e mostrar o valor, antes de a pergunta abrir */
  var REVELACAO_MS = 3100;

  /* ---------- fundo: campo do microscópio ---------- */
  var SERES = {
    paramecio:
      '<svg viewBox="0 0 120 60"><ellipse cx="60" cy="30" rx="52" ry="22" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="1 5" stroke-linecap="round" opacity=".7"/>' +
      '<ellipse cx="60" cy="30" rx="47" ry="17" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="2"/>' +
      '<ellipse cx="46" cy="29" rx="9" ry="6" class="bio-cor"/><circle cx="80" cy="33" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M60 16q9 9 3 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    diatomacea:
      '<svg viewBox="0 0 120 40"><path d="M4 20Q60-14 116 20Q60 54 4 20Z" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M12 20H108M30 11V29M42 7V33M54 5V35M66 5V35M78 7V33M90 11V29" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".8"/></svg>',
    bacilos:
      '<svg viewBox="0 0 100 70"><g fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="2">' +
      '<rect x="6" y="10" width="38" height="14" rx="7" transform="rotate(14 25 17)"/><rect x="50" y="26" width="40" height="14" rx="7" transform="rotate(-18 70 33)"/>' +
      '<rect x="16" y="46" width="36" height="14" rx="7" transform="rotate(-6 34 53)"/></g></svg>',
    cocos:
      '<svg viewBox="0 0 120 50"><g class="bio-cor" stroke="currentColor" stroke-width="1.6"><circle cx="14" cy="30" r="9"/><circle cx="32" cy="22" r="9"/>' +
      '<circle cx="51" cy="26" r="9"/><circle cx="69" cy="19" r="9"/><circle cx="88" cy="24" r="9"/><circle cx="105" cy="32" r="9"/></g></svg>',
    euglena:
      '<svg viewBox="0 0 130 50"><path d="M100 25q14-18 26-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M6 25Q30 2 70 10Q100 16 102 25Q100 34 70 40Q30 48 6 25Z" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="86" cy="22" r="3.5" class="bio-cor"/><ellipse cx="42" cy="22" rx="8" ry="4" fill="currentColor" fill-opacity=".5"/><ellipse cx="56" cy="31" rx="8" ry="4" fill="currentColor" fill-opacity=".5"/></svg>',
    ameba:
      '<svg viewBox="0 0 110 90"><path d="M30 12q14-10 26 2q10 10 24 2q16-6 20 10q4 14-10 22q-10 8-2 20q6 14-10 16q-16 2-22-10q-6-10-18-4q-18 8-26-8q-8-16 8-24q10-6 4-16q-2-6 6-10Z" fill="currentColor" fill-opacity=".24" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="56" cy="44" r="11" class="bio-cor"/><circle cx="34" cy="56" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="78" cy="30" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    celula:
      '<svg viewBox="0 0 90 90"><circle cx="45" cy="45" r="40" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="2.4"/>' +
      '<circle cx="50" cy="42" r="14" class="bio-cor"/><ellipse cx="26" cy="56" rx="8" ry="4" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(-30 26 56)"/>' +
      '<circle cx="30" cy="28" r="3" fill="currentColor"/><circle cx="62" cy="66" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    espirilo:
      '<svg viewBox="0 0 120 30"><path d="M4 15q9-18 18 0t18 0t18 0t18 0t18 0t18 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".75"/></svg>'
  };
  /* posição (% da tela), tamanho (rem), giro inicial e duração da deriva de cada microrganismo */
  var CAMPO = [
    ["ameba", 6, 16, 7.5, -12, 46], ["diatomacea", 30, 7, 7, 18, 38], ["cocos", 62, 12, 6.5, -8, 52], ["paramecio", 86, 22, 8, 24, 41],
    ["celula", 12, 62, 5.5, 0, 57], ["bacilos", 44, 46, 5.5, 30, 44], ["euglena", 74, 58, 8, -20, 36], ["espirilo", 92, 78, 6, 12, 49],
    ["diatomacea", 22, 88, 6, -28, 54], ["celula", 56, 84, 4.5, 0, 43], ["bacilos", 4, 40, 4.5, -40, 61], ["cocos", 38, 26, 5, 34, 47],
    ["espirilo", 68, 34, 5, -16, 40]
  ];
  function fundo() {
    var agora = Date.now() / 1000;
    var h = '<div class="bio-campo" aria-hidden="true"><div class="bio-luz"></div>';
    CAMPO.forEach(function (s, i) {
      /* o atraso negativo amarra a deriva ao relógio: redesenhar a tela não faz os seres pularem de lugar */
      h += '<span class="bio-ser" style="left:' + s[1] + '%;top:' + s[2] + '%;width:' + s[3] + 'rem;--g:' + s[4] + 'deg;--t:' + s[5] + 's;animation-delay:-' + (agora % s[5]).toFixed(2) + 's;--k:' + (i % 3) + '">' + SERES[s[0]] + '</span>';
    });
    h += '<svg class="bio-reticulo" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"><circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" stroke-width=".5"/>' +
      '<path d="M100 2V14M100 186V198M2 100H14M186 100H198" stroke="currentColor" stroke-width=".8"/></svg>' +
      '<div class="bio-escala"><i></i><span>10 µm</span></div></div>';
    return h;
  }

  /* ---------- revelação: mitose ---------- */
  /* quatro cromossomos alinhados no equador; cada um tem duas cromátides, que vão para polos opostos */
  var Y_CROM = [36, 62, 88, 114];
  function camadaMitose() {
    var crom = "", fuso = "";
    Y_CROM.forEach(function (y, i) {
      crom += '<g class="mt-par" style="--r:' + [38, -52, 64, -30][i] + 'deg;--dx:' + [-16, 20, 12, -22][i] + 'px">' +
        '<path class="mt-crom mt-vai-e" d="M99 ' + (y - 9) + 'q-9 9 0 18"/><path class="mt-crom mt-vai-d" d="M101 ' + (y - 9) + 'q9 9 0 18"/></g>';
      fuso += '<path d="M24 75Q62 ' + y + ' 100 ' + y + 'Q138 ' + y + ' 176 75"/>';
    });
    return '<span class="mitose" aria-hidden="true"><svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">' +
      '<defs><radialGradient id="mt-cito" cx=".5" cy=".38" r=".7"><stop offset="0" class="mt-cito-1"/><stop offset="1" class="mt-cito-2"/></radialGradient>' +
      '<radialGradient id="mt-nuc" cx=".35" cy=".3" r=".8"><stop offset="0" class="mt-nuc-1"/><stop offset="1" class="mt-nuc-2"/></radialGradient></defs>' +
      /* membranas primeiro e citoplasmas depois: enquanto as duas metades se sobrepõem, o contorno é um só */
      '<ellipse class="mt-memb mt-cel-e" cx="100" cy="75" rx="96" ry="71"/><ellipse class="mt-memb mt-cel-d" cx="100" cy="75" rx="96" ry="71"/>' +
      '<ellipse class="mt-cito mt-cel-e" cx="100" cy="75" rx="90" ry="65" fill="url(#mt-cito)"/><ellipse class="mt-cito mt-cel-d" cx="100" cy="75" rx="90" ry="65" fill="url(#mt-cito)"/>' +
      '<g class="mt-organelas"><ellipse cx="42" cy="48" rx="11" ry="6" transform="rotate(-24 42 48)"/><ellipse cx="160" cy="98" rx="11" ry="6" transform="rotate(-30 160 98)"/>' +
        '<circle cx="46" cy="104" r="7"/><circle cx="154" cy="46" r="6"/><circle cx="72" cy="122" r="3"/><circle cx="128" cy="26" r="3"/></g>' +
      '<g class="mt-fuso">' + fuso + '<circle cx="24" cy="75" r="3.5"/><circle cx="176" cy="75" r="3.5"/></g>' +
      '<circle class="mt-nucleo" cx="100" cy="75" r="27" fill="url(#mt-nuc)"/>' +
      '<g class="mt-cromossomos">' + crom + '</g>' +
      '<circle class="mt-filho mt-filho-e" cx="42" cy="75" r="17" fill="url(#mt-nuc)"/><circle class="mt-filho mt-filho-d" cx="158" cy="75" r="17" fill="url(#mt-nuc)"/>' +
      '</svg></span>';
  }
  /* leva a carta ao centro do tabuleiro, amplia e põe a camada da mitose por cima */
  function revelar(carta, tabuleiro, reduzir) {
    if (!carta || reduzir) return;
    var a = carta.getBoundingClientRect(), b = tabuleiro.getBoundingClientRect();
    var escala = Math.min(2.6, (b.height * 0.62) / a.height, (b.width * 0.8) / a.width);
    escala = Math.max(1.15, escala);
    carta.style.setProperty("--mt-x", ((b.left + b.width / 2) - (a.left + a.width / 2)).toFixed(1) + "px");
    carta.style.setProperty("--mt-y", ((b.top + b.height / 2) - (a.top + a.height / 2)).toFixed(1) + "px");
    carta.style.setProperty("--mt-e", escala.toFixed(3));
    carta.insertAdjacentHTML("beforeend", camadaMitose());
    carta.classList.add("em-mitose");
  }

  /* ---------- passe: lâmina sob o microscópio ---------- */
  function posicao(k, n) {
    if (n <= 1) return [0, 0];
    var raio = n === 2 ? 0.22 : 0.27, ang = (-90 + k * 360 / n) * Math.PI / 180;
    return [raio * Math.cos(ang), raio * Math.sin(ang)];
  }
  /* tela do passe. celulas: [{ nome, cor, ficha }] · foco: índice da célula em foco (ou null) · classe: "pequeno" depois do sorteio */
  function microscopio(celulas, foco, classe, etiqueta) {
    var n = celulas.length, estilo = "";
    if (foco !== null && foco !== undefined && celulas[foco]) {
      var p = posicao(foco, n);
      estilo = ' style="--fx:' + p[0].toFixed(4) + ';--fy:' + p[1].toFixed(4) + ';--zoom:' + (n > 1 ? 2.1 : 1.7) + '"';
    }
    var h = '<div class="micro ' + (classe || "") + (estilo ? " parado" : "") + '"' + estilo + '>' +
      '<div class="micro-lamina" aria-hidden="true"><span class="micro-etiqueta">' + (etiqueta || "Passe") + '</span></div>' +
      '<div class="micro-campo"><div class="micro-plano">' +
        '<i class="micro-po" style="left:18%;top:30%"></i><i class="micro-po" style="left:72%;top:22%"></i><i class="micro-po" style="left:80%;top:70%"></i><i class="micro-po" style="left:30%;top:78%"></i><i class="micro-po" style="left:52%;top:50%"></i>';
    celulas.forEach(function (c, k) {
      var q = posicao(k, n);
      h += '<span class="micro-celula' + (k === foco ? " em-foco" : "") + '" data-fx="' + q[0].toFixed(4) + '" data-fy="' + q[1].toFixed(4) + '" style="--cx:' + q[0].toFixed(4) + ';--cy:' + q[1].toFixed(4) + ';--cor-equipe:' + c.cor + ';--k:' + k + '">' +
        '<span class="micro-corpo">' + c.ficha + '</span><span class="micro-nome">' + c.nome + '</span></span>';
    });
    h += '</div>' +
      '<svg class="micro-reticulo" viewBox="0 0 200 200" aria-hidden="true"><path d="M100 6V78M100 122V194M6 100H78M122 100H194" /><circle cx="100" cy="100" r="22"/>' +
      '<path d="M100 30h5M100 42h3M100 54h5M100 66h3M100 134h5M100 146h3M100 158h5M100 170h3" /></svg>' +
      '</div></div>';
    return h;
  }
  /* o foco pula de célula em célula, vai desacelerando e trava na sorteada */
  function sortear(raiz, alvo, op) {
    var micro = raiz.querySelector(".micro"), fim = op.aoFim || function () {};
    if (!micro) { fim(); return; }
    var cel = micro.querySelectorAll(".micro-celula"), n = cel.length;
    function focar(k, zoom, ms) {
      for (var i = 0; i < n; i++) cel[i].classList.toggle("em-foco", i === k);
      micro.style.setProperty("--fx", cel[k].dataset.fx);
      micro.style.setProperty("--fy", cel[k].dataset.fy);
      micro.style.setProperty("--zoom", zoom);
      micro.style.setProperty("--vel", ms + "ms");
    }
    function travar() {
      if (!op.vivo()) return;
      micro.classList.remove("sorteando"); micro.classList.add("parado", "travou");
      focar(alvo, 2.1, 450);
      if (op.aoTravar) op.aoTravar();
      setTimeout(function () { if (op.vivo()) fim(); }, op.reduzir ? 200 : 1000);
    }
    if (op.reduzir || n < 2) { travar(); return; }
    var inicio = Math.floor(Math.random() * n), passos = 2 * n + ((alvo - inicio + n) % n), k = 0;
    while (passos < 9) passos += n;
    micro.classList.add("sorteando");
    function passo() {
      if (!op.vivo()) return;
      if (k >= passos) { travar(); return; }
      var p = k / passos, espera = 130 + Math.pow(p, 2.4) * 560;
      focar((inicio + k) % n, 1.75, Math.round(espera * 0.8));
      if (op.aoPasso) op.aoPasso();
      k++;
      setTimeout(passo, espera);
    }
    passo();
  }

  /* ---------- sons: bolhas, gotas e batimento ---------- */
  var P = window.SONS.pecas, nota = P.nota, sopro = P.sopro, bolha = P.bolha, sino = P.sino;
  window.SONS.registrar("biologia", {
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
  });

  return {
    id: "biologia", nome: "Biologia",
    /* duas opções de fonte para os títulos; os textos continuam em Atkinson */
    fontes: [{ id: "a", nome: "Lilita One" }, { id: "b", nome: "Fredoka" }],
    revelacaoMs: REVELACAO_MS,
    fundo: fundo,
    revelar: revelar,
    passe: microscopio,
    sortear: sortear
  };
})();
