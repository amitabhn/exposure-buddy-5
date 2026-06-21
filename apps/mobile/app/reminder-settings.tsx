import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useAuth } from '@exposure-buddy/supabase'
import { BackButton } from '../src/components/navigation/BackButton'
import { scheduleSessionReminder, cancelSessionReminder } from '../src/notifications/sessionReminder'

const DEFAULT_TIME = '08:00'

function timeStringToDate(time: string | null): Date {
  const [hourStr = '8', minuteStr = '0'] = (time ?? DEFAULT_TIME).split(':')
  const date = new Date()
  date.setHours(parseInt(hourStr, 10) || 0, parseInt(minuteStr, 10) || 0, 0, 0)
  return date
}

function dateToTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function ReminderSettingsScreen() {
  const { t } = useTranslation()
  const {
    userId,
    getReminderTime,
    setReminderTime,
    getReminderNotificationId,
    setReminderNotificationId,
    clearReminderNotificationId,
  } = useAuth()

  const [draftDate, setDraftDate] = useState<Date>(() => timeStringToDate(getReminderTime()))
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isHandlingSaveRef = useRef(false)
  // Mirrors the latest userId outside of render so an in-flight Save can detect a
  // sign-out/sign-in-as-different-user race that happens during its awaits.
  const userIdRef = useRef(userId)
  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) setDraftDate(selected)
  }

  async function handleSave() {
    if (isHandlingSaveRef.current) return
    isHandlingSaveRef.current = true
    setIsSaving(true)
    setConfirmation(null)
    const startUserId = userIdRef.current
    const time = dateToTimeString(draftDate)

    try {
      const existingId = getReminderNotificationId()
      if (existingId) {
        await cancelSessionReminder(existingId)
      }

      const result = await scheduleSessionReminder(time, {
        title: t('notifications.dailyReminder.title'),
        body: t('notifications.dailyReminder.body'),
      })

      // Guards against a sign-out/sign-in-as-different-user race during the awaits above.
      if (userIdRef.current !== startUserId) return

      setReminderTime(time)

      if (result) {
        setReminderNotificationId(result)
        setConfirmation(t('notifications.reminderSet', { time }))
      } else {
        clearReminderNotificationId()
      }
    } finally {
      setIsSaving(false)
      isHandlingSaveRef.current = false
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('reminderSettings.screenTitle'),
          headerShadowVisible: false,
          // eslint-disable-next-line i18next/no-literal-string
          headerStyle: { backgroundColor: '#ffffff' },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>{t('reminderSettings.screenTitle')}</Text>

        <DateTimePicker
          value={draftDate}
          // eslint-disable-next-line i18next/no-literal-string
          mode="time"
          // eslint-disable-next-line i18next/no-literal-string
          display="spinner"
          onChange={handleChange}
        />

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={t('reminderSettings.saveButton')}
        >
          <Text style={styles.saveButtonText}>{t('reminderSettings.saveButton')}</Text>
        </TouchableOpacity>

        {confirmation ? <Text style={styles.confirmationText}>{confirmation}</Text> : null}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmationText: {
    marginTop: 16,
    fontSize: 14,
    color: '#16a34a',
    textAlign: 'center',
  },
})
