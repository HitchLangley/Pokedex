import { observer } from 'mobx-react-lite'
import { Button, Empty, Grid, Pagination, Result, Skeleton } from 'antd'
import { useStores } from '../stores/RootStore'
import { PAGE_SIZES } from '../utils/urlState'
import { PokemonCard } from './PokemonCard'

function LoadingGrid ({ count }) {
  return (
    <div className='pokemon-grid' aria-busy='true'>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='pokemon-card pokemon-card--placeholder'>
          <Skeleton.Avatar active size={96} shape='circle' />
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ))}
    </div>
  )
}

export const PokemonList = observer(function PokemonList () {
  const { pokedex } = useStores()
  const screens = Grid.useBreakpoint()

  if (pokedex.status === 'error') {
    return (
      <Result
        status='warning'
        title="Couldn't reach the Pokémon API"
        subTitle={pokedex.error}
        extra={<Button type='primary' onClick={pokedex.init}>Try again</Button>}
      />
    )
  }

  if (pokedex.isListLoading) {
    return <LoadingGrid count={Math.min(pokedex.pageSize, 10)} />
  }

  if (!pokedex.total) {
    return (
      <Empty
        className='pokemon-list__empty'
        description={pokedex.favoritesOnly && !pokedex.search && !pokedex.selectedTypes.length
          ? 'No favourites yet — tap the star on any pokémon'
          : 'No pokémon match these filters'}
      >
        {pokedex.hasFilters && <Button onClick={pokedex.clearFilters}>Clear filters</Button>}
      </Empty>
    )
  }

  const pagination = (
    <Pagination
      className='pokemon-list__pagination'
      current={pokedex.currentPage}
      pageSize={pokedex.pageSize}
      total={pokedex.total}
      pageSizeOptions={PAGE_SIZES}
      showSizeChanger
      showLessItems={!screens.md}
      showTotal={screens.sm ? (total, [from, to]) => `${from}–${to} of ${total}` : undefined}
      onChange={(page, pageSize) => {
        pokedex.setPage(page, pageSize)
        window.scrollTo?.({ top: 0, behavior: 'smooth' })
      }}
    />
  )

  return (
    <section className='pokemon-list' aria-label='Pokémon'>
      <div className='pokemon-grid'>
        {pokedex.pageItems.map(({ id, name }, index) => (
          <PokemonCard key={name} id={id} name={name} index={index} />
        ))}
      </div>
      {pagination}
    </section>
  )
})
