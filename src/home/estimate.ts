// Price estimate used by the homepage calculator and the PDF.
// Keep these numbers in step with the Pricing page and the credits setup.
export type Cur = 'USD' | 'INR'

export interface Inputs {
  files: number    // files cleaned per month
  rows: number     // rows in a typical file
  aiPerFile: number // AI actions per file
  sources: number  // data sources connected
  seats: number    // people who log in
  cur: Cur
}

export interface Line { label: string; detail: string; amount: number }
export interface Option { name: string; total: number; lines: Line[] }
export interface Estimate {
  custom: boolean
  best: Option | null
  others: Option[]
  notes: string[]
  actions: number
}

const WORKDAYS = 22
export const CREDIT_PRICE: Record<Cur, number> = { USD: 0.03, INR: 2 }
export const MIN_TOPUP: Record<Cur, number> = { USD: 2, INR: 99 }
export const FREE_LIMITS = { sources: 3, rows: 5000, seats: 1 }

// Monthly prices match the homepage (USD) and the /pricing page (INR).
export const PLANS = [
  { name: 'Lite', usd: 19, inr: 774, aiPerDay: 4, seats: 1 },
  { name: 'Starter', usd: 39, inr: 1634, aiPerDay: 35, seats: 1 },
  { name: 'Pro', usd: 79, inr: 3354, aiPerDay: 110, seats: 5 },
  { name: 'Team', usd: 199, inr: 6794, aiPerDay: 150, seats: 15 },
]

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(n) || 0)))
const money = (n: number, cur: Cur) => (cur === 'USD' ? Math.round(n * 100) / 100 : Math.round(n))

export function clean(i: Inputs): Inputs {
  return {
    files: clamp(i.files, 0, 100000),
    rows: clamp(i.rows, 0, 100000000),
    aiPerFile: clamp(i.aiPerFile, 0, 500),
    sources: clamp(i.sources, 1, 1000),
    seats: clamp(i.seats, 1, 10000),
    cur: i.cur === 'INR' ? 'INR' : 'USD',
  }
}

export function estimate(raw: Inputs): Estimate {
  const i = clean(raw)
  const c = CREDIT_PRICE[i.cur]
  const actions = i.files * i.aiPerFile
  const notes: string[] = []

  if (i.seats > 15) {
    return { custom: true, best: null, others: [], actions, notes: ['More than 15 logins needs a custom plan, so we quote it by hand.'] }
  }

  const needsPaid = i.rows > FREE_LIMITS.rows || i.sources > FREE_LIMITS.sources || i.seats > FREE_LIMITS.seats
  const options: Option[] = []

  const creditLine = (n: number): Line => ({
    label: 'AI credits',
    detail: `${n.toLocaleString('en-US')} credits at ${i.cur === 'USD' ? '$' : 'Rs '}${c} each`,
    amount: money(n * c, i.cur),
  })

  if (!needsPaid) {
    if (actions === 0) {
      options.push({ name: 'Free plan', total: 0, lines: [{ label: 'Free plan', detail: 'No AI actions needed', amount: 0 }] })
    } else {
      const raw = actions * c
      const total = money(Math.max(raw, MIN_TOPUP[i.cur]), i.cur)
      const lines = [creditLine(actions)]
      if (raw < MIN_TOPUP[i.cur]) lines.push({ label: 'Minimum top-up', detail: 'Smallest credit purchase', amount: money(total - raw, i.cur) })
      options.push({ name: 'Free plan + credits', total, lines })
      notes.push('Credits never expire, so a first top-up carries over to later months.')
    }
  }

  const perDay = actions / WORKDAYS
  for (const p of PLANS) {
    if (p.seats < i.seats) continue
    const overflowDay = Math.max(0, perDay - p.aiPerDay)
    const overflow = Math.ceil(overflowDay * WORKDAYS)
    const price = i.cur === 'USD' ? p.usd : p.inr
    const lines: Line[] = [{
      label: `${p.name} plan`,
      detail: `${p.aiPerDay} AI actions a day included, ${p.seats} login${p.seats > 1 ? 's' : ''}`,
      amount: price,
    }]
    let total = price
    if (overflow > 0) {
      const l = creditLine(overflow)
      lines.push({ ...l, detail: `Beyond the daily allowance: ${l.detail}` })
      total += Math.max(l.amount, MIN_TOPUP[i.cur])
      if (l.amount < MIN_TOPUP[i.cur]) lines.push({ label: 'Minimum top-up', detail: 'Smallest credit purchase', amount: money(MIN_TOPUP[i.cur] - l.amount, i.cur) })
    }
    options.push({ name: `${p.name} plan`, total: money(total, i.cur), lines })
  }

  options.sort((a, b) => a.total - b.total)
  const best = options[0] || null
  if (needsPaid) {
    const why: string[] = []
    if (i.rows > FREE_LIMITS.rows) why.push(`files over ${FREE_LIMITS.rows.toLocaleString('en-US')} rows`)
    if (i.sources > FREE_LIMITS.sources) why.push(`more than ${FREE_LIMITS.sources} sources`)
    if (i.seats > FREE_LIMITS.seats) why.push('more than one login')
    notes.push(`The free plan doesn't cover ${why.join(', ')}, so a paid plan is needed.`)
  }
  notes.push(`Assumes your AI actions are spread over about ${WORKDAYS} working days a month.`)
  return { custom: false, best, others: options.slice(1, 3), notes, actions }
}

export const fmt = (n: number, cur: Cur, pdf = false) =>
  (cur === 'USD' ? '$' : pdf ? 'Rs ' : '₹') + n.toLocaleString(cur === 'USD' ? 'en-US' : 'en-IN', { minimumFractionDigits: cur === 'USD' && n % 1 ? 2 : 0, maximumFractionDigits: 2 })
