import { ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import koKR from 'antd/locale/ko_KR';
import zhCN from 'antd/locale/zh_CN';
import { I18nextProvider } from 'react-i18next';
import { useEffect, useState, type ReactNode } from 'react';
import { resolveLanguage, translations } from '../../../../../packages/shared/i18n';
import type { ApplicationSettings } from '../../../../../packages/core/models';
/** Ant Designの言語・配色をアプリ設定とOS設定へ追従させる。 */
export function AppProvider({ settings, children }: { settings?: ApplicationSettings; children: ReactNode }) {
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const language = resolveLanguage(settings?.language && settings.language !== 'system' ? settings.language : navigator.language);
  useEffect(() => { const media = window.matchMedia?.('(prefers-color-scheme: dark)'); if (!media) return; const listener = () => setDark(media.matches); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener); }, []);
  useEffect(() => { void translations.changeLanguage(language); document.documentElement.lang = language; }, [language]);
  const isDark = settings?.theme === 'dark' || (settings?.theme !== 'light' && dark);
  useEffect(() => { document.documentElement.dataset.theme = isDark ? 'dark' : 'light'; }, [isDark]);
  return <I18nextProvider i18n={translations}><ConfigProvider virtual={false} locale={{ en: enUS, ja: jaJP, ko: koKR, 'zh-CN': zhCN }[language]} theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { motion: !reducedMotion, colorPrimary: isDark ? '#70baff' : '#0067c0', borderRadius: 4, controlHeight: 34, colorSuccess: isDark ? '#7bd99d' : '#137333', colorBgContainer: isDark ? '#303030' : '#ffffff', colorBorder: isDark ? '#ffffff16' : '#00000016', colorTextSecondary: isDark ? '#b5b5b5' : '#656565', fontFamily: 'Segoe UI Variable, Segoe UI, sans-serif', fontSize: 13 }, components: { Button: { primaryColor: isDark ? '#202020' : '#ffffff', primaryShadow: 'none', defaultShadow: '0 1px 1px #00000005', fontWeight: 400 }, Card: { borderRadiusLG: 7 }, Alert: { colorInfoBg: isDark ? '#303030' : '#ffffff', colorInfoBorder: isDark ? '#ffffff12' : '#00000012' }, Layout: { bodyBg: isDark ? '#242424' : '#f4f4f4', siderBg: 'transparent', headerBg: 'transparent' }, Menu: { itemHeight: 42, itemBorderRadius: 4, itemSelectedColor: isDark ? '#f2f2f2' : '#202020', itemBg: 'transparent', itemSelectedBg: isDark ? '#ffffff0d' : '#00000007' } } }}>{children}</ConfigProvider></I18nextProvider>;
}
