import { useEffect, useMemo, useState } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const RANGE_OPTIONS = [
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(str) {
  return new Date(str + 'T00:00:00Z');
}
function formatYmd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + n);
  return nd;
}
function mondayOf(d) {
  const dow = d.getUTCDay();
  const back = (dow + 6) % 7;
  return addDays(d, -back);
}

function bucketWeek({ start, end, days }) {
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const startD = parseDate(start);
  const endD = parseDate(end);
  const labels = [];
  const values = [];
  for (let d = new Date(startD); d <= endD; d = addDays(d, 1)) {
    labels.push(DAY_LABELS[(d.getUTCDay() + 6) % 7]);
    values.push(counts.get(formatYmd(d)) ?? 0);
  }
  return { labels, values };
}

function bucketMonth({ start, end, days }) {
  const startD = parseDate(start);
  const endD = parseDate(end);
  const buckets = [];
  let cursor = mondayOf(startD);
  // If the Monday is before the 1st, the first bucket still starts at the 1st of the month
  while (cursor <= endD) {
    const bucketStart = cursor < startD ? startD : cursor;
    const nextMonday = addDays(mondayOf(cursor), 7);
    const bucketEnd = nextMonday > endD ? endD : addDays(nextMonday, -1);
    buckets.push({ start: bucketStart, end: bucketEnd });
    cursor = nextMonday;
  }
  const countsByDate = new Map(days.map((d) => [d.date, d.count]));
  const labels = buckets.map(
    (b) => `Wk of ${MONTH_LABELS[b.start.getUTCMonth()]} ${b.start.getUTCDate()}`
  );
  const values = buckets.map((b) => {
    let sum = 0;
    for (let d = new Date(b.start); d <= b.end; d = addDays(d, 1)) {
      sum += countsByDate.get(formatYmd(d)) ?? 0;
    }
    return sum;
  });
  return { labels, values };
}

function bucketYear({ start, end, days }) {
  const startD = parseDate(start);
  const endD = parseDate(end);
  const sumsByMonth = new Map();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    sumsByMonth.set(key, (sumsByMonth.get(key) ?? 0) + d.count);
  }
  const labels = [];
  const values = [];
  const year = startD.getUTCFullYear();
  const endMonth = endD.getUTCFullYear() === year ? endD.getUTCMonth() : 11;
  for (let m = 0; m <= endMonth; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    labels.push(MONTH_LABELS[m]);
    values.push(sumsByMonth.get(key) ?? 0);
  }
  return { labels, values };
}

export default function AdminVisualizations() {
  const [range, setRange] = useState('week');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/admin/visualizations/games-played?range=${range}`, {
      credentials: 'include',
    })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) setError(body?.error || 'Failed to load chart data');
        else setData(body);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const chart = useMemo(() => {
    if (!data) return null;
    if (range === 'week') return bucketWeek(data);
    if (range === 'month') return bucketMonth(data);
    return bucketYear(data);
  }, [data, range]);

  const chartData = chart
    ? {
        labels: chart.labels,
        datasets: [
          {
            label: 'Games played',
            data: chart.values,
            backgroundColor: '#4f8cff',
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  return (
    <div className="admin__section">
      <div className="admin__dashboard-header">
        <h3 className="admin__section-title">Games played</h3>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="admin__role-select"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="admin__error">{error}</p>}
      {loading && !chartData && <p className="admin__empty">Loading chart…</p>}
      {chartData && (
        <div style={{ height: 320 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}
