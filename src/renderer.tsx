import { reactRenderer } from '@hono/react-renderer'
// Use the React variants so the renderer receives React elements, not Hono JSX nodes
import { Link, ViteClient, Script } from 'vite-ssr-components/react'

export const renderer = reactRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
        <Script src="/src/client/main.tsx" />
        <Link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
})
