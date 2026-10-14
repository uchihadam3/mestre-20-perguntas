# Segunda etapa — experiência de jogo premium e inteligência confiável

## Estado observado em 2026-10-14

- Base experimental: 197 alvos e 42 perguntas, sem fontes individuais confirmadas.
- Academia: dois exercícios, XP, seis conquistas e missão diária.
- PWA disponível, mas ainda não validado visualmente em aparelhos reais.
- A primeira política de palpites tentava nomes a 72%, 50%, 34% e até 17%, ou na vigésima jogada. Isso contrariava a proposta do produto.
- A correção está nesta branch: só tentar nome com posterior muito alto e múltiplas evidências; uma tentativa negada exige quatro novas respostas decisivas e novo limiar, com máximo de duas tentativas. Nunca chutar por falta de perguntas úteis ou por ser a última ação.

## Objetivo

Criar um **jogo mobile-first**, não um painel web empresarial. A jogabilidade, memorização de perguntas e gamificação precisam funcionar em telas pequenas, com hierarquia visual inequívoca, toque confortável, interação rápida, feedback impactante e sem carrosséis ou rolagem horizontal/vertical desnecessária nas telas principais. Todo o jogo em português brasileiro.

## Prioridade P0 — raciocínio antes do palpite (bloqueia merge)

1. Política de palpite de confiança elevada: antes da pergunta 10 praticamente certeza (posterior >= 99,5% + pelo menos cinco respostas decisivas); da 11 em diante, >= 97,5% + pelo menos sete respostas decisivas; após palpite negado, >= 99,5% e no mínimo quatro novas respostas decisivas.
2. Não adivinhar nomes em sequência. No máximo duas tentativas em uma partida, mesmo após novas evidências. Não chutar nomes ao atingir 20 ações por obrigação: aceitar derrota honesta.
3. O palpite conta como ação; o limite de 20 inclui perguntas e palpites. Nunca falsificar vitória.
4. O posterior atual usa características correlacionadas e probabilidades editoriais: os números não são calibrados. Não exibir "certeza estatística de 99%" como se fosse medição real. Construir calibração com validação fora da amostra, dados consentidos e simulação de respostas humanas.
5. Se faltarem perguntas e não houver confiança, oferecer saída honesta e opção de ensinar o alvo. Não deixar partida travada.
6. Testes de cenários: personagem brasileiro, americano, fictício, grupo, respostas "talvez"/"não sei", negações contraditórias, 19/20 ações, candidato fora da base, dois personagens indistinguíveis, inferência após palpite incorreto.

## Prioridade P1 — UX realmente bonita no celular

- Direção visual: jogo de mistério/inteligência, com arte original, personagens simbólicos, um mascote detetive/mentor expressivo e identidade visual consistente. Sem copiar Akinator; criar linguagem própria.
- TELAS DE JOGO: em 320/360/375/390/430px e 200% de zoom, manter pergunta, contador e quatro respostas prioritariamente visíveis; utilizar um layout vertical compacto sem overflow horizontal. Em telas menores, usar ajustes de densidade e tipografia, sem empilhar painéis gigantes.
- HUD vivo: 20 posições discretas, estágio atual (investigar > afunilar > confirmar), progresso narrativo, resposta com animação curta e SFX original; acessibilidade e "reduzir movimento".
- Resultados com animação de conquista, medalhas por 5/10/15/20, desempenho comparado ao motor e opção de aprender as perguntas que fizeram diferença. Vitória não depende de sorte.
- Hub com uma ação principal bem destacada "Jogar", acesso a "Academia", "Livro Mestre" e "Laboratório" em navegação compacta. Sem listas infinitas, blocos de marketing genéricos ou scroll horizontal.
- Perfis/foco de uma mão; verificar touch targets >= 44px, safe areas Android/iPhone, teclado, contraste, navegação por teclado, leitores de tela e foco.
- Criar elementos visuais verdadeiramente personalizados (badge/medalhas, ícones, progressos) usando SVG/Canvas/CSS com economia de performance. Nada de dashboards cinzas ou app genérico de formulário. Performance boa em Android intermediário.
- Testes E2E Playwright com screenshots antes/depois em 320, 360, 375, 390, 430 e 768; auditar overflow, clipping, layout, touch hitboxes, FPS percebido e reduced motion. Se o ambiente não permitir navegador, registrar a pendência, sem alegar validação.

