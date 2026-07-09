# SafeSubmit Website

This is a static website connected directly to the Botpress Chat API:

```text
https://chat.botpress.cloud/d2671494-99a0-4023-ac5e-83533a8d44e9
```

Because it is static, it can run on GitHub Pages for free.

## Run Locally

Option 1:

Double-click:

```text
start-local.bat
```

Then open:

```text
http://localhost:4173
```

Option 2:

Open a terminal in this folder and run:

```powershell
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Host on GitHub Pages

Recommended method:

1. Create a new GitHub repository.
2. Upload everything in this folder to the repository:

```text
D:\C240\safesubmit\safesubmit\safesubmit
```

3. On GitHub, open the repository.
4. Go to `Settings` -> `Pages`.
5. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
6. Select your branch, usually `main`.
7. Select `/root` if you uploaded these files directly to the repository root.
8. Click `Save`.
9. Wait for GitHub to show your public website URL.

Alternative method:

If you prefer GitHub Pages from `/docs`, upload this whole project and set Pages to use `/docs`. The `docs` folder contains the same website files.

## Important

Do not upload only `index.html`. The website also needs:

- `app.js`
- `style.css`
- `.nojekyll`

The old local `/botpress` proxy is no longer required for GitHub Pages.

The live chat supports Botpress choices, plaintext scans, `.txt` / `.md` uploads, and image uploads directly from the browser.

For image uploads, the browser resizes the image and sends it to Botpress as a `data:image/jpeg;base64,...` value. In Botpress logs this can still appear as a long text value; that is expected for static GitHub Pages hosting because there is no backend file server.
