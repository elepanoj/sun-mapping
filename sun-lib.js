// Shared sun/shade/heat-gauge logic used by index.html and report.html.
// Requires suncalc (https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.js) to be loaded first.

const $ = (id) => document.getElementById(id);

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTime(d) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(hoursFloat) {
  const h = Math.floor(hoursFloat);
  const m = Math.round((hoursFloat - h) * 60);
  return `${h}h ${m}m`;
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.length) throw new Error('Address not found — try adding city/state');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
}

async function getForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=cloud_cover_mean,precipitation_probability_mean,temperature_2m_max,temperature_2m_min,sunshine_duration` +
    `&forecast_days=7&timezone=auto&temperature_unit=fahrenheit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Forecast request failed');
  return res.json();
}

function renderSunCards(containerId, times) {
  const dayHours = (times.sunset - times.sunrise) / 3600000;
  const cards = [
    ['Sunrise', fmtTime(times.sunrise)],
    ['Solar noon', fmtTime(times.solarNoon)],
    ['Sunset', fmtTime(times.sunset)],
    ['Day length', fmtDuration(dayHours)],
    ['Golden hour AM', `${fmtTime(times.dawn)} – ${fmtTime(times.goldenHourEnd)}`],
    ['Golden hour PM', `${fmtTime(times.goldenHour)} – ${fmtTime(times.dusk)}`],
  ];
  $(containerId).innerHTML = cards.map(([label, value]) =>
    `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`
  ).join('');
}

function renderSunPath(svgId, date, lat, lon, sunriseMs, sunsetMs) {
  const svg = $(svgId);
  const W = 600, H = 160, pad = 20;
  const startMin = Math.max(0, new Date(sunriseMs).getHours() * 60 - 30);
  const endMin = Math.min(1439, new Date(sunsetMs).getHours() * 60 + new Date(sunsetMs).getMinutes() + 30);
  let points = [];
  let maxAlt = 0;
  for (let m = startMin; m <= endMin; m += 10) {
    const t = new Date(date); t.setHours(0, m, 0, 0);
    const pos = SunCalc.getPosition(t, lat, lon);
    const altDeg = pos.altitude * 180 / Math.PI;
    maxAlt = Math.max(maxAlt, altDeg);
    points.push([m, altDeg]);
  }
  maxAlt = Math.max(maxAlt, 10);
  const xScale = (m) => pad + (m - startMin) / (endMin - startMin) * (W - 2 * pad);
  const yScale = (alt) => H - pad - Math.max(alt, 0) / maxAlt * (H - 2 * pad);
  const path = points.map(([m, alt], i) => `${i === 0 ? 'M' : 'L'} ${xScale(m).toFixed(1)} ${yScale(alt).toFixed(1)}`).join(' ');
  const horizonY = yScale(0).toFixed(1);
  svg.innerHTML = `
    <line x1="${pad}" y1="${horizonY}" x2="${W - pad}" y2="${horizonY}" stroke="#2a333b" stroke-width="1"/>
    <path d="${path}" fill="none" stroke="#f2a900" stroke-width="2.5"/>
    <text x="${pad}" y="${H - 4}" fill="#93a3af" font-size="11">${fmtTime(new Date(sunriseMs))}</text>
    <text x="${W - pad}" y="${H - 4}" fill="#93a3af" font-size="11" text-anchor="end">${fmtTime(new Date(sunsetMs))}</text>
  `;
}

