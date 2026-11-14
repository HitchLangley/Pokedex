import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { RootStore, StoreContext } from './stores/RootStore'
import './styles/main.scss'

const store = new RootStore()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </StoreContext.Provider>
  </StrictMode>
)
