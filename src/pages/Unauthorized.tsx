import { useAuth } from '../lib/auth'

export default function Unauthorized() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-1">You don't have permission to access this resource.</p>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-blue-600 hover:underline"
        >
          Sign out and try a different account
        </button>
      </div>
    </div>
  )
}
