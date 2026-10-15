# Progresso — Mestre das 20 Perguntas

## Laboratório Autônomo — versão 0.3.0 (2026-10-15)

- Implementado simulador headless de partidas completas com seeds fixas e orçamento configurável, coortes separadas, quatro cenários (conhecido, incerto, ruidoso e fora da base), cinco políticas comparadas, árvore de abertura de até três perguntas e ramificações Sim/Não/Talvez/Não sei. A estratégia jogável permanece versionada separadamente; o relatório não modifica palpites nem promove parâmetros sozinho. Metodologia e comandos em [Laboratório Autônomo](LABORATORIO_AUTONOMO.md).
- Execução ampla local: **1.539 partidas completas** na comparação e busca; no holdout de **32 fichas distintas**, cinco repetições por cenário, a política atual venceu **0/640** e a abertura candidata **0/640**. Na validação, atual, split e lookahead empataram em **2/37**; fixo fez **0/37**. As três aberturas testadas empataram em **2/37**. Portanto **não há primeira pergunta vencedora confiável**, e nenhuma estratégia nova foi aprovada. A árvore exploratória começa com “É uma pessoa real?”; Sim → origem brasileira, Não → origem dos EUA, Talvez → origem brasileira, Não sei → personagem fictício; há terceiros por cada resposta ao segundo nó no [relatório detalhado](../reports/nightly.md). Esse resultado indica cobertura factual insuficiente, não incapacidade de aprender por falta de partidas humanas.
- O relatório encontrou **39 grupos de fichas indistinguíveis** pelas perguntas cadastradas, incluindo seis atores de cinema com a mesma assinatura. Gera recomendações de pesquisa de atributos sem inventar respostas. Em 640 jogos da política atual houve **0 palpites errados, 0 perguntas sem divisão e 0 conflitos**, mas **1.900 perguntas com ganho inferior a 0,01 bit** e 362 partidas pararam cedo sem evidência para palpite. Repetições não criam novas fichas; 0/640 não representa taxa da população.
- CI executa recorte reduzido e compara a fixture histórica para regressões, além de salvar JSON/Markdown. Workflow diário/manual gera artefatos com limite de 30 minutos. O agendamento só se ativa após o workflow chegar à branch padrão do GitHub; enquanto esta etapa estiver em PR, o disparo manual da branch está disponível.
- 36 testes passaram localmente, incluindo coortes, lacunas, fora da base e preservação da política. Formatação, tipos, lint, validação da base (203/65, 0 erros), build e recorte de CI com comparação da fixture também passaram localmente. Inspeção visual em 320–430 px, acessibilidade em leitor de tela e instalação em aparelho real continuam pendentes neste ambiente.

## Inteligência V2 — PR em revisão (2026-10-15)

