# Custom TurboWarp with LEGO Extensions

This project consists of two separate repositories that work together:

1. **`extensions`**: Hosts the JavaScript code, images, and metadata for the custom extensions.
2. **`scratch-gui`**: The modified editor that loads the extensions unsandboxed.

## Prerequisites

* **Node.js**: (v18 or v20 LTS recommended. If using v24, see Troubleshooting below).
* **Git**: Installed and configured.
* **GitHub Account**: Pages enabled for both repositories.

## Part 1: The Extensions Repository (`extensions`)

This repo acts as the "Server" for the extenions Javascript files. Building it generates the `extensions-v0.json` metadata that the TurboWarp Editor from scratch-gui reads.

### 1. Directory Structure

* **`extensions/<Username>/`**: Put your `.js` files here (e.g., `extensions/CrispStrobe/ev3.js`).
* **`images/<Username>/`**: Put your icons here.
* **Format**: PNG or SVG.
* **Size**: 600x300 pixels (2:1 aspect ratio).
* **Filename**: Must match the ID of the extension (e.g., `ev3.png`).

### 2. Configuration (`package.json`)

Ensure you have the build tools and deployment scripts installed:

```bash
npm install
npm install --save-dev gh-pages spdx-expression-parse

```

### 3. Build & Deploy

Every time you add a new extension or edit a JS file, run these commands:

```bash
# 1. Build the metadata
npm run build

# 2. Deploy the build output to GitHub Pages
npm deploy
```

### 4. Verify

After deploying, check that this "Magic Link" returns JSON text:
`https://<YOUR-USERNAME>.github.io/extensions/generated-metadata/extensions-v0.json`

---

## Part 2: The Editor Repository (`scratch-gui`)

This repo is the user TurboWarp Blocks Editor interface. It can easily be modified to trust a specific extension URL.

### 1. Critical Configuration Files

You must edit these files to point to your GitHub Pages URL (e.g., `https://crispstrobe.github.io`).

**A. `package.json**`

* Add `"homepage": "https://<YOUR-USERNAME>.github.io/scratch-gui",` at the top.
* Update scripts:
```json
"scripts": {
  "postinstall": "patch-package",
  "deploy": "gh-pages -d build",
  ...
}
```

**B. `src/containers/tw-security-manager.jsx**`

* **Goal**: Allow Unsandboxed (hardware) access.
* **Change**: Add your domain to `isTrustedExtension`.
```javascript
const isTrustedExtension = url => (
    url.startsWith('https://extensions.turbowarp.org/') ||
    url.startsWith('http://localhost:8000/') ||
    url.startsWith('https://<YOUR-USERNAME>.github.io/') || // <--- ADD THIS
    extensionsTrustedByUser.has(url)
);

```

**C. `src/containers/extension-library.jsx` (The "Fetcher")**

* **Goal**: Tell the editor where to download the extension list.
* **Change**: Replace **ALL** instances of `https://extensions.turbowarp.org` with your URL.
```javascript
// Example 1: Fetching the list
const res = await fetch('https://<YOUR-USERNAME>.github.io/extensions/generated-metadata/extensions-v0.json');

// Example 2: Fetching the code
extensionURL: `https://<YOUR-USERNAME>.github.io/extensions/${extension.slug}.js`,

// Example 3: Fetching the icon
iconURL: `https://<YOUR-USERNAME>.github.io/extensions/${extension.image || 'images/unknown.svg'}`,

```

**D. `src/lib/libraries/extensions/index.jsx` (The "Button")**

* **Goal**: Ensure the "Extensions" button points to the right place.
* **Change**: Update `galleryLoading`, `galleryMore`, `galleryError`.
```javascript
href: 'https://<YOUR-USERNAME>.github.io/extensions/',

```

### 2. Build & Deploy

Every time you modify the editor code:

```bash
# 1. Build the editor (creates 'build' folder)
# Windows PowerShell:
$env:NODE_ENV="production"; npm run build

# Windows Command Prompt (cmd):
set NODE_ENV=production && npm run build

# 2. Deploy the build folder to GitHub Pages
npm run deploy

```

---

## Troubleshooting

### Node v24 "ERR_MODULE_NOT_FOUND"

If `npm run build` fails in the extensions repo:

1. Open `development/builder.js`.
2. Comment out the import: `// import spdxParser from "spdx-expression-parse";`
3. Comment out the usage block around line 160 (`spdxParser(metadata.license)`).

### Extensions List is Empty

1. Open your Editor URL (`.../scratch-gui`).
2. Open Developer Tools (F12) -> Network Tab.
3. Click the "Extensions" button.
4. Look for the request to `extensions-v0.json`.
* **404 Error**: Your `extension-library.jsx` URL might be wrong. Check if it points to `generated-metadata`.
* **CORS Error**: GitHub Pages issue (rare)?
* **Success (200)**: But still empty? Clear browser cache (`Ctrl + F5`).

### Extension Loads but Hardware Doesn't Work

1. Check the Console (F12).
2. If you see "Sandbox" warnings, maybe your `tw-security-manager.jsx` fix didn't apply.
3. Ensure your extension URL matches the trusted URL exactly.
4. If you attempt to use Bluetooth, dependent on what platform/environment, that might be tricky... I will probably add a few pointers later...

# Info from Original TurboWarp Extensions Repo

User-contributed unsandboxed extension gallery for TurboWarp.

https://extensions.turbowarp.org/

## Contributing (original TurboWarp Repo)

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Extensions (in the `extensions` folder) will have a comment at the top of the file describing the license for the code. In the past [MIT](./licenses/MIT.txt) was the default, however now [MPL-2.0](./licenses/MPL-2.0.txt) is recommended. Some extensions may contain a mix of several.

Sample projects (in the `samples` folder) are licensed under [CC-BY 4.0](./licenses/CC-BY-4.0.txt).

Everything else, such as the extension images, development server, and website are licensed under the [GNU General Public License version 3](licenses/GPL-3.0.txt).

See [images/README.md](images/README.md) for attribution information for each image.
