import React, { createContext, useContext } from 'react'
import { usePushRegistration, type UsePushRegistrationResult } from '../hooks/usePushRegistration'

const PushRegistrationContext = createContext<UsePushRegistrationResult>({
  registerNow: async () => {},
})

export function PushRegistrationProvider({
  userId,
  children,
}: {
  userId: string | undefined | null
  children: React.ReactNode
}) {
  const value = usePushRegistration(userId)
  return <PushRegistrationContext.Provider value={value}>{children}</PushRegistrationContext.Provider>
}

export function usePushRegistrationContext(): UsePushRegistrationResult {
  return useContext(PushRegistrationContext)
}
