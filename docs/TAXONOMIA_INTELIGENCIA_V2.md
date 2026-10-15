# Taxonomia e evidência — inteligência V2

## Significado das perguntas

- `real`, `fictional`, `group`: tipos de alvo mutuamente exclusivos. Um grupo musical não é uma pessoa real individual, embora seus integrantes sejam pessoas.
- `br`, `us`, `jp`, `uk`, `mx`: país da pessoa real ou de origem da **obra** do personagem, nunca nacionalidade dentro da ficção. O campo `origin` só admite uma origem editorial nesta seed; um caso genuinamente multinacional exigirá um modelo mais rico.
- `cartoon`: desenho ocidental associado ao personagem; `anime`: anime ou mangá associado. Não são fatos mutuamente exclusivos: adaptações podem coexistir. Após uma resposta positiva, a pergunta genérica da outra mídia é omitida por ser pouco natural; isto não transforma a outra resposta em “Não”.
- `film`, `series`, `game`, `comic`, `novela`: associações de mídia, não uma partição exclusiva. `animatedfilm` é uma subdivisão específica de desenho animado e pode coexistir com cinema.
- `sport`/`football`/`basket`, franquias, papéis, ocupações e aparência podem sobrepor-se. Regras explícitas de implicação só derivam fatos necessários (por exemplo, futebol implica esporte; Viúva Negra implica Marvel). `Talvez` e `Não sei` não propagam fatos.

## Três estados e proveniência

`attribute()` devolve `yes`, `no` ou `unknown`. Tipo e origem estruturados admitem `no` por exclusividade. Uma pista fina admite `no` apenas se o alvo consta expressamente na lista de contrastes. Uma tag positiva ausente permanece `unknown` — não vira fato negativo. `attributeEvidence()` informa valor, origem e confiança: apenas algumas pistas têm fonte individual; as demais continuam editoriais e não verificadas. Este estado é mostrado nos testes, mas ainda precisa ser ampliado alvo por alvo.

O modelo probabilístico atribui verossimilhanças **não nulas** a dados ausentes. Essas hipóteses editoriais permitem investigar uma base incompleta, mas não tornam `unknown` um fato “Não” nem representam probabilidades calibradas. Respostas definitivas do jogador sobre tipo/origem restringem alvos incompatíveis; conflito entre respostas interrompe perguntas e palpites até o jogador revisar uma delas. Revisar uma resposta descarta as ações posteriores e devolve o orçamento correspondente.

## Seleção e limites

A pontuação usa ganho esperado, separação entre fichas plausíveis com peso reduzido para desconhecidos e custo de pergunta. Perguntas já respondidas, logicamente implicadas ou dominadas por outra com a mesma assinatura são excluídas. Uma pergunta com ganho menor que 0,0005 bit não é apresentada. Um ramo sem pergunta útil termina honestamente, sem palpite forçado. Os limiares e a espera entre palpites de `d651a14` permanecem intactos.

Também foi implementada uma busca limitada de duas etapas (três primeiras candidatas, oito continuações, respostas Sim/Não). Na comparação inicial ela não superou consistentemente a seleção de uma etapa, então a opção rápida continua ativa no jogo; a profundidade 2 permanece disponível para experimentos reproduzíveis. Isso evita custo adicional no celular sem evidência de ganho.

As hipóteses de resposta para `unknown` ainda não foram calibradas com pessoas. A simulação conservadora responde `Não sei` a dados ausentes; a simulação **editorial** responde `Não` somente quando uma tag ampla está ausente, como cenário separado, sem alterar o fato armazenado nem o jogo. Esse segundo cenário é uma hipótese otimista e pode errar em pessoas com carreira cruzada. Nenhum dos dois mede acurácia com jogadores reais. O conjunto de 36 fichas separado por índice serve como diagnóstico estável, não como garantia de generalização.

## Pendências de curadoria

Há 203 fichas e 65 perguntas nesta rodada, mas muitas fichas têm somente tags amplas sem fonte individual, e os níveis 4/5 ainda não têm alvos. São necessárias fontes por atributo, revisão de relações que coexistem, mais contrastes entre rivais e uma avaliação humana consentida antes de afirmar confiabilidade. Perguntas específicas recém-adicionadas usam fontes do Santos FC, Academia de Cinema, site de Chico Buarque e Marvel; listas de negativas não foram geradas automaticamente a partir dessas fontes.
