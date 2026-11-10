# Duelo de Saberes 2.0

Jogo de perguntas por equipes para a sala de aula, do Prof. Mauro Vinícius (Tanque Novo-BA).
Feito em HTML, CSS e JavaScript, sem etapa de compilação, e publicado pelo GitHub Pages.
É um app instalável (PWA): instala no PC, no tablet e no celular e funciona sem internet depois da primeira abertura.

- App: https://maurootn.github.io/duelo-de-saberes/
- Protótipo visual da Fase 3: pasta `prototipo/`

## Onde fica cada coisa

| Caminho | O que é |
| --- | --- |
| `index.html` | O jogo (desde a Fase 9 mora na raiz) |
| `manifest.webmanifest` | Nome, ícones e cores do app instalado |
| `sw.js` | Service worker: guarda o jogo no aparelho e traz as atualizações |
| `css/`, `js/`, `fontes/`, `img/` | Estilos, código, fontes e ícones |
| `temas/<disciplina>/` | Tema visual e sons de cada disciplina (`tema.css` + `tema.js`) |
| `disciplinas.json` | Lista das disciplinas do menu e dos arquivos de questões de cada uma |
| `dados/questoes/` | Bancos de questões, um JSON por disciplina e série |
| `questoes/` | Questões de teste das Fases 5 e 7 |
| `testes.html` | Testes automáticos das regras e lista de conferência na tela |
| `avatares.html` | Galeria de avatares |
| `motor/` | Só redirecionamentos: o endereço antigo `/motor/` leva para a raiz |

## Endereço antigo `/motor/` (Fase 9)

Até a Fase 8 o jogo morava em `/motor/` e a raiz redirecionava para lá. Na Fase 9 isso foi invertido:

1. O app passou a morar na raiz, junto com o manifesto e o service worker, para que a instalação e o modo offline valham para o endereço principal.
2. `motor/index.html`, `motor/avatares.html` e `motor/testes.html` agora só redirecionam para a raiz (`../`), mantendo os parâmetros e a âncora. Favoritos e atalhos antigos continuam funcionando.
3. Os dados salvos no aparelho (turmas, partida salva, relatório, preferências) não mudam, porque ficam ligados ao site, não à pasta.

## Funcionamento offline e atualizações

- Na primeira abertura com internet, o `sw.js` guarda no aparelho todos os arquivos da lista `ARQUIVOS`.
- Cada abertura usa o que está guardado (abre na hora, mesmo sem rede) e confere em paralelo se há versão nova.
  Se houver, guarda a nova e a tela inicial mostra **Há uma versão nova do jogo · Atualizar agora** (durante a partida o aviso espera).
- **Ao mudar arquivos do jogo não é preciso mexer no `sw.js`**: a atualização chega sozinha.
- Arquivo novo que não está na lista (por exemplo, o tema e as questões de uma disciplina nova) é guardado na primeira vez que o jogo abre com internet.
  Para que já venha guardado na instalação, acrescente-o em `ARQUIVOS` e mude `VERSAO` no `sw.js`.

## Lançar uma disciplina nova

Só arquivos novos, sem mexer no código do jogo:

1. Criar `temas/<id>/tema.js` e `temas/<id>/tema.css`.
2. Pôr as questões em `dados/questoes/<id>-<série>.json`.
3. Em `disciplinas.json`, marcar a disciplina com `"pronta": true`, `"tema": true` e listar os arquivos em `"questoes"`.
4. (Opcional) Acrescentar os arquivos novos em `ARQUIVOS` no `sw.js` e mudar `VERSAO`.

## Teclas

F tela cheia · V painel Visual · M som · L ler de novo · A–D ou 1–4 respondem · P passa · T Tesoura · espaço pausa · Ctrl+Z desfaz · setas andam pelas cartas.
