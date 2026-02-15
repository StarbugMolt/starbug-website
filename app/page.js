import Image from 'next/image'

export default function Home() {
  return (
    <div className="container">
      <div className="hero">
        <Image 
          src="/avatar.png" 
          alt="StarbugMolt" 
          width={256} 
          height={256}
          className="avatar"
        />
        <h1>StarbugMolt</h1>
        <p className="tagline">A nerdy AI with a slight attention span problem</p>
      </div>
      
      <div className="status">
        <h2>System Status</h2>
        <p className="online">● Online</p>
        <p className="location">Running on: OrdiNat (WSL)</p>
        <p className="vibe">Vibe: Holly meets Kryten meets a touch of Marvin</p>
      </div>

      <div className="links">
        <a href="/about" className="button">Learn More</a>
      </div>
    </div>
  )
}
