import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Notifications from 'expo-notifications'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useAuth } from '@exposure-buddy/supabase'
import { BackButton } from '../src/components/navigation/BackButton'
import { usePushRegistration } from '../src/hooks/usePushRegistration'
import { scheduleSessionReminder, cancelSessionReminder, parseTime, DEFAULT_TIME } from '../src/notifications/sessionReminder'

type ReminderSelection = 'disable' | 'enable'

function timeStringToDate(time: string | null): Date {
  const { hour, minute } = parseTime(time ?? DEFAULT_TIME)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date
}

function dateToTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function ReminderSettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const {
    userId,
    getReminderTime,
    setReminderTime,
    getReminderNotificationId,
    setReminderNotificationId,
    clearReminderNotificationId,
    getReminderEnabled,
    setReminderEnabled,
  } = useAuth()
  // Called directly (not via PushRegistrationContext) — this screen is a top-level Stack.Screen
  // outside the (app) group, so it isn't a descendant of the PushRegistrationProvider mounted
  // there; calling the hook here gives an independent, correctly-scoped registerNow.
  const { registerNow } = usePushRegistration(userId)

  const [selection, setSelection] = useState<ReminderSelection>(
    // eslint-disable-next-line i18next/no-literal-string -- internal state-machine value, not user-facing text
    () => (getReminderEnabled() ? 'enable' : 'disable'),
  )
  const [draftDate, setDraftDate] = useState<Date>(() => timeStringToDate(getReminderTime()))
  const [isSaving, setIsSaving] = useState(false)
  const [permissionError, setPermissionError] = useState(false)
  const isHandlingSaveRef = useRef(false)
  // Mirrors the latest userId outside of render so an in-flight Save can detect a
  // sign-out/sign-in-as-different-user race that happens during its awaits.
  const userIdRef = useRef(userId)
  useEffect(() => {
    userIdRef.current = userId
  }, [userId])
  // Guards against calling setState after the screen has unmounted (e.g. back
  // navigation while Save's awaits are still in flight).
  const isMountedRef = useRef(true)
  useEffect(() => () => {
    isMountedRef.current = false
  }, [])

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) setDraftDate(selected)
  }

  function selectDisable() {
    // eslint-disable-next-line i18next/no-literal-string -- internal state-machine value, not user-facing text
    setSelection('disable')
    setPermissionError(false)
  }

  function selectEnable() {
    // eslint-disable-next-line i18next/no-literal-string -- internal state-machine value, not user-facing text
    setSelection('enable')
    setPermissionError(false)
  }

  async function handleSave() {
    if (isHandlingSaveRef.current) return
    isHandlingSaveRef.current = true
    setIsSaving(true)
    setPermissionError(false)
    const startUserId = userIdRef.current

    try {
      if (selection === 'disable') {
        const existingId = getReminderNotificationId()
        if (existingId) {
          await cancelSessionReminder(existingId)
        }
        if (userIdRef.current !== startUserId) return
        setReminderEnabled(false)
        clearReminderNotificationId()
        router.back()
        return
      }

      // selection === 'enable' — OS permission is required before we'll schedule anything.
      // Save blocks (rather than silently persisting a non-functional enabled state) and
      // surfaces inline guidance to open OS Settings when permission isn't granted.
      let status: string
      try {
        status = (await Notifications.getPermissionsAsync()).status
      } catch (err) {
        console.warn('[ReminderSettingsScreen] getPermissionsAsync threw:', err)
        // eslint-disable-next-line i18next/no-literal-string -- OS permission status identifier, not user-facing text
        status = 'undetermined'
      }
      // eslint-disable-next-line i18next/no-literal-string
      if (status !== 'granted') {
        try {
          const requested = await Notifications.requestPermissionsAsync()
          status = requested.status
        } catch (err) {
          console.warn('[ReminderSettingsScreen] requestPermissionsAsync threw:', err)
          // eslint-disable-next-line i18next/no-literal-string -- OS permission status identifier, not user-facing text
          status = 'denied'
        }
      }
      if (userIdRef.current !== startUserId) return
      // eslint-disable-next-line i18next/no-literal-string
      if (status !== 'granted') {
        setPermissionError(true)
        return
      }

      registerNow().catch(err => {
        console.warn('[ReminderSettingsScreen] registerNow failed:', err)
      })

      const time = dateToTimeString(draftDate)
      const existingId = getReminderNotificationId()
      if (existingId) {
        await cancelSessionReminder(existingId)
      }

      const result = await scheduleSessionReminder(time, {
        title: t('notifications.dailyReminder.title'),
        body: t('notifications.dailyReminder.body'),
      })

      // Guards against a sign-out/sign-in-as-different-user race during the awaits above.
      // The new notification was scheduled under the stale user's context, so cancel it
      // rather than leaving it live with no stored pointer to recover it.
      if (userIdRef.current !== startUserId) {
        if (result) await cancelSessionReminder(result)
        return
      }

      setReminderTime(time)
      setReminderEnabled(true)

      if (result) {
        setReminderNotificationId(result)
      } else {
        clearReminderNotificationId()
      }

      router.back()
    } finally {
      isHandlingSaveRef.current = false
      if (isMountedRef.current) setIsSaving(false)
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

        <View accessibilityRole="radiogroup">
          <TouchableOpacity
            style={[styles.radioRow, isSaving && styles.radioRowDisabled]}
            onPress={selectDisable}
            disabled={isSaving}
            accessibilityRole="radio"
            accessibilityState={{ checked: selection === 'disable', disabled: isSaving }}
            accessibilityLabel={t('reminderSettings.disableOption')}
          >
            <View style={[styles.radioCircle, selection === 'disable' && styles.radioCircleSelected]} />
            <Text style={styles.radioLabel}>{t('reminderSettings.disableOption')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.radioRow, isSaving && styles.radioRowDisabled]}
            onPress={selectEnable}
            disabled={isSaving}
            accessibilityRole="radio"
            accessibilityState={{ checked: selection === 'enable', disabled: isSaving }}
            accessibilityLabel={t('reminderSettings.enableOption')}
          >
            <View style={[styles.radioCircle, selection === 'enable' && styles.radioCircleSelected]} />
            <Text style={styles.radioLabel}>{t('reminderSettings.enableOption')}</Text>
          </TouchableOpacity>
        </View>

        {selection === 'enable' && (
          <DateTimePicker
            value={draftDate}
            // eslint-disable-next-line i18next/no-literal-string
            mode="time"
            // eslint-disable-next-line i18next/no-literal-string
            display="spinner"
            onChange={handleChange}
          />
        )}

        {permissionError ? (
          <View style={styles.permissionErrorBox}>
            <Text style={styles.permissionErrorText}>{t('reminderSettings.permissionRequired')}</Text>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel={t('reminderSettings.openSettings')}
            >
              <Text style={styles.openSettingsText}>{t('reminderSettings.openSettings')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={t('reminderSettings.saveButton')}
        >
          <Text style={styles.saveButtonText}>{t('reminderSettings.saveButton')}</Text>
        </TouchableOpacity>
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  radioRowDisabled: {
    opacity: 0.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  radioLabel: {
    fontSize: 16,
    color: '#111827',
  },
  permissionErrorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  permissionErrorText: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 8,
  },
  openSettingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b91c1c',
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
})
