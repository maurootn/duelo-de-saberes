# Duelo de Saberes 2.0

Jogo de perguntas por equipes para a sala de aula, do Prof. Mauro Vinícius (Tanque Novo-BA).
Feito em HTML, CSS e JavaScript, sem etapa de compilação, e publicado pelo GitHub Pages.

- App: https://maurootn.github.io/duelo-de-saberes/
- Jogo: pasta `motor/`
- Protótipo visual da Fase 3: pasta `prototipo/`

## Redirecionamento provisório (até a Fase 9)

Hoje o jogo mora em `/motor/`. Por isso, o `index.html` da raiz só **redireciona automaticamente para `/motor/`**, mantendo os parâmetros e a âncora do endereço.

**Na Fase 9 (app instalável), isto deve ser invertido:**

1. **Remover** o redirecionamento do `index.html` da raiz. O app passa a morar na raiz, junto com o manifesto e o service worker, para que a instalação e o modo offline valham para o endereço principal.
2. **Trocar** o `motor/index.html` por um redirecionamento para a raiz (`../`), mantendo os parâmetros e a âncora. Assim, favoritos e atalhos antigos para `/motor/` continuam funcionando.
3. Conferir se nenhum caminho relativo (`css/`, `js/`, `questoes/`, `temas/`, `fontes/`, `img/`) ficou apontando para a pasta antiga.
