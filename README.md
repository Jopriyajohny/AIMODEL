# AI Exam Behaviour Detection — Demo

This is a small demo that uses a Teachable Machine image model to detect exam behaviours via webcam.

How to use

- Serve the folder on `http://localhost` (webcam requires a secure context or localhost).

Python 3 quick server (run in this folder):

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser, paste your Teachable Machine model base URL into the input (or use the pre-filled example), then press Start.

Files
- [index.html](index.html) — demo page
- [script.js](script.js) — demo logic
- [styles.css](styles.css) — basic styles

Notes
- Use Chrome or Edge for best webcam support.
- If you use your own Teachable Machine model, paste the base model URL (the page URL shown by Teachable Machine, ending with `/`) into the input and press Start.
