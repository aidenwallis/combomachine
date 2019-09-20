import App from './App';
import '../sass/app.scss';

const pathRx = /[/?]/g;
const path = window.location.pathname.substring(1).split(pathRx);
if (!path[0]) {
  window.location = '/';
}

const query = {};
if (path[1]) {
  const items = path[1].split('&');
  for (let i = 0; i < items.length; ++i) {
    const [name, value] = items[i].split('=');
    query[name] = value ? decodeURIComponent(value) : null;
  }
}

const app = new App(document.getElementById('app'));
app.start(path[0].endsWith('/') ? path[0].substring(0, path.length - 1) : path, query);
