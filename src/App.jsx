import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Link, Route, Routes } from 'react-router'
import { App as AntApp, Button, ConfigProvider, Layout, Tooltip, theme } from 'antd'
import { GithubOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useStores } from './stores/RootStore'
import { AccountMenu } from './components/AccountMenu'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'

const REPO_URL = import.meta.env.VITE_REPO_URL

const LOGIN_MESSAGES = {
  failed: 'Sign-in failed, please try again.',
  cancelled: 'Sign-in was cancelled.'
}

// toast notifications for things that happen outside of a specific component
const Notifications = observer(function Notifications () {
  const { favorites } = useStores()
  const { message } = AntApp.useApp()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get('login')
    if (!LOGIN_MESSAGES[result]) return
    message.warning(LOGIN_MESSAGES[result])
    params.delete('login')
    const query = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  }, [message])

  useEffect(() => {
    if (favorites.error) message.error(favorites.error)
  }, [favorites.error, message])

  return null
})

export const App = observer(function App () {
  const { pokedex, ui, auth } = useStores()

  useEffect(() => {
    pokedex.init()
    auth.init()
  }, [pokedex, auth])

  useEffect(() => {
    document.documentElement.dataset.theme = ui.dark ? 'dark' : 'light'
  }, [ui.dark])

  return (
    <ConfigProvider
      theme={{
        algorithm: ui.dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#e3350d', borderRadius: 10 }
      }}
    >
      <AntApp>
        <Notifications />
        <Layout className='app'>
          <Layout.Header className='app__header'>
            <Link className='app__brand' to={{ pathname: '/', search: pokedex.query }} aria-label='Pokédex home'>
              <span className='app__logo' aria-hidden='true' />
              <span>Pokédex</span>
            </Link>
            <div className='app__actions'>
              {REPO_URL && (
                <Tooltip title='Source code'>
                  <Button type='text' shape='circle' href={REPO_URL} target='_blank' rel='noreferrer' icon={<GithubOutlined />} aria-label='Source code on GitHub' />
                </Tooltip>
              )}
              <Tooltip title={ui.dark ? 'Light mode' : 'Dark mode'}>
                <Button
                  type='text'
                  shape='circle'
                  aria-label='Toggle dark mode'
                  icon={ui.dark ? <SunOutlined /> : <MoonOutlined />}
                  onClick={ui.toggleDark}
                />
              </Tooltip>
              <AccountMenu />
            </div>
          </Layout.Header>

          <Layout.Content className='app__content'>
            <Routes>
              <Route path='/profile' element={<ProfilePage />} />
              <Route path='*' element={<HomePage />} />
            </Routes>
          </Layout.Content>

          <Layout.Footer className='app__footer'>
            Data from <a href='https://pokeapi.co/' target='_blank' rel='noreferrer'>PokéAPI</a>. Pokémon is © Nintendo / Game Freak.
          </Layout.Footer>
        </Layout>
      </AntApp>
    </ConfigProvider>
  )
})
