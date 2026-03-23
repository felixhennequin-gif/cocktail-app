import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Logo from './components/Logo'
import { useTranslation } from 'react-i18next'
import { useAuth } from './contexts/AuthContext'
import SearchBar        from './components/SearchBar'
import NotificationBell from './components/NotificationBell'
import ThemeToggle      from './components/ThemeToggle'
import LanguageToggle   from './components/LanguageToggle'
import Footer           from './components/Footer'

// Pages d'entrée courantes — import statique
import LandingPage      from './pages/LandingPage'
import RecipeList       from './pages/RecipeList'
import Login            from './pages/Login'
import Register         from './pages/Register'
import NotFound         from './pages/NotFound'

// Pages secondaires — lazy loading (code splitting)
const RecipeDetail     = lazy(() => import('./pages/RecipeDetail'))
const Favorites        = lazy(() => import('./pages/Favorites'))
const Feed             = lazy(() => import('./pages/Feed'))
const UserProfile      = lazy(() => import('./pages/UserProfile'))
const RecipeSubmit     = lazy(() => import('./pages/RecipeSubmit'))
const AdminRecipeList  = lazy(() => import('./pages/admin/AdminRecipeList'))
const AdminRecipeForm  = lazy(() => import('./pages/admin/AdminRecipeForm'))
const AdminPendingList = lazy(() => import('./pages/admin/AdminPendingList'))
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'))

function Header() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header role="banner" className="sticky top-0 z-40 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 transition-colors">
      {/* Ligne principale */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          onClick={closeMenu}
          className="shrink-0 text-gray-900 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
        >
          <Logo className="h-6" />
        </Link>

        {/* SearchBar — cachée sur très petit mobile */}
        <div className="flex-1 hidden sm:block max-w-xs lg:max-w-sm">
          <SearchBar />
        </div>

        {/* Nav desktop (md et plus) */}
        <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-4 text-sm ml-auto">
          {user ? (
            <>
              <Link to="/feed"        className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{t('nav.feed')}</Link>
              <Link to="/recipes/new" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{t('nav.propose')}</Link>
              <Link to="/favorites"   className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{t('nav.favorites')}</Link>
              <NotificationBell />
              <Link to={`/users/${user.id}`} className="font-medium text-gold-400 dark:text-gold-300 hover:text-gold-400 dark:hover:text-gold-300 transition-colors">
                {user.pseudo}
              </Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{t('nav.admin')}</Link>
              )}
              <button onClick={handleLogout} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">{t('nav.login')}</Link>
              <Link to="/register" className="px-3 py-1.5 bg-gold-400 text-ink-900 rounded-lg hover:bg-gold-300 transition-colors font-medium">
                {t('nav.register')}
              </Link>
            </>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </nav>

        {/* Bouton hamburger (mobile uniquement) */}
        <button
          className="md:hidden ml-auto p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={t('nav.menu')}
          aria-expanded={menuOpen}
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
        <nav aria-label="Menu mobile" className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-ink-900 border-b border-gray-200 dark:border-gray-700 shadow-lg z-50 px-4 py-3 flex flex-col gap-3 text-sm">
          {user ? (
            <>
              <Link to="/feed"        onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-gold-400 dark:hover:text-gold-300 py-1">{t('nav.feedFull')}</Link>
              <Link to="/recipes/new" onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-gold-400 dark:hover:text-gold-300 py-1">{t('nav.proposeFull')}</Link>
              <Link to="/favorites"   onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-gold-400 dark:hover:text-gold-300 py-1">{t('nav.favoritesFull')}</Link>
              <Link to={`/users/${user.id}`} onClick={closeMenu} className="font-medium text-gold-400 dark:text-gold-300 hover:text-gold-400 dark:hover:text-gold-300 py-1">
                {t('nav.myProfile', { pseudo: user.pseudo })}
              </Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-gold-400 dark:hover:text-gold-300 py-1">{t('nav.administration')}</Link>
              )}
              <button onClick={handleLogout} className="text-left text-red-400 hover:text-red-600 py-1">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-gold-400 dark:hover:text-gold-300 py-1">{t('nav.login')}</Link>
              <Link to="/register" onClick={closeMenu} className="text-gray-700 dark:text-gray-300 hover:text-gold-400 dark:hover:text-gold-300 py-1 font-medium">{t('nav.register')}</Link>
            </>
          )}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <LanguageToggle />
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
    <div className="min-h-screen bg-gold-50 dark:bg-ink-950 transition-colors">
      <Helmet defaultTitle="Cocktails — Recettes &amp; Inspiration" />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-gold-400 focus:text-ink-900 focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Aller au contenu principal
      </a>
      <Header />

      <main id="main-content" role="main" className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <Suspense fallback={<div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>}>
        <Routes>
          <Route path="/"                        element={<LandingPage />} />
          <Route path="/recipes"                  element={<RecipeList />} />
          <Route path="/feed"                    element={<Feed />} />
          <Route path="/recipes/new"             element={<RecipeSubmit />} />
          <Route path="/recipes/:id"             element={<RecipeDetail />} />
          <Route path="/login"                   element={<Login />} />
          <Route path="/register"                element={<Register />} />
          <Route path="/favorites"               element={<Favorites />} />
          <Route path="/users/:id"               element={<UserProfile />} />
          <Route path="/collections/:id"          element={<CollectionDetail />} />
          <Route path="/admin"                   element={<AdminRecipeList />} />
          <Route path="/admin/pending"           element={<AdminPendingList />} />
          <Route path="/admin/recipes/new"       element={<AdminRecipeForm />} />
          <Route path="/admin/recipes/:id/edit"  element={<AdminRecipeForm />} />
          <Route path="*"                        element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
