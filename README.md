# Mestre das 20 Perguntas

PWA mobile-first de dedução e treino de estratégia, em português brasileiro. Pense em uma pessoa real, personagem ou grupo da base: o motor escolhe perguntas por ganho esperado de informação, atualiza probabilidades após cada resposta e dispõe de no máximo 20 ações, incluindo palpites.

## Executar

Requer Node 24 e npm. Rode `npm ci` e `npm run dev`; abra o endereço local mostrado pelo Vite no celular na mesma rede ou no navegador do computador. `npm run build` gera o PWA estático em `dist/`; sirva essa pasta por HTTPS ou localhost para instalar e testar o modo offline. Não há deploy público configurado.

## Comandos

| Comando                 | Função                               |
| ----------------------- | ------------------------------------ |
| `npm run typecheck`     | Tipagem TypeScript                   |
| `npm run lint`          | ESLint                               |
| `npm run format:check`  | Formatação Prettier                  |
| `npm run validate:data` | Consistência estrutural da seed      |
| `npm test`              | Testes do motor e da progressão      |
| `npm run benchmark`     | Simulação determinística de 12 alvos |
| `npm run build`         | Compilação de produção               |

## Estado e limites

- 197 alvos e 42 perguntas iniciais. Os atributos amplos foram classificados editorialmente, **sem fonte individual**. Popularidade é hipótese de prior, não medição de público. A validação automática só atesta estrutura e contradições simples; a auditoria factual individual é trabalho pendente.
- Respostas `Sim`, `Não`, `Talvez`, `Não sei` são diferentes. `Não sei` não altera o posterior. Palpites recusados retiram o alvo; vitória exige confirmação.
- A árvore do Livro Mestre é recalculada com a mesma seed, identificada como experimental. O Laboratório compara 18 perguntas de ordem fixa contra seleção adaptativa sob respostas perfeitas, sem afirmar desempenho real.
- Progresso e partida usam `localStorage` versionado. Não há conta, sincronização ou coleta de dados. O service worker guarda recursos locais para uso offline após o primeiro carregamento por HTTPS/localhost.
- Sem imagens externas; marca e elementos gráficos são CSS/SVG originais.

Leia [docs/PROGRESSO.md](docs/PROGRESSO.md) para o que já funciona, resultados e próximos passos.
