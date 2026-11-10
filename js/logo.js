/* Duelo de Saberes · Logo aprovado: "Balões em duelo"
   Duas respostas ditas ao mesmo tempo (um balão dourado e um vermelho) e um raio de luz entre elas.
   Desenho original em SVG. As cores vêm das variáveis CSS --logo-*, então acompanham tema e modo. */

window.LOGO = (function () {
  var FAISCA = "M0 -7C.8 -2.4 2.4 -.8 7 0 2.4 .8 .8 2.4 0 7 -.8 2.4 -2.4 .8 -7 0 -2.4 -.8 -.8 -2.4 0 -7Z";

  var desenho =
    '<defs>' +
      '<linearGradient id="lg-a" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="var(--logo-a1)"/><stop offset=".55" stop-color="var(--logo-a2)"/><stop offset="1" stop-color="var(--logo-a3)"/>' +
      '</linearGradient>' +
      '<linearGradient id="lg-b" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="var(--logo-b1)"/><stop offset="1" stop-color="var(--logo-b2)"/>' +
      '</linearGradient>' +
      '<linearGradient id="lg-r" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#F1F3F8"/><stop offset="1" stop-color="#B9C0CE"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<g stroke="var(--logo-traco)" stroke-width="3.5" stroke-linejoin="round">' +
      /* balão da esquerda */
      '<path d="M22 14h36a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14H36L18 80l3-17A14 14 0 0 1 8 50V28a14 14 0 0 1 14-14Z" fill="url(#lg-a)"/>' +
      /* balão da direita */
      '<path d="M98 42H62a14 14 0 0 0-14 14v22a14 14 0 0 0 14 14h22l18 16-3-17a14 14 0 0 0 13-13V56a14 14 0 0 0-14-14Z" fill="url(#lg-b)"/>' +
      /* raio */
      '<path d="M67 22 45 60h13l-7 33 26-41H63l9-30Z" fill="url(#lg-r)"/>' +
    '</g>' +
    /* brilhos dos balões */
    '<path d="M17 27c1-5 4-7 9-7h12" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M103 84c-1 4-3 5-7 5h-8" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
    /* faíscas */
    '<path class="logo-faisca" transform="translate(92 22)" d="' + FAISCA + '" fill="#fff"/>' +
    '<path class="logo-faisca f2" transform="translate(24 98) scale(.7)" d="' + FAISCA + '" fill="var(--logo-a1)"/>';

  function simbolo(classe) {
    return '<svg class="' + (classe || "logo-simbolo") + '" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' + desenho + '</svg>';
  }

  /* Logo completo: símbolo + nome */
  function completo(classe) {
    return '<div class="logo ' + (classe || "") + '" role="img" aria-label="Duelo de Saberes">' +
      simbolo() +
      '<div class="logo-nome" aria-hidden="true"><span class="logo-duelo">Duelo</span><span class="logo-de">de Saberes</span></div>' +
    '</div>';
  }

  return { simbolo: simbolo, completo: completo };
})();
