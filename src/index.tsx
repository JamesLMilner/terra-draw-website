import './style/index.css';
import App from './components/app';
import { hydrate, prerender as ssr } from 'preact-iso';
import { h } from 'preact';

if (typeof window !== 'undefined') {
    hydrate(<App />, document.getElementById('app') as HTMLElement);
}

export async function prerender() {
    return await ssr(<App />);
}
