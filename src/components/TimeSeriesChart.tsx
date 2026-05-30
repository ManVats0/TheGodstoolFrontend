import { useEffect, useRef } from 'react'

interface Props {
  chartData: {
    date_col: string
    value_col: string
    freq: string
    dates: string[]
    values: number[]
  }
}

declare const Plotly: any

export default function TimeSeriesChart({ chartData }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !chartData) return

    const layout = {
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: '#64748b', size: 11, family: 'Inter' },
      margin: { t: 10, r: 10, b: 50, l: 60 },
      xaxis: {
        gridcolor: 'rgba(255,255,255,0.04)',
        linecolor: 'rgba(255,255,255,0.08)',
        tickfont: { color: '#64748b', size: 10 },
        showgrid: true
      },
      yaxis: {
        gridcolor: 'rgba(255,255,255,0.04)',
        linecolor: 'rgba(255,255,255,0.08)',
        tickfont: { color: '#64748b', size: 10 },
        title: { text: chartData.value_col, font: { color: '#94a3b8', size: 11 } },
        showgrid: true
      },
      showlegend: false,
      hovermode: 'x unified'
    }

    const trace = {
      x: chartData.dates,
      y: chartData.values,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#7c3aed', width: 2, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(124,58,237,0.08)',
      name: chartData.value_col,
      hovertemplate: `<b>%{x}</b><br>${chartData.value_col}: %{y}<extra></extra>`
    }

    Plotly.newPlot(ref.current, [trace], layout, {
      responsive: true,
      displayModeBar: false
    })

    return () => {
      if (ref.current) Plotly.purge(ref.current)
    }
  }, [chartData])

  return <div ref={ref} style={{ width: '100%', height: '320px' }} />
}