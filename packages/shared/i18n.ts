import i18next from "i18next";
import { catalog } from "./locales/catalog";
export const resources = Object.fromEntries(
  ["en", "ja", "ko", "zh-CN"].map((language, index) => [
    language,
    {
      translation: Object.fromEntries(
        Object.entries(catalog).map(([key, values]) => [key, values[index]]),
      ),
    },
  ]),
);
/** OSの言語を対応する翻訳カタログに正規化する。 */
export function resolveLanguage(language: string) {
  return language.startsWith("ja")
    ? "ja"
    : language.startsWith("ko")
      ? "ko"
      : language.startsWith("zh")
        ? "zh-CN"
        : "en";
}
export const translations = i18next.createInstance();
void translations.init({
  resources,
  lng: "en",
  fallbackLng: "en",
  keySeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false,
});
