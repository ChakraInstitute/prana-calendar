# Prana Calendar — Running It Locally

This app makes a network request (to look up a city's coordinates), and browsers
restrict that kind of request — and sometimes scripts in general — when a page
is opened directly from disk (double-clicking `index.html`, a `file://`
address). Running it through a tiny local web server instead fixes this
completely — the app then loads exactly like any normal website, just from
your own computer.

## Windows — step by step

1. Unzip the `prana-calendar` folder somewhere convenient (e.g. your Desktop
   or Documents folder). Keep all the files together — don't move `index.html`
   out of the folder by itself.
2. Check whether Node.js is already installed:
   - Press the **Windows key**, type `cmd`, and press Enter to open Command Prompt.
   - Type `node --version` and press Enter.
   - If you see a version number (e.g. `v20.11.0`), you're set — skip to step 4.
   - If you see something like `'node' is not recognized...`, you need to
     install Node.js (step 3).
3. Install Node.js (only if step 2 didn't find it):
   - Go to <https://nodejs.org/> — it will show a big download button for the
     **LTS** version. Click it to download the installer.
   - Run the installer and click through it using the default options (just
     keep clicking "Next", then "Install").
   - Once it finishes, close and reopen Command Prompt, then repeat step 2 to
     confirm `node --version` now shows a version number.
4. Double-click **`start-server.bat`** inside the `prana-calendar` folder.
   - A command-prompt window will open and a browser tab should open
     automatically to `http://localhost:8000/`.
   - If the browser tab doesn't open by itself, open your browser and go to
     that address manually.
5. Use the app normally in that browser tab. City search and calculations
   will now both work.
6. When you're done, go back to the command-prompt window and press
   **Ctrl+C** to stop the server (or just close the window).

Each time you want to use the app again later, just double-click
`start-server.bat` again — you won't need to reinstall anything.

### If Windows blocks the batch file with a security warning

Some Windows setups show a "Windows protected your PC" warning for scripts
downloaded from the internet. If that happens, click **More info**, then
**Run anyway**. This app only starts a plain local file server — it doesn't
install anything or send your files anywhere.

## macOS / Linux

Install Node.js from <https://nodejs.org/> if you don't already have it (or
via `brew install node` on macOS with Homebrew), then open Terminal in the
`prana-calendar` folder and run:

```
./start-server.sh
```

(or `bash start-server.sh` if it won't run directly).

## Doing it manually (any OS, if you'd rather not use the script)

With Node.js installed, open a terminal/command prompt **inside** the
`prana-calendar` folder and run:

```
node server.js
```

Then open a browser to **http://localhost:8000/**. Stop the server later
with Ctrl+C. (`server.js` is a small script included in this project — it
uses only Node's built-in features, so nothing else needs to be installed.)

## Updating the splash-screen announcement (no coding needed)

The popup that appears when the app opens is controlled by `events.json`.
There's a simple admin page for editing it without touching any code:

1. With the server running (see above), open **http://localhost:8000/admin**
   in a browser.
2. Enter the admin password. It starts out as **1234** — to change it, open
   `admin-config.json` in the project folder with any text editor and
   replace the `"password"` value, then save the file (no restart needed).
3. Use the toggle to turn the popup on/off entirely, edit or remove existing
   events, or click **+ Add Event** for a new one. Each event has a title,
   a description, and an optional link.
4. Click **Save Changes**. The next time the app loads, it'll reflect your
   changes.

This page only works while the app is running through `node server.js` (or
`start-server.bat`/`start-server.sh`), since saving requires writing to a
file on the computer running the server — it won't work if the site is
hosted as plain static files without this server behind it.
