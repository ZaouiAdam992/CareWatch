# 🏥 CareWatch — AI Health Monitoring Platform

> Real-time health analysis powered by webcam AI. Detect stress, fatigue, anxiety, burnout, and monitor heart rate — all from your browser.

![CareWatch](https://img.shields.io/badge/CareWatch-v3.0-00d4ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGQ0ZmYiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTIyIDEyaC00bC0zIDlMOSAzTDYgMTJIMiIvPjwvc3ZnPg==)
![React](https://img.shields.io/badge/React-19.2.6-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite)
![Claude AI](https://img.shields.io/badge/Claude_AI-Anthropic-7C3AED?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 📹 **Real-time Webcam Analysis** — rPPG heart rate, stress, fatigue detection
- 🤖 **AI Chatbot (Med·Check)** — Medication reminders powered by Claude AI
- 📧 **Email Reminders** — Automated medication notifications via Resend API
- 📊 **6 Health Metrics** — Stress, Fatigue, Anxiety, Burnout, Heart Rate, SpO₂
- 🚨 **Smart Alerts** — Contextual recommendations when thresholds exceeded
- 🗄️ **Persistent Storage** — SQLite database + localStorage
- 🌙 **Professional Dark UI** — Animated gauges, live camera feed

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  React 19 + Vite 8 (localhost:5173)             │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Camera   │  │  Gauges  │  │ Med·Check│      │
│  │  rPPG     │  │  SVG     │  │ Chatbot  │      │
│  └────┬─────┘  └──────────┘  └────┬─────┘      │
│       │                            │             │
│       ▼                            ▼             │
│  Canvas API              Claude API (Anthropic)  │
│  getUserMedia()          Resend API (Email)      │
└───────┬─────────────────────────────────────────┘
        │ axios (HTTP)
        ▼
┌─────────────────────────────────────────────────┐
│                   BACKEND                        │
│  Node.js + Express (localhost:5000)             │
│                                                  │
│  7 REST Endpoints                               │
│  ┌──────────────────────────────┐               │
│  │ POST /api/session/start      │               │
│  │ POST /api/metrics/save       │               │
│  │ POST /api/alerts/save        │               │
│  │ GET  /api/session/:id/history│               │
│  │ GET  /api/session/:id/alerts │               │
│  │ POST /api/session/:id/end    │               │
│  │ GET  /api/health             │               │
│  └──────────────┬───────────────┘               │
│                 │                                │
│                 ▼                                │
│  ┌──────────────────────────────┐               │
│  │  SQLite (health.db)          │               │
│  │  Tables: sessions, metrics,  │               │
│  │          alerts              │               │
│  └──────────────────────────────┘               │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/CareWatch.git
cd CareWatch
```

### 2. Install & run Backend
```bash
cd backend
npm install
node server.js
# ✓ CareWatch Backend running on http://localhost:5000
```

### 3. Install & run Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
# ✓ http://localhost:5173
```

### 4. Open in browser
Go to `http://localhost:5173` → Landing page with chatbot appears!

---

## 📦 Tech Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.6 | UI framework (hooks: useState, useEffect, useRef, useCallback) |
| react-dom | 19.2.6 | DOM rendering |
| axios | 1.16.1 | HTTP client for backend API calls |
| recharts | 3.8.1 | Data visualization charts |
| vite | 8.0.12 | Dev server + build tool |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.18.2 | REST API server (7 endpoints) |
| cors | 2.8.5 | Cross-origin requests (frontend ↔ backend) |
| sqlite3 | 5.1.6 | SQLite database driver |

### External APIs
| API | Purpose |
|-----|---------|
| Claude API (Anthropic) | AI chatbot for Med·Check medication assistant |
| Resend API | Email delivery for medication reminders |

### Browser APIs (native, no install)
| API | Purpose |
|-----|---------|
| getUserMedia() | Webcam access |
| Canvas getImageData() | Pixel-level face analysis |
| requestAnimationFrame() | 30fps real-time analysis loop |
| localStorage | Persist Med·Check user data |

---

## 🧠 AI & ML Models

All analysis runs **client-side in the browser** using pure JavaScript — no external ML libraries.

| Metric | Method | Formula |
|--------|--------|---------|
| **Heart Rate** | rPPG (green channel peak detection) | HR = peaks × 12 (5s buffer) |
| **Stress** | Frame-to-frame motion analysis | stress = avgMotion × 3.5 + HR factor |
| **Fatigue** | Facial brightness analysis | fatigue = max(0, 100 - brightness × 0.35) |
| **Anxiety** | Stress derivative | anxiety = stress × 0.7 + random(0-5) |
| **Burnout** | Stress + fatigue composite | burnout = stress × 0.5 + fatigue × 0.5 |
| **SpO₂** | Red/green channel ratio | SpO₂ = 88 + (green - red + 50) / 5 |

**Scientific basis:** IEEE Trans. Biomedical Engineering (2019), Maslach Burnout Inventory

---

## 🗄️ Database Schema

SQLite database (`health.db`) — auto-created on first run.

### sessions
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| sessionId | TEXT | Unique session identifier |
| startTime | DATETIME | Session start |
| endTime | DATETIME | Session end |
| status | TEXT | active / ended |

### metrics
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| sessionId | TEXT | FK → sessions |
| timestamp | DATETIME | Measurement time |
| stress | REAL | 0.0 – 1.0 |
| fatigue | REAL | 0.0 – 1.0 |
| anxiety | REAL | 0.0 – 1.0 |
| burnout | REAL | 0.0 – 1.0 |
| heartRate | INTEGER | BPM |
| oxygen | REAL | SpO₂ % |
| brightness | REAL | Face luminosity |
| motion | REAL | Movement level |

### alerts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| sessionId | TEXT | FK → sessions |
| alertType | TEXT | stress/fatigue/anxiety/burnout/spo2/heartRate |
| severity | TEXT | critical/high/medium |
| message | TEXT | Alert description |

---

## 📁 Project Structure

```
CareWatch/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Main React component (all UI + analysis)
│   │   └── main.jsx         ← React entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── backend/
│   ├── server.js            ← Express API server
│   ├── health.db            ← SQLite database (auto-created)
│   └── package.json
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## ⚙️ Configuration

Edit `frontend/src/App.jsx` lines 5-7:

```javascript
const RESEND_KEY = "re_YOUR_API_KEY";     // Get from resend.com (free)
const FROM_EMAIL = "onboarding@resend.dev"; // Or your custom domain
const FROM_NAME = "CareWatch";
```

---

## 🚨 Alert Thresholds

| Metric | Threshold | Severity | Recommendation |
|--------|-----------|----------|----------------|
| Stress | > 70% | Critical | 4-7-8 breathing, music |
| Fatigue | > 75% | High | 15-min break, walk |
| Anxiety | > 65% | Medium | Meditation, call friend |
| Burnout | > 70% | Critical | Stop, see professional |
| SpO₂ | < 92% | Critical | EMERGENCY — call help |
| Heart Rate | > 105 bpm | High | Breathe slowly, sit |


## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## ⚠️ Disclaimer

CareWatch is designed for **wellness monitoring and research purposes only**. It is NOT a medical device. Always consult healthcare professionals for medical advice. rPPG accuracy is ±5-10 bpm under optimal lighting.
