# ADR 0001 — motor local e seed editorial

O primeiro marco usa inferência TypeScript pura no dispositivo, sem API nem LLM em tempo de partida. Isso mantém respostas rápidas, reproduzíveis e possíveis offline. O prior é mistura parametrizável 50/50 entre pesos editoriais e uniforme; os pesos não representam pesquisa real. A base e a árvore são experimentais até a auditoria factual e testes de jogadores. Estatísticas de simulação são identificadas separadamente das partidas reais.
