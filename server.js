/*
 * server.js — a tiny static file server for running Prana Calendar
 * locally, using only Node's built-in modules (no npm install needed).
 *
 * Usage: node server.js
 * Then open http://localhost:8000/ in a browser.
 *
 * Files are always read fresh from disk on every request (nothing is
 * cached), so editing a file and reloading the page already shows the
 * change — no server restart needed. On top of that, this also injects
 * a tiny auto-reload script into HTML pages: it polls the server once a
 * second, and if any project file has changed, the browser tab reloads
 * itself automatically.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

// --- Auto-reload: track the last time any project file changed. ---
let lastChangeTs = Date.now();

// Media assets (audio, video, images) are never live-edited the way code
// is, so they're excluded from triggering a reload. This also sidesteps a
// real Windows gotcha: fs.watch's recursive mode can fire a spurious
// "change" event just from a file being *read* (e.g. antivirus scanning it,
// OneDrive touching its metadata, or simply this server itself opening a
// new read stream to serve a seek) — without this exclusion, seeking
// around in an audio file could trigger the browser to reload mid-playback,
// which looks exactly like "everything pauses and jumps back to the start"
// even though nothing is actually wrong with playback or seeking.
const NO_RELOAD_EXTENSIONS = new Set([
  '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.mov', '.png', '.jpg', '.jpeg', '.gif', '.webp',
]);

// events.json and admin-config.json are data files the admin page itself
// writes to (via POST /api/admin/save-events) — not source files a
// developer is hand-editing and wants to see reflected instantly. Without
// this exclusion, saving in the admin editor changes events.json on disk,
// the watcher below sees that and bumps lastChangeTs, and ~1s later the
// live-reload poller injected into admin.html reloads the page out from
// under itself — wiping the in-memory password/session and dropping the
// editor back to the login gate right after a successful save.
const NO_RELOAD_FILENAMES = new Set(['events.json', 'admin-config.json']);

function shouldTriggerReload(filename) {
  if (!filename) return true; // no filename info — be safe and still reload
  const base = path.basename(filename);
  if (NO_RELOAD_FILENAMES.has(base)) return false;
  const ext = path.extname(filename).toLowerCase();
  return !NO_RELOAD_EXTENSIONS.has(ext);
}

try {
  fs.watch(ROOT, { recursive: true }, (eventType, filename) => {
    if (!shouldTriggerReload(filename)) return;
    lastChangeTs = Date.now();
    console.log('Change detected:' + (filename ? ' ' + filename : '') + ' — browser will auto-reload.');
  });
} catch (err) {
  // `recursive` isn't supported on every platform/Node version (notably
  // some older Linux builds). Auto-reload just won't fire in that case —
  // everything else about the server still works fine.
  console.log('(Auto-reload watcher could not start: ' + err.message + ')');
}

const LIVERELOAD_SNIPPET = `
<script>
(function () {
  var lastSeenTs = null;
  setInterval(function () {
    fetch('/__livereload')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (lastSeenTs === null) {
          lastSeenTs = data.ts;
        } else if (data.ts !== lastSeenTs) {
          location.reload();
        }
      })
      .catch(function () {});
  }, 1000);
})();
</script>
`;

// --- Admin page: simple password-protected editing of events.json -----
// The password lives server-side only, in admin-config.json (never sent to
// the browser except as a yes/no answer to a login attempt). Change the
// password any time by editing the "password" value in that file — no
// restart needed, it's read fresh on every login attempt.
const ADMIN_CONFIG_PATH = path.join(ROOT, 'admin-config.json');
const EVENTS_JSON_PATH = path.join(ROOT, 'events.json');

function readAdminPassword() {
  try {
    const raw = fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed.password === 'string' ? parsed.password : null;
  } catch (err) {
    console.log('Could not read admin-config.json: ' + err.message);
    return null;
  }
}

function readJsonBody(req, callback) {
  let body = '';
  let tooLarge = false;
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e6) {
      // Guard against a runaway/abusive request body.
      tooLarge = true;
      req.destroy();
    }
  });
  req.on('end', () => {
    if (tooLarge) return; // response already unwinding via destroy()
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (err) {
      callback(err, null);
    }
  });
  req.on('error', (err) => callback(err, null));
}

function sendJson(res, statusCode, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

// Validates the shape the admin editor is expected to send — just enough
// to stop a malformed save from corrupting events.json, not a full schema
// validator.
function validateEventsPayload(data) {
  if (!data || typeof data !== 'object') return 'Missing data.';
  if (typeof data.show !== 'boolean') return '"show" must be true or false.';
  if (!Array.isArray(data.events)) return '"events" must be a list.';
  for (const ev of data.events) {
    if (!ev || typeof ev !== 'object') return 'Each event must be an object.';
    if (typeof ev.title !== 'string') return 'Each event needs a title (text).';
    if (typeof ev.description !== 'string') return 'Each event needs a description (text).';
    if (typeof ev.link !== 'string') return 'Each event needs a link (text — can be empty).';
  }
  return null;
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/__livereload') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ts: lastChangeTs }));
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/admin/login') {
    readJsonBody(req, (err, data) => {
      if (err) return sendJson(res, 400, { ok: false, error: 'Malformed request.' });
      const actual = readAdminPassword();
      if (actual === null) return sendJson(res, 500, { ok: false, error: 'Admin password is not configured on the server.' });
      const ok = typeof data.password === 'string' && data.password === actual;
      sendJson(res, ok ? 200 : 401, { ok, error: ok ? undefined : 'Incorrect password.' });
    });
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/admin/save-events') {
    readJsonBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { ok: false, error: 'Malformed request.' });
      const actual = readAdminPassword();
      if (actual === null) return sendJson(res, 500, { ok: false, error: 'Admin password is not configured on the server.' });
      if (typeof body.password !== 'string' || body.password !== actual) {
        return sendJson(res, 401, { ok: false, error: 'Incorrect password.' });
      }
      const problem = validateEventsPayload(body.data);
      if (problem) return sendJson(res, 400, { ok: false, error: problem });
      const toWrite = {
        show: body.data.show,
        events: body.data.events.map((ev) => ({
          title: ev.title,
          description: ev.description,
          link: ev.link,
        })),
      };
      fs.writeFile(EVENTS_JSON_PATH, JSON.stringify(toWrite, null, 2) + '\n', 'utf8', (writeErr) => {
        if (writeErr) return sendJson(res, 500, { ok: false, error: 'Could not save: ' + writeErr.message });
        sendJson(res, 200, { ok: true });
      });
    });
    return;
  }

  if (urlPath === '/admin') urlPath = '/admin.html';
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));

  // Prevent escaping the project folder.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // --- Debug logging for image requests ---------------------------------
  // Prints exactly what the server received and exactly what absolute path
  // it's about to check on disk, so a 404 can be compared directly against
  // `ls images/` output to spot a mismatched filename (case, extension,
  // stray spaces, etc.) instead of guessing.
  const isImageRequest = urlPath.toLowerCase().startsWith('/images/');
  if (isImageRequest) {
    console.log('[image request] URL path:  ' + urlPath);
    console.log('[image request] Full path: ' + filePath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // .json files (events.json in particular) are small, change at runtime
  // via the admin page, and are read fresh from disk on every request
  // anyway — but without an explicit no-store header, a browser can still
  // cache the *response* itself using its own heuristics and keep serving
  // a stale copy after an admin save (e.g. the splash popup silently
  // staying hidden after "show" was flipped back to true). Force a fresh
  // fetch every time instead.
  const noStoreHeaders = ext === '.json' ? { 'Cache-Control': 'no-store' } : {};

  // HTML pages are small and get the live-reload script injected, so they
  // stay on the simple "read the whole file" path — nothing ever seeks
  // inside an HTML response anyway.
  if (ext === '.html') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + urlPath);
        return;
      }
      let html = data.toString('utf8');
      if (html.includes('</body>')) {
        html = html.replace('</body>', LIVERELOAD_SNIPPET + '</body>');
      } else {
        html += LIVERELOAD_SNIPPET;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(html);
    });
    return;
  }

  // Everything else (including audio) is served with HTTP Range support.
  // Without this, a browser's request to seek partway into an audio file
  // gets the whole file back again starting at byte 0 with a plain 200 —
  // which is exactly what makes some browsers give up on the seek and
  // snap playback back to the start instead of jumping to the new spot.
  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      if (isImageRequest) {
        console.log('[image request] NOT FOUND — fs.stat error: ' + (statErr ? statErr.code : 'path exists but is not a file'));
        // List what's actually in images/ right now, so it can be compared
        // directly against the path logged above — this is almost always
        // a filename mismatch (case, extension, stray space) rather than a
        // server problem.
        const imagesDir = path.join(ROOT, 'images');
        fs.readdir(imagesDir, (readErr, files) => {
          if (readErr) {
            console.log('[image request] Could not read images/ folder: ' + readErr.message);
          } else {
            console.log('[image request] Actual files in images/: ' + (files.length ? files.join(', ') : '(empty)'));
          }
        });
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }

    if (isImageRequest) {
      console.log('[image request] FOUND — serving ' + filePath);
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match && match[1] ? parseInt(match[1], 10) : 0;
      const end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (!match || start > end || start >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
        });
        res.end();
        return;
      }

      const clampedEnd = Math.min(end, fileSize - 1);
      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Length': clampedEnd - start + 1,
        'Content-Range': `bytes ${start}-${clampedEnd}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        ...noStoreHeaders,
      });
      fs.createReadStream(filePath, { start, end: clampedEnd }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      ...noStoreHeaders,
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log('Prana Calendar - Local Server');
  console.log('==============================');
  console.log('');
  console.log(`Serving at ${url}`);
  console.log('Leave this window open while you use the app.');
  console.log('Edits to any file are picked up automatically — the open');
  console.log('browser tab will reload itself within about a second.');
  console.log('Press Ctrl+C to stop the server when you are done.');
  console.log('');

  // Try to open the default browser automatically.
  const platform = process.platform;
  const openCmd =
    platform === 'win32' ? `start "" "${url}"` :
    platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(openCmd, () => {});
});
