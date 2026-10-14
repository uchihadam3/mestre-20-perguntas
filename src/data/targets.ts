import type { Target, TargetType } from '../domain/types';

// Editorial demonstration seed. Broad classifications only; all rows remain marked unverified.
// Syntax: name | type | origin of person/work | fame tier | broad tags.
const rows = `
Pelé|real|Brasil|1|sport football history
Neymar|real|Brasil|1|sport football
Ronaldo Fenômeno|real|Brasil|1|sport football
Ronaldinho Gaúcho|real|Brasil|1|sport football
Marta|real|Brasil|2|sport football
Romário|real|Brasil|2|sport football
Zico|real|Brasil|2|sport football
Kaká|real|Brasil|2|sport football
Vinícius Júnior|real|Brasil|2|sport football
Roberto Carlos (jogador)|real|Brasil|2|sport football
Lionel Messi|real|Argentina|1|sport football
Cristiano Ronaldo|real|Portugal|1|sport football
Diego Maradona|real|Argentina|1|sport football history
Kylian Mbappé|real|França|2|sport football
Michael Jordan|real|EUA|1|sport basket history
LeBron James|real|EUA|1|sport basket
Kobe Bryant|real|EUA|2|sport basket history
Stephen Curry|real|EUA|2|sport basket
Muhammad Ali|real|EUA|1|sport combat history
Mike Tyson|real|EUA|1|sport combat
Anderson Silva|real|Brasil|2|sport combat
Ayrton Senna|real|Brasil|1|sport history
Lewis Hamilton|real|Reino Unido|2|sport
Usain Bolt|real|Jamaica|1|sport
Simone Biles|real|EUA|2|sport
Michael Jackson|real|EUA|1|music history
Madonna|real|EUA|1|music
Taylor Swift|real|EUA|1|music
Beyoncé|real|EUA|1|music
Elvis Presley|real|EUA|1|music history
Lady Gaga|real|EUA|2|music film
Eminem|real|EUA|2|music
Billie Eilish|real|EUA|2|music
Ariana Grande|real|EUA|2|music
Bruno Mars|real|EUA|2|music
Rihanna|real|Barbados|2|music
Shakira|real|Colômbia|2|music
Bad Bunny|real|Porto Rico|2|music
Anitta|real|Brasil|1|music
Ivete Sangalo|real|Brasil|1|music
Roberto Carlos (cantor)|real|Brasil|1|music
Marília Mendonça|real|Brasil|1|music history
Ludmilla|real|Brasil|2|music
Gusttavo Lima|real|Brasil|2|music
Luan Santana|real|Brasil|2|music
Pabllo Vittar|real|Brasil|2|music
Caetano Veloso|real|Brasil|2|music
Gilberto Gil|real|Brasil|2|music
Rita Lee|real|Brasil|2|music history
Chico Buarque|real|Brasil|2|music
Elis Regina|real|Brasil|2|music history
Freddie Mercury|real|Reino Unido|1|music history
John Lennon|real|Reino Unido|1|music history
Paul McCartney|real|Reino Unido|1|music
PSY|real|Coreia do Sul|2|music
Tom Cruise|real|EUA|1|film
Leonardo DiCaprio|real|EUA|1|film
Will Smith|real|EUA|1|film music
Dwayne Johnson|real|EUA|1|film sport combat
Angelina Jolie|real|EUA|1|film
Brad Pitt|real|EUA|1|film
Johnny Depp|real|EUA|1|film
Morgan Freeman|real|EUA|2|film
Samuel L. Jackson|real|EUA|2|film
Robert Downey Jr.|real|EUA|2|film marvel
Scarlett Johansson|real|EUA|2|film marvel
Jennifer Lawrence|real|EUA|2|film
Zendaya|real|EUA|2|film series
Keanu Reeves|real|Canadá|2|film
Jackie Chan|real|Hong Kong|1|film combat
Arnold Schwarzenegger|real|Áustria|2|film sport
Jim Carrey|real|Canadá|2|film
Adam Sandler|real|EUA|2|film
Selena Gomez|real|EUA|2|music series
Fernanda Montenegro|real|Brasil|2|film novela
Wagner Moura|real|Brasil|2|film series
Paulo Gustavo|real|Brasil|2|film tv history
Glória Pires|real|Brasil|2|novela film
Tony Ramos|real|Brasil|2|novela film
Taís Araújo|real|Brasil|2|novela series
Lázaro Ramos|real|Brasil|2|novela film
Xuxa|real|Brasil|1|tv music
Silvio Santos|real|Brasil|1|tv history
Faustão|real|Brasil|2|tv
Ana Maria Braga|real|Brasil|2|tv
Luciano Huck|real|Brasil|2|tv
Ratinho|real|Brasil|2|tv
Rodrigo Faro|real|Brasil|3|tv novela
Steve Harvey|real|EUA|2|tv
MrBeast|real|EUA|2|internet
Whindersson Nunes|real|Brasil|2|internet tv
Felipe Neto|real|Brasil|2|internet
Casimiro Miguel|real|Brasil|3|internet sport football
Lula|real|Brasil|1|politics
Jair Bolsonaro|real|Brasil|1|politics
Barack Obama|real|EUA|1|politics history
Donald Trump|real|EUA|1|politics tv
Nelson Mandela|real|África do Sul|1|politics history
Albert Einstein|real|Alemanha|1|science history
Marie Curie|real|Polônia|2|science history
Isaac Newton|real|Reino Unido|1|science history
Stephen Hawking|real|Reino Unido|2|science history
Steve Jobs|real|EUA|1|science history
Bill Gates|real|EUA|2|science
Elon Musk|real|África do Sul|1|science
Cleópatra|real|Egito|1|history politics
Napoleão Bonaparte|real|França|1|history politics
Mickey Mouse|fictional|EUA|1|cartoon animal hero disney
Minnie Mouse|fictional|EUA|2|cartoon animal disney
Pato Donald|fictional|EUA|1|cartoon animal disney
Pateta|fictional|EUA|2|cartoon animal disney
Bob Esponja|fictional|EUA|1|cartoon animal hero spongebob
Patrick Estrela|fictional|EUA|2|cartoon animal spongebob
Lula Molusco|fictional|EUA|2|cartoon animal spongebob
Homer Simpson|fictional|EUA|1|cartoon simpsons
Bart Simpson|fictional|EUA|2|cartoon simpsons
Lisa Simpson|fictional|EUA|2|cartoon simpsons
Pernalonga|fictional|EUA|1|cartoon animal hero
Tom (Tom e Jerry)|fictional|EUA|1|cartoon animal
Jerry (Tom e Jerry)|fictional|EUA|1|cartoon animal
Scooby-Doo|fictional|EUA|1|cartoon animal hero
Pica-Pau|fictional|EUA|2|cartoon animal hero
Shrek|fictional|EUA|1|film cartoon hero magic
Burro (Shrek)|fictional|EUA|2|film cartoon animal
Elsa (Frozen)|fictional|EUA|1|film cartoon hero magic disney
Simba|fictional|EUA|1|film cartoon animal hero disney
Woody (Toy Story)|fictional|EUA|1|film cartoon hero disney
Buzz Lightyear|fictional|EUA|1|film cartoon hero disney
Batman|fictional|EUA|1|film comic hero dc
Superman|fictional|EUA|1|film comic hero dc magic
Mulher-Maravilha|fictional|EUA|1|film comic hero dc magic
Coringa|fictional|EUA|1|film comic villain dc
Harley Quinn|fictional|EUA|2|film comic villain dc
Homem-Aranha|fictional|EUA|1|film comic hero marvel magic
Homem de Ferro|fictional|EUA|1|film comic hero marvel
Capitão América|fictional|EUA|1|film comic hero marvel
Hulk|fictional|EUA|1|film comic hero marvel magic
Thor|fictional|EUA|1|film comic hero marvel magic
Thanos|fictional|EUA|1|film comic villain marvel magic
Pantera Negra|fictional|EUA|2|film comic hero marvel
Wolverine|fictional|EUA|2|film comic hero marvel magic
Darth Vader|fictional|EUA|1|film villain starwars magic
Luke Skywalker|fictional|EUA|1|film hero starwars magic
Yoda|fictional|EUA|1|film hero starwars magic
Princesa Leia|fictional|EUA|2|film hero starwars
Harry Potter|fictional|Reino Unido|1|film hero magic harrypotter
Hermione Granger|fictional|Reino Unido|1|film hero magic harrypotter
Lord Voldemort|fictional|Reino Unido|1|film villain magic harrypotter
Rony Weasley|fictional|Reino Unido|2|film hero magic harrypotter
Frodo Bolseiro|fictional|Reino Unido|1|film hero magic lotr
Gandalf|fictional|Reino Unido|1|film hero magic lotr
Gollum|fictional|Reino Unido|2|film magic lotr
R2-D2|fictional|EUA|2|film starwars robot hero
C-3PO|fictional|EUA|2|film starwars robot
WALL-E|fictional|EUA|2|film cartoon disney robot hero
Optimus Prime|fictional|EUA|2|film cartoon robot hero
Mario|fictional|Japão|1|game hero mario
Luigi|fictional|Japão|1|game hero mario
Princesa Peach|fictional|Japão|2|game hero mario
Bowser|fictional|Japão|1|game villain mario
Sonic|fictional|Japão|1|game animal hero
Pikachu|fictional|Japão|1|anime game animal hero pokemon magic
Ash Ketchum|fictional|Japão|1|anime game hero pokemon
Charizard|fictional|Japão|2|anime game animal pokemon magic
Goku|fictional|Japão|1|anime hero dragonball combat magic
Vegeta|fictional|Japão|1|anime dragonball combat magic
Freeza|fictional|Japão|2|anime villain dragonball combat magic
Naruto Uzumaki|fictional|Japão|1|anime hero naruto combat magic
Sasuke Uchiha|fictional|Japão|1|anime naruto combat magic
Sakura Haruno|fictional|Japão|2|anime naruto combat magic
Monkey D. Luffy|fictional|Japão|1|anime hero combat magic
Roronoa Zoro|fictional|Japão|2|anime combat
Satoru Gojo|fictional|Japão|2|anime combat magic
Tanjiro Kamado|fictional|Japão|2|anime hero combat
Levi Ackerman|fictional|Japão|2|anime combat
Chaves|fictional|México|1|series hero
Quico|fictional|México|2|series
Dona Florinda|fictional|México|2|series
Chapolin Colorado|fictional|México|1|series hero
Mônica|fictional|Brasil|1|cartoon comic hero
Cebolinha|fictional|Brasil|1|cartoon comic
Cascão|fictional|Brasil|2|cartoon comic
Magali|fictional|Brasil|2|cartoon comic
Emília|fictional|Brasil|1|series hero magic
Saci (Sítio do Picapau Amarelo)|fictional|Brasil|2|series magic
Maria do Bairro|fictional|México|2|novela hero
Soraya Montenegro|fictional|México|2|novela villain
The Beatles|group|Reino Unido|1|music
Queen|group|Reino Unido|1|music
BTS|group|Coreia do Sul|1|music
BLACKPINK|group|Coreia do Sul|2|music
Coldplay|group|Reino Unido|2|music
U2|group|Irlanda|2|music
Legião Urbana|group|Brasil|2|music
Racionais MC's|group|Brasil|2|music
Mamonas Assassinas|group|Brasil|2|music history
Titãs|group|Brasil|2|music
`
  .trim()
  .split('\n');

const originTag: Record<string, string> = {
  Brasil: 'br',
  EUA: 'us',
  Japão: 'jp',
  'Reino Unido': 'uk',
  México: 'mx',
};

export const targets: Target[] = rows.map((line, index) => {
  const [name, type, origin, tier, rawTags] = line.split('|');
  const fameTier = Number(tier) as Target['fameTier'];
  const tags = [
    type === 'real' ? 'real' : type === 'group' ? 'group' : 'fictional',
    ...(originTag[origin] ? [originTag[origin]] : []),
    ...rawTags.split(' '),
  ];
  const baseline = Math.pow(1.6, 5 - fameTier);
  return {
    id: `t${String(index + 1).padStart(3, '0')}`,
    name,
    type: type as TargetType,
    origin,
    fameTier,
    tags,
    aliases: [],
    provenance: 'Curadoria editorial inicial; fatos ainda sem fonte individual',
    confidence: 'unverified',
    popularity: {
      br: baseline * (origin === 'Brasil' ? 1.4 : origin === 'EUA' ? 1.15 : 1),
      us: baseline * (origin === 'EUA' ? 1.4 : 1),
      global: baseline,
      source: 'Hipótese editorial para experimento; não é pesquisa de público',
    },
  };
});
