import { createInitialState } from './app/app-state.js';
import { getDom } from './app/dom.js';
import { AppController } from './app/app-controller.js';

window.addEventListener('DOMContentLoaded', () => {
  const state = createInitialState();
  const controller = new AppController(state, getDom());
  controller.init();
});
