'use client'

import { useEffect, useState } from 'react'
import HubApp from './HubApp'

export default function ClientHubApp() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <HubApp />
}
