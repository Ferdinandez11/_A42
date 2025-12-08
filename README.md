# 🏗️ A42 - Advanced 3D Fence Configurator

> Professional fence design and budgeting system with real-time 3D visualization

[![CI/CD Pipeline](https://github.com/Ferdinandez11/_A42/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Ferdinandez11/_A42/actions/workflows/ci-cd.yml)
[![Tests](https://img.shields.io/badge/tests-136%20passing-success)](https://github.com/Ferdinandez11/_A42)
[![Coverage](https://img.shields.io/badge/coverage-58%25-yellow)](https://github.com/Ferdinandez11/_A42)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Private-red)](LICENSE)

---

## ✨ Features

- 🎨 **3D Fence Designer** - Interactive 3D editor with real-time preview
- 💰 **Automatic Budgeting** - Price calculation with material breakdown
- 👥 **CRM System** - Complete client and order management
- 📊 **Admin Dashboard** - Order tracking, status updates, and reporting
- 🔐 **Role-based Access** - Client, Employee, and Admin roles
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔔 **Real-time Notifications** - Toast notifications for all operations
- 📄 **PDF Generation** - Automatic quote and invoice generation

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

## 🧪 Testing

```bash
npm run test              # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:coverage     # Generate coverage report
npm run type-check        # TypeScript validation
```

**Current Stats:**
- ✅ 136 tests passing
- ✅ 58% code coverage
- ✅ 0 TypeScript errors
- ✅ CI/CD automated

---

## 🏗️ Tech Stack

**Frontend:** React 18 + TypeScript + Vite + Three.js + Zustand + Tailwind CSS

**Backend:** Supabase (PostgreSQL + Auth + Storage)

**Testing:** Vitest + Testing Library (136 tests, 58% coverage)

**CI/CD:** GitHub Actions + Husky pre-commit hooks

---

## 📊 Test Coverage

| Category | Coverage |
|----------|----------|
| Utils | 85.30% ⭐⭐⭐⭐⭐ |
| Lib | 88.70% ⭐⭐⭐⭐⭐ |
| Stores | 72.15% ⭐⭐⭐⭐ |
| Hooks | 45.30% ⭐⭐ |
| Components | 28.40% ⭐⭐ |
| Features | 8.20% ⭐ |

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

## 🚢 CI/CD Pipeline

Every push to `main`:
1. ✅ Run 136 tests
2. ✅ TypeScript check
3. ✅ ESLint validation
4. ✅ Build application
5. ✅ Coverage check (55%+)

---

## 📝 Project Status

```
Tests: 136 passing ✅
Coverage: 58% ✅
TypeScript: 0 errors ✅
Build: Success ✅
CI/CD: Automated ✅

Progress: 8.5/10
Status: Production-ready
```

---

## 🗺️ Roadmap

**Completed (Sprint 1-4):**
- [x] Testing infrastructure (136 tests)
- [x] Error handling system
- [x] CI/CD pipeline
- [x] Pre-commit hooks

**Next (Sprint 5-10):**
- [ ] Increase coverage to 80%+
- [ ] Performance optimization
- [ ] E2E tests
- [ ] Accessibility improvements

---

## 📄 License

Private and proprietary.

---

**Made with ❤️ by Fernando**