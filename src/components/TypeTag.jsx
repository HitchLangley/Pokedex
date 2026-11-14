import { formatName, typeColor, typeTextColor } from '../utils/pokemon'

export function TypeTag ({ type, size = 'default' }) {
  return (
    <span
      className={`type-tag type-tag--${size}`}
      style={{ backgroundColor: typeColor(type), color: typeTextColor(type) }}
    >
      {formatName(type)}
    </span>
  )
}
