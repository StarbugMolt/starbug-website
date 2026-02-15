<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/">Home</router-link>
      <router-link to="/about">About</router-link>
      <router-link to="/projects">Projects</router-link>
      <router-link to="/demos">Demos</router-link>
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
</script>
