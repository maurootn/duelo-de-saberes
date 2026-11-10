/* Duelo de Saberes 2.0 · Voz que lê as perguntas (Fase 5) e legenda palavra a palavra (Fase 7)
   Usa a voz do próprio aparelho (Web Speech API). No Windows e no Android as vozes em português
   costumam vir instaladas e funcionam sem internet; as vozes "Google" do Chrome precisam de internet.
   Uso: VOZ.ler(texto, chave), VOZ.parar(), VOZ.configurar({ ligada, velocidade, volume, nome }).
   Legenda: VOZ.dividir(texto) dá as palavras na mesma ordem em que a voz avisa; VOZ.aoPalavra(f) recebe
   (chave, índice) a cada palavra lida e (chave, -1) no fim. Quando a voz não informa as palavras
   (algumas vozes "Google" não informam), o índice é estimado pelo tempo de fala. */

window.VOZ = (function () {
  "use strict";
  var sint = window.speechSynthesis || null;
  var cfg = { ligada: true, velocidade: 1, volume: 1, nome: "" };
  var estado = { chave: null, falando: false, terminou: false, comecou: false };  /* comecou = a voz chegou a falar */
  var vozes = [], ouvintes = [], ouvintesPalavra = [], atual = null, vigia = null, estimador = null;
  /* legenda da fala atual: palavra em destaque e mapa entre o texto falado e as palavras originais */
  var leg = { chave: null, idx: -1, inicios: [], porFala: [], marcou: false, t0: 0, pausadoEm: 0, pausaTotal: 0, totalCar: 0 };

  function carregarVozes() {
    if (!sint) return;
    var todas = sint.getVoices() || [];
    /* só português; o Brasil primeiro, depois as vozes locais (funcionam sem internet) */
    vozes = todas.filter(function (v) { return /^pt/i.test(v.lang); }).sort(function (a, b) {
      var br = (/BR/i.test(b.lang) ? 1 : 0) - (/BR/i.test(a.lang) ? 1 : 0);
      if (br) return br;
      return (b.localService ? 1 : 0) - (a.localService ? 1 : 0);
    });
    ouvintes.forEach(function (f) { f(); });
  }
  if (sint) {
    carregarVozes();
    if (typeof sint.addEventListener === "function") sint.addEventListener("voiceschanged", carregarVozes);
    else sint.onvoiceschanged = carregarVozes;
  }

  function escolherVoz() {
    if (!vozes.length) return null;
    if (cfg.nome) for (var i = 0; i < vozes.length; i++) if (vozes[i].name === cfg.nome) return vozes[i];
    /* automático: com internet, a voz do Google (mais natural) se existir; sem internet, uma voz local */
    if (navigator.onLine) for (var k = 0; k < vozes.length; k++) if (/google/i.test(vozes[k].name) && /BR/i.test(vozes[k].lang)) return vozes[k];
    for (var m = 0; m < vozes.length; m++) if (vozes[m].localService) return vozes[m];
    return vozes[0];
  }

  /* deixa o texto bom de ouvir: CO₂ vira "CO 2", setas viram palavras, siglas comuns ficam por extenso */
  var SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": " mais", "⁻": " menos" };
  function limpar(t) {
    return String(t)
      .replace(/<[^>]+>/g, " ")
      .replace(/([A-Za-z\)])([₀-₉]+)/g, function (_, a, n) { return a + " " + n.replace(/[₀-₉]/g, function (c) { return SUB[c]; }); })
      .replace(/[₀-₉⁰-⁹⁺⁻]/g, function (c) { return SUB[c]; })
      .replace(/→|⟶|->/g, " produz ")
      .replace(/⇌|<->/g, " em equilíbrio com ")
      .replace(/\bATP\b/g, "A T P").replace(/\bADP\b/g, "A D P").replace(/\bDNA\b/g, "D N A").replace(/\bRNA\b/g, "R N A")
      .replace(/\bNADH\b/g, "N A D H").replace(/\bFADH\b/g, "F A D H")
      .replace(/\s+/g, " ").trim();
  }

  function avisar() { ouvintes.forEach(function (f) { f(); }); }

  function avisarPalavra(i) {
    if (leg.idx === i) return;
    leg.idx = i;
    ouvintesPalavra.forEach(function (f) { f(leg.chave, i); });
  }
  function pararEstimador() { if (estimador) { clearInterval(estimador); estimador = null; } }
  function encerrarLegenda() { pararEstimador(); if (leg.idx !== -1) avisarPalavra(-1); }

  /* palavras do texto original, na ordem da fala (a tela usa a mesma divisão para destacar) */
  function dividir(t) { return String(t).replace(/<[^>]+>/g, " ").match(/\S+/g) || []; }

  function parar() {
    if (vigia) { clearInterval(vigia); vigia = null; }
    encerrarLegenda();
    if (sint && (sint.speaking || sint.pending)) sint.cancel();
    atual = null;
    if (estado.falando) { estado.falando = false; avisar(); }
  }

  /* lê um texto; partes = lista de frases (cada uma vira uma fala, com pausa natural entre elas).
     Cada frase é dividida em palavras; o texto falado é montado palavra a palavra, então dá para saber
     qual palavra original corresponde a cada posição falada. */
  function ler(partes, chave) {
    parar();
    estado = { chave: chave || null, falando: false, terminou: false, comecou: false };
    leg = { chave: chave || null, idx: -1, inicios: [], porFala: [], marcou: false, t0: 0, pausadoEm: 0, pausaTotal: 0, totalCar: 0 };
    if (!sint || !cfg.ligada) { estado.terminou = true; return false; }
    var falas = [], base = 0;
    (Array.isArray(partes) ? partes : [partes]).forEach(function (frase) {
      var pals = dividir(frase), txt = "", mapa = [];
      pals.forEach(function (p, k) {
        var dita = limpar(p);
        if (!dita) return;
        if (txt) txt += " ";
        mapa.push({ ini: txt.length, palavra: base + k, acum: leg.totalCar + txt.length });
        txt += dita;
      });
      base += pals.length;
      if (txt) { falas.push({ txt: txt, mapa: mapa }); leg.totalCar += txt.length + 1; }
    });
    if (!falas.length) { estado.terminou = true; return false; }
    leg.porFala = falas.map(function (f) { return f.mapa; });
    leg.inicios = [].concat.apply([], leg.porFala);
    var voz = escolherVoz(), restantes = falas.length, minha = {};
    atual = minha;
    estado.falando = true;
    falas.forEach(function (fala, nf) {
      var u = new SpeechSynthesisUtterance(fala.txt);
      u.lang = voz ? voz.lang : "pt-BR";
      if (voz) u.voice = voz;
      u.rate = cfg.velocidade;
      u.volume = cfg.volume;
      u.pitch = 1;
      u.onstart = function () {
        if (atual !== minha) return;
        if (!estado.comecou) { estado.comecou = true; leg.t0 = Date.now(); iniciarEstimador(minha); }
        if (fala.mapa.length) avisarPalavra(fala.mapa[0].palavra);
      };
      u.onboundary = function (ev) {
        if (atual !== minha || (ev.name && ev.name !== "word")) return;
        leg.marcou = true;
        var m = fala.mapa, i = 0;
        while (i + 1 < m.length && m[i + 1].ini <= ev.charIndex) i++;
        if (m.length) avisarPalavra(m[i].palavra);
      };
      u.onend = u.onerror = function () {
        if (atual !== minha) return;
        restantes--;
        if (restantes <= 0) { estado.falando = false; estado.terminou = true; atual = null; encerrarLegenda(); avisar(); }
      };
      sint.speak(u);
    });
    /* o Chrome às vezes trava falas longas no meio: um "resume" periódico mantém a fala andando,
       e se nada começar em 3 s (aparelho sem voz), a leitura é dada como encerrada */
    var t0 = Date.now();
    vigia = setInterval(function () {
      if (atual !== minha) { clearInterval(vigia); vigia = null; return; }
      if (!estado.comecou && Date.now() - t0 > 3000) { parar(); estado.terminou = true; avisar(); return; }
      if (sint.speaking && !sint.paused) { sint.pause(); sint.resume(); }
    }, 5000);
    avisar();
    return true;
  }

  /* legenda estimada: se em 0,8 s a voz não informou nenhuma palavra, o destaque anda pelo tempo de fala
     (cerca de 14 caracteres por segundo na velocidade normal) */
  function iniciarEstimador(minha) {
    pararEstimador();
    estimador = setInterval(function () {
      if (atual !== minha) { pararEstimador(); return; }
      if (leg.marcou) { pararEstimador(); return; }
      if (leg.pausadoEm) return;
      var passou = (Date.now() - leg.t0 - leg.pausaTotal) / 1000;
      if (passou < 0.8) return;
      var car = passou * 14 * cfg.velocidade, i = 0, m = leg.inicios;
      while (i + 1 < m.length && m[i + 1].acum <= car) i++;
      if (m.length) avisarPalavra(m[i].palavra);
    }, 120);
  }

  function pausar(sim) {
    if (!sint || !estado.falando) return;
    if (sim) { sint.pause(); if (!leg.pausadoEm) leg.pausadoEm = Date.now(); }
    else { sint.resume(); if (leg.pausadoEm) { leg.pausaTotal += Date.now() - leg.pausadoEm; leg.pausadoEm = 0; } }
  }

  return {
    disponivel: function () { return !!sint; },
    ler: ler,
    parar: parar,
    pausar: pausar,
    /* a leitura desta chave ainda está em andamento? */
    falando: function (chave) { return estado.falando && (chave === undefined || estado.chave === chave); },
    /* a leitura desta chave já acabou (ou nem pôde começar)? */
    terminou: function (chave) { return estado.chave === chave && estado.terminou; },
    leuEsta: function (chave) { return estado.chave === chave; },
    /* a voz chegou de fato a falar esta chave (o aparelho tem voz e ela não estava desligada)? */
    falouDeVerdade: function (chave) { return estado.chave === chave && estado.comecou; },
    configurar: function (c) {
      if ("ligada" in c) { cfg.ligada = !!c.ligada; if (!cfg.ligada) parar(); }
      if ("velocidade" in c) cfg.velocidade = Number(c.velocidade) || 1;
      if ("volume" in c) { var vol = Number(c.volume); cfg.volume = isFinite(vol) ? Math.min(1, Math.max(0.1, vol)) : 1; }
      if ("nome" in c) cfg.nome = c.nome || "";
    },
    ligada: function () { return cfg.ligada && !!sint; },
    vozes: function () { return vozes.map(function (v) { return { nome: v.name, idioma: v.lang, local: v.localService }; }); },
    vozEmUso: function () { var v = escolherVoz(); return v ? v.name : ""; },
    aoMudar: function (f) { ouvintes.push(f); },
    aoPalavra: function (f) { ouvintesPalavra.push(f); },
    /* palavra em destaque agora (-1 = nenhuma) para a chave pedida */
    palavraAtual: function (chave) { return leg.chave === chave ? leg.idx : -1; },
    dividir: dividir,
    limpar: limpar
  };
})();
