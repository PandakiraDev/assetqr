'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Zachowaj poprzednie dane podczas ładowania nowych
        keepPreviousData: true,
        // Nie rewaliduj przy ponownym focusie okna
        revalidateOnFocus: false,
        // Nie rewaliduj przy ponownym połączeniu
        revalidateOnReconnect: false,
        // Zachowaj dane w cache przez 5 minut (dedupingInterval)
        dedupingInterval: 300000,
        // Pokaż stale dane podczas rewalidacji
        revalidateIfStale: false,
        // Retry 2 razy przy błędzie
        errorRetryCount: 2,
        // Szybszy retry
        errorRetryInterval: 3000,
        // Focus throttle - nie rewaliduj częściej niż co 60s
        focusThrottleInterval: 60000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
