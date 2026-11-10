/* Duelo de Saberes · app instalável (Fase 9)
   - registra o service worker (sw.js), que guarda o jogo para funcionar sem internet;
   - botão "Instalar o app" (Chrome, Edge e Android) e o passo a passo para iPhone, iPad e outros navegadores;
   - tela cheia (botão ao lado do Visual e tecla F, ligada em js/app.js);
   - avisos: "pronto para usar sem internet", "sem internet" e "versão nova" (este só fora da partida).
   O jogo (js/app.js) usa window.PWA e escuta o evento "pwa-mudou" para redesenhar botões. */
(function () {
  "use strict";

  var CHAVE_OFFLINE = "duelo-pwa-offline-avisado";
  var pedidoInstalar = null;
  var atualizacao = false;
  var mostrouAtualizacao = false;

  var ua = navigator.userAgent || "";
  var ehIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var ehAndroid = /Android/i.test(ua);

  function instalado() {
    return (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches)) ||
      navigator.standalone === true;
  }
  function mudou() { try { document.dispatchEvent(new CustomEvent("pwa-mudou")); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- tela cheia ---------- */
  var raiz = document.documentElement;
  var telaCheiaSuportada = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
    !!(raiz.requestFullscreen || raiz.webkitRequestFullscreen);
  function emTelaCheia() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function alternarTelaCheia() {
    if (!telaCheiaSuportada) { aviso("Tela cheia não está disponível neste aparelho." + (ehIOS ? " No iPhone, instale o app na Tela de Início para jogar sem a barra do navegador." : ""), 4500); return; }
    try {
      if (emTelaCheia()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        var r = (raiz.requestFullscreen || raiz.webkitRequestFullscreen).call(raiz, { navigationUI: "hide" });
        if (r && r.catch) r.catch(function () { aviso("O navegador não deixou abrir a tela cheia. No PC, tente a tecla F11.", 4500); });
      }
    } catch (e) { aviso("O navegador não deixou abrir a tela cheia. No PC, tente a tecla F11.", 4500); }
  }
  document.addEventListener("fullscreenchange", mudou);
  document.addEventListener("webkitfullscreenchange", mudou);

  /* ---------- avisos (faixa no alto da tela, fora do #app para não sumir ao redesenhar) ---------- */
  var caixaAviso = null, tempoAviso = null;
  function garantirCaixa() {
    if (caixaAviso) return caixaAviso;
    caixaAviso = document.createElement("div");
    caixaAviso.id = "aviso-app";
    caixaAviso.setAttribute("role", "status");
    caixaAviso.setAttribute("aria-live", "polite");
    document.body.appendChild(caixaAviso);
    caixaAviso.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-pwa]");
      if (!b) return;
      if (b.dataset.pwa === "atualizar") location.reload();
      else fecharAviso();
    });
    return caixaAviso;
  }
  function aviso(texto, ms, botoes) {
    var c = garantirCaixa();
    clearTimeout(tempoAviso);
    c.innerHTML = '<p>' + esc(texto) + '</p>' + (botoes || '<button class="aviso-fechar" data-pwa="fechar" aria-label="Fechar aviso">×</button>');
    c.classList.add("visivel");
    if (ms) tempoAviso = setTimeout(fecharAviso, ms);
  }
  function fecharAviso() { if (caixaAviso) caixaAviso.classList.remove("visivel"); }

  /* "versão nova" só aparece fora da partida (início, configuração e relatório) */
  var TELAS_LIVRES = { inicio: 1, config: 1, relatorio: 1 };
  function foraDaPartida() { var t = document.body.dataset.tela; return !t || !!TELAS_LIVRES[t] || !document.getElementById("app"); }
  function talvezMostrarAtualizacao() {
    if (!atualizacao || mostrouAtualizacao || !foraDaPartida()) return;
    mostrouAtualizacao = true;
    aviso("Há uma versão nova do jogo, já baixada.", 0,
      '<button class="botao botao-principal botao-pequeno" data-pwa="atualizar">Atualizar agora</button>' +
      '<button class="botao botao-contorno botao-pequeno" data-pwa="fechar">Depois</button>');
  }
  if (window.MutationObserver) {
    new MutationObserver(talvezMostrarAtualizacao).observe(document.body, { attributes: true, attributeFilter: ["data-tela"] });
  }

  window.addEventListener("offline", function () { aviso("Sem internet: o jogo continua funcionando normalmente.", 4000); });

  /* ---------- service worker ---------- */
  var versaoSW = "";
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    var tinhaControle = !!navigator.serviceWorker.controller;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        /* procura versão nova do sw.js quando o app volta a ficar visível */
        document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") reg.update().catch(function () {}); });
      }).catch(function () {});
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.active) reg.active.postMessage({ tipo: "versao" });
        var jaAvisou = false;
        try { jaAvisou = localStorage.getItem(CHAVE_OFFLINE) === "1"; } catch (e) {}
        if (!tinhaControle && !jaAvisou) {
          try { localStorage.setItem(CHAVE_OFFLINE, "1"); } catch (e) {}
          aviso("Pronto: o jogo já funciona sem internet neste aparelho.", 5000);
        }
      });
    });
    navigator.serviceWorker.addEventListener("message", function (ev) {
      var d = ev.data || {};
      if (d.tipo === "atualizado") { atualizacao = true; talvezMostrarAtualizacao(); }
      else if (d.tipo === "versao") { versaoSW = d.versao || ""; mudou(); }
    });
  }

  /* ---------- instalação ---------- */
  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    pedidoInstalar = ev;
    mudou();
  });
  window.addEventListener("appinstalled", function () {
    pedidoInstalar = null;
    fecharJanela();
    aviso("App instalado. Da próxima vez, abra pelo ícone Duelo.", 5000);
    mudou();
  });
  if (window.matchMedia) {
    var mq = matchMedia("(display-mode: standalone)");
    if (mq.addEventListener) mq.addEventListener("change", mudou);
  }

  function instalar() {
    if (!pedidoInstalar) { comoInstalar(); return; }
    var p = pedidoInstalar;
    pedidoInstalar = null;
    p.prompt();
    if (p.userChoice) p.userChoice.then(function (r) { if (r && r.outcome !== "accepted") pedidoInstalar = p; mudou(); });
    mudou();
  }

  /* botão da tela inicial: some quando o jogo já está aberto como app */
  function botaoInicio() {
    if (instalado()) return "";
    if (pedidoInstalar) return '<button class="botao botao-contorno botao-instalar" data-acao="instalar">' + ICONE_BAIXAR + 'Instalar o app</button>';
    return '<button class="botao botao-contorno botao-instalar" data-acao="como-instalar">' + ICONE_BAIXAR + 'Como instalar o app</button>';
  }
  var ICONE_BAIXAR = '<svg class="icone-instalar" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0-4.5-4.5M12 14l4.5-4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- janela "Como instalar" ---------- */
  var janela = null, focoAntes = null;
  function passo(titulo, texto, destaque) {
    return '<li class="instalar-passo' + (destaque ? " instalar-este" : "") + '"><strong>' + titulo + '</strong><span>' + texto + '</span></li>';
  }
  function comoInstalar() {
    fecharJanela();
    focoAntes = document.activeElement;
    var pc = !ehIOS && !ehAndroid;
    janela = document.createElement("div");
    janela.className = "janela-app";
    janela.innerHTML =
      '<div class="janela-app-caixa" role="dialog" aria-modal="true" aria-labelledby="janela-app-titulo">' +
        '<p class="janela-app-topo"><strong id="janela-app-titulo">Como instalar o Duelo de Saberes</strong>' +
          '<button class="pv-fechar" data-pwa-janela="fechar" aria-label="Fechar">×</button></p>' +
        '<p class="janela-app-nota">Instalado, o jogo abre pelo ícone, em janela própria, e funciona sem internet. Os dados (turmas, partida salva e relatório) ficam neste aparelho.</p>' +
        '<ol class="instalar-passos">' +
          passo("PC ou notebook ligado ao projetor", "No Chrome ou no Edge, clique no ícone <b>Instalar app</b> no fim da barra de endereço (ou menu ⋮ → <b>Transmitir, salvar e compartilhar</b> → <b>Instalar página como app</b>).", pc) +
          passo("Tablet ou celular Android", "No Chrome, toque no menu ⋮ → <b>Instalar app</b> (em alguns aparelhos aparece <b>Adicionar à tela inicial</b>).", ehAndroid) +
          passo("iPad ou iPhone", "Abra no <b>Safari</b>, toque em <b>Compartilhar</b> (o quadrado com a seta para cima) → <b>Adicionar à Tela de Início</b> → <b>Adicionar</b>.", ehIOS) +
        '</ol>' +
        '<p class="janela-app-nota">Se o jogo já estiver instalado, abra pelo ícone <b>Duelo</b>. No Firefox do PC não há instalação: use o Chrome ou o Edge.</p>' +
        '<div class="janela-app-acoes"><button class="botao botao-principal" data-pwa-janela="fechar">Entendi</button></div>' +
      '</div>';
    document.body.appendChild(janela);
    janela.addEventListener("click", function (ev) {
      if (ev.target === janela || ev.target.closest("[data-pwa-janela]")) fecharJanela();
    });
    var b = janela.querySelector(".janela-app-acoes .botao");
    if (b) b.focus();
  }
  function fecharJanela() {
    if (!janela) return;
    janela.remove();
    janela = null;
    if (focoAntes && focoAntes.focus && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", function (ev) {
    if (!janela) return;
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); fecharJanela(); return; }
    /* o foco não sai da janela */
    if (ev.key === "Tab") {
      var f = janela.querySelectorAll("button");
      if (!f.length) return;
      var pri = f[0], ult = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === pri) { ev.preventDefault(); ult.focus(); }
      else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
    }
  }, true);

  window.PWA = {
    instalado: instalado,
    podeInstalar: function () { return !!pedidoInstalar; },
    instalar: instalar,
    comoInstalar: comoInstalar,
    janelaAberta: function () { return !!janela; },
    botaoInicio: botaoInicio,
    telaCheiaSuportada: telaCheiaSuportada,
    emTelaCheia: emTelaCheia,
    alternarTelaCheia: alternarTelaCheia,
    versao: function () { return versaoSW; },
    aviso: aviso
  };
})();
