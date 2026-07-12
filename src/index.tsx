import './style/index.css';
import App from './components/app';
import { hydrate, prerender as ssr } from 'preact-iso';

if (typeof window !== 'undefined') {
    hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
    return await ssr(<App {...data} />);
}
