import { useEffect, useMemo, useState } from 'react';
import type { Answer, Game, Profile, Target } from '../domain/types';
import { targets } from '../data/targets';
import { attribute, questions } from '../data/questions';
import { answerGame, choose, medal, newGame, posterior, rankQuestions } from '../engine/inference';
import { simulate, type Benchmark } from '../engine/simulate';
import { badges, finish, load, save, train } from '../persistence/storage';

type Page = 'hub' | 'game' | 'result' | 'academy' | 'book' | 'lab' | 'settings';
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type Exercise = {
  id: string;
  mode: 'memory' | 'reading';
  prompt: string;
  options: string[];
  correct: string;
  note: string;
};
const answers: { value: Answer; label: string; hint: string; icon: string }[] = [
  { value: 'yes', label: 'Sim', hint: 'Tenho certeza', icon: '✓' },
  { value: 'no', label: 'Não', hint: 'Não combina', icon: '×' },
  { value: 'maybe', label: 'Talvez', hint: 'É ambíguo', icon: '≈' },
  { value: 'dont_know', label: 'Não sei', hint: 'Sem informação', icon: '?' },
];
const nav: { page: Page; label: string; icon: string }[] = [
  { page: 'hub', label: 'Início', icon: '◆' },
  { page: 'academy', label: 'Academia', icon: '✦' },
  { page: 'book', label: 'Livro', icon: '▤' },
  { page: 'lab', label: 'Laboratório', icon: '◈' },
];
const rank = (xp: number) =>
  xp >= 900 ? 'Mestre' : xp >= 400 ? 'Estrategista' : xp >= 120 ? 'Investigador' : 'Aprendiz';
const nextRank = (xp: number) => (xp < 120 ? 120 : xp < 400 ? 400 : xp < 900 ? 900 : 1400);
const origin = (t: Target) =>
  `${t.type === 'real' ? 'Pessoa real' : t.type === 'group' ? 'Grupo' : 'Personagem'} · ${t.origin}`;
function getExercise(mode: Exercise['mode'], step: number): Exercise {
  if (mode === 'memory') {
    const target = targets[((step % 12) * 17 + 7) % targets.length];
    const first = choose(newGame('lesson'), targets, questions);
    const game =
      first?.kind === 'question'
        ? answerGame(newGame('lesson'), first, attribute(target, first.question) as Answer)
        : newGame('lesson');
    const top = rankQuestions(game, targets, questions).slice(0, 3);
    const options = top
      .map((r) => r.question.text)
      .sort((a, b) => ((a.charCodeAt(0) + step * 7) % 13) - ((b.charCodeAt(0) + step * 7) % 13));
    return {
      id: `memory:${target.id}`,
      mode,
      prompt:
        first?.kind === 'question'
          ? `Depois de responder “${attribute(target, first.question) === 'yes' ? 'Sim' : attribute(target, first.question) === 'no' ? 'Não' : 'Não sei'}” a “${first.question.text}”, qual pergunta o motor escolheria?`
          : 'Qual pergunta abre melhor esta base?',
      options,
      correct: top[0].question.text,
      note: 'Compare o ganho de informação dos candidatos; esta escolha vale apenas para a base atual.',
    };
  }
  const target = targets[((step % 24) * 23 + 3) % targets.length];
  const candidates = questions.filter((q) => !q.applicable || q.applicable.includes(target.type));
  const q = candidates[((step % 24) * 7 + 9) % candidates.length];
  const correct = attribute(target, q) === 'yes' ? 'Sim' : 'Não';
  return {
    id: `reading:${q.id}:${target.id}`,
    mode,
    prompt: `Se o alvo fosse ${target.name}, como você responderia a “${q.text}”?`,
    options: ['Sim', 'Não', 'Talvez', 'Não sei'],
    correct,
    note: `Na ficha experimental: ${origin(target)}. A resposta registrada é “${correct}”.`,
  };
}

