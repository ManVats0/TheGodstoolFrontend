import type { ReactNode } from 'react'

// Plain inline SVG, drawn for people who are not technical. Portrait layouts so they read well on a phone.
const C = {
  box: '#150d2b', line: '#7c3aed', text: '#f3f0ff', soft: '#b9aee0', good: '#34d399', warn: '#fbbf24', bad: '#f87171', ai: '#f472b6',
}
const F = "Inter, -apple-system, 'Segoe UI', sans-serif"

function Frame({ w, h, title, children }: { w: number; h: number; title: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: F }}>
      <title>{title}</title>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={C.soft} /></marker>
        <marker id="ahg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={C.good} /></marker>
        <marker id="ahp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={C.ai} /></marker>
      </defs>
      {children}
    </svg>
  )
}

const Box = ({ x, y, w, h, color = C.line, fill = C.box }: { x: number; y: number; w: number; h: number; color?: string; fill?: string }) =>
  <rect x={x} y={y} width={w} height={h} rx="14" fill={fill} stroke={color} strokeWidth="2" />
const T = ({ x, y, size = 15, weight = 400, fill = C.text, anchor = 'middle', children }: { x: number; y: number; size?: number; weight?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; children: ReactNode }) =>
  <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} textAnchor={anchor}>{children}</text>

/** 1. Where the data goes: computer -> our servers -> AI */
export function DiagramJourney() {
  return (
    <Frame w={480} h={600} title="Your full file stays with you and our servers. Only a description of its structure goes to the AI.">
      <Box x={90} y={14} w={300} h={104} color={C.good} />
      <T x={240} y={46} size={17} weight={700}>1. Your computer</T>
      <T x={240} y={70} fill={C.soft}>Your file, with every row</T>
      <rect x={185} y={84} width={110} height={22} rx="4" fill="#1d1340" stroke={C.good} />
      <g stroke={C.good} strokeWidth="1"><line x1="185" y1="95" x2="295" y2="95" /><line x1="222" y1="84" x2="222" y2="106" /><line x1="259" y1="84" x2="259" y2="106" /></g>

      <line x1="240" y1="122" x2="240" y2="190" stroke={C.good} strokeWidth="3" markerEnd="url(#ahg)" />
      <T x={252} y={158} anchor="start" fill={C.good} weight={600}>Whole file (secure upload)</T>

      <Box x={90} y={198} w={300} h={128} color={C.line} />
      <T x={240} y={230} size={17} weight={700}>2. The God's Tool servers</T>
      <T x={240} y={254} fill={C.soft}>Hold your full data while we clean it.</T>
      <T x={240} y={276} fill={C.soft}>Write a description of the columns.</T>
      <T x={240} y={298} fill={C.soft}>Run the cleaning steps on your rows.</T>

      <line x1="160" y1="330" x2="160" y2="408" stroke={C.ai} strokeWidth="2.5" markerEnd="url(#ahp)" />
      <T x={150} y={364} anchor="end" fill={C.ai} weight={600} size={13}>Your instruction</T>
      <T x={150} y={382} anchor="end" fill={C.ai} weight={600} size={13}>+ a description</T>
      <T x={150} y={400} anchor="end" fill={C.ai} weight={600} size={13}>of the columns</T>

      <line x1="320" y1="408" x2="320" y2="330" stroke={C.soft} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#ah)" />
      <T x={332} y={364} anchor="start" fill={C.soft} size={13}>A short cleaning</T>
      <T x={332} y={382} anchor="start" fill={C.soft} size={13}>recipe comes back</T>

      <Box x={90} y={414} w={300} h={92} color={C.ai} />
      <T x={240} y={446} size={17} weight={700}>3. The AI (Claude)</T>
      <T x={240} y={470} fill={C.soft}>Writes the recipe. Never gets</T>
      <T x={240} y={490} fill={C.soft}>a single row of your data.</T>

      <rect x={100} y={530} width={280} height={44} rx="22" fill="#2a0f14" stroke={C.bad} />
      <T x={240} y={558} weight={700} fill="#fecaca">Your rows never leave step 1 and 2</T>
    </Frame>
  )
}

