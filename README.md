# Relanto IDE

Relanto IDE is an advanced, AI-powered web-based code editor equipped with an intelligent Copilot and a multi-tier security firewall. Built with React, Vite, and Firebase, the IDE seamlessly integrates Gemini AI for deep workspace analysis while ensuring maximum data security through a local Small Language Model (SLM) guard rail system.

![Relanto IDE Overview](src/assets/react.svg) <!-- Replace with your actual UI screenshot if needed -->

## 🌟 Key Features

- **AI Copilot (Gemini Integration)**: An intelligent chat agent that indexes your entire workspace and answers complex coding queries contextually.
- **Local SLM Guard (DLP)**: Prevents accidental data leaks (API keys, PII, financial data) by actively screening your prompts using a localized Small Language Model (like Phi-3) *before* they ever reach the cloud.
- **Rule-based Regex Firewall**: Additional layer of security with built-in and admin-defined custom regex rules to block or redact sensitive patterns.
- **Firebase Authentication & Persistence**: Isolated, secure user sessions where chat histories and settings are seamlessly synced to the cloud.
- **Admin Gatekeeping**: A secure configuration dashboard protecting API Keys and Firewall rules, accessible only to administrators.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Firebase Project (Authentication & Firestore enabled)
- A Google Gemini API Key
- Ollama (for the Local SLM Guard feature)

### 1. Installation

Clone the repository and install the dependencies:
```bash
git clone https://github.com/your-username/relanto-ide.git
cd relanto-ide
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root of the project and add your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Run the Development Server

```bash
npm run dev
```
The IDE will be available at `http://localhost:5174` (or similar, check your terminal).

---

## 🛡️ Setting up the Local SLM Guard (Ollama)

To use the advanced pre-screening security features, you need to run **Ollama** locally alongside your web application.

### Step 1: Install Ollama
Download and install Ollama for your operating system from [ollama.com](https://ollama.com/).

### Step 2: Download the Phi-3 Model
Open your terminal and run the following command to download the default security model:
```bash
ollama pull phi3
```

### Step 3: Configure CORS (Crucial)
Because Relanto IDE runs in a browser (e.g., `localhost:5174`), Ollama will block the API requests by default due to Cross-Origin Resource Sharing (CORS) rules. You **must** configure Ollama to accept external origins.

#### On Windows:
1. Quit the Ollama background service from your system tray.
2. Open the **Start Menu** -> search for **Environment Variables** -> click **Edit the system environment variables**.
3. Click the **Environment Variables** button at the bottom.
4. Under "User variables", click **New**:
   - Variable name: `OLLAMA_ORIGINS`
   - Variable value: `*`
5. Click OK and restart Ollama.

*Alternatively, start it directly from PowerShell:*
```powershell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

#### On macOS / Linux:
Stop any running instances of Ollama and start it via the terminal with the environment variable:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

### Step 4: Enable it in the IDE
1. Log into Relanto IDE.
2. Open the Settings panel and authenticate as an Admin (Default: `admin` / `123`).
3. Navigate to the **Firewall** tab, configure the endpoint (`http://localhost:11434`), and toggle the **Local SLM Guard** ON for your Copilot sessions!

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS, Lucide Icons
- **Backend / DB**: Firebase (Auth, Firestore)
- **AI Integration**: Google Generative AI (Gemini 2.0 Flash / Pro)
- **Local AI**: Ollama (Phi-3)

## 📄 License
This project is licensed under the MIT License.
