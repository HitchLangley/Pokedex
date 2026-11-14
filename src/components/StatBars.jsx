import { MAX_STAT } from '../utils/pokemon'

function statColor (value) {
  if (value >= 120) return '#2bb673'
  if (value >= 90) return '#8bc34a'
  if (value >= 60) return '#f5b700'
  return '#f06543'
}

export function StatBars ({ stats, compact = false }) {
  return (
    <ul className={`stat-bars${compact ? ' stat-bars--compact' : ''}`}>
      {stats.map(({ key, label, value }) => (
        <li key={key} className='stat-bars__row'>
          <span className='stat-bars__label'>{label}</span>
          <span className='stat-bars__value'>{value}</span>
          <span className='stat-bars__track' role='meter' aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={MAX_STAT}>
            <span
              className='stat-bars__fill'
              style={{ width: `${Math.min(100, (value / MAX_STAT) * 100)}%`, backgroundColor: statColor(value) }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}
