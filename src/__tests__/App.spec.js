import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('monta y renderiza el dashboard (/main; jsdom no soporta WebGL de la landing)', async () => {
    router.push('/main')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    expect(wrapper.exists()).toBe(true)
  })
})
