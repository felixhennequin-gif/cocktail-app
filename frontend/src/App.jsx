import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import RecipeList        from './pages/RecipeList'
import RecipeDetail      from './pages/RecipeDetail'
import Login             from './pages/Login'
import Register          from './pages/Register'
import Favorites         from './pages/Favorites'
import UserProfile       from './pages/UserProfile'
import RecipeSubmit      from './pages/RecipeSubmit'
import AdminRecipeList   from './pages/admin/AdminRecipeList'
import AdminRecipeForm   from './pages/admin/AdminRecipeForm'
import AdminPendingList  from './pages/admin/AdminPendingList'

function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-gray-900 hover:text-amber-600 transition-colors">
        🍹 Cocktails
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link to="/recipes/new" className="text-gray-500 hover:text-gray-800 transition-colors">
              + Proposer
            </Link>
            <Link to="/favorites" className="text-gray-500 hover:text-gray-800 transition-colors">
              Mes favoris
            </Link>
            <Link to={`/users/${user.id}`} className="font-medium text-amber-600 hover:text-amber-800 transition-colors">
              {user.pseudo}
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="text-gray-500 hover:text-gray-800 transition-colors">
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    className="text-gray-500 hover:text-gray-800 transition-colors">Connexion</Link>
            <Link to="/register" className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">
              S'inscrire
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default function App() {
  const { loading } = useAuth()

  if (loading) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/"                        element={<RecipeList />} />
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
        </Routes>
      </main>
    </div>
  )
}
