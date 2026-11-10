/* Duelo de Saberes 2.0 · Interface do motor de regras (Fase 4) com temas visuais e sons (Fase 5)
   As regras ficam em regras.js; aqui só se desenha e se chama o motor.
   Telas: inicio → config → (fase do motor: tabuleiro, pergunta, resultado, passe, roleta,
   fim-rodada, morte-intro, morte-leva, fim). Visual base da Fase 3. Cada tema fica em temas/<disciplina>/; os sons, em js/sons.js.
   Fase 6: avatares em camadas (js/avatares.js), criador na configuração, grito de guerra e turmas salvas.
   Fase 7: acessibilidade (alto contraste, tamanho do texto, reduzir animações, volume), legenda da voz
   palavra a palavra e tempo extra por equipe (salvo na turma). Estilos em css/acessibilidade.css.
   Fase 10: piloto em sala. Disciplina e nível só aparecem com banco completo (os demais ficam "em breve");
   cada jogada fica registrada no aparelho e a tela Relatório mostra a taxa de acerto por valor, com botão
   para copiar os dados para a recalibração. Estilos em css/relatorio.css. */

(function () {
  "use strict";

  var D = window.DADOS, AV = window.AVATAR, LOGO = window.LOGO, R = window.REGRAS, SONS = window.SONS, VOZ = window.VOZ, TEMAS = (window.TEMAS = window.TEMAS || {});
  var app = document.getElementById("app");
  var painel = document.getElementById("painel-visual");
  var CHAVE = "duelo-motor-v1";
  /* turmas salvas: cada turma guarda suas equipes (nome, cor, forma, avatar e grito) para a aula seguinte */
  var CHAVE_TURMAS = "duelo-turmas-v1";
  var TURMAS_SUGERIDAS = ["1º B", "1º C", "1º D", "1º TMA", "3º C"];
  /* relatório de acertos (Fase 10): as jogadas de cada partida, guardadas neste aparelho */
  var CHAVE_RELATORIO = "duelo-relatorio-v1";
  var MAX_PARTIDAS_RELATORIO = 150;
  /* meta de acerto de cada valor, da rubrica do plano (Curadoria de dificuldade) */
  var METAS = { 100: [80, 95], 200: [65, 80], 300: [50, 65], 400: [35, 50], 500: [20, 35] };
  var MIN_POR_QUESTAO = 3;   // aberturas mínimas para a questão entrar na lista "fora da meta"
  var GRITO_MAX = 40;
  /* lista das disciplinas: quais estão prontas, se têm tema e quais arquivos de questões usam */
  var ARQUIVO_DISCIPLINAS = "disciplinas.json";
  /* "reduzir animações": vale o que o aparelho pede ou a escolha da Acessibilidade (Fase 7) */
  var MQ_REDUZIR = window.matchMedia("(prefers-reduced-motion: reduce)");
  var REDUZIR = { get matches() { return visual.movimento === "reduzir" || MQ_REDUZIR.matches; } };
  /* tempo extra por equipe: valores aprovados em 10/11/2026 */
  var EXTRAS_EQUIPE = R.EXTRAS_EQUIPE || [0, 5, 10, 15];

  /* ---------- estado da tela ---------- */
  var visual = { tema: "palco", modo: "escuro", fontes: {}, som: "sim", voz: "sim", vozVel: "1", vozNome: "",
    /* Fase 7 · acessibilidade (ficam no aparelho) */
    contraste: "normal", texto: "normal", movimento: "aparelho", somVol: "1", vozVol: "1", legenda: "sim" };
  var config = {
    modoJogo: "sala", disciplina: "biologia", nivel: "calouro", temaArena: D.temasArena[0],
    rodadas: 2, nEquipes: 4,
    equipes: D.equipesPadrao.map(function (e, i) { return { nome: e.nome, cor: e.cor, forma: e.forma, avatar: AV.padrao(i), grito: "" }; }),
    tempoExtraLeitura: 0, depuracao: true, temaVisual: "disciplina", turma: "",
    chancesTesoura: R.FATIAS_TESOURA.map(function (f) { return f.chance; }),
    chancesPunicao: chancesPadraoPunicao()
  };
  var recentes = [];
  /* bancos: questões já carregadas, por disciplina. carregado: disciplinas, temas e questões prontos */
  var bancos = {}, carregado = false, erroBanco = null, disciplinaSalva = null;
  /* níveis liberados de cada disciplina, calculados pelo banco carregado: { biologia: { calouro: true, ... } } */
  var liberados = {};
  var motor = null;
  var tela = "inicio";
  var salvo = null; // partida salva encontrada ao abrir

  var ui = {
    placarAberto: false, painelAberto: false, verCartas: false, revelacaoVista: false, sorteando: false, animado: null,
    revelando: null,      // índice da carta virando
    especial: null,       // { tipo, valor } animação do especial
    giro: null,           // roleta girando
    telaForcada: null,
    criador: null,        // índice da equipe aberta no criador de avatar
    criadorAba: "personagem", criadorEstado: "parado",
    turmaMsg: "",
    relDisc: "todas", relTurma: "todas", relNormais: false, relMsg: "", relApagar: false
  };
  var relogio = null, timerEspecial = null, animId = 0;

  function chancesPadraoPunicao() { var o = {}; R.FATIAS_PUNICAO.forEach(function (f) { o[f.id] = f.chance; }); return o; }
  function E() { return motor.estado; }

  /* ---------- armazenamento ---------- */
  function carregar() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (!s) return;
      if (s.visual) Object.keys(visual).forEach(function (k) { if (k in s.visual) visual[k] = s.visual[k]; });
      if (s.visual && s.visual.fonte && !visual.fontes.biologia) visual.fontes.biologia = s.visual.fonte;   // versão anterior: uma fonte só
      if (s.disciplinaPartida) disciplinaSalva = s.disciplinaPartida;
      if (s.config) Object.keys(config).forEach(function (k) { if (k in s.config) config[k] = s.config[k]; });
      if (s.recentes) recentes = s.recentes;
      if (s.partida && s.partida.fase && s.partida.fase !== "fim") salvo = s.partida;
    } catch (e) { /* sem armazenamento: segue com o padrão */ }
    config.equipes = completarEquipes(config.equipes);
  }
  /* sempre 6 equipes guardadas, cada uma com avatar e grito (configurações antigas não tinham) */
  function completarEquipes(lista) {
    lista = Array.isArray(lista) ? lista : [];
    return D.equipesPadrao.map(function (p, i) {
      var e = lista[i] || {};
      return {
        nome: String(e.nome || p.nome).slice(0, 18), cor: e.cor || p.cor, forma: e.forma || p.forma,
        avatar: AV.normalizar(e.avatar, i), grito: String(e.grito || "").slice(0, GRITO_MAX),
        tempoExtra: EXTRAS_EQUIPE.indexOf(Number(e.tempoExtra)) >= 0 ? Number(e.tempoExtra) : 0
      };
    });
  }
  function lerTurmas() {
    try { var t = JSON.parse(localStorage.getItem(CHAVE_TURMAS) || "[]"); return Array.isArray(t) ? t.filter(function (x) { return x && x.nome; }) : []; }
    catch (e) { return []; }
  }
  function gravarTurmas(lista) { try { localStorage.setItem(CHAVE_TURMAS, JSON.stringify(lista)); return true; } catch (e) { return false; } }
  function salvar() {
    try {
      var p = motor && E().fase !== "fim" ? E() : null;
      if (motor) recentes = E().usadas.slice(-300);
      localStorage.setItem(CHAVE, JSON.stringify({ visual: visual, config: config, recentes: recentes, partida: p, disciplinaPartida: p ? (disciplinaSalva || config.disciplina) : null }));
    } catch (e) {}
    gravarRelatorio();
  }

  /* ---------- relatório de acertos: armazenamento ----------
     { v: 1, partidas: [{ id, data, disc, nivel, turma, nEq, reg: [linhas do motor] }] }
     A partida em andamento é regravada quando o número de jogadas muda (o Desfazer também conta). */
  var ultimoRelatorio = "";
  function lerRelatorio() {
    try {
      var r = JSON.parse(localStorage.getItem(CHAVE_RELATORIO) || "null");
      if (r && Array.isArray(r.partidas)) return r;
    } catch (e) {}
    return { v: 1, partidas: [] };
  }
  function gravarRel(r) { try { localStorage.setItem(CHAVE_RELATORIO, JSON.stringify(r)); return true; } catch (e) { return false; } }
  function gravarRelatorio() {
    if (!motor) return;
    var e = E(), reg = e.registro || [], marca = e.id + "|" + reg.length;
    if (marca === ultimoRelatorio) return;
    var r = lerRelatorio(), k = -1;
    r.partidas.forEach(function (x, i) { if (x.id === e.id) k = i; });
    if (k < 0 && !reg.length) { ultimoRelatorio = marca; return; }
    var item = { id: e.id, data: e.inicio || new Date().toISOString(), disc: disciplinaSalva || config.disciplina,
      nivel: e.nivel, turma: e.turma || "", nEq: e.equipes.length, reg: reg };
    if (k < 0) r.partidas.push(item); else r.partidas[k] = item;
    if (r.partidas.length > MAX_PARTIDAS_RELATORIO) r.partidas = r.partidas.slice(-MAX_PARTIDAS_RELATORIO);
    if (gravarRel(r)) ultimoRelatorio = marca;
  }

  /* ---------- carregamento: disciplinas, temas e questões ----------
     Uma disciplina nova entra só com arquivos novos: temas/<id>/tema.js e tema.css, as questões em questoes/
     e uma linha em disciplinas.json. Nada no código do jogo precisa mudar. */
  function buscarJson(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + ": HTTP " + r.status); return r.json(); });
  }
  function carregarArquivo(tag, attrs) {
    return new Promise(function (ok) {
      var el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = function () { ok(true); };
      el.onerror = function () { ok(false); };   // tema que não abre: a disciplina joga com o Palco
      document.head.appendChild(el);
    });
  }
  function carregarTudo() {
    return buscarJson(ARQUIVO_DISCIPLINAS).then(function (d) {
      D.disciplinas = d.disciplinas.map(function (x) { return { id: x.id, nome: x.nome, pronta: !!x.pronta, tema: !!x.tema, questoes: x.questoes || [] }; });
      if (!prontaDisc(config.disciplina)) { var p = D.disciplinas.filter(function (x) { return x.pronta; })[0]; if (p) config.disciplina = p.id; }
      var temas = D.disciplinas.filter(function (x) { return x.pronta && x.tema; }).map(function (x) {
        return Promise.all([
          carregarArquivo("link", { rel: "stylesheet", href: "temas/" + x.id + "/tema.css" }),
          carregarArquivo("script", { src: "temas/" + x.id + "/tema.js" })
        ]);
      });
      var questoes = D.disciplinas.filter(function (x) { return x.pronta; }).map(function (x) {
        return Promise.all(x.questoes.map(function (arq) {
          return buscarJson(arq).catch(function (e) { erroBanco = "Não consegui abrir " + arq + " (" + e.message + ")."; return []; });
        })).then(function (listas) { bancos[x.id] = [].concat.apply([], listas); liberados[x.id] = R.niveisDisponiveis(bancos[x.id]); });
      });
      return Promise.all(temas.concat(questoes));
    }).catch(function (e) {
      erroBanco = "Não consegui abrir as questões (" + e.message + "). Abra o jogo pelo endereço do GitHub Pages ou por um servidor local.";
    }).then(function () { carregado = true; corrigirEscolhas(); });
  }
  /* disciplina liberada: marcada como pronta e com banco completo em pelo menos um nível */
  function discDisponivel(id) {
    if (!prontaDisc(id)) return false;
    if (!carregado) return true;
    var l = liberados[id];
    return !!l && Object.keys(l).some(function (n) { return l[n]; });
  }
  function nivelLiberado(disc, nivel) {
    if (!carregado) return true;
    return !!(liberados[disc] && liberados[disc][nivel]);
  }
  /* Arena: sem banco próprio até a Fase 11, fica "em breve" */
  var ARENA_PRONTA = false;
  function podeComecar() { return carregado && config.modoJogo === "sala" && discDisponivel(config.disciplina) && nivelLiberado(config.disciplina, config.nivel); }
  /* escolhas salvas que deixaram de valer (disciplina ou nível em breve) voltam para a primeira liberada */
  function corrigirEscolhas() {
    if (!carregado) return;
    if (config.modoJogo === "arena" && !ARENA_PRONTA) config.modoJogo = "sala";
    if (!discDisponivel(config.disciplina)) {
      var d = D.disciplinas.filter(function (x) { return discDisponivel(x.id); })[0];
      if (d) config.disciplina = d.id;
    }
    if (!nivelLiberado(config.disciplina, config.nivel)) {
      var n = D.niveis.filter(function (x) { return nivelLiberado(config.disciplina, x.id); })[0];
      if (n) config.nivel = n.id;
    }
  }
  /* temas carregados, na ordem do menu de disciplinas (os arquivos chegam em qualquer ordem) */
  function temasEmOrdem() {
    var ordem = D.disciplinas.map(function (d) { return d.id; });
    return Object.keys(TEMAS).sort(function (a, b) { return ordem.indexOf(a) - ordem.indexOf(b); });
  }
  function prontaDisc(id) { for (var i = 0; i < D.disciplinas.length; i++) if (D.disciplinas[i].id === id) return D.disciplinas[i].pronta !== false; return false; }
  /* questões da partida: as da disciplina escolhida; na Arena (ainda sem banco próprio), todas as carregadas */
  function bancoDe(disc, modo) {
    if (modo === "arena") return [].concat.apply([], Object.keys(bancos).map(function (k) { return bancos[k]; }));
    return bancos[disc] || [];
  }
  function bancoAtual() { return bancoDe(config.disciplina, config.modoJogo); }

  /* ---------- utilidades ---------- */
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function achar(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return lista[0]; }
  function equipesConfig() { return config.equipes.slice(0, config.nEquipes); }
  function corHex(id) { return achar(D.cores, id).hex; }
  function eqp(i) { return E().equipes[i]; }
  function ficha(eq, classe) {
    var f = achar(D.formas, eq.forma);
    return '<svg class="ficha ' + (classe || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="' + f.d + '" fill="' + corHex(eq.cor) + '" stroke="var(--ficha-traco)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  /* avatar da equipe com a forma no canto (a forma identifica a equipe mesmo sem distinguir cores) */
  function avatarDe(eq, i, estado, tam, op) {
    op = op || {};
    return '<span class="av-casa ' + (tam || "av-m") + '">' +
      AV.svg(eq.avatar, { cor: corHex(eq.cor), estado: estado || "parado", indice: i, estatico: op.estatico, rotulo: op.rotulo }) +
      ficha(eq, "av-selo") + '</span>';
  }
  /* estado do avatar no placar: congelado (sem turno), na vez ou parado */
  function estadoPlacar(i) { var e = E(); return e.semTurno[i] ? "congelado" : i === e.vez ? "navez" : "parado"; }
  function gritoHtml(eq) { return eq.grito ? '<span class="grito">' + esc(eq.grito) + '</span>' : ''; }
  function pontosTxt(n) { return (n < 0 ? "−" : "") + Math.abs(n); }
  function sinal(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n); }
  function nomeTema() {
    if (config.modoJogo === "arena") return "Arena · " + config.temaArena;
    return achar(D.disciplinas, config.disciplina).nome + " · " + achar(D.niveis, config.nivel).nome;
  }
  function espera(ms) { return REDUZIR.matches ? Math.min(ms, 400) : ms; }

  var ICONE = {
    gelo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5M3.3 7l3.4.9M3.3 7l.9 3.4M20.7 17l-3.4-.9M20.7 17l-.9-3.4M3.3 17l.9-3.4M3.3 17l3.4-.9M20.7 7l-.9 3.4M20.7 7l-3.4.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    alarme: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18v-5a6 6 0 0 1 12 0v5M3.5 21h17M12 2.5v2M4 6l1.5 1.5M20 6l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 18v-4.5a2.5 2.5 0 0 1 2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    dobro: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m6.8 9.2 4 5.6M10.8 9.2l-4 5.6M13.6 10a2 2 0 0 1 3.8.6c0 1.6-3.9 2.6-3.9 4.2h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tesoura: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.2 15.9 19 3M15.8 15.9 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    relogio: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5V13l3 2M9.5 2.5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    olho: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };
  var INFO_ESPECIAL = {
    congelou: { icone: "gelo", titulo: "Congelou!", rotulo: "Armadilha", texto: "Se errar, perde metade do valor e pula o próximo turno. Passar está bloqueado." },
    tudo:     { icone: "alarme", titulo: "Tudo ou Nada!", rotulo: "Armadilha", texto: "Se errar, perde o valor inteiro da carta. Passar está bloqueado." },
    dobro:    { icone: "dobro", titulo: "Em Dobro!", rotulo: "Bônus", texto: "Vale o dobro. As alternativas somem aos 10 s; depois a resposta é aberta." },
    tesoura:  { icone: "tesoura", titulo: "Tesoura!", rotulo: "Bônus", texto: "Quem acertar guarda o poder de eliminar alternativas numa pergunta futura." }
  };

  /* ---------- aparência ---------- */
  function aplicarVisual(t) {
    var b = document.body;
    var emJogo = t !== "inicio" && t !== "config" && t !== "relatorio";
    b.dataset.tema = emJogo ? visual.tema : "palco";
    b.dataset.modo = visual.modo;
    b.dataset.fonte = visual.fontes[b.dataset.tema] || "a";
    b.dataset.tela = t;
    b.dataset.contraste = visual.contraste;
    b.dataset.movimento = REDUZIR.matches ? "reduzido" : "normal";
    b.dataset.legenda = visual.legenda;
    document.documentElement.dataset.texto = visual.texto;
    SONS.definirTema(b.dataset.tema);
    SONS.ligar(visual.som === "sim");
    SONS.volume(visual.somVol);
    VOZ.configurar({ ligada: visual.voz === "sim", velocidade: visual.vozVel, volume: visual.vozVol, nome: visual.vozNome });
  }
  /* tema em uso na tela (objeto de js/tema-*.js) ou null no Palco */
  function temaObj() { return TEMAS[document.body.dataset.tema] || null; }
  /* tema com que a partida começa: o da disciplina, se ela já tiver um, ou o Palco */
  function temaDaPartida() {
    return (config.temaVisual !== "palco" && config.modoJogo === "sala" && TEMAS[config.disciplina]) ? config.disciplina : "palco";
  }
  function som(nome, op) { SONS.tocar(nome, op); }
  var ICONE_SOM = {
    sim: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9Z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    nao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9Z" fill="currentColor"/><path d="m16.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function botaoSom() {
    var on = visual.som === "sim";
    return '<button class="botao botao-contorno botao-pequeno botao-som" data-acao="som" aria-pressed="' + on + '" title="' + (on ? "Desligar os sons (M)" : "Ligar os sons (M)") + '" aria-label="' + (on ? "Sons ligados" : "Sons desligados") + '">' + ICONE_SOM[on ? "sim" : "nao"] + '</button>';
  }
  function trocarBotaoSom() { var b = app.querySelector(".botao-som"); if (b) b.outerHTML = botaoSom(); }
  function alternarSom() {
    visual.som = visual.som === "sim" ? "nao" : "sim";
    salvar(); aplicarVisual(telaAtual()); desenharPainel(); trocarBotaoSom();
    if (visual.som === "sim") som("foco");
  }

  /* ================= desenho ================= */
  function telaAtual() {
    if (tela !== "jogo") return tela;
    return ui.telaForcada || E().fase;
  }

  function desenhar() {
    var painelCri = app.querySelector(".criador-painel"), rolagem = painelCri ? painelCri.scrollTop : 0;
    var abaAntes = painelCri ? ui.criadorAbaDesenhada : null;
    var focado = document.activeElement && document.activeElement.closest && document.activeElement.closest(".criador [data-acao]");
    var chaveFoco = focado ? [focado.dataset.acao, focado.dataset.valor || "", focado.dataset.equipe || ""].join("|") : null;
    pararRelogio();
    animId++;
    ui.sorteando = false;
    var t = telaAtual();
    aplicarVisual(t);
    var html = "";
    switch (t) {
      case "inicio": html = telaInicio(); break;
      case "config": html = telaConfig(); break;
      case "relatorio": html = telaRelatorio(); break;
      case "tabuleiro": html = telaTabuleiro(); break;
      case "pergunta": html = telaPergunta(false); break;
      case "resultado": html = E().jogada.resultado.vaiParaPasse && !E().jogada.oculta ? telaRumoAoPasse() : telaPergunta(true); break;
      case "passe": html = telaPasse(); break;
      case "roleta": html = E().jogada.oculta && !ui.revelacaoVista && !ui.giro ? telaPergunta(true, "roleta") : telaRoleta(); break;
      case "fim-rodada": html = telaFimRodada(); break;
      case "morte-intro": case "morte-leva": html = telaMorte(); break;
      case "fim": html = telaFinal(); break;
    }
    if (ui.especial) html += sobreEspecial();
    if (ui.giro && ui.giro.sobre) html += sobreGiro();
    app.innerHTML = html;
    desenharPainel();
    if (t === "pergunta") iniciarRelogio();
    vozDaTela(t);
    if (ui.giro && !ui.giro.iniciado) iniciarGiro();
    if (t === "fim-rodada" && app.querySelector(".final-lista.corrida")) animarFimRodada();
    if (t === "fim" && app.querySelector(".degrau.espera")) animarFinal();
    var foco = app.querySelector("[data-foco]");
    document.body.classList.toggle("criador-aberto", t === "config" && ui.criador !== null);
    var novoPainel = app.querySelector(".criador-painel");
    if (novoPainel && abaAntes === ui.criadorAba) novoPainel.scrollTop = rolagem;
    ui.criadorAbaDesenhada = novoPainel ? ui.criadorAba : null;
    if (chaveFoco && novoPainel) {
      var alvo = Array.prototype.filter.call(app.querySelectorAll(".criador [data-acao]"), function (b) { return [b.dataset.acao, b.dataset.valor || "", b.dataset.equipe || ""].join("|") === chaveFoco; })[0];
      if (alvo) { alvo.focus({ preventScroll: true }); return; }
    }
    if (t === "config" && ui.criador !== null && !chaveFoco) {
      var primeiro = app.querySelector(".criador [data-foco]") || app.querySelector(".criador .criador-aba[aria-selected=true]");
      if (primeiro) { primeiro.focus({ preventScroll: true }); return; }
    }
    if (foco && !(t === "config" && ui.criador !== null)) foco.focus({ preventScroll: true });
  }

  /* ---------- voz que lê as perguntas ---------- */
  /* cada pergunta aberta tem uma chave: a voz lê uma vez por chave (redesenhar a tela não repete a leitura) */
  function chaveLeitura() {
    var e = motor && E(), j = e && e.jogada;
    return j ? [e.rodada, e.trajetoria.length, j.q, j.etapa, j.equipe, j.passe ? j.passe.equipe : ""].join("|") : null;
  }
  function vozDaTela(t) {
    if (t !== "pergunta") { VOZ.parar(); return; }
    var ch = chaveLeitura();
    if (!VOZ.leuEsta(ch)) lerPergunta(ch);
  }
  /* a voz lê só o enunciado, nunca as alternativas (pedido do professor em 10/11/2026) */
  function lerPergunta(ch) {
    var q = motor.questao(E().jogada.q);
    VOZ.ler([/[.?!:]$/.test(q.enunciado.trim()) ? q.enunciado : q.enunciado + "."], ch);
  }
  /* Em Dobro com voz: as alternativas somem aos 10 s ou, se a leitura ainda não acabou, quando ela terminar.
     Sem voz (ou no Às cegas) vale o tempo calculado pelo motor. */
  var DOBRO_SOMEM = 10;
  function someComVoz(j) {
    var ch = chaveLeitura();
    return j.especial === "dobro" && j.etapa === "principal" && !j.cegas && VOZ.ligada() && (VOZ.falando(ch) || VOZ.falouDeVerdade(ch));
  }
  function horaDeEsconder(j) {
    var passou = j.tempoTotal - j.restante;
    if (someComVoz(j)) return passou >= DOBRO_SOMEM && !VOZ.falando(chaveLeitura());
    return passou >= j.somemEm;
  }
  function segundosParaSumir(j) {
    var passou = j.tempoTotal - j.restante;
    return Math.max(0, Math.ceil((someComVoz(j) ? DOBRO_SOMEM : j.somemEm) - passou));
  }
  function seletorVoz() {
    var lista = VOZ.vozes(), atual = visual.vozNome;
    if (!VOZ.disponivel()) return '<p class="nota" data-voz-nome>Este navegador não tem leitura em voz alta.</p>';
    return '<select class="campo-select" data-voz-nome aria-label="Voz da leitura">' +
      '<option value="">Automática' + (VOZ.vozEmUso() ? ' (' + esc(VOZ.vozEmUso()) + ')' : '') + '</option>' +
      lista.map(function (v) { return '<option value="' + esc(v.nome) + '"' + (v.nome === atual ? ' selected' : '') + '>' + esc(v.nome) + (v.local ? ' · funciona sem internet' : ' · precisa de internet') + '</option>'; }).join("") +
    '</select>';
  }
  VOZ.aoMudar(function () {
    var s = app.querySelector("select[data-voz-nome]");
    if (s && s.options.length !== VOZ.vozes().length + 1) s.outerHTML = seletorVoz();
  });

  /* ---------- legenda: a palavra que a voz está lendo fica em destaque no próprio enunciado ---------- */
  /* cada palavra vira um <span class="pal">, na mesma divisão que a voz usa (VOZ.dividir) */
  function palavrasHtml(texto, idx) {
    return VOZ.dividir(texto).map(function (p, k) {
      return '<span class="pal' + (k === idx ? ' lendo' : '') + '" data-p="' + k + '">' + esc(p) + '</span>';
    }).join(" ");
  }
  function enunciadoHtml(texto) {
    var idx = visual.legenda === "sim" ? VOZ.palavraAtual(chaveLeitura()) : -1;
    return palavrasHtml(texto, idx);
  }
  function marcarPalavra(alvo, idx) {
    if (!alvo) return;
    var antes = alvo.querySelector(".pal.lendo");
    if (antes) antes.classList.remove("lendo");
    if (idx < 0 || visual.legenda !== "sim") return;
    var p = alvo.querySelector('.pal[data-p="' + idx + '"]');
    if (p) p.classList.add("lendo");
  }
  VOZ.aoPalavra(function (chave, idx) {
    if (chave === "teste") { marcarPalavra(document.querySelector(".legenda-teste"), idx); return; }
    if (tela === "jogo" && motor && telaAtual() === "pergunta" && chave === chaveLeitura()) marcarPalavra(app.querySelector(".enunciado"), idx);
  });
  var FRASE_TESTE = "Olá, turma! Esta é a voz que vai ler as perguntas do Duelo de Saberes.";

  function cenario() {
    var t = temaObj();
    if (t && t.fundo) return '<div class="fundo-tema">' + t.fundo() + '</div>';
    return '<div class="cenario" aria-hidden="true"><div class="holofotes"><i></i><i></i><i></i><i></i></div><div class="sanefa"></div><div class="cortina esq"></div><div class="cortina dir"></div><div class="piso"></div><div class="ribalta"></div></div>';
  }

  /* ---------- tela inicial ---------- */
  function telaInicio() {
    return '<main class="tela inicio">' + cenario() +
      '<div class="inicio-centro">' +
        LOGO.completo("logo-grande") +
        '<p class="inicio-frase">Vinte cartas viradas, perguntas de 100 a 500 e uma equipe de olho na outra.</p>' +
        (erroBanco ? '<p class="alerta-banco" role="alert">' + esc(erroBanco) + '</p>' : '') +
        '<div class="inicio-acoes">' +
          (salvo && carregado ? '<button class="botao botao-principal botao-enorme" data-acao="continuar-salva" data-foco>Continuar partida</button>' : '') +
          '<button class="botao ' + (salvo && carregado ? 'botao-contorno' : 'botao-principal botao-enorme') + '" data-acao="ir-config"' + (salvo && carregado ? '' : ' data-foco') + '>Nova partida</button>' +
          '<button class="botao botao-contorno" data-acao="ir-relatorio">Relatório de acertos</button>' +
          '<a class="botao botao-contorno" href="testes.html">Lista de testes</a>' +
          '<a class="botao botao-contorno" href="avatares.html">Galeria de avatares</a>' +
        '</div>' +
      '</div>' +
      '<footer class="inicio-rodape">Fase 10 · piloto em sala · Biologia e Química, 1º ano (Calouro) · Prof. Mauro Vinícius, Tanque Novo-BA</footer>' +
    '</main>';
  }

  /* ---------- configuração ---------- */
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
          (ARENA_PRONTA ? opcao("modoJogo", "arena", "Arena", "Tema livre de conhecimentos gerais") : opcaoBreve("Arena", "Tema livre de conhecimentos gerais")) +
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
          D.disciplinas.map(function (d) {
            if (!discDisponivel(d.id)) return '<button class="chip chip-breve" disabled aria-disabled="true" title="Em breve">' + esc(d.nome) + '<small>em breve</small></button>';
            return chip("disciplina", d.id, d.nome);
          }).join("") +
        '</div>' +
        '<p class="nota">Piloto: Biologia e Química com 100 questões do 1º ano cada. Uma disciplina entra no menu quando tem banco completo de pelo menos um nível.</p>' +
      '</section>' +
      '<section class="bloco bloco-nivel">' +
        '<h2>Nível</h2>' +
        '<div class="opcoes opcoes-3" role="radiogroup" aria-label="Nível">' +
          D.niveis.map(function (n) { return nivelLiberado(config.disciplina, n.id) ? opcao("nivel", n.id, n.nome, n.series) : opcaoBreve(n.nome, n.series); }).join("") +
        '</div>' +
        '<p class="nota">Um nível abre quando cada série dele tem ' + R.MINIMO_POR_VALOR + ' questões de cada valor, o bastante para 5 rodadas sem repetir. Estudioso e Veterano chegam com os bancos de 2º e 3º ano.</p>' +
      '</section>';
    } else {
      h += '<section class="bloco bloco-largo">' +
        '<h2>Tema da Arena</h2>' +
        '<div class="chips" role="radiogroup" aria-label="Tema da Arena">' +
          D.temasArena.map(function (t) { return chip("temaArena", t, t); }).join("") +
        '</div>' +
        '<p class="nota">Os temas da Arena chegam na Fase 11. Por enquanto a partida usa as questões de teste.</p>' +
      '</section>';
    }

    h += '<section class="bloco bloco-largo">' +
        '<div class="bloco-topo"><h2>Equipes</h2>' +
          '<button class="botao botao-contorno botao-pequeno" data-acao="sortear-avatares" title="Sorteia personagem, expressão, acessório e tom de todas as equipes">Sortear avatares</button>' +
          '<div class="contador contador-compacto" role="group" aria-label="Número de equipes">' +
            '<button class="botao-redondo" data-acao="n-equipes" data-valor="-1" aria-label="Menos uma equipe"' + (config.nEquipes <= 2 ? " disabled" : "") + '>−</button>' +
            '<output class="contador-valor">' + config.nEquipes + '</output>' +
            '<button class="botao-redondo" data-acao="n-equipes" data-valor="1" aria-label="Mais uma equipe"' + (config.nEquipes >= 6 ? " disabled" : "") + '>+</button>' +
          '</div>' +
        '</div>' +
        blocoTurmas() +
        '<div class="equipes-grade">' + equipesConfig().map(cartaoEquipe).join("") + '</div>' +
        '<p class="nota">Toque no avatar para abrir o criador: personagem, expressão, acessório, cor, traço e grito de guerra. O tempo extra vale em todas as perguntas da equipe, inclusive no passe (não no Contra o relógio), e não aparece no jogo. Ele é salvo junto com a turma.</p>' +
      '</section>' +

      '<section class="bloco bloco-largo">' +
        '<h2>Visual</h2>' +
        '<div class="regras-grade regras-grade-4">' +
          '<div><h3 class="mini-titulo">Tema da partida</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Tema da partida">' + chip("temaVisual", "disciplina", "Tema da disciplina") + chip("temaVisual", "palco", "Palco") + '</div>' +
            '<p class="nota">' + (temaDaPartida() === "palco" ? (config.temaVisual === "palco" ? "A partida usa o Palco." : "Esta escolha ainda não tem tema próprio: a partida usa o Palco.") : "A partida usa o tema de " + esc(achar(D.disciplinas, config.disciplina).nome) + ".") + ' Têm tema próprio: ' + esc(temasEmOrdem().map(function (id) { return TEMAS[id].nome; }).join(" e ") || "nenhuma") + '.</p></div>' +
          '<div><h3 class="mini-titulo">Versão</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Versão clara ou escura">' + chipVisual("modo", "escuro", "Escuro") + chipVisual("modo", "claro", "Sala clara") + '</div>' +
            '<p class="nota">Escuro para sala com pouca luz; Sala clara para projetor em sala iluminada.</p></div>' +
          escolhaDeFontes() +
        '</div>' +
      '</section>' +

      '<section class="bloco bloco-largo" id="acessibilidade">' +
        '<h2>Acessibilidade, voz e som</h2>' +
        '<div class="regras-grade regras-grade-4">' +
          '<div><h3 class="mini-titulo">Contraste</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Contraste">' + chipVisual("contraste", "normal", "Normal") + chipVisual("contraste", "alto", "Alto contraste") + '</div>' +
            '<p class="nota">Fundo preto, texto branco e destaques amarelos, sem os fundos animados do tema. As formas das equipes continuam valendo.</p></div>' +
          '<div><h3 class="mini-titulo">Tamanho do texto</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Tamanho do texto">' + chipVisual("texto", "normal", "Normal") + chipVisual("texto", "grande", "Grande") + chipVisual("texto", "maior", "Maior") + '</div>' +
            '<p class="nota">Aumenta o enunciado, as alternativas, o placar e os menus.</p></div>' +
          '<div><h3 class="mini-titulo">Animações</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Animações">' + chipVisual("movimento", "aparelho", "Seguir o aparelho") + chipVisual("movimento", "reduzir", "Reduzir") + '</div>' +
            '<p class="nota">' + (MQ_REDUZIR.matches ? 'Este aparelho já pede animações reduzidas.' : 'Reduzir tira a mitose, a deriva, os giros longos e o confete.') + '</p></div>' +
          '<div><h3 class="mini-titulo">Sons</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Sons">' + chipVisual("som", "sim", "Ligados") + chipVisual("som", "nao", "Desligados") + '</div>' +
            '<div class="chips" role="radiogroup" aria-label="Volume dos efeitos">' + chipVisual("somVol", "1", "Volume normal") + chipVisual("somVol", "0.4", "Mais baixos") + '</div>' +
            '<p class="nota">No jogo, a tecla M ou o botão do alto-falante liga e desliga.</p></div>' +
          '<div><h3 class="mini-titulo">Voz que lê as perguntas</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Voz">' + chipVisual("voz", "sim", "Ligada") + chipVisual("voz", "nao", "Desligada") + '</div>' +
            '<div class="chips" role="radiogroup" aria-label="Velocidade da voz">' + chipVisual("vozVel", "0.85", "Lenta") + chipVisual("vozVel", "1", "Normal") + chipVisual("vozVel", "1.2", "Rápida") + '</div>' +
            '<div class="chips" role="radiogroup" aria-label="Volume da voz">' + chipVisual("vozVol", "1", "Volume alto") + chipVisual("vozVol", "0.7", "Médio") + chipVisual("vozVol", "0.45", "Baixo") + '</div>' +
            '<div class="chips" role="radiogroup" aria-label="Legenda">' + chipVisual("legenda", "sim", "Com legenda") + chipVisual("legenda", "nao", "Sem legenda") + '</div>' +
            seletorVoz() +
            '<button class="botao botao-contorno botao-pequeno" data-acao="testar-voz">Testar a voz</button>' +
            '<p class="legenda-teste" aria-hidden="true">' + palavrasHtml(FRASE_TESTE, -1) + '</p>' +
            '<p class="nota">Lê só o enunciado, assim que a pergunta abre; as alternativas nunca são lidas. A legenda destaca a palavra que está sendo lida. No jogo, L lê de novo.</p></div>' +
        '</div>' +
        '<p class="nota">Estas escolhas ficam guardadas neste aparelho. No jogo, a tecla V (ou o botão Visual, no canto) abre um painel com elas. O tempo extra de cada equipe fica no cartão da equipe, acima.</p>' +
      '</section>' +

      '<section class="bloco bloco-largo">' +
        '<h2>Regras e testes</h2>' +
        '<div class="regras-grade">' +
          '<div><h3 class="mini-titulo">Tempo extra de leitura</h3>' +
            '<div class="chips" role="radiogroup" aria-label="Tempo extra de leitura">' +
              [0, 5, 10].map(function (s) { return chipNum("tempoExtraLeitura", s, s ? "+" + s + " s" : "Sem extra"); }).join("") +
            '</div><p class="nota">Soma ao tempo de cada pergunta (não vale no passe nem no Contra o relógio).</p></div>' +
          '<div><h3 class="mini-titulo">Modo de depuração</h3>' +
            '<button class="interruptor' + (config.depuracao ? " ligado" : "") + '" role="switch" aria-checked="' + config.depuracao + '" data-acao="alternar-dep">' +
              '<span class="interruptor-trilho"><span></span></span>' + (config.depuracao ? "Ligado" : "Desligado") + '</button>' +
            '<p class="nota">Mostra o painel para forçar especiais, roletas, sorteio do passe, placar e cronômetro.</p></div>' +
        '</div>' +
        '<details class="chances"><summary>Chances das roletas</summary>' +
          '<div class="chances-grade">' +
            '<fieldset><legend>Roleta da Tesoura</legend>' +
              R.FATIAS_TESOURA.map(function (f, i) { return campoChance("tesoura", i, f.nome, config.chancesTesoura[i], somar(config.chancesTesoura)); }).join("") +
            '</fieldset>' +
            '<fieldset><legend>Roleta de punição</legend>' +
              R.FATIAS_PUNICAO.map(function (f) { return campoChance("punicao", f.id, f.nome, config.chancesPunicao[f.id], somarObj(config.chancesPunicao)); }).join("") +
            '</fieldset>' +
          '</div>' +
          '<button class="botao botao-contorno botao-pequeno" data-acao="chances-padrao">Voltar às chances do plano</button>' +
        '</details>' +
      '</section>' +
      '</div>' +
      '<div class="config-rodape">' +
        '<span class="config-resumo">' + esc(nomeTema()) + ' · ' + config.rodadas + (config.rodadas > 1 ? ' rodadas' : ' rodada') + ' · ' + config.nEquipes + ' equipes</span>' +
        '<button class="botao botao-principal botao-enorme" data-acao="comecar"' + (podeComecar() ? '' : ' disabled') + '>' + (!carregado ? 'Carregando questões…' : podeComecar() ? 'Começar partida' : 'Sem questões') + '</button>' +
      '</div>' +
    '</main>';
    if (ui.criador !== null) h += telaCriador();
    return h;
  }
  function somar(a) { return a.reduce(function (s, x) { return s + (Number(x) || 0); }, 0); }
  function somarObj(o) { return Object.keys(o).reduce(function (s, k) { return s + (Number(o[k]) || 0); }, 0); }
  function campoChance(roleta, chave, nome, valor, total) {
    var pct = total > 0 ? Math.round((Number(valor) || 0) / total * 100) : 0;
    return '<label class="chance"><span>' + esc(nome) + '</span>' +
      '<input type="number" min="0" max="100" step="1" inputmode="numeric" value="' + (Number(valor) || 0) + '" data-chance="' + roleta + '" data-chave="' + chave + '">' +
      '<small>' + pct + '%</small></label>';
  }
  function opcao(campo, valor, titulo, texto) {
    var on = config[campo] === valor;
    return '<button class="opcao' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="escolher" data-campo="' + campo + '" data-valor="' + esc(valor) + '">' +
      '<strong>' + esc(titulo) + '</strong><span>' + esc(texto) + '</span></button>';
  }
  /* opção que ainda não pode ser escolhida (sem banco completo) */
  function opcaoBreve(titulo, texto) {
    return '<button class="opcao opcao-breve" disabled aria-disabled="true" title="Em breve"><strong>' + esc(titulo) + ' <small>em breve</small></strong><span>' + esc(texto) + '</span></button>';
  }
  function chip(campo, valor, titulo) {
    var on = config[campo] === valor;
    return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="escolher" data-campo="' + campo + '" data-valor="' + esc(valor) + '">' + esc(titulo) + '</button>';
  }
  /* cada tema com fontes próprias ganha a sua escolha de fonte dos títulos */
  function chipFonte(tema, valor, titulo) {
    var on = (visual.fontes[tema] || "a") === valor;
    return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="fonte-tema" data-tema="' + tema + '" data-valor="' + valor + '">' + titulo + '</button>';
  }
  function escolhaDeFontes() {
    return temasEmOrdem().filter(function (id) { return TEMAS[id].fontes && TEMAS[id].fontes.length > 1; }).map(function (id) {
      var t = TEMAS[id];
      return '<div><h3 class="mini-titulo">Títulos de ' + esc(t.nome) + '</h3>' +
        '<div class="chips" role="radiogroup" aria-label="Fonte dos títulos no tema de ' + esc(t.nome) + '">' +
          t.fontes.map(function (f, k) { return chipFonte(id, f.id, String.fromCharCode(65 + k) + " · " + esc(f.nome)); }).join("") + '</div>' +
        '<p class="nota">Vale só no tema de ' + esc(t.nome) + '. Os textos continuam em Atkinson.</p></div>';
    }).join("");
  }
  function chipVisual(campo, valor, titulo) {
    var on = visual[campo] === valor;
    return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="visual" data-campo="' + campo + '" data-valor="' + valor + '">' + titulo + '</button>';
  }
  function chipNum(campo, valor, titulo) {
    var on = config[campo] === valor;
    return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="escolher-num" data-campo="' + campo + '" data-valor="' + valor + '">' + esc(titulo) + '</button>';
  }
  function cartaoEquipe(eq, i) {
    var usadasCor = equipesConfig().map(function (e) { return e.cor; });
    return '<div class="equipe-cartao" style="--cor-equipe:' + corHex(eq.cor) + '">' +
      '<div class="equipe-topo">' +
        '<button class="av-botao" data-acao="abrir-criador" data-equipe="' + i + '" aria-label="Personalizar o avatar da equipe ' + (i + 1) + ': ' + esc(AV.descrever(eq.avatar, i)) + '" title="Personalizar o avatar">' + avatarDe(eq, i, "parado", "av-m") + '</button>' +
        '<label class="campo"><span class="so-leitor">Nome da equipe ' + (i + 1) + '</span>' +
        '<input type="text" maxlength="18" value="' + esc(eq.nome) + '" data-equipe="' + i + '" autocomplete="off" spellcheck="false"></label>' +
      '</div>' +
      '<div class="equipe-acoes"><button class="botao botao-contorno botao-pequeno" data-acao="abrir-criador" data-equipe="' + i + '">Personalizar</button>' +
        (eq.grito ? '<span class="equipe-grito-mini">“' + esc(eq.grito) + '”</span>' : '') + '</div>' +
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
      /* tempo extra da equipe (Fase 7): não aparece no jogo; o cronômetro da equipe só começa maior */
      '<div class="equipe-extra" role="radiogroup" aria-label="Tempo extra da equipe ' + (i + 1) + ' em todas as perguntas">' +
        '<span class="equipe-extra-rotulo">Tempo extra</span>' +
        EXTRAS_EQUIPE.map(function (x) {
          var on = (eq.tempoExtra || 0) === x;
          return '<button class="chip chip-mini' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="tempo-extra" data-equipe="' + i + '" data-valor="' + x + '">' + (x ? "+" + x + " s" : "Não") + '</button>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  /* ---------- turmas salvas ---------- */
  function blocoTurmas() {
    var turmas = lerTurmas();
    return '<div class="turmas" role="group" aria-label="Turmas salvas">' +
      '<label>Turma salva <select data-turma-escolha aria-label="Turma salva">' +
        (turmas.length ? turmas.map(function (t) { return '<option value="' + esc(t.nome) + '"' + (t.nome === ui.turmaEscolhida ? ' selected' : '') + '>' + esc(t.nome) + ' · ' + t.nEquipes + ' equipes</option>'; }).join("") : '<option value="">nenhuma ainda</option>') +
      '</select></label>' +
      '<button class="botao botao-contorno botao-pequeno" data-acao="turma-carregar"' + (turmas.length ? '' : ' disabled') + '>Usar</button>' +
      '<button class="botao botao-contorno botao-pequeno" data-acao="turma-excluir"' + (turmas.length ? '' : ' disabled') + '>Excluir</button>' +
      '<label>Salvar as equipes como <input type="text" maxlength="20" list="turmas-sugeridas" data-turma-nome value="' + esc(ui.turmaNome || "") + '" placeholder="ex.: 1º B" autocomplete="off"></label>' +
      '<datalist id="turmas-sugeridas">' + TURMAS_SUGERIDAS.map(function (t) { return '<option value="' + esc(t) + '">'; }).join("") + '</datalist>' +
      '<button class="botao botao-principal botao-pequeno" data-acao="turma-salvar">Salvar turma</button>' +
      (ui.turmaMsg ? '<p class="turmas-msg" role="status">' + esc(ui.turmaMsg) + '</p>' : '') +
    '</div>';
  }
  function salvarTurma() {
    var nome = String(ui.turmaNome || "").trim().slice(0, 20);
    if (!nome) { ui.turmaMsg = "Escreva o nome da turma (por exemplo, 1º B) para salvar."; return; }
    var lista = lerTurmas().filter(function (t) { return t.nome !== nome; }), existia = lerTurmas().length !== lista.length;
    lista.push({ nome: nome, nEquipes: config.nEquipes, equipes: JSON.parse(JSON.stringify(equipesConfig())), salvaEm: new Date().toISOString().slice(0, 10) });
    lista.sort(function (x, y) { return x.nome.localeCompare(y.nome, "pt-BR", { numeric: true }); });
    ui.turmaMsg = gravarTurmas(lista) ? (existia ? "Turma " + nome + " atualizada com as " + config.nEquipes + " equipes atuais." : "Turma " + nome + " salva com " + config.nEquipes + " equipes.") : "Não deu para salvar neste aparelho (armazenamento bloqueado).";
    ui.turmaEscolhida = nome;
    config.turma = nome;
  }
  function usarTurma() {
    var nome = ui.turmaEscolhida || (lerTurmas()[0] || {}).nome, t = lerTurmas().filter(function (x) { return x.nome === nome; })[0];
    if (!t) return;
    var equipes = config.equipes.slice();
    (t.equipes || []).forEach(function (e, i) { if (i < equipes.length) equipes[i] = e; });
    config.equipes = completarEquipes(equipes);
    config.nEquipes = Math.min(6, Math.max(2, Number(t.nEquipes) || 2));
    corrigirCores();
    ui.turmaNome = t.nome;
    config.turma = t.nome;
    ui.turmaMsg = "Equipes da turma " + t.nome + " carregadas.";
  }
  function excluirTurma() {
    var nome = ui.turmaEscolhida || (lerTurmas()[0] || {}).nome;
    if (!nome || !window.confirm("Excluir a turma " + nome + " salva neste aparelho?")) return;
    gravarTurmas(lerTurmas().filter(function (t) { return t.nome !== nome; }));
    ui.turmaEscolhida = null;
    ui.turmaMsg = "Turma " + nome + " excluída.";
  }

  /* ---------- criador de avatar em camadas ---------- */
  var ABAS_CRIADOR = [
    ["personagem", "Personagem"], ["expressao", "Expressão"], ["acessorio", "Acessório"], ["cor", "Cor e traço"], ["grito", "Grito de guerra"]
  ];
  function opcaoAvatar(acao, valor, ativo, titulo, sub, av, i, eq) {
    return '<button class="av-opcao' + (ativo ? " ativa" : "") + '" role="radio" aria-checked="' + ativo + '" data-acao="' + acao + '" data-valor="' + valor + '">' +
      (av ? AV.svg(av, { cor: corHex(eq.cor), estatico: true, indice: i }) : '<span class="av-opcao-vazia">–</span>') +
      esc(titulo) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
  }
  function painelCriador(eq, i) {
    var a = AV.normalizar(eq.avatar, i), aba = ui.criadorAba, h = "";
    function com(mud) { var b = {}; Object.keys(a).forEach(function (k) { b[k] = a[k]; }); Object.keys(mud).forEach(function (k) { b[k] = mud[k]; }); return b; }
    if (aba === "personagem") {
      var todos = AV.personagens;
      h += '<h3>Das disciplinas</h3><div class="av-grade" role="radiogroup" aria-label="Personagem das disciplinas">' +
        todos.filter(function (p) { return p.disciplina; }).map(function (p) { return opcaoAvatar("av-base", p.id, a.base === p.id, p.nome, AV.NOMES_DISCIPLINA[p.disciplina], com({ base: p.id, acess: "nenhum" }), i, eq); }).join("") + '</div>' +
        '<h3>Genéricos</h3><div class="av-grade" role="radiogroup" aria-label="Personagem genérico">' +
        todos.filter(function (p) { return !p.disciplina; }).map(function (p) { return opcaoAvatar("av-base", p.id, a.base === p.id, p.nome, "", com({ base: p.id, acess: "nenhum" }), i, eq); }).join("") + '</div>' +
        '<p class="nota">Qualquer equipe pode usar qualquer personagem, seja qual for a disciplina da partida.</p>';
    } else if (aba === "expressao") {
      h += '<h3>Expressão do dia a dia</h3><div class="av-grade" role="radiogroup" aria-label="Expressão">' +
        AV.EXPRESSOES.map(function (x) { return opcaoAvatar("av-expr", x.id, a.expr === x.id, x.nome, "", com({ expr: x.id }), i, eq); }).join("") + '</div>' +
        '<p class="nota">Ao acertar, errar ou congelar, o rosto muda sozinho para combinar com o momento.</p>';
    } else if (aba === "acessorio") {
      h += '<h3>Acessório</h3><div class="av-grade" role="radiogroup" aria-label="Acessório">' +
        AV.ACESSORIOS.map(function (x) { return opcaoAvatar("av-acess", x.id, a.acess === x.id, x.nome, "", com({ acess: x.id }), i, eq); }).join("") + '</div>';
    } else if (aba === "cor") {
      var usadasCor = equipesConfig().map(function (e) { return e.cor; });
      h += '<h3>Cor da equipe</h3><div class="seletor" role="radiogroup" aria-label="Cor da equipe">' +
        D.cores.map(function (c) {
          var on = eq.cor === c.id, ocupada = !on && usadasCor.indexOf(c.id) >= 0;
          return '<button class="amostra' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" aria-label="' + c.nome + (ocupada ? " (em uso por outra equipe)" : "") + '" title="' + c.nome + '" style="--amostra:' + c.hex + '" data-acao="cor" data-equipe="' + i + '" data-valor="' + c.id + '"' + (ocupada ? " disabled" : "") + '></button>';
        }).join("") + '</div>' +
        '<h3>Tom do personagem</h3><div class="tons" role="radiogroup" aria-label="Tom do personagem">' +
        AV.TONS.map(function (t) {
          var on = a.tom === t.id;
          return '<button class="tom-botao' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="av-tom" data-valor="' + t.id + '"><i style="--amostra:' + AV.tonalizar(corHex(eq.cor), t.id) + '"></i>' + esc(t.nome) + '</button>';
        }).join("") + '</div>' +
        '<h3>Forma da equipe</h3><div class="seletor" role="radiogroup" aria-label="Forma da equipe">' +
        D.formas.map(function (f) {
          var on = eq.forma === f.id;
          return '<button class="forma-botao' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" aria-label="' + f.nome + '" title="' + f.nome + '" data-acao="forma" data-equipe="' + i + '" data-valor="' + f.id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + f.d + '"/></svg></button>';
        }).join("") + '</div>' +
        '<p class="nota">A forma aparece no canto do avatar e identifica a equipe mesmo para quem não distingue cores.</p>' +
        '<h3>Traço do desenho</h3><div class="estilos" role="radiogroup" aria-label="Traço do desenho">' +
        AV.ESTILOS.map(function (x) {
          var on = a.estilo === x.id;
          return '<button class="estilo-botao' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="av-estilo" data-valor="' + x.id + '">' +
            AV.svg(com({ estilo: x.id }), { cor: corHex(eq.cor), estatico: true, indice: i }) + '<span><strong>' + esc(x.nome) + '</strong>' + esc(x.texto) + '</span></button>';
        }).join("") + '</div>';
    } else {
      h += '<h3>Grito de guerra (opcional)</h3>' +
        '<label class="criador-campo"><span class="so-leitor">Grito de guerra da equipe</span><input type="text" maxlength="' + GRITO_MAX + '" data-grito="' + i + '" value="' + esc(eq.grito) + '" placeholder="Escreva o grito da equipe" autocomplete="off" data-foco></label>' +
        '<p class="nota">Até ' + GRITO_MAX + ' caracteres. Aparece num balão quando a equipe acerta e embaixo do nome no pódio final.</p>';
    }
    return h;
  }
  function telaCriador() {
    var i = ui.criador, eq = config.equipes[i], est = ui.criadorEstado;
    return '<div class="criador-fundo" data-acao-fundo="fechar-criador">' +
      '<div class="criador" role="dialog" aria-modal="true" aria-labelledby="criador-titulo" style="--cor-equipe:' + corHex(eq.cor) + '">' +
        '<header class="criador-topo">' +
          '<h2 id="criador-titulo">Avatar da equipe ' + (i + 1) + '<small>Monte em camadas: personagem, expressão, acessório, cor e traço</small></h2>' +
          '<button class="botao botao-principal botao-pequeno" data-acao="fechar-criador">Pronto</button>' +
        '</header>' +
        '<div class="criador-corpo">' +
          '<section class="criador-palco" aria-label="Prévia do avatar">' +
            '<div class="criador-heroi">' + avatarDe(eq, i, est, "av-gg", { rotulo: AV.descrever(eq.avatar, i) }) + (eq.grito && est === "comemorando" ? gritoHtml(eq) : '') + '</div>' +
            '<p class="criador-nome">' + ficha(eq) + esc(eq.nome) + '</p>' +
            '<p class="criador-desc">' + esc(AV.descrever(eq.avatar, i)) + '</p>' +
            '<div class="criador-estados" role="radiogroup" aria-label="Ver animação">' +
              AV.ESTADOS.map(function (x) { var on = est === x.id; return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="criador-estado" data-valor="' + x.id + '">' + esc(x.nome) + '</button>'; }).join("") +
            '</div>' +
            '<div class="criador-palco-acoes"><button class="botao botao-contorno botao-pequeno" data-acao="av-aleatorio" title="Sorteia personagem, expressão, acessório e tom">Aleatório</button></div>' +
          '</section>' +
          '<section class="criador-camadas">' +
            '<div class="criador-abas" role="tablist" aria-label="Camadas do avatar">' +
              ABAS_CRIADOR.map(function (x, k) { var on = ui.criadorAba === x[0]; return '<button class="criador-aba" role="tab" aria-selected="' + on + '" data-acao="criador-aba" data-valor="' + x[0] + '"><b>' + (k + 1) + '</b><span>' + x[1] + '</span></button>'; }).join("") +
            '</div>' +
            '<div class="criador-painel" role="tabpanel">' + painelCriador(eq, i) + '</div>' +
          '</section>' +
        '</div>' +
        '<footer class="criador-rodape">' +
          '<span class="nota">Tudo fica salvo neste aparelho. Esc ou Pronto fecha.</span>' +
          '<span class="equipe-acoes">' +
            (i > 0 ? '<button class="botao botao-contorno botao-pequeno" data-acao="criador-equipe" data-valor="' + (i - 1) + '">Equipe anterior</button>' : '') +
            (i < config.nEquipes - 1 ? '<button class="botao botao-contorno botao-pequeno" data-acao="criador-equipe" data-valor="' + (i + 1) + '">Próxima equipe</button>' : '') +
          '</span>' +
        '</footer>' +
      '</div>' +
    '</div>';
  }
  function mudarAvatar(campo, valor) {
    var i = ui.criador, eq = config.equipes[i], a = AV.normalizar(eq.avatar, i);
    a[campo] = campo === "tom" ? Number(valor) : valor;
    eq.avatar = a;
    salvar();
  }

  /* ================= relatório de acertos (Fase 10) =================
     Taxa de acerto = acertos da equipe da vez ÷ vezes em que a questão foi aberta.
     Passar e tempo esgotado contam como "não acertou". O passe aparece à parte e não entra na taxa. */
  var NOMES_SAIDA = { acerto: "acertou", erro: "errou", passou: "passou", tempo: "tempo esgotado" };
  function questaoPorId(id) {
    var ks = Object.keys(bancos);
    for (var i = 0; i < ks.length; i++) { var b = bancos[ks[i]]; for (var k = 0; k < b.length; k++) if (b[k].id === id) return b[k]; }
    return null;
  }
  function nomeDisc(id) { if (id === "arena") return "Arena"; var d = D.disciplinas.filter(function (x) { return x.id === id; })[0]; return d ? d.nome : id; }
  function nomeNivel(id) { var n = D.niveis.filter(function (x) { return x.id === id; })[0]; return n ? n.nome : id; }
  /* jogada "normal": sem Tesoura, sem letras ocultas (Em Dobro depois dos 10 s), sem Às cegas e sem Contra o relógio */
  function jogadaNormal(r) { return !r.t && !r.o && !r.c && !r.r; }
  function partidasFiltradas(rel) {
    return rel.partidas.filter(function (p) {
      return (ui.relDisc === "todas" || p.disc === ui.relDisc) && (ui.relTurma === "todas" || (p.turma || "") === ui.relTurma);
    });
  }
  function contadorVazio() { return { abertas: 0, acerto: 0, erro: 0, passou: 0, tempo: 0, passe: 0, pAcerto: 0, pErro: 0, pRecusa: 0, tesoura: 0, ocultas: 0, cegasRelogio: 0, especiais: 0, morte: 0 }; }
  function somarLinha(c, r) {
    c.abertas++;
    if (c[r.s] !== undefined) c[r.s]++;
    if (r.p && r.p !== "ninguem") {
      c.passe++;
      if (r.p === "acerto") c.pAcerto++;
      else if (r.p === "recusado") c.pRecusa++;
      else c.pErro++;
    }
    if (r.t) c.tesoura++;
    if (r.o) c.ocultas++;
    if (r.c || r.r) c.cegasRelogio++;
    if (r.x) c.especiais++;
    if (r.m) c.morte++;
  }
  function taxa(c) { return c.abertas ? Math.round(c.acerto / c.abertas * 100) : null; }
  function situacao(t, valor) {
    var m = METAS[valor];
    if (t === null || !m) return "sem dados";
    return t < m[0] ? "abaixo" : t > m[1] ? "acima" : "dentro";
  }
  function montarRelatorio() {
    var rel = lerRelatorio(), partidas = partidasFiltradas(rel), porValor = {}, porQuestao = {}, total = 0;
    R.VALORES.forEach(function (v) { porValor[v] = contadorVazio(); });
    partidas.forEach(function (p) {
      (p.reg || []).forEach(function (r) {
        if (ui.relNormais && !jogadaNormal(r)) return;
        if (!porValor[r.v]) return;
        total++;
        somarLinha(porValor[r.v], r);
        if (!porQuestao[r.q]) porQuestao[r.q] = { id: r.q, valor: r.v, disc: p.disc, c: contadorVazio() };
        somarLinha(porQuestao[r.q].c, r);
      });
    });
    var questoes = Object.keys(porQuestao).map(function (k) { return porQuestao[k]; });
    questoes.sort(function (a, b) { return a.valor - b.valor || (a.id < b.id ? -1 : 1); });
    var turmas = [];
    rel.partidas.forEach(function (p) { var t = p.turma || ""; if (turmas.indexOf(t) < 0) turmas.push(t); });
    var discs = [];
    rel.partidas.forEach(function (p) { if (discs.indexOf(p.disc) < 0) discs.push(p.disc); });
    return { rel: rel, partidas: partidas, porValor: porValor, questoes: questoes, total: total, turmas: turmas, discs: discs };
  }
  function descricaoFiltro() {
    return (ui.relDisc === "todas" ? "todas as disciplinas" : nomeDisc(ui.relDisc)) + " · " +
      (ui.relTurma === "todas" ? "todas as turmas" : (ui.relTurma || "sem turma")) + " · " +
      (ui.relNormais ? "só jogadas normais" : "todas as jogadas");
  }
  function dataBr(iso) {
    var d = new Date(iso); if (isNaN(d)) return iso || "";
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return z(d.getDate()) + "/" + z(d.getMonth() + 1) + "/" + d.getFullYear() + " " + z(d.getHours()) + "h" + z(d.getMinutes());
  }
  function chipRel(campo, valor, titulo) {
    var on = ui[campo] === valor;
    return '<button class="chip' + (on ? " ativa" : "") + '" role="radio" aria-checked="' + on + '" data-acao="rel-filtro" data-campo="' + campo + '" data-valor="' + esc(valor) + '">' + esc(titulo) + '</button>';
  }
  function linhaValor(v, c) {
    var t = taxa(c), m = METAS[v], sit = situacao(t, v);
    var rotulo = { dentro: "dentro da meta", abaixo: "abaixo da meta (mais difícil que o previsto)", acima: "acima da meta (mais fácil que o previsto)", "sem dados": "sem dados ainda" }[sit];
    return '<div class="rel-valor rel-' + sit.replace(" ", "-") + '">' +
      '<div class="rel-valor-topo"><b class="rel-selo">' + v + '</b>' +
        '<span class="rel-taxa">' + (t === null ? "—" : t + "%") + '</span>' +
        '<span class="rel-situacao">' + rotulo + (c.abertas && c.abertas < 10 ? ' · poucos dados' : '') + '</span></div>' +
      '<div class="rel-trilho" role="img" aria-label="Taxa de acerto ' + (t === null ? "sem dados" : t + "%") + ', meta de ' + m[0] + ' a ' + m[1] + '%">' +
        '<span class="rel-meta" style="left:' + m[0] + '%;width:' + (m[1] - m[0]) + '%"></span>' +
        (t === null ? '' : '<span class="rel-barra" style="width:' + Math.max(t, 1) + '%"></span>') +
      '</div>' +
      '<p class="rel-conta">Meta ' + m[0] + '–' + m[1] + '% · ' + c.abertas + (c.abertas === 1 ? ' vez aberta' : ' vezes abertas') +
        ' · <b>' + c.acerto + '</b> acertou · <b>' + c.erro + '</b> errou · <b>' + c.passou + '</b> passou' + (c.tempo ? ' · <b>' + c.tempo + '</b> tempo esgotado' : '') +
        ' · <b>' + c.passe + '</b> foi ao passe' + (c.passe ? ' (' + c.pAcerto + ' acertou, ' + c.pErro + ' errou' + (c.pRecusa ? ', ' + c.pRecusa + ' recusou' : '') + ')' : '') + '</p>' +
    '</div>';
  }
  function telaRelatorio() {
    var r = montarRelatorio();
    var fora = r.questoes.filter(function (x) { return x.c.abertas >= MIN_POR_QUESTAO && situacao(taxa(x.c), x.valor) !== "dentro"; });
    fora.sort(function (a, b) {
      function dist(x) { var t = taxa(x.c), m = METAS[x.valor]; return t < m[0] ? m[0] - t : t - m[1]; }
      return dist(b) - dist(a);
    });
    var vazio = !r.rel.partidas.length;
    var h = '<main class="tela config relatorio">' +
      '<header class="barra">' +
        '<button class="botao botao-contorno botao-pequeno" data-acao="ir-inicio">Voltar</button>' +
        LOGO.completo("logo-barra") +
        '<span class="barra-titulo">Relatório de acertos</span>' +
      '</header>' +
      '<div class="config-grade rel-grade">';
    if (vazio) {
      h += '<section class="bloco bloco-largo rel-vazio"><h2>Nada registrado ainda</h2>' +
        '<p>Cada carta jogada neste aparelho entra aqui: a questão, se a equipe acertou, errou ou passou, e como foi o passe. Jogue uma partida e volte.</p>' +
        '<p class="nota">Os dados ficam só neste aparelho e navegador. Para juntar turmas, jogue sempre no mesmo aparelho ou copie os dados de cada um.</p></section></div></main>';
      return h;
    }
    h += '<section class="bloco bloco-largo">' +
        '<div class="rel-filtros">' +
          '<div><h3 class="mini-titulo">Disciplina</h3><div class="chips" role="radiogroup" aria-label="Disciplina">' + chipRel("relDisc", "todas", "Todas") +
            r.discs.map(function (d) { return chipRel("relDisc", d, nomeDisc(d)); }).join("") + '</div></div>' +
          '<div><h3 class="mini-titulo">Turma</h3><div class="chips" role="radiogroup" aria-label="Turma">' + chipRel("relTurma", "todas", "Todas") +
            r.turmas.map(function (t) { return chipRel("relTurma", t, t || "Sem turma"); }).join("") + '</div></div>' +
          '<div><h3 class="mini-titulo">Jogadas</h3>' +
            '<button class="interruptor' + (ui.relNormais ? " ligado" : "") + '" role="switch" aria-checked="' + ui.relNormais + '" data-acao="rel-normais"><span class="interruptor-trilho"><span></span></span>Só jogadas normais</button>' +
            '<p class="nota">Tira as que tiveram Tesoura, letras ocultas, Às cegas ou Contra o relógio, que mudam a dificuldade.</p></div>' +
        '</div>' +
        '<p class="rel-resumo"><b>' + r.partidas.length + '</b> ' + (r.partidas.length === 1 ? 'partida' : 'partidas') + ' · <b>' + r.total + '</b> ' + (r.total === 1 ? 'questão aberta' : 'questões abertas') + ' · <b>' + r.questoes.length + '</b> questões diferentes</p>' +
      '</section>' +
      '<section class="bloco bloco-largo">' +
        '<div class="bloco-topo"><h2>Taxa de acerto por valor</h2>' +
          '<div class="rel-acoes">' +
            '<button class="botao botao-principal botao-pequeno" data-acao="rel-copiar"' + (r.total ? '' : ' disabled') + '>Copiar dados</button>' +
            '<button class="botao botao-contorno botao-pequeno" data-acao="rel-baixar"' + (r.total ? '' : ' disabled') + '>Baixar .txt</button>' +
          '</div></div>' +
        (ui.relMsg ? '<p class="rel-msg" role="status">' + esc(ui.relMsg) + '</p>' : '') +
        '<div class="rel-valores">' + R.VALORES.map(function (v) { return linhaValor(v, r.porValor[v]); }).join("") + '</div>' +
        '<p class="nota"><span class="rel-legenda-meta"></span> faixa da meta do plano · Taxa = vezes em que a equipe da vez acertou ÷ vezes em que a questão foi aberta. Passar e tempo esgotado contam como não acerto. O passe aparece à parte e não entra na taxa.</p>' +
      '</section>' +
      '<section class="bloco bloco-largo">' +
        '<h2>Questões fora da meta</h2>' +
        (fora.length ?
          '<p class="nota rel-nota-topo">Só as abertas ' + MIN_POR_QUESTAO + ' vezes ou mais, das mais distantes da meta para as mais próximas.</p>' +
          '<ol class="rel-questoes">' + fora.slice(0, 40).map(function (x) {
            var qq = questaoPorId(x.id), t = taxa(x.c), sit = situacao(t, x.valor);
            return '<li class="rel-q rel-' + sit + '"><b class="rel-selo">' + x.valor + '</b>' +
              '<span class="rel-q-texto"><strong>' + esc(x.id) + '</strong>' + (qq ? ' · ' + esc(qq.assunto) + '<span>' + esc(qq.enunciado) + '</span>' : '') + '</span>' +
              '<span class="rel-q-taxa">' + t + '%<small>' + x.c.acerto + ' de ' + x.c.abertas + ' · ' + (sit === "abaixo" ? "mais difícil" : "mais fácil") + '</small></span></li>';
          }).join("") + '</ol>' + (fora.length > 40 ? '<p class="nota">E mais ' + (fora.length - 40) + ' (todas estão nos dados copiados).</p>' : '')
          : '<p class="nota rel-nota-topo">Nenhuma questão aberta ' + MIN_POR_QUESTAO + ' vezes ou mais ficou fora da meta' + (r.questoes.some(function (x) { return x.c.abertas >= MIN_POR_QUESTAO; }) ? '.' : ' (ainda faltam dados: cada questão precisa sair pelo menos ' + MIN_POR_QUESTAO + ' vezes).') + '</p>') +
      '</section>' +
      '<section class="bloco bloco-largo">' +
        '<h2>Partidas registradas</h2>' +
        '<p class="nota rel-nota-topo">Tire do relatório as partidas de teste, para não misturar com as da turma.</p>' +
        '<ul class="rel-partidas">' + r.rel.partidas.slice().reverse().map(function (p) {
          var noFiltro = r.partidas.indexOf(p) >= 0;
          return '<li class="' + (noFiltro ? '' : 'fora-filtro') + '"><span><strong>' + esc(dataBr(p.data)) + '</strong> · ' + esc(nomeDisc(p.disc)) + ' · ' + esc(nomeNivel(p.nivel)) + ' · ' + esc(p.turma || "sem turma") + ' · ' + p.nEq + ' equipes · ' + (p.reg || []).length + ' jogadas</span>' +
            '<button class="botao botao-contorno botao-pequeno" data-acao="rel-tirar" data-valor="' + esc(p.id) + '">Tirar</button></li>';
        }).join("") + '</ul>' +
        '<div class="rel-apagar">' + (ui.relApagar ?
          '<span>Apagar todo o relatório deste aparelho? Não dá para desfazer.</span><button class="botao botao-principal botao-pequeno rel-perigo" data-acao="rel-apagar">Sim, apagar tudo</button><button class="botao botao-contorno botao-pequeno" data-acao="rel-cancelar">Cancelar</button>'
          : '<button class="botao botao-contorno botao-pequeno" data-acao="rel-apagar">Apagar todo o relatório</button>') + '</div>' +
      '</section>' +
      '</div></main>';
    return h;
  }
  function tirarPartida(id) {
    var rel = lerRelatorio();
    rel.partidas = rel.partidas.filter(function (p) { return p.id !== id; });
    gravarRel(rel);
    ultimoRelatorio = "";
    ui.relMsg = "Partida tirada do relatório.";
    var r = montarRelatorio();
    if (ui.relDisc !== "todas" && r.discs.indexOf(ui.relDisc) < 0) ui.relDisc = "todas";
    if (ui.relTurma !== "todas" && r.turmas.indexOf(ui.relTurma) < 0) ui.relTurma = "todas";
  }
  /* texto para colar no chat de recalibração: resumo por valor e uma linha por questão (separador ;) */
  function textoRelatorio() {
    var r = montarRelatorio(), L = [];
    function cols(c) { return [c.abertas, c.acerto, c.erro, c.passou, c.tempo, c.passe, c.pAcerto, c.pErro, c.pRecusa].join(";"); }
    L.push("DUELO DE SABERES 2.0 · RELATÓRIO DE ACERTOS");
    L.push("Gerado em " + dataBr(new Date().toISOString()) + " · filtro: " + descricaoFiltro());
    L.push("Partidas: " + r.partidas.length + " · questões abertas: " + r.total + " · questões diferentes: " + r.questoes.length);
    L.push("Taxa = acertos da equipe da vez ÷ vezes aberta (passou e tempo esgotado contam como não acerto; o passe fica à parte).");
    L.push("");
    L.push("PARTIDAS");
    L.push("data;disciplina;nivel;turma;equipes;jogadas");
    r.partidas.forEach(function (p) { L.push([dataBr(p.data), nomeDisc(p.disc), nomeNivel(p.nivel), p.turma || "sem turma", p.nEq, (p.reg || []).length].join(";")); });
    L.push("");
    L.push("POR VALOR");
    L.push("valor;abertas;acertou;errou;passou;tempo;foi_ao_passe;passe_acertou;passe_errou;passe_recusou;taxa;meta;situacao");
    R.VALORES.forEach(function (v) {
      var c = r.porValor[v], t = taxa(c);
      L.push([v, cols(c), t === null ? "" : t + "%", METAS[v][0] + "-" + METAS[v][1] + "%", situacao(t, v)].join(";"));
    });
    L.push("");
    L.push("POR QUESTÃO");
    L.push("id;valor;assunto;abertas;acertou;errou;passou;tempo;foi_ao_passe;passe_acertou;passe_errou;passe_recusou;taxa;situacao;com_tesoura;com_letras_ocultas;cegas_ou_relogio;carta_especial;morte_subita");
    r.questoes.forEach(function (x) {
      var qq = questaoPorId(x.id), c = x.c, t = taxa(c);
      L.push([x.id, x.valor, qq ? qq.assunto : "", cols(c), t === null ? "" : t + "%", c.abertas >= MIN_POR_QUESTAO ? situacao(t, x.valor) : "poucos dados",
        c.tesoura, c.ocultas, c.cegasRelogio, c.especiais, c.morte].join(";"));
    });
    return L.join("\n");
  }
  function copiarRelatorio() {
    var texto = textoRelatorio();
    function ok() { ui.relMsg = "Dados copiados. Cole no chat de recalibração."; desenhar(); }
    function manual() {
      ui.relMsg = "";
      desenhar();
      var bloco = app.querySelector(".rel-valores");
      if (!bloco) return;
      var area = document.createElement("textarea");
      area.className = "rel-texto"; area.readOnly = true; area.value = texto; area.setAttribute("aria-label", "Dados do relatório");
      bloco.parentNode.insertBefore(area, bloco);
      var msg = document.createElement("p"); msg.className = "rel-msg"; msg.setAttribute("role", "status");
      msg.textContent = "Não consegui copiar sozinho: selecione o texto abaixo e copie (ou use Baixar .txt).";
      area.parentNode.insertBefore(msg, area);
      area.focus(); area.select();
    }
    function velho() {
      try {
        var t = document.createElement("textarea");
        t.value = texto; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        var deu = document.execCommand("copy");
        document.body.removeChild(t);
        if (deu) ok(); else manual();
      } catch (e) { manual(); }
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok, velho);
    else velho();
  }
  function baixarRelatorio() {
    try {
      var blob = new Blob([textoRelatorio()], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a"), hoje = new Date();
      a.href = URL.createObjectURL(blob);
      a.download = "duelo-relatorio-" + hoje.getFullYear() + "-" + (hoje.getMonth() < 9 ? "0" : "") + (hoje.getMonth() + 1) + "-" + (hoje.getDate() < 10 ? "0" : "") + hoje.getDate() + ".txt";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      ui.relMsg = "Arquivo baixado."; desenhar();
    } catch (e) { ui.relMsg = "Este navegador não deixou baixar. Use Copiar dados."; desenhar(); }
  }

  /* ---------- começo da partida ---------- */
  function comecarPartida() {
    var banco = bancoAtual();
    if (!banco.length || !podeComecar()) return;
    disciplinaSalva = config.modoJogo === "arena" ? "arena" : config.disciplina;
    visual.tema = temaDaPartida();
    motor = R.novaPartida({
      rodadas: config.rodadas, nivel: config.modoJogo === "sala" ? config.nivel : "calouro",
      equipes: equipesConfig(), tempoExtraLeitura: config.tempoExtraLeitura,
      chancesTesoura: config.chancesTesoura, chancesPunicao: config.chancesPunicao, recentes: recentes,
      inicio: new Date().toISOString()
    }, banco);
    E().turma = config.turma || "";
    limparUi();
    tela = "jogo";
    salvo = null;
    salvar();
    desenhar();
  }
  function limparUi() {
    ui.revelando = null; ui.especial = null; ui.giro = null; ui.telaForcada = null; ui.revelacaoVista = false; ui.sorteando = false;
    animId++;
    clearTimeout(timerEspecial);
  }

  /* ---------- barra de jogo ---------- */
  function botaoDesfazer() {
    return '<button class="botao botao-contorno botao-pequeno" data-acao="desfazer"' + (motor.podeDesfazer() ? "" : " disabled") + ' title="Desfazer a última decisão (Ctrl+Z)">Desfazer</button>';
  }
  function barraJogo(extra) {
    var e = E();
    return '<header class="barra barra-jogo">' +
      LOGO.completo("logo-barra") +
      '<div class="barra-info"><strong>Rodada ' + e.rodada + ' de ' + e.rodadas + '</strong><span>' + esc(nomeTema()) + '</span></div>' +
      '<div class="barra-acoes">' + (extra || "") + botaoDesfazer() + botaoSom() + '</div>' +
    '</header>';
  }

  /* ---------- tabuleiro ---------- */
  function telaTabuleiro() {
    var e = E(), daVez = eqp(e.vez), restam = motor.cartasRestantes();
    var dicas = [];
    if (e.tesoura[e.vez]) dicas.push(ICONE.tesoura + ' Vocês têm uma Tesoura: dá para usar na pergunta, antes de responder.');
    if (e.asCegas[e.vez]) dicas.push(ICONE.olho + ' Às cegas: na próxima pergunta, as alternativas aparecem só por 5 s.');
    if (e.contraRelogio[e.vez]) dicas.push(ICONE.relogio + ' Contra o relógio: a próxima pergunta tem só 10 s.');
    return '<main class="tela tabuleiro">' + fundoTema() +
      barraJogo(
        '<button class="botao botao-contorno botao-pequeno" data-acao="sortear"' + (restam && ui.revelando === null ? "" : " disabled") + '>Sortear carta</button>' +
        '<button class="botao botao-contorno botao-pequeno" data-acao="encerrar">Encerrar</button>') +
      '<section class="mesa" aria-label="Tabuleiro">' +
        (e.avisos.length ? '<div class="avisos" role="status">' + e.avisos.map(function (a) { return '<p>' + ICONE.gelo + esc(a) + '</p>'; }).join("") + '</div>' : '') +
        '<p class="vez" style="--cor-equipe:' + corHex(daVez.cor) + '">' + avatarDe(daVez, e.vez, "navez", "av-p") + '<span>Vez de <strong>' + esc(daVez.nome) + '</strong>: escolham uma carta</span></p>' +
        (dicas.length ? '<div class="dicas">' + dicas.map(function (d) { return '<p>' + d + '</p>'; }).join("") + '</div>' : '') +
        '<div class="cartas' + (ui.revelando !== null ? " escolhida" : "") + '">' + e.cartas.map(cartaHtml).join("") + '</div>' +
      '</section>' +
      placarLateral() +
    '</main>';
  }
  /* fundo próprio do tema no tabuleiro e na pergunta (o Palco usa só o degradê do CSS) */
  /* o fundo do tema vai numa caixa "fundo-tema" (display: contents): o alto contraste esconde qualquer fundo de tema */
  function fundoTema() { var t = temaObj(); return t && t.fundo ? '<div class="fundo-tema">' + t.fundo() + '</div>' : ""; }
  function cartaHtml(c, i) {
    var dep = config.depuracao && ui.verCartas;
    if (c.usada) {
      var r = c.resultado || "";
      var rot = { "acerto": "acertou", "erro": "errou", "passe": "passe", "passe-acerto": "passe ✓", "passe-erro": "passe ✗", "pulada": "pulada" }[r] || "";
      return '<div class="carta carta-usada r-' + r + '" aria-label="Carta ' + c.n + ', já jogada, valia ' + c.valor + '"><span class="carta-valor-usado">' + c.valor + '</span><small class="carta-rotulo">' + rot + '</small></div>';
    }
    var virando = ui.revelando === i;
    var esp = c.especial ? INFO_ESPECIAL[c.especial] : null;
    return '<button class="carta' + (virando ? " virando revelada" : "") + '" data-acao="carta" data-indice="' + i + '" aria-label="Carta ' + c.n + '"' + (i === primeiraLivre() && ui.revelando === null ? " data-foco" : "") + (ui.revelando !== null ? " tabindex=\"-1\"" : "") + '>' +
      '<span class="carta-giro"><span class="carta-verso"><span class="carta-numero">' + c.n + '</span>' +
        (dep ? '<span class="carta-espia">' + c.valor + (esp ? ' · ' + esp.titulo.replace("!", "") : '') + '</span>' : '') +
      '</span>' +
      '<span class="carta-frente' + (c.especial ? " frente-" + c.especial : "") + '"><span class="carta-valor">' + c.valor + '</span></span></span></button>';
  }
  function primeiraLivre() { var c = E().cartas; for (var i = 0; i < c.length; i++) if (!c[i].usada) return i; return -1; }

  function marcasEquipe(i) {
    var e = E(), m = "";
    if (e.semTurno[i]) m += '<span class="marca marca-gelo">' + ICONE.gelo + 'sem turno' + (e.semTurno[i] > 1 ? " ×" + e.semTurno[i] : "") + '</span>';
    if (e.tesoura[i]) m += '<span class="marca marca-tesoura">' + ICONE.tesoura + 'Tesoura</span>';
    if (e.asCegas[i]) m += '<span class="marca">' + ICONE.olho + 'às cegas</span>';
    if (e.contraRelogio[i]) m += '<span class="marca">' + ICONE.relogio + '10 s</span>';
    return m ? '<span class="marcas">' + m + '</span>' : '';
  }
  function placarLateral() {
    var e = E(), lider = Math.max.apply(null, e.pontos);
    return '<aside class="placar' + (ui.placarAberto ? " aberto" : "") + '" aria-label="Placar">' +
      '<button class="placar-puxador" data-acao="placar-toggle" aria-expanded="' + ui.placarAberto + '">' +
        '<span>Placar</span>' +
        '<span class="placar-resumo">' + e.equipes.map(function (q, i) { return '<span class="placar-mini' + (i === e.vez ? " da-vez" : "") + (e.semTurno[i] ? " congelada" : "") + '">' + ficha(q) + pontosTxt(e.pontos[i]) + (e.tesoura[i] ? ICONE.tesoura : '') + '</span>'; }).join("") + '</span>' +
      '</button>' +
      '<h2 class="placar-titulo">Placar</h2>' +
      '<ol class="placar-lista">' + e.equipes.map(function (q, i) {
        var p = e.pontos[i];
        return '<li class="placar-item' + (i === e.vez ? " da-vez" : "") + (e.semTurno[i] ? " congelada" : "") + '" style="--cor-equipe:' + corHex(q.cor) + '">' +
          '<span class="ficha-casa">' + avatarDe(q, i, estadoPlacar(i), "av-m") + (e.tesoura[i] ? '<span class="ficha-poder" title="Tesoura guardada">' + ICONE.tesoura + '</span>' : '') + '</span>' +
          '<span class="placar-nome">' + esc(q.nome) + (i === e.vez ? '<em>na vez</em>' : (p === lider && p !== 0 ? '<em>na frente</em>' : '')) + marcasEquipe(i) + '</span>' +
          '<span class="placar-pontos' + (p < 0 ? " negativo" : "") + '">' + pontosTxt(p) + '</span>' +
        '</li>';
      }).join("") + '</ol>' +
    '</aside>';
  }

  /* sorteio: um marcador percorre as cartas restantes, vai desacelerando e para na sorteada */
  function sortearComMarcador() {
    if (ui.sorteando || ui.revelando !== null) return;
    var livres = [];
    E().cartas.forEach(function (c, k) { if (!c.usada) livres.push(k); });
    if (!livres.length) return;
    var escolha = livres[Math.floor(Math.random() * livres.length)], L = livres.length;
    if (L === 1 || REDUZIR.matches) { abrirCarta(escolha); return; }
    var cartas = app.querySelector(".cartas"), id = ++animId;
    ui.sorteando = true;
    cartas.classList.add("sorteando");
    var b = app.querySelector('[data-acao="sortear"]'); if (b) b.disabled = true;
    var inicio = Math.floor(Math.random() * L), alvo = livres.indexOf(escolha);
    var passos = 2 * L + ((alvo - inicio + L) % L), k = 0;
    if (passos < 16) passos += L;
    function marcar(i) {
      var ant = cartas.querySelector(".carta.marcada"); if (ant) ant.classList.remove("marcada");
      var el = cartas.querySelector('.carta[data-indice="' + i + '"]'); if (el) el.classList.add("marcada");
    }
    function passo() {
      if (id !== animId) return;
      marcar(livres[(inicio + k) % L]);
      if (k >= passos) {
        cartas.querySelector(".carta.marcada").classList.add("parou");
        som("escolhida");
        setTimeout(function () {
          if (id !== animId) return;
          ui.sorteando = false;
          cartas.classList.remove("sorteando");
          var m = cartas.querySelector(".carta.marcada"); if (m) m.classList.remove("marcada", "parou");
          abrirCarta(escolha);
        }, 650);
        return;
      }
      var p = k / passos;
      som("marcador", { p: p });
      k++;
      setTimeout(passo, 55 + Math.pow(p, 2.6) * 430);
    }
    passo();
  }

  /* abrir carta: gira, mostra o especial e só então abre a pergunta */
  function abrirCarta(i) {
    var c = E().cartas[i];
    if (!c || c.usada || ui.revelando !== null) return;
    if (ui.sorteando && arguments.length < 2) return;
    ui.revelando = i;
    var el = app.querySelector('.carta[data-indice="' + i + '"]');
    var t = temaObj(), animada = !!(t && t.revelar && el && !REDUZIR.matches);
    if (el) {
      if (animada) t.revelar(el, app.querySelector(".cartas"), false);
      el.classList.add("virando"); app.querySelector(".cartas").classList.add("escolhida");
    }
    som("revelar", { curto: !animada });
    setTimeout(function () {
      if (ui.revelando !== i) return;
      if (c.especial) {
        ui.especial = { tipo: c.especial, valor: c.valor, carta: i };
        desenhar();
        som("esp-" + c.especial);
        timerEspecial = setTimeout(fecharEspecial, espera(4200));
      } else concluirAbertura(i);
    }, espera(animada ? t.revelacaoMs : 1300));
  }
  function fecharEspecial() {
    clearTimeout(timerEspecial);
    if (!ui.especial) return;
    var i = ui.especial.carta;
    ui.especial = null;
    concluirAbertura(i);
  }
  function concluirAbertura(i) {
    ui.revelando = null;

    motor.abrirCarta(i);
    salvar();
    desenhar();
  }

  function sobreEspecial() {
    var s = ui.especial, info = INFO_ESPECIAL[s.tipo], extra = "";
    if (s.tipo === "dobro") {
      for (var k = 0; k < 22; k++) extra += '<i style="--x:' + Math.round(Math.random() * 100) + '%;--d:' + (Math.random() * 1.6).toFixed(2) + 's;--t:' + (1.6 + Math.random() * 1.4).toFixed(2) + 's"></i>';
      extra = '<div class="moedas" aria-hidden="true">' + extra + '</div>';
    }
    if (s.tipo === "congelou") {
      for (var f = 0; f < 16; f++) extra += '<i style="--x:' + Math.round(Math.random() * 100) + '%;--d:' + (Math.random() * 2).toFixed(2) + 's;--t:' + (3 + Math.random() * 2).toFixed(2) + 's">' + ICONE.gelo + '</i>';
      extra = '<div class="flocos" aria-hidden="true">' + extra + '</div>';
    }
    var deco = "";
    if (s.tipo === "congelou") deco = '<svg class="trincas" viewBox="0 0 100 75" aria-hidden="true"><path d="M48 0 44 18 55 27 41 44 50 58 46 75M44 18 30 22 18 14M55 27 72 24 84 34M41 44 26 50 12 48M50 58 66 62 80 75" fill="none" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (s.tipo === "congelou") deco = '<span class="esp-gelo" aria-hidden="true"><b>' + s.valor + '</b></span>' + deco;
    if (s.tipo === "tesoura") deco = '<span class="corte-tesoura" aria-hidden="true">' + ICONE.tesoura + '</span>';
    return '<div class="sobre esp esp-' + s.tipo + '" role="dialog" aria-modal="true" aria-label="' + esc(info.titulo) + '">' + extra +
      '<div class="esp-conteudo">' +
        '<div class="esp-carta"><span class="esp-metade a"><b>' + s.valor + '</b></span><span class="esp-metade b"><b>' + s.valor + '</b></span>' + deco + '</div>' +
        '<p class="esp-rotulo">' + info.rotulo + '</p>' +
        '<h2 class="esp-titulo">' + ICONE[info.icone] + info.titulo + '</h2>' +
        '<p class="esp-texto">' + esc(info.texto) + '</p>' +
        '<button class="botao botao-principal botao-enorme" data-acao="fechar-especial" data-foco>Ver a pergunta</button>' +
      '</div></div>';
  }

  /* ---------- pergunta e resultado ---------- */
  function equipeResponde() { var j = E().jogada; return j.etapa === "passe" ? j.passe.equipe : j.equipe; }

  /* respondida: mostra o resultado. modo "roleta": errou no passe e a roleta vem a seguir. */
  function telaPergunta(respondida, modo) {
    var e = E(), j = e.jogada, q = motor.questao(j.q), eqI = equipeResponde(), eq = eqp(eqI);
    var r = null;
    if (respondida) r = modo === "roleta" ?
      { tipo: "erro", titulo: j.porTempo ? "Tempo esgotado no passe" : "Errou no passe", delta: null, equipe: eqI, texto: "A equipe vai para a roleta de punição." } :
      j.resultado;
    var segredo = r && r.vaiParaPasse;   // vai ao passe: a resposta certa continua escondida
    var letras = ["A", "B", "C", "D"];
    var esp = j.etapa === "principal" && j.especial ? INFO_ESPECIAL[j.especial] : null;
    var valor = j.etapa === "morte" ? null : motor.valorAcerto();
    var rotuloValor = j.etapa === "passe" ? '<small>no passe</small><b>' + valor + '</b><small>' + j.valor + ' + 50%</small>' :
      j.etapa === "morte" ? '<small>morte súbita</small><b>500</b>' :
      '<small>valendo</small><b>' + valor + '</b>' + (j.especial === "dobro" ? '<small>' + j.valor + ' × 2</small>' : '');
    var selo = "";
    if (esp) selo = '<span class="selo-especial s-' + j.especial + '">' + ICONE[esp.icone] + esp.titulo + '</span>';
    if (j.etapa === "passe") selo = '<span class="selo-especial s-passe">Passe</span>';
    if (j.etapa === "morte") selo = '<span class="selo-especial s-tudo">' + ICONE.alarme + 'Morte súbita</span>';
    if (j.cegas && j.etapa === "principal") selo += '<span class="selo-especial s-efeito">' + ICONE.olho + 'Às cegas</span>';
    if (j.relogio && j.etapa === "principal") selo += '<span class="selo-especial s-efeito">' + ICONE.relogio + 'Contra o relógio</span>';

    var revelando = r && j.oculta, n = 0;
    var h = '<main class="tela pergunta' + (r ? " respondida" : "") + (revelando ? " revelando" : "") + (esp ? " com-" + j.especial : "") + '" style="--cor-equipe:' + corHex(eq.cor) + '">' + fundoTema() +
      '<header class="barra barra-jogo">' +
        '<p class="vez vez-barra">' + avatarDe(eq, eqI, r ? estadoVeredito(r, j) : "navez", "av-p") + '<span><strong>' + esc(eq.nome) + '</strong> responde</span></p>' +
        '<div class="selos">' + selo + '</div>' +
        '<div class="valor-selo" aria-label="Valendo ' + (valor === null ? "a morte súbita" : valor + " pontos") + '">' + rotuloValor + '</div>' +
      '</header>' +
      '<section class="pergunta-corpo">' +
        '<div class="telao"><h1 class="enunciado">' + enunciadoHtml(q.enunciado) + '</h1></div>';

    if (!r && j.aberta) h += letrasOcultas(j);
    else if (revelando) {
      /* revelação: primeiro a letra escolhida, depois as outras (se a resposta puder ser mostrada) */
      var ordem = j.ordemOculta, passo = 1;
      h += '<div class="alternativas">' + ordem.map(function (orig, pos) {
        var escolhida = orig === j.escolhida, k = escolhida ? 0 : passo++;
        var esconder = segredo && !escolhida;
        var classe = "alternativa revelada";
        if (esconder) classe += " segredo";
        else if (orig === q.correta) classe += " certa";
        else if (escolhida) classe += " errada";
        else classe += " apagada";
        if (escolhida) classe += " escolhida";
        return '<button class="' + classe + '" style="--k:' + k + '" disabled>' +
          '<span class="letra">' + letras[pos] + '</span><span class="texto">' + (esconder ? "?" : esc(q.alternativas[orig])) + '</span></button>';
      }).join("") + '</div>';
      n = segredo ? 1 : ordem.length;
    }
    else h += '<div class="alternativas">' + j.ordem.map(function (orig, pos) {
        var classe = "alternativa", cortada = j.eliminadas.indexOf(orig) >= 0;
        if (r) {
          if (orig === q.correta) classe += " certa";
          else if (j.escolhida === orig) classe += " errada";
          else classe += " apagada";
        } else if (cortada) classe += " cortada";
        return '<button class="' + classe + '" data-acao="responder" data-orig="' + orig + '"' + (r || cortada ? " disabled" : "") + (pos === 0 && !r && !cortada ? " data-foco" : "") + '>' +
          '<span class="letra">' + letras[pos] + '</span><span class="texto">' + esc(q.alternativas[orig]) + '</span>' +
          (cortada && !r ? '<span class="cortada-icone" aria-label="eliminada">' + ICONE.tesoura + '</span>' : '') + '</button>';
      }).join("") + '</div>';
    h += '</section><aside class="pergunta-lado"' + (revelando ? ' style="--n:' + n + '"' : '') + '>';

    if (!r) {
      var bloqueado = motor.passarBloqueado();
      h += cronometro(j) +
        (j.somemEm && !j.aberta ? '<p class="aviso-somem">As alternativas somem em <b class="somem-num">' + segundosParaSumir(j) + '</b> s' + (j.especial === "dobro" && !j.cegas && VOZ.ligada() ? ' ou no fim da leitura' : '') + '</p>' : '') +
        '<div class="lado-acoes">' +
          '<button class="botao botao-contorno" data-acao="pausar">' + (j.pausado ? "Continuar" : "Pausar") + '</button>' +
          (VOZ.disponivel() ? '<button class="botao botao-contorno" data-acao="ler" title="Ler a pergunta de novo (L)">Ler de novo</button>' : '') +
          (j.etapa === "principal" ? '<button class="botao botao-contorno" data-acao="passar"' + (bloqueado ? ' disabled title="Na armadilha não dá para passar"' : '') + '>' + (bloqueado ? "Passar bloqueado" : "Passar") + '</button>' : '') +
          (motor.podeUsarTesoura() ? '<button class="botao botao-tesoura" data-acao="tesoura">' + ICONE.tesoura + 'Usar Tesoura</button>' : '') +
          botaoDesfazer() +
        '</div>';
    } else {
      var pun = modo === "roleta" ? null : j.punicao;
      var botao = modo === "roleta" ? '<button class="botao botao-principal botao-enorme" data-acao="ir-roleta" data-foco>Girar a roleta de punição</button>' :
        segredo ? '<button class="botao botao-principal botao-enorme" data-acao="abrir-passe" data-foco>Ir para o passe</button>' :
        '<button class="botao botao-principal botao-enorme" data-acao="concluir" data-foco>' + (j.etapa === "morte" ? "Continuar" : "Voltar ao tabuleiro") + '</button>';
      var heroi = r.equipe !== null && r.equipe !== undefined ? eqp(r.equipe) : null;
      h += '<div class="veredito ' + r.tipo + '" role="status"' + (heroi ? ' style="--cor-equipe:' + corHex(heroi.cor) + '"' : '') + '>' +
          (heroi ? '<div class="veredito-heroi">' + avatarDe(heroi, r.equipe, estadoVeredito(r, j), "av-g") + (r.tipo === "acerto" ? gritoHtml(heroi) : '') + '</div>' : '') +
          '<span class="veredito-titulo">' + esc(r.titulo) + '</span>' +
          (r.delta ? '<span class="veredito-pontos">' + sinal(r.delta) + '</span>' : '') +
          (r.equipe !== null && r.equipe !== undefined ? '<span class="veredito-equipe">' + ficha(eqp(r.equipe)) + esc(eqp(r.equipe).nome) + '</span>' : '') +
          (pun && pun.beneficiada !== null ? '<span class="veredito-equipe">' + ficha(eqp(pun.beneficiada)) + esc(eqp(pun.beneficiada).nome) + ' <b class="mais">+' + (j.valor / 2) + '</b></span>' : '') +
          (r.texto ? '<p class="veredito-regra">' + esc(r.texto) + '</p>' : '') +
          (segredo ? '<p>A resposta certa fica em segredo: a questão vai para o passe.</p>' : modo === "roleta" ? '' : '<p>' + esc(q.explicacao) + '</p>') +
        '</div>' +
        '<div class="lado-acoes lado-fim">' + botao + (modo === "roleta" ? '' : botaoDesfazer()) + '</div>';
    }
    return h + '</aside></main>';
  }

  /* o personagem reage ao resultado: comemora, lamenta ou fica congelado (armadilha Congelou!) */
  function estadoVeredito(r, j) {
    if (r.tipo === "acerto") return "comemorando";
    if (r.tipo === "erro") return j && j.etapa === "principal" && j.especial === "congelou" && E().semTurno[r.equipe] ? "congelado" : "lamentando";
    return "parado";
  }

  /* alternativas ocultas: só as letras, na mesma ordem em que apareceram; o conteúdo aparece depois da escolha */
  function letrasOcultas(j) {
    var letras = ["A", "B", "C", "D"];
    var motivo = j.etapa === "passe" ? "Passe: as alternativas foram escondidas, cada uma na mesma letra de antes." :
      j.cegas ? "Às cegas: os 5 s acabaram e as alternativas sumiram, cada uma na mesma letra de antes." :
      j.sumiram ? "Em Dobro: as alternativas sumiram, cada uma na mesma letra de antes." : "As alternativas estão escondidas.";
    return '<div class="ocultas">' +
      '<p class="ocultas-titulo">Alternativas ocultas</p>' +
      '<p class="ocultas-motivo">' + esc(motivo) + ' Escolham uma letra: o conteúdo aparece depois.</p>' +
      '<div class="letras-ocultas">' + j.ordemOculta.map(function (orig, pos) {
        if (j.eliminadas.indexOf(orig) >= 0) return '<button class="letra-oculta cortada" disabled aria-label="Letra ' + letras[pos] + ', cortada pela Tesoura">' +
          '<span class="letra">' + letras[pos] + '</span><span class="oculta-verso" aria-hidden="true">✕</span></button>';
        return '<button class="letra-oculta" data-acao="responder" data-orig="' + orig + '"' + (pos === j.ordemOculta.findIndex(function (o) { return j.eliminadas.indexOf(o) < 0; }) ? " data-foco" : "") + ' aria-label="Letra ' + letras[pos] + '">' +
          '<span class="letra">' + letras[pos] + '</span><span class="oculta-verso" aria-hidden="true">?</span></button>';
      }).join("") + '</div>' +
    '</div>';
  }

  /* errou ou passou: a questão some e vai para o passe, sem revelar a resposta */
  function telaRumoAoPasse() {
    var e = E(), j = e.jogada, r = j.resultado, eq = eqp(j.equipe);
    return '<main class="tela rumo-passe" style="--cor-equipe:' + corHex(eq.cor) + '">' + cenario() +
      '<div class="rumo-caixa veredito ' + r.tipo + '" role="status">' +
        avatarDe(eq, j.equipe, r.tipo === "erro" ? "lamentando" : "parado", "av-g") +
        '<p class="vez">' + ficha(eq) + '<span><strong>' + esc(eq.nome) + '</strong></span></p>' +
        '<span class="veredito-titulo">' + esc(r.titulo) + '</span>' +
        (r.delta ? '<span class="veredito-pontos">' + sinal(r.delta) + '</span>' : '') +
        (r.texto ? '<p class="veredito-regra">' + esc(r.texto) + '</p>' : '') +
        '<p>A resposta fica em segredo: a questão vai para o passe.</p>' +
      '</div>' +
      '<div class="inicio-acoes">' +
        '<button class="botao botao-principal botao-enorme" data-acao="abrir-passe" data-foco>Ir para o passe</button>' +
        botaoDesfazer() +
      '</div>' +
    '</main>';
  }

  /* ---------- cronômetro ---------- */
  var RAIO = 52, CIRC = 2 * Math.PI * RAIO;
  function cronometro(j) {
    return '<div class="cronometro" role="timer" aria-label="Tempo restante">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true">' +
        '<circle class="crono-trilho" cx="60" cy="60" r="' + RAIO + '"/>' +
        '<circle class="crono-arco" cx="60" cy="60" r="' + RAIO + '" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>' +
      '</svg>' +
      '<span class="crono-numero">' + Math.ceil(j.restante) + '</span>' +
      '<span class="crono-legenda">' + (j.pausado ? "pausado" : "segundos") + '</span>' +
    '</div>';
  }
  function atualizarCronometro() {
    var el = app.querySelector(".cronometro"), j = E().jogada;
    if (!el || !j) return;
    var seg = Math.max(0, Math.ceil(j.restante));
    el.querySelector(".crono-numero").textContent = seg;
    el.querySelector(".crono-arco").setAttribute("stroke-dashoffset", (CIRC * (1 - j.restante / j.tempoTotal)).toFixed(1));
    el.querySelector(".crono-legenda").textContent = j.pausado ? "pausado" : "segundos";
    el.classList.toggle("alerta", seg <= 5);
    el.classList.toggle("pausado", !!j.pausado);
    var s = app.querySelector(".somem-num");
    if (s && j.somemEm) s.textContent = segundosParaSumir(j);
  }
  function iniciarRelogio() {
    var ultimo = performance.now();
    atualizarCronometro();
    relogio = setInterval(function () {
      var agora = performance.now(), dt = (agora - ultimo) / 1000;
      ultimo = agora;
      if (!motor || E().fase !== "pergunta") return pararRelogio();
      var j = E().jogada;
      if (j.pausado || ui.giro || ui.especial) return;
      var antes = Math.ceil(j.restante);
      j.restante = Math.max(0, j.restante - dt);
      var seg = Math.ceil(j.restante);
      if (seg !== antes && seg > 0 && seg <= 5) som("tique");
      if (j.somemEm && !j.aberta && j.restante > 0 && horaDeEsconder(j)) {
        motor.esconderAlternativas(); salvar(); desenhar(); return;
      }
      atualizarCronometro();
      if (j.restante <= 0) {
        var armadilha = j.etapa === "principal" ? j.especial : null;
        motor.tempoEsgotado(); som("tempo"); somDaArmadilha(armadilha, 800); salvar(); desenhar();
      }
    }, 100);
  }
  function pararRelogio() { if (relogio) { clearInterval(relogio); relogio = null; } }
  function pausar() {
    var j = E().jogada; if (!j) return;
    j.pausado = !j.pausado;
    var b = app.querySelector('[data-acao="pausar"]'); if (b) b.textContent = j.pausado ? "Continuar" : "Pausar";
    VOZ.pausar(j.pausado);
    atualizarCronometro();
  }

  /* ---------- roletas (Tesoura, sorteio do passe e punição) ---------- */
  function polar(a, r) { var rad = a * Math.PI / 180; return [100 + r * Math.sin(rad), 100 - r * Math.cos(rad)]; }
  function rodaSvg(fatias, classe) {
    var total = fatias.reduce(function (s, f) { return s + f.peso; }, 0), ang = 0, partes = "", rotulos = "", luzes = "";
    fatias.forEach(function (f, i) {
      var a0 = ang, a1 = ang + f.peso / total * 360; ang = a1;
      f.a0 = a0; f.a1 = a1;
      if (f.peso <= 0) return;
      var p0 = polar(a0, 92), p1 = polar(a1, 92), grande = (a1 - a0) > 180 ? 1 : 0;
      partes += '<path d="M100 100L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + 'A92 92 0 ' + grande + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + 'Z" fill="' + f.cor + '" stroke="#1C070D" stroke-width="1.2" data-fatia="' + i + '"/>';
      /* texto ao longo do raio; na metade esquerda ele é virado para não ficar de cabeça para baixo */
      var c = (a0 + a1) / 2, virar = c > 180 && c < 360, dentro = f.dentro || 26;
      rotulos += '<text transform="rotate(' + (virar ? c + 90 : c - 90).toFixed(2) + ' 100 100)" x="' + (virar ? 100 - dentro : 100 + dentro) + '" y="100" text-anchor="' + (virar ? "end" : "start") + '" fill="' + (f.tinta || "#FFFFFF") + '" font-size="' + (f.fonte || 8) + '" dominant-baseline="middle" class="roda-texto">' + esc(f.rotulo) + '</text>';
    });
    for (var k = 0; k < 24; k++) { var p = polar(k * 15, 97); luzes += '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="1.7" class="roda-luz" style="--k:' + k + '"/>'; }
    return '<div class="roda ' + (classe || "") + '">' +
      '<svg viewBox="0 0 200 200" class="roda-svg" aria-hidden="true">' +
        '<circle cx="100" cy="100" r="99" fill="#2A0A12" stroke="#F5C451" stroke-width="2"/>' + luzes +
        '<g class="roda-giro">' + partes + rotulos + '</g>' +
        '<circle cx="100" cy="100" r="14" fill="url(#roda-centro)" stroke="#1C070D" stroke-width="1.5"/>' +
        '<defs><radialGradient id="roda-centro" cx=".35" cy=".3"><stop offset="0" stop-color="#FFF0B8"/><stop offset=".6" stop-color="#F5C451"/><stop offset="1" stop-color="#A6730F"/></radialGradient></defs>' +
      '</svg>' +
      '<svg class="roda-ponteiro" viewBox="0 0 24 30" aria-hidden="true"><path d="M2 2h20L12 28Z" fill="#FFF0B8" stroke="#1C070D" stroke-width="2" stroke-linejoin="round"/></svg>' +
    '</div>';
  }
  var PALETA_PUNICAO = ["#B80F2E", "#F5C451", "#4A0615", "#EEF1F7", "#8E0E2A", "#C98A14", "#2A0A12", "#9AA2B1"];
  function fatiasPunicao() {
    return motor.fatiasPunicao().map(function (f, i) {
      var cor = PALETA_PUNICAO[i % PALETA_PUNICAO.length];
      var claro = cor === "#F5C451" || cor === "#EEF1F7" || cor === "#9AA2B1" || cor === "#C98A14";
      return { rotulo: f.nome, peso: Math.max(Number(f.chance) || 0, 0), cor: cor, tinta: claro ? "#1C070D" : "#FFFFFF", fonte: 7, dentro: 20 };
    });
  }
  function fatiasTesoura() {
    var cores = ["#F5C451", "#EEF1F7", "#D21F46"];
    return R.FATIAS_TESOURA.map(function (f, i) { return { rotulo: f.nome, peso: Math.max(Number(E().chancesTesoura[i]) || 0, 0), cor: cores[i], tinta: i === 2 ? "#FFFFFF" : "#1C070D", fonte: 10, dentro: 30 }; });
  }
  function fatiasPasse(eleg) {
    return eleg.map(function (i) { var q = eqp(i); return { rotulo: q.nome, peso: 1, cor: corHex(q.cor), tinta: "#FFFFFF", fonte: eleg.length > 3 ? 7.5 : 9, dentro: 22 }; });
  }
  /* garante que a fatia sorteada aparece mesmo com chance 0 (forçada na depuração) */
  function prepararFatias(f, alvo) { if (f[alvo] && f[alvo].peso <= 0) f[alvo].peso = 2; return f.filter(function () { return true; }); }

  function iniciarGiro() {
    var g = ui.giro; g.iniciado = true;
    if (g.doTema) { sortearNoTema(g); return; }
    var giro = app.querySelector(".roda-giro"), fatias = g.fatias, f = fatias[g.indice];
    var largura = f.a1 - f.a0, centro = f.a0 + largura / 2 + (Math.random() - .5) * largura * .55;
    var final = 360 * (REDUZIR.matches ? 1 : 6) + (360 - centro);
    var dur = REDUZIR.matches ? 400 : 4200;
    if (giro) {
      giro.style.transformOrigin = "100px 100px";
      giro.style.transition = "none";
      giro.style.transform = "rotate(0deg)";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          giro.style.transition = "transform " + dur + "ms cubic-bezier(.12,.72,.18,1)";
          giro.style.transform = "rotate(" + final.toFixed(1) + "deg)";
        });
      });
    }
    g.final = final;
    if (giro && !REDUZIR.matches) ouvirCatraca(giro, fatias, g);
    setTimeout(function () {
      if (ui.giro !== g) return;
      g.parado = true;
      var roda = app.querySelector(".roda");
      if (roda) {
        roda.classList.add("parou");
        var p = roda.querySelector('[data-fatia="' + g.indice + '"]'); if (p) p.classList.add("vencedora");
      }
      var res = app.querySelector(".giro-resultado");
      if (res) { res.hidden = false; var b = res.querySelector("button"); if (b) b.focus(); }
      som("escolhida");
      if (g.tipo === "tesoura") som("corte", { n: g.indice + 1 });
      if (g.tipo === "punicao") setTimeout(function () { if (ui.giro === g) som(/escapou/i.test(g.nome) ? "escapou" : "punicao"); }, 350);
      if (g.aoParar) g.aoParar();
    }, dur + 150);
  }
  /* lê o ângulo da roda a cada quadro e estala quando uma divisa de fatia passa pelo ponteiro */
  function ouvirCatraca(giro, fatias, g) {
    var bordas = fatias.map(function (f) { return f.a0; }), ultima = null, ultimoSom = 0;
    function regiao(ang) {
      var a = ((360 - ang) % 360 + 360) % 360, k = 0;
      for (var i = 0; i < bordas.length; i++) if (a >= bordas[i]) k = i;
      return k;
    }
    function quadro() {
      if (ui.giro !== g || g.parado || !giro.isConnected) return;
      var m = getComputedStyle(giro).transform, ang = 0;
      if (m && m !== "none") { var v = m.split("(")[1].split(")")[0].split(","); ang = Math.atan2(Number(v[1]), Number(v[0])) * 180 / Math.PI; }
      var r = regiao(ang), agora = performance.now();
      if (ultima !== null && r !== ultima && agora - ultimoSom > 28) { som("catraca"); ultimoSom = agora; }
      ultima = r;
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }
  function rodaParada(fatias, g, classe) {
    /* depois de redesenhar, a roda continua no ângulo final */
    return g && g.parado ? rodaSvg(fatias, classe).replace('class="roda-giro"', 'class="roda-giro" style="transform-origin:100px 100px;transform:rotate(' + g.final.toFixed(1) + 'deg)"').replace('class="roda ', 'class="roda parou ') : rodaSvg(fatias, classe);
  }

  function sobreGiro() {
    var g = ui.giro;
    return '<div class="sobre giro" role="dialog" aria-modal="true" aria-label="' + esc(g.titulo) + '">' +
      '<div class="giro-conteudo">' +
        '<h2 class="giro-titulo">' + ICONE.tesoura + esc(g.titulo) + '</h2>' +
        rodaSvg(g.fatias, "roda-media") +
        '<div class="giro-resultado"' + (g.parado ? '' : ' hidden') + '>' +
          '<p>' + esc(g.texto) + '</p>' +
          '<button class="botao botao-principal botao-enorme" data-acao="fechar-giro">Voltar à pergunta</button>' +
        '</div>' +
      '</div></div>';
  }

  function usarTesoura() {
    var n = motor.usarTesoura();
    if (!n) return;
    salvar();
    ui.giro = { tipo: "tesoura", sobre: true, titulo: "Roleta da Tesoura", fatias: prepararFatias(fatiasTesoura(), n - 1), indice: n - 1,
      texto: n === 3 ? "Eliminou 3 alternativas: sobrou só a certa!" : "Eliminou " + n + (n === 1 ? " alternativa errada." : " alternativas erradas.") };
    desenhar();
  }

  /* ---------- passe ---------- */
  function telaPasse() {
    var e = E(), j = e.jogada, p = j.passe, girando = ui.giro && ui.giro.tipo === "passe" && !ui.giro.parado;
    var mostrarRoda = p.precisaSorteio;
    var escolhido = p.equipe !== null && !girando;
    var h = '<main class="tela passe">' + cenario() +
      '<header class="passe-topo">' +
        '<h1 class="passe-titulo">Passe!</h1>' +
        '<p class="passe-sub">Carta de ' + j.valor + ' · no passe vale <b>' + (j.valor * 1.5) + '</b> · sem alternativas · 10 s</p>' +
      '</header>' +
      '<div class="passe-centro">';
    var t = temaObj();
    if (t && t.passe) {
      /* tema com tela própria de passe: as equipes que podem receber aparecem no campo de visão */
      var lista = mostrarRoda ? p.elegiveis : (p.equipe !== null ? [p.equipe] : []);
      var foco = escolhido ? lista.indexOf(p.equipe) : -1;
      /* cada equipe entra no passe do tema com o seu avatar (a forma continua no canto) */
      if (lista.length) h += t.passe(lista.map(function (i) { var q = eqp(i); return { nome: esc(q.nome), cor: corHex(q.cor), ficha: avatarDe(q, i, escolhido && i === p.equipe ? "navez" : "parado", "ficha av-no-tema") }; }),
        foco >= 0 ? foco : null, escolhido ? "pequeno" : "", "Passe<br>" + j.valor);
      if (mostrarRoda && !p.sorteado) h += '<button class="botao botao-principal botao-enorme" data-acao="sortear-passe" data-foco>Sortear quem recebe</button>';
      if (!mostrarRoda) h += '<p class="passe-direto">' + (e.equipes.length === 2 ? "Com duas equipes, a outra recebe direto." : "Só uma equipe pode receber agora.") + '</p>';
    } else if (mostrarRoda) {
      var gp = ui.giro && ui.giro.tipo === "passe" ? ui.giro : null;
      h += gp ? rodaParada(gp.fatias, gp, escolhido ? "roda-pequena" : "") : rodaSvg(fatiasPasse(p.elegiveis));
      if (!p.sorteado) h += '<button class="botao botao-principal botao-enorme" data-acao="sortear-passe" data-foco>Sortear quem recebe</button>';
    } else {
      h += '<p class="passe-direto">' + (e.equipes.length === 2 ? "Com duas equipes, a outra recebe direto." : "Só uma equipe pode receber agora.") + '</p>';
    }
    if (escolhido) {
      var q = eqp(p.equipe);
      h += '<div class="passe-escolhida" style="--cor-equipe:' + corHex(q.cor) + '">' +
          avatarDe(q, p.equipe, "navez", "av-g") + '<p><strong>' + esc(q.nome) + '</strong> recebe o passe</p>' +
        '</div>' +
        '<div class="inicio-acoes">' +
          '<button class="botao botao-principal botao-enorme" data-acao="aceitar-passe" data-foco>Aceitar</button>' +
          '<button class="botao botao-contorno botao-enorme" data-acao="recusar-passe">Recusar</button>' +
        '</div>' +
        '<p class="nota nota-centro">Aceitou e acertou: ganha ' + (j.valor * 1.5) + '. Aceitou e errou: gira a roleta de punição. Recusou: ninguém pontua.</p>';
    }
    h += '</div><div class="passe-rodape">' + botaoDesfazer() + '</div></main>';
    return h;
  }
  function sortearPasse() {
    var j = E().jogada, eq = motor.sortearPasse();
    if (eq === null) return;
    salvar();
    var t = temaObj();
    ui.giro = { tipo: "passe", doTema: !!(t && t.passe && t.sortear), fatias: fatiasPasse(j.passe.elegiveis), indice: j.passe.elegiveis.indexOf(eq),
      aoParar: function () { setTimeout(function () { if (ui.giro && ui.giro.tipo === "passe") desenhar(); }, espera(700)); } };
    desenhar();
  }

  /* sorteio do passe nos temas com tela própria: o foco pula de equipe em equipe até travar na sorteada */
  function sortearNoTema(g) {
    temaObj().sortear(app, g.indice, {
      reduzir: REDUZIR.matches,
      vivo: function () { return ui.giro === g; },
      aoPasso: function () { som("foco"); },
      aoTravar: function () { som("escolhida"); },
      aoFim: function () { g.parado = true; desenhar(); }
    });
  }

  /* ---------- roleta de punição ---------- */
  function telaRoleta() {
    var e = E(), j = e.jogada, q = eqp(j.passe.equipe), g = ui.giro && ui.giro.tipo === "punicao" ? ui.giro : null;
    var fatias = g ? g.fatias : fatiasPunicao();
    return '<main class="tela roleta" style="--cor-equipe:' + corHex(q.cor) + '">' + cenario() +
      '<header class="passe-topo">' +
        '<h1 class="passe-titulo">Roleta de punição</h1>' +
        '<p class="passe-sub">' + avatarDe(q, j.passe.equipe, "lamentando", "av-p") + ' <b>' + esc(q.nome) + '</b> errou no passe · carta de ' + j.valor + '</p>' +
      '</header>' +
      '<div class="passe-centro">' +
        (g ? rodaParada(fatias, g) : rodaSvg(fatias)) +
        (g ? '' : '<button class="botao botao-principal botao-enorme" data-acao="girar-punicao" data-foco>Girar a roleta</button>') +
        (g ? '<div class="giro-resultado"' + (g.parado ? '' : ' hidden') + '><p><b>' + esc(g.nome) + '</b> ' + esc(g.texto) + '</p>' +
          '<button class="botao botao-principal botao-enorme" data-acao="fechar-punicao">Ver o resultado</button></div>' : '') +
      '</div>' +
      '<div class="passe-rodape">' + (g ? '' : botaoDesfazer()) + '</div>' +
    '</main>';
  }
  function girarPunicao() {
    var fatias = fatiasPunicao();
    var ef = motor.girarPunicao();
    if (!ef) return;
    salvar();
    ui.telaForcada = "roleta";
    ui.giro = { tipo: "punicao", fatias: prepararFatias(fatias, ef.indice), indice: ef.indice, nome: ef.nome + ":", texto: ef.texto };
    desenhar();
  }

  /* ---------- fim de rodada: pódio parcial ---------- */
  /* pódio parcial: as barras correm na mesma velocidade, então quem fez mais pontos cresce por mais tempo;
     no fim a lista se reordena e mostra posições, pontos da rodada e quem subiu ou caiu */
  function chaveAnim() { var e = E(); return e.fase + "-" + e.rodada + "-" + e.trajetoria.length + "-" + (e.vencedor === null ? "" : e.vencedor); }
  function vaiAnimar() { return ui.animado !== chaveAnim() && !REDUZIR.matches; }
  function botaoPular() { return '<button class="botao botao-contorno botao-pequeno pular" data-acao="pular-anim">Pular animação</button>'; }

  function telaFimRodada() {
    var e = E(), rk = motor.ranking(), ultima = motor.ehUltimaRodada(), animar = vaiAnimar();
    var empate = ultima && motor.empatadosNoTopo().length > 1;
    var antes = e.placarInicioRodada.map(function (p, i) { return { equipe: i, pontos: p }; }).sort(function (a, b) { return b.pontos - a.pontos || a.equipe - b.equipe; });
    var posAntes = {}; antes.forEach(function (x, k) { posAntes[x.equipe] = k; });
    var posFinal = {}; rk.forEach(function (x, k) { posFinal[x.equipe] = k; });
    function extra(eq) {
      var d = e.pontos[eq] - e.placarInicioRodada[eq], mov = posAntes[eq] - posFinal[eq];
      return '<span class="delta' + (d < 0 ? " neg" : "") + '">' + sinal(d) + ' na rodada</span>' +
        (e.rodada > 1 && mov ? '<span class="mov ' + (mov > 0 ? "sobe" : "desce") + '">' + (mov > 0 ? "▲ subiu " + mov : "▼ caiu " + (-mov)) + '</span>' : '');
    }
    return '<main class="tela final fim-rodada">' + cenario() +
      '<header class="final-topo">' + LOGO.completo("logo-barra") + '<h1>' + (e.encerradaAntes ? "Partida encerrada" : "Fim da rodada " + e.rodada) + '</h1><p>' + esc(nomeTema()) + ' · pódio parcial</p></header>' +
      listaRanking(animar ? antes : rk, extra, animar, false, function (eq) {
        /* subiu no placar: comemora · caiu: lamenta · líder: comemora */
        var mov = posAntes[eq] - posFinal[eq];
        return mov > 0 || (posFinal[eq] === 0 && e.pontos[eq] > 0) ? "comemorando" : mov < 0 ? "lamentando" : "parado";
      }) +
      (empate ? '<p class="nota nota-centro destaque' + (animar ? " esconde" : "") + '" data-depois>Empate no primeiro lugar: vem a morte súbita!</p>' : '') +
      '<div class="inicio-acoes' + (animar ? " esconde" : "") + '" data-depois>' +
        '<button class="botao botao-principal botao-enorme" data-acao="avancar-rodada"' + (animar ? '' : ' data-foco') + '>' + (!ultima ? "Rodada " + (e.rodada + 1) : empate ? "Morte súbita" : "Pódio final") + '</button>' +
        botaoDesfazer() +
      '</div>' +
      (animar ? botaoPular() : '') +
    '</main>';
  }
  /* lista do placar; com animar, começa com o placar do início da rodada (ou zero) e sem posições */
  function listaRanking(lista, extra, animar, deZero, estadoDe) {
    var e = E(), rk = motor.ranking(), posicao = {};
    rk.forEach(function (x) { posicao[x.equipe] = x.posicao; });
    var topo = Math.max(1, Math.max.apply(null, e.pontos.map(Math.abs)));
    return '<ol class="final-lista' + (animar ? " corrida" : "") + '" data-topo="' + topo + '">' + lista.map(function (x) {
      var i = x.equipe, q = eqp(i), p = e.pontos[i], de = deZero ? 0 : e.placarInicioRodada[i];
      var mostrado = animar ? de : p;
      return '<li class="final-item' + (!animar && posicao[i] === 1 ? " primeiro" : "") + '" data-equipe="' + i + '" data-de="' + de + '" data-ate="' + p + '" style="--cor-equipe:' + corHex(q.cor) + ';--largura:' + Math.max(3, Math.round(Math.max(0, mostrado) / topo * 100)) + '%">' +
        '<span class="final-posicao">' + (animar ? '' : posicao[i] + 'º') + '</span>' + avatarDe(q, i, estadoDe ? estadoDe(i) : "parado", "av-m") +
        '<span class="final-nome">' + esc(q.nome) + '<i class="final-barra"></i>' + (extra ? '<span class="final-extra' + (animar ? " esconde" : "") + '">' + extra(i) + '</span>' : '') + '</span>' +
        '<span class="placar-pontos' + (mostrado < 0 ? " negativo" : "") + '">' + pontosTxt(mostrado) + '</span></li>';
    }).join("") + '</ol>';
  }

  /* ---------- animações de suspense ---------- */
  function esperar(ms, id, fn) { setTimeout(function () { if (id === animId) fn(); }, ms); }
  function contar(el, de, ate, ms, id, fim) {
    var t0 = null;
    function quadro(ts) {
      if (id !== animId) return;
      if (t0 === null) t0 = ts;
      var p = ms > 0 ? Math.min(1, (ts - t0) / ms) : 1, v = Math.round(de + (ate - de) * (1 - Math.pow(1 - p, 3)));
      el.textContent = pontosTxt(p < 1 ? Math.round(v / 10) * 10 : ate); el.classList.toggle("negativo", v < 0);
      if (p < 1) requestAnimationFrame(quadro); else if (fim) fim();
    }
    requestAnimationFrame(quadro);
  }
  function mostrarDepois(raiz) {
    (raiz || app).querySelectorAll("[data-depois]").forEach(function (el) { el.classList.remove("esconde"); });
    var b = app.querySelector("[data-depois] .botao-principal");
    if (b) { b.focus({ preventScroll: true }); if (b.getBoundingClientRect().bottom > window.innerHeight) b.scrollIntoView({ behavior: "smooth", block: "center" }); }
    var pular = app.querySelector(".pular"); if (pular) pular.remove();
  }

  /* corrida das barras: mesma velocidade para todas, quem tem mais pontos corre por mais tempo */
  function animarCorrida(lista, id, fim) {
    var topo = Number(lista.dataset.topo) || 1;
    var itens = Array.prototype.map.call(lista.children, function (li) {
      return { li: li, de: Number(li.dataset.de), ate: Number(li.dataset.ate), num: li.querySelector(".placar-pontos"), barra: li.querySelector(".final-barra") };
    });
    var maior = Math.max.apply(null, itens.map(function (d) { return Math.abs(d.ate - d.de); }));
    var dur = Math.min(5200, 1800 + maior * 4), vel = maior > 0 ? maior / dur : 1, t0 = null;
    itens.forEach(function (d) { d.li.classList.toggle("contando", d.ate !== d.de); });
    function quadro(ts) {
      if (id !== animId) return;
      if (t0 === null) t0 = ts;
      var t = ts - t0, acabou = true;
      itens.forEach(function (d) {
        var dist = Math.abs(d.ate - d.de), feito = Math.min(dist, vel * t);
        if (feito < dist) acabou = false; else d.li.classList.remove("contando");
        var v = d.de + (d.ate >= d.de ? 1 : -1) * feito;
        d.num.textContent = pontosTxt(feito < dist ? Math.round(v / 10) * 10 : d.ate);
        d.num.classList.toggle("negativo", v < 0);
        d.barra.style.width = Math.max(3, Math.max(0, v) / topo * 100) + "%";
      });
      if (!acabou) requestAnimationFrame(quadro);
      else esperar(600, id, function () { reordenar(lista, id, fim); });
    }
    requestAnimationFrame(quadro);
  }
  /* reordena a lista pela classificação final, deslizando cada equipe até o seu lugar */
  function reordenar(lista, id, fim) {
    var rk = motor.ranking(), itens = {}, antes = {};
    Array.prototype.forEach.call(lista.children, function (li) { itens[li.dataset.equipe] = li; antes[li.dataset.equipe] = li.getBoundingClientRect().top; });
    rk.forEach(function (x) { lista.appendChild(itens[x.equipe]); });
    rk.forEach(function (x) {
      var li = itens[x.equipe], d = antes[x.equipe] - li.getBoundingClientRect().top;
      li.style.transition = "none"; li.style.transform = "translateY(" + d + "px)";
    });
    void lista.offsetHeight;
    rk.forEach(function (x) { var li = itens[x.equipe]; li.style.transition = "transform .8s cubic-bezier(.2,1.1,.3,1)"; li.style.transform = ""; });
    esperar(900, id, function () {
      rk.forEach(function (x, k) {
        var li = itens[x.equipe];
        li.querySelector(".final-posicao").textContent = x.posicao + "º";
        if (x.posicao === 1) li.classList.add("primeiro", "destaca");
        var ex = li.querySelector(".final-extra"); if (ex) ex.classList.remove("esconde");
      });
      if (fim) fim();
    });
  }

  function animarFimRodada() {
    var id = animId, chave = chaveAnim(), lista = app.querySelector(".final-lista.corrida");
    if (!lista) return;
    esperar(500, id, function () {
      animarCorrida(lista, id, function () { ui.animado = chave; esperar(400, id, function () { mostrarDepois(); }); });
    });
  }

  /* ---------- morte súbita ---------- */
  function telaMorte() {
    var e = E(), ms = e.morte, prox = eqp(ms.fila[0]);
    return '<main class="tela final morte">' + cenario() +
      '<header class="final-topo">' + LOGO.completo("logo-barra") + '<h1 class="morte-titulo">Morte súbita</h1>' +
        '<p>Leva ' + ms.leva + ' · uma questão de 500 para cada equipe empatada · sem passe e sem especiais · o placar não muda</p></header>' +
      '<ul class="morte-equipes">' + ms.equipes.map(function (i) {
        var q = eqp(i), r = ms.resultados[i];
        return '<li class="' + (r === true ? "ok" : r === false ? "nao" : ms.fila[0] === i ? "proxima" : "") + '" style="--cor-equipe:' + corHex(q.cor) + '">' +
          avatarDe(q, i, r === true ? "comemorando" : r === false ? "lamentando" : ms.fila[0] === i ? "navez" : "parado", "av-m") +
          '<span>' + esc(q.nome) + '</span><small>' + (r === true ? "acertou" : r === false ? "errou" : ms.fila[0] === i ? "agora" : "aguarda") + '</small></li>';
      }).join("") + '</ul>' +
      (ms.leva > 1 && e.fase === "morte-leva" && !Object.keys(ms.resultados).length ? '<p class="nota nota-centro destaque">Ninguém se separou na leva anterior: nova leva com ' + ms.equipes.length + ' equipes.</p>' : '') +
      '<div class="inicio-acoes">' +
        '<button class="botao botao-principal botao-enorme" data-acao="proxima-morte" data-foco>Pergunta para ' + esc(prox.nome) + '</button>' +
        botaoDesfazer() +
      '</div>' +
    '</main>';
  }

  /* ---------- pódio final ---------- */
  function trajetoriaSvg(animar) {
    var e = E(), T = e.trajetoria, n = e.equipes.length;
    if (T.length < 2) return "";
    var W = 640, H = 260, M = { e: 46, d: 70, t: 16, b: 28 };
    var todos = [].concat.apply([], T), min = Math.min(0, Math.min.apply(null, todos)), max = Math.max(100, Math.max.apply(null, todos));
    function x(k) { return M.e + k / (T.length - 1) * (W - M.e - M.d); }
    function y(v) { return M.t + (max - v) / (max - min) * (H - M.t - M.b); }
    var passo = Math.pow(10, Math.floor(Math.log10(Math.max(1, (max - min) / 4))));
    if ((max - min) / passo > 8) passo *= 2.5; if ((max - min) / passo > 8) passo *= 2;
    var grade = "";
    for (var v = Math.ceil(min / passo) * passo; v <= max; v += passo) {
      grade += '<line x1="' + M.e + '" x2="' + (W - M.d) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="tj-grade' + (v === 0 ? " zero" : "") + '"/>' +
        '<text x="' + (M.e - 6) + '" y="' + y(v).toFixed(1) + '" class="tj-eixo" text-anchor="end" dominant-baseline="middle">' + pontosTxt(Math.round(v)) + '</text>';
    }
    e.marcosRodada.forEach(function (k, r) {
      grade += '<line x1="' + x(k).toFixed(1) + '" x2="' + x(k).toFixed(1) + '" y1="' + M.t + '" y2="' + (H - M.b) + '" class="tj-rodada"/>' +
        '<text x="' + (x(k) + 4).toFixed(1) + '" y="' + (H - 10) + '" class="tj-eixo">rodada ' + (r + 1) + '</text>';
    });
    var linhas = "", cabecas = "", fichas = "";
    for (var i = 0; i < n; i++) {
      var cor = corHex(eqp(i).cor);
      var pts = T.map(function (p, k) { return x(k).toFixed(1) + "," + y(p[i]).toFixed(1); });
      linhas += '<polyline points="' + (animar ? pts[0] : pts.join(" ")) + '" data-pts="' + pts.join(" ") + '" fill="none" stroke="' + cor + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="tj-linha"/>';
      if (animar) cabecas += '<circle class="tj-cabeca" r="5" cx="' + x(0).toFixed(1) + '" cy="' + y(0).toFixed(1) + '" fill="' + cor + '" stroke="#FFFFFF" stroke-width="1.6"/>';
      var f = achar(D.formas, eqp(i).forma), ux = x(T.length - 1), uy = y(T[T.length - 1][i]);
      fichas += '<g class="tj-ficha" transform="translate(' + (ux + 4).toFixed(1) + ' ' + (uy - 8).toFixed(1) + ') scale(.67)"><path d="' + f.d + '" fill="' + cor + '" stroke="var(--ficha-traco)" stroke-width="1.6"/></g>';
    }
    return '<figure class="trajetoria' + (animar ? " esconde" : "") + '"><figcaption>Trajetória do placar, carta a carta</figcaption>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico da trajetória do placar de cada equipe ao longo da partida">' + grade + linhas + cabecas +
        '<g class="tj-fichas' + (animar ? " esconde" : "") + '">' + fichas + '</g></svg></figure>';
  }
  /* a linha de cada equipe avança um ponto (uma carta) por vez */
  function animarTrajetoria(id, fim) {
    var fig = app.querySelector(".trajetoria");
    if (!fig) { if (fim) fim(); return; }
    fig.classList.remove("esconde");
    fig.scrollIntoView({ behavior: "smooth", block: "center" });
    var linhas = Array.prototype.map.call(fig.querySelectorAll(".tj-linha"), function (l) { return { el: l, pts: l.dataset.pts.split(" ") }; });
    var cabecas = fig.querySelectorAll(".tj-cabeca"), total = linhas[0].pts.length, k = 1;
    var intervalo = Math.max(45, Math.min(260, 4200 / total));
    function passo() {
      if (id !== animId) return;
      linhas.forEach(function (l, i) {
        l.el.setAttribute("points", l.pts.slice(0, k + 1).join(" "));
        var p = l.pts[k].split(","); cabecas[i].setAttribute("cx", p[0]); cabecas[i].setAttribute("cy", p[1]);
      });
      k++;
      if (k < total) setTimeout(passo, intervalo);
      else esperar(300, id, function () {
        Array.prototype.forEach.call(cabecas, function (c) { c.remove(); });
        fig.querySelector(".tj-fichas").classList.remove("esconde");
        if (fim) fim();
      });
    }
    esperar(500, id, passo);
  }

  function confete() {
    var cores = ["#FFF0B8", "#F5C451", "#FFFFFF", "#D21F46", "#9FDCFF", "#2FCB7A"], h = "";
    for (var k = 0; k < 46; k++) h += '<i style="--x:' + Math.round(Math.random() * 100) + '%;--d:' + (Math.random() * 1.4).toFixed(2) + 's;--t:' + (2.4 + Math.random() * 2).toFixed(2) + 's;--c:' + cores[k % cores.length] + ';--r:' + Math.round(Math.random() * 360) + 'deg"></i>';
    return '<div class="confete" aria-hidden="true">' + h + '</div>';
  }

  function telaFinal() {
    var e = E(), rk = motor.ranking(), top3 = rk.slice(0, 3), venceu = eqp(rk[0].equipe), animar = vaiAnimar();
    var ordemPodio = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : [top3[0]];
    var porMorte = e.morte && e.vencedor !== null;
    return '<main class="tela final podio-final">' + cenario() +
      '<header class="final-topo">' + LOGO.completo("logo-barra") + '<h1>Pódio final</h1><p>' + esc(nomeTema()) + '</p></header>' +
      '<div class="podio">' + ordemPodio.map(function (x) {
        var q = eqp(x.equipe), pos = x === rk[0] ? 1 : x.posicao;
        return '<div class="degrau d' + pos + (animar ? " espera" : " campeao-fixo") + '" data-pos="' + pos + '" data-ordem="' + rk.indexOf(x) + '" data-ate="' + x.pontos + '" style="--cor-equipe:' + corHex(q.cor) + '">' +
          avatarDe(q, x.equipe, x === rk[0] ? "trofeu" : "parado", "av-g") +
          '<strong class="degrau-nome">' + esc(q.nome) + '</strong>' +
          (q.grito ? '<span class="degrau-grito">“' + esc(q.grito) + '”</span>' : '') +
          '<span class="placar-pontos' + (!animar && x.pontos < 0 ? " negativo" : "") + '">' + (animar ? "0" : pontosTxt(x.pontos)) + '</span>' +
          '<span class="degrau-base"><b>' + pos + 'º</b></span>' +
        '</div>';
      }).join("") + '</div>' +
      '<p class="campea' + (animar ? " esconde" : "") + '" role="status"><b>' + esc(venceu.nome) + '</b> venceu o Duelo' + (porMorte ? ' na morte súbita (leva ' + e.morte.leva + ')' : '') + '!</p>' +
      trajetoriaSvg(animar) +
      (rk.length > 3 ? '<div class="lista-final' + (animar ? " esconde" : "") + '">' + listaRanking(rk) + '</div>' : '') +
      '<div class="inicio-acoes' + (animar ? " esconde" : "") + '" data-depois>' +
        '<button class="botao botao-principal botao-enorme" data-acao="jogar-de-novo"' + (animar ? '' : ' data-foco') + '>Jogar de novo</button>' +
        '<button class="botao botao-contorno" data-acao="ir-config">Nova configuração</button>' +
        '<button class="botao botao-contorno" data-acao="ir-relatorio">Relatório de acertos</button>' +
        '<button class="botao botao-contorno" data-acao="sair">Tela inicial</button>' +
      '</div>' +
      (animar ? botaoPular() : '') +
    '</main>';
  }

  /* pódio final: 3º, depois 2º e por fim o campeão, com os pontos subindo; depois o gráfico se forma */
  function animarFinal() {
    var id = animId, chave = chaveAnim();
    var degraus = Array.prototype.slice.call(app.querySelectorAll(".degrau.espera"));
    degraus.sort(function (a, b) { return Number(b.dataset.ordem) - Number(a.dataset.ordem); });
    var k = 0;
    function proximo() {
      if (k >= degraus.length) return depoisDoPodio();
      var d = degraus[k++], campeao = k === degraus.length, ms = campeao ? 2600 : 1700;
      d.classList.remove("espera"); d.classList.add("sobe");
      if (campeao) d.classList.add("suspense");
      esperar(campeao ? 900 : 500, id, function () {
        contar(d.querySelector(".placar-pontos"), 0, Number(d.dataset.ate), ms, id, function () {
          if (campeao) {
            d.classList.remove("suspense"); d.classList.add("campeao");
            app.querySelector(".podio").insertAdjacentHTML("beforeend", confete());
          }
          esperar(campeao ? 900 : 700, id, proximo);
        });
      });
    }
    function depoisDoPodio() {
      var c = app.querySelector(".campea"); if (c) c.classList.remove("esconde");
      esperar(900, id, function () {
        animarTrajetoria(id, function () {
          var l = app.querySelector(".lista-final"); if (l) l.classList.remove("esconde");
          ui.animado = chave;
          esperar(500, id, function () { mostrarDepois(); });
        });
      });
    }
    esperar(700, id, proximo);
  }

  /* ================= painel: visual e depuração ================= */
  function desenharPainel() {
    /* redesenhar o painel não pode tirar o foco de quem usa só o teclado */
    var f = document.activeElement, chaveF = f && painel.contains(f) && f.dataset ? [f.dataset.acao || "", f.dataset.campo || "", f.dataset.valor || "", f.dataset.dep || "", f.dataset.indice || ""].join("|") : null;
    desenharPainelSo();
    if (chaveF !== null) {
      var alvo = Array.prototype.filter.call(painel.querySelectorAll("button, select, input"), function (b) { return [b.dataset.acao || "", b.dataset.campo || "", b.dataset.valor || "", b.dataset.dep || "", b.dataset.indice || ""].join("|") === chaveF; })[0];
      (alvo || painel.querySelector(".pv-botao")).focus({ preventScroll: true });
    }
  }
  function abrirPainel(abrir) {
    ui.painelAberto = abrir;
    desenharPainelSo();
    var alvo = abrir ? painel.querySelector(".pv-caixa .pv-opcao.ativa, .pv-caixa button") : painel.querySelector(".pv-botao");
    if (alvo) alvo.focus({ preventScroll: true });
  }
  function desenharPainelSo() {
    var emJogo = tela === "jogo" && motor;
    var dep = config.depuracao && emJogo;
    function grupo(titulo, campo, itens) {
      return '<fieldset class="pv-grupo"><legend>' + titulo + '</legend><div class="pv-opcoes pv-linha">' + itens.map(function (it) {
        var on = visual[campo] === it[0];
        return '<button class="pv-opcao' + (on ? " ativa" : "") + '" aria-pressed="' + on + '" data-acao="visual" data-campo="' + campo + '" data-valor="' + it[0] + '">' + it[1] + '</button>';
      }).join("") + '</div></fieldset>';
    }
    var tAtual = TEMAS[visual.tema];
    var corpo = grupo("Tema", "tema", [["palco", "Palco"]].concat(temasEmOrdem().map(function (id) { return [id, TEMAS[id].nome]; }))) +
      grupo("Modo", "modo", [["escuro", "Escuro"], ["claro", "Sala clara"]]) +
      (tAtual && tAtual.fontes && tAtual.fontes.length > 1 ? '<fieldset class="pv-grupo"><legend>Fonte dos títulos (' + esc(tAtual.nome) + ')</legend><div class="pv-opcoes pv-linha">' +
        tAtual.fontes.map(function (f, k) {
          var on = (visual.fontes[visual.tema] || "a") === f.id;
          return '<button class="pv-opcao' + (on ? " ativa" : "") + '" aria-pressed="' + on + '" data-acao="fonte-tema" data-tema="' + visual.tema + '" data-valor="' + f.id + '">' + String.fromCharCode(65 + k) + " · " + esc(f.nome) + '</button>';
        }).join("") + '</div></fieldset>' : "") +
      grupo("Contraste", "contraste", [["normal", "Normal"], ["alto", "Alto contraste"]]) +
      grupo("Tamanho do texto", "texto", [["normal", "Normal"], ["grande", "Grande"], ["maior", "Maior"]]) +
      grupo("Animações", "movimento", [["aparelho", "Seguir o aparelho"], ["reduzir", "Reduzir"]]) +
      grupo("Sons", "som", [["sim", "Ligados"], ["nao", "Desligados"]]) +
      grupo("Volume dos efeitos", "somVol", [["1", "Normal"], ["0.4", "Mais baixos"]]) +
      grupo("Voz", "voz", [["sim", "Ligada"], ["nao", "Desligada"]]) +
      grupo("Velocidade da voz", "vozVel", [["0.85", "Lenta"], ["1", "Normal"], ["1.2", "Rápida"]]) +
      grupo("Volume da voz", "vozVol", [["1", "Alto"], ["0.7", "Médio"], ["0.45", "Baixo"]]) +
      grupo("Legenda da voz", "legenda", [["sim", "Com legenda"], ["nao", "Sem legenda"]]) +
      '<fieldset class="pv-grupo"><legend>Ouvir os sons do tema</legend><div class="pv-opcoes pv-linha">' +
        [["revelar", "Revelar"], ["acertar", "Acertar"], ["errar", "Errar"], ["tique", "Últimos 5 s"], ["tempo", "Tempo esgotado"], ["passe", "Passe"], ["foco", "Sorteio do passe"], ["escolhida", "Sorteada"],
          ["marcador", "Marcador das cartas"], ["catraca", "Roleta girando"], ["esp-congelou", "Congelou!"], ["esp-tudo", "Tudo ou Nada"], ["esp-dobro", "Em Dobro"], ["esp-tesoura", "Tesoura"],
          ["congelado", "Errou: congelou"], ["tudoperdido", "Errou: Tudo ou Nada"], ["moedas", "Acertou: Em Dobro"], ["poder", "Ganhou a Tesoura"], ["corte", "Tesoura cortando"], ["punicao", "Punição"], ["escapou", "Escapou!"]]
          .map(function (s) { return '<button class="pv-opcao" data-acao="ouvir" data-valor="' + s[0] + '">' + s[1] + '</button>'; }).join("") +
      '</div></fieldset>';
    if (dep) corpo += painelDepuracao();
    painel.innerHTML =
      '<button class="pv-botao' + (dep ? " pv-dep" : "") + '" data-acao="painel" aria-expanded="' + ui.painelAberto + '" aria-controls="pv-caixa">' +
        (dep ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M12 3v3M7.5 8.5A6 6 0 0 1 16.5 8.5L18 11v5a6 6 0 0 1-12 0v-5ZM3 12h3M18 12h3M3.5 18H6M18 18h2.5M12 11v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Depuração</span>'
             : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="10" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="16" cy="10" r="1.5"/></svg><span>Visual</span>') +
      '</button>' +
      (ui.painelAberto ? '<div class="pv-caixa' + (dep ? " pv-larga" : "") + '" id="pv-caixa" role="dialog" aria-label="Painel">' +
        '<p class="pv-titulo">' + (dep ? "Depuração" : "Visual") + '<button class="pv-fechar" data-acao="painel" aria-label="Fechar">×</button></p>' + corpo + '</div>' : '');
  }

  function painelDepuracao() {
    var e = E(), f = e.fase, j = e.jogada;
    var opEsp = [["", "—"], ["congelou", "Congelou"], ["tudo", "Tudo ou Nada"], ["dobro", "Em Dobro"], ["tesoura", "Tesoura"]];
    var h = '<fieldset class="pv-grupo"><legend>Cartas desta rodada</legend>' +
      '<label class="pv-check"><input type="checkbox" data-dep="ver-cartas"' + (ui.verCartas ? " checked" : "") + '> Mostrar valor e especial no verso</label>' +
      '<div class="dep-cartas">' + e.cartas.map(function (c, i) {
        return '<label class="dep-carta' + (c.usada ? " usada" : "") + (c.especial ? " tem" : "") + '"><span>' + c.n + ' · ' + c.valor + '</span>' +
          '<select data-dep="especial" data-indice="' + i + '"' + (c.usada || f !== "tabuleiro" ? " disabled" : "") + '>' +
          opEsp.map(function (o) { return '<option value="' + o[0] + '"' + ((c.especial || "") === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") +
          '</select></label>';
      }).join("") + '</div>' +
      '<p class="pv-nota">Especiais só mudam com o tabuleiro aberto. Cada rodada nova sorteia de novo.</p></fieldset>';

    h += '<fieldset class="pv-grupo"><legend>Forçar o próximo sorteio</legend>' +
      seletorDep("Roleta da Tesoura", "forcar-tesoura", e.forcar.tesoura, [["", "Aleatório"], ["1", "Elimina 1"], ["2", "Elimina 2"], ["3", "Elimina 3"]]) +
      seletorDep("Roleta de punição", "forcar-punicao", e.forcar.punicao, [["", "Aleatório"]].concat(R.FATIAS_PUNICAO.map(function (x) { return [x.id, x.nome]; }))) +
      seletorDep("Sorteio do passe", "forcar-passe", e.forcar.passe, [["", "Aleatório"]].concat(e.equipes.map(function (q, i) { return [String(i), q.nome]; }))) +
      '</fieldset>';

    h += '<fieldset class="pv-grupo"><legend>Equipes</legend>' + e.equipes.map(function (q, i) {
      return '<div class="dep-equipe" style="--cor-equipe:' + corHex(q.cor) + '">' +
        '<div class="dep-eq-topo">' + ficha(q) + '<b>' + esc(q.nome) + '</b><span class="dep-pontos">' + pontosTxt(e.pontos[i]) + '</span>' +
          '<button class="dep-mini" data-acao="dep-pontos" data-equipe="' + i + '" data-valor="-100">−100</button>' +
          '<button class="dep-mini" data-acao="dep-pontos" data-equipe="' + i + '" data-valor="100">+100</button></div>' +
        '<div class="dep-eq-marcas">' +
          togDep("semTurno", i, "Sem turno", e.semTurno[i] > 0) + togDep("tesoura", i, "Tesoura", e.tesoura[i]) +
          togDep("asCegas", i, "Às cegas", e.asCegas[i]) + togDep("contraRelogio", i, "10 s", e.contraRelogio[i]) +
          (f === "tabuleiro" ? '<button class="dep-mini" data-acao="dep-vez" data-equipe="' + i + '"' + (e.vez === i ? " disabled" : "") + '>Dar a vez</button>' : '') +
        '</div></div>';
    }).join("") + '</fieldset>';

    h += '<fieldset class="pv-grupo"><legend>Cronômetro e rodada</legend><div class="pv-opcoes pv-linha">' +
      '<button class="pv-opcao" data-acao="dep-esgotar"' + (f === "pergunta" ? "" : " disabled") + '>Esgotar o tempo</button>' +
      '<button class="pv-opcao" data-acao="dep-3s"' + (f === "pergunta" ? "" : " disabled") + '>Deixar 3 s</button>' +
      '<button class="pv-opcao" data-acao="dep-terminar"' + (f === "tabuleiro" ? "" : " disabled") + '>Terminar a rodada</button>' +
      '<button class="pv-opcao" data-acao="dep-ultima"' + (f === "tabuleiro" && e.rodada < e.rodadas ? "" : " disabled") + '>Pular para a última rodada</button>' +
      '<button class="pv-opcao" data-acao="dep-empatar">Empatar os dois primeiros</button>' +
      '</div>' +
      (j && f === "pergunta" ? '<p class="pv-nota">Resposta certa: <b>' + esc(motor.questao(j.q).alternativas[motor.questao(j.q).correta]) + '</b></p>' : '') +
      '</fieldset>';
    return h;
  }
  function seletorDep(rotulo, chave, atual, opcoes) {
    var v = atual === null || atual === undefined ? "" : String(atual);
    return '<label class="dep-sel"><span>' + rotulo + '</span><select data-dep="' + chave + '">' +
      opcoes.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? " selected" : "") + '>' + esc(o[1]) + '</option>'; }).join("") +
      '</select></label>';
  }
  function togDep(campo, i, rotulo, on) {
    return '<button class="dep-tog' + (on ? " on" : "") + '" aria-pressed="' + !!on + '" data-acao="dep-alternar" data-campo="' + campo + '" data-equipe="' + i + '">' + rotulo + '</button>';
  }

  /* ================= eventos ================= */
  function depois() { salvar(); desenhar(); }

  function fecharCriador() {
    var i = ui.criador;
    ui.criador = null;
    desenhar();
    var b = app.querySelector('.av-botao[data-equipe="' + i + '"]');
    if (b) b.focus({ preventScroll: true });
  }
  document.addEventListener("click", function (ev) {
    /* toque fora da janela do criador fecha */
    if (ev.target.matches && ev.target.matches("[data-acao-fundo]")) { fecharCriador(); return; }
    var b = ev.target.closest("[data-acao]");
    if (!b || b.disabled) return;
    var a = b.dataset.acao, v = b.dataset.valor;
    switch (a) {
      case "ir-inicio": tela = "inicio"; desenhar(); break;
      case "ir-config": tela = "config"; motor = null; limparUi(); salvar(); desenhar(); break;
      case "sair": tela = "inicio"; motor = null; limparUi(); salvar(); desenhar(); break;
      case "continuar-salva":
        motor = R.retomar(salvo, bancoDe(disciplinaSalva || config.disciplina, disciplinaSalva === "arena" ? "arena" : "sala")); salvo = null; tela = "jogo"; limparUi();
        if (!E().inicio) E().inicio = new Date().toISOString();
        if (E().jogada) E().jogada.pausado = true;
        if (E().fase === "roleta" && E().jogada.punicao) E().fase = "resultado";
        visual.tema = temaDaPartida();
        desenhar(); break;
      case "comecar": case "jogar-de-novo": comecarPartida(); break;
      case "escolher": config[b.dataset.campo] = v; corrigirEscolhas(); salvar(); desenhar(); break;
      case "ir-relatorio":
        if (motor) { salvar(); motor = null; }   // só abre da tela inicial ou do pódio final
        tela = "relatorio"; ui.relMsg = ""; ui.relApagar = false; limparUi(); desenhar(); window.scrollTo(0, 0);
        break;
      case "rel-filtro": ui[b.dataset.campo] = v; ui.relMsg = ""; desenhar(); break;
      case "rel-normais": ui.relNormais = !ui.relNormais; ui.relMsg = ""; desenhar(); break;
      case "rel-copiar": copiarRelatorio(); break;
      case "rel-baixar": baixarRelatorio(); break;
      case "rel-tirar": tirarPartida(v); desenhar(); break;
      case "rel-apagar":
        if (!ui.relApagar) { ui.relApagar = true; desenhar(); break; }
        gravarRel({ v: 1, partidas: [] }); ultimoRelatorio = ""; ui.relApagar = false; ui.relMsg = "Relatório apagado neste aparelho."; desenhar(); break;
      case "rel-cancelar": ui.relApagar = false; desenhar(); break;
      case "escolher-num": config[b.dataset.campo] = Number(v); salvar(); desenhar(); break;
      case "alternar-dep": config.depuracao = !config.depuracao; salvar(); desenhar(); break;
      case "chances-padrao":
        config.chancesTesoura = R.FATIAS_TESOURA.map(function (f) { return f.chance; });
        config.chancesPunicao = chancesPadraoPunicao(); salvar(); desenhar();
        var d = app.querySelector("details.chances"); if (d) d.open = true; break;
      case "rodadas": config.rodadas = Math.min(5, Math.max(1, config.rodadas + Number(v))); salvar(); desenhar(); break;
      case "n-equipes": config.nEquipes = Math.min(6, Math.max(2, config.nEquipes + Number(v))); corrigirCores(); salvar(); desenhar(); break;
      case "cor": config.equipes[Number(b.dataset.equipe)].cor = v; salvar(); desenhar(); break;
      case "forma": config.equipes[Number(b.dataset.equipe)].forma = v; salvar(); desenhar(); break;
      case "tempo-extra": config.equipes[Number(b.dataset.equipe)].tempoExtra = Number(v) || 0; salvar(); desenhar(); break;
      case "abrir-criador": ui.criador = Number(b.dataset.equipe); ui.criadorEstado = "parado"; ui.criadorFoco = b.dataset.equipe; desenhar(); break;
      case "fechar-criador": fecharCriador(); break;
      case "criador-equipe": ui.criador = Number(v); desenhar(); break;
      case "criador-aba": ui.criadorAba = v; desenhar(); break;
      case "criador-estado": ui.criadorEstado = v; desenhar(); break;
      case "av-base": mudarAvatar("base", v); desenhar(); break;
      case "av-expr": mudarAvatar("expr", v); ui.criadorEstado = "parado"; desenhar(); break;
      case "av-acess": mudarAvatar("acess", v); desenhar(); break;
      case "av-tom": mudarAvatar("tom", v); desenhar(); break;
      case "av-estilo": mudarAvatar("estilo", v); desenhar(); break;
      case "av-aleatorio": config.equipes[ui.criador].avatar = AV.aleatorio(config.equipes[ui.criador].avatar); salvar(); desenhar(); break;
      case "sortear-avatares": equipesConfig().forEach(function (e) { e.avatar = AV.aleatorio(e.avatar); }); salvar(); desenhar(); break;
      case "turma-salvar": salvarTurma(); desenhar(); break;
      case "turma-carregar": usarTurma(); salvar(); desenhar(); break;
      case "turma-excluir": excluirTurma(); desenhar(); break;

      case "carta": abrirCarta(Number(b.dataset.indice)); break;
      case "sortear": sortearComMarcador(); break;
      case "pular-anim": ui.animado = chaveAnim(); desenhar(); break;
      case "encerrar":
        if (window.confirm("Encerrar a partida agora e ir para o pódio?")) { motor.encerrar(); depois(); }
        break;
      case "fechar-especial": fecharEspecial(); break;
      case "placar-toggle": ui.placarAberto = !ui.placarAberto; b.closest(".placar").classList.toggle("aberto", ui.placarAberto); b.setAttribute("aria-expanded", ui.placarAberto); break;

      case "responder": if (motor.responder(Number(b.dataset.orig)) !== null) somDaResposta(); depois(); break;
      case "ir-roleta": ui.revelacaoVista = true; desenhar(); break;
      case "passar": motor.passar(); depois(); break;
      case "pausar": pausar(); break;
      case "tesoura": usarTesoura(); break;
      case "fechar-giro": ui.giro = null; desenhar(); break;
      case "concluir": motor.concluirJogada(); ui.revelacaoVista = false; depois(); break;
      case "desfazer": desfazer(); break;

      case "abrir-passe": motor.abrirPasse(); som("passe"); depois(); break;
      case "sortear-passe": sortearPasse(); break;
      case "aceitar-passe": ui.giro = null; ui.revelacaoVista = false; motor.aceitarPasse(); depois(); break;
      case "recusar-passe": ui.giro = null; motor.recusarPasse(); depois(); break;
      case "girar-punicao": girarPunicao(); break;
      case "fechar-punicao": ui.giro = null; ui.telaForcada = null; desenhar(); break;

      case "avancar-rodada": motor.avancarDoFimDeRodada(); depois(); break;
      case "proxima-morte": motor.proximaMorte(); depois(); break;

      case "painel": abrirPainel(!ui.painelAberto); break;
      case "visual":
        visual[b.dataset.campo] = v; salvar();
        /* trocar o tema muda o desenho da tela; modo, fonte e som só trocam variáveis */
        if ((b.dataset.campo === "tema" || tela === "config") && !ui.sorteando && ui.revelando === null && !ui.giro) desenhar();
        else {
          aplicarVisual(telaAtual()); desenharPainel(); trocarBotaoSom();
          if (b.dataset.campo === "legenda" && telaAtual() === "pergunta") marcarPalavra(app.querySelector(".enunciado"), VOZ.palavraAtual(chaveLeitura()));
        }
        if (b.dataset.campo === "som" && v === "sim") som("foco");
        break;
      case "som": alternarSom(); break;
      case "fonte-tema":
        visual.fontes[b.dataset.tema] = v; salvar(); aplicarVisual(telaAtual()); desenharPainel();
        if (tela === "config") desenhar();
        break;
      case "ler": if (telaAtual() === "pergunta") { VOZ.configurar({ ligada: true }); lerPergunta(chaveLeitura()); VOZ.configurar({ ligada: visual.voz === "sim" }); } break;
      case "testar-voz":
        VOZ.configurar({ ligada: true });
        VOZ.ler([FRASE_TESTE], "teste");
        VOZ.configurar({ ligada: visual.voz === "sim" });
        break;
      case "ouvir": SONS.ligar(true); som(v); SONS.ligar(visual.som === "sim"); break;

      /* depuração */
      case "dep-pontos": motor.dep.somarPontos(Number(b.dataset.equipe), Number(v)); depoisDep(); break;
      case "dep-alternar": motor.dep.alternar(b.dataset.campo, Number(b.dataset.equipe)); depoisDep(); break;
      case "dep-vez": motor.dep.definirVez(Number(b.dataset.equipe)); depoisDep(); break;
      case "dep-esgotar": if (E().fase === "pergunta") { E().jogada.restante = 0.05; E().jogada.pausado = false; } break;
      case "dep-3s": if (E().fase === "pergunta") { E().jogada.restante = Math.min(3, E().jogada.restante); E().jogada.pausado = false; desenhar(); } break;
      case "dep-terminar": motor.dep.terminarRodada(); depoisDep(); break;
      case "dep-ultima": motor.dep.irParaUltimaRodada(); depoisDep(); break;
      case "dep-empatar": motor.dep.empatarTopo(); depoisDep(); break;
    }
  });
  function depoisDep() { salvar(); desenhar(); }
  /* som do acerto ou do erro, logo depois de o motor julgar a resposta */
  function somDaResposta() {
    var e = E(), j = e.jogada, r = j && j.resultado, esp = j && j.etapa === "principal" ? j.especial : null;
    if (e.fase === "roleta" || (r && r.tipo === "erro")) {
      som("errar");
      if (e.fase !== "roleta") somDaArmadilha(esp, 450);
    } else if (r && r.tipo === "acerto") {
      som(esp === "dobro" ? "moedas" : "acertar");
      if (esp === "tesoura") setTimeout(function () { som("poder"); }, 600);
    }
  }
  /* errou (ou o tempo acabou) numa armadilha: o castigo tem som próprio */
  function somDaArmadilha(esp, atraso) {
    if (esp === "congelou" || esp === "tudo") setTimeout(function () { som(esp === "congelou" ? "congelado" : "tudoperdido"); }, atraso);
  }

  function desfazer() {
    if (!motor || !motor.podeDesfazer()) return;
    limparUi();
    motor.desfazer();
    if (E().fase === "roleta" && E().jogada.punicao) E().fase = "resultado";
    depois();
  }

  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.matches && t.matches("select[data-turma-escolha]")) { ui.turmaEscolhida = t.value; return; }
    if (t.matches && t.matches("select[data-voz-nome]")) { visual.vozNome = t.value; salvar(); aplicarVisual(telaAtual()); return; }
    if (t.dataset.dep === "ver-cartas") { ui.verCartas = t.checked; desenhar(); return; }
    if (t.dataset.dep === "especial") { motor.dep.definirEspecial(Number(t.dataset.indice), t.value || null); depoisDep(); return; }
    if (t.dataset.dep === "forcar-tesoura") { motor.dep.forcar("tesoura", t.value ? Number(t.value) : null); salvar(); return; }
    if (t.dataset.dep === "forcar-punicao") { motor.dep.forcar("punicao", t.value || null); salvar(); return; }
    if (t.dataset.dep === "forcar-passe") { motor.dep.forcar("passe", t.value === "" ? null : Number(t.value)); salvar(); return; }
    if (t.dataset.chance) {
      var val = Math.max(0, Math.min(100, Math.round(Number(t.value) || 0)));
      if (t.dataset.chance === "tesoura") config.chancesTesoura[Number(t.dataset.chave)] = val;
      else config.chancesPunicao[t.dataset.chave] = val;
      salvar(); desenhar();
      var d = app.querySelector("details.chances"); if (d) d.open = true;
    }
  });

  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.matches("input[data-turma-nome]")) { ui.turmaNome = t.value; return; }
    if (t.matches("input[data-grito]")) {
      config.equipes[Number(t.dataset.grito)].grito = t.value.slice(0, GRITO_MAX).replace(/\s+/g, " ").replace(/^\s/, "");
      salvar();
      return;
    }
    if (t.matches("input[data-equipe]")) {
      config.equipes[Number(t.dataset.equipe)].nome = t.value.trim() || ("Equipe " + (Number(t.dataset.equipe) + 1));
      salvar();
    }
  });

  /* duas equipes não ficam com a mesma cor */
  function corrigirCores() {
    var usadas = {};
    equipesConfig().forEach(function (e) {
      if (usadas[e.cor]) for (var k = 0; k < D.cores.length; k++) if (!usadas[D.cores[k].id]) { e.cor = D.cores[k].id; break; }
      usadas[e.cor] = true;
    });
  }

  /* teclado: A–D ou 1–4 respondem (também as letras ocultas), espaço pausa, P passa, T usa a Tesoura, Ctrl+Z desfaz */
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && tela === "config" && ui.criador !== null) { ev.preventDefault(); fecharCriador(); return; }
    if (ev.target.matches("input, textarea, select")) return;
    if (ev.key === "Escape" && ui.painelAberto) { abrirPainel(false); return; }
    /* V abre e fecha o painel com o visual e a acessibilidade, em qualquer tela */
    if (ev.key.toLowerCase() === "v" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !(tela === "config" && ui.criador !== null)) { ev.preventDefault(); abrirPainel(!ui.painelAberto); return; }
    if (!motor || tela !== "jogo") return;
    /* setas andam pelas cartas do tabuleiro (Enter ou espaço abre a carta em foco) */
    if (/^Arrow/.test(ev.key) && telaAtual() === "tabuleiro" && !ui.sorteando && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      var cartas = Array.prototype.slice.call(app.querySelectorAll("button.carta:not(:disabled)"));
      if (cartas.length) {
        ev.preventDefault();
        var atualC = cartas.indexOf(document.activeElement);
        if (atualC < 0) { cartas[0].focus(); return; }
        /* colunas = cartas na mesma linha da primeira */
        var pr = cartas[atualC].getBoundingClientRect(), alvoC = null;
        if (ev.key === "ArrowRight") alvoC = cartas[Math.min(cartas.length - 1, atualC + 1)];
        else if (ev.key === "ArrowLeft") alvoC = cartas[Math.max(0, atualC - 1)];
        else {
          /* para cima ou para baixo: a carta mais próxima na linha vizinha (cartas usadas não recebem foco) */
          var desce = ev.key === "ArrowDown", melhor = Infinity;
          cartas.forEach(function (c) {
            var r2 = c.getBoundingClientRect(), dy = r2.top - pr.top;
            if (desce ? dy < 4 : dy > -4) return;
            var d = Math.abs(dy) * 4 + Math.abs(r2.left - pr.left);
            if (d < melhor) { melhor = d; alvoC = c; }
          });
        }
        if (alvoC) alvoC.focus();
        return;
      }
    }
    if (ev.key.toLowerCase() === "m" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { alternarSom(); return; }
    if (ev.key.toLowerCase() === "l" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && telaAtual() === "pergunta") { ev.preventDefault(); VOZ.configurar({ ligada: true }); lerPergunta(chaveLeitura()); VOZ.configurar({ ligada: visual.voz === "sim" }); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); desfazer(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ui.especial && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); fecharEspecial(); return; }
    if (telaAtual() !== "pergunta" || ui.giro || ui.especial) return;
    var j = E().jogada, k = ev.key.toLowerCase();
    var pos = "abcd".indexOf(k); if (pos < 0) pos = "1234".indexOf(k);
    var lista = j.aberta ? j.ordemOculta : j.ordem;
    if (pos >= 0 && k.length === 1 && pos < lista.length) { ev.preventDefault(); if (motor.responder(lista[pos]) !== null) { somDaResposta(); depois(); } return; }
    if (k === "p" && j.etapa === "principal") { ev.preventDefault(); if (motor.passar()) depois(); }
    else if (k === "t" && motor.podeUsarTesoura()) { ev.preventDefault(); usarTesoura(); }
    else if (k === " " && !ev.target.matches("button")) { ev.preventDefault(); pausar(); }
  });

  /* ---------- início ---------- */
  carregar();
  corrigirCores();
  desenhar();
  carregarTudo().then(function () {
    if (salvo) {
      try { R.retomar(salvo, bancoDe(disciplinaSalva || config.disciplina, disciplinaSalva === "arena" ? "arena" : "sala")); } catch (e) { salvo = null; }
    }
    desenhar();
  });
})();
