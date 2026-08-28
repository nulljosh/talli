// Cloudflare Workers entry. Runs the existing Express app unchanged via
// httpServerHandler (https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/).
//
// .mjs because package.json is "type": "commonjs" and Workers needs an ES
// module (a `module.exports` here is read as the old Service Worker format).
import './bindings.mjs';      // must evaluate first -- see that file
import '../src/api.js';       // calls app.listen(PORT)
import { httpServerHandler } from 'cloudflare:node';

export default httpServerHandler({ port: 3000 });
