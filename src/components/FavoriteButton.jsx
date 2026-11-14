import { observer } from 'mobx-react-lite'
import { Button, Tooltip } from 'antd'
import { StarFilled, StarOutlined } from '@ant-design/icons'
import { useStores } from '../stores/RootStore'
import { formatName } from '../utils/pokemon'

export const FavoriteButton = observer(function FavoriteButton ({ name, size = 'middle' }) {
  const { favorites } = useStores()
  const active = favorites.has(name)
  const label = active ? `Remove ${formatName(name)} from favourites` : `Add ${formatName(name)} to favourites`

  return (
    <Tooltip title={active ? 'Remove from favourites' : 'Add to favourites'}>
      <Button
        type='text'
        shape='circle'
        size={size}
        aria-label={label}
        aria-pressed={active}
        className={`favorite-button${active ? ' favorite-button--active' : ''}`}
        icon={active ? <StarFilled /> : <StarOutlined />}
        onClick={(event) => {
          event.stopPropagation()
          favorites.toggle(name)
        }}
      />
    </Tooltip>
  )
})