export default function App() {
  const [initial] = useState(load);
  const [game, setGame] = useState<Game | null>(initial.game);
  const [profile, setProfile] = useState<Profile>(initial.profile);
  const [page, setPage] = useState<Page>(initial.game?.status === 'playing' ? 'game' : 'hub');
  const [book, setBook] = useState<Game>(newGame('book'));
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exerciseStep, setExerciseStep] = useState(0);
  const [exerciseAnswer, setExerciseAnswer] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmark[] | null>(null);
  const [benchmarkBusy, setBenchmarkBusy] = useState(false);
  const [error, setError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  );
  useEffect(() => {
    save({ version: 1, game, profile });
  }, [game, profile]);
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallHelp(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const choice = useMemo(() => (game ? choose(game, targets, questions) : null), [game]);
  const bookChoice = useMemo(() => choose(book, targets, questions), [book]);
  const bookDist = useMemo(() => posterior(book, targets, questions), [book]);
  const dailyCount = Math.min(profile.daily.count, 3);
  const remainingXp = nextRank(profile.xp) - profile.xp;
  const tierStart = profile.xp >= 900 ? 900 : profile.xp >= 400 ? 400 : profile.xp >= 120 ? 120 : 0;
  const xpPercent = Math.min(100, (100 * (profile.xp - tierStart)) / (nextRank(profile.xp) - tierStart));

  function start() {
    setError('');
    setGame(newGame());
    setPage('game');
  }
  async function install() {
    if (!installPrompt) {
      setInstallHelp(true);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
    } catch {
      setInstallPrompt(null);
      setInstallHelp(true);
    }
  }
  function beep(frequency: number) {
    if (!profile.sound) return;
    try {
      const AudioContextCtor = window.AudioContext;
      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => void ctx.close();
    } catch {
      /* Audio is optional. */
    }
  }
  function act(response: Answer | boolean) {
    if (!game || !choice) return;
    const next = answerGame(game, choice, response);
    setGame(next);
    if (next.status !== 'playing' && game.status === 'playing') {
      setProfile((p) => finish(p, next));
      setPage('result');
    }
    beep(next.status === 'won' ? 660 : next.status === 'lost' ? 220 : 420);
    if (
      profile.motion &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      'vibrate' in navigator
    )
      navigator.vibrate?.(12);
  }
  function answerExercise(value: string) {
    if (!exercise || exerciseAnswer) return;
    setExerciseAnswer(value);
    setProfile((p) => train(p, exercise.id, value === exercise.correct));
    beep(value === exercise.correct ? 620 : 270);
  }
  function newExercise(mode: Exercise['mode']) {
    let nextStep = exerciseStep + 1;
    for (let i = 0; i < (mode === 'memory' ? 12 : 24); i++, nextStep++) {
      const candidate = getExercise(mode, nextStep);
      if (
        candidate.id !== exercise?.id &&
        (!profile.training[candidate.id] || profile.training[candidate.id].dueAt <= Date.now())
      )
        break;
    }
    setExerciseStep(nextStep);
    setExercise(getExercise(mode, nextStep));
    setExerciseAnswer(null);
  }
  function go(page: Page) {
    setError('');
    setPage(page);
  }
  function runBenchmark() {
    setBenchmarkBusy(true);
    setTimeout(() => {
      try {
        setBenchmarks([simulate(targets, questions, 'fixed'), simulate(targets, questions, 'adaptive')]);
      } catch {
        setError('A simulação falhou. Tente novamente.');
      } finally {
        setBenchmarkBusy(false);
      }
    }, 30);
  }
  const hasGame = game?.status === 'playing';
  return (
    <main className={`app-shell ${page === 'game' ? 'game-shell' : ''}`}>
      <div className="ambient" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" onClick={() => go('hub')} aria-label="Ir ao início">
          <span className="brand-mark">?</span>
          <span>
            <b>MESTRE</b>
            <small>DAS 20 PERGUNTAS</small>
          </span>
        </button>
        <button className="icon-button" onClick={() => go('settings')} aria-label="Configurações">
          ⚙
        </button>
      </header>
      {page === 'hub' && (
        <section className="screen hub-screen">
          <div className="rankline">
            <span className="eyebrow">◆ SALA DE ESTRATÉGIA</span>
            <span className="rank-chip">✦ {rank(profile.xp)}</span>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="outer-orbit">
              <div className="inner-orbit">
                <span>?</span>
              </div>
            </div>
            <i className="star star-a">✧</i>
            <i className="star star-b">✦</i>
            <i className="star star-c">·</i>
          </div>
          <div className="hero-copy">
            <span className="eyebrow gold">O DESAFIO COMEÇA NA SUA MENTE</span>
            <h1>
              Pense em alguém.
              <br />
              <em>Eu descubro.</em>
            </h1>
            <p>Uma pessoa, personagem ou grupo. Tenho até 20 ações para revelar sua escolha.</p>
          </div>
          <button className="primary-button play-button" onClick={() => (hasGame ? go('game') : start())}>
            <span>{hasGame ? 'CONTINUAR PARTIDA' : 'COMEÇAR PARTIDA'}</span>
            <span className="arrow">↗</span>
          </button>
          {!installed && (
            <button className="install-banner" onClick={() => void install()}>
              <span className="install-symbol">↓</span>
              <span>
                <b>Instalar no celular</b>
                <small>Jogue pela tela inicial, até offline</small>
              </span>
              <span>›</span>
            </button>
          )}
          <div className="progress-block">
            <div className="row spread">
              <span className="eyebrow">POSTO · {rank(profile.xp).toUpperCase()}</span>
              <strong>{profile.xp} XP</strong>
            </div>
            <div className="xp-track">
              <div style={{ width: `${xpPercent}%` }} />
            </div>
            <small>{remainingXp} XP até o próximo posto</small>
          </div>
          <button className="mission-banner" onClick={() => go('academy')}>
            <span className="mission-icon">✧</span>
            <span>
              <b>Missão do dia</b>
              <small>
                Acerte 3 treinos · {dailyCount}/3 {profile.daily.claimed ? '· concluída' : '· +20 XP'}
              </small>
            </span>
            <span>›</span>
          </button>
          <div className="quick-stats">
            <div>
              <b>{profile.wins}</b>
              <small>Vitórias</small>
            </div>
            <div>
              <b>{profile.best ?? '—'}</b>
              <small>Melhor marca</small>
            </div>
            <div>
              <b>{badges(profile).filter((b) => b.earned).length}/6</b>
              <small>Conquistas</small>
            </div>
          </div>
        </section>
      )}
      {page === 'game' && game && (
        <section className="screen game-screen">
          <div className="game-heading">
            <button className="back-button" onClick={() => go('hub')} aria-label="Voltar e salvar partida">
              ‹
            </button>
            <div>
              <span className="eyebrow">DUELO DE INTELIGÊNCIA</span>
              <h2>{choice?.kind === 'guess' ? 'Tenho um palpite forte' : 'Estou cruzando as pistas'}</h2>
            </div>
            <span className="counter">
              {game.actions.length + 1}
              <small>/20</small>
            </span>
          </div>
          <div className="milestones" aria-label={`${game.actions.length} de 20 ações usadas`}>
            {[5, 10, 15, 20].map((m, i) => (
              <div
                key={m}
                className={
                  game.actions.length >= m
                    ? 'passed'
                    : game.actions.length + 1 <= m && game.actions.length + 1 > m - 5
                      ? 'current'
                      : ''
                }
              >
                <span className="milestone-line" />
                <b>{m}</b>
                <small>{['ELITE', 'OURO', 'PRATA', 'BRONZE'][i]}</small>
              </div>
            ))}
          </div>
          {choice ? (
            <>
              <div className="question-panel">
                <span className="question-crest">{choice.kind === 'guess' ? '✦' : '◇'}</span>
                <span className="eyebrow gold">
                  {choice.kind === 'guess' ? 'MEU PALPITE' : `PERGUNTA ${game.actions.length + 1}`}
                </span>
                <h1>
                  {choice.kind === 'guess' ? (
                    <>
                      Você pensou em
                      <br />
                      <em>{choice.target.name}?</em>
                    </>
                  ) : (
                    choice.question.text
                  )}
                </h1>
                <p>
                  {choice.kind === 'guess'
                    ? 'Só tento um nome quando a evidência é muito forte. Confirme se acertei.'
                    : 'Sem nomes aleatórios: primeiro vou eliminar possibilidades com suas respostas.'}
                </p>
              </div>
              {choice.kind === 'question' ? (
                <div className="answer-grid">
                  {answers.map((a) => (
                    <button key={a.value} className={`answer answer-${a.value}`} onClick={() => act(a.value)}>
                      <span className="answer-icon">{a.icon}</span>
                      <span>
                        <b>{a.label}</b>
                        <small>{a.hint}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="guess-actions">
                  <button className="primary-button" onClick={() => act(true)}>
                    ✓ SIM, ACERTOU
                  </button>
                  <button className="secondary-button" onClick={() => act(false)}>
                    NÃO, CONTINUE
                  </button>
                </div>
              )}
              <p className="game-footnote">
                {game.actions.length === 19
                  ? 'Última ação: sem chute forçado quando não há certeza.'
                  : 'Estratégia: investigar primeiro, palpitar só com confiança alta.'}
              </p>
            </>
          ) : (
            <div className="question-panel">
              <h2>Não há mais candidatos.</h2>
              <button className="primary-button" onClick={start}>
                Nova partida
              </button>
            </div>
          )}
        </section>
      )}
      {page === 'result' && game && (
        <section className="screen result-screen">
          <div className={`medal-art ${game.status === 'won' ? 'victory' : ''}`}>
            {game.status === 'won' ? '✦' : '◇'}
          </div>
          <span className="eyebrow gold">
            {game.status === 'won'
              ? `MEDALHA ${medal(game.actions.length).toUpperCase()}`
              : 'PARTIDA ENCERRADA'}
          </span>
          <h1>{game.status === 'won' ? 'Mistério resolvido.' : 'Você me venceu.'}</h1>
          <p>
            {game.status === 'won'
              ? `Acerto confirmado em ${game.actions.length} ${game.actions.length === 1 ? 'ação' : 'ações'}.`
              : `Não acertei em 20 ações. Sua escolha pode não estar na base experimental.`}
          </p>
          <div className="result-stats">
            <div>
              <b>{game.actions.length}</b>
              <small>Ações</small>
            </div>
            <div>
              <b>{game.actions.filter((a) => a.kind === 'answer').length}</b>
              <small>Perguntas</small>
            </div>
            <div>
              <b>{game.actions.filter((a) => a.kind === 'guess').length}</b>
              <small>Palpites</small>
            </div>
          </div>
          <button className="primary-button" onClick={start}>
            JOGAR NOVAMENTE ↗
          </button>
          <button className="text-button" onClick={() => go('academy')}>
            Treinar na Academia ›
          </button>
        </section>
      )}
      {page === 'academy' && (
        <section className="screen content-screen">
          <span className="eyebrow gold">TRILHA DE MAESTRIA</span>
          <h1>A arte de perguntar.</h1>
          <p className="lead">Treine o raciocínio do motor e volte aos desafios esquecidos.</p>
          <div className="academy-path">
            <div className="path-line" />
            <button className="lesson-node" onClick={() => newExercise('memory')}>
              <span>01</span>
              <b>Preveja o caminho</b>
              <small>Escolha a próxima pergunta do motor</small>
              <i>›</i>
            </button>
            <button className="lesson-node" onClick={() => newExercise('reading')}>
              <span>02</span>
              <b>Leia a ficha</b>
              <small>Responda como um alvo conhecido</small>
              <i>›</i>
            </button>
            <div className="locked-node">
              <span>03</span>
              <b>Novos ramos</b>
              <small>Em desenvolvimento</small>
              <i>⌁</i>
            </div>
          </div>
          {exercise && (
            <div className="exercise-card">
              <div className="row spread">
                <span className="eyebrow">
                  EXERCÍCIO · {exercise.mode === 'memory' ? 'ESTRATÉGIA' : 'CONHECIMENTO'}
                </span>
                <button
                  className="close-button"
                  onClick={() => setExercise(null)}
                  aria-label="Fechar exercício"
                >
                  ×
                </button>
              </div>
              <h2>{exercise.prompt}</h2>
              <div className="exercise-options">
                {exercise.options.map((option) => (
                  <button
                    key={option}
                    disabled={!!exerciseAnswer}
                    className={
                      exerciseAnswer
                        ? option === exercise.correct
                          ? 'correct'
                          : option === exerciseAnswer
                            ? 'incorrect'
                            : ''
                        : ''
                    }
                    onClick={() => answerExercise(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {exerciseAnswer && (
                <div role="status" className="feedback">
                  <b>
                    {exerciseAnswer === exercise.correct ? 'Boa leitura! +8 XP' : 'Vamos revisar essa pista.'}
                  </b>
                  <p>{exercise.note}</p>
                  <button onClick={() => newExercise(exercise.mode)}>Próximo desafio ›</button>
                </div>
              )}
            </div>
          )}
          <div className="section-title">
            <span className="eyebrow">MISSÃO DE HOJE</span>
            <b>{dailyCount}/3</b>
          </div>
          <div className="mission-progress">
            <div style={{ width: `${(dailyCount / 3) * 100}%` }} />
          </div>
          <p className="subtle">
            {profile.daily.claimed
              ? 'Missão concluída: +20 XP recebidos.'
              : 'Acerte três exercícios hoje para ganhar 20 XP.'}
          </p>
          <div className="section-title">
            <span className="eyebrow">CONQUISTAS</span>
            <b>{badges(profile).filter((b) => b.earned).length}/6</b>
          </div>
          <div className="badge-list">
            {badges(profile).map((b) => (
              <div key={b.id} className={`badge ${b.earned ? 'earned' : ''}`}>
                <span>{b.earned ? '✦' : '◇'}</span>
                <div>
                  <b>{b.title}</b>
                  <small>{b.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {page === 'book' && (
        <section className="screen content-screen">
          <span className="eyebrow gold">LIVRO MESTRE · ÁRVORE EXPERIMENTAL</span>
          <h1>Aprenda o próximo passo.</h1>
          <p className="lead">
            Navegue pela estratégia derivada desta base. Cada ramo recalcula a melhor pergunta.
          </p>
          <div className="book-breadcrumb">
            <button
              disabled={!book.actions.length}
              onClick={() => setBook((g) => ({ ...g, actions: g.actions.slice(0, -1), status: 'playing' }))}
            >
              ‹ Voltar
            </button>
            <span>
              Raiz{' '}
              {book.actions
                .map((a) =>
                  a.kind === 'answer'
                    ? ` › ${answers.find((o) => o.value === a.answer)?.label}`
                    : ' › Palpite',
                )
                .join('')}
            </span>
          </div>
          <div className="book-card">
            <span className="eyebrow">
              NÓ {book.actions.length + 1} ·{' '}
              {Math.round(
                Math.pow(
                  2,
                  -[...bookDist.values()].reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0),
                ),
              )}{' '}
              CANDIDATOS EFETIVOS
            </span>
            {bookChoice?.kind === 'question' ? (
              <>
                <h2>{bookChoice.question.text}</h2>
                <p>
                  {bookChoice.question.description} Ganho esperado nesta base:{' '}
                  <b>{bookChoice.gain.toFixed(2)} bits</b>.
                </p>
                <div className="book-branches">
                  {answers.map((a) => (
                    <button key={a.value} onClick={() => setBook((g) => answerGame(g, bookChoice, a.value))}>
                      <span>{a.icon}</span>
                      {a.label}
                      <i>↗</i>
                    </button>
                  ))}
                </div>
              </>
            ) : bookChoice?.kind === 'guess' ? (
              <>
                <h2>Palpite: {bookChoice.target.name}</h2>
                <p>
                  A distribuição atual concentra {Math.round(bookChoice.confidence * 100)}% neste alvo. Volte
                  e tente outro ramo.
                </p>
                <button className="secondary-button" onClick={() => setBook(newGame('book'))}>
                  Voltar à raiz
                </button>
              </>
            ) : (
              <>
                <h2>Fim deste ramo</h2>
                <button className="secondary-button" onClick={() => setBook(newGame('book'))}>
                  Voltar à raiz
                </button>
              </>
            )}
          </div>
          <p className="subtle">
            Os valores vêm da seed provisória e de hipóteses editoriais, não de jogadores reais.
          </p>
        </section>
      )}
      {page === 'lab' && (
        <section className="screen content-screen">
          <span className="eyebrow gold">LABORATÓRIO · SIMULAÇÃO LOCAL</span>
          <h1>Teste a estratégia.</h1>
          <p className="lead">
            Compare um roteiro fixo com a escolha adaptativa sobre os mesmos alvos e respostas perfeitas.
          </p>
          <div className="lab-intro">
            <span className="lab-symbol">◈</span>
            <div>
              <b>Experimento reproduzível</b>
              <small>
                {targets.length} alvos · {questions.length} perguntas · amostra determinística de 12
              </small>
            </div>
          </div>
          <button className="primary-button" disabled={benchmarkBusy} onClick={runBenchmark}>
            {benchmarkBusy ? 'CALCULANDO…' : benchmarks ? 'REPETIR SIMULAÇÃO ↗' : 'EXECUTAR SIMULAÇÃO ↗'}
          </button>
          {benchmarks && (
            <div className="bench-table" role="region" aria-label="Resultados da simulação">
              <div className="table-head">
                <span>ESTRATÉGIA</span>
                <span>ACERTOS</span>
                <span>MÉDIA*</span>
              </div>
              {benchmarks.map((b) => (
                <div className="table-row" key={b.label}>
                  <span>
                    <b>{b.label}</b>
                    <small>
                      ≤5: {b.within5} · ≤10: {b.within10} · ≤15: {b.within15}
                    </small>
                  </span>
                  <strong>
                    {b.wins}/{b.sample}
                  </strong>
                  <strong>{b.meanWin?.toFixed(1) ?? '—'}</strong>
                </div>
              ))}
              <small>* Média de ações apenas nas vitórias simuladas.</small>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="lab-notes">
            <h2>Como ler estes números</h2>
            <p>
              Os alvos vêm da própria base. O simulador não representa escolhas reais de brasileiros, erros
              humanos ou casos fora da base. O roteiro fixo usa as 18 primeiras perguntas cadastradas; ambos
              usam a mesma política de palpites.
            </p>
            <p>
              A popularidade é uma hipótese editorial inicial. Use os números para comparar versões desta
              seed, jamais como promessa de acerto universal.
            </p>
          </div>
        </section>
      )}
      {page === 'settings' && (
        <section className="screen content-screen">
          <span className="eyebrow gold">SUA EXPERIÊNCIA</span>
          <h1>Configurações.</h1>
          <div className="settings-list">
            {!installed && (
              <button className="secondary-button" onClick={() => void install()}>
                ↓ INSTALAR APLICATIVO
              </button>
            )}
            <label>
              <span>
                <b>Som</b>
                <small>Preparado para efeitos futuros</small>
              </span>
              <input
                type="checkbox"
                checked={profile.sound}
                onChange={(e) => setProfile((p) => ({ ...p, sound: e.target.checked }))}
              />
            </label>
            <label>
              <span>
                <b>Animações e vibração</b>
                <small>Respeita a preferência de movimento reduzido</small>
              </span>
              <input
                type="checkbox"
                checked={profile.motion}
                onChange={(e) => setProfile((p) => ({ ...p, motion: e.target.checked }))}
              />
            </label>
          </div>
          <div className="lab-notes">
            <h2>Sobre a versão experimental</h2>
            <p>
              Funciona offline depois de instalada e guarda partidas e progresso neste aparelho. A base
              inicial tem {targets.length} alvos e {questions.length} perguntas; fichas e popularidade ainda
              precisam de auditoria individual. Não há conta ou sincronização.
            </p>
          </div>
          <button className="secondary-button" onClick={() => go('hub')}>
            Voltar ao início
          </button>
        </section>
      )}
      {page !== 'game' && page !== 'result' && (
        <nav className="bottom-nav" aria-label="Navegação principal">
          {nav.map((n) => (
            <button
              key={n.page}
              className={page === n.page ? 'active' : ''}
              onClick={() => go(n.page)}
              aria-current={page === n.page ? 'page' : undefined}
            >
              <span>{n.icon}</span>
              <small>{n.label}</small>
            </button>
          ))}
        </nav>
      )}
      {installHelp && (
        <div className="install-backdrop" role="presentation" onClick={() => setInstallHelp(false)}>
          <div
            className="install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-button" onClick={() => setInstallHelp(false)} aria-label="Fechar">
              ×
            </button>
            <span className="eyebrow gold">JOGUE COMO APLICATIVO</span>
            <h2 id="install-title">Instale no seu celular.</h2>
            <p>
              Se o link abriu dentro de outro aplicativo, use a opção <b>Abrir no navegador</b>. Navegadores
              internos normalmente não permitem instalar.
            </p>
            <p>
              <b>Android (Chrome):</b> toque no menu ⋮ e escolha “Instalar aplicativo” ou “Adicionar à tela
              inicial”.
            </p>
            <p>
              <b>iPhone (Safari):</b> toque em Compartilhar e depois “Adicionar à Tela de Início”.
            </p>
            {/Android/i.test(navigator.userAgent) && (
              <a
                className="secondary-button install-browser-link"
                href={`intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`}
              >
                ABRIR NO CHROME ↗
              </a>
            )}
            <button className="primary-button" onClick={() => setInstallHelp(false)}>
              ENTENDI
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
