import styles from '@/styles/global.css?inline'
import { Outlet, Scripts, ScrollRestoration } from 'react-router'
import { Providers } from './providers'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <title>Pianista</title>
        <meta name="author" content="Pianista (fork de sightread, Jake Fried)" />
        <meta name="description" content="Aprende piano gratis, en tu navegador / Learn piano for free, in your browser" />

        {/* Open Graph */}
        <meta property="og:title" content="Pianista" />
        <meta property="og:site_name" content="Pianista" />
        <meta property="og:description" content="Aprende piano gratis, en tu navegador / Learn piano for free, in your browser" />
        <meta property="og:image" content={`${import.meta.env.BASE_URL}images/mode_falling_notes_screenshot.png`} />
        <meta
          property="og:image:alt"
          content="Sightread demo displaying falling notes visualization"
        />

        {/* Favicons */}
        <link rel="icon" href={`${import.meta.env.BASE_URL}favicon.ico`} />
        <link rel="apple-touch-icon" href={`${import.meta.env.BASE_URL}favicon.ico`} />

        {/* Manually inserted styles */}
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  )
}