- Partindo do merge do PR #3 (`7d09cda`) e preservando `d651a14`, a taxonomia deixou de tratar cartoon e anime como exclusões lógicas. Tipo e país da pessoa/obra continuam categorias exclusivas. A ausência de uma tag positiva agora produz **desconhecido**, não um “Não” determinístico; detalhes em [Taxonomia V2](TAXONOMIA_INTELIGENCIA_V2.md).
- Conflitos de respostas definitivas interrompem a investigação e oferecem correção de uma resposta anterior, descartando ações posteriores e devolvendo seu orçamento. `Talvez`/`Não sei` não criam deduções. A pergunta selecionada traz explicação opcional com exemplos de fichas que distingue; a aparência, Academia e PWA existentes foram preservados.
- Ranking de perguntas elimina implicações e assinaturas de resposta dominadas; cálculo de ganho inclui restrições duras de tipo/país. Busca limitada em duas etapas foi implementada e comparada, mas ficou desativada por padrão: empatou em vitórias no recorte editorial (**9/12** e **2/36**) e custa mais no celular.
- Base: **203 alvos / 65 perguntas**. Quatro pistas específicas positivas foram checadas em fontes primárias (Santos FC, Academia de Cinema, Chico Buarque e Marvel), sem completar negativas automaticamente. A validação confere referências a alvos, perguntas e contradições no cadastro de pistas. Ainda faltam fontes por atributo na maior parte da seed.
- Avaliação de partidas completas com até 20 ações, respostas perfeitas conforme a informação da ficha: no PR #3, o benchmark antigo era **9/12** fixos e **11/60** espaçados, mas transformava tags ausentes em “Não”. Com lacunas honestamente respondidas “Não sei”, V2 registra **4/12** e **3/60**; no cenário editorial hipotético que responde “Não” a tags amplas ausentes, **9/12**, **10/60** e **2/36** em um grupo separado. Não são cenários diretamente comparáveis nem prova de confiabilidade. O resultado mostra que a cobertura da base ainda não atende à meta de inteligência.
- Uma pergunta com ganho quase zero podia ocupar o primeiro lugar pelo custo baixo e encerrar a investigação, mesmo havendo outra útil. O filtro agora ocorre antes da ordenação: o cenário editorial fixo subiu de **7/12 para 9/12** nesta branch. A auditoria contabilizou **0 perguntas sem divisão** e **0 contradições** nas partidas adaptativas, mas 198 perguntas de ganho abaixo de 0,01 bit no recorte conservador de 60 alvos. O corte ativo é 0,0005 bit; essa cauda fraca precisa de mais fichas auditadas e uma política de parada melhor. O roteiro fixo desperdiçou 105 perguntas sem divisão nos 12 casos, enquanto o adaptativo não apresentou nenhuma nessa definição.
- `format:check`, `typecheck`, `lint`, **30 testes**, `validate:data` (0 problemas), `build` e benchmark passaram localmente após o ajuste; o [CI do commit funcional passou](https://github.com/uchihadam3/mestre-20-perguntas/actions/runs/38666975396). Teste visual em 320–430 px, acessibilidade em leitor de tela, instalação em aparelho e testes humanos permanecem pendentes. A versão jogável foi atualizada após essa validação; detalhes da publicação abaixo.

## Publicação da inteligência V2 (2026-10-15)

- Versão do aplicativo **0.2.0**, Site público **versão 6**: [jogar e instalar](https://mestre-20-perguntas.uchihadam.chatgpt.site). A implantação `appgdep_6ad042f0dc8c8191be5a8c9df7cc7298` retornou `succeeded` com o pacote da revisão `779d5bf99e924ccfcdebfec768a1a02e74a36b2b` do repositório de hospedagem. O service worker passou a usar `mestre20-v7` para substituir o cache anterior.
- Validação local desse pacote: `format:check`, `typecheck`, `lint`, 30 testes, 203 alvos/65 perguntas sem erros estruturais e `build`. O arquivo de implantação contém `index.html`, manifesto, `sw.js`, ícones PNG de 192/512 px e os bundles compilados. A verificação pública com `curl` confirmou HTTP 200 e tipos corretos para página, manifesto, `sw.js` (`mestre20-v7`) e ícones 192/512 px; o HTML aponta para o bundle compilado desta versão. O cliente Python genérico recebeu 403, mas a verificação com `curl` passou. A publicação e esses arquivos acessíveis ainda não substituem o teste de instalação em aparelho real. Ainda é necessário conferir no Chrome Android e Safari iOS, inclusive atualização de instalação existente.
- Este é um lançamento **experimental**: no benchmark com dados explicitamente conhecidos, 4/12 e 3/60 partidas simuladas foram vencidas; muitas fichas ainda carecem de pistas verificadas. Não inferir eficácia real a partir do estado `succeeded` ou dos testes estruturais.

## Segunda etapa em andamento (2026-10-14)

- Preservada a política de palpites do commit `d651a14`: limiares 99,5%/97,5%, evidências mínimas, intervalo após erro, no máximo dois palpites e nenhuma tentativa forçada na ação 20.
- Seleção de pergunta considera a massa de candidatos plausíveis separada por respostas conhecidas, além do ganho esperado. Adicionadas 17 perguntas de discriminação para grupos próximos e uma de franquia; pistas sem anotação explícita ficam como **desconhecidas**, sem virar “Não”. Parte das pistas foi conferida em fontes primárias; o restante ainda requer auditoria. O prior editorial agora distribui peso por grupos Brasil/EUA/mundo antes de distribuir por fichas, reduzindo o viés causado só pelo volume de registros.
- Benchmark determinístico com respostas perfeitas, **mesmos 12 alvos fixos**: estratégia adaptativa passou de **1/12** (após a correção conservadora de palpites e antes das novas pistas) para **8/12**. A base continua insuficiente para confiabilidade pública; isso não mede pessoas reais. Perguntas fixas: 0/12 nesta amostra.
- Amostra mais ampla e espaçada de 60 fichas: **10/60** vitórias simuladas. Esse resultado limita fortemente qualquer alegação de precisão; alvos com assinaturas iguais ou quase iguais precisam de novas pistas verificadas. Ambos os benchmarks usam respostas perfeitas, não sessões humanas nem validação fora da amostra.
- Interface: Lume, mentor original em SVG; HUD da investigação e feedback de resposta; arquivo pós-partida mostra até três pistas informativas segundo a base. Densidade da tela de jogo ajustada para alturas menores e rolagem lateral mascarada no contêiner principal removida.
- Academia: quatro modos jogáveis (previsão, leitura, divisão e erro da IA), 8 conquistas, três métricas de memorização. A missão diária agora exige três pistas diferentes; repetir cedo a mesma pista não acelera revisão nem gera XP de novo no dia. Maestria exige revisões vencidas em dias futuros.
- Revisão após publicação de teste: treino de leitura distingue dado ausente de resposta “Não”; divisão compara pares de candidatos e erro da IA alterna três situações. Os controles pequenos receberam alvo de toque de 44px.
- Verificações da versão 5: `validate:data` (203 alvos, 60 perguntas, 0 problemas estruturais), `format:check`, `typecheck`, `lint`, `test` (18 aprovados), `build` e benchmark passaram localmente. O [CI da branch também passou](https://github.com/uchihadam3/mestre-20-perguntas/actions/runs/38592954382).
- [Site público atualizado para a versão 5](https://mestre-20-perguntas.uchihadam.chatgpt.site), implantação `succeeded`; página, manifesto, service worker `mestre20-v6` e ícones 192/512 responderam HTTP 200 com tipos corretos. Testes de viewport, screenshots, acessibilidade em leitor de tela e instalação em aparelho real **pendentes** neste ambiente sem controle de navegador. Publicação é versão de teste, sem alegação de aprovação visual no celular.
- A base tem **203 alvos e 60 perguntas**; seis alvos com fontes primárias no [lote de curadoria](CURADORIA_SEGUNDA_ETAPA.md). Distribuição provisória: 98 nível 1, 103 nível 2, 2 nível 3, nenhum ainda nos níveis 4 e 5. Curadoria individual do restante, calibração com respostas humanas, modo humano versus IA e árvore estável para memorização permanecem pendentes.

## Primeiro marco (registro histórico)

### Implementado

- Aplicação React/TypeScript/Vite em português brasileiro, com interface dark-first para retrato, foco visível, botões grandes, áreas seguras e respeito a movimento reduzido.
- Partida contínua com salvamento após ações, quatro respostas, palpites explícitos, confirmação de vitória, medalhas e limite absoluto de 20 ações.
- Motor isolado da interface: prior editorial + uniforme em mistura 50/50, likelihoods não nulas, posterior, ganho esperado de informação e escolha de pergunta/risco de palpite.
- Seed provisória de 197 alvos e 42 perguntas, checagens estruturais, árvore navegável experimental e laboratório com dois métodos.
- Treinos de previsão de pergunta e de leitura de ficha, XP por acerto, revisão simples por intervalo, missão diária de três acertos, seis conquistas e histórico local.
- Manifesto e service worker para instalação/uso offline, após primeiro acesso por HTTPS/localhost.
- [Versão instalável publicada](https://mestre-20-perguntas.uchihadam.chatgpt.site) com acesso público; botão de instalação no Hub e em Configurações, ícones PNG e instruções Android/iPhone.

### Verificações realizadas naquele marco

- `npm run validate:data`: 197 alvos, 42 perguntas, 0 problemas estruturais.
- `npm test`: 9 testes passaram; incluem posterior, quatro respostas, rejeição de palpites, 20 ações e recompensas.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`: passaram localmente e no [CI remoto da correção de instalação](https://github.com/uchihadam3/mestre-20-perguntas/actions/runs/38535917540).
- `npm run benchmark`: 12 alvos determinísticos da seed, respostas perfeitas: fixo 8/12, média de 16,00 ações nas vitórias; adaptativo 12/12, média de 9,83. Nenhuma vitória em até 5 neste recorte. Esses números **não** são de pessoas jogando.
- Teste visual em navegador, Playwright e medições em 320/360/375/390/430 px: **pendentes** porque este ambiente não disponibilizou controle de navegador. Não foram afirmados como aprovados.
- Publicação do Site confirmada pelo serviço de hospedagem: versão 2, estado `succeeded`, URL acima. O arquivo de publicação contém `index.html`, manifesto, service worker e ícones 192/512.
- O primeiro acesso restrito respondeu HTTP 401 fora da sessão; após tornar o Site público, `index.html`, manifesto, service worker e ícones passaram a responder HTTP 200 com tipos corretos. A instalação em aparelho real ainda precisa ser confirmada pelo usuário.

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
