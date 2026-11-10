/* Duelo de Saberes · service worker (Fase 9: app instalável e offline)

   Como funciona
   - Na instalação, guarda no aparelho todos os arquivos da lista ARQUIVOS (o jogo inteiro, com fontes,
     temas e bancos de questões). Depois disso o jogo abre sem internet.
   - Cada arquivo pedido sai na hora do que está guardado e, em paralelo, o app confere na internet se há
     versão nova ("stale-while-revalidate"). Se houver, guarda a nova para a próxima abertura e avisa a tela,
     que oferece "Atualizar" (só fora da partida).
   - Arquivo que não está na lista (por exemplo, o tema de uma disciplina nova) é guardado na primeira vez que
     o jogo o abre com internet. Assim, lançar disciplina nova continua sendo só subir arquivos novos.

   Ao mudar arquivos do jogo, não é preciso mexer aqui: a atualização chega sozinha.
   Mude VERSAO só ao acrescentar arquivos à lista (para que já venham guardados na instalação) ou ao mudar
   este próprio arquivo. */

var VERSAO = "2026-11-10-fase9";
var CACHE = "duelo-" + VERSAO;

var ARQUIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "disciplinas.json",
  "avatares.html",
  "testes.html",

  "css/estilo.css",
  "css/motor.css",
  "css/avatares.css",
  "css/relatorio.css",
  "css/acessibilidade.css",
  "css/pwa.css",

  "js/dados.js",
  "js/avatares.js",
  "js/logo.js",
  "js/regras.js",
  "js/sons.js",
  "js/voz.js",
  "js/pwa.js",
  "js/app.js",
  "js/testes-regras.js",

  "temas/biologia/tema.css",
  "temas/biologia/tema.js",
  "temas/quimica/tema.css",
  "temas/quimica/tema.js",

  "dados/questoes/biologia-1.json",
  "dados/questoes/quimica-1.json",
  "questoes/teste-biologia-1.json",
  "questoes/teste-quimica-1.json",

  "fontes/atkinson-hyperlegible-latin-400-normal.woff2",
  "fontes/atkinson-hyperlegible-latin-700-normal.woff2",
  "fontes/bungee-latin-400-normal.woff2",
  "fontes/chakra-petch-latin-700-normal.woff2",
  "fontes/fredoka-latin-700-normal.woff2",
  "fontes/lilita-one-latin-400-normal.woff2",
  "fontes/russo-one-latin-400-normal.woff2",

  "img/icone.svg",
  "img/icone-32.png",
  "img/icone-192.png",
  "img/icone-512.png",
  "img/icone-apple-180.png",
  "img/icone-mascaravel-192.png",
  "img/icone-mascaravel-512.png",

  /* endereços antigos de antes da Fase 9: só levam para a raiz */
  "motor/",
  "motor/index.html",
  "motor/avatares.html",
  "motor/testes.html"
];

/* ---------- instalação: guarda o jogo inteiro ---------- */
self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: "reload" }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* ---------- ativação: apaga as versões antigas da lista ---------- */
self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n.indexOf("duelo-") === 0 && n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---------- pedidos ---------- */
function semBusca(url) { var u = new URL(url); u.search = ""; u.hash = ""; return u.href; }

/* "mesma versão?": compara ETag ou Last-Modified (o GitHub Pages manda os dois) */
function assinatura(resp) {
  if (!resp) return "";
  return resp.headers.get("ETag") || resp.headers.get("Last-Modified") || "";
}

/* navegação não aceita resposta que veio de redirecionamento: refaz a resposta limpa */
function limpar(resp) {
  if (!resp.redirected) return Promise.resolve(resp);
  return resp.blob().then(function (corpo) {
    return new Response(corpo, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
  });
}

var avisoPendente = null;
function avisarAtualizacao(url) {
  /* junta vários arquivos novos num aviso só */
  clearTimeout(avisoPendente);
  avisoPendente = setTimeout(function () {
    self.clients.matchAll({ type: "window" }).then(function (lista) {
      lista.forEach(function (c) { c.postMessage({ tipo: "atualizado", url: url }); });
    });
  }, 1200);
}

self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET") return;
  if (req.headers.has("range")) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.url.indexOf(self.registration.scope) !== 0) return;

  var navegacao = req.mode === "navigate";
  var chave = semBusca(req.url);

  ev.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(chave).then(function (guardada) {
      var daRede = fetch(chave, { cache: "no-cache", credentials: "same-origin" }).then(function (resp) {
        if (!resp || !resp.ok || resp.type !== "basic") return resp;
        return limpar(resp).then(function (r) {
          var nova = assinatura(r), velha = assinatura(guardada);
          return cache.put(chave, r.clone()).then(function () {
            if (guardada && nova && velha && nova !== velha) avisarAtualizacao(chave);
            return r;
          });
        });
      });

      if (guardada) {
        /* responde na hora com o que está guardado e confere a versão nova em paralelo */
        ev.waitUntil(daRede.catch(function () {}));
        return guardada;
      }
      return daRede.catch(function (erro) {
        /* sem internet e sem cópia: página nova cai no jogo; outros arquivos falham normalmente */
        if (navegacao) return cache.match(new URL("./", self.registration.scope).href);
        throw erro;
      });
    });
  }));
});

/* a tela pode pedir a versão desta instalação (aparece no painel de testes) */
self.addEventListener("message", function (ev) {
  if (ev.data && ev.data.tipo === "versao" && ev.source) ev.source.postMessage({ tipo: "versao", versao: VERSAO });
});