/** 2. What you have vs what the AI is told */
export function DiagramSeen() {
  const rows = [['Anna Smith', 'anna@mail.com', '82,000'], ['Ravi Kumar', 'ravi@corp.in', '64,500']]
  return (
    <Frame w={480} h={560} title="Real values on your side, only a description of each column on the AI side.">
      <T x={240} y={26} size={14} weight={700} fill={C.good}>WHAT YOU HAVE</T>
      <Box x={30} y={38} w={420} h={130} color={C.good} />
      {['Name', 'Email', 'Salary'].map((h, i) => <T key={h} x={50 + i * 140} y={68} anchor="start" weight={700} fill={C.soft} size={14}>{h}</T>)}
      <line x1="46" y1="78" x2="434" y2="78" stroke="#3b2a6b" />
      {rows.map((r, ri) => r.map((v, ci) => <T key={ri + '-' + ci} x={50 + ci * 140} y={106 + ri * 30} anchor="start" size={14}>{v}</T>))}

      <line x1="240" y1="176" x2="240" y2="228" stroke={C.soft} strokeWidth="2.5" markerEnd="url(#ah)" />
      <T x={252} y={208} anchor="start" fill={C.soft} size={14}>We turn it into a description</T>

      <T x={240} y={254} size={14} weight={700} fill={C.ai}>WHAT THE AI IS TOLD</T>
      <Box x={30} y={266} w={420} h={236} color={C.ai} />
      {[
        ['Name', 'text, looks like  Aaaa Aaaaa'],
        ['Email', 'an email address, looks like  aaaa@aaaa.aaa'],
        ['Salary', 'a whole number, looks like  99,999'],
      ].map(([a, b], i) => (
        <g key={a}>
          <rect x={48} y={286 + i * 62} width={384} height={50} rx="10" fill="#241038" />
          <T x={62} y={308 + i * 62} anchor="start" weight={700} size={14}>{a}</T>
          <T x={62} y={326 + i * 62} anchor="start" fill={C.soft} size={13}>{b}</T>
        </g>
      ))}
      <T x={240} y={518} size={13} fill="#fecaca" weight={600}>No names, no emails, no salaries. Just the pattern.</T>
    </Frame>
  )
}

/** 3. Step by step */
export function DiagramSteps() {
  const steps: [string, string, string, string][] = [
    ['1', 'You type what you want', 'For example: "remove duplicate customers"', 'In your browser'],
    ['2', 'We describe your columns', 'Types and patterns only, no values', 'On our servers'],
    ['3', 'The AI writes a short recipe', 'It replies with cleaning instructions', 'The only AI step'],
    ['4', 'We check the recipe, then run it', 'Unsafe recipes are blocked. Safe ones run', 'On our servers'],
    ['5', 'You download the clean file', 'Same file, tidier rows', 'In your browser'],
  ]
  return (
    <Frame w={480} h={640} title="Five steps from typing a request to downloading a clean file. The AI only takes part in step three.">
      <line x1="48" y1="56" x2="48" y2="560" stroke="#3b2a6b" strokeWidth="3" />
      {steps.map(([n, a, b, tag], i) => {
        const y = 24 + i * 120
        const isAi = n === '3'
        const col = isAi ? C.ai : C.line
        return (
          <g key={n}>
            <circle cx="48" cy={y + 32} r="20" fill={isAi ? '#3a0f2e' : '#2a1a5e'} stroke={col} strokeWidth="2" />
            <T x={48} y={y + 38} weight={700} size={16}>{n}</T>
            <Box x={86} y={y} w={376} h={84} color={col} />
            <T x={102} y={y + 28} anchor="start" size={16} weight={700}>{a}</T>
            <T x={102} y={y + 50} anchor="start" size={13} fill={C.soft}>{b}</T>
            <rect x={102} y={y + 58} width={tag.length * 7.2 + 18} height={20} rx="10" fill={isAi ? '#3a0f2e' : '#14301f'} />
            <T x={111} y={y + 72} anchor="start" size={12} weight={600} fill={isAi ? C.ai : C.good}>{tag}</T>
          </g>
        )
      })}
      <T x={240} y={622} size={13} fill={C.soft}>Only step 3 involves the AI, and in private mode it never sees your rows.</T>
    </Frame>
  )
}

/** 4. The two modes */
export function DiagramModes() {
  const col = (x: number, title: string, badge: string, color: string, items: [boolean, string][]) => (
    <g>
      <Box x={x} y={30} w={216} h={300} color={color} />
      <rect x={x + 14} y={44} width={badge.length * 7.4 + 18} height={22} rx="11" fill={color === C.good ? '#14301f' : '#33260a'} />
      <T x={x + 23} y={59} anchor="start" size={12} weight={700} fill={color}>{badge}</T>
      <T x={x + 14} y={96} anchor="start" size={17} weight={700}>{title}</T>
      <T x={x + 14} y={120} anchor="start" size={13} fill={C.soft}>The AI is given:</T>
      {items.map(([ok, label], i) => (
        <g key={label}>
          <T x={x + 16} y={152 + i * 38} anchor="start" size={18} weight={700} fill={ok ? C.good : C.bad}>{ok ? '✓' : '✕'}</T>
          <T x={x + 42} y={152 + i * 38} anchor="start" size={14}>{label}</T>
        </g>
      ))}
    </g>
  )
  return (
    <Frame w={480} h={372} title="Private mode shares no rows. Sample sharing is optional and off unless an admin turns it on.">
      {col(12, 'Private mode', 'ON BY DEFAULT', C.good, [[true, 'Your instruction'], [true, 'Column names'], [true, 'Column descriptions'], [false, 'Rows or cell values']])}
      {col(252, 'Share samples', 'OPT-IN BY ADMIN', C.warn, [[true, 'Your instruction'], [true, 'Column names'], [true, 'Column descriptions'], [true, 'A few sample rows']])}
      <T x={240} y={356} size={13} fill={C.soft}>Sharing helps with fixes that depend on real values, like typos.</T>
    </Frame>
  )
}

export const DIAGRAMS: Record<string, () => ReactNode> = {
  journey: DiagramJourney, seen: DiagramSeen, steps: DiagramSteps, modes: DiagramModes,
}
