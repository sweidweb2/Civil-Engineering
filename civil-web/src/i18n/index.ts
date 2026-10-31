import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import accountAr from './locales/ar/account.json'
import adminAr from './locales/ar/admin.json'
import authAr from './locales/ar/auth.json'
import commonAr from './locales/ar/common.json'
import navAr from './locales/ar/nav.json'
import notificationsAr from './locales/ar/notifications.json'
import pmAr from './locales/ar/pm.json'
import projectsAr from './locales/ar/projects.json'
import providerAr from './locales/ar/provider.json'
import validationAr from './locales/ar/validation.json'
import accountEn from './locales/en/account.json'
import adminEn from './locales/en/admin.json'
import authEn from './locales/en/auth.json'
import commonEn from './locales/en/common.json'
import navEn from './locales/en/nav.json'
import notificationsEn from './locales/en/notifications.json'
import pmEn from './locales/en/pm.json'
import projectsEn from './locales/en/projects.json'
import providerEn from './locales/en/provider.json'
import validationEn from './locales/en/validation.json'

export const I18N_NAMESPACES = [
  'common',
  'nav',
  'account',
  'auth',
  'admin',
  'pm',
  'provider',
  'notifications',
  'projects',
  'validation',
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

const resources = {
  en: {
    common: commonEn,
    nav: navEn,
    account: accountEn,
    auth: authEn,
    admin: adminEn,
    pm: pmEn,
    provider: providerEn,
    notifications: notificationsEn,
    projects: projectsEn,
    validation: validationEn,
  },
  ar: {
    common: commonAr,
    nav: navAr,
    account: accountAr,
    auth: authAr,
    admin: adminAr,
    pm: pmAr,
    provider: providerAr,
    notifications: notificationsAr,
    projects: projectsAr,
    validation: validationAr,
  },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...I18N_NAMESPACES],
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
