// ─────────────────────────────────────────────────────────────────────────────────────────────
// HOW TO PUBLISH A NEW POST
//   1. Copy an entry in PUBLISHED below, give it a new `slug` (the page address), `title`, `tag`, and body.
//   2. Set `published` to the real date: '2026-11-04' (day included) or '2026-11' (month only).
//   3. Optional: `excerpt` (the short preview). If you leave it out, the first paragraph is used.
//   4. If the topic was listed in UPCOMING, delete that line. Save, merge, done: the post appears on the blog
//      home, gets its own page, and is added to the sitemap and RSS feed automatically at the next build.
// Body blocks:  { type: 'p', text }  paragraph      { type: 'h', text }   section heading
//               { type: 'diagram', id: 'journey' | 'seen' | 'steps' | 'modes', caption }  picture (see diagrams.tsx)
//               { type: 'ul', items: [...] }  bullet list   { type: 'quote', text }  pull quote   { type: 'tip', text }  highlighted tip
// Inside text you can use **bold**, `code` and [link text](https://example.com).
// ─────────────────────────────────────────────────────────────────────────────────────────────

export type PostBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'diagram'; id: 'journey' | 'seen' | 'steps' | 'modes'; caption?: string }

export type Post = {
  slug: string
  tag: string
  readTime?: string
  published: string // 'YYYY-MM-DD' or 'YYYY-MM'
  title: string
  excerpt?: string
  body: PostBlock[]
}

export type Upcoming = { title: string; tag: string; blurb: string }

