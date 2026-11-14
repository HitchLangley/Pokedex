import { observer } from 'mobx-react-lite'
import { useLocation, useNavigate } from 'react-router'
import { Avatar, Button, Dropdown } from 'antd'
import { GithubOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useStores } from '../stores/RootStore'

export const AccountMenu = observer(function AccountMenu () {
  const { auth } = useStores()
  const navigate = useNavigate()
  const location = useLocation()

  // static build (GitHub Pages) has no backend: no accounts, favourites stay local
  if (!auth.available) return null

  if (!auth.user) {
    const returnTo = `${location.pathname}${location.search}`
    const options = [
      auth.providers.github && { key: 'github', label: 'Sign in with GitHub', icon: <GithubOutlined />, href: auth.loginUrl('github', returnTo) },
      auth.providers.dev && { key: 'dev', label: 'Dev sign-in (local only)', icon: <UserOutlined />, href: auth.loginUrl('dev', returnTo) }
    ].filter(Boolean)

    if (!options.length) return null
    if (options.length === 1) {
      return (
        <Button className='account__login' icon={options[0].icon} href={options[0].href}>
          <span className='account__label'>Sign in</span>
        </Button>
      )
    }
    return (
      <Dropdown
        trigger={['click']}
        menu={{ items: options.map(({ href, ...item }) => ({ ...item, label: <a href={href}>{item.label}</a> })) }}
      >
        <Button className='account__login' icon={<LoginOutlined />}>
          <span className='account__label'>Sign in</span>
        </Button>
      </Dropdown>
    )
  }

  const { user } = auth
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
          { type: 'divider' },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Sign out',
            onClick: () => {
              navigate('/')
              auth.logout()
            }
          }
        ]
      }}
    >
      <button type='button' className='account__user' aria-label={`Account menu for ${user.name}`}>
        <Avatar size={32} src={user.avatarUrl} icon={<UserOutlined />} />
        <span className='account__label'>{user.login}</span>
      </button>
    </Dropdown>
  )
})
