import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readPref, writePref } from '@/lib/preferences'
import { DEFAULT_LANG, isLang, LANGS, PREF_KEYS, type Lang } from './config'
import { createFormatter, createTranslator, type Formatter, type TKey, type TParams, type Translate } from './translate'

type TagRenderer = (chunk: string) => ReactNode

interface I18nValue {
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
  t: Translate
  /** Translate with inline tags, e.g. `<b>…</b>` or `<link>…</link>`, rendered by `tags`. */
  tx: (key: TKey, params: TParams | undefined, tags: Record<string, TagRenderer>) => ReactNode
  fmt: Formatter
}

const I18nContext = createContext<I18nValue | null>(null)

/** Splits "a <b>bold</b> c" into text and rendered tag chunks (single level, no nesting). */
function renderTags(text: string, tags: Record<string, TagRenderer>): ReactNode {
  const parts: ReactNode[] = []
  const re = /<(\w+)>(.*?)<\/\1>/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const render = tags[m[1]]
    parts.push(<Fragment key={i++}>{render ? render(m[2]) : m[2]}</Fragment>)
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? readPref(PREF_KEYS.lang, isLang, DEFAULT_LANG))

  useEffect(() => {
    document.documentElement.lang = LANGS[lang].locale
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    writePref(PREF_KEYS.lang, next)
  }, [])

  const value = useMemo<I18nValue>(() => {
    const t = createTranslator(lang)
    return {
      lang,
      locale: LANGS[lang].locale,
      setLang,
      t,
      tx: (key, params, tags) => renderTags(t(key, params), tags),
      fmt: createFormatter(lang, t),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
