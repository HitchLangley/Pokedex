import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Button, Descriptions, Modal, Skeleton, Tag, Tooltip } from 'antd'
import { LeftOutlined, RightOutlined, SoundOutlined } from '@ant-design/icons'
import { useStores } from '../stores/RootStore'
import { formatId, formatName, pickFlavorText, pickGenus, typeColor } from '../utils/pokemon'
import { FavoriteButton } from './FavoriteButton'
import { PokemonImage } from './PokemonImage'
import { StatBars } from './StatBars'
import { TypeTag } from './TypeTag'

function useSpecies (pokedex, url) {
  const [state, setState] = useState({ url: null, data: null })
  useEffect(() => {
    if (!url) return
    let cancelled = false
    pokedex.fetchSpecies(url)
      .then((data) => !cancelled && setState({ url, data }))
      .catch(() => !cancelled && setState({ url, data: null }))
    return () => { cancelled = true }
  }, [pokedex, url])
  return { species: state.url === url ? state.data : null, loading: Boolean(url) && state.url !== url }
}

const PokemonDetails = observer(function PokemonDetails ({ name }) {
  const { pokedex } = useStores()
  const pokemon = pokedex.details.get(name)
  const { species, loading } = useSpecies(pokedex, pokemon?.speciesUrl)

  useEffect(() => { pokedex.loadDetails(name) }, [pokedex, name])

  if (!pokemon) return <Skeleton active avatar paragraph={{ rows: 6 }} />

  const accent = typeColor(pokemon.types[0])
  const flavor = pickFlavorText(species)
  const genus = pickGenus(species)

  return (
    <div className='pokemon-details' style={{ '--accent': accent }}>
      <div className='pokemon-details__hero'>
        <PokemonImage key={pokemon.sprite} id={pokemon.id} name={pokemon.name} src={pokemon.sprite} className='pokemon-details__image' />
      </div>

      <div className='pokemon-details__body'>
        <div className='pokemon-details__heading'>
          <span className='pokemon-details__id'>{formatId(pokemon.id)}</span>
          <h2>{formatName(pokemon.name)}</h2>
          <FavoriteButton name={pokemon.name} />
          {pokemon.cry && (
            <Tooltip title='Play cry'>
              <Button
                type='text'
                shape='circle'
                aria-label='Play cry'
                icon={<SoundOutlined />}
                onClick={() => {
                  const audio = new Audio(pokemon.cry)
                  audio.volume = 0.4
                  audio.play().catch(() => {})
                }}
              />
            </Tooltip>
          )}
        </div>

        {genus && <div className='pokemon-details__genus'>{genus}</div>}

        <div className='pokemon-details__types'>
          {pokemon.types.map((type) => <TypeTag key={type} type={type} size='large' />)}
        </div>

        {loading ? <Skeleton active title={false} paragraph={{ rows: 2 }} /> : flavor && <p className='pokemon-details__flavor'>{flavor}</p>}

        <Descriptions
          size='small'
          column={2}
          items={[
            { key: 'height', label: 'Height', children: `${pokemon.height} m` },
            { key: 'weight', label: 'Weight', children: `${pokemon.weight} kg` },
            {
              key: 'abilities',
              label: 'Abilities',
              span: 2,
              children: pokemon.abilities.map(({ name: ability, hidden }) => (
                <Tag key={ability} variant={hidden ? 'outlined' : 'filled'}>
                  {formatName(ability)}{hidden ? ' (hidden)' : ''}
                </Tag>
              ))
            }
          ]}
        />

        <h4 className='pokemon-details__section'>Base stats <span>Total {pokemon.total}</span></h4>
        <StatBars stats={pokemon.stats} />
      </div>
    </div>
  )
})

export const PokemonModal = observer(function PokemonModal () {
  const { pokedex, ui } = useStores()
  const name = ui.selectedPokemon
  const list = pokedex.filtered
  const position = name ? list.findIndex((p) => p.name === name) : -1
  const prev = position > 0 ? list[position - 1] : null
  const next = position >= 0 && position < list.length - 1 ? list[position + 1] : null

  useEffect(() => {
    if (!name) return
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.key === 'ArrowLeft' && prev) ui.openPokemon(prev.name)
      if (event.key === 'ArrowRight' && next) ui.openPokemon(next.name)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [name, prev, next, ui])

  return (
    <Modal
      open={Boolean(name)}
      onCancel={ui.closePokemon}
      centered
      width={{ xs: '95%', sm: 560, md: 760 }}
      destroyOnHidden
      title={null}
      footer={
        <div className='pokemon-modal__nav'>
          <Button icon={<LeftOutlined />} disabled={!prev} onClick={() => ui.openPokemon(prev.name)}>
            {prev ? formatName(prev.name) : 'Previous'}
          </Button>
          <Button disabled={!next} onClick={() => ui.openPokemon(next.name)}>
            {next ? formatName(next.name) : 'Next'} <RightOutlined />
          </Button>
        </div>
      }
    >
      {name && <PokemonDetails key={name} name={name} />}
    </Modal>
  )
})
