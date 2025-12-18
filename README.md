# 🏗️ A42 - Advanced 3D Fence Configurator

> Professional fence design and budgeting system with real-time 3D visualization

[![CI/CD Pipeline](https://github.com/Ferdinandez11/_A42/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Ferdinandez11/_A42/actions/workflows/ci-cd.yml)
[![Tests](https://img.shields.io/badge/tests-499%20passing-success)](https://github.com/Ferdinandez11/_A42)
[![Coverage](https://img.shields.io/badge/coverage-54%25-yellow)](https://github.com/Ferdinandez11/_A42)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Private-red)](LICENSE)

---

## ✨ Features

- 🎨 **3D Fence Designer** - Interactive 3D editor with real-time preview
- 🕶️ **AR Mode (WebXR)** - AR session support with transparent background
- 💰 **Automatic Budgeting** - Price calculation with material breakdown
- 👥 **CRM System** - Client + budgets + orders management
- 📊 **Admin Dashboard** - Tracking, status updates, calendar, reporting
- 🔐 **Role-based Access** - Client, Employee, and Admin roles (Supabase)
- 📄 **PDF Generation** - Quote PDF generation and attachments delivery

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/Ferdinandez11/_A42.git
cd _A42

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run development server
npm run dev
```

Visit `http://localhost:5173`

---

## 🧪 Testing & Coverage

```bash
npm run test              # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:coverage     # Generate coverage report
npm run type-check        # TypeScript validation
```

**Current Stats (local run):**
- ✅ **499 tests passing**
- ⏭️ **10 tests skipped**
- ✅ **0 failing tests**
- ✅ **Coverage (Lines): 53.74%** (v8)

> Coverage HTML report: `coverage/index.html`

---

## 🏗️ Tech Stack

**Frontend:** React 19 + TypeScript + Vite + Three.js + Zustand + Tailwind CSS

**Backend:** Supabase (PostgreSQL + Auth + Storage)

**Testing:** Vitest + Testing Library

**CI/CD:** GitHub Actions + Husky pre-commit hooks

---

## 🔧 Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |

### Commit Convention

```bash
feat: add new feature
fix: correct bug
docs: update documentation
test: add tests
chore: maintenance tasks
```

**Pre-commit hooks:**
- ✅ ESLint on changed files
- ✅ Commit message validation

---

## 📄 License

Private and proprietary.
