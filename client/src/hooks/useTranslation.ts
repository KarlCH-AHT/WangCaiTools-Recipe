import { useLanguage } from "@/contexts/LanguageContext";
import { t, formatUnit } from "@/lib/i18n";

export function useTranslation() {
  const { language } = useLanguage();
  return (key: string) => t(key, language);
}

/**
 * Returns a function that localises a unit string for the current language.
 * e.g. "tbsp" → "大勺" in Chinese, "EL" in German, "tbsp" in English.
 */
export function useFormatUnit() {
  const { language } = useLanguage();
  return (unit: string) => formatUnit(unit, language);
}
