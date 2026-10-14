# Progresso — primeiro marco

## Implementado

- Aplicação React/TypeScript/Vite em português brasileiro, com interface dark-first para retrato, foco visível, botões grandes, áreas seguras e respeito a movimento reduzido.
- Partida contínua com salvamento após ações, quatro respostas, palpites explícitos, confirmação de vitória, medalhas e limite absoluto de 20 ações.
- Motor isolado da interface: prior editorial + uniforme em mistura 50/50, likelihoods não nulas, posterior, ganho esperado de informação e escolha de pergunta/risco de palpite.
- Seed provisória de 197 alvos e 42 perguntas, checagens estruturais, árvore navegável experimental e laboratório com dois métodos.
- Treinos de previsão de pergunta e de leitura de ficha, XP por acerto, revisão simples por intervalo, missão diária de três acertos, seis conquistas e histórico local.
- Manifesto e service worker para instalação/uso offline, após primeiro acesso por HTTPS/localhost.
- [Versão instalável publicada](https://mestre-20-perguntas.uchihadam.chatgpt.site) com acesso ao proprietário; botão de instalação no Hub e em Configurações, ícones PNG e instruções Android/iPhone.

## Verificações realizadas

- `npm run validate:data`: 197 alvos, 42 perguntas, 0 problemas estruturais.
- `npm test`: 9 testes passaram; incluem posterior, quatro respostas, rejeição de palpites, 20 ações e recompensas.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`: passaram localmente e no [CI remoto](https://github.com/uchihadam3/mestre-20-perguntas/actions/runs/38532294652).
- `npm run benchmark`: 12 alvos determinísticos da seed, respostas perfeitas: fixo 8/12, média de 16,00 ações nas vitórias; adaptativo 12/12, média de 9,83. Nenhuma vitória em até 5 neste recorte. Esses números **não** são de pessoas jogando.
- Teste visual em navegador, Playwright e medições em 320/360/375/390/430 px: **pendentes** porque este ambiente não disponibilizou controle de navegador. Não foram afirmados como aprovados.
- Publicação do Site confirmada pelo serviço de hospedagem: versão 1, estado `succeeded`, URL acima. O arquivo de publicação contém `index.html`, manifesto, service worker e ícones 192/512.

## Limites e riscos conhecidos

- Fichas e níveis de fama carecem de fontes individuais e revisão cultural/factual. A origem de personagem indica a obra, não a nacionalidade dentro da ficção. Algumas categorias são amplas ou subjetivas.
- O motor ainda não conhece alvos fora da seed nem distingue perfeitamente candidatos com os mesmos atributos. As taxas do Laboratório têm viés de seleção e respostas perfeitas.
- Dados locais não sincronizam entre aparelhos; privacidade do navegador pode apagar armazenamento. Sem backend, ranking, imagens licenciadas ou autenticação.
- O som é um bip leve sintetizado. Polimento audiovisual e teste de desempenho em telefone real estão pendentes.

## Próximo trabalho

1. Auditar cada alvo com fonte e confiança; rever popularidade Brasil/EUA/mundo sem reduzir ícones internacionais dos níveis 1 e 2.
2. Testar visualmente em aparelhos e larguras exigidas, teclado, zoom de 200%, fonte grande e leitor de tela; corrigir cortes e scroll.
3. Incluir Playwright E2E, cenários de respostas erradas/incertas, dados ausentes e casos fora da base.
4. Expandir perguntas discriminativas para candidatos equivalentes; calibrar palpites, custo cognitivo e prior com dados consentidos.
5. Refinar a Academia com versões de árvore e domínio por competência, depois expandir a base com curadoria auditada.

## Git

Branch de trabalho: `feat/primeiro-marco`. [PR #1, em rascunho](https://github.com/uchihadam3/mestre-20-perguntas/pull/1). A `main` contém apenas o README inicial. O PWA foi publicado em Sites a partir do mesmo código da branch; o projeto de hospedagem tem seu próprio registro de versão.
