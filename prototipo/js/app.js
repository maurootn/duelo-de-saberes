/* Duelo de Saberes · Protótipo navegável da Fase 3 (identidade visual)
   Telas: inicial → configuração → tabuleiro → pergunta → placar.
   As regras completas (passe, especiais, roletas, desfazer) entram na Fase 4. */

(function () {
  "use strict";

  var D = window.DADOS, LOGO = window.LOGO;
  var app = document.getElementById("app");
  var painel = document.getElementById("painel-visual");
  var CHAVE = "duelo-prototipo-v2";

  /* ---------- estado ---------- */
  var visual = { tema: "palco", modo: "escuro", painelAberto: false };
  var config = {
    modoJogo: "sala", disciplina: "biologia", nivel: "calouro", temaArena: D.temasArena[0],
    rodadas: 3, nEquipes: 4,
    equipes: D.equipesPadrao.map(function (e) { return { nome: e.nome, cor: e.cor, forma: e.forma }; })
  };
  var tela = "inicio";
  var partida = null;   // { rodada, vez, cartas[], pontos[] }
  var pergunta = null;  // { carta, q, ordem[], restante, total, pausado, resultado }
  var relogio = null;
  var placarAberto = false;

  carregar();

  function carregar() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (!s) return;
      if (s.visual) Object.keys(visual).forEach(function (k) { if (k in s.visual && k !== "painelAberto") visual[k] = s.visual[k]; });
      if (s.config) Object.keys(config).forEach(function (k) { if (k in s.config) config[k] = s.config[k]; });
    } catch (e) { /* sem armazenamento: segue com o padrão */ }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ visual: visual, config: config })); } catch (e) {}
  }

  /* ---------- utilidades ---------- */
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function achar(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return lista[0]; }
  function embaralhar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function equipesAtivas() { return config.equipes.slice(0, config.nEquipes); }
  function corHex(id) { return achar(D.cores, id).hex; }
  function ficha(eq, classe) {
    var f = achar(D.formas, eq.forma);
    return '<svg class="ficha ' + (classe || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="' + f.d + '" fill="' + corHex(eq.cor) + '" stroke="var(--ficha-traco)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  function pontosTxt(n) { return (n < 0 ? "−" : "") + Math.abs(n); }
  function nomeTema() {
    if (config.modoJogo === "arena") return "Arena · " + config.temaArena;
    return achar(D.disciplinas, config.disciplina).nome + " · " + achar(D.niveis, config.nivel).nome;
  }

  /* ---------- aparência ---------- */
  function aplicarVisual() {
    var b = document.body;
    var emJogo = tela === "tabuleiro" || tela === "pergunta" || tela === "placar";
    b.dataset.tema = emJogo ? visual.tema : "palco";
    b.dataset.modo = visual.modo;
    b.dataset.tela = tela;
  }

  /* ---------- telas ---------- */
  function desenhar() {
    pararRelogio();
    aplicarVisual();
    var html = "";
    if (tela === "inicio") html = telaInicio();
    else if (tela === "config") html = telaConfig();
    else if (tela === "tabuleiro") html = telaTabuleiro();
    else if (tela === "pergunta") html = telaPergunta();
    else if (tela === "placar") html = telaPlacar();
    app.innerHTML = html;
    desenharPainel();
    if (tela === "pergunta" && !pergunta.resultado) iniciarRelogio();
    var foco = app.querySelector("[data-foco]");
    if (foco) foco.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function telaInicio() {
    return '' +
    '<main class="tela inicio">' +
      '<div class="cenario" aria-hidden="true"><div class="holofotes"><i></i><i></i><i></i><i></i></div><div class="sanefa"></div><div class="cortina esq"></div><div class="cortina dir"></div><div class="piso"></div><div class="ribalta"></div></div>' +
      '<div class="inicio-centro">' +
        LOGO.completo("logo-grande") +
        '<p class="inicio-frase">Vinte cartas viradas, perguntas de 100 a 500 e uma equipe de olho na outra.</p>' +
        '<div class="inicio-acoes">' +
          '<button class="botao botao-principal botao-enorme" data-acao="ir-config" data-foco>Nova partida</button>' +
          '<button class="botao botao-contorno" data-acao="jogo-rapido">Abrir o tabuleiro de exemplo</button>' +
        '</div>' +
      '</div>' +
      '<footer class="inicio-rodape">Protótipo visual da versão 2.0, com dados de exemplo · Prof. Mauro Vinícius, Tanque Novo-BA</footer>' +
    '</main>';
  }

  function telaConfig() {
    var sala = config.modoJogo === "sala";
    var h = '<main class="tela config">' +
      '<header class="barra">' +
        '<button class="botao botao-contorno botao-pequeno" data-acao="ir-inicio">Voltar</button>' +
        LOGO.completo("logo-barra") +
        '<span class="barra-titulo">Nova partida</span>' +
      '</header>' +
      '<div class="config-grade">' +

      '<section class="bloco">' +
        '<h2>Modo de jogo</h2>' +
        '<div class="opcoes opcoes-2" role="radiogroup" aria-label="Modo de jogo">' +
          opcao("modoJogo", "sala", "Sala de Aula", "Disciplina e nível do ensino médio") +
          opcao("modoJogo", "arena", "Arena", "Tema livre de conhecimentos gerais") +
        '</div>' +
        '<h2 class="sub">Rodadas</h2>' +
        '<div class="contador" role="group" aria-label="Número de rodadas">' +
          '<button class="botao-redondo" data-acao="rodadas" data-valor="-1" aria-label="Menos uma rodada"' + (config.rodadas <= 1 ? " disabled" : "") + '>−</button>' +
          '<output class="contador-valor">' + config.rodadas + '</output>' +
          '<button class="botao-redondo" data-acao="rodadas" data-valor="1" aria-label="Mais uma rodada"' + (config.rodadas >= 5 ? " disabled" : "") + '>+</button>' +
          '<span class="contador-legenda">' + (config.rodadas * 20) + ' cartas no total, 20 por rodada</span>' +
        '</div>' +
      '</section>';

    if (sala) {
      h += '<section class="bloco">' +
        '<h2>Disciplina</h2>' +
        '<div class="chips" role="radiogroup" aria-label="Disciplina">' +
          D.disciplinas.map(function (d) { return chip("disciplina", d.id, d.nome); }).join("") +
        '</div>' +
        (config.disciplina !== "biologia" ? '<p class="nota">O visual desta disciplina chega na Fase 5. Por enquanto o tabuleiro usa o palco neutro.</p>' : '<p class="nota">Biologia já mostra uma prévia do tema no tabuleiro.</p>') +
      '</section>' +
      '<section class="bloco bloco-nivel">' +
        '<h2>Nível</h2>' +
        '<div class="opcoes opcoes-3" role="radiogroup" aria-label="Nível">' +
          D.niveis.map(function (n) { return opcao("nivel", n.id, n.nome, n.series); }).join("") +
        '</div>' +
      '</section>';
    } else {
      h += '<section class="bloco bloco-largo">' +
        '<h2>Tema da Arena</h2>' +
        '<div class="chips" role="radiogroup" aria-label="Tema da Arena">' +
          D.temasArena.map(function (t) { return chip("temaArena", t, t); }).join("") +
        '</div>' +
      '</section>';
    }

    h += '<section class="bloco bloco-largo">' +
        '<div class="bloco-topo"><h2>Equipes</h2>' +
          '<div class="contador contador-compacto" role="group" aria-label="Número de equipes">' +
            '<button class="botao-redondo" data-acao="n-equipes" data-valor="-1" aria-label="Menos uma equipe"' + (config.nEquipes <= 2 ? " disabled" : "") + '>−</button>' +
            '<output class="contador-valor">' + config.nEquipes + '</output>' +
            '<button class="botao-redondo" data-acao="n-equipes" data-valor="1" aria-label="Mais uma equipe"' + (config.nEquipes >= 6 ? " disabled" : "") + '>+</button>' +
          '</div>' +
        '</div>' +
        '<div class="equipes-grade">' + equipesAtivas().map(cartaoEquipe).join("") + '</div>' +
        '<p class="nota">O avatar de cada equipe entra na Fase 6. A forma identifica a equipe mesmo para quem não distingue cores.</p>' +
      '</section>' +

      '</div>' +
      '<div class="config-rodape">' +
        '<span class="config-resumo">' + esc(nomeTema()) + ' · ' + config.rodadas + (config.rodadas > 1 ? ' rodadas' : ' rodada') + ' · ' + config.nEquipes + ' equipes</span>' +
        '<button class="botao botao-principal botao-enorme" data-acao="comecar">Começar partida</button>' +
      '</div>' +
    '</main>';
    return h;
  }

  function opcao(campo, valor, titulo, texto) {
    var on = config[campo] === valor;
    return '<button class="opcao' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="escolher" data-campo="' + campo + '" data-valor="' + esc(valor) + '">' +
      '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></button>';
  }
  function chip(campo, valor, titulo) {
    var on = config[campo] === valor;
    return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="escolher" data-campo="' + campo + '" data-valor="' + esc(valor) + '">' + esc(titulo) + '</button>';
  }

  function cartaoEquipe(eq, i) {
    var usadasCor = equipesAtivas().map(function (e) { return e.cor; });
    return '<div class="equipe-cartao" style="--cor-equipe:' + corHex(eq.cor) + '">' +
      '<div class="equipe-topo">' + ficha(eq, "ficha-grande") +
        '<label class="campo"><span class="so-leitor">Nome da equipe ' + (i + 1) + '</span>' +
        '<input type="text" maxlength="18" value="' + esc(eq.nome) + '" data-equipe="' + i + '" autocomplete="off" spellcheck="false"></label>' +
      '</div>' +
      '<div class="seletor" role="radiogroup" aria-label="Cor da equipe ' + (i + 1) + '">' +
        D.cores.map(function (c) {
          var on = eq.cor === c.id, ocupada = !on && usadasCor.indexOf(c.id) >= 0;
          return '<button class="amostra' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" aria-label="' + c.nome + (ocupada ? " (em uso por outra equipe)" : "") + '" title="' + c.nome + '"' +
            ' style="--amostra:' + c.hex + '" data-acao="cor" data-equipe="' + i + '" data-valor="' + c.id + '"' + (ocupada ? " disabled" : "") + '></button>';
        }).join("") +
      '</div>' +
      '<div class="seletor" role="radiogroup" aria-label="Forma da equipe ' + (i + 1) + '">' +
        D.formas.map(function (f) {
          var on = eq.forma === f.id;
          return '<button class="forma-botao' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" aria-label="' + f.nome + '" title="' + f.nome + '" data-acao="forma" data-equipe="' + i + '" data-valor="' + f.id + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + f.d + '"/></svg></button>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  /* ---------- tabuleiro ---------- */
  function novaRodada() {
    var valores = [];
    [100, 200, 300, 400, 500].forEach(function (v) { for (var i = 0; i < 4; i++) valores.push(v); });
    var usoPorValor = {};
    partida.cartas = embaralhar(valores).map(function (v, i) {
      var doValor = D.questoes.filter(function (q) { return q.valor === v; });
      usoPorValor[v] = (usoPorValor[v] || 0) + 1;
      return { n: i + 1, valor: v, usada: false, resultado: null, q: doValor[usoPorValor[v] % doValor.length] };
    });
  }
  function comecarPartida() {
    visual.tema = (config.modoJogo === "sala" && config.disciplina === "biologia") ? "biologia" : "palco";
    partida = { rodada: 1, vez: 0, cartas: [], pontos: equipesAtivas().map(function () { return 0; }) };
    novaRodada();
    tela = "tabuleiro";
    salvar();
    desenhar();
  }

  function telaTabuleiro() {
    var eqs = equipesAtivas(), daVez = eqs[partida.vez];
    var restam = partida.cartas.filter(function (c) { return !c.usada; }).length;
    return '<main class="tela tabuleiro">' +
      '<header class="barra barra-jogo">' +
        LOGO.completo("logo-barra") +
        '<div class="barra-info"><strong>Rodada ' + partida.rodada + ' de ' + config.rodadas + '</strong><span>' + esc(nomeTema()) + '</span></div>' +
        '<div class="barra-acoes">' +
          '<button class="botao botao-contorno botao-pequeno" data-acao="sortear"' + (restam ? "" : " disabled") + '>Sortear carta</button>' +
          '<button class="botao botao-contorno botao-pequeno" data-acao="encerrar">Encerrar</button>' +
        '</div>' +
      '</header>' +

      '<section class="mesa" aria-label="Tabuleiro">' +
        '<p class="vez" style="--cor-equipe:' + corHex(daVez.cor) + '">' + ficha(daVez) + '<span>Vez de <strong>' + esc(daVez.nome) + '</strong>: escolham uma carta</span></p>' +
        '<div class="cartas">' + partida.cartas.map(function (c, i) {
          if (c.usada) {
            return '<div class="carta carta-usada ' + (c.resultado || "") + '" aria-label="Carta ' + c.n + ', já jogada, valia ' + c.valor + '"><span class="carta-valor-usado">' + c.valor + '</span></div>';
          }
          return '<button class="carta" data-acao="carta" data-indice="' + i + '" aria-label="Carta ' + c.n + '"' + (i === primeiraLivre() ? " data-foco" : "") + '>' +
            '<span class="carta-giro"><span class="carta-verso"><span class="carta-numero">' + c.n + '</span></span>' +
            '<span class="carta-frente"><span class="carta-valor">' + c.valor + '</span></span></span></button>';
        }).join("") + '</div>' +
      '</section>' +

      placarLateral() +
    '</main>';
  }
  function primeiraLivre() { for (var i = 0; i < partida.cartas.length; i++) if (!partida.cartas[i].usada) return i; return -1; }

  function placarLateral() {
    var eqs = equipesAtivas();
    var lider = Math.max.apply(null, partida.pontos);
    return '<aside class="placar' + (placarAberto ? " aberto" : "") + '" aria-label="Placar">' +
      '<button class="placar-puxador" data-acao="placar-toggle" aria-expanded="' + placarAberto + '">' +
        '<span>Placar</span>' +
        '<span class="placar-resumo">' + eqs.map(function (e, i) { return '<span class="placar-mini' + (i === partida.vez ? " da-vez" : "") + '">' + ficha(e) + pontosTxt(partida.pontos[i]) + '</span>'; }).join("") + '</span>' +
      '</button>' +
      '<h2 class="placar-titulo">Placar</h2>' +
      '<ol class="placar-lista">' + eqs.map(function (e, i) {
        var p = partida.pontos[i];
        return '<li class="placar-item' + (i === partida.vez ? " da-vez" : "") + '" style="--cor-equipe:' + corHex(e.cor) + '">' +
          ficha(e, "ficha-grande") +
          '<span class="placar-nome">' + esc(e.nome) + (i === partida.vez ? '<em>na vez</em>' : (p === lider && p !== 0 ? '<em>na frente</em>' : '')) + '</span>' +
          '<span class="placar-pontos' + (p < 0 ? " negativo" : "") + '">' + pontosTxt(p) + '</span>' +
        '</li>';
      }).join("") + '</ol>' +
    '</aside>';
  }

  /* ---------- pergunta e cronômetro ---------- */
  function abrirCarta(i) {
    var c = partida.cartas[i];
    if (!c || c.usada || app.querySelector(".carta.virando")) return;
    var el = app.querySelector('.carta[data-indice="' + i + '"]');
    var espera = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 500 : 1300;
    if (el) { el.classList.add("virando"); app.querySelector(".cartas").classList.add("escolhida"); }
    setTimeout(function () {
      pergunta = {
        indice: i, carta: c, q: c.q,
        ordem: embaralhar([0, 1, 2, 3]),
        total: c.q.tempo, restante: c.q.tempo, pausado: false, resultado: null
      };
      tela = "pergunta";
      desenhar();
    }, espera);
  }

  function telaPergunta() {
    var eq = equipesAtivas()[partida.vez], q = pergunta.q, r = pergunta.resultado;
    var letras = ["A", "B", "C", "D"];
    var h = '<main class="tela pergunta' + (r ? " respondida" : "") + '" style="--cor-equipe:' + corHex(eq.cor) + '">' +
      '<header class="barra barra-jogo">' +
        '<p class="vez vez-barra">' + ficha(eq) + '<span><strong>' + esc(eq.nome) + '</strong> responde</span></p>' +
        '<div class="valor-selo" aria-label="Carta valendo ' + q.valor + ' pontos"><small>valendo</small><b>' + q.valor + '</b></div>' +
      '</header>' +

      '<section class="pergunta-corpo">' +
        '<div class="telao"><h1 class="enunciado">' + esc(q.enunciado) + '</h1></div>' +
        '<div class="alternativas">' + pergunta.ordem.map(function (orig, pos) {
          var classe = "alternativa";
          if (r) {
            if (orig === q.correta) classe += " certa";
            else if (r.escolhida === orig) classe += " errada";
            else classe += " apagada";
          }
          return '<button class="' + classe + '" data-acao="responder" data-orig="' + orig + '"' + (r ? " disabled" : "") + (pos === 0 && !r ? " data-foco" : "") + '>' +
            '<span class="letra">' + letras[pos] + '</span><span class="texto">' + esc(q.alternativas[orig]) + '</span></button>';
        }).join("") + '</div>' +
      '</section>' +

      '<aside class="pergunta-lado">';

    if (!r) {
      h += cronometro() +
        '<div class="lado-acoes">' +
          '<button class="botao botao-contorno" data-acao="pausar">' + (pergunta.pausado ? "Continuar" : "Pausar") + '</button>' +
          '<button class="botao botao-contorno" data-acao="passar">Passar</button>' +
        '</div>';
    } else {
      h += '<div class="veredito ' + r.tipo + '" role="status">' +
          '<span class="veredito-titulo">' + r.titulo + '</span>' +
          (r.delta !== null ? '<span class="veredito-pontos">' + (r.delta > 0 ? "+" : "−") + Math.abs(r.delta) + '</span>' : '') +
          '<p>' + esc(r.texto) + '</p>' +
        '</div>' +
        '<button class="botao botao-principal botao-enorme" data-acao="voltar-tabuleiro" data-foco>Voltar ao tabuleiro</button>';
    }
    h += '</aside></main>';
    return h;
  }

  var RAIO = 52, CIRC = 2 * Math.PI * RAIO;
  function cronometro() {
    return '<div class="cronometro" role="timer" aria-label="Tempo restante">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true">' +
        '<circle class="crono-trilho" cx="60" cy="60" r="' + RAIO + '"/>' +
        '<circle class="crono-arco" cx="60" cy="60" r="' + RAIO + '" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>' +
      '</svg>' +
      '<span class="crono-numero">' + Math.ceil(pergunta.restante) + '</span>' +
      '<span class="crono-legenda">segundos</span>' +
    '</div>';
  }
  function atualizarCronometro() {
    var el = app.querySelector(".cronometro");
    if (!el) return;
    var seg = Math.max(0, Math.ceil(pergunta.restante));
    el.querySelector(".crono-numero").textContent = seg;
    el.querySelector(".crono-arco").setAttribute("stroke-dashoffset", (CIRC * (1 - pergunta.restante / pergunta.total)).toFixed(1));
    el.classList.toggle("alerta", seg <= 5);
    el.classList.toggle("pausado", pergunta.pausado);
  }
  function iniciarRelogio() {
    var ultimo = performance.now();
    atualizarCronometro();
    relogio = setInterval(function () {
      var agora = performance.now(), dt = (agora - ultimo) / 1000;
      ultimo = agora;
      if (pergunta.pausado) return;
      pergunta.restante = Math.max(0, pergunta.restante - dt);
      atualizarCronometro();
      if (pergunta.restante <= 0) finalizar("tempo");
    }, 100);
  }
  function pararRelogio() { if (relogio) { clearInterval(relogio); relogio = null; } }

  function finalizar(tipo, escolhida) {
    if (!pergunta || pergunta.resultado) return;
    pararRelogio();
    var q = pergunta.q, v = q.valor, r;
    if (tipo === "resposta") {
      if (escolhida === q.correta) {
        partida.pontos[partida.vez] += v;
        r = { tipo: "acerto", titulo: "Acertou!", delta: v, texto: q.explicacao, escolhida: escolhida };
        pergunta.carta.resultado = "acerto";
      } else {
        partida.pontos[partida.vez] -= v / 2;
        r = { tipo: "erro", titulo: "Errou", delta: -v / 2, texto: q.explicacao + " No jogo completo, a questão iria agora para o passe.", escolhida: escolhida };
        pergunta.carta.resultado = "erro";
      }
    } else {
      r = { tipo: "passe", titulo: tipo === "tempo" ? "Tempo esgotado" : "Passou a vez", delta: null, escolhida: null,
            texto: "Ninguém perde pontos. No jogo completo, a questão vai para o passe, com sorteio da equipe que recebe (Fase 4)." };
      pergunta.carta.resultado = "passe";
    }
    pergunta.resultado = r;
    pergunta.carta.usada = true;
    desenhar();
  }

  function voltarAoTabuleiro() {
    var n = config.nEquipes;
    partida.vez = (partida.vez + 1) % n;
    pergunta = null;
    var restam = partida.cartas.some(function (c) { return !c.usada; });
    if (!restam) {
      if (partida.rodada < config.rodadas) { partida.rodada++; novaRodada(); tela = "tabuleiro"; }
      else tela = "placar";
    } else tela = "tabuleiro";
    desenhar();
  }

  /* ---------- placar final ---------- */
  function telaPlacar() {
    var eqs = equipesAtivas().map(function (e, i) { return { e: e, p: partida.pontos[i] }; });
    eqs.sort(function (a, b) { return b.p - a.p; });
    var topo = Math.max(1, Math.abs(eqs[0].p), Math.abs(eqs[eqs.length - 1].p));
    return '<main class="tela final">' +
      '<div class="cenario" aria-hidden="true"><div class="holofotes"><i></i><i></i><i></i><i></i></div><div class="sanefa"></div><div class="cortina esq"></div><div class="cortina dir"></div><div class="piso"></div><div class="ribalta"></div></div>' +
      '<header class="final-topo">' + LOGO.completo("logo-barra") + '<h1>Placar da partida</h1><p>' + esc(nomeTema()) + '</p></header>' +
      '<ol class="final-lista">' + eqs.map(function (x, i) {
        var empatado = i > 0 && eqs[i - 1].p === x.p;
        return '<li class="final-item' + (i === 0 ? " primeiro" : "") + '" style="--cor-equipe:' + corHex(x.e.cor) + ';--largura:' + Math.max(4, Math.round(Math.max(0, x.p) / topo * 100)) + '%">' +
          '<span class="final-posicao">' + (empatado ? "=" : (i + 1) + "º") + '</span>' + ficha(x.e, "ficha-grande") +
          '<span class="final-nome">' + esc(x.e.nome) + '<i class="final-barra"></i></span>' +
          '<span class="placar-pontos' + (x.p < 0 ? " negativo" : "") + '">' + pontosTxt(x.p) + '</span></li>';
      }).join("") + '</ol>' +
      '<p class="nota nota-centro">O pódio animado, com a trajetória de cada equipe e o troféu, entra com o motor de regras (Fase 4).</p>' +
      '<div class="inicio-acoes">' +
        '<button class="botao botao-principal botao-enorme" data-acao="comecar" data-foco>Jogar de novo</button>' +
        '<button class="botao botao-contorno" data-acao="ir-inicio">Tela inicial</button>' +
      '</div>' +
    '</main>';
  }

  /* ---------- painel "Testar visual" ---------- */
  function desenharPainel() {
    function grupo(titulo, campo, itens) {
      return '<fieldset class="pv-grupo"><legend>' + titulo + '</legend><div class="pv-opcoes">' + itens.map(function (it) {
        var on = visual[campo] === it[0];
        return '<button class="pv-opcao' + (on ? " ativa" : "") + '" aria-pressed="' + on + '" data-acao="visual" data-campo="' + campo + '" data-valor="' + it[0] + '">' + it[1] + '</button>';
      }).join("") + '</div></fieldset>';
    }
    painel.innerHTML =
      '<button class="pv-botao" data-acao="painel" aria-expanded="' + visual.painelAberto + '" aria-controls="pv-caixa">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.5-.2-1-.5-1.300-.3-.4-.5-.8-.5-1.3 0-1.100.9-2 2-2h2.300A4.700 4.700 0 0 0 22 9.700C22 6 17.500 3 12 3Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.500" cy="11" r="1.400"/><circle cx="10.500" cy="7.300" r="1.400"/><circle cx="15" cy="7.500" r="1.400"/></svg>' +
        '<span>Testar visual</span></button>' +
      (visual.painelAberto ?
        '<div class="pv-caixa" id="pv-caixa" role="dialog" aria-label="Testar visual">' +
          '<p class="pv-titulo">Testar visual<button class="pv-fechar" data-acao="painel" aria-label="Fechar">×</button></p>' +
          grupo("Tema do tabuleiro", "tema", [["palco", "Palco (neutro)"], ["biologia", "Biologia (prévia)"]]) +
          grupo("Modo", "modo", [["escuro", "Palco escuro (padrão)"], ["claro", "Sala clara"]]) +
          '<p class="pv-nota">O tema vale no tabuleiro, na pergunta e no placar. A tela inicial e a configuração ficam sempre no palco.</p>' +
        '</div>' : '');
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-acao]");
    if (!b || b.disabled) return;
    var a = b.dataset.acao, v = b.dataset.valor, i;
    switch (a) {
      case "ir-inicio": tela = "inicio"; desenhar(); break;
      case "ir-config": tela = "config"; desenhar(); break;
      case "jogo-rapido": comecarPartida(); break;
      case "comecar": comecarPartida(); break;
      case "escolher": config[b.dataset.campo] = v; salvar(); desenhar(); break;
      case "rodadas": config.rodadas = Math.min(5, Math.max(1, config.rodadas + Number(v))); salvar(); desenhar(); break;
      case "n-equipes": config.nEquipes = Math.min(6, Math.max(2, config.nEquipes + Number(v))); corrigirCores(); salvar(); desenhar(); break;
      case "cor": config.equipes[Number(b.dataset.equipe)].cor = v; salvar(); desenhar(); break;
      case "forma": config.equipes[Number(b.dataset.equipe)].forma = v; salvar(); desenhar(); break;
      case "carta": abrirCarta(Number(b.dataset.indice)); break;
      case "sortear":
        var livres = [];
        partida.cartas.forEach(function (c, k) { if (!c.usada) livres.push(k); });
        if (livres.length) abrirCarta(livres[Math.floor(Math.random() * livres.length)]);
        break;
      case "encerrar": tela = "placar"; desenhar(); break;
      case "placar-toggle": placarAberto = !placarAberto; b.closest(".placar").classList.toggle("aberto", placarAberto); b.setAttribute("aria-expanded", placarAberto); break;
      case "responder": finalizar("resposta", Number(b.dataset.orig)); break;
      case "passar": finalizar("passou"); break;
      case "pausar": pergunta.pausado = !pergunta.pausado; b.textContent = pergunta.pausado ? "Continuar" : "Pausar"; atualizarCronometro(); break;
      case "voltar-tabuleiro": voltarAoTabuleiro(); break;
      case "painel": visual.painelAberto = !visual.painelAberto; desenharPainel(); break;
      case "visual":
        visual[b.dataset.campo] = v; salvar(); aplicarVisual(); desenharPainel();
        break;
    }
  });

  /* duas equipes não ficam com a mesma cor */
  function corrigirCores() {
    var usadas = {};
    equipesAtivas().forEach(function (e) {
      if (usadas[e.cor]) {
        for (var k = 0; k < D.cores.length; k++) if (!usadas[D.cores[k].id]) { e.cor = D.cores[k].id; break; }
      }
      usadas[e.cor] = true;
    });
  }

  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.matches("input[data-equipe]")) {
      config.equipes[Number(t.dataset.equipe)].nome = t.value.trim() || ("Equipe " + (Number(t.dataset.equipe) + 1));
      salvar();
    }
  });

  /* teclado: A–D ou 1–4 respondem, espaço pausa, P passa */
  document.addEventListener("keydown", function (ev) {
    if (ev.target.matches("input, textarea")) return;
    if (ev.key === "Escape" && visual.painelAberto) { visual.painelAberto = false; desenharPainel(); return; }
    if (tela !== "pergunta" || !pergunta || pergunta.resultado || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var k = ev.key.toLowerCase(), pos = "abcd".indexOf(k);
    if (pos < 0) pos = "1234".indexOf(k);
    if (pos >= 0 && k.length === 1) { ev.preventDefault(); finalizar("resposta", pergunta.ordem[pos]); }
    else if (k === "p") { ev.preventDefault(); finalizar("passou"); }
    else if (k === " " && !ev.target.matches("button")) {
      ev.preventDefault(); pergunta.pausado = !pergunta.pausado;
      var bp = app.querySelector('[data-acao="pausar"]'); if (bp) bp.textContent = pergunta.pausado ? "Continuar" : "Pausar";
      atualizarCronometro();
    }
  });

  corrigirCores();
  desenhar();
})();
