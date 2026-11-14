import { useEffect } from 'react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import { Link } from 'react-router'
import { Avatar, Button, Empty, Result, Skeleton, Spin, Statistic } from 'antd'
import { GithubOutlined, StarFilled, UserOutlined } from '@ant-design/icons'
import { useStores } from '../stores/RootStore'
import { formatName } from '../utils/pokemon'
import { PokemonCard } from '../components/PokemonCard'
import { PokemonModal } from '../components/PokemonModal'
import { TypeTag } from '../components/TypeTag'

const dateFormat = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' })

export const ProfilePage = observer(function ProfilePage () {
  const { auth, favorites, pokedex } = useStores()

  // details of every favourite are needed for the cards and the type breakdown
  useEffect(() => autorun(() => favorites.list.forEach((name) => pokedex.loadDetails(name))), [favorites, pokedex])

  if (auth.status === 'idle' || auth.status === 'loading') {
    return <div className='profile__center'><Spin size='large' /></div>
  }

  if (!auth.available) {
    return (
      <Result
        status='info'
        title='Accounts are not available in this version'
        subTitle='This build runs without a server — your favourites are kept in this browser.'
        extra={<Link to='/'><Button type='primary'>Back to the Pokédex</Button></Link>}
      />
    )
  }

  if (!auth.user) {
    return (
      <Result
        icon={<UserOutlined />}
        title='Sign in to see your profile'
        subTitle='Your favourite pokémon are saved to your account and available on any device.'
        extra={auth.providers.github && (
          <Button type='primary' size='large' icon={<GithubOutlined />} href={auth.loginUrl('github', '/profile')}>
            Sign in with GitHub
          </Button>
        )}
      />
    )
  }

  const { user } = auth
  const items = favorites.list
    .map((name) => ({ name, id: pokedex.idByName.get(name) }))
    .filter((item) => item.id != null)
  const loaded = items.map(({ name }) => pokedex.details.get(name)).filter(Boolean)

  const typeCounts = new Map()
  loaded.forEach((p) => p.types.forEach((t) => typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1)))
  const topTypes = [...typeCounts].sort((a, b) => b[1] - a[1])
  const strongest = loaded.reduce((best, p) => (!best || p.total > best.total ? p : best), null)

  let favoritesContent
  if (favorites.syncing || pokedex.status !== 'ready') {
    favoritesContent = <Skeleton active paragraph={{ rows: 4 }} />
  } else if (!items.length) {
    favoritesContent = (
      <Empty description='No favourites yet — tap the star on any pokémon'>
        <Link to='/'><Button type='primary'>Browse pokémon</Button></Link>
      </Empty>
    )
  } else {
    favoritesContent = (
      <div className='pokemon-grid'>
        {items.map(({ id, name }, index) => <PokemonCard key={name} id={id} name={name} index={index} />)}
      </div>
    )
  }

  return (
    <div className='profile'>
      <section className='profile__card'>
        <Avatar size={88} src={user.avatarUrl} icon={<UserOutlined />} className='profile__avatar' />
        <div className='profile__who'>
          <h1>{user.name}</h1>
          <div className='profile__meta'>
            {user.provider === 'github'
              ? <a href={`https://github.com/${user.login}`} target='_blank' rel='noreferrer'><GithubOutlined /> {user.login}</a>
              : <span>@{user.login}</span>}
            <span>Trainer since {dateFormat.format(new Date(user.createdAt))}</span>
          </div>
        </div>
        <div className='profile__stats'>
          <Statistic title='Favourites' value={favorites.count} prefix={<StarFilled className='profile__star' />} />
          {strongest && <Statistic title='Strongest' value={formatName(strongest.name)} />}
        </div>
      </section>

      {topTypes.length > 0 && (
        <section className='profile__types' aria-label='Favourite types'>
          {topTypes.map(([type, count]) => (
            <span key={type} className='profile__type'>
              <TypeTag type={type} /> <b>×{count}</b>
            </span>
          ))}
        </section>
      )}

      <h2 className='profile__heading'>Favourite pokémon</h2>
      {favoritesContent}

      <PokemonModal list={items} />
    </div>
  )
})
