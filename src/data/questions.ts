import type { AttributeValue, Question, Target } from '../domain/types';

const Q = (
  id: string,
  text: string,
  tag: string,
  description: string,
  cost = 0.04,
  unknownRate = 0.05,
  applicable?: Question['applicable'],
): Question => ({ id, text, tag, description, cost, unknownRate, applicable });

export const questions: Question[] = [
  Q('real', 'É uma pessoa real?', 'real', 'Separa pessoas reais de ficção e grupos.'),
  Q('fictional', 'É um personagem fictício?', 'fictional', 'Isola personagens de obras e histórias.'),
  Q('group', 'É um grupo, banda ou equipe?', 'group', 'Separa entidades coletivas de indivíduos.'),
  Q('br', 'Sua origem é brasileira?', 'br', 'Distingue referências originadas no Brasil.', 0.05, 0.08),
  Q(
    'us',
    'Sua origem é dos Estados Unidos?',
    'us',
    'Divide obras e pessoas de origem americana.',
    0.05,
    0.08,
  ),
  Q('jp', 'Sua origem é japonesa?', 'jp', 'Pode abrir o ramo de anime, mangá e jogos.', 0.05, 0.07),
  Q('uk', 'Sua origem é britânica?', 'uk', 'Origem britânica da pessoa ou obra.', 0.06, 0.1),
  Q('mx', 'Sua origem é mexicana?', 'mx', 'Origem mexicana da pessoa ou obra.', 0.06, 0.1),
  Q(
    'film',
    'É conhecido principalmente pelo cinema?',
    'film',
    'Reúne astros e personagens de filmes.',
    0.06,
    0.1,
  ),
  Q(
    'series',
    'É conhecido por uma série de TV ou streaming?',
    'series',
    'Explora narrativas seriadas.',
    0.06,
    0.1,
  ),
  Q('cartoon', 'É de um desenho animado ocidental?', 'cartoon', 'Isola animações fora do anime.', 0.04, 0.05),
  {
    ...Q(
      'animatedfilm',
      'É principalmente de um filme de animação, em vez de um desenho de TV?',
      'animatedfilm',
      'Refina o ramo de cartoons: diferencia longas animados de desenhos de TV.',
      0.05,
      0.07,
      ['fictional'],
    ),
    explicit: true,
  },
  Q('anime', 'É de anime ou mangá?', 'anime', 'Divide o ramo de animação japonesa.', 0.04, 0.04),
  Q('game', 'É associado a videogames?', 'game', 'Divide personagens e criadores de jogos.', 0.04, 0.07),
  Q(
    'comic',
    'É associado a quadrinhos de super-heróis?',
    'comic',
    'Abre os ramos de heróis e vilões.',
    0.05,
    0.06,
  ),
  Q('novela', 'É conhecido por novela?', 'novela', 'Boa divisão para TV brasileira e mexicana.', 0.06, 0.11),
  Q('music', 'É associado à música?', 'music', 'Isola músicos, cantores e bandas.', 0.04, 0.04),
  Q('sport', 'É conhecido pelo esporte?', 'sport', 'Divide atletas e figuras esportivas.', 0.04, 0.03),
  Q('football', 'É associado ao futebol?', 'football', 'Afina o ramo de esporte.', 0.04, 0.03),
  Q('basket', 'É associado ao basquete?', 'basket', 'Afina o ramo de esporte.', 0.05, 0.06),
  Q(
    'combat',
    'É associado a artes marciais ou lutas?',
    'combat',
    'Ramo de atletas e personagens lutadores.',
    0.08,
    0.13,
  ),
  Q('politics', 'É conhecido pela política?', 'politics', 'Distingue lideranças públicas.', 0.04, 0.05),
  Q('history', 'É uma figura histórica?', 'history', 'Separa nomes históricos de ídolos atuais.', 0.06, 0.12),
  Q(
    'science',
    'É conhecido pela ciência ou tecnologia?',
    'science',
    'Isola pesquisadores e inventores.',
    0.05,
    0.08,
  ),
  Q(
    'internet',
    'Ficou famoso principalmente na internet?',
    'internet',
    'Ramo de criadores digitais.',
    0.06,
    0.14,
  ),
  Q('tv', 'É associado a programas de TV?', 'tv', 'Apresentadores, humor e entretenimento.', 0.07, 0.12),
  Q(
    'hero',
    'É um herói ou protagonista?',
    'hero',
    'Reduz candidatos fictícios pelo papel narrativo.',
    0.08,
    0.12,
    ['fictional'],
  ),
  Q(
    'villain',
    'É um vilão ou antagonista?',
    'villain',
    'Reduz candidatos fictícios pelo papel narrativo.',
    0.08,
    0.12,
    ['fictional'],
  ),
  Q(
    'animal',
    'Tem forma de animal?',
    'animal',
    'Separa personagens animais ou antropomórficos.',
    0.06,
    0.08,
    ['fictional'],
  ),
  Q('magic', 'Usa magia ou poderes sobrenaturais?', 'magic', 'Ramo de fantasia e superpoderes.', 0.08, 0.16, [
    'fictional',
  ]),
  Q('robot', 'É um robô ou inteligência artificial?', 'robot', 'Ramo de personagens mecânicos.', 0.05, 0.07, [
    'fictional',
  ]),
  Q('disney', 'É ligado à Disney?', 'disney', 'Franquias Disney e Pixar.', 0.05, 0.06),
  Q('marvel', 'É ligado à Marvel?', 'marvel', 'Franquias Marvel.', 0.05, 0.04),
  Q('dc', 'É ligado à DC Comics?', 'dc', 'Franquias DC.', 0.05, 0.05),
  Q('starwars', 'É ligado a Star Wars?', 'starwars', 'Galáxia de Star Wars.', 0.04, 0.03),
  Q('pokemon', 'É ligado a Pokémon?', 'pokemon', 'Franquia Pokémon.', 0.04, 0.03),
  Q('dragonball', 'É ligado a Dragon Ball?', 'dragonball', 'Franquia Dragon Ball.', 0.04, 0.03),
  Q('naruto', 'É ligado a Naruto?', 'naruto', 'Franquia Naruto.', 0.04, 0.03),
  Q('spongebob', 'É ligado a Bob Esponja?', 'spongebob', 'Franquia Bob Esponja.', 0.04, 0.03),
  Q('simpsons', 'É ligado aos Simpsons?', 'simpsons', 'Franquia Os Simpsons.', 0.04, 0.03),
  Q('harrypotter', 'É ligado a Harry Potter?', 'harrypotter', 'Universo de Harry Potter.', 0.04, 0.03),
  Q('lotr', 'É ligado a O Senhor dos Anéis?', 'lotr', 'Terra Média.', 0.04, 0.03),
  Q('mario', 'É ligado a Super Mario?', 'mario', 'Franquia de jogos Mario.', 0.04, 0.03),
  Q('zelda', 'É ligado a The Legend of Zelda?', 'zelda', 'Universo de jogos Zelda.', 0.04, 0.03),
  {
    ...Q(
      'woman',
      'É uma mulher ou personagem feminina?',
      'woman',
      'Separa alvos femininos e masculinos quando o dado foi registrado.',
      0.04,
      0.04,
    ),
    explicit: true,
  },
  {
    ...Q(
      'youngstar',
      'Nasceu depois do ano 2000?',
      'youngstar',
      'Separa gerações de artistas reais quando a data foi conferida.',
      0.06,
      0.07,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'lakers',
      'Jogou pelo Los Angeles Lakers?',
      'lakers',
      'Separa carreiras do basquete por equipe.',
      0.06,
      0.06,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'tvowner',
      'Foi dono de uma emissora de TV?',
      'tvowner',
      'Distingue apresentadores também ligados à propriedade de uma emissora.',
      0.08,
      0.12,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'relativity',
      'É associado à teoria da relatividade?',
      'relativity',
      'Distingue pesquisas e descobertas científicas.',
      0.06,
      0.08,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'cartoonadult',
      'É um adulto na história?',
      'cartoonadult',
      'Separa gerações de personagens de desenhos.',
      0.05,
      0.05,
      ['fictional'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'orangeoutfit',
      'Costuma usar roupa laranja?',
      'orangeoutfit',
      'Diferencia personagens do mesmo universo pela aparência.',
      0.08,
      0.08,
      ['fictional'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'letterr',
      'Troca o R pelo L quando fala?',
      'letterr',
      'Diferencia personagens por uma marca de fala.',
      0.07,
      0.08,
      ['fictional'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'olderfootball',
      'Jogou pela seleção antes de 1980?',
      'olderfootball',
      'Separa gerações de atletas do futebol.',
      0.07,
      0.1,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'threecups',
      'Venceu três Copas do Mundo como jogador?',
      'threecups',
      'Distingue recordes de títulos de futebol.',
      0.08,
      0.08,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'bulls',
      'Jogou pelo Chicago Bulls?',
      'bulls',
      'Separa carreiras de atletas da NBA por equipe.',
      0.06,
      0.05,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'novelist',
      'Também publicou romances?',
      'novelist',
      'Diferencia músicos com obra literária em romance.',
      0.08,
      0.13,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'marvelheroine',
      'Interpretou uma heroína da Marvel no cinema?',
      'marvelheroine',
      'Diferencia papéis de atores em filmes de super-heróis.',
      0.07,
      0.08,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'nuclearjob',
      'Trabalha em uma usina nuclear na história?',
      'nuclearjob',
      'Diferencia ocupações de personagens da mesma família.',
      0.08,
      0.08,
      ['fictional'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'nba90s',
      'Já jogava na NBA antes de 2000?',
      'nba90s',
      'Separa gerações de jogadores de basquete.',
      0.06,
      0.07,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'batmanfoe',
      'É um arqui-inimigo do Batman?',
      'batmanfoe',
      'Separa antagonistas centrais de parceiros e aliados.',
      0.07,
      0.1,
      ['fictional'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'spyheroine',
      'Interpretou uma espiã da Marvel no cinema?',
      'spyheroine',
      'Distingue papéis de atrizes nos filmes Marvel.',
      0.08,
      0.1,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'santosclub',
      'Jogou pelo Santos Futebol Clube?',
      'santosclub',
      'Distingue uma trajetória no clube santista.',
      0.07,
      0.07,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'barbiesong',
      'Cantou “What Was I Made For?”, do filme Barbie?',
      'barbiesong',
      'Reconhece a intérprete da canção do filme.',
      0.09,
      0.1,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'construcao',
      'Compôs a canção “Construção”?',
      'construcao',
      'Distingue a obra de um compositor brasileiro.',
      0.08,
      0.08,
      ['real'],
    ),
    explicit: true,
  },
  {
    ...Q(
      'blackwidow',
      'Interpretou a Viúva Negra no cinema?',
      'blackwidow',
      'Distingue o papel de uma atriz da Marvel.',
      0.08,
      0.08,
      ['real'],
    ),
    explicit: true,
  },
];

// Recorte editorial de pistas mais finas. Ausência aqui significa desconhecido,
// jamais um “Não” inventado. A auditoria individual de fontes ainda está pendente.
const explicitTraits: Record<string, { yes: string[]; no: string[] }> = {
  santosclub: { yes: ['Pelé', 'Neymar'], no: [] },
  barbiesong: { yes: ['Billie Eilish'], no: [] },
  construcao: { yes: ['Chico Buarque'], no: [] },
  blackwidow: { yes: ['Scarlett Johansson'], no: [] },
  animatedfilm: {
    yes: [
      'Shrek',
      'Burro (Shrek)',
      'Elsa (Frozen)',
      'Simba',
      'Woody (Toy Story)',
      'Buzz Lightyear',
      'WALL-E',
    ],
    no: ['Homer Simpson', 'Bart Simpson', 'Lisa Simpson', 'Bob Esponja', 'Patrick Estrela', 'Lula Molusco'],
  },
  woman: {
    yes: [
      'Billie Eilish',
      'Madonna',
      'Taylor Swift',
      'Beyoncé',
      'Scarlett Johansson',
      'Harley Quinn',
      'Lisa Simpson',
      'Magali',
      'Mônica',
      'Marie Curie',
      'Marta',
      'Anitta',
      'Ivete Sangalo',
      'Rita Lee',
      'Elis Regina',
      'Ariana Grande',
      'Lady Gaga',
      'Rihanna',
      'Shakira',
      'Ludmilla',
      'Selena Gomez',
      'Fernanda Montenegro',
      'Glória Pires',
      'Taís Araújo',
      'Xuxa',
      'Ana Maria Braga',
      'Simone Biles',
      'Angelina Jolie',
      'Jennifer Lawrence',
      'Zendaya',
      'Minnie Mouse',
      'Elsa (Frozen)',
      'Mulher-Maravilha',
      'Hermione Granger',
      'Sakura Haruno',
      'Maria do Bairro',
      'Soraya Montenegro',
      'Princesa Zelda',
      'Dora Aventureira',
      'Hello Kitty',
    ],
    no: [
      'Pelé',
      'Neymar',
      'Ronaldo Fenômeno',
      'Ronaldinho Gaúcho',
      'Kobe Bryant',
      'Michael Jordan',
      'LeBron James',
      'Stephen Curry',
      'Chico Buarque',
      'Caetano Veloso',
      'Gilberto Gil',
      'Roberto Carlos (cantor)',
      'Robert Downey Jr.',
      'Silvio Santos',
      'Faustão',
      'Ratinho',
      'Albert Einstein',
      'Stephen Hawking',
      'Isaac Newton',
      'Homer Simpson',
      'Bart Simpson',
      'Coringa',
      'Batman',
      'Goku',
      'Vegeta',
      'Cebolinha',
      'Cascão',
      'Pernalonga',
      'Bob Esponja',
      'Mickey Mouse',
      'Link (Zelda)',
      'Popeye',
      'Eminem',
      'Bruno Mars',
    ],
  },
  youngstar: {
    yes: ['Billie Eilish'],
    no: [
      'Madonna',
      'Taylor Swift',
      'Beyoncé',
      'Ariana Grande',
      'Lady Gaga',
      'Rihanna',
      'Shakira',
      'Eminem',
      'Bruno Mars',
    ],
  },
  lakers: { yes: ['Kobe Bryant', 'LeBron James'], no: ['Michael Jordan', 'Stephen Curry'] },
  tvowner: { yes: ['Silvio Santos'], no: ['Faustão', 'Ratinho', 'Ana Maria Braga', 'Luciano Huck', 'Xuxa'] },
  relativity: {
    yes: ['Albert Einstein'],
    no: ['Marie Curie', 'Isaac Newton', 'Stephen Hawking', 'Steve Jobs', 'Bill Gates', 'Elon Musk'],
  },
  cartoonadult: {
    yes: ['Homer Simpson', 'Coringa', 'Harley Quinn'],
    no: ['Bart Simpson', 'Lisa Simpson', 'Cebolinha', 'Cascão', 'Magali', 'Mônica'],
  },
  orangeoutfit: {
    yes: ['Goku', 'Naruto Uzumaki'],
    no: ['Vegeta', 'Freeza', 'Sasuke Uchiha', 'Sakura Haruno'],
  },
  letterr: { yes: ['Cebolinha'], no: ['Cascão', 'Magali', 'Mônica'] },
  olderfootball: {
    yes: ['Pelé'],
    no: ['Neymar', 'Ronaldo Fenômeno', 'Ronaldinho Gaúcho', 'Romário', 'Kaká', 'Vinícius Júnior'],
  },
  threecups: {
    yes: ['Pelé'],
    no: [
      'Neymar',
      'Ronaldo Fenômeno',
      'Ronaldinho Gaúcho',
      'Romário',
      'Kaká',
      'Lionel Messi',
      'Cristiano Ronaldo',
      'Diego Maradona',
    ],
  },
  bulls: { yes: ['Michael Jordan'], no: ['Kobe Bryant', 'LeBron James', 'Stephen Curry'] },
  novelist: {
    yes: ['Chico Buarque'],
    no: [
      'Caetano Veloso',
      'Gilberto Gil',
      'Roberto Carlos (cantor)',
      'Anitta',
      'Ivete Sangalo',
      'Gusttavo Lima',
      'Luan Santana',
    ],
  },
  marvelheroine: {
    yes: ['Scarlett Johansson', 'Angelina Jolie'],
    no: ['Robert Downey Jr.', 'Tom Cruise'],
  },
  nuclearjob: { yes: ['Homer Simpson'], no: ['Bart Simpson', 'Lisa Simpson'] },
  nba90s: { yes: ['Kobe Bryant', 'Michael Jordan'], no: ['LeBron James', 'Stephen Curry'] },
  batmanfoe: { yes: ['Coringa'], no: ['Harley Quinn', 'Batman', 'Mulher-Maravilha'] },
  spyheroine: {
    yes: ['Scarlett Johansson'],
    no: ['Angelina Jolie', 'Jennifer Lawrence', 'Robert Downey Jr.'],
  },
};

const traitSources: Record<string, Record<string, string>> = {
  santosclub: {
    Pelé: 'Santos FC: https://www.santosfc.com.br/pele-inicia-sua-historia-com-o-santos/',
    Neymar:
      'Santos FC: https://www.santosfc.com.br/assumindo-a-10-de-rei-pele-idolo-neymar-jr-esta-de-volta-ao-santos-fc/',
  },
  barbiesong: {
    'Billie Eilish':
      'Academia de Cinema: https://press.oscars.org/news/jon-batiste-becky-g-billie-eilish-and-finneas-oconnell-scott-george-and-osage-singers-ryan',
  },
  construcao: {
    'Chico Buarque': 'Chico Buarque: https://www.chicobuarque.com.br/obra/cancoes',
  },
  blackwidow: {
    'Scarlett Johansson':
      'Marvel: https://www.marvel.com/articles/movies/scarlett-johansson-natasha-romanoff-journey-black-widow-set-visit',
  },
  threecups: {
    Pelé: 'FIFA: https://www.fifa.com/en/tournaments/mens/worldcup/articles/pele-three-world-cup-titles-only-player',
  },
  lakers: {
    'Kobe Bryant': 'Los Angeles Lakers: https://www.nba.com/lakers/history/alumni/kobe-bryant',
  },
  nba90s: {
    'Kobe Bryant':
      'NBA: https://www.nba.com/news/week-history-kobe-bryant-makes-nba-debut-los-angeles-lakers-1996',
  },
};

export type AttributeEvidence = {
  value: AttributeValue;
  source: string | null;
  confidence: 'curated' | 'unverified' | 'unknown';
};

export function validateTraitEvidence(targets: Target[]): string[] {
  const issues: string[] = [];
  const names = new Set(targets.map((target) => target.name));
  const ids = new Set(questions.map((question) => question.id));
  for (const [tag, trait] of Object.entries(explicitTraits)) {
    if (!ids.has(tag)) issues.push(`Pista sem pergunta: ${tag}`);
    for (const name of [...trait.yes, ...trait.no]) {
      if (!names.has(name)) issues.push(`Pista ${tag}: alvo ausente ${name}`);
      if (trait.yes.includes(name) && trait.no.includes(name))
        issues.push(`Pista contraditória: ${tag}/${name}`);
    }
  }
  for (const [tag, sources] of Object.entries(traitSources)) {
    for (const name of Object.keys(sources))
      if (!explicitTraits[tag]?.yes.includes(name) && !explicitTraits[tag]?.no.includes(name))
        issues.push(`Fonte sem fato explícito: ${tag}/${name}`);
  }
  return [...new Set(issues)];
}

export function attributeEvidence(target: Target, question: Question): AttributeEvidence {
  const value = attribute(target, question);
  if (value === 'unknown') return { value, source: null, confidence: 'unknown' };
  const source = traitSources[question.tag]?.[target.name];
  if (source) return { value, source, confidence: 'curated' };
  if (['real', 'fictional', 'group', 'br', 'us', 'jp', 'uk', 'mx'].includes(question.tag))
    return { value, source: target.provenance, confidence: target.confidence };
  return {
    value,
    source: 'Classificação editorial da seed; fonte individual pendente',
    confidence: 'unverified',
  };
}

export function attribute(target: Target, question: Question): 'yes' | 'no' | 'unknown' {
  if (question.applicable && !question.applicable.includes(target.type)) return 'unknown';
  if (['real', 'fictional', 'group'].includes(question.tag))
    return target.type === question.tag ? 'yes' : 'no';
  if (['br', 'us', 'jp', 'uk', 'mx'].includes(question.tag)) {
    const origin: Record<string, string> = {
      br: 'Brasil',
      us: 'EUA',
      jp: 'Japão',
      uk: 'Reino Unido',
      mx: 'México',
    };
    return target.origin === origin[question.tag] ? 'yes' : 'no';
  }
  if (question.explicit) {
    const trait = explicitTraits[question.tag];
    if (trait?.yes.includes(target.name)) return 'yes';
    if (trait?.no.includes(target.name)) return 'no';
    return 'unknown';
  }
  // Tags are positive claims, not a closed-world registry. Missing data is
  // never a negative fact; only categorical fields and explicit contrasts are.
  return target.tags.includes(question.tag) ? 'yes' : 'unknown';
}
