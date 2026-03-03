<template>
  <div class="straits-infographic">
    <div class="placeholder-content">
      <h1 class="title">Indo-Pacific Straits</h1>
      <p>Coming soon -- interactive maritime traffic visualization.</p>
    </div>
  </div>
</template>

<style scoped>
.straits-infographic {
  display: contents;
}

.placeholder-content {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 2rem;
}

.placeholder-content .title {
  font-family: 'Encode Sans', sans-serif;
  font-weight: 600;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
}
</style>
