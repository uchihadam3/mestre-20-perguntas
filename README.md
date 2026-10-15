# Mestre das 20 Perguntas

PWA mobile-first de dedução e treino de estratégia, em português brasileiro. Pense em uma pessoa real, personagem ou grupo da base: o motor escolhe perguntas por ganho esperado de informação, atualiza probabilidades após cada resposta e dispõe de no máximo 20 ações, incluindo palpites.

## Jogar e instalar no celular

Abra [Mestre das 20 Perguntas](https://mestre-20-perguntas.uchihadam.chatgpt.site) no celular. O link é público para que o navegador consiga carregar os arquivos necessários à instalação.

- **Android, Chrome:** toque em **Instalar no celular** dentro do jogo. Se o navegador não mostrar o pedido automático, use o menu ⋮ → **Instalar aplicativo** ou **Adicionar à tela inicial**.
- **iPhone, Safari:** toque em Compartilhar → **Adicionar à Tela de Início**. O botão do jogo também mostra essas instruções.
- Se o link abrir dentro do navegador de outro aplicativo, use **Abrir no Chrome** no diálogo do jogo ou abra o link diretamente no Chrome/Safari.

É um PWA instalável, sem APK. Depois do primeiro acesso, os arquivos do jogo ficam disponíveis offline no dispositivo; partidas e progresso são guardados nele.

## Executar

Requer Node 24 e npm. No computador, rode `npm ci` e `npm run dev -- --host 0.0.0.0`; abra no celular o endereço **Network** mostrado pelo Vite, com os dois aparelhos na mesma rede. `npm run build` gera o PWA estático em `dist/`; sirva essa pasta por HTTPS ou localhost para instalar e testar o modo offline.

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

A versão 0.2.0 da inteligência V2 está no link acima. Em simulações conservadoras com respostas perfeitas e atributos desconhecidos tratados como “Não sei”, venceu 4/12 alvos fixos e 3/60 alvos espaçados; a base ainda precisa de curadoria. A instalação e a atualização em telefone real permanecem pendentes de teste.

- 203 alvos e 65 perguntas na versão 0.2.0 publicada. A maior parte dos atributos foi classificada editorialmente sem fonte individual; seis novos alvos têm [fontes primárias de franquia](docs/CURADORIA_SEGUNDA_ETAPA.md). Popularidade é hipótese de prior, não medição de público. A validação automática só atesta estrutura e contradições simples; a auditoria factual individual é trabalho pendente.
- Respostas `Sim`, `Não`, `Talvez`, `Não sei` são diferentes. `Não sei` não altera o posterior. Palpites recusados retiram o alvo; vitória exige confirmação.
- A árvore do Livro Mestre é recalculada com a mesma seed, identificada como experimental. O Laboratório compara 18 perguntas de ordem fixa contra seleção adaptativa sob respostas perfeitas, sem afirmar desempenho real.
- Progresso e partida usam `localStorage` versionado. Não há conta, sincronização ou coleta de dados. O service worker guarda recursos locais para uso offline após o primeiro carregamento por HTTPS/localhost.
- Sem imagens externas; marca e elementos gráficos são CSS/SVG originais.

Leia [docs/PROGRESSO.md](docs/PROGRESSO.md) para o que já funciona, resultados e próximos passos.
