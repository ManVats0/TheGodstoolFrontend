// Asks for a PDF's password when the file is locked. The password goes to the server only to open this one file,
// is not stored, and is cleared from the box as soon as it is sent.

import { useState } from 'react'

export default function PdfPassword({
  kind,
  busy,
  onSubmit,
}: {
  kind: 'required' | 'wrong'
  busy: boolean
  onSubmit: (password: string) => void
}) {
  const [pw, setPw] = useState('')
  const go = () => {
    if (!pw || busy) return
    const v = pw
    setPw('')
    onSubmit(v)
  }
  return (
    <div
      role="group"
      aria-label="PDF password"
      style={{
        marginTop: 14,
        padding: 18,
        borderRadius: 14,
        border: '1px solid rgba(251,191,36,0.4)',
        background: 'rgba(251,191,36,0.07)',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {kind === 'wrong' ? 'That password did not open the PDF.' : 'This PDF is password-protected.'}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 10 }}>
        {kind === 'wrong'
          ? 'Check it and try again. Banks often use a mix of your name, date of birth or customer ID, as printed in their email.'
          : 'Enter the password to read it. It is used only to open this file. It is not stored, and neither is the PDF.'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          autoComplete="off"
          autoFocus
          placeholder="PDF password"
          aria-label="PDF password"
          style={{
            flex: '1 1 200px',
            minWidth: 0,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: 10,
            padding: '10px 12px',
            font: 'inherit',
          }}
        />
        <button
          onClick={go}
          disabled={!pw || busy}
          style={{
            background: '#7c3aed',
            border: 'none',
            color: 'white',
            borderRadius: 10,
            padding: '10px 18px',
            fontWeight: 700,
            cursor: !pw || busy ? 'default' : 'pointer',
            opacity: !pw || busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Opening…' : 'Open PDF'}
        </button>
      </div>
    </div>
  )
}
