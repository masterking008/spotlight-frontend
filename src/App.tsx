import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import { DashboardLayout } from './components/DashboardLayout'
import { AppSkeletonTheme } from './components/ui/skeleton'
import { AuthSkeleton } from './components/ProtectedRoute'
import './index.css'

// Lazy-loaded pages
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const Overview        = lazy(() => import('./pages/Overview'))
const CastingCallForm = lazy(() => import('./pages/CastingCallForm'))
const TalentApplication = lazy(() => import('./pages/TalentApplication'))
const StatusTracker   = lazy(() => import('./pages/StatusTracker'))
const LoginPage       = lazy(() => import('./pages/LoginPage'))
const AuthCallback    = lazy(() => import('./pages/AuthCallback'))
const Unauthorized    = lazy(() => import('./pages/Unauthorized'))
const Applications    = lazy(() => import('./pages/Applications'))
const Settings        = lazy(() => import('./pages/Settings'))
const ApproverInbox   = lazy(() => import('./pages/ApproverInbox'))
const PitchDeckBuilder = lazy(() => import('./pages/PitchDeckBuilder'))
const PitchDeckView   = lazy(() => import('./pages/PitchDeckView'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppSkeletonTheme>
          <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
            <Suspense fallback={<AuthSkeleton />}>
            <Routes>
              {/* ── Public routes ── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/apply/:callId" element={<TalentApplication />} />
              <Route path="/:showSlug/:roleSlug" element={<TalentApplication />} />
              <Route path="/status" element={<StatusTracker />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* ── Protected dashboard routes ── */}
              <Route path="/" element={<ProtectedLayout><Overview /></ProtectedLayout>} />
              <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />

              {/* Casting calls */}
              <Route path="/calls/new" element={<ProtectedLayout><CastingCallForm /></ProtectedLayout>} />
              <Route path="/calls/:id/edit" element={<ProtectedLayout><CastingCallForm /></ProtectedLayout>} />

              {/* Applications — supports both legacy and casting-call-scoped URL */}
              <Route path="/applications" element={<ProtectedLayout><Applications /></ProtectedLayout>} />
              <Route path="/casting-calls/:id/applications" element={<ProtectedLayout><Applications /></ProtectedLayout>} />

              {/* Pitch decks */}
              <Route path="/casting-calls/:id/pitch-deck/new" element={<ProtectedLayout><PitchDeckBuilder /></ProtectedLayout>} />
              <Route path="/casting-calls/:id/pitch-deck/:deckId/edit" element={<ProtectedLayout><PitchDeckBuilder /></ProtectedLayout>} />
              <Route path="/pitch-decks/:id" element={<ProtectedLayout><PitchDeckView /></ProtectedLayout>} />

              {/* Approver */}
              <Route path="/approver/inbox" element={<ProtectedLayout><ApproverInbox /></ProtectedLayout>} />

              {/* Utility */}
              <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
            </Routes>
            </Suspense>
          </div>
          </AppSkeletonTheme>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
