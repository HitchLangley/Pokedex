import { observer } from 'mobx-react-lite'
import { useStores } from '../stores/RootStore'
import { Toolbar } from '../components/Toolbar'
import { PokemonList } from '../components/PokemonList'
import { PokemonModal } from '../components/PokemonModal'

export const HomePage = observer(function HomePage () {
  const { pokedex } = useStores()
  return (
    <>
      <Toolbar />
      <PokemonList />
      <PokemonModal list={pokedex.filtered} />
    </>
  )
})
