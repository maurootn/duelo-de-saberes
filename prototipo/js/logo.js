/* Duelo de Saberes · Logo (3 propostas originais em SVG)
   As cores vêm das variáveis CSS --logo-1, --logo-2, --logo-luz e --logo-traco,
   por isso o mesmo desenho funciona no claro, no escuro e nos temas. */

window.LOGO = (function () {
  var FAISCA = "M0 -19C2.2 -6.5 6.5 -2.2 19 0 6.5 2.2 2.2 6.5 0 19 -2.2 6.5 -6.5 2.2 -19 0 -6.5 -2.2 -2.2 -6.5 0 -19Z";

  var simbolos = {
    /* A · Cartas em choque: duas cartas do tabuleiro se chocam e soltam faísca */
    a: '<g stroke="var(--logo-traco)" stroke-width="3.5" stroke-linejoin="round">' +
         '<g transform="translate(37 72) rotate(20)">' +
           '<rect x="-21" y="-33" width="42" height="66" rx="8" fill="var(--logo-1)"/>' +
           '<rect x="-13" y="-25" width="26" height="50" rx="4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5"/>' +
         '</g>' +
         '<g transform="translate(83 72) rotate(-20)">' +
           '<rect x="-21" y="-33" width="42" height="66" rx="8" fill="var(--logo-2)"/>' +
           '<rect x="-13" y="-25" width="26" height="50" rx="4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5"/>' +
         '</g>' +
         '<path transform="translate(60 27)" d="' + FAISCA + '" fill="var(--logo-luz)"/>' +
       '</g>',

    /* B · Balões em duelo: duas respostas ditas ao mesmo tempo, com um raio no meio */
    b: '<g stroke="var(--logo-traco)" stroke-width="3.5" stroke-linejoin="round">' +
         '<path d="M22 14h36a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14H36L18 80l3-17A14 14 0 0 1 8 50V28a14 14 0 0 1 14-14Z" fill="var(--logo-1)"/>' +
         '<path d="M98 42H62a14 14 0 0 0-14 14v22a14 14 0 0 0 14 14h22l18 16-3-17a14 14 0 0 0 13-13V56a14 14 0 0 0-14-14Z" fill="var(--logo-2)"/>' +
         '<path d="M66 26 46 60h12l-6 30 24-38H63l8-26Z" fill="var(--logo-luz)"/>' +
       '</g>',

    /* C · Medalhão de letreiro: D contra S, divididos por um raio, com lâmpadas de palco */
    c: '<defs><clipPath id="logo-c-clip"><circle cx="60" cy="60" r="47"/></clipPath></defs>' +
       '<circle cx="60" cy="60" r="57" fill="var(--logo-traco)"/>' +
       LAMPADAS() +
       '<g clip-path="url(#logo-c-clip)">' +
         '<rect x="0" y="0" width="120" height="120" fill="var(--logo-2)"/>' +
         '<path d="M0 0h74L52 54h18L44 120H0Z" fill="var(--logo-1)"/>' +
         '<path d="M74 4 52 54h18L46 116" fill="none" stroke="var(--logo-luz)" stroke-width="6" stroke-linejoin="round"/>' +
       '</g>' +
       '<text x="33" y="72" text-anchor="middle" font-family="var(--fonte-titulo)" font-size="36" fill="#fff">D</text>' +
       '<text x="85" y="80" text-anchor="middle" font-family="var(--fonte-titulo)" font-size="36" fill="#fff">S</text>'
  };

  function LAMPADAS() {
    var s = "", n = 18, i, a;
    for (i = 0; i < n; i++) {
      a = (i / n) * Math.PI * 2;
      s += '<circle cx="' + (60 + Math.cos(a) * 52).toFixed(1) + '" cy="' + (60 + Math.sin(a) * 52).toFixed(1) + '" r="2.6" fill="var(--logo-luz)"/>';
    }
    return s;
  }

  function simbolo(variante, classe) {
    return '<svg class="' + (classe || "logo-simbolo") + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
      simbolos[variante] + '</svg>';
  }

  /* Logo completo: símbolo + nome */
  function completo(variante, classe) {
    return '<div class="logo ' + (classe || "") + '" role="img" aria-label="Duelo de Saberes">' +
      simbolo(variante) +
      '<div class="logo-nome" aria-hidden="true"><span class="logo-duelo">Duelo</span><span class="logo-de">de Saberes</span></div>' +
    '</div>';
  }

  return {
    simbolo: simbolo,
    completo: completo,
    nomes: { a: "Cartas em choque", b: "Balões em duelo", c: "Medalhão de letreiro" }
  };
})();