function renderForecast(tableSelector, data) {
  const tbody = document.querySelector(`${tableSelector} tbody`);
  const days = data.daily.time;
  tbody.innerHTML = days.map((d, i) => {
    const cloud = data.daily.cloud_cover_mean[i];
    const rain = data.daily.precipitation_probability_mean[i];
    const hi = Math.round(data.daily.temperature_2m_max[i]);
    const lo = Math.round(data.daily.temperature_2m_min[i]);
    const sunH = (data.daily.sunshine_duration[i] / 3600).toFixed(1);
    const dayLabel = new Date(d + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return `<tr>
      <td>${dayLabel}</td>
      <td><span class="cloud-bar" style="width:${Math.max(4, cloud)}px"></span>${cloud}%</td>
      <td>${sunH}h</td>
      <td>${rain}%</td>
      <td>${hi}° / ${lo}°</td>
    </tr>`;
  }).join('');
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function computeHeatScore(highTempF, sunshineRatio, altitudeDeg) {
  const tempScore = clamp((highTempF - 50) / 50 * 100, 0, 100);
  const sunScore = clamp(sunshineRatio * 100, 0, 100);
  const altScore = clamp((altitudeDeg - 20) / 60 * 100, 0, 100);
  return Math.round(0.5 * tempScore + 0.3 * sunScore + 0.2 * altScore);
}

function ratingLabel(score) {
  if (score < 25) return 'Mild';
  if (score < 50) return 'Moderate';
  if (score < 75) return 'High';
  return 'Extreme';
}

const HEAT_STOPS = [
  [0, [76, 175, 125]],
  [33, [232, 212, 77]],
  [66, [242, 169, 0]],
  [100, [224, 90, 90]],
];

function colorForScore(score) {
  score = clamp(score, 0, 100);
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    const [s0, c0] = HEAT_STOPS[i], [s1, c1] = HEAT_STOPS[i + 1];
    if (score >= s0 && score <= s1) {
      const t = (score - s0) / (s1 - s0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      return `rgb(${r},${g},${b})`;
    }
  }
  const last = HEAT_STOPS[HEAT_STOPS.length - 1][1];
  return `rgb(${last.join(',')})`;
}

function polarPoint(cx, cy, r, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function buildGaugeArcSegments(cx, cy, r, segments) {
  let paths = '';
  const pad = (100 / segments) * 0.2;
  for (let i = 0; i < segments; i++) {
    const scoreStart = (i / segments) * 100;
    const scoreEnd = Math.min(100, ((i + 1) / segments) * 100 + pad);
    const angleStart = 180 - (scoreStart / 100) * 180;
    const angleEnd = 180 - (scoreEnd / 100) * 180;
    const p1 = polarPoint(cx, cy, r, angleStart);
    const p2 = polarPoint(cx, cy, r, angleEnd);
    const color = colorForScore((scoreStart + scoreEnd) / 2);
    paths += `<path d="M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}" stroke="${color}" stroke-width="24" fill="none"/>`;
  }
  return paths;
}

function buildNeedle(cx, cy, r, score) {
  const angle = 180 - (score / 100) * 180;
  const tip = polarPoint(cx, cy, r - 30, angle);
  const leftBase = polarPoint(cx, cy, 12, angle + 90);
  const rightBase = polarPoint(cx, cy, 12, angle - 90);
  return `<polygon points="${tip.x.toFixed(2)},${tip.y.toFixed(2)} ${leftBase.x.toFixed(2)},${leftBase.y.toFixed(2)} ${rightBase.x.toFixed(2)},${rightBase.y.toFixed(2)}" fill="#2c2c2c"/>
    <circle cx="${cx}" cy="${cy}" r="15" fill="#2c2c2c"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="${colorForScore(score)}"/>`;
}

function buildStatRow(x, y, dotColor, label, value) {
  return `<circle cx="${x + 4}" cy="${y - 4}" r="4" fill="${dotColor}"/>
    <text x="${x + 16}" y="${y}" font-size="13" fill="#555555">${label}</text>
    <text x="412" y="${y}" font-size="13" fill="#1a1a1a" font-weight="700" text-anchor="end">${value}</text>`;
}

function buildHeatGaugeSVG({ score, altitudeDeg, address }) {
  const cx = 220, cy = 185, r = 120;
  const label = ratingLabel(score);
  const color = colorForScore(score);
  const shortAddr = address.length > 52 ? address.slice(0, 49) + '…' : address;
  return `
<svg id="heatGaugeSvg" viewBox="0 0 440 360" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
  <rect x="1" y="1" width="438" height="358" rx="18" fill="#ffffff" stroke="#e4e4e7" stroke-width="1"/>
  <text x="28" y="32" font-size="11" letter-spacing="1.5" fill="#9a9aa2" font-weight="700">SUN EXPOSURE RATING</text>
  ${buildGaugeArcSegments(cx, cy, r, 56)}
  ${buildNeedle(cx, cy, r, score)}
  <text x="${cx - r}" y="${cy + 26}" font-size="11" fill="#9a9aa2" font-weight="600">MILD</text>
  <text x="${cx + r}" y="${cy + 26}" font-size="11" fill="#9a9aa2" font-weight="600" text-anchor="end">EXTREME</text>
  <text x="${cx}" y="${cy + 56}" font-size="52" font-weight="800" fill="${color}" text-anchor="middle">${score}</text>
  <text x="${cx}" y="${cy + 82}" font-size="16" font-weight="700" fill="${color}" text-anchor="middle" letter-spacing="1">${label.toUpperCase()}</text>
  <line x1="28" y1="${cy + 104}" x2="412" y2="${cy + 104}" stroke="#eeeeee" stroke-width="1"/>
  ${buildStatRow(28, cy + 128, '#e8a33d', 'Sun angle at noon', `${Math.round(altitudeDeg)}°`)}
  <text x="28" y="${cy + 152}" font-size="11" fill="#b3b3ba">${shortAddr}</text>
</svg>`;
}

function renderHeatGauge(containerId, data) {
  $(containerId).innerHTML = buildHeatGaugeSVG(data);
}

function downloadSvgAsPng(svgEl, filename, scale) {
  scale = scale || 2;
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const image64 = 'data:image/svg+xml;base64,' + svg64;
  const img = new Image();
  img.onload = () => {
    const vb = svgEl.viewBox.baseVal;
    const w = vb.width, h = vb.height;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = image64;
}

function shadeMapUrl(lat, lon, dateAtMinutes) {
  const ts = dateAtMinutes.getTime();
  return `https://shademap.app/@${lat},${lon},19z,${ts}t,0b,55p,0m`;
}