export const PUBLISHED: Post[] = [
  {
    slug: 'pdf-to-excel-wrong-numbers-bank-statements',
    tag: 'Data quality',
    readTime: '6 min read',
    published: '2026-11-03',
    title: 'Why PDF to Excel gets bank statements wrong, and how to check yours',
    excerpt: 'A bad PDF conversion looks like a clean spreadsheet. Here is what goes wrong, why "98% accurate" is not good enough for money, and a balance check you can run in Excel in a minute.',
    body: [
      { type: 'p', text: `The worst thing about a bad PDF conversion is that it looks fine. You get a tidy spreadsheet with dates in one column, amounts in another, and nothing flashing red. The wrong number is in there somewhere, and you find it when the totals don't match, which might be next week or never.` },
      { type: 'h', text: 'What actually goes wrong' },
      { type: 'p', text: `A PDF doesn't contain a table. It contains letters at positions on a page, and a converter has to work out which letters belong in which cell. A statement is easy for a person and awkward for software, because the columns are only lined up by eye. The usual failures, all of which show up in people's questions online:` },
      { type: 'ul', items: [
        `A debit lands in the credit column, or the other way round, so the sign of a transaction flips.`,
        `A long description wraps onto a second line and gets treated as a new row, or swallows the next one.`,
        `A number is split in two. One [Acrobat user](https://community.adobe.com/questions-9/adobe-export-pdf-not-converting-to-excel-properly-1317305) found that the export split numbers across cells and merged other columns into one long cell.`,
        `A row disappears at a page break, usually the first one on the new page.`,
        `The file converts but the accounting software refuses it. One person on [CAclubindia](https://www.caclubindia.com/experts/t-pri-6-0-import-bk-stat-in-excel-xslx-csv-csd-says-invalid-format-2954924.asp) converted a statement to CSV and XLSX and got "not a valid format" each time. The advice was to remove blank rows and merged cells and force one date format by hand.`,
      ] },
      { type: 'h', text: 'Why "98% accurate" is not good enough' },
      { type: 'p', text: `Say a tool gets 98% of rows right. On a 300 row statement that is about six wrong rows, and as one developer who builds these tools [puts it](https://dev.to/mainbook/the-hardest-part-of-parsing-bank-statements-isnt-the-parsing-356j), they look completely normal. You can't spot them by scrolling.` },
      { type: 'p', text: `It gets worse with how accuracy is usually measured. A recent [benchmark of 21 PDF parsers](https://arxiv.org/html/2603.18652v2) found that the standard scoring methods barely noticed errors like a lost decimal point (1.12 turning into 112) or a dropped minus sign. Those are exactly the errors that matter when the numbers are money. Even the best parsers in that test made mistakes, and the authors conclude that accurate table extraction from PDFs is still unsolved. Their test used tables from research papers, not bank statements, so treat it as a warning about the method, not a ranking for your bank.` },
      { type: 'h', text: 'The statement already knows the answer' },
      { type: 'p', text: `Here is the useful part. A bank statement prints a running balance after every row. That means it can check itself: the previous balance, plus this row's credit, minus this row's debit, has to equal this row's balance. If a number was misread, that sum breaks on that row. A developer who wrote about [exactly this approach](https://dev.to/hongwei_wang/your-pdf-bank-statement-parser-is-wrong-somewhere-balance-checks-tell-you-where-3b8j) points out that it also tells you what kind of mistake it was. Swapping two neighbouring digits always changes a number by a multiple of 9, so a gap divisible by 9 is a good sign that two digits were swapped.` },
      { type: 'p', text: `A real example from our own testing: we planted an error in a test statement, so that a balance printed as 227,052.98 where the maths said 272,052.98. The gap is 45,000, which is divisible by 9, and the next row also failed to follow from it. That pointed at the balance on that row, and it was right.` },
      { type: 'h', text: 'Run the check yourself in Excel' },
      { type: 'p', text: `You don't need our tool for this. Put Debit in column D, Credit in column E and Balance in column F, with your first transaction in row 3. In G3 type:` },
      { type: 'p', text: `\`=ROUND(F2+E3-D3-F3,2)\`` },
      { type: 'p', text: `Fill it down. Every row that shows 0 is consistent with the row above it. Anything else is a row to look at. To see whether it might be swapped digits, put this in H3:` },
      { type: 'p', text: `\`=IF(G3=0,"",IF(MOD(ROUND(ABS(G3)*100,0),9)=0,"digits swapped?","check"))\`` },
      { type: 'p', text: `If your statement lists the newest transaction first, swap the order: the row below is the earlier one. Also check the first row against the opening balance, and the last row against the closing balance printed on the statement.` },
      { type: 'h', text: 'What this check cannot catch' },
      { type: 'p', text: `It is worth being straight about this. A balance check proves the numbers are consistent with each other, not that they are right. If an amount and its balance were both misread in a way that still adds up, it passes. A statement with no running balance, which is most credit card statements, gives you nothing to check against. Two identical fees on the same day are fine on a statement with balances, and impossible to tell from a duplicate without them.` },
      { type: 'p', text: `So the check shrinks the problem a lot, from "any of 300 rows might be wrong" to "these three need a look", but it doesn't replace looking at the PDF for those three.` },
      { type: 'h', text: 'What we built' },
      { type: 'p', text: `We turned this into a tool. You drop in a statement PDF, every row gets a tick or a flag from the balance check, and the PDF page opens next to the table with the doubtful row outlined, so you can fix it in a few seconds. It reads the PDF's own text on our server without an AI service, and it refuses scanned files instead of guessing at digits. The details, including what it can't do, are on the [bank statement PDF to Excel page](/bank-statement-pdf-to-excel.html).` },
      { type: 'tip', text: `Whatever you use, ask one question of any converter: how will I know which rows are wrong? If the answer is "it is very accurate", add your own check.` },
    ],
  },
  {
    slug: 'is-my-data-safe',
    tag: 'Security',
    readTime: '5 min read',
    published: '2026-08',
    title: 'Is my data actually safe on this platform?',
    body: [
      { type: 'p', text: `Every time someone asks about connecting a database, this is the real question underneath it. Not "what features do you have". It's "what happens to my data once I hand it over." Fair enough. Here's the straight answer.` },
      { type: 'p', text: `Start with a test run, not your real database. Point the platform at a dummy table, a throwaway sheet, anything you don't care about, and watch what it actually does: how it profiles the data, what it flags, what fixes it suggests. Your real numbers are never touched during this. Once you've seen it work and you trust the process, swapping in your actual database is the exact same steps, just with real credentials this time.` },
      { type: 'p', text: `And here's the part that usually surprises people: we don't keep your data. Not a cached copy, not a backup, nothing sitting in a warehouse somewhere with your company's name on it. What we store is your name and your email (that's the account info, full stop). Everything else passes through and leaves.` },
      { type: 'p', text: `So what actually happens when you run a pipeline? Your database never moves. It stays exactly where it lives, behind whatever firewall or VPN you already have. A small agent sits on a machine you control and opens an encrypted connection out to us. When you kick off a query, it travels through that tunnel, gets executed right there on your own database, and the results come straight back the same way. You see it on your dashboard, and that's the end of the trip for that data. We don't hang onto it after.` },
      { type: 'h', text: 'Setting up the connection' },
      { type: 'p', text: `If your database is sitting behind a firewall (most are, and it should stay that way), you don't open a port or change any network settings. Instead you run a lightweight script (the agent) on any machine that already has access to your database.` },
      { type: 'p', text: `It goes like this: install two small Python packages with one pip command. Download the agent file from your dashboard. Grab a one-time connection token from your account and keep it somewhere safe. This is what tells our backend the agent belongs to you. Run the script, and it'll ask for your server URL, that token, and your database's host, username, and password. None of this goes anywhere except between your machine and your own backend, so no third party sees it. Last step, add your database as a source in the browser, plug in the same host and database name, hit test connection, and you're live.` },
      { type: 'p', text: `Every query after that runs through the same tunnel, every time.` },
      { type: 'h', text: 'One mistake to avoid' },
      { type: 'p', text: `Where people park agent.py trips them up more than anything else. Keep it running on a machine that actually stays on, like a server, not your laptop that goes to sleep at night. If the agent stops, the connection drops and nothing can reach your database until you start it back up. Don't move the file around after setup either, because you'll just have to redo the whole thing from the new spot. And treat that connection token like a password. Don't paste it in a Slack channel or push it to a public repo. If someone gets hold of it, they can pretend to be your agent.` },
      { type: 'p', text: `Try the free trial before you put a card down. Run it against a test source first if you want zero risk while you're figuring things out, and only connect the real database once it feels right. If something's still unclear, just ask and we'll happily walk through it.` },
    ],
  },
  {
    slug: 'how-ai-cleaning-keeps-your-data-private',
    tag: 'Privacy',
    readTime: '6 min read',
    published: '2026-11-01',
    title: 'How AI cleaning works without ever seeing your data',
    excerpt: `You type "remove duplicate customers" and your file gets cleaned. Here's what happens in between, with pictures, and why the AI never reads a single row.`,
    body: [
      { type: 'p', text: `You type "remove duplicate customers", press send, and a few seconds later the file is clean. It feels a bit like magic, and magic makes careful people nervous. Where did my file go? Who read it? Fair questions. This post answers them with pictures, so you don't need to know anything technical.` },
      { type: 'p', text: `The short version: **the AI that helps you clean never gets your rows.** It gets your instruction and a description of what kind of columns you have. That's all.` },
      { type: 'h', text: 'What happens when you ask for a clean-up' },
      { type: 'p', text: `Five things happen, and only one of them involves the AI. Look at the picture below, then we'll go through it.` },
      { type: 'diagram', id: 'steps', caption: 'Five steps from request to clean file. The AI only takes part in step 3.' },
      { type: 'p', text: `Step one is you, typing in plain English. Step two is our server looking at your table and writing a short description of each column. Step three is the only time the AI is involved: it reads your sentence and that description, then writes a small set of cleaning instructions, a recipe. Step four is us checking the recipe and running it on your full file. Step five is you downloading the result.` },
      { type: 'h', text: 'Where your file actually goes' },
      { type: 'p', text: `Think of three places. Your computer, our servers, and the AI. The full file travels from you to our servers, and no further.` },
      { type: 'diagram', id: 'journey', caption: 'Green is your full data. Pink is the only thing the AI receives.' },
      { type: 'p', text: `The AI sits at the bottom of that picture for a reason. It's a helper that writes the recipe. The cooking, meaning the actual cleaning of your rows, happens on our side.` },
      { type: 'h', text: 'What "a description of your columns" really means' },
      { type: 'p', text: `This is the part people ask about most, so here's a real example. Say your file has names, emails and salaries. We don't send "Anna Smith, anna@mail.com, 82,000". We send something closer to "a text column that looks like Aaaa Aaaaa", "an email column", "a whole number column". The AI learns the shape of the data, not the data.` },
      { type: 'diagram', id: 'seen', caption: 'Top: what is in your file. Bottom: everything the AI is told about it.' },
      { type: 'p', text: `Why does shape matter at all? Because a recipe for dates looks different from a recipe for phone numbers. Knowing that a column holds dates written like 03/04/1990 is enough to write a good date fix. Knowing whose birthday it is adds nothing.` },
      { type: 'h', text: 'Do you just trust whatever the AI sends back?' },
      { type: 'p', text: `No. The recipe is treated like a note from a stranger. Before we run it we read it, and we refuse anything that tries to do more than tidy a table: reading other files, reaching the internet, running system commands, or looping forever. A recipe that passes runs inside a tight box on our server. One that doesn't is thrown away, and you see a plain "this rule couldn't be applied" message.` },
      { type: 'tip', text: `A recipe can only change the table you gave it. It has no way to look at anyone else's data, because it never gets access to anything else.` },
      { type: 'h', text: 'What you give up' },
      { type: 'p', text: `Honesty time. Because the AI can't see your values, some jobs get harder. Fixing typos in a city column is the classic one: the AI doesn't know your column contains "Bombay" and "Mumbay" unless you say so. The easy fix is to name them in your instruction, like "change Bombay and Mumbay to Mumbai". Everything that works from structure, such as removing duplicates, trimming spaces, fixing date formats, filling blanks and converting numbers stored as text, works the same as before.` },
      { type: 'h', text: 'The optional switch' },
      { type: 'p', text: `Some teams would rather have better results on value-based fixes and are happy to let the AI see a few sample rows. So there's a switch. **Private mode is on by default.** An admin can turn it off for the whole workspace, and turn it back on whenever they like. If you never touch it, the AI never sees a row.` },
      { type: 'diagram', id: 'modes', caption: 'The two modes side by side. Private mode is the default.' },
      { type: 'h', text: 'What we do still send' },
      { type: 'p', text: `Two things, so nobody is surprised. The sentence you type is sent exactly as you wrote it, so don't paste personal details into it. And column names are sent, so a column called "diagnosis" tells the AI that a column called "diagnosis" exists. If a name itself is sensitive, rename it before you upload.` },
      { type: 'p', text: `The AI behind the feature is Claude, made by Anthropic. We say so in the app and in our [privacy policy](/privacy.html), and we send it only what's described above.` },
      { type: 'h', text: 'Check it yourself' },
      { type: 'p', text: `Open the AI window in the app. Under the input box there's a line saying whether private mode is on, and what gets sent. Everything in this post is also written down in the [privacy policy](/privacy.html). If something there ever disagrees with what you see, tell us at contact@thegodstool.com and we'll fix it.` },
    ],
  },
]

