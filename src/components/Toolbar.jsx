import { observer } from 'mobx-react-lite'
import { Badge, Button, Input, Segmented, Tag } from 'antd'
import { CloseCircleOutlined, StarFilled } from '@ant-design/icons'
import { useStores } from '../stores/RootStore'
import { formatName, typeColor, typeTextColor } from '../utils/pokemon'

export const Toolbar = observer(function Toolbar () {
  const { pokedex, favorites } = useStores()

  return (
    <section className='toolbar' aria-label='Filters'>
      <div className='toolbar__row'>
        <Input.Search
          className='toolbar__search'
          placeholder='Search by name or number'
          aria-label='Search pokemon by name or number'
          allowClear
          size='large'
          value={pokedex.search}
          onChange={(event) => pokedex.setSearch(event.target.value)}
        />
        <Segmented
          size='large'
          value={pokedex.favoritesOnly ? 'favorites' : 'all'}
          onChange={(value) => pokedex.setFavoritesOnly(value === 'favorites')}
          options={[
            { value: 'all', label: 'All' },
            {
              value: 'favorites',
              label: (
                <span className='toolbar__favorites'>
                  <StarFilled /> Favourites <Badge count={favorites.count} showZero size='small' color='#faad14' />
                </span>
              )
            }
          ]}
        />
      </div>

      <div className='toolbar__types' role='group' aria-label='Filter by type'>
        {pokedex.types.map((type) => {
          const checked = pokedex.selectedTypes.includes(type)
          const failed = pokedex.typeErrors.has(type)
          return (
            <Tag.CheckableTag
              key={type}
              checked={checked}
              onChange={() => pokedex.toggleType(type)}
              className={`type-filter${checked ? ' type-filter--checked' : ''}${failed ? ' type-filter--failed' : ''}`}
              style={{
                '--type-color': typeColor(type),
                '--type-text': typeTextColor(type)
              }}
            >
              {formatName(type)}
            </Tag.CheckableTag>
          )
        })}
        {pokedex.hasFilters && (
          <Button type='link' size='small' icon={<CloseCircleOutlined />} onClick={pokedex.clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </section>
  )
})
