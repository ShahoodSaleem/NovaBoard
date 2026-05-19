<div align="center">

# 🚀 NovaBoard

**Your browser's new tab, reimagined.**

A premium, kanban-style bookmark manager that transforms every new tab into a beautifully organized command center — built for power users, designers, and anyone who lives in their browser.

[![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![React](https://img.shields.io/badge/Built%20With-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundled%20With-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## ✨ What is NovaBoard?

NovaBoard replaces your default Chrome new tab page with a **drag-and-drop kanban board** for your bookmarks. Organize your links into workspaces and columns, save pages instantly with a keyboard shortcut, and carry your entire browsing workflow with you — all stored locally and privately in your browser.

No accounts. No cloud sync. Just flow.

---

## 🎯 Key Features

| Feature | Description |
|---|---|
| **🗂️ Kanban Board** | Organize bookmarks into columns and workspaces with full drag-and-drop support |
| **⚡ Quick Save** | Hit `Ctrl+Shift+Y` to instantly save the current tab to your Inbox |
| **🌐 Multi-Workspace** | Create multiple boards for different projects, clients, or contexts |
| **📦 Import / Export** | Back up and restore your entire board as a JSON file |
| **🎨 Rich UI** | Glassmorphism design, smooth GSAP animations, and a carefully crafted dark aesthetic |
| **🔒 100% Local** | All data lives in `chrome.storage.local` — nothing leaves your machine |
| **📌 Favicon Support** | Every bookmark auto-fetches its site icon for instant visual recognition |

---

## 🖥️ Tech Stack

- **React 19** — UI components and state management
- **Zustand** — Lightweight global state store
- **@dnd-kit** — Accessible, performant drag-and-drop
- **GSAP** — Fluid, high-performance animations
- **Tailwind CSS v4** — Utility-first styling
- **Vite** — Lightning-fast dev server and bundler
- **Chrome Extension Manifest V3** — Modern, secure extension architecture

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- Google Chrome (or any Chromium browser)

### 1. Clone the repo

```bash
git clone https://github.com/ShahoodSaleem/NovaBoard.git
cd NovaBoard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the extension

```bash
npm run build
```

This outputs the production-ready extension to the `dist/` folder.

### 4. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder from this project

Open a new tab — NovaBoard is live. 🎉

---

## ⌨️ Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + Y` | Quick-save the current tab to your NovaBoard Inbox |
| `⌘ + Shift + Y` | Same on macOS |

You can customize this shortcut via `chrome://extensions/shortcuts`.

---

## 📁 Project Structure

```
NovaBoard/
├── public/
│   ├── manifest.json        # Chrome extension manifest (MV3)
│   └── assets/              # Icons and static assets
├── src/
│   ├── background/          # Service worker (quick-save logic)
│   ├── components/
│   │   ├── dashboard/       # Board, columns, cards, modals
│   │   └── ui/              # Reusable UI primitives
│   ├── dashboard/           # New tab page entry point
│   ├── popup/               # Extension popup UI
│   ├── services/            # Chrome storage abstraction
│   └── store/               # Zustand global state
├── vite.config.js           # Multi-entry Vite build config
└── README.md
```

---

## 🛠️ Development

Run the dev server (for UI iteration):

```bash
npm run dev
```

> **Note:** Because this is a Chrome extension, some APIs (`chrome.storage`, `chrome.tabs`) only work inside the actual extension context. For full testing, use `npm run build` and reload the unpacked extension in Chrome.

---

## 📤 Import & Export

NovaBoard lets you back up your entire workspace:

- **Export** — Downloads a `.json` snapshot of all your workspaces, columns, and bookmarks
- **Import** — Restores a previously exported snapshot (merges or replaces existing data)

Find these options in the **⚙️ Settings** panel on the dashboard.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

Built with ❤️ by [Shahood Saleem](https://github.com/ShahoodSaleem)

*Stop bookmarking. Start organizing.*

</div>
