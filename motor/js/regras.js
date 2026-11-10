/* Duelo de Saberes 2.0 · Motor de regras (Fase 4)
   Só regras e estado, sem nenhuma tela. A interface (app.js) chama as funções abaixo
   e desenha conforme estado.fase. O mesmo arquivo roda nos testes automáticos (testes.html e Node).

   Fases: tabuleiro → pergunta → resultado → (passe → pergunta de passe → roleta) → resultado → tabuleiro
          ... → fim-rodada → (próxima rodada | morte-subita | fim)

   Decisões do plano e as aprovadas no chat "02 Motor" (09/11/2026):
   - errou com alternativas: perde 50% e a questão vai ao passe; passar e tempo esgotado: passe sem perda;
   - armadilha: Passar bloqueado, tempo esgotado conta como erro, errou vai ao passe pelo valor normal;
   - Em Dobro: vale o dobro; alternativas somem aos 10 s ou ao fim da leitura (o que vier depois);
     errou perde 50% do valor normal; no passe vale o valor normal + 50%;
   - Às cegas: alternativas visíveis só nos primeiros 5 s;
   - alternativas ocultas (Às cegas depois dos 5 s, Em Dobro depois dos 10 s e passe): ficam só as letras, sorteadas
     de novo; a equipe escolhe uma, o conteúdo é revelado e o app julga sozinho (pedido de 09/11/2026);
   - passe aceito: alternativas ocultas, 10 s; tempo esgotado = erro → roleta de punição;
   - Tesoura: uso único, no máximo uma por equipe, qualquer carta com alternativas visíveis;
   - Ajuda ao lanterna: quem errou perde metade e a lanterna ganha essa metade
     (lanterna empatada: a primeira na ordem das equipes);
   - morte súbita: questões de 500, sem passe e sem especiais, não muda o placar.
   Fase 10 (piloto em sala, 10/11/2026):
   - cada jogada concluída entra em estado.registro (questão, saída da equipe da vez e saída do passe),
     para o relatório de acertos; como fica no estado, o Desfazer também desfaz o registro;
   - nível só pode ser escolhido com banco completo: 20 questões de cada valor em cada série do nível
     (5 rodadas × 4 cartas, o mínimo do plano para lançar); ver niveisDisponiveis;
   - morte súbita evita as questões de 500 já usadas na partida; se todas já saíram, usa a vista há mais tempo. */