## Prioridade P2 — Academia realmente gamificada

- Trilhas de maestria com nó e ramificações da árvore, desbloqueio por aprendizado comprovado, feedback imediato e repetição espaçada.
- Quatro modalidades: "Qual é a próxima pergunta?", "Qual divide melhor?", "Encontre o erro da IA" e "Adivinhe como humano" (IA só responde), com desafios crescentes e explicação de ganho de informação.
- Maestria não é XP inflado. Medir recordação atrasada, acerto, velocidade e transferência para casos não vistos; progresso com esquecimento suave.
- Conquistas significativas (primeiro acerto em 10, 5, sem "não sei", sete dias de prática etc.), missões diárias equilibradas, sequência de dias, jornada de níveis, recompensas cosméticas e card de pós-partida "o que você aprendeu".
- Livro Mestre como árvore interativa visual com nós, rotas de revisão, quatro respostas por nó e versões fixas para memorização. Separar árvore humana memorizável de estratégia IA dinâmica; comparar performance.
- Audiovisual satisfatório, mas não poluente, com opção de silenciar e respeito a preferências de movimento.

## Prioridade P3 — curadoria e escalabilidade do conhecimento

- Modelo de cinco níveis de fama:
  1. ícones gigantes do mundo inteiro;
  2. muito famosos de qualquer país, inclusive cartoons americanos, animes, jogos japoneses e superstars internacionais;
  3. famosos BR/EUA + internacionais relevantes;
  4. moderadamente famosos BR/EUA, Brasil mais profundo;
  5. nichos predominantemente brasileiros, poucas exceções EUA.
- A fama da franquia é diferente da fama individual. BR maior prioridade; EUA segunda maior, muito peso em cinema/séries/atores/música/cartoon. Televisão e esportes americanos apenas se famosos. Novelas mexicanas conhecidas no Brasil (Chaves, Maria do Bairro), K-pop (BTS/PSY), Beatles, animes e games japoneses relevantes devem existir independentemente da origem.
- Armazenar evidência por atributo e proveniência confiável; marcar desconhecido sem convertê-lo em "não".
- Adicionar curadoria progressiva em lotes auditados e diversificados, com testes de distribuição por nível de fama, BR/EUA/mundo e categorias.
- Modelo de popularidade por escolha de brasileiros, com mistura conservadora de prioridade cultural e cobertura; não deixar a quantidade de registros de uma mídia enviesar automaticamente as perguntas.
- Expandir perguntas com clareza semântica, desambiguação de país de origem/nacionalidade fictícia, restrições por tipo de alvo e taxa de "não sei" aprendida.

## Entregas / rotina Codex

- Trabalhar sempre em branch GitHub + PR, commits frequentes, CI com lint, typecheck, format:check, testes e build.
- Não declarar "pronto" sem critérios testados. Manter docs/PROGRESSO.md com entregue / pendente / evidência e risco.
- Publicar versão de teste instalável somente após validação, sem substituir silenciosamente versão aprovada pelo usuário. Não alegar instalação em Android/iPhone sem teste real.
- Priorizar uma experiência vertical completa (Hub → Partida → Resultado → Academia) em vez de criar muitas telas vazias.
- Fazer uma rodada de audit visual após cada marco. Evitar rolagem desnecessária e nunca mascarar overflow apenas com `overflow: hidden`.
- Não copiar imagens protegidas de terceiros. Dados/arte devem ter origem permitida.
