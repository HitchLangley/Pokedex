import { observer } from 'mobx-react-lite'
import { Button, Skeleton } from 'antd'
import { useStores } from '../stores/RootStore'
import { artworkUrl, formatId, formatName } from '../utils/pokemon'
import { FavoriteButton } from './FavoriteButton'
import { PokemonImage } from './PokemonImage'
import { StatBars } from './StatBars'
import { TypeTag } from './TypeTag'

export const PokemonCard = observer(function PokemonCard ({ id, name, index = 0 }) {
  const { pokedex, ui } = useStores()
  const details = pokedex.details.get(name)
  const error = pokedex.detailErrors.get(name)
  const open = () => ui.openPokemon(name)

  return (
    <article
      className='pokemon-card'
      style={{ '--delay': `${Math.min(index, 20) * 25}ms` }}
      tabIndex={0}
      aria-label={formatName(name)}
      onClick={open}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          open()
        }
      }}
    >
      <header className='pokemon-card__header'>
        <span className='pokemon-card__id'>{formatId(id)}</span>
        <FavoriteButton name={name} size='small' />
      </header>

      <div className='pokemon-card__avatar'>
        <PokemonImage key={details?.sprite ?? artworkUrl(id)} id={id} name={name} src={details?.sprite} />
      </div>

      <h3 className='pokemon-card__name'>{formatName(name)}</h3>

      {details && (
        <>
          <div className='pokemon-card__types'>
            {details.types.map((type) => <TypeTag key={type} type={type} />)}
          </div>
          <StatBars stats={details.stats} compact />
        </>
      )}

      {!details && !error && <Skeleton active paragraph={{ rows: 4 }} title={false} />}

      {error && (
        <div className='pokemon-card__error'>
          Couldn't load details.{' '}
          <Button
            size='small'
            type='link'
            onClick={(event) => {
              event.stopPropagation()
              pokedex.loadDetails(name)
            }}
          >
            Retry
          </Button>
        </div>
      )}
    </article>
  )
})
