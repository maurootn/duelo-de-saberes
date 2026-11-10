/* Duelo de Saberes 2.0 · Testes automáticos do motor de regras (Fase 4; partidas inteiras com os bancos reais na Fase 10)
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
    teste("Aceitou: alternativas ocultas (as 4 letras, na mesma ordem que a turma viu) e 10 s", function () {
      var m = partida(2); abrir(m, null);
      var antes = m.estado.jogada.ordem.join("");
      m.passar(); m.abrirPasse(); m.aceitarPasse();
      var j = m.estado.jogada;
      igual(j.aberta, true);
      igual(j.tempoTotal, 10);
      igual(j.ordemOculta.join(""), antes);
    });
    teste("Letras ocultas nunca mudam de posição (Em Dobro, Às cegas e passe)", function () {
      for (var s = 1; s <= 10; s++) {
        var m = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A" }, { nome: "B" }] }, banco, semente(s));
        abrir(m, "dobro"); var antes = m.estado.jogada.ordem.join("");
        m.esconderAlternativas();
        igual(m.estado.jogada.ordemOculta.join(""), antes);
      }
    });
    teste("Errou e foi para o passe: a letra certa continua a mesma para a equipe do passe", function () {
      var m = partida(2); abrir(m, null, 200);
      var j0 = m.estado.jogada, posCerta = j0.ordem.indexOf(certa(m));
      m.responder(errada(m)); m.abrirPasse(); m.aceitarPasse();
      igual(m.estado.jogada.ordemOculta.indexOf(certa(m)), posCerta);
    });
    teste("Escolher a letra oculta julga sozinho e marca a resposta como oculta", function () {
      var m = partida(2); abrir(m, "dobro", 200);
      m.esconderAlternativas();
      m.responder(errada(m));
      igual(m.estado.pontos[0], -100);
      igual(m.estado.jogada.oculta, true);
      igual(m.estado.jogada.resultado.vaiParaPasse, true);
    });
    teste("Alternativa cortada pela Tesoura fica cortada, na mesma letra, e não pode ser escolhida", function () {
      var m = partida(2); m.estado.tesoura[0] = true; abrir(m, "dobro");
      m.dep.forcar("tesoura", 2); m.usarTesoura();
      var cortadas = m.estado.jogada.eliminadas.slice();
      var antes = m.estado.jogada.ordem.join("");
      m.esconderAlternativas();
      igual(m.estado.jogada.ordemOculta.join(""), antes);
      cortadas.forEach(function (c) { igual(m.responder(c), null); });
    });
    teste("Às cegas: alternativas só por 5 s; depois a equipe escolhe uma das 4 letras ocultas", function () {
      var m = partida(2); m.estado.asCegas[0] = true; var j = abrir(m, null, 100);
      igual(j.aberta, false); igual(j.somemEm, 5);
      m.esconderAlternativas();
      igual(m.estado.jogada.ordemOculta.length, 4);
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
    teste("Às cegas: pode usar nos 5 s com alternativas, não depois que somem", function () {
      var m = partida(2); m.estado.tesoura[0] = true; m.estado.asCegas[0] = true; abrir(m, null);
      verdade(m.podeUsarTesoura(), "antes de sumir");
      m.esconderAlternativas();
      verdade(!m.podeUsarTesoura(), "depois de sumir");
    });
    teste("Não pode usar no passe (alternativas ocultas)", function () {
      var m = partida(2); m.estado.tesoura[1] = true; abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse();
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
    teste("Às cegas: na próxima questão da equipe, as alternativas ficam só 5 s", function () {
      var m = punir("cegas"); igual(m.estado.asCegas[1], true);
      m.concluirJogada(); // vez da equipe 2
      abrir(m, null);
      igual(m.estado.jogada.somemEm, 5);
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
    grupo("Equipes e avatares");
    teste("A partida guarda o avatar e o grito de guerra de cada equipe", function () {
      var av = { base: "atomo", expr: "sapeca", acess: "coroa", tom: 1, estilo: "fofo" };
      var m = R.novaPartida({ rodadas: 1, equipes: [{ nome: "A", cor: "azul", forma: "circulo", avatar: av, grito: "Vamos!" }, { nome: "B" }] }, banco, semente(5));
      igual(m.estado.equipes[0].avatar, av);
      igual(m.estado.equipes[0].grito, "Vamos!");
      igual(m.estado.equipes[1].avatar, null);
      av.base = "gota";
      igual(m.estado.equipes[0].avatar.base, "atomo", "a partida guarda uma cópia");
    });
    grupo("Tempo extra por equipe");
    function partidaExtra(extras) {
      var cfg = { rodadas: 2, nivel: "calouro", equipes: extras.map(function (x, i) { return { nome: "E" + (i + 1), cor: CORES[i], forma: "circulo", tempoExtra: x }; }) };
      return R.novaPartida(cfg, banco, semente(42));
    }
    function abrirDeTempo(m, t) {
      var e = m.estado, i;
      for (i = 0; i < 20; i++) if (!e.cartas[i].usada && m.questao(e.cartas[i].q).tempo === t) break;
      m.dep.definirEspecial(i, null); m.abrirCarta(i);
      return e.jogada;
    }
    teste("A equipe com +10 s tem 10 s a mais na pergunta dela", function () {
      var m = partidaExtra([10, 0]);
      igual(abrirDeTempo(m, 20).tempoTotal, 30);
    });
    teste("A equipe sem tempo extra fica com o tempo normal", function () {
      var m = partidaExtra([0, 15]);
      igual(abrirDeTempo(m, 20).tempoTotal, 20);
    });
    teste("Soma com o tempo extra de leitura geral", function () {
      var cfg = { rodadas: 2, tempoExtraLeitura: 5, equipes: [{ nome: "A", tempoExtra: 15 }, { nome: "B" }] };
      var m = R.novaPartida(cfg, banco, semente(42));
      igual(abrirDeTempo(m, 20).tempoTotal, 40);
    });
    teste("No passe vale o tempo extra de quem recebe", function () {
      var m = partidaExtra([0, 5]); abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse();
      igual(m.estado.jogada.tempoTotal, R.TEMPO_PASSE + 5);
    });
    teste("No passe, o extra de quem passou não conta", function () {
      var m = partidaExtra([15, 0]); abrir(m, null);
      m.passar(); m.abrirPasse(); m.aceitarPasse();
      igual(m.estado.jogada.tempoTotal, R.TEMPO_PASSE);
    });
    teste("No Contra o relógio o tempo extra não vale (fica 10 s)", function () {
      var m = partidaExtra([10, 10]); m.estado.contraRelogio[0] = true;
      igual(abrirDeTempo(m, 20).tempoTotal, R.TEMPO_RELOGIO);
    });
    teste("Valor fora da lista (ou partida antiga sem o campo) vira 0", function () {
      var m = partidaExtra([7, undefined]);
      igual(m.estado.equipes[0].tempoExtra, 0);
      igual(m.estado.equipes[1].tempoExtra, 0);
      delete m.estado.equipes[0].tempoExtra;
      igual(abrirDeTempo(R.retomar(m.estado, banco, semente(1)), 20).tempoTotal, 20);
    });

    grupo("Níveis e banco");
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

  /* ================================================================
     Fase 10 · Piloto: partidas inteiras com os bancos reais (dados/questoes/*.json).
     bancos = { biologia: [...], quimica: [...] }
     ================================================================ */
  function rodarPiloto(R, bancos) {
    var resultados = [], grupoAtual = "";
    function grupo(nome) { grupoAtual = nome; }
    function teste(nome, fn) {
      try { fn(); resultados.push({ grupo: grupoAtual, nome: nome, ok: true }); }
      catch (e) { resultados.push({ grupo: grupoAtual, nome: nome, ok: false, detalhe: e.message }); }
    }
    function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || "") + " esperado " + JSON.stringify(b) + ", veio " + JSON.stringify(a)); }
    function verdade(v, msg) { if (!v) throw new Error(msg || "condição falsa"); }
    function semente(s) {
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        var t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    var CORES = ["vermelho", "azul", "verde", "ambar", "roxo", "turquesa"];
    function nova(banco, nEq, seed, recentes, rodadas) {
      var cfg = { rodadas: rodadas || 5, nivel: "calouro", equipes: [], recentes: recentes || [] };
      for (var i = 0; i < nEq; i++) cfg.equipes.push({ nome: "E" + (i + 1), cor: CORES[i], forma: "circulo" });
      return R.novaPartida(cfg, banco, semente(seed));
    }
    /* joga a partida inteira sozinha: acerta, erra, passa, aceita ou recusa o passe e gira as roletas ao acaso.
       Guarda as questões de cada rodada (as 20 cartas) e as da morte súbita. */
    function jogarTudo(m, seed, empatar) {
      var rng = semente(seed), cartas = [], morte = [], guarda = 0, rodadaVista = 0;
      while (m.estado.fase !== "fim" && guarda++ < 5000) {
        var e = m.estado, f = e.fase, j = e.jogada;
        if (e.rodada !== rodadaVista && f === "tabuleiro") { rodadaVista = e.rodada; e.cartas.forEach(function (c) { cartas.push(c.q); }); }
        if (f === "tabuleiro") { var livres = []; e.cartas.forEach(function (c, i) { if (!c.usada) livres.push(i); }); m.abrirCarta(livres[Math.floor(rng() * livres.length)]); }
        else if (f === "pergunta") {
          if (j.etapa === "morte" && morte.indexOf(j.q) < 0) morte.push(j.q);
          var x = rng(), certa = m.questao(j.q).correta;
          var lista = (j.aberta ? j.ordemOculta : [0, 1, 2, 3]).filter(function (k) { return j.eliminadas.indexOf(k) < 0; });
          var errada = lista.filter(function (k) { return k !== certa; })[0];
          if (x < 0.12) m.tempoEsgotado();
          else if (x < 0.25 && !m.passarBloqueado()) m.passar();
          else m.responder(x < 0.62 ? certa : errada);
        }
        else if (f === "resultado") {
          if (j.resultado.vaiParaPasse) m.abrirPasse(); else m.concluirJogada();
        }
        else if (f === "passe") {
          if (j.passe.precisaSorteio && !j.passe.sorteado) m.sortearPasse();
          else if (rng() < 0.15) m.recusarPasse(); else m.aceitarPasse();
        }
        else if (f === "roleta") m.girarPunicao();
        else if (f === "fim-rodada") {
          if (empatar && m.ehUltimaRodada()) { var o = e.pontos.map(function (p, i) { return i; }).sort(function (a, b) { return e.pontos[b] - e.pontos[a]; }); e.pontos[o[1]] = e.pontos[o[0]]; }
          m.avancarDoFimDeRodada();
        }
        else if (f === "morte-intro" || f === "morte-leva") m.proximaMorte();
        else throw new Error("fase inesperada " + f);
      }
      verdade(m.estado.fase === "fim", "a partida não terminou");
      return { cartas: cartas, morte: morte };
    }
    function repetidas(lista) {
      var visto = {}, rep = [];
      lista.forEach(function (id) { if (visto[id]) rep.push(id); visto[id] = true; });
      return rep;
    }

    Object.keys(bancos).forEach(function (disc) {
      var banco = bancos[disc];
      grupo("Piloto · " + disc);

      teste("O banco do 1º ano tem 20 questões de cada valor (Calouro liberado)", function () {
        R.VALORES.forEach(function (v) {
          var n = banco.filter(function (x) { return x.serie === 1 && x.valor === v; }).length;
          verdade(n >= R.MINIMO_POR_VALOR, v + ": só " + n);
        });
        var d = R.niveisDisponiveis(banco);
        igual(d.calouro, true, "Calouro");
        igual(d.estudioso, false, "Estudioso sem 2º ano");
        igual(d.veterano, false, "Veterano sem 2º e 3º ano");
      });

      teste("Ids únicos e questões dentro dos limites do plano", function () {
        igual(repetidas(banco.map(function (x) { return x.id; })), [], "ids repetidos");
        banco.forEach(function (x) {
          verdade(Array.from(x.enunciado).length <= 200, x.id + " enunciado longo");
          igual(x.alternativas.length, 4, x.id);
          x.alternativas.forEach(function (a) { verdade(Array.from(a).length <= 70, x.id + " alternativa longa"); });
          verdade(x.correta >= 0 && x.correta <= 3, x.id + " correta");
          verdade(R.VALORES.indexOf(x.valor) >= 0, x.id + " valor");
        });
      });

      [2, 4, 6].forEach(function (nEq, k) {
        teste("5 rodadas no Calouro com " + nEq + " equipes: 100 cartas, nenhuma questão repetida", function () {
          var m = nova(banco, nEq, 100 + k), r = jogarTudo(m, 200 + k);
          igual(r.cartas.length, 100, "cartas");
          igual(repetidas(r.cartas), [], "repetidas");
          R.VALORES.forEach(function (v) {
            var n = r.cartas.filter(function (id) { return m.questao(id).valor === v; }).length;
            igual(n, 20, "cartas de " + v);
          });
          verdade(r.cartas.every(function (id) { return m.questao(id).serie === 1; }), "só 1º ano no Calouro");
        });
      });

      teste("Relatório: uma linha por carta jogada, com a saída da equipe e do passe", function () {
        var m = nova(banco, 4, 7), r = jogarTudo(m, 8);
        var reg = m.estado.registro.filter(function (x) { return !x.m; });
        igual(reg.length, 100, "linhas");
        igual(repetidas(reg.map(function (x) { return x.q; })), [], "questão registrada duas vezes");
        reg.forEach(function (x) {
          verdade(["acerto", "erro", "passou", "tempo"].indexOf(x.s) >= 0, "saída " + x.s);
          if (x.s === "acerto") igual(x.p, null, "acertou e foi ao passe?");
          else verdade(["acerto", "erro", "tempo", "recusado", "ninguem"].indexOf(x.p) >= 0, x.q + " passe " + x.p);
          igual(x.v, m.questao(x.q).valor, "valor");
        });
        verdade(r.cartas.length === 100);
      });

      teste("Desfazer depois de concluir também apaga a linha do relatório", function () {
        var m = nova(banco, 3, 11, [], 1);
        m.abrirCarta(0); m.responder(m.questao(m.estado.jogada.q).correta); m.concluirJogada();
        igual(m.estado.registro.length, 1);
        m.desfazer();
        igual(m.estado.registro.length, 0);
        m.concluirJogada();
        igual(m.estado.registro.length, 1, "refazer registra uma vez só");
      });

      teste("Morte súbita depois de 5 rodadas: não repete entre as empatadas e usa a de 500 vista há mais tempo", function () {
        var m = nova(banco, 3, 21), r = jogarTudo(m, 22, true);
        verdade(r.morte.length >= 2, "houve morte súbita");
        igual(repetidas(r.morte), [], "a morte súbita repetiu entre levas");
        var rodada1 = r.cartas.slice(0, 20);
        verdade(rodada1.indexOf(r.morte[0]) >= 0, "a primeira da morte súbita deveria ser uma da 1ª rodada (a vista há mais tempo)");
      });

      teste("Morte súbita sem esgotar as de 500 (3 rodadas): só questões que ainda não saíram", function () {
        var m = nova(banco, 2, 31, [], 3), r = jogarTudo(m, 32, true);
        r.morte.forEach(function (id) { verdade(r.cartas.indexOf(id) < 0, id + " já tinha saído na partida"); });
      });

      teste("Segunda partida seguida no mesmo aparelho: de novo 100 questões sem repetir", function () {
        var m1 = nova(banco, 4, 41); jogarTudo(m1, 42);
        var m2 = nova(banco, 4, 43, m1.estado.usadas.slice(-300)), r2 = jogarTudo(m2, 44);
        igual(repetidas(r2.cartas), [], "repetidas na 2ª partida");
        igual(r2.cartas.length, 100);
      });

      teste("Partida de 2 rodadas e depois outra de 2: a segunda prefere as que ainda não saíram", function () {
        var m1 = nova(banco, 4, 51, [], 2), r1 = jogarTudo(m1, 52);
        var m2 = nova(banco, 4, 53, m1.estado.usadas.slice(-300), 2), r2 = jogarTudo(m2, 54);
        var comum = r2.cartas.filter(function (id) { return r1.cartas.indexOf(id) >= 0; });
        igual(comum, [], "repetiu da partida anterior");
      });
    });

    grupo("Piloto · níveis");
    teste("Banco vazio ou incompleto deixa o nível em breve", function () {
      igual(R.niveisDisponiveis([]), { calouro: false, estudioso: false, veterano: false });
      var b = (bancos.biologia || []).slice(1);
      igual(R.nivelDisponivel("calouro", b), false, "faltando uma questão");
    });
    teste("Estudioso libera com 1º e 2º ano completos; Veterano precisa também do 3º", function () {
      var base = bancos.biologia || [];
      var com2 = base.concat(base.map(function (x) { return { id: x.id + "-s2", serie: 2, valor: x.valor }; }));
      var d = R.niveisDisponiveis(com2);
      igual([d.calouro, d.estudioso, d.veterano], [true, true, false]);
      var com3 = com2.concat(base.map(function (x) { return { id: x.id + "-s3", serie: 3, valor: x.valor }; }));
      igual(R.niveisDisponiveis(com3).veterano, true);
    });
    return resultados;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = rodar;
    module.exports.piloto = rodarPiloto;
    if (require.main === module) {
      var path = require("path");
      var R = require(path.join(__dirname, "regras.js"));
      var banco = require(path.join(__dirname, "..", "questoes", "teste-biologia-1.json"));
      var raizDados = path.join(__dirname, "..", "..", "dados", "questoes");
      var bancos = { biologia: require(path.join(raizDados, "biologia-1.json")), quimica: require(path.join(raizDados, "quimica-1.json")) };
      var res = rodar(R, banco).concat(rodarPiloto(R, bancos)), falhas = res.filter(function (r) { return !r.ok; });
      res.forEach(function (r) { console.log((r.ok ? "ok    " : "FALHOU") + "  [" + r.grupo + "] " + r.nome + (r.detalhe ? " → " + r.detalhe : "")); });
      console.log("\n" + (res.length - falhas.length) + " de " + res.length + " testes passaram.");
      process.exit(falhas.length ? 1 : 0);
    }
  } else { raiz.TESTES_REGRAS = rodar; raiz.TESTES_PILOTO = rodarPiloto; }
})(this);