// Topics you plan to write. They show as "Coming soon" cards. Edit freely, or empty the list to hide the section.
export const UPCOMING: Upcoming[] = [
  { title: 'How to clean a messy CSV in five minutes', tag: 'Guides', blurb: 'A step-by-step walkthrough: duplicates, blanks, dates and spelling, with before and after.' },
  { title: 'Google Sheets or CSV: which should you clean first?', tag: 'Guides', blurb: 'When each one makes sense, and how to move between them without losing work.' },
  { title: 'How AI credits work, and how far they go', tag: 'Product', blurb: 'What one credit buys, when daily allowances apply, and how to avoid running out mid-job.' },
  { title: 'Delivering clean data to clients, faster', tag: 'Freelancers', blurb: 'A simple routine freelancers use to turn a client file into a finished, repeatable result.' },
]

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatDate(published: string): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(published)
  if (!m) return published
  const month = MONTHS[Number(m[2]) - 1] || ''
  return m[3] ? `${Number(m[3])} ${month} ${m[1]}` : `${month} ${m[1]}`
}

export function plain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1')
}

export function wordCount(p: Post): number {
  const words = p.body.map(b => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : (b.caption || ''))).join(' ')
  return plain(words).split(/\s+/).filter(Boolean).length
}

export function readTimeOf(p: Post): string {
  return p.readTime || `${Math.max(1, Math.round(wordCount(p) / 200))} min read`
}

export function excerptOf(p: Post): string {
  if (p.excerpt) return p.excerpt
  const first = p.body.find(b => b.type === 'p') as { text: string } | undefined
  const t = plain(first?.text || '')
  if (t.length <= 170) return t
  return t.slice(0, 170).replace(/\s+\S*$/, '') + '…'
}

export function headingId(text: string): string {
  return plain(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Newest first. Posts dated in the future are held back until their date, so you can prepare ahead. */
export function listPublished(now = new Date()): Post[] {
  const today = now.toISOString().slice(0, 10)
  return PUBLISHED.filter(p => (p.published.length === 7 ? p.published + '-01' : p.published) <= today)
    .sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0))
}

export function findPost(slug: string): Post | undefined {
  return listPublished().find(p => p.slug === slug)
}
