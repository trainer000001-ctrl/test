import type { Locale } from "@/configs/i18n";
import enDict from "@/data/dictionaries/en.json";
import idDict from "@/data/dictionaries/id.json";
import arDict from "@/data/dictionaries/ar.json";

export type Dictionary = typeof enDict;

const dictionaries: Record<Locale, Dictionary> = {
  en: enDict,
  id: idDict,
  ar: arDict,
};

export function getDictionarySync(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return getDictionarySync(locale);
}
