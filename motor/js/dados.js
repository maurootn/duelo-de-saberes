/* Duelo de Saberes 2.0 · Dados fixos do jogo (disciplinas, níveis, temas, cores, formas e equipes padrão).
   As questões ficam em questoes/*.json, no formato do plano. */

window.DADOS = {
  disciplinas: [
    { id: "biologia",   nome: "Biologia" },
    { id: "quimica",    nome: "Química" },
    { id: "fisica",     nome: "Física" },
    { id: "matematica", nome: "Matemática" },
    { id: "portugues",  nome: "Língua Portuguesa" },
    { id: "ingles",     nome: "Língua Inglesa" },
    { id: "geografia",  nome: "Geografia" },
    { id: "historia",   nome: "História" }
  ],

  niveis: [
    { id: "calouro",   nome: "Calouro",   series: "100% de 1º ano" },
    { id: "estudioso", nome: "Estudioso", series: "35% de 1º ano e 65% de 2º" },
    { id: "veterano",  nome: "Veterano",  series: "20% de 1º, 30% de 2º e 50% de 3º" }
  ],

  temasArena: [
    "Nordeste e Bahia", "Cinema e animação", "Música", "Games", "Esportes",
    "Mitologias do mundo", "Folclore brasileiro", "Gastronomia",
    "Tecnologia e internet", "Espaço e astronomia", "Arte e artistas",
    "Quadrinhos e animes"
  ],

  cores: [
    { id: "vermelho", nome: "Vermelho", hex: "#E5383B" },
    { id: "azul",     nome: "Azul",     hex: "#2F6FED" },
    { id: "verde",    nome: "Verde",    hex: "#1F9D55" },
    { id: "ambar",    nome: "Âmbar",    hex: "#F2A900" },
    { id: "roxo",     nome: "Roxo",     hex: "#8E44D6" },
    { id: "turquesa", nome: "Turquesa", hex: "#0FA3B1" }
  ],

  /* Formas em viewBox 0 0 24 24 */
  formas: [
    { id: "circulo",   nome: "Círculo",   d: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" },
    { id: "triangulo", nome: "Triângulo", d: "M12 2.5 22.5 21h-21Z" },
    { id: "quadrado",  nome: "Quadrado",  d: "M3.5 3.5h17v17h-17Z" },
    { id: "estrela",   nome: "Estrela",   d: "m12 1.8 3 6.6 7.2.8-5.4 4.8 1.5 7.1L12 17.5 5.7 21.1l1.5-7.1L1.8 9.2 9 8.4Z" },
    { id: "hexagono",  nome: "Hexágono",  d: "M12 1.8 21 7v10l-9 5.2L3 17V7Z" },
    { id: "losango",   nome: "Losango",   d: "M12 1.5 21.5 12 12 22.5 2.5 12Z" }
  ],

  equipesPadrao: [
    { nome: "Mitocôndrias", cor: "vermelho", forma: "circulo" },
    { nome: "Cloroplastos", cor: "azul",     forma: "triangulo" },
    { nome: "Ribossomos",   cor: "verde",    forma: "quadrado" },
    { nome: "Lisossomos",   cor: "ambar",    forma: "estrela" },
    { nome: "Centríolos",   cor: "roxo",     forma: "hexagono" },
    { nome: "Vacúolos",     cor: "turquesa", forma: "losango" }
  ]
};
