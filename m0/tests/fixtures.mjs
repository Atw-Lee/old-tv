import http from 'node:http';
import {pathToFileURL} from 'node:url';
export function startFixtures(port=5179){return http.createServer((req,res)=>{
 if(req.url==='/404.m3u8'){res.writeHead(404,{'Access-Control-Allow-Origin':'*'});res.end('M0 intentional missing fixture');}
 else {res.writeHead(200,{'Content-Type':'application/vnd.apple.mpegurl'});res.end('#EXTM3U\n#EXT-X-ENDLIST');}
}).listen(port,'127.0.0.1');}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){startFixtures();console.log('M0 failure fixtures: http://127.0.0.1:5179 (no video proxy)');}
