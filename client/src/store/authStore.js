import { create } from 'zustand'

const getStoredAuth = () => {
  try {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user'))
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = create((set) => ({
  user: getStoredAuth().user,
  token: getStoredAuth().token,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  isAuthenticated: () => {
    const state = useAuthStore.getState()
    return !!state.token
  },
}))
