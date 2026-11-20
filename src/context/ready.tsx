import { createContext, useContext } from 'react'

/** Flips to true once the intro preloader has finished. */
export const ReadyContext = createContext(false)
export const useReady = () => useContext(ReadyContext)
