import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Button, ConfigProvider, Layout, Tooltip, theme } from 'antd'
import { GithubOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useStores } from './stores/RootStore'
import { Toolbar } from './components/Toolbar'
import { PokemonList } from './components/PokemonList'
import { PokemonModal } from './components/PokemonModal'

const REPO_URL = import.meta.env.VITE_REPO_URL

export const App = observer(function App () {
  const { pokedex, ui } = useStores()

  useEffect(() => { pokedex.init() }, [pokedex])

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
      <Layout className='app'>
        <Layout.Header className='app__header'>
          <a className='app__brand' href='./' aria-label='Pokédex home'>
            <span className='app__logo' aria-hidden='true' />
            <span>Pokédex</span>
          </a>
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
          </div>
        </Layout.Header>

        <Layout.Content className='app__content'>
          <Toolbar />
          <PokemonList />
        </Layout.Content>

        <Layout.Footer className='app__footer'>
          Data from <a href='https://pokeapi.co/' target='_blank' rel='noreferrer'>PokéAPI</a>. Pokémon is © Nintendo / Game Freak.
        </Layout.Footer>
      </Layout>
      <PokemonModal />
    </ConfigProvider>
  )
})
