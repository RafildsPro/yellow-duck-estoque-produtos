import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  // O link do e-mail volta para /redefinir-senha, onde a pessoa escolhe a nova senha.
  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

  // Se o login não for recente, o Supabase pede um código de confirmação enviado por e-mail.
  const reauthenticate = () => supabase.auth.reauthenticate()

  const updatePassword = (password, nonce) =>
    supabase.auth.updateUser(nonce ? { password, nonce } : { password })

  return (
    <AuthContext.Provider
      value={{
        session,
        loading: session === undefined,
        signIn,
        signOut,
        resetPassword,
        reauthenticate,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
