# Laboratório Autônomo — simulação ampla

Seed 20261015; 203 fichas, 65 perguntas; coortes treino/validação/holdout 134/37/32. Cenários pareados usam os mesmos alvos e seeds por política. O holdout não seleciona perguntas. Popularidade e atributos são hipóteses editoriais, não respostas humanas.

## Estratégias na validação (respostas conhecidas)

| Política / cenário | Acertos | ≤5 | ≤10 | ≤15 | ≤20 | Ações médias | Palpites errados | Sem divisão | Ganho < 0,01 | Conflitos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| fixed | 0/37 | 0 | 0 | 0 | 0 | 7.3 | 0 | 0 | 5 | 0 |
| split | 2/37 | 0 | 0 | 2 | 2 | 16.2 | 0 | 0 | 111 | 0 |
| current | 2/37 | 0 | 0 | 2 | 2 | 16.4 | 0 | 0 | 118 | 0 |
| lookahead | 2/37 | 0 | 0 | 2 | 2 | 16.5 | 0 | 0 | 121 | 0 |

## Primeiras perguntas candidatas na validação

| Política / cenário | Acertos | ≤5 | ≤10 | ≤15 | ≤20 | Ações médias | Palpites errados | Sem divisão | Ganho < 0,01 | Conflitos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| É uma pessoa real? | 2/37 | 0 | 0 | 2 | 2 | 16.4 | 0 | 0 | 118 | 0 |
| É um personagem fictício? | 2/37 | 0 | 0 | 2 | 2 | 16.4 | 0 | 0 | 111 | 0 |
| Sua origem é brasileira? | 2/37 | 0 | 0 | 2 | 2 | 16.6 | 0 | 0 | 117 | 0 |

Escolha exploratória: **É uma pessoa real?**.
Houve empate em acertos na validação; nenhuma primeira pergunta superior foi comprovada.

| Resposta | Massa no treino | Próxima pergunta | Terceiras se a próxima for Sim / Não / Talvez / Não sei |
|---|---:|---|---|
| yes | 55.3% | Sua origem é brasileira? | É conhecido pelo esporte? / Sua origem é dos Estados Unidos? / Sua origem é dos Estados Unidos? / Sua origem é dos Estados Unidos? |
| no | 44.7% | Sua origem é dos Estados Unidos? | É de um desenho animado ocidental? / Sua origem é brasileira? / É de um desenho animado ocidental? / Sua origem é brasileira? |
| maybe | 0.0% | Sua origem é brasileira? | É associado à música? / É um personagem fictício? / Sua origem é dos Estados Unidos? / Sua origem é dos Estados Unidos? |
| dont_know | 0.0% | É um personagem fictício? | Sua origem é dos Estados Unidos? / Sua origem é brasileira? / Sua origem é dos Estados Unidos? / Sua origem é brasileira? |

## Holdout — mesma distribuição e seeds

| Política / cenário | Acertos | ≤5 | ≤10 | ≤15 | ≤20 | Ações médias | Palpites errados | Sem divisão | Ganho < 0,01 | Conflitos |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| política publicada | 0/640 | 0 | 0 | 0 | 0 | 17.6 | 0 | 0 | 1900 | 0 |
| abertura candidata | 0/640 | 0 | 0 | 0 | 0 | 17.6 | 0 | 0 | 1900 | 0 |
| atual / known | 0/160 | 0 | 0 | 0 | 0 | 16.8 | 0 | 0 | 525 | 0 |
| atual / uncertain | 0/160 | 0 | 0 | 0 | 0 | 18.5 | 0 | 0 | 478 | 0 |
| atual / noisy | 0/160 | 0 | 0 | 0 | 0 | 17.8 | 0 | 0 | 417 | 0 |
| atual / outside | 0/160 | 0 | 0 | 0 | 0 | 17.3 | 0 | 0 | 480 | 0 |
| candidata / known | 0/160 | 0 | 0 | 0 | 0 | 16.8 | 0 | 0 | 525 | 0 |
| candidata / uncertain | 0/160 | 0 | 0 | 0 | 0 | 18.5 | 0 | 0 | 478 | 0 |
| candidata / noisy | 0/160 | 0 | 0 | 0 | 0 | 17.8 | 0 | 0 | 417 | 0 |
| candidata / outside | 0/160 | 0 | 0 | 0 | 0 | 17.3 | 0 | 0 | 480 | 0 |

Promoção automática: **não aprovada**. Sem ganho robusto em holdout; manter a política publicada até curadoria e nova validação. A estratégia publicada não é alterada por este comando nem pelo agendamento.

## Cobertura e limites

- Alvos indistinguíveis: 39 grupos. Prioridade de curadoria:
  - Leonardo DiCaprio / Brad Pitt / Johnny Depp / Morgan Freeman / Samuel L. Jackson / Adam Sandler — Pesquisar filmografia, prêmios e papéis em fontes oficiais antes de criar perguntas.
  - Madonna / Taylor Swift / Beyoncé / Ariana Grande — Pesquisar biografia, período e obra em fontes primárias antes de cadastrar uma pista.
  - Homem-Aranha / Hulk / Thor / Wolverine — Pesquisar obra, papel narrativo e traços exclusivos em fonte oficial; cadastrar Sim e Não com evidências.
  - Roberto Carlos (cantor) / Caetano Veloso / Gilberto Gil — Pesquisar biografia, período e obra em fontes primárias antes de cadastrar uma pista.
  - Nelson Mandela / Cleópatra / Napoleão Bonaparte — Pesquisar biografia, período e obra em fontes primárias antes de cadastrar uma pista.
  - Homem de Ferro / Capitão América / Pantera Negra — Pesquisar obra, papel narrativo e traços exclusivos em fonte oficial; cadastrar Sim e Não com evidências.
  - Mario / Luigi / Princesa Peach — Pesquisar obra, papel narrativo e traços exclusivos em fonte oficial; cadastrar Sim e Não com evidências.
  - The Beatles / Queen / Coldplay — Pesquisar biografia, período e obra em fontes primárias antes de cadastrar uma pista.
- Fichas sem resposta explícita são respondidas “Não sei”. O cenário “fora” remove o alvo da base de candidatos; não atribui um palpite correto fictício. “Talvez” e ruído são simulados por seeds, não amostra humana.
- Há apenas 32 fichas diferentes no holdout e 5 repetição(ões) por cenário. Mais partidas não criam novas pessoas nem corrigem lacunas factuais. Não interpretar as taxas como confiabilidade real.
- Tempo do comparativo: atual 263545 ms; candidata 268865 ms. JSON contém recortes por região e fama.
