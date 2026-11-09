/* Duelo de Saberes · Protótipo da Fase 3
   Dados de exemplo. O banco real virá em JSON (Fase 8), no formato do plano.
   Aqui há 2 questões por valor, reaproveitadas nas 20 cartas. */

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
  ],

  questoes: [
    { id: "ex-100-a", valor: 100, tempo: 20,
      enunciado: "Em qual organela ocorre a respiração aeróbica?",
      alternativas: ["Mitocôndria", "Ribossomo", "Complexo golgiense", "Lisossomo"], correta: 0,
      explicacao: "A mitocôndria abriga o ciclo de Krebs e a cadeia respiratória, etapas que usam oxigênio." },
    { id: "ex-100-b", valor: 100, tempo: 20,
      enunciado: "Qual pigmento capta a luz na fotossíntese?",
      alternativas: ["Clorofila", "Hemoglobina", "Melanina", "Queratina"], correta: 0,
      explicacao: "A clorofila, nos cloroplastos, absorve a energia luminosa que move a fotossíntese." },

    { id: "ex-200-a", valor: 200, tempo: 20,
      enunciado: "Por que a fermentação rende só 2 ATP por molécula de glicose?",
      alternativas: ["A glicose é quebrada só em parte, sem cadeia respiratória", "O oxigênio consome o ATP que sobra", "Ela acontece dentro da mitocôndria", "A glicose não consegue entrar na célula"], correta: 0,
      explicacao: "Sem oxigênio, só a glicólise produz ATP; o restante da energia fica no etanol ou no lactato." },
    { id: "ex-200-b", valor: 200, tempo: 20,
      enunciado: "O que a fase clara da fotossíntese fornece para a produção de glicose?",
      alternativas: ["ATP e NADPH", "CO₂ e água", "Glicose e O₂", "ADP e NADP⁺"], correta: 0,
      explicacao: "A fase clara converte luz em ATP e NADPH, usados no ciclo de Calvin para fixar o CO₂." },

    { id: "ex-300-a", valor: 300, tempo: 20,
      enunciado: "Por que a massa do pão cresce quando usamos fermento biológico?",
      alternativas: ["As leveduras liberam CO₂ na fermentação", "As leveduras liberam O₂", "O açúcar evapora no forno", "O fermento produz ácido lático"], correta: 0,
      explicacao: "Na fermentação alcoólica, a glicose vira etanol e CO₂; as bolhas de gás fazem a massa crescer." },
    { id: "ex-300-b", valor: 300, tempo: 20,
      enunciado: "Num exercício muito intenso, falta O₂ nas fibras musculares. Que processo passa a produzir ATP nelas?",
      alternativas: ["Fermentação lática", "Fermentação alcoólica", "Fotossíntese", "Quimiossíntese"], correta: 0,
      explicacao: "Sem oxigênio suficiente, o músculo converte piruvato em lactato para manter a glicólise funcionando." },

    { id: "ex-400-a", valor: 400, tempo: 20,
      enunciado: "Uma elódea iluminada solta bolhas de O₂. Se a luz aumentar, mas o CO₂ da água acabar, o que ocorre com as bolhas?",
      alternativas: ["Diminuem: o CO₂ passa a limitar a fotossíntese", "Aumentam, porque há mais luz", "Não mudam, porque só a luz importa", "Aumentam, porque a planta respira mais"], correta: 0,
      explicacao: "Sem CO₂ o ciclo de Calvin para, o NADP⁺ não se renova e a fase clara deixa de liberar O₂." },
    { id: "ex-400-b", valor: 400, tempo: 20,
      enunciado: "Sementes germinam num frasco fechado com cal sodada, que absorve CO₂. O volume de gás no frasco diminui. O que isso mostra?",
      alternativas: ["As sementes consomem O₂ na respiração", "As sementes liberam O₂ na fotossíntese", "O CO₂ liberado ocupa mais espaço", "A água do frasco evapora"], correta: 0,
      explicacao: "O CO₂ liberado é absorvido pela cal; a queda de volume corresponde ao O₂ consumido na respiração." },

    { id: "ex-500-a", valor: 500, tempo: 20,
      enunciado: "O cianeto bloqueia a cadeia respiratória. O que acontece com o consumo de O₂, o ATP e a glicólise?",
      alternativas: ["O₂ cai, ATP cai muito e a glicólise segue com fermentação", "O₂ sobe, ATP cai e a glicólise para", "O₂ cai, ATP se mantém e a glicólise para", "O₂ cai, ATP cai e a glicólise para de vez"], correta: 0,
      explicacao: "Sem cadeia respiratória, o O₂ deixa de ser usado e o ATP despenca; resta a glicólise, mantida pela fermentação." },
    { id: "ex-500-b", valor: 500, tempo: 20,
      enunciado: "Um desacoplador deixa os prótons voltarem à matriz mitocondrial sem passar pela ATP sintase. O que ocorre na célula?",
      alternativas: ["O consumo de O₂ continua, o ATP cai e sobra calor", "O consumo de O₂ para e o ATP cai", "O ATP sobe e a produção de calor cai", "A glicólise para e o O₂ se acumula"], correta: 0,
      explicacao: "A cadeia segue consumindo O₂, mas a energia do gradiente de prótons se perde como calor em vez de virar ATP." }
  ]
};
