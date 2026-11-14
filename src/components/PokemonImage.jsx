import { useState } from 'react'
import { artworkUrl } from '../utils/pokemon'

const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#bbb" stroke-width="6"/><path d="M4 50h92" stroke="#bbb" stroke-width="6"/><circle cx="50" cy="50" r="13" fill="#fff" stroke="#bbb" stroke-width="6"/></svg>'
)}`

export function PokemonImage ({ id, name, src, className = '' }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  // artwork by id is available instantly; the details sprite replaces it once loaded
  const url = failed ? PLACEHOLDER : (src ?? artworkUrl(id))

  return (
    <img
      className={`pokemon-image${loaded ? ' pokemon-image--loaded' : ''} ${className}`}
      src={url}
      alt={name}
      loading='lazy'
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  )
}
