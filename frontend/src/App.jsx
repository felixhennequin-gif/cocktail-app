import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import SearchBar        from './components/SearchBar'
import NotificationBell from './components/NotificationBell'
import ThemeToggle      from './components/ThemeToggle'
import RecipeList       from './pages/RecipeList'
import RecipeDetail     from './pages/RecipeDetail'
import Login            from './pages/Login'
import Register         from './pages/Register'
import Favorites        from './pages/Favorites'
import Feed             from './pages/Feed'
import UserProfile      from './pages/UserProfile'
import RecipeSubmit     from './pages/RecipeSubmit'
import AdminRecipeList  from './pages/admin/AdminRecipeList'
import AdminRecipeForm  from './pages/admin/AdminRecipeForm'
import AdminPendingList from './pages/admin/AdminPendingList'
import NotFound         from './pages/NotFound'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 relative">
      {/* Ligne principale */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          onClick={closeMenu}
          className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors shrink-0"
        >
          🍹 Cocktails
        </Link>

        {/* SearchBar — cachée sur très petit mobile */}
        <div className="flex-1 hidden sm:block max-w-xs">
          <SearchBar />
        </div>

        {/* Nav desktop (md et plus) */}
        <nav className="hidden md:flex items-center gap-4 text-sm ml-auto">
          {user ? (
            <>
              <Link to="/feed"        className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">Fil</Link>
              <Link to="/recipes/new" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">+ Proposer</Link>
              <Link to="/favorites"   className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">Favoris</Link>
              <NotificationBell />
              <Link to={`/users/${user.id}`} className="font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors">
                {user.pseudo}
              </Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">Admin</Link>
              )}
              <button onClick={handleLogout} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">Connexion</Link>
              <Link to="/register" className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">
                S'inscrire
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>

        {/* Bouton hamburger (mobile uniquement) */}
        <button
          className="md:hidden ml-auto p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* SearchBar mobile */}
      <div className="sm:hidden mt-3">
        <SearchBar />
      </div>

      {/* Menu déroulant mobile */}
      {menuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg z-50 px-4 py-3 flex flex-col gap-3 text-sm">
          {user ? (
            <>
              <Link to="/feed"        onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 py-1">Fil d'actualité</Link>
              <Link to="/recipes/new" onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 py-1">+ Proposer une recette</Link>
              <Link to="/favorites"   onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 py-1">Mes favoris</Link>
              <Link to={`/users/${user.id}`} onClick={closeMenu} className="font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 py-1">
                Mon profil ({user.pseudo})
              </Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 py-1">Administration</Link>
              )}
              <button onClick={handleLogout} className="text-left text-red-400 hover:text-red-600 py-1">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 py-1">Connexion</Link>
              <Link to="/register" onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 py-1 font-medium">S'inscrire</Link>
            </>
          )}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  )
}

export default function App() {
  const { loading } = useAuth()

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <Routes>
          <Route path="/"                        element={<RecipeList />} />
          <Route path="/feed"                    element={<Feed />} />
          <Route path="/recipes/new"             element={<RecipeSubmit />} />
          <Route path="/recipes/:id"             element={<RecipeDetail />} />
          <Route path="/login"                   element={<Login />} />
          <Route path="/register"                element={<Register />} />
          <Route path="/favorites"               element={<Favorites />} />
          <Route path="/users/:id"               element={<UserProfile />} />
          <Route path="/admin"                   element={<AdminRecipeList />} />
          <Route path="/admin/pending"           element={<AdminPendingList />} />
          <Route path="/admin/recipes/new"       element={<AdminRecipeForm />} />
          <Route path="/admin/recipes/:id/edit"  element={<AdminRecipeForm />} />
          <Route path="*"                        element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
