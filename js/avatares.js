/* Duelo de Saberes 2.0 · Avatares em camadas (Fase 6)
   Cada avatar é montado em camadas, de trás para a frente:
     1. personagem base (mascote original de uma disciplina ou genérico)
     2. roupa (o jaleco, recortado no formato do corpo)
     3. expressão (olhos, sobrancelhas e boca)
     4. acessório de cabeça ou de rosto
     5. efeitos do estado (halo, confete, lágrima, bloco de gelo, troféu)
   A cor vem da equipe, com 5 variações de tom. Há dois traços: Palco (chapado, contorno grosso
   e brilho dourado) e Fofo (arredondado, sombreado suave e bochechas).
   Estados animados: parado, na vez, comemorando, lamentando, congelado e com troféu.
   Todos os desenhos são originais, em SVG; as animações ficam em css/avatares.css.

   Para acrescentar um mascote depois (por exemplo, no tema.js de uma disciplina nova), basta chamar
   AVATAR.registrar({ id, nome, disciplina, silhueta, atras?, frente?, roupa?, rosto, topo, base, brilho })
   com o mesmo formato dos mascotes abaixo. Nenhum outro arquivo do jogo precisa mudar. */

window.AVATAR = (function () {
  "use strict";

  var NOMES_DISCIPLINA = {
    biologia: "Biologia", quimica: "Química", fisica: "Física", matematica: "Matemática",
    portugues: "Língua Portuguesa", ingles: "Língua Inglesa", geografia: "Geografia", historia: "História"
  };

  /* ---------- cores ---------- */
  function rgb(h) { h = String(h).replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) || 0; }); }
  function hex(a) { return "#" + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase(); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  /* tom: -2 a +2. Para baixo escurece, para cima clareia, sem perder a cor da equipe */
  function tonalizar(cor, tom) { tom = Number(tom) || 0; return tom > 0 ? mix(cor, "#FFFFFF", tom * .17) : tom < 0 ? mix(cor, "#000000", -tom * .15) : hex(rgb(cor)); }

  var OURO = "#F5C451", OURO_ESCURO = "#A6730F", METAL = "#C9CFDA", METAL_ESCURO = "#6B7180";

  /* ---------- estrela de 5 pontas para o mascote genérico ---------- */
  function caminhoEstrela(cx, cy, R, r) {
    var p = [];
    for (var k = 0; k < 10; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 5, raio = k % 2 ? r : R;
      p.push((cx + raio * Math.cos(a)).toFixed(1) + " " + (cy + raio * Math.sin(a)).toFixed(1));
    }
    return "M" + p.join("L") + "Z";
  }

  /* ---------- personagens base ----------
     silhueta: forma principal do corpo (recebe a cor da equipe e serve de molde para o jaleco)
     atras / frente: partes desenhadas antes e depois da silhueta (c traz as cores e os traços)
     rosto: centro do rosto (x, y), escala (s) e meia largura da cabeça na altura dos olhos (lw)
     topo: onde assentam os chapéus · base: onde começa o jaleco · brilho: reflexo do traço Palco */
  var PERSONAGENS = [];
  var PORID = {};

  function registrar(def) {
    if (!def || !def.id || !def.silhueta) return;
    if (PORID[def.id]) PERSONAGENS.splice(PERSONAGENS.indexOf(PORID[def.id]), 1);
    PORID[def.id] = def;
    PERSONAGENS.push(def);
  }

  registrar({
    id: "celula", nome: "Célula", disciplina: "biologia",
    silhueta: '<path d="M60 19C85 17 103 36 102 61C101 87 84 105 59 104C33 103 17 86 18 60C19 35 36 21 60 19Z"/>',
    frente: function (c) {
      return '<path class="av-membrana" d="M60 26C80 25 95 40 95 61C94 82 80 97 59 97C38 96 25 82 25 60C26 40 40 28 60 26Z" fill="none" stroke="' + c.claro + '" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round" opacity=".8"/>' +
        '<circle cx="80" cy="81" r="11" fill="' + c.escuro + '"' + c.t + '/><circle cx="83" cy="78" r="3.6" fill="' + c.claro + '"/>' +
        '<rect x="26" y="74" width="19" height="9" rx="4.5" transform="rotate(-24 35.5 78.5)" fill="' + c.claro + '" stroke="' + c.escuro + '" stroke-width="1.5"/>' +
        '<path d="M29 80q2-4 4 0t4 0t4 0" transform="rotate(-24 35.5 78.5)" fill="none" stroke="' + c.escuro + '" stroke-width="1.2" stroke-linecap="round"/>' +
        '<circle cx="85" cy="42" r="3.2" fill="' + c.claro + '" opacity=".9"/><circle cx="31" cy="46" r="2.4" fill="' + c.claro + '" opacity=".9"/><circle cx="91" cy="58" r="1.8" fill="' + c.claro + '" opacity=".9"/>';
    },
    rosto: { x: 55, y: 56, s: 1, lw: 37 }, topo: { x: 58, y: 20, hw: 28 }, base: { x: 58, y: 84, hw: 28 },
    brilho: { x: 38, y: 34, rx: 10, ry: 5.5, r: -32 }
  });

  registrar({
    id: "atomo", nome: "Átomo", disciplina: "quimica",
    atras: function (c) {
      var orb = function (g) { return '<ellipse cx="60" cy="62" rx="52" ry="16" transform="rotate(' + g + ' 60 62)" fill="none" stroke="' + c.traco + '" stroke-width="' + (c.w + 3.4) + '"/><ellipse cx="60" cy="62" rx="52" ry="16" transform="rotate(' + g + ' 60 62)" fill="none" stroke="' + c.claro + '" stroke-width="3.2"/>'; };
      var el = function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="5.4" fill="' + c.claro + '"' + c.t + '/>'; };
      return '<g class="av-orbitas">' + orb(28) + orb(-28) + el(106, 86.4) + el(14, 37.6) + el(106, 37.6) + el(14, 86.4) + '</g>';
    },
    silhueta: '<circle cx="60" cy="62" r="30"/>',
    frente: function (c) {
      return '<circle cx="47" cy="80" r="4.4" fill="' + c.claro + '" opacity=".85"/><circle cx="57" cy="86" r="4.4" fill="' + c.escuro + '" opacity=".7"/>' +
        '<circle cx="68" cy="84" r="4.4" fill="' + c.claro + '" opacity=".85"/><circle cx="77" cy="76" r="4" fill="' + c.escuro + '" opacity=".7"/>';
    },
    rosto: { x: 60, y: 59, s: .92, lw: 29 }, topo: { x: 60, y: 33, hw: 20 }, base: { x: 60, y: 76, hw: 24 },
    brilho: { x: 46, y: 45, rx: 8, ry: 4.5, r: -38 }
  });

  registrar({
    id: "lampada", nome: "Lâmpada", disciplina: "fisica",
    silhueta: '<path d="M60 15C81 15 95 31 95 50C95 64 87 72 81 78C78 81 76 84 76 88H44C44 84 42 81 39 78C33 72 25 64 25 50C25 31 39 15 60 15Z"/>',
    frente: function (c) {
      return '<path d="M50 88V83M70 88V83" stroke="' + c.escuro + '" stroke-width="2" stroke-linecap="round"/>' +
        '<rect x="43" y="87" width="34" height="18" rx="5" fill="' + METAL + '"' + c.T + '/>' +
        '<path d="M45 93H75M45 99H75" stroke="' + METAL_ESCURO + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M50 105H70L66 112H54Z" fill="' + METAL_ESCURO + '"' + c.t + '/>';
    },
    rosto: { x: 60, y: 47, s: 1, lw: 33 }, topo: { x: 60, y: 16, hw: 26 }, base: { x: 60, y: 66, hw: 30 },
    brilho: { x: 40, y: 34, rx: 6, ry: 11, r: 22 }
  });

  registrar({
    id: "compasso", nome: "Compasso", disciplina: "matematica",
    atras: function (c) {
      return '<rect x="54" y="6" width="12" height="11" rx="3.5" fill="' + c.claro + '"' + c.T + '/>' +
        '<path d="M53 58L38 104L44 106L59 62Z" fill="' + c.escuro + '"' + c.T + '/>' +
        '<path d="M38 104L39 114L44 106Z" fill="' + METAL + '"' + c.t + '/>' +
        '<path d="M67 58L81 99L75 101L61 62Z" fill="' + c.escuro + '"' + c.T + '/>' +
        '<path d="M74 100L82 98L82 110Z" fill="#F2D3A0"' + c.t + '/><path d="M79.5 106.5L82 110L82 105.5Z" fill="#2A2A33"/>' +
        '<circle cx="60" cy="61" r="7.5" fill="' + OURO + '"' + c.T + '/><circle cx="60" cy="61" r="2.4" fill="' + OURO_ESCURO + '"/>';
    },
    silhueta: '<circle cx="60" cy="38" r="25"/>',
    rosto: { x: 60, y: 37, s: .88, lw: 24 }, topo: { x: 60, y: 14, hw: 21 }, base: { x: 60, y: 48, hw: 22 },
    brilho: { x: 48, y: 25, rx: 7, ry: 4, r: -32 }
  });

  registrar({
    id: "livro", nome: "Livro", disciplina: "portugues",
    atras: function (c) {
      return '<path d="M68 100V114L73 109L78 114V100Z" fill="#FF5468"' + c.t + '/>' +
        '<rect x="30" y="21" width="66" height="83" rx="7" fill="#FFF6E2"' + c.T + '/>' +
        '<path d="M92 28V97M88 26V99" stroke="#D8C6A1" stroke-width="1.5" stroke-linecap="round"/>';
    },
    silhueta: '<rect x="21" y="17" width="67" height="84" rx="8"/>',
    frente: function (c) {
      return '<path d="M33 19V99" stroke="' + c.escuro + '" stroke-width="9" opacity=".75"/>' +
        '<path d="M44 86H80M44 92H74" stroke="' + c.claro + '" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M44 26H80" stroke="' + c.claro + '" stroke-width="2.6" stroke-linecap="round"/>';
    },
    rosto: { x: 59, y: 53, s: 1, lw: 29 }, topo: { x: 55, y: 18, hw: 30 }, base: { x: 58, y: 74, hw: 34 },
    brilho: { x: 68, y: 33, rx: 12, ry: 3.5, r: 0 }
  });

  registrar({
    id: "balao", nome: "Balão de fala", disciplina: "ingles",
    silhueta: '<path d="M40 20H80C94 20 104 30 104 44V58C104 72 94 82 80 82H54L33 102L38 82H40C26 82 16 72 16 58V44C16 30 26 20 40 20Z"/>',
    frente: function (c) {
      return '<circle cx="86" cy="32" r="2.6" fill="' + c.claro + '"/><circle cx="93" cy="38" r="1.8" fill="' + c.claro + '"/>';
    },
    rosto: { x: 60, y: 49, s: 1, lw: 40 }, topo: { x: 60, y: 21, hw: 34 }, base: { x: 60, y: 66, hw: 40 },
    brilho: { x: 32, y: 32, rx: 9, ry: 4.5, r: -24 }
  });

  registrar({
    id: "globo", nome: "Globo", disciplina: "geografia",
    atras: function (c) {
      var anel = 'M27 86A38 38 0 0 1 93 26';
      return '<ellipse cx="60" cy="109" rx="23" ry="5.5" fill="#6B4A2A"' + c.T + '/>' +
        '<rect x="55" y="93" width="10" height="16" rx="2" fill="#8A6A3A"' + c.T + '/>' +
        (c.est === "palco" ? '<path d="' + anel + '" fill="none" stroke="' + c.traco + '" stroke-width="10" stroke-linecap="round"/>' : '') +
        '<path d="' + anel + '" fill="none" stroke="' + OURO + '" stroke-width="5" stroke-linecap="round"/>';
    },
    silhueta: '<circle cx="60" cy="56" r="36"/>',
    frente: function (c) {
      return '<g fill="' + c.claro + '" opacity=".92">' +
        '<path d="M27 42C33 33 44 36 42 45C40 51 33 52 31 59C27 57 24 49 27 42Z"/>' +
        '<path d="M79 69C88 64 94 71 92 79C88 87 79 85 77 79C76 75 76 71 79 69Z"/>' +
        '<path d="M68 24C76 21 86 27 83 32C78 35 70 31 68 24Z"/>' +
        '<path d="M38 82C42 78 50 80 49 86C46 89 40 88 38 82Z"/></g>' +
        '<path d="M24 56H96" stroke="' + c.escuro + '" stroke-width="1.4" stroke-dasharray="3 4" opacity=".55"/>';
    },
    rosto: { x: 60, y: 55, s: 1, lw: 35 }, topo: { x: 60, y: 21, hw: 27 }, base: { x: 60, y: 72, hw: 32 },
    brilho: { x: 42, y: 32, rx: 9, ry: 5, r: -35 }
  });

  registrar({
    id: "ampulheta", nome: "Ampulheta", disciplina: "historia",
    atras: function (c) {
      return '<rect x="28" y="22" width="6" height="76" rx="2" fill="#7A4A22"' + c.t + '/><rect x="86" y="22" width="6" height="76" rx="2" fill="#7A4A22"' + c.t + '/>';
    },
    silhueta: '<path d="M36 25H84C84 46 67 54 64 61C67 68 84 76 84 96H36C36 76 53 68 56 61C53 54 36 46 36 25Z"/>',
    pintar: function (c) { return ' fill="' + c.vidro + '"'; },
    frente: function (c) {
      return '<path d="M43 49H77C72 55 66 57 61 60H59C54 57 48 55 43 49Z" fill="' + c.corpo + '"/>' +
        '<path d="M39 95C45 83 54 79 60 77C66 79 75 83 81 95Z" fill="' + c.corpo + '"/>' +
        '<path class="av-areia" d="M60 61V80" stroke="' + c.base + '" stroke-width="2.4" stroke-dasharray="2 3"/>' +
        '<path d="M42 30C44 38 48 42 52 45" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".7"/>' +
        '<rect x="22" y="12" width="76" height="13" rx="5" fill="#A5652E"' + c.T + '/>' +
        '<rect x="22" y="95" width="76" height="13" rx="5" fill="#A5652E"' + c.T + '/>' +
        '<path d="M28 18.5H92M28 101.5H92" stroke="#7A4A22" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>';
    },
    roupa: '<path d="M36 25H84C84 46 67 54 64 61C67 68 84 76 84 96H36C36 76 53 68 56 61C53 54 36 46 36 25Z"/>',
    rosto: { x: 60, y: 37, s: .8, lw: 22 }, topo: { x: 60, y: 13, hw: 34 }, base: { x: 60, y: 76, hw: 26 },
    brilho: null
  });

  registrar({
    id: "gota", nome: "Gota", disciplina: null,
    silhueta: '<path d="M60 12C70 34 96 52 96 74C96 94 80 108 60 108C40 108 24 94 24 74C24 52 50 34 60 12Z"/>',
    rosto: { x: 60, y: 74, s: 1, lw: 34 }, topo: { x: 60, y: 40, hw: 18 }, base: { x: 60, y: 90, hw: 34 },
    brilho: { x: 41, y: 66, rx: 4.5, ry: 10, r: 18 }
  });

  registrar({
    id: "estrela", nome: "Estrelinha", disciplina: null,
    silhueta: '<path d="' + caminhoEstrela(60, 64, 48, 24) + '"/>',
    rosto: { x: 60, y: 66, s: .86, lw: 26 }, topo: { x: 60, y: 22, hw: 11 }, base: { x: 60, y: 80, hw: 30 },
    brilho: { x: 50, y: 44, rx: 4, ry: 7, r: 30 }
  });

  registrar({
    id: "robo", nome: "Robozinho", disciplina: null,
    atras: function (c) {
      return '<path d="M60 28V13" stroke="' + c.traco + '" stroke-width="' + (c.w + 1) + '" stroke-linecap="round"/>' +
        '<circle class="av-antena" cx="60" cy="10" r="5.4" fill="' + c.claro + '"' + c.T + '/>' +
        '<rect x="19" y="43" width="11" height="20" rx="4" fill="' + c.escuro + '"' + c.T + '/><rect x="90" y="43" width="11" height="20" rx="4" fill="' + c.escuro + '"' + c.T + '/>' +
        '<rect x="39" y="77" width="42" height="28" rx="9" fill="' + c.escuro + '"' + c.T + '/>' +
        '<circle class="av-antena" cx="60" cy="91" r="4.4" fill="' + c.claro + '"' + c.t + '/>';
    },
    silhueta: '<rect x="27" y="25" width="66" height="54" rx="16"/>',
    frente: function (c) { return '<rect x="34" y="33" width="52" height="38" rx="11" fill="#141826"' + c.t + '/>'; },
    roupa: '<rect x="39" y="77" width="42" height="28" rx="9"/>',
    rosto: { x: 60, y: 49, s: .82, lw: 33, claro: true, pele: "#141826" }, topo: { x: 60, y: 26, hw: 31 }, base: { x: 60, y: 80, hw: 24 },
    brilho: { x: 40, y: 30, rx: 8, ry: 2.6, r: 0 }
  });

  /* ---------- expressões, acessórios, tons, traços e estados ---------- */
  var EXPRESSOES = [
    { id: "confiante", nome: "Confiante" }, { id: "sapeca", nome: "Sapeca" },
    { id: "concentrado", nome: "Concentrado" }, { id: "surpreso", nome: "Surpreso" }
  ];
  var ACESSORIOS = [
    { id: "nenhum", nome: "Nenhum" }, { id: "oculos", nome: "Óculos" }, { id: "jaleco", nome: "Jaleco" },
    { id: "capelo", nome: "Capelo" }, { id: "fone", nome: "Fone de ouvido" }, { id: "coroa", nome: "Coroa" }, { id: "capacete", nome: "Capacete" }
  ];
  var TONS = [
    { id: -2, nome: "Bem escuro" }, { id: -1, nome: "Escuro" }, { id: 0, nome: "Cor da equipe" }, { id: 1, nome: "Claro" }, { id: 2, nome: "Bem claro" }
  ];
  var ESTILOS = [
    { id: "palco", nome: "Palco", texto: "Chapado, contorno grosso e brilho dourado" },
    { id: "fofo", nome: "Fofo", texto: "Arredondado, sombreado suave e bochechas" }
  ];
  var ESTADOS = [
    { id: "parado", nome: "Parado" }, { id: "navez", nome: "Na vez" }, { id: "comemorando", nome: "Comemorando" },
    { id: "lamentando", nome: "Lamentando" }, { id: "congelado", nome: "Congelado" }, { id: "trofeu", nome: "Com troféu" }
  ];
  /* avatares de saída das 6 equipes padrão */
  var PADRAO = [
    { base: "celula", expr: "confiante", acess: "nenhum" }, { base: "atomo", expr: "sapeca", acess: "oculos" },
    { base: "lampada", expr: "surpreso", acess: "capacete" }, { base: "globo", expr: "confiante", acess: "fone" },
    { base: "livro", expr: "concentrado", acess: "capelo" }, { base: "robo", expr: "sapeca", acess: "coroa" }
  ];

  function ids(lista) { return lista.map(function (x) { return x.id; }); }
  function padrao(i) { var p = PADRAO[((i || 0) % PADRAO.length + PADRAO.length) % PADRAO.length]; return { base: p.base, expr: p.expr, acess: p.acess, tom: 0, estilo: "palco" }; }
  function normalizar(av, i) {
    var p = padrao(i), a = av && typeof av === "object" ? av : {};
    return {
      base: PORID[a.base] ? a.base : p.base,
      expr: ids(EXPRESSOES).indexOf(a.expr) >= 0 ? a.expr : p.expr,
      acess: ids(ACESSORIOS).indexOf(a.acess) >= 0 ? a.acess : p.acess,
      tom: ids(TONS).indexOf(Number(a.tom)) >= 0 ? Number(a.tom) : 0,
      estilo: ids(ESTILOS).indexOf(a.estilo) >= 0 ? a.estilo : "palco"
    };
  }
  function sorteio(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  /* o traço continua o escolhido pela equipe; o resto é sorteado */
  function aleatorio(atual) {
    var a = normalizar(atual, 0);
    return { base: sorteio(PERSONAGENS).id, expr: sorteio(EXPRESSOES).id, acess: sorteio(ACESSORIOS).id, tom: sorteio([-1, 0, 0, 1]), estilo: a.estilo };
  }

  /* ---------- rosto ---------- */
  /* tipo de olho, de boca e altura das sobrancelhas [ponta de fora, ponta de dentro], em unidades de s */
  var ROSTOS = {
    confiante:   { olhoE: "semi", olhoD: "semi", sob: [[-11, -10], [-14.5, -13.5]], boca: "sorriso" },
    sapeca:      { olhoE: "piscada", olhoD: "aberto", sob: [[-10, -12], [-15, -14]], boca: "lingua" },
    concentrado: { olhoE: "estreito", olhoD: "estreito", sob: [[-12.5, -8.5], [-12.5, -8.5]], boca: "reta" },
    surpreso:    { olhoE: "redondo", olhoD: "redondo", sob: [[-15.5, -16.5], [-15.5, -16.5]], boca: "o" },
    feliz:       { olhoE: "feliz", olhoD: "feliz", sob: [[-14, -15], [-14, -15]], boca: "festa" },
    triste:      { olhoE: "baixo", olhoD: "baixo", sob: [[-10, -14.5], [-10, -14.5]], boca: "triste" },
    gelado:      { olhoE: "gelado", olhoD: "gelado", sob: [[-15, -16.5], [-15, -16.5]], boca: "dentes" }
  };

  function n(v) { return (Math.round(v * 10) / 10).toString(); }

  function olho(x, y, s, tipo, lado, c, m) {
    var tinta = c.tinta, claro = m.rosto.claro, pele = m.rosto.pele || c.base, h = "";
    if (tipo === "piscada" || tipo === "feliz") {
      return '<path d="M' + n(x - 5.6 * s) + " " + n(y + 1.5 * s) + "Q" + n(x) + " " + n(y - 6.5 * s) + " " + n(x + 5.6 * s) + " " + n(y + 1.5 * s) + '" fill="none" stroke="' + tinta + '" stroke-width="' + n(3 * s) + '" stroke-linecap="round"/>';
    }
    var grande = tipo === "redondo" || tipo === "gelado";
    var rx, ry;
    if (c.est === "palco" && !claro) {
      rx = 6.2 * s * (grande ? 1.14 : 1); ry = 7.4 * s * (grande ? 1.12 : 1);
      var pr = (tipo === "gelado" ? 1.7 : grande ? 2.5 : 3.3) * s;
      var px = x - lado * .9 * s, py = y + (tipo === "baixo" ? 2.4 * s : .3 * s);
      h += '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="#FFFFFF" stroke="' + tinta + '" stroke-width="' + n(2.2 * s) + '"/>' +
        '<ellipse cx="' + n(px) + '" cy="' + n(py) + '" rx="' + n(pr) + '" ry="' + n(pr * 1.18) + '" fill="' + tinta + '"/>' +
        '<circle cx="' + n(px + 1.1 * s) + '" cy="' + n(py - 1.5 * s) + '" r="' + n(Math.max(.8, pr * .38)) + '" fill="#FFFFFF"/>';
    } else {
      rx = (grande ? 6.2 : 5.3) * s; ry = (grande ? 7.4 : 6.5) * s;
      if (tipo === "gelado") { rx = 3.6 * s; ry = 4.6 * s; }
      var dy = tipo === "baixo" ? 1.6 * s : 0;
      h += '<ellipse cx="' + n(x) + '" cy="' + n(y + dy) + '" rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + tinta + '"/>';
      if (!claro) h += '<circle cx="' + n(x - 1.7 * s) + '" cy="' + n(y + dy - 2.3 * s) + '" r="' + n(1.9 * s) + '" fill="#FFFFFF"/><circle cx="' + n(x + 1.9 * s) + '" cy="' + n(y + dy + 1.8 * s) + '" r="' + n(.95 * s) + '" fill="#FFFFFF"/>';
    }
    /* pálpebras: cobrem a parte de cima (confiante) ou de cima e de baixo (concentrado) */
    if (tipo === "semi" || tipo === "estreito") {
      var topo = tipo === "estreito" ? 1.6 * s : -.6 * s;
      h += '<path d="M' + n(x - rx - 1.4) + " " + n(y + topo) + "Q" + n(x) + " " + n(y - ry * 2.3) + " " + n(x + rx + 1.4) + " " + n(y + topo) + 'Z" fill="' + pele + '" stroke="' + tinta + '" stroke-width="' + n(2.2 * s) + '" stroke-linejoin="round"/>';
      if (tipo === "estreito") h += '<path d="M' + n(x - rx - 1.4) + " " + n(y + 3.4 * s) + "Q" + n(x) + " " + n(y + ry * 2.2) + " " + n(x + rx + 1.4) + " " + n(y + 3.4 * s) + 'Z" fill="' + pele + '" stroke="' + tinta + '" stroke-width="' + n(2.2 * s) + '" stroke-linejoin="round"/>';
    }
    return '<g class="av-olho">' + h + '</g>';
  }

  function sobrancelha(x, y, s, alt, lado, tinta) {
    /* alt = [ponta de fora, ponta de dentro]; o lado esquerdo tem a ponta de fora à esquerda */
    var xFora = x + lado * 5.6 * s, xDentro = x - lado * 5.6 * s;
    var yFora = y + alt[0] * s, yDentro = y + alt[1] * s;
    var xm = (xFora + xDentro) / 2, ym = Math.min(yFora, yDentro) - 1.4 * s;
    return '<path d="M' + n(xFora) + " " + n(yFora) + "Q" + n(xm) + " " + n(ym) + " " + n(xDentro) + " " + n(yDentro) + '" fill="none" stroke="' + tinta + '" stroke-width="' + n(2.6 * s) + '" stroke-linecap="round"/>';
  }

  function boca(x, y, s, tipo, c) {
    var t = c.tinta, w = n(2.6 * s), L = '" fill="none" stroke="' + t + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
    var lingua = c.lingua;
    switch (tipo) {
      case "sorriso": return '<path d="M' + n(x - 7.5 * s) + " " + n(y) + "Q" + n(x + 1 * s) + " " + n(y + 6.5 * s) + " " + n(x + 8.5 * s) + " " + n(y - 3 * s) + L;
      case "reta": return '<path d="M' + n(x - 5 * s) + " " + n(y + 1.4 * s) + "Q" + n(x) + " " + n(y + .4 * s) + " " + n(x + 4.4 * s) + " " + n(y + 1 * s) + L;
      case "o": return '<ellipse cx="' + n(x) + '" cy="' + n(y + 2.4 * s) + '" rx="' + n(3.7 * s) + '" ry="' + n(4.8 * s) + '" fill="' + t + '"/>';
      case "triste": return '<path d="M' + n(x - 7 * s) + " " + n(y + 4.6 * s) + "Q" + n(x) + " " + n(y - 3 * s) + " " + n(x + 7 * s) + " " + n(y + 4.6 * s) + L;
      case "lingua":
        return '<path d="M' + n(x - 8 * s) + " " + n(y - 1 * s) + "Q" + n(x) + " " + n(y + 11 * s) + " " + n(x + 8 * s) + " " + n(y - 1 * s) + 'Z" fill="' + t + '" stroke="' + t + '" stroke-width="' + n(1.6 * s) + '" stroke-linejoin="round"/>' +
          '<ellipse cx="' + n(x + 2.2 * s) + '" cy="' + n(y + 4.2 * s) + '" rx="' + n(3.4 * s) + '" ry="' + n(2.4 * s) + '" fill="' + lingua + '"/>';
      case "festa":
        return '<path d="M' + n(x - 10 * s) + " " + n(y - 2.4 * s) + "Q" + n(x) + " " + n(y + 14 * s) + " " + n(x + 10 * s) + " " + n(y - 2.4 * s) + 'Z" fill="' + t + '" stroke="' + t + '" stroke-width="' + n(1.6 * s) + '" stroke-linejoin="round"/>' +
          '<ellipse cx="' + n(x) + '" cy="' + n(y + 6.4 * s) + '" rx="' + n(4.6 * s) + '" ry="' + n(2.6 * s) + '" fill="' + lingua + '"/>';
      case "dentes":
        return '<rect x="' + n(x - 8 * s) + '" y="' + n(y - 1.6 * s) + '" width="' + n(16 * s) + '" height="' + n(7.4 * s) + '" rx="' + n(2.6 * s) + '" fill="#FFFFFF" stroke="' + t + '" stroke-width="' + n(2 * s) + '"/>' +
          '<path d="M' + n(x - 7 * s) + " " + n(y + 2.1 * s) + "L" + n(x - 4.5 * s) + " " + n(y + .4 * s) + "L" + n(x - 1.5 * s) + " " + n(y + 3.6 * s) + "L" + n(x + 1.5 * s) + " " + n(y + .4 * s) + "L" + n(x + 4.5 * s) + " " + n(y + 3.6 * s) + "L" + n(x + 7 * s) + " " + n(y + 1.4 * s) + '" fill="none" stroke="' + t + '" stroke-width="' + n(1.5 * s) + '" stroke-linejoin="round"/>';
    }
    return "";
  }

  function rosto(m, tipoRosto, c) {
    var R = ROSTOS[tipoRosto] || ROSTOS.confiante, f = m.rosto, s = f.s, dx = 12.5 * s;
    var h = "";
    if (c.est === "fofo" && !f.claro) h += '<ellipse cx="' + n(f.x - 19 * s) + '" cy="' + n(f.y + 8 * s) + '" rx="' + n(5 * s) + '" ry="' + n(3 * s) + '" fill="#FF7A9A" opacity=".5"/>' +
      '<ellipse cx="' + n(f.x + 19 * s) + '" cy="' + n(f.y + 8 * s) + '" rx="' + n(5 * s) + '" ry="' + n(3 * s) + '" fill="#FF7A9A" opacity=".5"/>';
    h += olho(f.x - dx, f.y, s, R.olhoE, -1, c, m) + olho(f.x + dx, f.y, s, R.olhoD, 1, c, m);
    h += sobrancelha(f.x - dx, f.y, s, R.sob[0], -1, c.tinta) + sobrancelha(f.x + dx, f.y, s, R.sob[1], 1, c.tinta);
    h += boca(f.x, f.y + 14 * s, s, R.boca, c);
    return '<g class="av-rosto">' + h + '</g>';
  }

  /* ---------- acessórios ---------- */
  function jaleco(m, c) {
    var b = m.base, x = b.x, y = b.y, molde = m.roupa || m.silhueta, id = c.id + "r";
    var w = b.hw;
    return '<defs><clipPath id="' + id + '">' + molde + '</clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' +
        '<path d="M' + (x - 70) + " " + (y - 14) + "L" + (x - 6) + " " + (y + 9) + "L" + (x - 6) + " " + (y + 70) + "L" + (x - 70) + " " + (y + 70) + 'Z" fill="#FFFFFF" stroke="' + c.traco + '" stroke-width="' + n(c.w * .55) + '" stroke-linejoin="round"/>' +
        '<path d="M' + (x + 70) + " " + (y - 14) + "L" + (x + 6) + " " + (y + 9) + "L" + (x + 6) + " " + (y + 70) + "L" + (x + 70) + " " + (y + 70) + 'Z" fill="#FFFFFF" stroke="' + c.traco + '" stroke-width="' + n(c.w * .55) + '" stroke-linejoin="round"/>' +
        '<path d="M' + (x - 70) + " " + (y - 14) + "L" + (x - 6) + " " + (y + 9) + "L" + (x - 16) + " " + (y + 14) + "L" + (x - 70) + " " + (y - 4) + 'Z" fill="#E4E9F1" stroke="' + c.traco + '" stroke-width="' + n(c.w * .45) + '" stroke-linejoin="round"/>' +
        '<path d="M' + (x + 70) + " " + (y - 14) + "L" + (x + 6) + " " + (y + 9) + "L" + (x + 16) + " " + (y + 14) + "L" + (x + 70) + " " + (y - 4) + 'Z" fill="#E4E9F1" stroke="' + c.traco + '" stroke-width="' + n(c.w * .45) + '" stroke-linejoin="round"/>' +
        '<rect x="' + (x - Math.min(w, 26) + 2) + '" y="' + (y + 16) + '" width="11" height="8" rx="2" fill="#F2F5FA" stroke="' + c.traco + '" stroke-width="1.4"/>' +
        '<path d="M' + (x - Math.min(w, 26) + 5) + " " + (y + 17) + "V" + (y + 11) + '" stroke="#2F6FED" stroke-width="2.4" stroke-linecap="round"/>' +
        '<circle cx="' + (x + 11) + '" cy="' + (y + 22) + '" r="1.6" fill="' + c.traco + '"/><circle cx="' + (x + 11) + '" cy="' + (y + 30) + '" r="1.6" fill="' + c.traco + '"/>' +
      '</g>' +
      '<g fill="none"' + c.T + '>' + molde + '</g>';
  }

  function oculos(m, c) {
    var f = m.rosto, s = f.s, dx = 12.5 * s, r = 8.8 * s, arma = c.est === "fofo" ? c.traco : "#1C070D";
    var e = f.x - dx, d = f.x + dx, y = f.y;
    return '<g class="av-oculos">' +
      '<path d="M' + n(e - r) + " " + n(y - 1) + "L" + n(f.x - f.lw) + " " + n(y - 3) + "M" + n(d + r) + " " + n(y - 1) + "L" + n(f.x + f.lw) + " " + n(y - 3) + '" stroke="' + arma + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="' + n(e) + '" cy="' + n(y) + '" r="' + n(r) + '" fill="#DFF2FF" fill-opacity=".22" stroke="' + arma + '" stroke-width="3"/>' +
      '<circle cx="' + n(d) + '" cy="' + n(y) + '" r="' + n(r) + '" fill="#DFF2FF" fill-opacity=".22" stroke="' + arma + '" stroke-width="3"/>' +
      '<path d="M' + n(e + r) + " " + n(y - 1) + "Q" + n(f.x) + " " + n(y - 5 * s) + " " + n(d - r) + " " + n(y - 1) + '" fill="none" stroke="' + arma + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M' + n(e - r * .55) + " " + n(y - r * .35) + "L" + n(e - r * .15) + " " + n(y - r * .7) + "M" + n(d - r * .55) + " " + n(y - r * .35) + "L" + n(d - r * .15) + " " + n(y - r * .7) + '" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>' +
      '</g>';
  }

  function capelo(m, c) {
    var t = m.topo, x = t.x, y = t.y, w = Math.max(t.hw, 16), T = c.T;
    return '<g class="av-capelo">' +
      '<path d="M' + (x - w + 2) + " " + (y - 3) + "L" + (x - w + 4) + " " + (y + 8) + "Q" + x + " " + (y + 14) + " " + (x + w - 4) + " " + (y + 8) + "L" + (x + w - 2) + " " + (y - 3) + 'Z" fill="#2A2638"' + T + '/>' +
      '<path d="M' + (x - w - 13) + " " + (y - 7) + "L" + x + " " + (y - 18) + "L" + (x + w + 13) + " " + (y - 7) + "L" + x + " " + (y + 4) + 'Z" fill="#1E1B2A"' + T + '/>' +
      '<g class="av-borla"><path d="M' + x + " " + (y - 7) + "L" + (x + w + 6) + " " + (y - 4) + "V" + (y + 9) + '" fill="none" stroke="' + OURO + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + (x + w + 3) + " " + (y + 8) + "H" + (x + w + 9) + "L" + (x + w + 10) + " " + (y + 18) + "H" + (x + w + 2) + 'Z" fill="' + OURO + '" stroke="' + OURO_ESCURO + '" stroke-width="1.2"/></g>' +
      '<circle cx="' + x + '" cy="' + (y - 7) + '" r="2.8" fill="' + OURO + '"/>' +
      '</g>';
  }

  function coroa(m, c) {
    var t = m.topo, x = t.x, y0 = t.y + 7, w = Math.max(15, Math.min(t.hw * .8, 24));
    return '<g class="av-coroa">' +
      '<path d="M' + n(x - w) + " " + y0 + "L" + n(x - w - 2) + " " + (y0 - 17) + "L" + n(x - w / 2) + " " + (y0 - 8) + "L" + x + " " + (y0 - 23) + "L" + n(x + w / 2) + " " + (y0 - 8) + "L" + n(x + w + 2) + " " + (y0 - 17) + "L" + n(x + w) + " " + y0 + 'Z" fill="' + OURO + '"' + c.T + '/>' +
      '<path d="M' + n(x - w + 2) + " " + (y0 - 4) + "H" + n(x + w - 2) + '" stroke="' + OURO_ESCURO + '" stroke-width="2"/>' +
      '<circle cx="' + x + '" cy="' + (y0 - 11) + '" r="3.2" fill="#FF3B5C" stroke="#1C070D" stroke-width="1.2"/>' +
      '<circle cx="' + n(x - w / 2 - 1) + '" cy="' + (y0 - 4) + '" r="2" fill="#4FC3FF"/><circle cx="' + n(x + w / 2 + 1) + '" cy="' + (y0 - 4) + '" r="2" fill="#4FC3FF"/>' +
      '<circle cx="' + n(x - w - 2) + '" cy="' + (y0 - 18) + '" r="2.4" fill="#FFF0B8"/><circle cx="' + x + '" cy="' + (y0 - 24) + '" r="2.6" fill="#FFF0B8"/><circle cx="' + n(x + w + 2) + '" cy="' + (y0 - 18) + '" r="2.4" fill="#FFF0B8"/>' +
      '</g>';
  }

  function capacete(m, c) {
    var t = m.topo, x = t.x, y0 = t.y + (m.rosto.claro ? 7 : 12), w = Math.max(t.hw + 5, 20), h = Math.min(24, w * .9);
    return '<g class="av-capacete">' +
      '<path d="M' + (x - w) + " " + y0 + "A" + w + " " + h + " 0 0 1 " + (x + w) + " " + y0 + 'Z" fill="#E9EDF4"' + c.T + '/>' +
      '<path d="M' + (x - 4) + " " + n(y0 - h + .8) + "H" + (x + 4) + "V" + y0 + "H" + (x - 4) + 'Z" fill="' + c.claro + '" stroke="' + c.traco + '" stroke-width="1.4"/>' +
      '<rect x="' + (x - w - 7) + '" y="' + (y0 - 3) + '" width="' + (2 * w + 14) + '" height="7" rx="3.5" fill="#C9D0DC"' + c.T + '/>' +
      '<circle class="av-farol" cx="' + x + '" cy="' + n(y0 - h * .45) + '" r="4.6" fill="#FFE27A" stroke="' + c.traco + '" stroke-width="1.6"/>' +
      '</g>';
  }

  function fone(m, c) {
    var f = m.rosto, t = m.topo, e = f.x - f.lw - 1, d = f.x + f.lw + 1, alto = t.y - 12;
    var arco = "M" + n(e) + " " + n(f.y - 2) + "C" + n(e) + " " + alto + " " + n(d) + " " + alto + " " + n(d) + " " + n(f.y - 2);
    var concha = function (x) {
      return '<rect x="' + n(x - 6.5) + '" y="' + n(f.y - 11) + '" width="13" height="22" rx="5.5" fill="#3B3550"' + c.T + '/>' +
        '<rect x="' + n(x - 2.4) + '" y="' + n(f.y - 6) + '" width="4.8" height="12" rx="2.4" fill="' + c.claro + '"/>';
    };
    return '<g class="av-fone">' +
      (c.est === "palco" ? '<path d="' + arco + '" fill="none" stroke="' + c.traco + '" stroke-width="10" stroke-linecap="round"/>' : '') +
      '<path d="' + arco + '" fill="none" stroke="#3B3550" stroke-width="5.5" stroke-linecap="round"/>' +
      concha(e) + concha(d) + '</g>';
  }

  var ACESSORIO_DESENHO = { oculos: oculos, capelo: capelo, coroa: coroa, capacete: capacete, fone: fone };

  /* ---------- efeitos dos estados ---------- */
  function brilho4(x, y, r, classe) {
    return '<path class="' + classe + '" d="M' + x + " " + (y - r) + "Q" + (x + r * .18) + " " + (y - r * .18) + " " + (x + r) + " " + y + "Q" + (x + r * .18) + " " + (y + r * .18) + " " + x + " " + (y + r) + "Q" + (x - r * .18) + " " + (y + r * .18) + " " + (x - r) + " " + y + "Q" + (x - r * .18) + " " + (y - r * .18) + " " + x + " " + (y - r) + 'Z" fill="#FFFFFF"/>';
  }
  function confete() {
    var pecas = [[14, 30, "#F5C451", 0], [104, 24, "#FF5468", 1], [22, 70, "#4FC3FF", 2], [100, 66, "#2FCB7A", 3], [36, 12, "#FFFFFF", 4], [86, 10, "#F5C451", 5], [8, 50, "#FF5468", 6], [112, 46, "#FFF0B8", 7]];
    return '<g class="av-festa">' + pecas.map(function (p, k) {
      return k % 2 ? '<rect class="av-confete" style="--i:' + p[3] + '" x="' + (p[0] - 3) + '" y="' + (p[1] - 1.6) + '" width="6" height="3.2" rx="1" fill="' + p[2] + '" transform="rotate(' + (k * 37) + ' ' + p[0] + ' ' + p[1] + ')"/>' :
        '<circle class="av-confete" style="--i:' + p[3] + '" cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + p[2] + '"/>';
    }).join("") + '</g>';
  }
  function raios() {
    var h = "";
    for (var k = 0; k < 12; k++) h += '<path d="M60 62L' + n(60 + 62 * Math.cos((k * 30 - 6) * Math.PI / 180)) + " " + n(62 + 62 * Math.sin((k * 30 - 6) * Math.PI / 180)) + "L" + n(60 + 62 * Math.cos((k * 30 + 6) * Math.PI / 180)) + " " + n(62 + 62 * Math.sin((k * 30 + 6) * Math.PI / 180)) + 'Z"/>';
    return '<g class="av-raios" fill="' + OURO + '">' + h + '</g>';
  }
  function taca(c) {
    var T = ' stroke="#1C070D" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
    return '<g class="av-taca"><g transform="translate(60 21)">' +
      '<path d="M-13 -10H-21C-21 -1 -17 3 -11 4M13 -10H21C21 -1 17 3 11 4" fill="none" stroke="#1C070D" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M-13 -10H-21C-21 -1 -17 3 -11 4M13 -10H21C21 -1 17 3 11 4" fill="none" stroke="' + OURO + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M-14 -14H14V-4C14 6 8 12 0 12S-14 6 -14 -4Z" fill="' + OURO + '"' + T + '/>' +
      '<path d="M-3 12H3V17H-3Z" fill="' + OURO + '"' + T + '/><path d="M-10 17H10L12 23H-12Z" fill="#4A0615"' + T + '/>' +
      '<path d="M-8 -10C-8 -4 -7 1 -4 5" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M0 -10.5L1.8 -6.8L5.8 -6.3L2.9 -3.5L3.6 .5L0 -1.4L-3.6 .5L-2.9 -3.5L-5.8 -6.3L-1.8 -6.8Z" fill="#FFF0B8"/>' +
      '</g></g>';
  }
  function gelo() {
    return '<g class="av-gelo">' +
      '<rect x="11" y="9" width="98" height="104" rx="18" fill="#BFE8FF" fill-opacity=".34" stroke="#E8F8FF" stroke-width="3"/>' +
      '<path d="M21 26Q22 18 30 17M94 101Q100 99 101 92" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M28 34L40 22M84 106L98 92" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M24 113L28 121L32 113M46 113L49 119L52 113M70 113L74 122L78 113M90 113L93 118L96 113" fill="#DFF4FF" stroke="#E8F8FF" stroke-width="1.4" stroke-linejoin="round"/>' +
      brilho4(98, 20, 5, "av-cintila") + brilho4(18, 92, 4, "av-cintila av-cintila-2") +
      '</g>';
  }
  function lagrima(m) {
    var f = m.rosto, s = f.s, x = f.x - 12.5 * s - 3 * s, y = f.y + 7 * s;
    return '<path class="av-lagrima" d="M' + n(x) + " " + n(y) + "C" + n(x + 3.6) + " " + n(y + 5) + " " + n(x + 4.4) + " " + n(y + 7.4) + " " + n(x + 2.4) + " " + n(y + 9.6) + "C" + n(x + .6) + " " + n(y + 11.4) + " " + n(x - 2.8) + " " + n(y + 10.2) + " " + n(x - 2.8) + " " + n(y + 7.6) + "C" + n(x - 2.8) + " " + n(y + 5.6) + " " + n(x - 1.2) + " " + n(y + 3.4) + " " + n(x) + " " + n(y) + 'Z" fill="#8FD3FF" stroke="#1C070D" stroke-width="1.2"/>';
  }

  /* ---------- montagem ---------- */
  var uid = 0;
  /* av: { base, expr, acess, tom, estilo } · op: { cor, estado, indice, classe, estatico, rotulo } */
  function svg(av, op) {
    op = op || {};
    var a = normalizar(av, op.indice);
    var m = PORID[a.base], est = a.estilo, estado = op.estado || "parado";
    var base = tonalizar(op.cor || "#E5383B", a.tom), id = "av" + (++uid);
    var c = {
      id: id, est: est, base: base,
      claro: mix(base, "#FFFFFF", .5), escuro: mix(base, "#000000", .36),
      traco: est === "fofo" ? mix(base, "#000000", .58) : "#1C070D",
      w: est === "fofo" ? 2.6 : 4,
      lingua: "#FF6F91"
    };
    c.tinta = m.rosto.claro ? "#EFFBFF" : est === "fofo" ? "#2A1418" : "#1C070D";
    c.T = ' stroke="' + c.traco + '" stroke-width="' + c.w + '" stroke-linejoin="round" stroke-linecap="round"';
    c.t = ' stroke="' + c.traco + '" stroke-width="' + n(c.w * .55) + '" stroke-linejoin="round" stroke-linecap="round"';
    c.vidro = mix(base, "#FFFFFF", .72);
    var defs = "";
    if (est === "fofo") {
      defs += '<radialGradient id="' + id + 'g" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="' + mix(base, "#FFFFFF", .42) + '"/><stop offset=".6" stop-color="' + base + '"/><stop offset="1" stop-color="' + mix(base, "#000000", .18) + '"/></radialGradient>';
      c.corpo = "url(#" + id + "g)";
    } else c.corpo = base;

    var tipoRosto = estado === "comemorando" || estado === "trofeu" ? "feliz" : estado === "lamentando" ? "triste" : estado === "congelado" ? "gelado" : a.expr;
    var corpo = (m.atras ? m.atras(c) : "") +
      '<g class="av-silhueta"' + (m.pintar ? m.pintar(c) : ' fill="' + c.corpo + '"') + c.T + '>' + m.silhueta + '</g>' +
      (m.frente ? m.frente(c) : "");
    if (m.brilho && est === "palco") corpo += '<ellipse cx="' + m.brilho.x + '" cy="' + m.brilho.y + '" rx="' + m.brilho.rx + '" ry="' + m.brilho.ry + '" transform="rotate(' + m.brilho.r + ' ' + m.brilho.x + ' ' + m.brilho.y + ')" fill="#FFFFFF" opacity=".42"/>';
    if (m.brilho && est === "fofo") corpo += '<ellipse cx="' + m.brilho.x + '" cy="' + m.brilho.y + '" rx="' + n(m.brilho.rx * .6) + '" ry="' + n(m.brilho.ry * .6) + '" transform="rotate(' + m.brilho.r + ' ' + m.brilho.x + ' ' + m.brilho.y + ')" fill="#FFFFFF" opacity=".6"/>';
    if (a.acess === "jaleco") corpo += jaleco(m, c);
    corpo += rosto(m, tipoRosto, c);
    if (ACESSORIO_DESENHO[a.acess]) corpo += ACESSORIO_DESENHO[a.acess](m, c);
    if (estado === "lamentando") corpo += lagrima(m);

    var atras = '<ellipse class="av-sombra" cx="60" cy="113" rx="31" ry="5" fill="#000000" opacity=".28"/>';
    var frente = "";
    if (estado === "navez") {
      atras = '<ellipse class="av-halo" cx="60" cy="113" rx="44" ry="8" fill="' + OURO + '" opacity=".55"/>' + atras;
      frente += brilho4(104, 22, 6, "av-cintila") + brilho4(16, 40, 4.5, "av-cintila av-cintila-2");
    }
    if (estado === "comemorando") frente += confete();
    if (estado === "congelado") frente += gelo();
    if (estado === "trofeu") { atras = raios() + atras; frente += brilho4(104, 30, 6, "av-cintila") + brilho4(14, 26, 5, "av-cintila av-cintila-2"); }

    var mov = estado === "trofeu" ? '<g class="av-mov"><g transform="translate(60 113) scale(.8) translate(-60 -113)">' + corpo + '</g>' + taca(c) + '</g>' : '<g class="av-mov">' + corpo + '</g>';
    var classe = "avatar av-" + est + " av-" + estado + " av-b-" + a.base + (op.estatico ? " av-estatico" : "") + (op.classe ? " " + op.classe : "");
    var rotulo = op.rotulo ? ' role="img" aria-label="' + String(op.rotulo).replace(/"/g, "&quot;") + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="' + classe + '" viewBox="0 0 120 124"' + rotulo + '>' + (defs ? '<defs>' + defs + '</defs>' : '') + atras + mov + frente + '</svg>';
  }

  function descrever(av, i) {
    var a = normalizar(av, i);
    var nome = function (lista, id) { for (var k = 0; k < lista.length; k++) if (lista[k].id === id) return lista[k].nome; return ""; };
    return PORID[a.base].nome + ", " + nome(EXPRESSOES, a.expr).toLowerCase() + (a.acess !== "nenhum" ? ", com " + nome(ACESSORIOS, a.acess).toLowerCase() : "");
  }

  return {
    svg: svg, registrar: registrar, normalizar: normalizar, padrao: padrao, aleatorio: aleatorio, descrever: descrever,
    tonalizar: tonalizar, mix: mix,
    get personagens() { return PERSONAGENS.slice(); },
    EXPRESSOES: EXPRESSOES, ACESSORIOS: ACESSORIOS, TONS: TONS, ESTILOS: ESTILOS, ESTADOS: ESTADOS,
    NOMES_DISCIPLINA: NOMES_DISCIPLINA
  };
})();
