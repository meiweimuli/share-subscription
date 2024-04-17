import { createRouter, createWebHashHistory, createWebHistory } from '../import/vue-router.js'
import Yunpan from '../views/yupan/Yunpan.js'
import Sub from '../views/sub/Sub.js'
import Movie from '../views/movie/Movie.js'
import Tv from '../views/tv/Tv.js'

const routes = [
  { path: '/', redirect: '/yp' },
  { path: '/yp/:id?', component: Yunpan },
  { path: '/sub', component: Sub }
]

export const router = createRouter({
  history: createWebHistory('/web/'),
  routes
})