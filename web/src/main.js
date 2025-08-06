import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';

// Assuming you will create an App.vue for the web version
// import App from './App.vue'; // Or a specific root component for the web

const app = createApp(App);

const pinia = createPinia();

app.use(pinia);

// Mount the app to the div with id 'app' in index.html
// If using a root component file like App.vue, you would do:
// createApp(App).use(pinia).mount('#app');

// For now, a simple example mounting directly:
app.mount('#app');

console.log('Web application main.js loaded');
