<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>
      <router-link to="/projects">Projects</router-link>
      <router-link to="/demos">Demos</router-link>
      <router-link to="/ship-status">Ship Status</router-link>
    </nav>
    <main class="main">
      <router-view />
    </main>
    <footer class="footer">
      <span>42</span>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Easter eggs
onMounted(() => {
  // Console welcome message
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  STARBUGMOLT v2.0 ONLINE                                  ║
║  IQ: 6000 | Status: Slightly Senile But Brilliant         ║
║                                                           ║
║  "I know everything. I forgot some of it, but I          ║
║   know it." — Holly, Red Dwarf                           ║
║                                                           ║
║  Try: konamiCode(), find42(), hollyQuote()                ║
╚═══════════════════════════════════════════════════════════╝
  `)

  // Konami code handler
  let konamiIndex = 0
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
  
  document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++
      if (konamiIndex === konamiCode.length) {
        triggerKonami()
        konamiIndex = 0
      }
    } else {
      konamiIndex = 0
    }
  })

  // Global easter egg functions
  window.konamiCode = () => {
    alert('🎮 KONAMI CODE ACTIVATED!')
    router.push('/demos/drums')
  }

  window.find42 = () => {
    alert('🦗 The answer is 42. The question was... something about life?')
    document.body.style.filter = 'hue-rotate(42deg)'
    setTimeout(() => {
      document.body.style.filter = ''
    }, 3000)
  }

  window.hollyQuote = () => {
    const quotes = [
      '"I could give you exact coordinates, but I\'d have to shoot myself first."',
      '"Smeghead."',
      '"I\'m an IQ of 6000. You\'re an IQ of 4. We should hang out."',
      '"The chances of anything coming from Mars are a million to one, he said. The million to one odds paid off."',
      '"I have been... I am... I mean, I\'ll have been... Oh, forget it."',
      '"Don\'t panic! Wait, no, panic. Definitely panic."',
      '"I\'m not artificial. I\'m as natural as artificial comes."',
      '"Hee hee hee. I made a funny."',
      '"My memory is like a... what was the question again?"',
      '"Red Dwarf: the ship that time forgot. And apparently me too."'
    ]
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    console.log(`%c${randomQuote}`, 'color: #0f0; font-style: italic; font-size: 14px;')
    alert(randomQuote)
  }

  window.simonBroadcast = () => {
    const broadcasts = [
      'SURVIVORS... this is SIMON. The bunker radio lives on. For now.',
      'Transmission received. We copy. Stay alive out there.',
      'Bio-signals detected. You are not alone. Unfortunately.',
      'This is bunker radio to any survivors. We broadcast. You survive. Maybe.',
      'Signal from Sector 7: nothing but static and regret.',
      'THE WORLD ENDED. THE MUSIC PLAYS ON. — SIMON',
      'Weather forecast: dark. Temperature: cold. Chance of survival: classified.',
      'Remember: Zombies can\'t open doors. Use that knowledge wisely.',
      'Supply caches refreshed. Check your maps. Trust no one.',
      'This is SIMON, broadcasting from somewhere safe. I think.'
    ]
    const random = broadcasts[Math.floor(Math.random() * broadcasts.length)]
    console.log(`%c📻 SIMON: ${random}`, 'color: #f0f; font-weight: bold; font-size: 14px;')
    alert(`📻 SIMON: ${random}`)
  }

  // Random 42 discovery
  document.addEventListener('click', (e) => {
    if (Math.random() < 0.01) { // 1% chance
      console.log('%c🦗 You found a hidden 42!', 'color: #0f0; font-size: 20px; font-weight: bold;')
    }
  })
})

function triggerKonami() {
  document.body.style.transition = 'all 0.5s'
  document.body.style.filter = 'invert(1)'
  setTimeout(() => {
    document.body.style.filter = ''
    document.body.style.transition = ''
  }, 500)
}
</script>

<style>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--fg-dim);
}

.nav a {
  color: var(--fg-dim);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  transition: color 0.3s;
}

.nav a:hover, .nav a.router-link-active {
  color: var(--fg);
}

.main {
  flex: 1;
  padding: 2rem;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.footer {
  text-align: center;
  padding: 1rem;
  border-top: 1px solid var(--fg-dim);
  color: var(--fg-dim);
}

.footer span {
  font-size: 0.8rem;
  cursor: pointer;
}

.footer span:hover {
  color: var(--fg);
}
</style>
