import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PREF_KEYS } from './config'
import { I18nProvider, useI18n } from './I18nProvider'

// Tell React we are in a test environment that supports act().
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function Probe() {
  const { t, lang, setLang } = useI18n()
  return (
    <div>
      <span data-testid="label">{t('nav.commitments')}</span>
      <button onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}>toggle</button>
    </div>
  )
}

function mount() {
  act(() => {
    root.render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
  })
  return {
    label: () => container.querySelector('[data-testid=label]')!.textContent,
    toggle: () => act(() => container.querySelector('button')!.click()),
  }
}

beforeEach(() => {
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('I18nProvider', () => {
  it('defaults to English for a new user', () => {
    const ui = mount()
    expect(ui.label()).toBe('Commitments')
    expect(document.documentElement.lang).toBe('en-IN')
  })

  it('switches the whole tree immediately, without reloading', () => {
    const ui = mount()
    ui.toggle()
    expect(ui.label()).toBe('வாக்குறுதிகள்')
    expect(document.documentElement.lang).toBe('ta-IN')
  })

  it('persists the choice and restores it on the next visit', () => {
    const ui = mount()
    ui.toggle()
    expect(localStorage.getItem(PREF_KEYS.lang)).toBe('ta')
    act(() => root.unmount())
    root = createRoot(container)
    expect(mount().label()).toBe('வாக்குறுதிகள்')
  })

  it('ignores an invalid stored value', () => {
    localStorage.setItem(PREF_KEYS.lang, 'fr')
    expect(mount().label()).toBe('Commitments')
  })
})
