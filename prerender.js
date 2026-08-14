import puppeteer from 'puppeteer'
import { createServer } from 'http'
import handler from 'serve-handler'
import fs from 'fs'
import path from 'path'

const routes = ['/', '/pricing', '/contact', '/blog', '/terms', '/feedback']
const PORT = 5005

const server = createServer((req, res) => handler(req, res, { public: 'dist' }))
server.listen(PORT, async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  for (const route of routes) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0' })
    const html = await page.content()
    const outDir = route === '/' ? 'dist' : path.join('dist', route)
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'index.html'), html)
    console.log(`Prerendered ${route}`)
  }

  await browser.close()
  server.close()
})
