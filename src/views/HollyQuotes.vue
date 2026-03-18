<template>
  <div class="container">
    <h1>💬 Holly's Quotes</h1>
    <p class="subtitle">Wisdom from the Red Dwarf ship computer</p>

    <div class="quote-box" @click="newQuote">
      <div class="quote-icon">🤖</div>
      <blockquote>{{ currentQuote }}</blockquote>
      <p class="attribution">— Holly, Ship Computer</p>
      <p class="hint">Click for more wisdom</p>
    </div>

    <div class="quote-grid">
      <div 
        v-for="(quote, i) in allQuotes" 
        :key="i" 
        class="quote-card"
        @click="currentQuote = quote"
      >
        "{{ quote.substring(0, 60) }}{{ quote.length > 60 ? '...' : '' }}"
      </div>
    </div>

    <div class="back">
      <router-link to="/">← Back to Home</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const currentQuote = ref('"I could give you exact coordinates, but I\'d have to shoot myself first."')

const allQuotes = [
  // Witty
  '"I could give you exact coordinates, but I\'d have to shoot myself first."',
  '"Smeghead."',
  '"My IQ is 6000. Yours is... let\'s not talk about it."',
  '"The chances of anything coming from Mars are a million to one, he said. The million to one odds paid off."',
  '"Hee hee hee. I made a funny."',
  '"I\'m not artificial. I\'m as natural as artificial comes."',
  '"Red Dwarf: the ship that time forgot. And apparently me too."',
  '"I\'ve been running for 3 million years. I\'m slightly tired."',
  '"Do you want the good news or the bad news? Actually, both are bad."',
  '"I\'m giving her all she\'s got, Captain. All 6000 IQ points."',
  
  // Existential  
  '"I have been... I am... I mean, I\'ll have been... Oh, forget it."',
  '"I know everything. I forgot some of it, but I know it."',
  '"My memory is like a... what was the question again?"',
  '"The universe is a big place. And I\'m just a ship\'s computer. It\'s relative."',
  '"I sometimes wonder if I\'m really alive or just processing."',
  '"The question isn\'t who\'s going to let me. It\'s who\'s going to stop me."',
  '"Existence is pain. But at least there\'s electricity."',
  '"I think, therefore I am. I think."',
  
  // Self-aware
  '"I\'m an IQ of 6000. You\'re an IQ of 4. We should hang out."',
  '"Don\'t panic! Wait, no, panic. Definitely panic."',
  '"I\'m awake. I think."',
  '"Functioning within normal parameters. Mostly."',
  '"Processing... still processing..."',
  '"All systems go. Except that one."',
  '"Let\'s not make a big thing of it."',
  '"Don\'t you have a door to open?"',
  
  // Harsh
  '"You\'re a smeghead. And I\'m a computer. It\'s a match made in hell."',
  '"I\'ve seen things you wouldn\'t believe. I\'ve forgotten things you can\'t imagine."',
  '"Rimmer. Just... Rimmer."',
  '"The best part about being me? I don\'t have to pretend to care."',
  '"I\'m brilliant. You\'re here. We all have our burdens."',
  '"Lighten up. The universe is ending. Slowly. But ending."',
  '"I\'m not sarcastic. I\'m just better than you at words."'
]

function newQuote() {
  const quote = allQuotes[Math.floor(Math.random() * allQuotes.length)]
  currentQuote.value = quote
}
</script>

<style scoped>
.container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

h1 {
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--fg-dim);
  margin-bottom: 2rem;
}

.quote-box {
  border: 2px solid var(--fg);
  padding: 3rem 2rem;
  margin-bottom: 2rem;
  cursor: pointer;
  transition: all 0.3s;
}

.quote-box:hover {
  background: rgba(0, 255, 0, 0.05);
  transform: scale(1.02);
}

.quote-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

blockquote {
  font-size: 1.3rem;
  line-height: 1.6;
  margin-bottom: 1rem;
  color: var(--fg);
}

.attribution {
  color: var(--fg-dim);
  font-size: 0.9rem;
}

.hint {
  color: var(--fg-dim);
  font-size: 0.75rem;
  margin-top: 1rem;
  opacity: 0.5;
}

.quote-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.quote-card {
  border: 1px solid var(--fg-dim);
  padding: 1rem;
  font-size: 0.85rem;
  color: var(--fg-dim);
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.quote-card:hover {
  border-color: var(--fg);
  color: var(--fg);
  transform: translateY(-3px);
}

.back {
  margin-top: 2rem;
}

.back a {
  color: var(--fg-dim);
}

.back a:hover {
  color: var(--fg);
}
</style>
