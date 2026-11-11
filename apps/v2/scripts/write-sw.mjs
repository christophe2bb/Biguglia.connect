import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const files = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg"];
for (const folder of ["assets", "fonts", "icons", "images"])
  for (const name of await fs.readdir("dist/" + folder))
    if (!name.includes("LICENSE")) files.push("/" + folder + "/" + name);
const version = createHash("sha256")
  .update(files.join("|"))
  .digest("hex")
  .slice(0, 12);
await fs.writeFile(
  "dist/sw.js",
  `const CACHE='bc-v2-static-${version}';
const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bc-v2-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match('/index.html')));return;}
  if(FILES.includes(url.pathname))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
`,
);
console.log(
  "Offline application shell generated; no API data or messages are cached.",
);
