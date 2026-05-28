import { ScrollView, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { PRIVACY_NOTICE_LAST_UPDATED } from '../src/constants/legal'

export default function PrivacyNoticeScreen() {
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('legal.privacyNotice.screenTitle') }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* legal.privacyNotice.screenTitle → Stack.Screen nav bar; .title → in-document h1 below */}
        <Text style={styles.h1} accessibilityRole="header">{t('legal.privacyNotice.title')}</Text>
        <Text style={styles.meta}>{t('legal.privacyNotice.lastUpdated', { date: PRIVACY_NOTICE_LAST_UPDATED })}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.dataController.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.dataController.details')}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.dpoSection.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.dpoSection.details')}</Text>
        <Text style={styles.email}>{t('legal.dpo.contactEmail')}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.purposes.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.purposes.details')}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.retention.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.retention.details')}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.rights.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.rights.details')}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.withdrawal.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.withdrawal.details')}</Text>

        <Text style={styles.h2} accessibilityRole="header">{t('legal.privacyNotice.thirdParty.title')}</Text>
        <Text style={styles.body}>{t('legal.privacyNotice.thirdParty.details')}</Text>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 24,
  },
  h2: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  email: {
    fontSize: 15,
    color: '#111827',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
})
