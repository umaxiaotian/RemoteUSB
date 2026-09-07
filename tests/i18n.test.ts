import { expect, it } from 'vitest';
import { catalog } from '../packages/shared/locales/catalog';
import { resolveLanguage, translations } from '../packages/shared/i18n';
import { settingsSchema } from '../packages/core/models';
it('has four complete catalogs with matching interpolation parameters', () => {
  for (const values of Object.values(catalog)) {
    expect(values).toHaveLength(4);
    const params = [...values[0].matchAll(/{{(\w+)}}/g)].map(m => m[1]).sort();
    for (const value of values) { expect(value.trim().length).toBeGreaterThan(0); expect([...value.matchAll(/{{(\w+)}}/g)].map(m => m[1]).sort()).toEqual(params); }
  }
});
it('translates all target languages and falls back predictably', () => {
  expect(translations.t('Devices', { lng: 'ja' })).toBe('デバイス');
  expect(translations.t('Devices', { lng: 'ko' })).toBe('장치');
  expect(translations.t('Devices', { lng: 'zh-CN' })).toBe('设备');
  expect(resolveLanguage('ja-JP')).toBe('ja'); expect(resolveLanguage('zh-SG')).toBe('zh-CN'); expect(resolveLanguage('fr')).toBe('en');
  expect(settingsSchema.safeParse({ language: 'invalid' }).success).toBe(false);
});
