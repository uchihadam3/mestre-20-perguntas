# Changelog

## 0.3.0 — Laboratório Autônomo experimental

- Simulador de partidas completas com coortes de treino, validação e holdout, cenários de lacunas, dúvida, ruído e alvo fora da base; orçamento de CPU e seeds reproduzíveis.
- Comparação de roteiro fixo, divisão conhecida, política publicada, busca de dois passos e árvore de abertura. Relatórios JSON/Markdown, grupos indistinguíveis e portão de regressão.
- CI com relatório reduzido e workflow diário/manual com artefatos. Resultados versionados no Laboratório do jogo; estratégia da partida/Livro permanece aprovada separadamente.
- A versão PWA usa cache `mestre20-v8`. Validação de instalação em aparelho real ainda pendente.

## 0.2.0 — inteligência V2 experimental

- Taxonomia explícita, respostas desconhecidas sem negativas implícitas e correção de respostas contraditórias.
- Perguntas redundantes/dominadas são descartadas e o ganho mínimo é aplicado antes do ranking; quatro novas pistas com fontes primárias.
- Base de 203 alvos e 65 perguntas; 30 testes e benchmark de partidas completas.
- Publicada como versão 6 do Site público, com cache PWA `mestre20-v7`. A instalação em aparelho real ainda precisa ser testada.

## 0.1.0 — primeiro marco experimental

- PWA responsivo com Hub, duelo, resultado, Academia, Livro Mestre, Laboratório e configurações.
- Motor bayesiano determinístico com quatro respostas, prior misto, ganho esperado de informação e limite de 20 ações.
- Seed editorial de 197 alvos e 42 perguntas, validador estrutural e benchmark reproduzível.
- Progresso local, missão diária, dois exercícios praticáveis, repetição simples e seis conquistas verificáveis.
- Testes unitários e workflow CI.
- Instalação pelo navegador com ícones PNG, instruções Android/iPhone e publicação com acesso à conta do proprietário.
- Corrigido acesso público ao PWA para permitir ao navegador carregar manifesto, service worker e ícones; orientação para abrir no Chrome quando o link iniciar dentro de outro aplicativo.

# Segunda etapa — investigação e Academia (em desenvolvimento)

- Preservada a política prudente de palpites do commit `d651a14`.
- Perguntas mais discriminativas para rivais, com atributo explícito desconhecido onde não houve curadoria.
- Lume, mentor vetorial original, HUD de pistas, arquivo pós-partida e ajustes da partida no celular.
- Academia ampliada para quatro desafios, memória espaçada por revisão vencida, missão com pistas distintas e duas novas conquistas.
