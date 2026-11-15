const uriScheme = /^([a-z][a-z\d+.-]*):\/\//i

function isSubscription(value: string) {
  const scheme = value.match(uriScheme)?.[1]?.toLowerCase()
  return Boolean(scheme && scheme !== 'http' && scheme !== 'https')
}

function decodeCloudflareEmail(encoded: string) {
  const key = Number.parseInt(encoded.slice(0, 2), 16)
  if (Number.isNaN(key)) return ''

  let email = ''
  for (let i = 2; i < encoded.length; i += 2) {
    const value = Number.parseInt(encoded.slice(i, i + 2), 16)
    if (Number.isNaN(value)) return ''
    email += String.fromCharCode(value ^ key)
  }
  return email
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  }

  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, name) => {
      if (decimal) return String.fromCodePoint(Number(decimal))
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16))
      return named[name.toLowerCase()] ?? entity
    }
  )
}

function extractHtmlPreBlocks(html: string) {
  const subscriptions: string[] = []
  const pre = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi
  let match: RegExpExecArray | null

  while ((match = pre.exec(html))) {
    let content = match[1] ?? ''

    content = content.replace(
      /<([a-z][\w:-]*)\b[^>]*\bdata-cfemail=["']([\da-f]+)["'][^>]*>[\s\S]*?<\/\1>/gi,
      (_, _tag, encoded: string) => decodeCloudflareEmail(encoded)
    )
    content = content.replace(/<[^>]*>/g, '')
    content = decodeHtmlEntities(content)

    for (const line of content.split(/\r?\n/)) {
      const subscription = line.trim()
      if (isSubscription(subscription)) subscriptions.push(subscription)
    }
  }

  return subscriptions
}

export const extractSubscriptions = extractHtmlPreBlocks
