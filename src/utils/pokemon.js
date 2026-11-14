export const TYPE_COLORS = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD'
}

export const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed'
}

export const MAX_STAT = 255

const ARTWORK_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'

export function typeColor (type) {
  return TYPE_COLORS[type] ?? '#888'
}

// Light types (electric, ice, ...) need dark text to stay readable
export function typeTextColor (type) {
  const hex = typeColor(type).slice(1)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#1f1f1f' : '#fff'
}

export function formatName (name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatId (id) {
  return `#${String(id).padStart(4, '0')}`
}

// Artwork can be shown before the details request finishes, since it only needs the id
export function artworkUrl (id) {
  return `${ARTWORK_URL}/${id}.png`
}

export function pickSprite (details) {
  const sprites = details?.sprites
  return sprites?.other?.['official-artwork']?.front_default ??
    sprites?.other?.home?.front_default ??
    sprites?.front_default ??
    null
}

export function normalizePokemon (raw) {
  return {
    id: raw.id,
    name: raw.name,
    sprite: pickSprite(raw),
    types: raw.types
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map(({ type }) => type.name),
    stats: raw.stats.map(({ stat, base_stat: value }) => ({
      key: stat.name,
      label: STAT_LABELS[stat.name] ?? formatName(stat.name),
      value
    })),
    total: raw.stats.reduce((sum, { base_stat: value }) => sum + value, 0),
    height: raw.height / 10, // decimetres -> metres
    weight: raw.weight / 10, // hectograms -> kilograms
    abilities: raw.abilities.map(({ ability, is_hidden: hidden }) => ({
      name: ability.name,
      hidden
    })),
    speciesUrl: raw.species?.url ?? null,
    cry: raw.cries?.latest ?? null
  }
}

export function pickFlavorText (species, language = 'en') {
  const entries = species?.flavor_text_entries ?? []
  const entry = [...entries].reverse().find((e) => e.language.name === language)
  return entry ? entry.flavor_text.replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').trim() : null
}

export function pickGenus (species, language = 'en') {
  return species?.genera?.find((g) => g.language.name === language)?.genus ?? null
}
