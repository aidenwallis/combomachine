import App from './App';
import '../sass/app.scss';

const pathRx = /[/?]/g;
const path = window.location.pathname.substring(1).split(pathRx);
if (!path[0]) {
  window.location = '/';
}

const app = new App(document.getElementById('app'));
app.start(path[0]);
