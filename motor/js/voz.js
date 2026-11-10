/* Duelo de Saberes 2.0 · Voz que lê as perguntas
   Usa a voz do próprio aparelho (Web Speech API). No Windows e no Android as vozes em português
   costumam vir instaladas e funcionam sem internet; as vozes "Google" do Chrome precisam de internet.
   Uso: VOZ.ler(texto, chave), VOZ.parar(), VOZ.configurar({ ligada, velocidade, nome }). */

window.VOZ = (function () {
  "use strict";
  var sint = window.speechSynthesis || null;
  var cfg = { ligada: true, velocidade: 1, nome: "" };
  var estado = { chave: null, falando: false, terminou: false, comecou: false };  /* comecou = a voz chegou a falar */
  var vozes = [], ouvintes = [], atual = null, vigia = null;

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

  function parar() {
    if (vigia) { clearInterval(vigia); vigia = null; }
    if (sint && (sint.speaking || sint.pending)) sint.cancel();
    atual = null;
    if (estado.falando) { estado.falando = false; avisar(); }
  }

  /* lê um texto; partes = lista de frases (cada uma vira uma fala, com pausa natural entre elas) */
  function ler(partes, chave) {
    parar();
    estado = { chave: chave || null, falando: false, terminou: false, comecou: false };
    if (!sint || !cfg.ligada) { estado.terminou = true; return false; }
    var lista = (Array.isArray(partes) ? partes : [partes]).map(limpar).filter(Boolean);
    if (!lista.length) { estado.terminou = true; return false; }
    var voz = escolherVoz(), restantes = lista.length, minha = {};
    atual = minha;
    estado.falando = true;
    lista.forEach(function (txt) {
      var u = new SpeechSynthesisUtterance(txt);
      u.lang = voz ? voz.lang : "pt-BR";
      if (voz) u.voice = voz;
      u.rate = cfg.velocidade;
      u.pitch = 1;
      u.onstart = function () { if (atual === minha) estado.comecou = true; };
      u.onend = u.onerror = function () {
        if (atual !== minha) return;
        restantes--;
        if (restantes <= 0) { estado.falando = false; estado.terminou = true; atual = null; avisar(); }
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

  function pausar(sim) {
    if (!sint || !estado.falando) return;
    if (sim) sint.pause(); else sint.resume();
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
      if ("nome" in c) cfg.nome = c.nome || "";
    },
    ligada: function () { return cfg.ligada && !!sint; },
    vozes: function () { return vozes.map(function (v) { return { nome: v.name, idioma: v.lang, local: v.localService }; }); },
    vozEmUso: function () { var v = escolherVoz(); return v ? v.name : ""; },
    aoMudar: function (f) { ouvintes.push(f); },
    limpar: limpar
  };
})();
