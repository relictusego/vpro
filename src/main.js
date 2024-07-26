import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
// app.config.errorHandler = (err, instance, info) => {
//   console.error('Vue error caught=====>:', err, info);
//   // 可以在这里记录错误日志或显示错误提示
// };
app.use(router).mount('#app')

