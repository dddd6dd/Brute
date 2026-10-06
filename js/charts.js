

// ---------- 글래스 테마 라인 차트 ----------
// 테마 CSS 변수를 읽어서 라이트/다크 둘 다 자연스럽게 어울리는 차트를 만들어요.
function cssVarRaw(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildGlassLineChart(canvas, { labels, data, label, suffix, highlights, tooltipLabel }){
  const accent = cssVarRaw('--chart-accent') || '74, 122, 181';
  const gridColor = cssVarRaw('--chart-grid') || 'rgba(0,0,0,0.07)';
  const tooltipBg = cssVarRaw('--chart-tooltip-bg') || 'rgba(24,24,22,0.86)';
  const tooltipBorder = cssVarRaw('--chart-tooltip-border') || 'rgba(255,255,255,0.14)';
  const mutedColor = cssVarRaw('--text-muted') || '#8f8c85';
  const surfaceColor = cssVarRaw('--surface-1') || '#ffffff';
  const monoFont = cssVarRaw('--font-mono') || 'monospace';
  const isHi = (i)=> Array.isArray(highlights) && highlights[i];

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: label || '',
        data,
        borderColor: `rgba(${accent},0.9)`,
        borderWidth: 2,
        // 차트 영역 기준 세로 그라데이션이라 리사이즈돼도 자연스럽게 유지돼요
        backgroundColor: (ctx)=>{
          const { ctx: c, chartArea } = ctx.chart;
          if(!chartArea) return 'transparent';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, `rgba(${accent},0.30)`);
          g.addColorStop(1, `rgba(${accent},0.01)`);
          return g;
        },
        fill: true,
        tension: 0.35,
        pointRadius: (ctx)=> isHi(ctx.dataIndex) ? 5 : 3.5,
        pointHoverRadius: (ctx)=> isHi(ctx.dataIndex) ? 7 : 5.5,
        pointBackgroundColor: (ctx)=> isHi(ctx.dataIndex) ? `rgb(${accent})` : surfaceColor,
        pointBorderColor: `rgba(${accent},0.9)`,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      interaction: { intersect: false, mode: 'index' },
      layout: { padding: { top: 8, right: 4, left: 0, bottom: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
          displayColors: false,
          titleColor: 'rgba(255,255,255,0.6)',
          titleFont: { size: 11, family: monoFont, weight: '400' },
          bodyColor: '#ffffff',
          bodyFont: { size: 14, weight: '600' },
          callbacks: {
            label: tooltipLabel || ((ctx)=> `${round1(ctx.parsed.y)}${suffix || ''}`)
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: mutedColor,
            font: { size: 11, family: monoFont },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5
          }
        },
        y: {
          grid: { color: gridColor, drawTicks: false },
          border: { display: false },
          ticks: {
            color: mutedColor,
            font: { size: 11, family: monoFont },
            padding: 8,
            maxTicksLimit: 5,
            callback: (v)=> `${round1(v)}${suffix || ''}`
          }
        }
      }
    }
  });
}
