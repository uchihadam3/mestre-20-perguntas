# Laboratório Autônomo

O celular **joga**, mas não otimiza a inteligência em segundo plano. A Academia e o Livro Mestre leem a estratégia revisada em `src/lab/strategy.json`. O laboratório externo simula partidas completas e produz propostas. Uma proposta não altera a estratégia jogável por si só.

## Executar um ciclo completo

```bash
npm ci
npm run lab:ci                 # recorte rápido, histórico de regressão e artefato para PR
npm run lab:nightly -- --repeats=8 --search=4 --max-ms=1200000
```

O comando amplo gera `reports/nightly.json` e `reports/nightly.md`: **simular → propor aberturas → selecionar na validação → testar no holdout → comparar → relatar**. `--seed=N`, `--repeats=N`, `--search=N`, `--max-ms=N` e `--output=CAMINHO` controlam custo e saída; inteiros positivos são obrigatórios. O orçamento em milissegundos limita a avaliação; uma execução parcial não é elegível à promoção. A mesma seed, coorte, cenário e distribuição são pareados entre a política atual e a proposta.

O conjunto é estratificado por nível de fama, Brasil/EUA/mundo e tipo (pessoa, personagem ou grupo), com IDs disjuntos em treino, validação e holdout. A busca de abertura e ramos consulta só o treino; a validação escolhe entre as aberturas candidatas; o holdout julga a vencedora sem ter selecionado a pergunta. **As fichas do holdout ainda fazem parte do catálogo de candidatos da IA**, como em um jogo real; o que ficou reservado são os alvos das partidas de avaliação. Cada cenário usa até 20 ações e a mesma política conservadora de palpites:

- `known`: atributos explicitamente conhecidos respondidos com Sim/Não; ausências com Não sei.
- `uncertain`: parte dos conhecidos vira Talvez por PRNG fixo; lacunas seguem Não sei.
- `noisy`: pequenas taxas de inversão, Talvez e Não sei; é uma hipótese de erro humano, não dados humanos.
- `outside`: o alvo é retirado do catálogo de candidatos daquela partida. Vitória falsa nunca é contada.

Compara perguntas fixas, divisão conhecida aproximadamente 50/50, política publicada por ganho de informação, busca de dois passos e árvore candidata de abertura. Registra acertos até 5/10/15/20, ações médias/medianas/p90, palpites incorretos, perguntas sem divisão, ganho menor que 0,01 bit, conflitos, parada antecipada, tempo, regiões e níveis. Agrupamentos de assinaturas idênticas identificam rivais que exigem curadoria factual; o relatório **não fabrica respostas**.

## Portão de promoção

A proposta precisa concluir o orçamento, ganhar no holdout até 20, não piorar até 10, palpites incorretos, conflitos ou perguntas sem divisão. Isso é **elegibilidade para revisão**, não promoção em produção: alguém precisa auditar os fatos, verificar o intervalo de resultados e integrar uma edição explícita de `src/lab/strategy.json`. O relatório versionado exibido no aplicativo é exploratório até então. O CI compara a política atual com `reports/regression.json` quando catálogo e coorte coincidem; mudanças na base pedem revisão dessa fixture.

As repetições com sementes diferentes geram milhares de partidas, mas não multiplicam o número de fichas distintas. Não há evidência de taxas reais de acerto de pessoas. A maior parte da base ainda não tem fontes atributo a atributo; resultados baixos devem gerar curadoria e novas perguntas, nunca confiança artificial ou palpites apressados.

## GitHub Actions

`.github/workflows/ci.yml` executa verificações e um recorte rápido em pushes/PRs, anexando JSON/Markdown. `.github/workflows/autonomous-lab.yml` tem `workflow_dispatch` e agendamento diário às **07:17 UTC**, limite de 30 minutos, orçamento interno de 20 minutos e artefatos retidos por 90 dias. Em **Actions → Laboratório Autônomo → Run workflow**, selecione a branch para a primeira execução. Depois da integração do arquivo de workflow na **branch padrão** do repositório, o cron roda sem botão. GitHub só agenda workflows presentes na branch padrão; um PR ainda aberto não ativa o cron. Em cada execução, abra **Artifacts → laboratorio-N** para os relatórios. O agendamento não cria commits nem atualiza o site automaticamente.

## Estado da árvore

`src/lab/strategy.json` é a versão jogável aprovada; `reports/nightly.json` é um experimento fixo para a tela de resultados. O Livro Mestre navega pela versão jogável, e a aba Laboratório mostra separadamente a primeira pergunta candidata, os ramos e a comparação. O botão “Simular agora” continua como uma demonstração local curta de 12 alvos; não treina o algoritmo.
