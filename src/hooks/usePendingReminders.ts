import { useCallback, useEffect, useState } from 'react'
import { listPendingReminders } from '../services/reminders'
import type { Reminder } from '../types/app'

export function usePendingReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      setReminders(await listPendingReminders())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los recordatorios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { reminders, loading, error, reload }
}
