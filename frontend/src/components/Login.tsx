import { useAuth } from '../firebase/AuthContext';

export function Login() {
  const { signInWithGoogle, error, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 dark:bg-primary-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 dark:bg-primary-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-100">
            Aggie
          </h1>
          <p className="mt-2 text-primary-600 dark:text-primary-400">
            Multi-platform note search
          </p>
        </div>

        <div className="bg-white dark:bg-primary-800 rounded-lg shadow-lg p-8">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3
                       border border-primary-300 dark:border-primary-600
                       rounded-lg shadow-sm
                       bg-white dark:bg-primary-700
                       text-primary-700 dark:text-primary-200
                       hover:bg-primary-50 dark:hover:bg-primary-600
                       focus:outline-none focus:ring-2 focus:ring-primary-500
                       transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-primary-500 dark:text-primary-400">
          Sign in to search across your Google Drive, Gmail, Calendar, OneDrive, and Trello.
        </p>
      </div>
    </div>
  );
}
