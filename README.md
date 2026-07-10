# SafeSubmit Shield 🛡️

SafeSubmit Shield is an enterprise-grade client-side security proxy and sandbox interface designed to intercept, analyze, and sanitize sensitive information before it reaches public Large Language Models (LLMs). Powered by the **ScanCore Engine**, it acts as a corporate privacy firewall to prevent accidental data leaks.

---

## 🚀 Live Demo
View the live deployment on GitHub Pages:  
👉 **[[SafeSubmit](https://junyantan07.github.io/Safesubmit/)]**

---

## ✨ Key Features

* **Multi-Channel Input Processing:** Seamlessly switches between scanning raw plaintext, document files (`.txt`, `.md`), and data-URL image assets.
* **ScanCore Engine Core Security:** Detects and flags high-risk content, including API credentials, source logs, telemetry database strings, and Personally Identifiable Information (PII).
* **Interactive Sandbox Interface Driven by Botpress:** Utilizes Botpress as the real-time scanning agent to execute compliance evaluations, flag dangerous payloads, and handle chat routing workflows in the simulation space.
* **Integrations Hub:** Supports expanded architecture layout modules for custom platform connectivity (including modular components ready for Telegram and Discord integrations).
* **Zero Jekyll Overrides:** Optimized for modern static deployments via custom `.nojekyll` pipeline integrations.

---

## 🤖 Deep-Dive: Botpress Scanning Setup

The system combines front-end security checking with cloud-based chat intelligence:
1. **Frontend Capture (`app.js`):** Intercepts data blocks, parsing text inputs or files before they leave the browser context.
2. **Botpress Middleware:** The app safely pipes simulated payloads into a Botpress Cloud instance, which executes automated rule evaluations to determine if data strings violate corporate privacy metrics.

---

## 🛠️ Architecture & Project Structure

The project is built entirely on a lightweight, static architecture using native HTML5, modern CSS3 layout variables, and raw React (without a heavy build step) for seamless runtime execution.

```text
├── index.html          # Main landing page & enterprise product overview
├── chatbot.html        # Interactive chatbot live sandbox wrapper
├── architecture.html   # Documentation detailing ScanCore data-flow layout
├── engines.html        # Deep-dive specs of the filtering & inspection rules
├── extensions.html     # Setup instructions for custom browser and chat channels
├── app.js              # Core React logic, Botpress API router, & file upload parsers
├── style.css           # Global custom design styles and theme properties
├── brand-icon-img.png  # Main brand asset logo
└── .nojekyll           # Disables Jekyll lifecycle tracking on GitHub Pages

The live chat supports Botpress choices, plaintext scans, `.txt` / `.md` uploads, and image uploads directly from the browser.

For image uploads, the browser resizes the image and sends it to Botpress as a `data:image/jpeg;base64,...` value. In Botpress logs this can still appear as a long text value; that is expected for static GitHub Pages hosting because there is no backend file server.
