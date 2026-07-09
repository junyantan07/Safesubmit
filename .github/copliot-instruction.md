# GitHub Copilot Prompt: SafeSubmit Chatbot & Content Scanner UI

## Context & Goal
Build a React component for a project called **SafeSubmit**. The app helps students identify sensitive information in text, screenshots, documents, code snippets, and AI prompts before they share them. It provides risk ratings, beginner-friendly explanations, safer alternative actions, and an AI-powered chatbot workflow.

## Tech Stack Requirements
* **Framework:** React (Functional Components with Hooks)
* **Styling:** Tailwind CSS (preferred) for a clean, modern dashboard layout.
* **Icons:** Lucide React (Shield, AlertTriangle, CheckCircle, FileText, Upload, Download, Bot, User, HelpCircle).

---

## UI Layout & Components Required

### 1. Main Dashboard Layout
* Divide the screen into a **Two-Column Split Layout** or a **Tabbed View**:
  * **Left Column / Tab 1:** Input & Document Analysis Panel.
  * **Right Column / Tab 2:** AI-Powered Chatbot Assistant workflow (for interactive testing/prompt design).

### 2. File Import/Export & Input Panel (Left Side)
* **File Import:** A drag-and-drop or clickable upload zone that accepts documents, screenshots/images, text, or code snippets. 
* **Direct Text/Prompt Input:** A `textarea` where students can paste an AI prompt or code snippet they want to check.
* **Export Button:** A button to export the finalized audit/review report as a JSON or Markdown file.

### 3. Review & Risk Analysis Panel (Changes based on scan results)
Once a file or text is imported/submitted, display a structured review screen containing:
* **Risk Rating Badge:** A prominent color-coded badge based on severity:
  * `Low` (Green) - Safe to share.
  * `Medium` (Yellow) - Contains potential risks (e.g., email, full name).
  * `High` (Red) - Critical sensitive data found (e.g., API keys, passwords, SSN).
* **Beginner-Friendly Explanation:** A simple text box explaining *why* the detected information is a risk.
* **Suggested Safer Actions:** A list of actionable fixes with buttons, such as:
  * `[Mask Details]` (Replaces sensitive data with `[REDACTED]`).
  * `[Remove Details]` (Deletes the sensitive snippet).
  * `[Blur Image]` (Placeholder simulation for screenshots).
* **Educational Tip Box:** A small callout card that provides a "Digital Sharing Habit" tip to educate the student.

### 4. AI-Powered Chatbot Workflow (Right Side)
A standard chat interface designed to demonstrate an AI workflow (prompt design, retrieval, testing, and tool integration):
* **Chat History Window:** Displays user prompts and bot responses.
* **Input Bar:** Bottom-fixed input field with a send button.
* **Workflow Status Indicator:** A small badge showing which "tool/step" the AI chatbot is currently hitting (e.g., `[Step 1: Retrieving Context]` -> `[Step 2: Designing Prompt]` -> `[Step 3: Tool Integration Check]`).

---

## Technical Implementation Details (State & Logic)

### Mock Simulation Engine
To ensure the UI is fully interactive out-of-the-box, implement a `handleScanSubmit` function that reads the input text or file name and returns a mock analysis result. 

**Example Trigger Logic:**
* If the uploaded text/file contains words like "password", "API_KEY", or "secret" -> Trigger `High` Risk.
* If it contains "email" or "phone" -> Trigger `Medium` Risk.
* Otherwise -> Trigger `Low` Risk.

### Data Structure for Scan Results
```json
{
  "riskRating": "High" | "Medium" | "Low",
  "explanation": "We detected what looks like an API Key or Password. Sharing this online could give outsiders unauthorized access to your accounts.",
  "suggestions": ["Mask the API key with asterisks", "Remove the line entirely"],
  "educationalTip": "Always use environment variables (.env files) to store keys. Never hardcode them into your code snippets or AI prompts!"
}