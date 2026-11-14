export const PAGE_SIZES = [10, 20, 50]

// Filters live in the query string so a filtered view can be bookmarked or shared
export function parseQuery (search) {
  const params = new URLSearchParams(search)
  const state = {}

  const q = params.get('q')
  if (q) state.search = q

  const types = params.get('types')
  if (types) state.selectedTypes = types.split(',').filter(Boolean)

  const page = Number(params.get('page'))
  if (Number.isInteger(page) && page > 0) state.page = page

  const size = Number(params.get('size'))
  if (PAGE_SIZES.includes(size)) state.pageSize = size

  if (params.get('favorites') === '1') state.favoritesOnly = true

  return state
}

export function buildQuery ({ search, selectedTypes, page, pageSize, favoritesOnly }) {
  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (selectedTypes.length) params.set('types', selectedTypes.join(','))
  if (page > 1) params.set('page', String(page))
  if (pageSize !== 20) params.set('size', String(pageSize))
  if (favoritesOnly) params.set('favorites', '1')
  const query = params.toString()
  return query ? `?${query}` : ''
}
