import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) result.push(...(await walk(path)));
    else result.push(path);
  }
  return result;
}
const files = (await walk('dist')).filter(
  (path) =>
    !path.endsWith('.pdf') &&
    !path.endsWith('_redirects') &&
    !path.endsWith('_headers') &&
    !path.endsWith('sw.js'),
);
const hash = createHash('sha256');
for (const path of files) hash.update(await readFile(path));
const version = hash.digest('hex').slice(0, 12);
const urls = [
  '/',
  ...files.filter((path) => path !== 'dist/index.html').map((path) => '/' + path.slice(5)),
];
const worker = `const CACHE='bass-static-${version}';
const PRECACHE=${JSON.stringify(urls)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bass-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&!url.pathname.endsWith('.pdf')){event.respondWith(fetch(request).then(response=>response.ok?response:caches.match('/')).catch(()=>caches.match('/')));return;}
 if(url.pathname.endsWith('.pdf')){event.respondWith(caches.match(url.pathname).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&response.status===200){const copy=response.clone();event.waitUntil(caches.open('bass-pdf-v1').then(cache=>cache.put(url.pathname,copy)));}return response;})));return;}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
`;
await writeFile('dist/sw.js', worker);
console.log(
  `Offline worker: ${urls.length} shell assets, version ${version}. PDF is cached on demand.`,
);
