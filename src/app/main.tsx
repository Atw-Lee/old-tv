import {createRoot} from 'react-dom/client';
import {AppStore} from '../storage/store.js';
import {App} from './App.js';
import './style.css';
import './room.css';
const store=new AppStore();
createRoot(document.getElementById('root')!).render(<App store={store}/>);
