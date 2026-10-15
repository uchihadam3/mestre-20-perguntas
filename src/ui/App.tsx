import { useEffect, useMemo, useState } from 'react';
import type { Answer, Game, Profile, Target } from '../domain/types';
import { targets } from '../data/targets';
import { attribute, questions } from '../data/questions';
import {
  answerGame,
  choose,
  concedeGame,
  informationGain,
  medal,
  newGame,
  posterior,
  rankQuestions,
  reviseAnswer,
  separation,
} from '../engine/inference';
import { analyzeFacts } from '../engine/logic';
import { simulate, type Benchmark } from '../engine/simulate';
import { badges, finish, load, mastery, save, train } from '../persistence/storage';

type Page = 'hub' | 'game' | 'result' | 'academy' | 'book' | 'lab' | 'settings';
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type Exercise = {
  id: string;
  mode: 'memory' | 'reading' | 'split' | 'error';
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
export function getExercise(mode: Exercise['mode'], step: number): Exercise {
  if (mode === 'memory' || mode === 'split' || mode === 'error') {
    const target = targets[((step % 12) * 17 + 7) % targets.length];
    const first = choose(newGame('lesson'), targets, questions);
    const firstAnswer = first?.kind === 'question' ? attribute(target, first.question) : 'unknown';
    const game =
      first?.kind === 'question'
        ? answerGame(newGame('lesson'), first, firstAnswer === 'unknown' ? 'dont_know' : firstAnswer)
        : newGame('lesson');
    const ranked = rankQuestions(game, targets, questions);
    if (mode === 'error') {
      const cases = [
        {
          prompt: 'Lume ouviu “Não sei”. O que fazer com essa resposta?',
          options: [
            'Eliminar os alvos com “Não”',
            'Manter os candidatos e buscar outra pista',
            'Tentar o nome mais popular',
          ],
          correct: 'Manter os candidatos e buscar outra pista',
          note: '“Não sei” não informa se a característica está presente; o motor conserva a distribuição.',
        },
        {
          prompt: `Após uma pista sobre ${target.name}, vários candidatos ainda parecem possíveis. Qual o próximo passo?`,
          options: [
            'Testar três nomes em sequência',
            'Escolher uma pergunta que os separe',
            'Confiar apenas na popularidade',
          ],
          correct: 'Escolher uma pergunta que os separe',
          note: 'Cada palpite gasta uma ação. Uma pergunta divisora pode eliminar vários rivais de uma vez.',
        },
        {
          prompt: 'Duas respostas parecem contraditórias. Como investigar sem inventar certeza?',
          options: [
            'Forçar um palpite',
            'Apagar a resposta menos conveniente',
            'Buscar outra pista e admitir incerteza',
          ],
          correct: 'Buscar outra pista e admitir incerteza',
          note: 'Evidências editoriais e respostas humanas podem falhar. A investigação deve continuar sem declarar certeza.',
        },
      ];
      return {
        id: `error:${target.id}`,
        mode,
        ...cases[step % cases.length],
      };
    }
    if (mode === 'split') {
      const dist = posterior(game, targets, questions);
      const candidates = ranked
        .map((r) => ({ ...r, split: separation(dist, targets, r.question) }))
        .sort((a, b) => b.split - a.split);
      const selected = [
        candidates[0],
        candidates[Math.min(8, candidates.length - 1)],
        candidates[Math.min(20, candidates.length - 1)],
      ];
      return {
        id: `split:${target.id}`,
        mode,
        prompt: `Depois da primeira pista sobre ${target.name}, qual pergunta separa melhor os candidatos ainda plausíveis?`,
        options: selected.map((r) => r.question.text).sort((a, b) => a.localeCompare(b)),
        correct: selected[0].question.text,
        note: `Esta pergunta divide ${Math.round(selected[0].split * 100)}% da massa de pares plausíveis em respostas opostas, segundo as fichas atuais.`,
      };
    }
    const top = ranked.slice(0, 3);
    const options = top
      .map((r) => r.question.text)
      .sort((a, b) => ((a.charCodeAt(0) + step * 7) % 13) - ((b.charCodeAt(0) + step * 7) % 13));
    return {
      id: `${mode}:${target.id}`,
      mode,
      prompt:
        first?.kind === 'question'
          ? `Depois de responder “${firstAnswer === 'yes' ? 'Sim' : firstAnswer === 'no' ? 'Não' : 'Não sei'}” a “${first.question.text}”, qual pergunta o motor escolheria?`
          : 'Qual pergunta abre melhor esta base?',
      options,
      correct: top[0].question.text,
      note: `A pergunta escolhida separa os candidatos desta base com ganho esperado de ${top[0].gain.toFixed(2)} bits. O caminho pode mudar com outra resposta.`,
    };
  }
  const target = targets[((step % 24) * 23 + 3) % targets.length];
  const candidates = questions.filter((q) => !q.applicable || q.applicable.includes(target.type));
  const q = candidates[((step % 24) * 7 + 9) % candidates.length];
  const value = attribute(target, q);
  const correct = value === 'yes' ? 'Sim' : value === 'no' ? 'Não' : 'Não sei';
  return {
    id: `reading:${q.id}:${target.id}`,
    mode,
    prompt: `Se o alvo fosse ${target.name}, como você responderia a “${q.text}”?`,
    options: ['Sim', 'Não', 'Talvez', 'Não sei'],
    correct,
    note: `Na ficha experimental: ${origin(target)}. A resposta registrada é “${correct}”.`,
  };
}

function Mentor({ compact = false }: { compact?: boolean }) {
  return (
    <svg className={`mentor ${compact ? 'mentor-compact' : ''}`} viewBox="0 0 220 220" aria-hidden="true">
      <defs>
        <radialGradient id="lume" cx="35%" cy="25%" r="75%">
          <stop stopColor="#fff1b8" />
          <stop offset=".45" stopColor="#f0c977" />
          <stop offset="1" stopColor="#ae6c4c" />
        </radialGradient>
        <linearGradient id="cloak" x2="1" y2="1">
          <stop stopColor="#5ed4cf" />
          <stop offset="1" stopColor="#243c67" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="195" rx="74" ry="11" fill="#09142c" opacity=".55" />
      <path
        d="M48 181 Q53 139 83 134 L137 134 Q169 145 174 181 Q110 201 48 181Z"
        fill="url(#cloak)"
        stroke="#8be2d3"
        strokeWidth="3"
      />
      <path d="M83 135 L110 167 L137 135" fill="none" stroke="#e9c785" strokeWidth="4" />
      <path
        d="M54 72 Q110 13 167 72 L162 122 Q145 150 110 151 Q75 150 58 122Z"
        fill="url(#lume)"
        stroke="#f8e1a0"
        strokeWidth="4"
      />
      <path
        d="M51 76 Q110 45 169 76 L179 62 Q148 42 126 41 L117 22 L91 22 L88 42 Q64 42 42 62Z"
        fill="#273d60"
        stroke="#8adbd3"
        strokeWidth="3"
      />
      <path d="M38 77 Q110 91 183 77" fill="none" stroke="#e5c783" strokeWidth="7" strokeLinecap="round" />
      <circle cx="86" cy="97" r="11" fill="#172b46" />
      <circle cx="135" cy="97" r="11" fill="#172b46" />
      <circle cx="90" cy="93" r="3" fill="#fff9d8" />
      <circle cx="139" cy="93" r="3" fill="#fff9d8" />
      <path
        d="M101 119 Q110 127 119 119"
        fill="none"
        stroke="#79513c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="135" cy="98" r="23" fill="none" stroke="#f9e2a4" strokeWidth="5" />
      <path d="M153 115 L177 139" stroke="#f9e2a4" strokeWidth="7" strokeLinecap="round" />
      <path d="M109 29 L109 40" stroke="#f9e2a4" strokeWidth="3" />
      <circle cx="110" cy="20" r="4" fill="#f9e2a4" />
    </svg>
  );
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
  const [feedback, setFeedback] = useState('');
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
  const factReport = useMemo(() => (game ? analyzeFacts(game) : null), [game]);
  const rationale = useMemo(() => {
    if (!game || choice?.kind !== 'question') return null;
    const dist = posterior(game, targets, questions);
    const plausible = [...targets]
      .filter((target) => (dist.get(target.id) ?? 0) > 0.001)
      .sort((a, b) => (dist.get(b.id) ?? 0) - (dist.get(a.id) ?? 0));
    const yes = plausible.find((target) => attribute(target, choice.question) === 'yes');
    const no = plausible.find((target) => attribute(target, choice.question) === 'no');
    const unknown = plausible.find((target) => attribute(target, choice.question) === 'unknown');
    if (yes && no) return `${yes.name} tem “Sim” e ${no.name} tem “Não” nas fichas.`;
    if (yes && unknown)
      return `${yes.name} tem “Sim”; ${unknown.name} ainda está sem anotação. Sua resposta ajuda a separar essas possibilidades.`;
    return 'Esta pista compara respostas diferentes entre as fichas mais plausíveis.';
  }, [game, choice]);
  const bookChoice = useMemo(() => choose(book, targets, questions), [book]);
  const bookDist = useMemo(() => posterior(book, targets, questions), [book]);
  const caseFile = useMemo(() => {
    if (!game || game.status === 'playing') return [];
    return game.actions
      .flatMap((action, index) => {
        if (action.kind !== 'answer') return [];
        const question = questions.find((q) => q.id === action.questionId);
        if (!question) return [];
        const before = posterior({ ...game, actions: game.actions.slice(0, index) }, targets, questions);
        return [
          {
            text: question.text,
            answer: answers.find((a) => a.value === action.answer)?.label,
            gain: informationGain(before, targets, question),
          },
        ];
      })
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3);
  }, [game]);
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
    if (choice.kind === 'question') {
      const label = answers.find((a) => a.value === response)?.label ?? 'Resposta';
      setFeedback(`${label} · pista registrada`);
    } else setFeedback(response ? 'Caso resolvido!' : 'Palpite descartado · novas pistas');
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
  function conclude() {
    if (!game || game.status !== 'playing') return;
    const next = concedeGame(game);
    setGame(next);
    setProfile((p) => finish(p, next));
    setPage('result');
  }
  function answerExercise(value: string) {
    if (!exercise || exerciseAnswer) return;
    setExerciseAnswer(value);
    setProfile((p) => train(p, exercise.id, value === exercise.correct));
    beep(value === exercise.correct ? 620 : 270);
  }
  function newExercise(mode: Exercise['mode']) {
    let nextStep = exerciseStep + 1;
    for (let i = 0; i < (mode === 'reading' ? 24 : 12); i++, nextStep++) {
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
  const progress = mastery(profile);
  const achievements = badges(profile);
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
                <Mentor />
              </div>
            </div>
            <i className="star star-a">✧</i>
            <i className="star star-b">✦</i>
            <i className="star star-c">·</i>
          </div>
          <div className="hero-copy">
            <span className="eyebrow gold">LUME · DETETIVE DAS PISTAS</span>
            <h1>
              Pense em alguém.
              <br />
              <em>Eu descubro.</em>
            </h1>
            <p>Pense em uma pessoa, personagem ou grupo. Lume segue suas pistas em até 20 ações.</p>
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
              <b>
                {achievements.filter((b) => b.earned).length}/{achievements.length}
              </b>
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
          <div className="case-status" aria-live="polite">
            <Mentor compact />
            <span>
              <b>
                {game.actions.length < 6
                  ? 'Abrindo o caso'
                  : game.actions.length < 13
                    ? 'Cruzando pistas'
                    : 'Afunilando suspeitos'}
              </b>
              <small>
                {game.actions.filter((a) => a.kind === 'answer').length} pistas coletadas ·{' '}
                {Math.max(0, 20 - game.actions.length)} ações restantes
              </small>
            </span>
          </div>
          {feedback && (
            <span className="clue-feedback" role="status">
              {feedback}
            </span>
          )}
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
          {factReport?.conflict !== null && factReport?.conflict !== undefined ? (
            <div className="question-panel review-panel" role="alert">
              <span className="eyebrow gold">PISTAS EM CONFLITO</span>
              <h2>Vamos conferir uma resposta.</h2>
              <p>
                A resposta sobre “{questions.find((q) => q.id === factReport.reason)?.text ?? 'esta pista'}”
                contradiz uma pista anterior. Escolha uma resposta para corrigir; as ações posteriores serão
                refeitas sem gastar o limite.
              </p>
              <div className="review-list">
                {game.actions.map((action, index) =>
                  action.kind === 'answer' && (action.answer === 'yes' || action.answer === 'no') ? (
                    <details key={index} open={index === factReport.conflict}>
                      <summary>
                        {questions.find((q) => q.id === action.questionId)?.text ?? action.questionId}
                      </summary>
                      <div className="review-options">
                        {answers.map((option) => (
                          <button
                            key={option.value}
                            aria-label={`Corrigir resposta para ${option.label}`}
                            onClick={() => {
                              setGame(reviseAnswer(game, index, option.value));
                              setFeedback('Pista revisada · investigação retomada');
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </details>
                  ) : null,
                )}
              </div>
            </div>
          ) : choice ? (
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
                {choice.kind === 'question' && (
                  <details className="clue-reason">
                    <summary>Por que esta pergunta?</summary>
                    <p>
                      {rationale} Ganho estimado: {choice.gain.toFixed(2)} bits nesta base experimental.
                      Pistas já deduzidas não são perguntadas novamente.
                    </p>
                  </details>
                )}
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
              <h2>Preciso de mais pistas do que esta base permite.</h2>
              <p>Não vou tentar nomes ao acaso. Podemos encerrar este caso com honestidade.</p>
              <button className="secondary-button" onClick={conclude}>
                Encerrar investigação
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
              : `Não acertei em ${game.actions.length} ações. Sua escolha pode não estar na base experimental.`}
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
          {caseFile.length > 0 && (
            <div className="case-file">
              <span className="eyebrow gold">ARQUIVO DA PARTIDA</span>
              <h2>As pistas que mais ajudaram</h2>
              {caseFile.map((clue) => (
                <div key={clue.text}>
                  <b>{clue.text}</b>
                  <small>
                    {clue.answer} · ganho estimado {clue.gain.toFixed(2)} bits
                  </small>
                </div>
              ))}
              <small>Estimativas internas da base experimental; não são probabilidades calibradas.</small>
            </div>
          )}
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
            <button className="lesson-node" onClick={() => newExercise('split')}>
              <span>03</span>
              <b>Divida a busca</b>
              <small>Compare perguntas que eliminam candidatos</small>
              <i>›</i>
            </button>
            <button className="lesson-node" onClick={() => newExercise('error')}>
              <span>04</span>
              <b>Detecte o erro</b>
              <small>Evite palpites prematuros e pistas falsas</small>
              <i>›</i>
            </button>
          </div>
          <div className="mastery-strip" aria-label="Progresso de memorização">
            <div>
              <b>{progress.learned}</b>
              <small>Pistas aprendidas</small>
            </div>
            <div>
              <b>{progress.mastered}</b>
              <small>Dominadas após revisão</small>
            </div>
            <div>
              <b>{progress.due}</b>
              <small>Para revisar</small>
            </div>
          </div>
          {exercise && (
            <div className="exercise-card">
              <div className="row spread">
                <span className="eyebrow">
                  EXERCÍCIO ·{' '}
                  {exercise.mode === 'reading'
                    ? 'CONHECIMENTO'
                    : exercise.mode === 'error'
                      ? 'DECISÃO'
                      : 'ESTRATÉGIA'}
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
                    {exerciseAnswer === exercise.correct
                      ? 'Boa leitura! Pista registrada.'
                      : 'Vamos revisar essa pista.'}
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
            <b>
              {achievements.filter((b) => b.earned).length}/{achievements.length}
            </b>
          </div>
          <div className="badge-list">
            {achievements.map((b) => (
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
