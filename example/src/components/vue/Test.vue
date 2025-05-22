<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <h2>STORE STATIC: {{ robotMoji }}</h2>
    <h2>STORE DYNAMIC: {{ envVar }}</h2>
  </div>
</template>

<script setup>
import { useStore } from "@nanostores/vue";
import { $robotMoji, $envVar } from "../../stores/store.js";

const envVar = useStore($envVar);
const robotMoji = useStore($robotMoji);
const props = defineProps({
  title: {
    type: String,
    default: "Hello World",
    required: false,
  },
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

h1 {
  font-size: 2rem;
  margin-top: 1rem;
  font-weight: bold;
}
</style>
