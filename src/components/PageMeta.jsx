import { useEffect } from 'react'
import { pageSeo, siteName, siteUrl } from '../data/seo'

function setMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector(selector)

  if (!content) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function setCanonical(url) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!url) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }

  element.setAttribute('href', url)
}

function setStructuredData(data) {
  const id = 'page-structured-data'
  let element = document.getElementById(id)

  if (!data) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('script')
    element.id = id
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(data)
}

export function PageMeta({ pageKey }) {
  useEffect(() => {
    const page = pageSeo[pageKey]
    if (!page) return undefined

    const canonicalUrl =
      page.canonical === false ? null : new URL(page.path, siteUrl).href
    const imageUrl = page.image ? new URL(page.image, siteUrl).href : null

    document.title = page.title

    setMeta('name', 'description', page.description)
    setMeta('name', 'author', 'Mark Anton Badong')
    setMeta('name', 'robots', page.robots)

    setCanonical(canonicalUrl)

    setMeta('property', 'og:type', page.type)
    setMeta('property', 'og:site_name', siteName)
    setMeta('property', 'og:locale', 'en_US')
    setMeta('property', 'og:title', page.title)
    setMeta('property', 'og:description', page.description)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', imageUrl)
    setMeta('property', 'og:image:type', imageUrl ? 'image/png' : null)
    setMeta('property', 'og:image:width', imageUrl ? '1200' : null)
    setMeta('property', 'og:image:height', imageUrl ? '630' : null)
    setMeta('property', 'og:image:alt', page.imageAlt)

    setMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : null)
    setMeta('name', 'twitter:title', page.title)
    setMeta('name', 'twitter:description', page.description)
    setMeta('name', 'twitter:image', imageUrl)
    setMeta('name', 'twitter:image:alt', page.imageAlt)

    setStructuredData(page.structuredData)

    return undefined
  }, [pageKey])

  return null
}