(function (raiz) {
  "use strict";

  var VALORES = [100, 200, 300, 400, 500];

  var ESPECIAIS = {
    congelou:  { nome: "Congelou!",   tipo: "armadilha", porRodada: 1 },
    tudo:      { nome: "Tudo ou Nada", tipo: "armadilha", porRodada: 2 },
    dobro:     { nome: "Em Dobro",    tipo: "bonus",     porRodada: 2 },
    tesoura:   { nome: "Tesoura",     tipo: "bonus",     porRodada: 1 }
  };

  var FATIAS_TESOURA = [
    { id: 1, nome: "Elimina 1", chance: 50 },
    { id: 2, nome: "Elimina 2", chance: 35 },
    { id: 3, nome: "Elimina 3", chance: 15 }
  ];

  var FATIAS_PUNICAO = [
    { id: "perde-tudo",   nome: "Perde tudo",        chance: 25, texto: "Perde o valor da carta" },
    { id: "meio",         nome: "Meio estrago",      chance: 20, texto: "Perde metade do valor da carta" },
    { id: "fora",         nome: "Fora da jogada",    chance: 15, texto: "Pula o próximo turno" },
    { id: "lanterna",     nome: "Ajuda ao lanterna", chance: 10, texto: "Doa metade do valor para a equipe em último lugar" },
    { id: "cegas",        nome: "Às cegas",          chance: 10, texto: "Na próxima questão da equipe, as alternativas aparecem só por 5 s" },
    { id: "relogio",      nome: "Contra o relógio",  chance: 10, texto: "A próxima questão da equipe tem só 10 s" },
    { id: "sem-poderes",  nome: "Sem poderes",       chance: 5,  texto: "Perde a Tesoura guardada; se não tiver, perde metade do valor" },
    { id: "escapou",      nome: "Escapou!",          chance: 5,  texto: "Nada acontece" }
  ];

  var NIVEIS = {
    calouro:   { 1: 100 },
    estudioso: { 1: 35, 2: 65 },
    veterano:  { 1: 20, 2: 30, 3: 50 }
  };

  var TEMPO_PASSE = 10;          // segundos da pergunta de passe
  var TEMPO_RELOGIO = 10;        // "Contra o relógio"
  var CEGAS_SOMEM = 5;           // Às cegas: alternativas aparecem só por 5 s (pedido de 09/11/2026)
  var DOBRO_SOMEM = 10;          // Em Dobro: alternativas somem aos 10 s...
  var CARACTERES_POR_SEGUNDO = 14; // ...ou ao fim da leitura estimada (voz real chega na Fase 7)
  var LIMITE_DESFAZER = 80;
  var MAX_RODADAS = 5;
  var CARTAS_POR_VALOR = 4;
  var MINIMO_POR_VALOR = MAX_RODADAS * CARTAS_POR_VALOR; // 20: uma partida completa sem repetir

  /* nível disponível = cada série do nível tem pelo menos 20 questões de cada valor */
  function contarBanco(banco) {
    var c = {};
    (banco || []).forEach(function (x) {
      var k = x.serie + "|" + x.valor;
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }
  function nivelDisponivel(nivel, banco, contagem) {
    var pesos = NIVEIS[nivel];
    if (!pesos) return false;
    var c = contagem || contarBanco(banco);
    return Object.keys(pesos).every(function (s) {
      if (!(pesos[s] > 0)) return true;
      return VALORES.every(function (v) { return (c[s + "|" + v] || 0) >= MINIMO_POR_VALOR; });
    });
  }
  function niveisDisponiveis(banco) {
    var c = contarBanco(banco), r = {};
    Object.keys(NIVEIS).forEach(function (n) { r[n] = nivelDisponivel(n, banco, c); });
    return r;
  }

  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  /* sorteio ponderado: lista de {chance} → índice */
  function sortearPeso(lista, rng) {
    var total = 0, i;
    for (i = 0; i < lista.length; i++) total += Math.max(0, Number(lista[i].chance) || 0);
    if (total <= 0) return Math.floor(rng() * lista.length);
    var r = rng() * total;
    for (i = 0; i < lista.length; i++) {
      r -= Math.max(0, Number(lista[i].chance) || 0);
      if (r < 0) return i;
    }
    return lista.length - 1;
  }

  function embaralhar(a, rng) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function tempoLeitura(q) { return Math.ceil(Array.from(q.enunciado).length / CARACTERES_POR_SEGUNDO); }

  /* ================================================================
     Criação da partida
     cfg: { rodadas, nivel, equipes:[{nome,cor,forma,avatar,grito}], tempoExtraLeitura,
            chancesTesoura:[50,35,15], chancesPunicao:{id:chance}, recentes:[ids] }
     banco: lista de questões no formato do plano
     ================================================================ */
  function novaPartida(cfg, banco, rng) {
    rng = rng || Math.random;
    var n = cfg.equipes.length;
    var estado = {
      versao: 1,
      id: cfg.id || novoId(rng),
      inicio: cfg.inicio || null,
      fase: "tabuleiro",
      rodada: 1,
      rodadas: cfg.rodadas || 1,
      nivel: cfg.nivel || "calouro",
      tempoExtraLeitura: cfg.tempoExtraLeitura || 0,
      /* avatar e grito de guerra vão junto (Fase 6); o motor não usa, só guarda para a interface */
      equipes: cfg.equipes.map(function (e) { return { nome: e.nome, cor: e.cor, forma: e.forma, avatar: e.avatar ? JSON.parse(JSON.stringify(e.avatar)) : null, grito: e.grito || "", tempoExtra: extraValido(e.tempoExtra) }; }),
      pontos: zeros(n),
      semTurno: zeros(n),       // quantos turnos a equipe ainda vai pular
      tesoura: falsos(n),       // poder guardado
      asCegas: falsos(n),       // próxima questão sem alternativas
      contraRelogio: falsos(n), // próxima questão com 10 s
      vez: 0,
      cartas: [],
      jogada: null,
      avisos: [],               // mensagens para a tela do tabuleiro (equipes que pularam o turno)
      trajetoria: [zeros(n)],   // placar depois de cada carta
      marcosRodada: [0],        // índice da trajetória onde cada rodada começa
      placarInicioRodada: zeros(n),
      usadas: (cfg.recentes || []).slice(-200),
      chancesTesoura: (cfg.chancesTesoura || FATIAS_TESOURA.map(function (f) { return f.chance; })).slice(),
      chancesPunicao: FATIAS_PUNICAO.map(function (f) {
        var c = cfg.chancesPunicao && cfg.chancesPunicao[f.id];
        return (c === undefined || c === null) ? f.chance : Number(c);
      }),
      forcar: { tesoura: null, punicao: null, passe: null },
      morte: null,
      vencedor: null,
      registro: []              // Fase 10: uma linha por jogada concluída (relatório de acertos)
    };
    var m = criarMotor(estado, banco, rng);
    m._montarRodada();
    m.pilha = [];
    return m;
  }

  /* tempo extra por equipe (Fase 7): 0, 5, 10 ou 15 s em todas as perguntas da equipe,
     inclusive no passe e na morte súbita; não vale no Contra o relógio */
  var EXTRAS_EQUIPE = [0, 5, 10, 15];
  function extraValido(x) { x = Number(x) || 0; return EXTRAS_EQUIPE.indexOf(x) >= 0 ? x : 0; }

  function novoId(rng) { return "p" + Date.now().toString(36) + Math.floor((rng || Math.random)() * 1e6).toString(36); }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function falsos(n) { var a = []; for (var i = 0; i < n; i++) a.push(false); return a; }

  /* recupera uma partida salva (estado em JSON) */
  function retomar(estado, banco, rng) {
    var m = criarMotor(estado, banco, rng || Math.random);
    m.pilha = [];
    return m;
  }

  /* ================================================================ */
  function criarMotor(estado, banco, rng) {
    var m = { estado: estado, banco: banco, rng: rng, pilha: [] };
    if (!Array.isArray(estado.registro)) estado.registro = [];   // partidas salvas antes da Fase 10
    if (!estado.id) estado.id = novoId(rng);
    var E = function () { return m.estado; };

    function n() { return E().equipes.length; }
    function q(id) { for (var i = 0; i < m.banco.length; i++) if (m.banco[i].id === id) return m.banco[i]; return null; }
    m.questao = q;
    function extraEquipe(i) { var eq = E().equipes[i]; return eq ? extraValido(eq.tempoExtra) : 0; }
    m.extraEquipe = extraEquipe;

    /* ---------- desfazer ---------- */
    function guardar() {
      m.pilha.push(JSON.stringify(m.estado));
      if (m.pilha.length > LIMITE_DESFAZER) m.pilha.shift();
    }
    m.podeDesfazer = function () { return m.pilha.length > 0; };
    m.desfazer = function () {
      if (!m.pilha.length) return false;
      m.estado = JSON.parse(m.pilha.pop());
      if (m.estado.jogada) m.estado.jogada.pausado = true; // volta com o cronômetro parado
      return true;
    };

    /* ---------- montagem da rodada ---------- */
    function escolherQuestoes(valor, quantas, usadasNaPartida) {
      var pesos = NIVEIS[E().nivel] || NIVEIS.calouro;
      var doValor = m.banco.filter(function (x) { return x.valor === valor; });
      var escolhidas = [];
      for (var k = 0; k < quantas; k++) {
        /* série sorteada pela proporção do nível; se faltar questão dela, usa qualquer série */
        var series = Object.keys(pesos).map(function (s) { return { s: Number(s), chance: pesos[s] }; });
        var serie = series[sortearPeso(series, m.rng)].s;
        var candidatas = doValor.filter(function (x) { return x.serie === serie && escolhidas.indexOf(x.id) < 0; });
        if (!candidatas.length) candidatas = doValor.filter(function (x) { return escolhidas.indexOf(x.id) < 0; });
        if (!candidatas.length) candidatas = doValor.slice();
        if (!candidatas.length) throw new Error("O banco não tem questões de " + valor);
        /* evita repetir: primeiro as nunca usadas, depois as usadas há mais tempo */
        var usadas = E().usadas;
        var novas = candidatas.filter(function (x) { return usadas.indexOf(x.id) < 0 && usadasNaPartida.indexOf(x.id) < 0; });
        var escolha;
        if (novas.length) escolha = novas[Math.floor(m.rng() * novas.length)];
        else {
          candidatas.sort(function (a, b) { return posUso(a.id) - posUso(b.id); });
          escolha = candidatas[0];
        }
        escolhidas.push(escolha.id);
        usadasNaPartida.push(escolha.id);
      }
      return escolhidas;
      function posUso(id) { var p = E().usadas.lastIndexOf(id); return p; }
    }

    m._montarRodada = function () {
      var e = E();
      var usadasNaPartida = [];
      var porValor = {};
      VALORES.forEach(function (v) { porValor[v] = escolherQuestoes(v, 4, usadasNaPartida); });
      var valores = [];
      VALORES.forEach(function (v) { for (var i = 0; i < 4; i++) valores.push(v); });
      valores = embaralhar(valores, m.rng);
      var cont = {};
      e.cartas = valores.map(function (v, i) {
        cont[v] = (cont[v] || 0);
        var id = porValor[v][cont[v]++];
        return { n: i + 1, valor: v, q: id, especial: null, usada: false, resultado: null };
      });
      /* 6 especiais em posições sorteadas */
      var lista = [];
      Object.keys(ESPECIAIS).forEach(function (k) { for (var i = 0; i < ESPECIAIS[k].porRodada; i++) lista.push(k); });
      var pos = embaralhar(e.cartas.map(function (c, i) { return i; }), m.rng).slice(0, lista.length);
      pos.forEach(function (p, i) { e.cartas[p].especial = lista[i]; });
      usadasNaPartida.forEach(function (id) { e.usadas.push(id); });
      if (e.usadas.length > 300) e.usadas = e.usadas.slice(-300);
    };

    /* ---------- tabuleiro ---------- */
    m.cartasRestantes = function () { return E().cartas.filter(function (c) { return !c.usada; }).length; };

    m.abrirCarta = function (i) {
      var e = E();
      if (e.fase !== "tabuleiro") return null;
      var c = e.cartas[i];
      if (!c || c.usada) return null;
      guardar();
      var equipe = e.vez, questao = q(c.q);
      var cegas = e.asCegas[equipe], relogio = e.contraRelogio[equipe];
      e.asCegas[equipe] = false;
      e.contraRelogio[equipe] = false;
      var tempo = relogio ? TEMPO_RELOGIO : (questao.tempo || 20) + e.tempoExtraLeitura + extraEquipe(equipe);
      var esp = c.especial;
      e.avisos = [];
      e.jogada = {
        carta: i, q: c.q, valor: c.valor, especial: esp, equipe: equipe,
        etapa: "principal",
        ordem: embaralhar([0, 1, 2, 3], m.rng),
        eliminadas: [],
        aberta: false,                   // alternativas ocultas: só as letras aparecem
        ordemOculta: null,
        oculta: false,                   // a resposta foi dada por letra oculta
        cegas: !!cegas, relogio: !!relogio,
        tempoTotal: tempo, restante: tempo, pausado: false,
        /* Às cegas: alternativas só por 5 s; Em Dobro: aos 10 s ou no fim da leitura */
        somemEm: cegas ? CEGAS_SOMEM : esp === "dobro" ? Math.max(DOBRO_SOMEM, tempoLeitura(questao)) : null,
        tesouraUsada: false, giroTesoura: null,
        passe: null, punicao: null, resultado: null,
        perdaPrincipal: 0
      };
      e.fase = "pergunta";
      return e.jogada;
    };

    /* ---------- regras de valor ---------- */
    function ehArmadilha(j) { return j.etapa === "principal" && (j.especial === "congelou" || j.especial === "tudo"); }
    m.passarBloqueado = function () { var j = E().jogada; return !!j && (ehArmadilha(j) || j.etapa !== "principal"); };
    m.ehArmadilha = function () { var j = E().jogada; return !!j && ehArmadilha(j); };
    m.podeUsarTesoura = function () {
      var e = E(), j = e.jogada;
      return !!j && e.fase === "pergunta" && j.etapa === "principal" && !j.aberta && !j.tesouraUsada &&
        e.tesoura[j.equipe] && j.resultado === null;
    };
    m.valorAcerto = function () {
      var j = E().jogada;
      if (j.etapa === "passe") return j.valor * 1.5;
      if (j.etapa === "morte") return 0;
      return j.especial === "dobro" ? j.valor * 2 : j.valor;
    };

    /* ---------- Tesoura ---------- */
    m.usarTesoura = function () {
      if (!m.podeUsarTesoura()) return null;
      var e = E(), j = e.jogada;
      guardar();
      var nElim;
      if (e.forcar.tesoura) { nElim = e.forcar.tesoura; e.forcar.tesoura = null; }
      else {
        var lista = FATIAS_TESOURA.map(function (f, i) { return { chance: e.chancesTesoura[i] }; });
        nElim = FATIAS_TESOURA[sortearPeso(lista, m.rng)].id;
      }
      var questao = q(j.q);
      var erradas = embaralhar([0, 1, 2, 3].filter(function (k) { return k !== questao.correta; }), m.rng);
      j.eliminadas = erradas.slice(0, nElim);
      j.tesouraUsada = true;
      j.giroTesoura = nElim;
      e.tesoura[j.equipe] = false;
      return nElim;
    };

    /* Em Dobro: a tela avisa quando as alternativas devem sumir */
    m.esconderAlternativas = function () {
      var j = E().jogada;
      if (!j || j.aberta || E().fase !== "pergunta") return;
      j.aberta = true;
      j.sumiram = true;
      /* as letras são sorteadas de novo: vale lembrar o conteúdo, não a posição */
      j.ordemOculta = embaralhar([0, 1, 2, 3].filter(function (k) { return j.eliminadas.indexOf(k) < 0; }), m.rng);
    };

    /* ---------- respostas ---------- */
    /* indice = posição original (0–3) da alternativa na questão.
       Com alternativas ocultas, a equipe escolhe uma das letras sorteadas e o conteúdo é revelado depois. */
    m.responder = function (indice) {
      var e = E(), j = e.jogada;
      if (!j || e.fase !== "pergunta") return null;
      if (j.aberta) { if (!j.ordemOculta || j.ordemOculta.indexOf(indice) < 0) return null; }
      else if (j.eliminadas.indexOf(indice) >= 0) return null;
      guardar();
      j.oculta = !!j.aberta;
      return julgar(indice === q(j.q).correta, indice);
    };
    m.passar = function () {
      var e = E(), j = e.jogada;
      if (!j || e.fase !== "pergunta" || m.passarBloqueado()) return null;
      guardar();
      return irParaPasse("passou");
    };
    m.tempoEsgotado = function () {
      var e = E(), j = e.jogada;
      if (!j || e.fase !== "pergunta") return null;
      guardar();
      j.restante = 0;
      if (j.etapa === "principal" && !ehArmadilha(j)) return irParaPasse("tempo");
      return julgar(false, null, true); // armadilha, passe e morte súbita: tempo esgotado conta como erro
    };

    function julgar(acertou, escolhida, porTempo) {
      var e = E(), j = e.jogada, c = e.cartas[j.carta];
      j.escolhida = escolhida;
      j.porTempo = !!porTempo;

      if (j.etapa === "morte") return julgarMorte(acertou);

      if (j.etapa === "passe") {
        var receb = j.passe.equipe;
        j.saidaPasse = acertou ? "acerto" : (porTempo ? "tempo" : "erro");
        if (acertou) {
          var ganho = j.valor * 1.5;
          e.pontos[receb] += ganho;
          c.resultado = "passe-acerto";
          j.resultado = { tipo: "acerto", titulo: "Acertou no passe!", delta: ganho, equipe: receb, revelar: true,
            texto: "Valor da carta mais 50%." };
          e.fase = "resultado";
        } else {
          c.resultado = "passe-erro";
          j.resultado = null;
          e.fase = "roleta";
        }
        return { acertou: acertou };
      }

      /* etapa principal */
      var eq = j.equipe, v = j.valor;
      if (acertou) {
        var ganhoP = m.valorAcerto();
        e.pontos[eq] += ganhoP;
        c.resultado = "acerto";
        var extra = "";
        if (j.especial === "tesoura") {
          if (!e.tesoura[eq]) { e.tesoura[eq] = true; extra = "A equipe guardou a Tesoura."; }
          else extra = "A equipe já tinha uma Tesoura guardada.";
        }
        j.saida = "acerto";
        j.resultado = { tipo: "acerto", titulo: j.especial === "dobro" ? "Acertou em dobro!" : "Acertou!",
          delta: ganhoP, equipe: eq, revelar: true, texto: extra, ganhouTesoura: extra.indexOf("guardou") >= 0 };
        e.fase = "resultado";
        return { acertou: true };
      }

      var perda = j.especial === "tudo" ? v : v / 2;
      e.pontos[eq] -= perda;
      j.perdaPrincipal = perda;
      var texto = "";
      if (j.especial === "congelou") { e.semTurno[eq] += 1; texto = "Congelou: a equipe pula o próximo turno."; }
      if (j.especial === "tudo") texto = "Tudo ou Nada: perdeu o valor inteiro da carta.";
      c.resultado = "erro";
      j.saida = porTempo ? "tempo" : "erro";
      j.resultado = { tipo: "erro", titulo: porTempo ? "Tempo esgotado" : "Errou", delta: -perda, equipe: eq,
        revelar: false, texto: texto, vaiParaPasse: true };
      e.fase = "resultado";
      return { acertou: false };
    }

    function irParaPasse(motivo) {
      var e = E(), j = e.jogada;
      e.cartas[j.carta].resultado = "passe";
      j.saida = motivo === "tempo" ? "tempo" : "passou";
      j.resultado = { tipo: "passe", titulo: motivo === "tempo" ? "Tempo esgotado" : "Passou a vez", delta: null,
        equipe: j.equipe, revelar: false, texto: "Ninguém perde pontos.", vaiParaPasse: true };
      e.fase = "resultado";
      return { passe: true };
    }

    /* ---------- passe ---------- */
    m.elegiveisPasse = function () {
      var e = E(), j = e.jogada, lista = [];
      for (var i = 0; i < n(); i++) if (i !== j.equipe && e.semTurno[i] === 0) lista.push(i);
      return lista;
    };

    /* chamado no botão "Ir para o passe" da tela de resultado */
    m.abrirPasse = function () {
      var e = E(), j = e.jogada;
      if (e.fase !== "resultado" || !j.resultado || !j.resultado.vaiParaPasse) return null;
      guardar();
      var eleg = m.elegiveisPasse();
      j.passe = { elegiveis: eleg, equipe: null, precisaSorteio: eleg.length > 1, sorteado: false };
      if (eleg.length === 1) j.passe.equipe = eleg[0];
      if (eleg.length === 0) {
        j.saidaPasse = "ninguem";
        e.cartas[j.carta].resultado = e.cartas[j.carta].resultado || "passe";
        j.resultado = { tipo: "passe", titulo: "Ninguém pode receber", delta: null, equipe: null, revelar: true,
          texto: "Todas as outras equipes estão sem turno. A carta sai do tabuleiro." };
        e.fase = "resultado";
        return j.passe;
      }
      e.fase = "passe";
      return j.passe;
    };

    m.sortearPasse = function () {
      var e = E(), j = e.jogada;
      if (e.fase !== "passe" || !j.passe.precisaSorteio || j.passe.sorteado) return null;
      guardar();
      var eleg = j.passe.elegiveis, escolhida;
      if (e.forcar.passe !== null && e.forcar.passe !== undefined && eleg.indexOf(e.forcar.passe) >= 0) {
        escolhida = e.forcar.passe;
      } else escolhida = eleg[Math.floor(m.rng() * eleg.length)];
      e.forcar.passe = null;
      j.passe.equipe = escolhida;
      j.passe.sorteado = true;
      return escolhida;
    };

    m.recusarPasse = function () {
      var e = E(), j = e.jogada;
      if (e.fase !== "passe" || j.passe.equipe === null) return null;
      guardar();
      e.cartas[j.carta].resultado = e.cartas[j.carta].resultado === "erro" ? "erro" : "passe";
      j.resultado = { tipo: "passe", titulo: "Passe recusado", delta: null, equipe: j.passe.equipe, revelar: true,
        texto: "Ninguém pontua e a carta sai do tabuleiro." };
      j.passe.recusado = true;
      j.saidaPasse = "recusado";
      e.fase = "resultado";
      return true;
    };

    m.aceitarPasse = function () {
      var e = E(), j = e.jogada;
      if (e.fase !== "passe" || j.passe.equipe === null) return null;
      guardar();
      j.ocultaPrincipal = !!j.oculta;
      j.etapa = "passe";
      j.aberta = true;
      j.eliminadas = [];
      j.ordemOculta = embaralhar([0, 1, 2, 3], m.rng);
      j.oculta = false;
      j.escolhida = null;
      j.tempoTotal = TEMPO_PASSE + extraEquipe(j.passe.equipe);
      j.restante = j.tempoTotal;
      j.pausado = false;
      j.somemEm = null;
      j.resultado = null;
      j.passe.aceito = true;
      e.fase = "pergunta";
      return true;
    };

    /* ---------- roleta de punição ---------- */
    m.fatiasPunicao = function () {
      return FATIAS_PUNICAO.map(function (f, i) { return { id: f.id, nome: f.nome, texto: f.texto, chance: E().chancesPunicao[i] }; });
    };
    m.girarPunicao = function () {
      var e = E(), j = e.jogada;
      if (e.fase !== "roleta" || j.punicao) return null;
      guardar();
      var fatias = m.fatiasPunicao(), idx;
      if (e.forcar.punicao) {
        idx = fatias.map(function (f) { return f.id; }).indexOf(e.forcar.punicao);
        e.forcar.punicao = null;
      }
      if (idx === undefined || idx < 0) idx = sortearPeso(fatias, m.rng);
      var fatia = fatias[idx], eq = j.passe.equipe, v = j.valor, metade = v / 2;
      var efeito = { fatia: fatia.id, nome: fatia.nome, indice: idx, delta: 0, texto: "", virou: null, beneficiada: null };

      /* "Ajuda ao lanterna" vira "Meio estrago" se quem errou já é a lanterna */
      if (fatia.id === "lanterna") {
        var menor = Math.min.apply(null, e.pontos);
        if (e.pontos[eq] === menor) { efeito.virou = "meio"; }
      }
      var id = efeito.virou || fatia.id;

      switch (id) {
        case "perde-tudo": aplicar(-v); efeito.texto = "Perdeu o valor da carta."; break;
        case "meio": aplicar(-metade);
          efeito.texto = efeito.virou ? "Já estava em último lugar: virou Meio estrago." : "Perdeu metade do valor da carta."; break;
        case "fora": e.semTurno[eq] += 1; efeito.texto = "Pula o próximo turno."; break;
        case "lanterna":
          var alvo = lanterna(eq);
          aplicar(-metade);
          e.pontos[alvo] += metade;
          efeito.beneficiada = alvo;
          efeito.texto = "Doou " + metade + " pontos para " + e.equipes[alvo].nome + ", em último lugar.";
          break;
        case "cegas": e.asCegas[eq] = true; efeito.texto = "Na próxima questão da equipe, as alternativas aparecem só por 5 s."; break;
        case "relogio": e.contraRelogio[eq] = true; efeito.texto = "A próxima questão da equipe terá só 10 s."; break;
        case "sem-poderes":
          if (e.tesoura[eq]) { e.tesoura[eq] = false; efeito.texto = "Perdeu a Tesoura guardada."; efeito.perdeuTesoura = true; }
          else { aplicar(-metade); efeito.texto = "Sem Tesoura para perder: perdeu metade do valor."; }
          break;
        default: efeito.texto = "Nada acontece.";
      }
      j.punicao = efeito;
      j.resultado = { tipo: "erro", titulo: "Errou no passe", delta: efeito.delta || null, equipe: eq, revelar: true,
        texto: fatia.nome + ": " + efeito.texto };
      e.fase = "resultado";
      return efeito;

      function aplicar(d) { e.pontos[eq] += d; efeito.delta += d; }
    };

    /* equipe em último lugar, sem contar quem errou; empate: a primeira na ordem */
    function lanterna(exceto) {
      var e = E(), alvo = -1;
      for (var i = 0; i < n(); i++) {
        if (i === exceto) continue;
        if (alvo < 0 || e.pontos[i] < e.pontos[alvo]) alvo = i;
      }
      return alvo;
    }

    /* ---------- registro para o relatório de acertos (Fase 10) ----------
       s (saída da equipe da vez): acerto | erro | passou | tempo
       p (saída do passe): null (não foi ao passe) | acerto | erro | tempo | recusado | ninguem
       marcas do que muda a dificuldade: t Tesoura usada, o resposta por letra oculta,
       c Às cegas, r Contra o relógio, x especial da carta, m morte súbita */
    function registrar(j) {
      var e = E(), qq = q(j.q) || {};
      var r = { q: j.q, v: j.valor, se: qq.serie || null, ro: e.rodada, eq: j.equipe, s: j.saida || null,
        p: j.etapa === "morte" ? null : (j.saidaPasse || (j.passe ? "ninguem" : null)) };
      if (j.especial) r.x = j.especial;
      if (j.tesouraUsada) r.t = 1;
      if (j.ocultaPrincipal || (j.etapa === "principal" && j.oculta)) r.o = 1;
      if (j.cegas) r.c = 1;
      if (j.relogio) r.r = 1;
      if (j.etapa === "morte") r.m = 1;
      e.registro.push(r);
    }
    m._registrar = registrar;

    /* ---------- fim da jogada e passagem da vez ---------- */
    m.concluirJogada = function () {
      var e = E(), j = e.jogada;
      if (e.fase !== "resultado" || !j || j.resultado.vaiParaPasse) return null;
      if (j.etapa === "morte") return m.continuarMorte();
      guardar();
      registrar(j);
      e.cartas[j.carta].usada = true;
      e.trajetoria.push(e.pontos.slice());
      e.jogada = null;
      avancarVez();
      if (m.cartasRestantes() === 0) e.fase = "fim-rodada";
      else e.fase = "tabuleiro";
      return e.fase;
    };

    /* a vez segue a ordem das equipes, pulando quem está sem turno */
    function avancarVez() {
      var e = E(), i = e.vez, guarda = 0;
      e.avisos = [];
      while (guarda++ < 100) {
        i = (i + 1) % n();
        if (e.semTurno[i] > 0) {
          e.semTurno[i] -= 1;
          e.avisos.push(e.equipes[i].nome + " está sem turno e foi pulada.");
          continue;
        }
        break;
      }
      e.vez = i;
    }
    m._avancarVez = avancarVez;

    /* ---------- rodadas e fim ---------- */
    m.ranking = function () {
      var e = E();
      var temVencedor = e.vencedor !== null && e.vencedor !== undefined;
      var lista = e.pontos.map(function (p, i) { return { equipe: i, pontos: p }; });
      lista.sort(function (a, b) {
        if (temVencedor && a.equipe === e.vencedor) return -1;
        if (temVencedor && b.equipe === e.vencedor) return 1;
        return b.pontos - a.pontos || a.equipe - b.equipe;
      });
      /* empatados dividem a posição; quem venceu a morte súbita fica sozinho em 1º */
      lista.forEach(function (x, k) {
        var ant = lista[k - 1];
        var mesma = k > 0 && x.pontos === ant.pontos && !(temVencedor && ant.equipe === e.vencedor);
        x.posicao = mesma ? ant.posicao : k + 1;
      });
      return lista;
    };

    m.empatadosNoTopo = function () {
      var e = E(), max = Math.max.apply(null, e.pontos), lista = [];
      e.pontos.forEach(function (p, i) { if (p === max) lista.push(i); });
      return lista;
    };

    m.ehUltimaRodada = function () { return E().rodada >= E().rodadas; };

    /* botão "Encerrar" do tabuleiro: vai direto ao pódio desta rodada como se fosse a última */
    m.encerrar = function () {
      var e = E();
      if (e.fase !== "tabuleiro") return false;
      guardar();
      e.rodadas = e.rodada;
      e.encerradaAntes = true;
      e.fase = "fim-rodada";
      return true;
    };

    /* botão "Continuar" do pódio parcial */
    m.avancarDoFimDeRodada = function () {
      var e = E();
      if (e.fase !== "fim-rodada") return null;
      guardar();
      if (!m.ehUltimaRodada()) {
        e.rodada += 1;
        e.marcosRodada.push(e.trajetoria.length - 1);
        e.placarInicioRodada = e.pontos.slice();
        m._montarRodada();
        e.fase = "tabuleiro";
        return "rodada";
      }
      var emp = m.empatadosNoTopo();
      if (emp.length > 1) { iniciarMorte(emp); return "morte"; }
      e.vencedor = emp[0];
      e.fase = "fim";
      return "fim";
    };

    /* ---------- morte súbita ---------- */
    function iniciarMorte(empatadas) {
      var e = E();
      e.morte = { equipes: empatadas.slice(), leva: 1, fila: empatadas.slice(), resultados: {}, usadas: [] };
      e.fase = "morte-intro";
      e.jogada = null;
    }

    m.proximaMorte = function () {
      var e = E(), ms = e.morte;
      if (!ms || (e.fase !== "morte-intro" && e.fase !== "morte-leva")) return null;
      guardar();
      var eq = ms.fila[0];
      var de500 = m.banco.filter(function (x) { return x.valor === 500; });
      var livres = de500.filter(function (x) { return ms.usadas.indexOf(x.id) < 0; });
      if (!livres.length) { ms.usadas = []; livres = de500; }
      /* primeiro as que ainda não apareceram (nem nesta partida, nem nas recentes); depois as vistas há mais tempo */
      var hist = e.usadas || [];
      var nunca = livres.filter(function (x) { return hist.indexOf(x.id) < 0; });
      var questao;
      if (nunca.length) questao = nunca[Math.floor(m.rng() * nunca.length)];
      else {
        livres = livres.slice().sort(function (a, b) { return hist.lastIndexOf(a.id) - hist.lastIndexOf(b.id); });
        questao = livres[0];
      }
      ms.usadas.push(questao.id);
      e.usadas.push(questao.id);
      var tempo = (questao.tempo || 20) + e.tempoExtraLeitura + extraEquipe(eq);
      e.jogada = {
        carta: -1, q: questao.id, valor: 500, especial: null, equipe: eq, etapa: "morte",
        ordem: embaralhar([0, 1, 2, 3], m.rng), eliminadas: [], aberta: false, ordemOculta: null, oculta: false, cegas: false, relogio: false,
        tempoTotal: tempo, restante: tempo, pausado: false, somemEm: null,
        tesouraUsada: false, passe: null, punicao: null, resultado: null
      };
      e.vez = eq;
      e.fase = "pergunta";
      return e.jogada;
    };

    function julgarMorte(acertou) {
      var e = E(), j = e.jogada, ms = e.morte;
      ms.resultados[j.equipe] = acertou;
      j.saida = acertou ? "acerto" : (j.porTempo ? "tempo" : "erro");
      ms.fila.shift();
      j.resultado = { tipo: acertou ? "acerto" : "erro", titulo: acertou ? "Acertou!" : (j.porTempo ? "Tempo esgotado" : "Errou"),
        delta: null, equipe: j.equipe, revelar: true, texto: "Morte súbita: o placar não muda." };
      e.fase = "resultado";
      return { acertou: acertou };
    }

    m.continuarMorte = function () {
      var e = E(), ms = e.morte;
      if (e.fase !== "resultado" || !ms) return null;
      guardar();
      if (e.jogada) registrar(e.jogada);
      e.jogada = null;
      if (ms.fila.length) { e.fase = "morte-leva"; return "proxima"; }
      /* fim da leva */
      var acertaram = ms.equipes.filter(function (i) { return ms.resultados[i]; });
      var restam = (acertaram.length === 0) ? ms.equipes.slice() : acertaram;
      ms.historico = ms.historico || [];
      ms.historico.push({ leva: ms.leva, resultados: clonar(ms.resultados) });
      if (restam.length === 1) {
        e.vencedor = restam[0];
        e.fase = "fim";
        return "fim";
      }
      ms.equipes = restam;
      ms.fila = restam.slice();
      ms.resultados = {};
      ms.leva += 1;
      e.fase = "morte-leva";
      return "nova-leva";
    };

    /* ================= depuração ================= */
    m.dep = {
      definirEspecial: function (i, tipo) {
        var c = E().cartas[i];
        if (!c || c.usada) return false;
        c.especial = tipo || null;
        return true;
      },
      forcar: function (campo, valor) { E().forcar[campo] = valor; },
      somarPontos: function (eq, d) { guardar(); E().pontos[eq] += d; },
      definirPontos: function (eq, v) { guardar(); E().pontos[eq] = v; },
      alternar: function (campo, eq) {
        guardar();
        var e = E();
        if (campo === "semTurno") e.semTurno[eq] = e.semTurno[eq] ? 0 : 1;
        else e[campo][eq] = !e[campo][eq];
      },
      definirVez: function (eq) { var e = E(); if (e.fase === "tabuleiro") { guardar(); e.vez = eq; e.avisos = []; } },
      terminarRodada: function () {
        var e = E();
        if (e.fase !== "tabuleiro") return false;
        guardar();
        e.cartas.forEach(function (c) { if (!c.usada) { c.usada = true; c.resultado = c.resultado || "pulada"; } });
        e.trajetoria.push(e.pontos.slice());
        e.fase = "fim-rodada";
        return true;
      },
      irParaUltimaRodada: function () {
        var e = E();
        if (e.fase !== "tabuleiro") return false;
        guardar();
        e.rodada = e.rodadas;
        return true;
      },
      empatarTopo: function () {
        guardar();
        var e = E();
        var ordem = e.pontos.map(function (p, i) { return i; }).sort(function (a, b) { return e.pontos[b] - e.pontos[a]; });
        e.pontos[ordem[1]] = e.pontos[ordem[0]];
      }
    };

    return m;
  }

  var Regras = {
    novaPartida: novaPartida, retomar: retomar, EXTRAS_EQUIPE: EXTRAS_EQUIPE,
    niveisDisponiveis: niveisDisponiveis, nivelDisponivel: nivelDisponivel, MINIMO_POR_VALOR: MINIMO_POR_VALOR, MAX_RODADAS: MAX_RODADAS,
    ESPECIAIS: ESPECIAIS, FATIAS_TESOURA: FATIAS_TESOURA, FATIAS_PUNICAO: FATIAS_PUNICAO, NIVEIS: NIVEIS,
    VALORES: VALORES, TEMPO_PASSE: TEMPO_PASSE, TEMPO_RELOGIO: TEMPO_RELOGIO, DOBRO_SOMEM: DOBRO_SOMEM, CEGAS_SOMEM: CEGAS_SOMEM,
    tempoLeitura: tempoLeitura, sortearPeso: sortearPeso
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Regras;
  else raiz.REGRAS = Regras;
})(this);
