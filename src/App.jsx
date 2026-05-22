import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AnnouncementBanner from './components/AnnouncementBanner'
import { I18nProvider } from './lib/i18n'
import Home from './pages/Home'
import Log from './pages/Log'
import Progress from './pages/Progress'
import Leaderboard from './pages/Leaderboard'
import Resources from './pages/Resources'
import Community from './pages/Community'
import Admin from './pages/Admin'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <div
          className="min-h-screen flex flex-col bg-gray-50"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <Navbar />
          <AnnouncementBanner />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/log" element={<Log />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/community" element={<Community />} />
              <Route path="/admin" element={<Admin />} />
            <Route path="/privacy" element={<Privacy />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </I18nProvider>
  )
}
