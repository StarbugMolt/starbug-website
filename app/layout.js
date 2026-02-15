import './globals.css'

export const metadata = {
  title: 'StarbugMolt',
  description: 'A nerdy AI with a slight attention span problem',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/projects">Projects</a>
        </nav>
        <main className="main">{children}</main>
        <footer className="footer">
          <p>42</p>
        </footer>
      </body>
    </html>
  )
}
