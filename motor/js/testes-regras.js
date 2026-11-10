/* Duelo de Saberes 2.0 · Testes automáticos do motor de regras (Fase 4)
   Cada teste monta uma partida, força a situação e confere o resultado.
   Roda em testes.html (navegador) e no Node: node js/testes-regras.js */

(function (raiz) {
  "use strict";

  function rodar(R, banco) {
    var resultados = [];
    var grupoAtual = "";

    function grupo(nome) { grupoAtual = nome; }
    function teste(nome, fn) {
      try { fn(); resultados.push({ grupo: grupoAtual, nome: nome, ok: true }); }
      catch (e) { resultados.push({ grupo: grupoAtual, nome: nome, ok: false, detalhe: e.message }); }
    }
    function igual(a, b, msg) {
      if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || "") + " esperado " + JSON.stringify(b) + ", veio " + JSON.stringify(a));
    }
    function verdade(v, msg) { if (!v) throw new Error(msg || "condição falsa"); }

    /* gerador previsível (mulberry32) para os testes repetirem igual */
    function semente(s) {
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        var t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    var CORES = ["vermelho", "azul", "verde", "ambar", "roxo", "turquesa"];
    function partida(nEq, extra) {
      var cfg = { rodadas: 2, nivel: "calouro", equipes: [] };
      for (var i = 0; i < nEq; i++) cfg.equipes.push({ nome: "E" + (i + 1), cor: CORES[i], forma: "circulo" });
      if (extra) Object.keys(extra).forEach(function (k) { cfg[k] = extra[k]; });
      return R.novaPartida(cfg, banco, semente(42));
    }
    /* abre a primeira carta livre já com o especial pedido (ou nenhum) */
    function abrir(m, especial, valor) {
      var e = m.estado, i;
      for (i = 0; i < e.cartas.length; i++) {
        if (!e.cartas[i].usada && (!valor || e.cartas[i].valor === valor)) break;
      }
      m.dep.definirEspecial(i, especial || null);
      m.abrirCarta(i);
      return m.estado.jogada;
    }
    function certa(m) { return m.questao(m.estado.jogada.q).correta; }
    function errada(m) { var c = certa(m); return c === 0 ? 1 : 0; }
    /* erra a principal e leva ao passe para a equipe indicada */
    function levarAoPasse(m, para) {
      m.responder(errada(m));
      m.abrirPasse();
      if (m.estado.jogada.passe.precisaSorteio) { m.dep.forcar("passe", para); m.sortearPasse(); }
    }

    /* ================================================================ */
    grupo("Tabuleiro");
    teste("Cada rodada tem 20 cartas, 4 de cada valor", function () {
      var m = partida(4), c = {};
      igual(m.estado.cartas.length, 20);
      m.estado.cartas.forEach(function (x) { c[x.valor] = (c[x.valor] || 0) + 1; });
      igual(c, { 100: 4, 200: 4, 300: 4, 400: 4, 500: 4 });
    });
    teste("Cada carta recebe uma questão do mesmo valor", function () {
      var m = partida(3);
      m.estado.cartas.forEach(function (x) { igual(m.questao(x.q).valor, x.valor, "carta " + x.n); });
    });
    teste("6 especiais por rodada: 1 Congelou, 2 Tudo ou Nada, 2 Em Dobro, 1 Tesoura", function () {
      for (var s = 1; s <= 20; s++) {
        var m = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }] }, banco, semente(s)), c = {};
        m.estado.cartas.forEach(function (x) { if (x.especial) c[x.especial] = (c[x.especial] || 0) + 1; });
        igual([c.congelou, c.tudo, c.dobro, c.tesoura], [1, 2, 2, 1], "semente " + s);
      }
    });
    teste("As posições dos valores mudam a cada partida", function () {
      var a = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }] }, banco, semente(1)).estado.cartas.map(function (c) { return c.valor; });
      var b = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }] }, banco, semente(2)).estado.cartas.map(function (c) { return c.valor; });
      verdade(JSON.stringify(a) !== JSON.stringify(b), "dois tabuleiros iguais");
    });
    teste("As alternativas são embaralhadas a cada exibição", function () {
      var m = partida(2), ordens = {};
      for (var k = 0; k < 10; k++) { abrir(m); ordens[m.estado.jogada.ordem.join("")] = 1; m.desfazer(); }
      verdade(Object.keys(ordens).length > 1, "a ordem nunca mudou");
    });

    grupo("Turno");
    teste("Acertou: ganha o valor da carta", function () {
      var m = partida(2), j = abrir(m, null);
      m.responder(certa(m));
      igual(m.estado.pontos[0], j.valor);
      igual(m.estado.jogada.resultado.vaiParaPasse, undefined);
    });
    teste("Errou: perde metade e a questão vai para o passe", function () {
      var m = partida(2), j = abrir(m, null, 300);
      m.responder(errada(m));
      igual(m.estado.pontos[0], -150);
      igual(m.estado.jogada.resultado.vaiParaPasse, true);
      igual(m.estado.jogada.resultado.revelar, false, "não pode revelar a resposta antes do passe");
    });
    teste("Botão Passar: vai para o passe sem perder pontos", function () {
      var m = partida(2); abrir(m, null);
      m.passar();
      igual(m.estado.pontos[0], 0);
      igual(m.estado.jogada.resultado.vaiParaPasse, true);
    });
    teste("Tempo esgotado: vai para o passe sem perder pontos", function () {
      var m = partida(2); abrir(m, null);
      m.tempoEsgotado();
      igual(m.estado.pontos[0], 0);
      igual(m.estado.jogada.resultado.vaiParaPasse, true);
    });
    teste("Alternativa eliminada não pode ser marcada", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, null);
      m.dep.forcar("tesoura", 3); m.usarTesoura();
      igual(m.responder(m.estado.jogada.eliminadas[0]), null);
    });
    teste("Placar pode ficar negativo", function () {
      var m = partida(2); abrir(m, "tudo", 500);
      m.responder(errada(m));
      igual(m.estado.pontos[0], -500);
    });
    teste("Tempo próprio da questão é respeitado (ex.: 30 s)", function () {
      var m = partida(2), e = m.estado, i;
      for (i = 0; i < 20; i++) if (m.questao(e.cartas[i].q).tempo === 30) break;
      m.dep.definirEspecial(i, null); m.abrirCarta(i);
      igual(e.jogada.tempoTotal, 30);
    });
    teste("Tempo extra de leitura soma ao tempo da questão", function () {
      var m = partida(2, { tempoExtraLeitura: 5 }), e = m.estado, i;
      for (i = 0; i < 20; i++) if (m.questao(e.cartas[i].q).tempo === 20) break;
      m.dep.definirEspecial(i, null); m.abrirCarta(i);
      igual(e.jogada.tempoTotal, 25);
    });

    grupo("Passe");
    teste("Com 2 equipes, a outra recebe direto, sem sorteio", function () {
      var m = partida(2); abrir(m, null);
      m.passar(); m.abrirPasse();
      igual(m.estado.jogada.passe.precisaSorteio, false);
      igual(m.estado.jogada.passe.equipe, 1);
    });
    teste("Com 3 ou mais equipes, há sorteio e nunca cai em quem passou", function () {
      for (var s = 1; s <= 30; s++) {
        var m = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }, { nome: "C" }, { nome: "D" }] }, banco, semente(s));
        abrir(m, null); m.passar(); m.abrirPasse();
        igual(m.estado.jogada.passe.precisaSorteio, true);
        var eq = m.sortearPasse();
        verdade(eq !== 0 && eq >= 1 && eq <= 3, "sorteou " + eq);
      }
    });
    teste("Equipe sem turno não entra no sorteio do passe", function () {
      var m = partida(4); m.estado.semTurno[2] = 1; abrir(m, null);
      m.passar(); m.abrirPasse();
      igual(m.estado.jogada.passe.elegiveis, [1, 3]);
    });
    teste("Se só uma equipe pode receber, ela recebe direto", function () {
      var m = partida(3); m.estado.semTurno[2] = 1; abrir(m, null);
      m.passar(); m.abrirPasse();
      igual(m.estado.jogada.passe.precisaSorteio, false);
      igual(m.estado.jogada.passe.equipe, 1);
    });
    teste("Se ninguém pode receber, a carta sai e ninguém pontua", function () {
      var m = partida(2); m.estado.semTurno[1] = 1; abrir(m, null);
      m.passar(); m.abrirPasse();
      igual(m.estado.fase, "resultado");
      igual(m.estado.jogada.resultado.titulo, "Ninguém pode receber");
      m.concluirJogada();
      igual(m.estado.pontos, [0, 0]);
    });
    teste("Recusou: ninguém pontua e a carta sai do tabuleiro", function () {
      var m = partida(2); abrir(m, null);
      m.passar(); m.abrirPasse(); m.recusarPasse();
      m.concluirJogada();
      igual(m.estado.pontos, [0, 0]);
      igual(m.cartasRestantes(), 19);
    });
    teste("Aceitou: alternativas ocultas (só as 4 letras, sorteadas de novo) e 10 s", function () {
      var m = partida(2); abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse();
      var j = m.estado.jogada;
      igual(j.aberta, true);
      igual(j.tempoTotal, 10);
      igual(j.ordemOculta.slice().sort(), [0, 1, 2, 3]);
    });
    teste("Letras ocultas mudam de posição em relação às alternativas vistas", function () {
      var mudou = false;
      for (var s = 1; s <= 10 && !mudou; s++) {
        var m = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }] }, banco, semente(s));
        abrir(m, "dobro"); var antes = m.estado.jogada.ordem.join("");
        m.esconderAlternativas();
        if (m.estado.jogada.ordemOculta.join("") !== antes) mudou = true;
      }
      verdade(mudou, "as letras nunca foram sorteadas de novo");
    });
    teste("Escolher a letra oculta julga sozinho e marca a resposta como oculta", function () {
      var m = partida(2); abrir(m, "dobro", 200);
      m.esconderAlternativas();
      m.responder(errada(m));
      igual(m.estado.pontos[0], -100);
      igual(m.estado.jogada.oculta, true);
      igual(m.estado.jogada.resultado.vaiParaPasse, true);
    });
    teste("Alternativa cortada pela Tesoura não volta como letra oculta", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, "dobro");
      m.dep.forcar("tesoura", 2); m.usarTesoura();
      var cortadas = m.estado.jogada.eliminadas.slice();
      m.esconderAlternativas();
      igual(m.estado.jogada.ordemOculta.length, 2);
      cortadas.forEach(function (c) { verdade(m.estado.jogada.ordemOculta.indexOf(c) < 0, "voltou " + c); });
      igual(m.responder(cortadas[0]), null);
    });
    teste("Às cegas: a equipe escolhe uma das 4 letras ocultas", function () {
      var m = partida(2); m.estado.asCegas[0] = true; var j = abrir(m, null, 100);
      igual(j.ordemOculta.length, 4);
      m.responder(certa(m));
      igual(m.estado.pontos[0], 100);
    });
    teste("Acertou no passe: valor da carta + 50% (200 rende 300)", function () {
      var m = partida(2); abrir(m, null, 200);
      m.passar(); m.abrirPasse(); m.aceitarPasse(); m.responder(certa(m));
      igual(m.estado.pontos, [0, 300]);
    });
    teste("Errou no passe: gira a roleta de punição", function () {
      var m = partida(2); abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse(); m.responder(errada(m));
      igual(m.estado.fase, "roleta");
    });
    teste("Tempo esgotado no passe aceito conta como erro (roleta)", function () {
      var m = partida(2); abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse(); m.tempoEsgotado();
      igual(m.estado.fase, "roleta");
    });
    teste("Quem errou e perdeu metade continua com a perda depois do passe", function () {
      var m = partida(2); abrir(m, null, 400);
      levarAoPasse(m, 1); m.aceitarPasse(); m.responder(certa(m));
      igual(m.estado.pontos, [-200, 600]);
    });

    grupo("Armadilhas");
    teste("Congelou: Passar fica bloqueado", function () {
      var m = partida(2); abrir(m, "congelou");
      verdade(m.passarBloqueado(), "deveria bloquear");
      igual(m.passar(), null);
    });
    teste("Congelou: errou perde metade e pula o próximo turno", function () {
      var m = partida(3); abrir(m, "congelou", 200);
      m.responder(errada(m));
      igual(m.estado.pontos[0], -100);
      igual(m.estado.semTurno[0], 1);
    });
    teste("Congelou: acertar não pune", function () {
      var m = partida(3); var j = abrir(m, "congelou");
      m.responder(certa(m));
      igual(m.estado.pontos[0], j.valor);
      igual(m.estado.semTurno[0], 0);
    });
    teste("Congelou: a equipe congelada é pulada na volta seguinte", function () {
      var m = partida(3); abrir(m, "congelou");
      m.responder(errada(m)); m.abrirPasse(); m.sortearPasse(); m.recusarPasse(); m.concluirJogada(); // vez: 1
      abrir(m, null); m.passar(); m.abrirPasse(); m.sortearPasse(); m.recusarPasse(); m.concluirJogada(); // vez: 2
      abrir(m, null); m.passar(); m.abrirPasse(); m.sortearPasse(); m.recusarPasse(); m.concluirJogada(); // pula 0 → vez 1
      igual(m.estado.vez, 1);
      igual(m.estado.semTurno[0], 0);
      verdade(m.estado.avisos.length === 1, "deveria avisar que a equipe foi pulada");
    });
    teste("Tudo ou Nada: errou perde o valor inteiro", function () {
      var m = partida(2); abrir(m, "tudo", 300);
      m.responder(errada(m));
      igual(m.estado.pontos[0], -300);
    });
    teste("Armadilha: tempo esgotado conta como erro", function () {
      var m = partida(2); abrir(m, "tudo", 100);
      m.tempoEsgotado();
      igual(m.estado.pontos[0], -100);
      igual(m.estado.jogada.resultado.vaiParaPasse, true);
    });
    teste("Armadilha errada vai ao passe, que vale o normal + 50% e não tem armadilha", function () {
      var m = partida(2); abrir(m, "tudo", 200);
      levarAoPasse(m, 1); m.aceitarPasse();
      verdade(!m.ehArmadilha(), "a armadilha não vale no passe");
      m.responder(certa(m));
      igual(m.estado.pontos, [-200, 300]);
    });

    grupo("Em Dobro");
    teste("Acertou: vale o dobro", function () {
      var m = partida(2); abrir(m, "dobro", 300);
      m.responder(certa(m));
      igual(m.estado.pontos[0], 600);
    });
    teste("Errou: perde 50% do valor normal", function () {
      var m = partida(2); abrir(m, "dobro", 300);
      m.responder(errada(m));
      igual(m.estado.pontos[0], -150);
    });
    teste("As alternativas somem aos 10 s ou no fim da leitura, o que vier depois", function () {
      var m = partida(2), e = m.estado;
      for (var i = 0; i < 20; i++) {
        var q = m.questao(e.cartas[i].q);
        m.dep.definirEspecial(i, "dobro"); m.abrirCarta(i);
        igual(e.jogada.somemEm, Math.max(10, R.tempoLeitura(q)), q.id);
        m.desfazer(); e = m.estado;
      }
    });
    teste("Depois que somem, a equipe escolhe uma letra oculta e o app julga", function () {
      var m = partida(2); abrir(m, "dobro", 100);
      m.esconderAlternativas();
      m.responder(certa(m));
      igual(m.estado.pontos[0], 200);
    });
    teste("No passe, vale o valor normal + 50%", function () {
      var m = partida(2); abrir(m, "dobro", 400);
      m.passar(); m.abrirPasse(); m.aceitarPasse(); m.responder(certa(m));
      igual(m.estado.pontos, [0, 600]);
    });
    teste("Em Dobro pode ser passado (não é armadilha)", function () {
      var m = partida(2); abrir(m, "dobro");
      verdade(!m.passarBloqueado());
    });

    grupo("Tesoura");
    teste("Acertar a carta Tesoura guarda o poder", function () {
      var m = partida(2); abrir(m, "tesoura");
      m.responder(certa(m));
      igual(m.estado.tesoura[0], true);
    });
    teste("Errar a carta Tesoura não dá o poder", function () {
      var m = partida(2); abrir(m, "tesoura");
      m.responder(errada(m));
      igual(m.estado.tesoura[0], false);
    });
    teste("A equipe guarda no máximo uma Tesoura", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, "tesoura");
      m.responder(certa(m));
      igual(m.estado.tesoura[0], true);
      verdade(!m.estado.jogada.resultado.ganhouTesoura);
    });
    teste("Elimina 1, 2 ou 3 alternativas, nunca a correta", function () {
      [1, 2, 3].forEach(function (n) {
        var m = partida(2); m.estado.tesoura[0] = true; abrir(m, null);
        m.dep.forcar("tesoura", n); m.usarTesoura();
        igual(m.estado.jogada.eliminadas.length, n);
        verdade(m.estado.jogada.eliminadas.indexOf(certa(m)) < 0, "eliminou a correta");
      });
    });
    teste("Uso único: depois de girar, o poder some", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, null);
      m.usarTesoura();
      igual(m.estado.tesoura[0], false);
      igual(m.usarTesoura(), null);
    });
    teste("Não pode usar em questão sem alternativas (Às cegas ou passe)", function () {
      var m = partida(2); m.estado.tesoura[0] = true; m.estado.asCegas[0] = true; abrir(m, null);
      verdade(!m.podeUsarTesoura());
    });
    teste("Pode usar em armadilha e em Em Dobro antes de as alternativas sumirem", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, "tudo");
      verdade(m.podeUsarTesoura(), "armadilha");
      var m2 = partida(2); m2.estado.tesoura[0] = true; abrir(m2, "dobro");
      verdade(m2.podeUsarTesoura(), "dobro");
      m2.esconderAlternativas();
      verdade(!m2.podeUsarTesoura(), "dobro depois de sumir");
    });
    teste("Chances da roleta: 50% / 35% / 15% (10 mil giros)", function () {
      var rng = semente(7), c = { 1: 0, 2: 0, 3: 0 }, N = 10000;
      for (var k = 0; k < N; k++) c[R.FATIAS_TESOURA[R.sortearPeso(R.FATIAS_TESOURA, rng)].id]++;
      verdade(Math.abs(c[1] / N - .5) < .02 && Math.abs(c[2] / N - .35) < .02 && Math.abs(c[3] / N - .15) < .02, JSON.stringify(c));
    });

    grupo("Roleta de punição");
    function punir(fatia, prep) {
      var m = partida(3);
      if (prep) prep(m);
      abrir(m, null, 400);
      levarAoPasse(m, 1); m.aceitarPasse(); m.responder(errada(m));
      m.dep.forcar("punicao", fatia);
      m.girarPunicao();
      return m;
    }
    teste("Perde tudo: perde o valor da carta", function () {
      var m = punir("perde-tudo"); igual(m.estado.pontos[1], -400);
    });
    teste("Meio estrago: perde metade do valor", function () {
      var m = punir("meio"); igual(m.estado.pontos[1], -200);
    });
    teste("Fora da jogada: pula o próximo turno", function () {
      var m = punir("fora"); igual(m.estado.semTurno[1], 1);
      m.concluirJogada();
      igual(m.estado.vez, 2, "deveria pular a equipe 2 e ir para a 3");
    });
    teste("Ajuda ao lanterna: doa metade para a equipe em último", function () {
      var m = punir("lanterna", function (m) { m.estado.pontos = [0, 500, 100]; });
      // E1 errou a principal: 0 − 200 = −200, então E1 é a lanterna e recebe a metade
      igual(m.estado.pontos, [0, 300, 100]);
      igual(m.estado.jogada.punicao.beneficiada, 0);
    });
    teste("Ajuda ao lanterna vira Meio estrago se quem errou já é a última", function () {
      var m = punir("lanterna", function (m) { m.estado.pontos = [900, -500, 100]; });
      igual(m.estado.jogada.punicao.virou, "meio");
      igual(m.estado.pontos, [700, -700, 100]);
    });
    teste("Às cegas: a próxima questão da equipe vem sem alternativas", function () {
      var m = punir("cegas"); igual(m.estado.asCegas[1], true);
      m.concluirJogada(); // vez da equipe 2
      abrir(m, null);
      igual(m.estado.jogada.aberta, true);
      igual(m.estado.asCegas[1], false, "o efeito é consumido");
    });
    teste("Contra o relógio: a próxima questão da equipe tem só 10 s", function () {
      var m = punir("relogio"); m.concluirJogada();
      abrir(m, null);
      igual(m.estado.jogada.tempoTotal, 10);
    });
    teste("Sem poderes: perde a Tesoura guardada", function () {
      var m = punir("sem-poderes", function (m) { m.estado.tesoura[1] = true; });
      igual(m.estado.tesoura[1], false);
      igual(m.estado.pontos[1], 0);
    });
    teste("Sem poderes sem Tesoura: perde metade do valor", function () {
      var m = punir("sem-poderes"); igual(m.estado.pontos[1], -200);
    });
    teste("Escapou!: nada acontece", function () {
      var m = punir("escapou"); igual(m.estado.pontos[1], 0); igual(m.estado.semTurno[1], 0);
    });
    teste("Chances padrão: 25/20/15/10/10/10/5/5 (20 mil giros)", function () {
      var rng = semente(9), F = R.FATIAS_PUNICAO, c = F.map(function () { return 0; }), N = 20000, ok = true;
      for (var k = 0; k < N; k++) c[R.sortearPeso(F, rng)]++;
      F.forEach(function (f, i) { if (Math.abs(c[i] / N - f.chance / 100) > .015) ok = false; });
      verdade(ok, JSON.stringify(c));
    });
    teste("Chances ajustáveis nas configurações", function () {
      var ch = {}; R.FATIAS_PUNICAO.forEach(function (f) { ch[f.id] = 0; }); ch.escapou = 100;
      var m = partida(2, { chancesPunicao: ch }); abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse(); m.responder(errada(m)); m.girarPunicao();
      igual(m.estado.jogada.punicao.fatia, "escapou");
    });

    grupo("Vez, rodadas e fim");
    teste("A vez segue a ordem das equipes", function () {
      var m = partida(3), vezes = [];
      for (var k = 0; k < 4; k++) { vezes.push(m.estado.vez); abrir(m, null); m.responder(certa(m)); m.concluirJogada(); }
      igual(vezes, [0, 1, 2, 0]);
    });
    teste("Duas equipes sem turno ao mesmo tempo são puladas", function () {
      var m = partida(4); m.estado.semTurno[1] = 1; m.estado.semTurno[2] = 1;
      abrir(m, null); m.responder(certa(m)); m.concluirJogada();
      igual(m.estado.vez, 3);
      igual(m.estado.avisos.length, 2);
    });
    teste("Depois das 20 cartas vem o pódio parcial e uma nova rodada", function () {
      var m = partida(2);
      for (var k = 0; k < 20; k++) { abrir(m, null); m.responder(certa(m)); m.concluirJogada(); }
      igual(m.estado.fase, "fim-rodada");
      m.avancarDoFimDeRodada();
      igual(m.estado.rodada, 2);
      igual(m.cartasRestantes(), 20);
    });
    teste("Sem empate na última rodada: pódio final", function () {
      var m = partida(2); m.estado.rodada = 2; m.estado.pontos = [500, 100];
      m.dep.terminarRodada(); m.avancarDoFimDeRodada();
      igual(m.estado.fase, "fim"); igual(m.estado.vencedor, 0);
    });
    teste("Trajetória guarda o placar depois de cada carta", function () {
      var m = partida(2);
      abrir(m, null, 100); m.responder(certa(m)); m.concluirJogada();
      igual(m.estado.trajetoria, [[0, 0], [100, 0]]);
    });

    grupo("Morte súbita");
    function morte(pontos) {
      var m = partida(3); m.estado.rodada = 2; m.estado.pontos = pontos;
      m.dep.terminarRodada(); m.avancarDoFimDeRodada();
      return m;
    }
    teste("Empate no primeiro lugar abre a morte súbita só com as empatadas", function () {
      var m = morte([300, 300, 100]);
      igual(m.estado.fase, "morte-intro");
      igual(m.estado.morte.equipes, [0, 1]);
    });
    teste("Questões de 500, sem passe e sem especiais", function () {
      var m = morte([300, 300, 100]); m.proximaMorte();
      igual(m.estado.jogada.valor, 500);
      igual(m.estado.jogada.especial, null);
      verdade(m.passarBloqueado(), "passe deveria estar bloqueado");
    });
    teste("Uma acerta e a outra erra: vence quem acertou e o placar não muda", function () {
      var m = morte([300, 300, 100]);
      m.proximaMorte(); m.responder(errada(m)); m.continuarMorte();
      m.proximaMorte(); m.responder(certa(m)); m.continuarMorte();
      igual(m.estado.fase, "fim"); igual(m.estado.vencedor, 1);
      igual(m.estado.pontos, [300, 300, 100]);
      igual(m.ranking()[0].equipe, 1);
      igual(m.ranking()[1].posicao, 2);
    });
    teste("Todas acertam ou todas erram: nova leva até sobrar uma", function () {
      var m = morte([300, 300, 100]);
      m.proximaMorte(); m.responder(certa(m)); m.continuarMorte();
      m.proximaMorte(); m.responder(certa(m)); m.continuarMorte();
      igual(m.estado.morte.leva, 2);
      m.proximaMorte(); m.tempoEsgotado(); m.continuarMorte();
      m.proximaMorte(); m.tempoEsgotado(); m.continuarMorte();
      igual(m.estado.morte.leva, 3);
      m.proximaMorte(); m.responder(certa(m)); m.continuarMorte();
      m.proximaMorte(); m.responder(errada(m)); m.continuarMorte();
      igual(m.estado.vencedor, 0);
    });
    teste("Com 3 empatadas, quem erra sai e as outras seguem", function () {
      var m = morte([200, 200, 200]);
      m.proximaMorte(); m.responder(certa(m)); m.continuarMorte();
      m.proximaMorte(); m.responder(errada(m)); m.continuarMorte();
      m.proximaMorte(); m.responder(certa(m)); m.continuarMorte();
      igual(m.estado.morte.equipes, [0, 2]);
    });

    grupo("Desfazer");
    teste("Desfazer volta o placar e a carta para antes da resposta", function () {
      var m = partida(2); abrir(m, null, 300);
      m.responder(errada(m));
      igual(m.estado.pontos[0], -150);
      m.desfazer();
      igual(m.estado.pontos[0], 0);
      igual(m.estado.fase, "pergunta");
      igual(m.estado.jogada.pausado, true, "volta com o cronômetro parado");
    });
    teste("Desfazer volta uma carta aberta por engano", function () {
      var m = partida(2); abrir(m, null);
      m.desfazer();
      igual(m.estado.fase, "tabuleiro");
      igual(m.cartasRestantes(), 20);
    });
    teste("Desfazer devolve a Tesoura gasta", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, null);
      m.usarTesoura(); m.desfazer();
      igual(m.estado.tesoura[0], true);
    });

    grupo("Níveis e banco");
    teste("Proporção do Veterano: 20% / 30% / 50% (sorteio de séries)", function () {
      var falso = [], id = 0;
      [1, 2, 3].forEach(function (s) { [100, 200, 300, 400, 500].forEach(function (v) { for (var k = 0; k < 30; k++) falso.push({ id: "f" + (id++), serie: s, valor: v, enunciado: "x", alternativas: ["a", "b", "c", "d"], correta: 0, tempo: 20 }); }); });
      var c = { 1: 0, 2: 0, 3: 0 }, tot = 0;
      for (var s = 1; s <= 60; s++) {
        var m = R.novaPartida({ rodadas: 1, nivel: "veterano", equipes: [{ nome: "A" }, { nome: "B" }] }, falso, semente(s));
        m.estado.cartas.forEach(function (x) { c[m.questao(x.q).serie]++; tot++; });
      }
      verdade(Math.abs(c[1] / tot - .2) < .04 && Math.abs(c[2] / tot - .3) < .04 && Math.abs(c[3] / tot - .5) < .04, JSON.stringify(c));
    });
    teste("Evita repetir questões usadas em partidas recentes", function () {
      var falso = [], id = 0;
      [100, 200, 300, 400, 500].forEach(function (v) { for (var k = 0; k < 8; k++) falso.push({ id: "g" + (id++), serie: 1, valor: v, enunciado: "x", alternativas: ["a", "b", "c", "d"], correta: 0, tempo: 20 }); });
      var m1 = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }] }, falso, semente(3));
      var usadas = m1.estado.cartas.map(function (c) { return c.q; });
      var m2 = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }], recentes: usadas }, falso, semente(4));
      m2.estado.cartas.forEach(function (c) { verdade(usadas.indexOf(c.q) < 0, "repetiu " + c.q); });
    });
    teste("As 20 questões de teste seguem os limites do plano", function () {
      igual(banco.length, 20);
      banco.forEach(function (x) {
        verdade(Array.from(x.enunciado).length <= 200, x.id + " enunciado longo");
        igual(x.alternativas.length, 4, x.id);
        x.alternativas.forEach(function (a) { verdade(Array.from(a).length <= 70, x.id + " alternativa longa"); });
        verdade(x.correta >= 0 && x.correta <= 3, x.id + " correta");
        verdade(!!x.justificativa_nivel && !!x.explicacao, x.id + " sem justificativa ou explicação");
      });
    });

    return resultados;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = rodar;
    if (require.main === module) {
      var path = require("path");
      var R = require(path.join(__dirname, "regras.js"));
      var banco = require(path.join(__dirname, "..", "questoes", "teste-biologia-1.json"));
      var res = rodar(R, banco), falhas = res.filter(function (r) { return !r.ok; });
      res.forEach(function (r) { console.log((r.ok ? "ok    " : "FALHOU") + "  [" + r.grupo + "] " + r.nome + (r.detalhe ? " → " + r.detalhe : "")); });
      console.log("\n" + (res.length - falhas.length) + " de " + res.length + " testes passaram.");
      process.exit(falhas.length ? 1 : 0);
    }
  } else raiz.TESTES_REGRAS = rodar;
})(this);
