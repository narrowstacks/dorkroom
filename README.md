# Dorkroom

> Skip the math. Make prints.

**Dorkroom** is a collection of specialized calculators and tools designed for analog photographers and darkroom enthusiasts. Built to keep complex exposure math, border calculations, and chemistry planning out of your way so you can focus on making beautiful prints.

![Darkroom Theme](https://img.shields.io/badge/theme-darkroom-8B5CF6) ![React 19](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.13-06B6D4)

## 🎯 What is Dorkroom?

Dorkroom provides essential calculators for film photography and darkroom work:

### 🖼️ **Printing Tools**
- **Border Calculator** - Calculate precise print borders with trim-safe guides
- **Resize Calculator** - Scale prints without endless test strips
- **Stops Calculator** - Translate exposure stops into seconds

### 📸 **Shooting Tools**
- **Exposure Calculator** - Balance aperture, shutter, and ISO on location
- **Reciprocity Calculator** - Correct for long exposure failure
- **Development Recipes** - Film + chemistry pairings with proven results

Built for darkroom obsessives who want fast, reliable calculations without the complexity.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Development

```bash
# Clone the repository
git clone https://github.com/your-username/dorkroom-nx.git
cd dorkroom-nx

# Install dependencies
npm install

# Start development server
npx nx dev dorkroom -- --host=0.0.0.0

# Open http://localhost:4200
```

### Building

```bash
# Build for production
npx nx build dorkroom

# Build all packages
npx nx build
```

### Testing

```bash
# Run tests
npx nx test

# Run tests with UI
npx nx test --ui
```

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4.1.13 with custom darkroom theme
- **Build Tool**: Vite with Nx workspace
- **Testing**: Vitest with Testing Library
- **Monorepo**: Nx with shared packages

## 📁 Architecture

```
apps/
  dorkroom/           # Main React application
packages/
  ui/                 # Shared UI components (@dorkroom/ui)
  logic/              # Business logic (@dorkroom/logic)
  api/                # API utilities (@dorkroom/api)
```

## 🎨 Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Custom darkroom-inspired UI optimized for low light
- **Fast Calculations** - Instant results without page reloads
- **Offline Ready** - Works without internet connection
- **Open Source** - Community-driven development

## 🤝 Contributing

We welcome contributions from the analog photography community!

- **GitHub**: [https://github.com/dorkroom](https://github.com/dorkroom)
- **Issues**: Report bugs or request features
- **Pull Requests**: Submit improvements and new calculators

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-calculator`
3. Make your changes and test thoroughly
4. Run linting and type checking:
   ```bash
   npx nx lint
   npx nx typecheck
   npx prettier --write .
   ```
5. Submit a pull request

## 📝 Code Quality

This project maintains high code quality standards:

```bash
# Lint code
npx nx lint

# Type checking
npx nx typecheck

# Format code
npx prettier --write .
```

## 🔍 Project Commands

| Command | Description |
|---------|-------------|
| `npx nx dev dorkroom -- --host=0.0.0.0` | Start development server |
| `npx nx build dorkroom` | Build production bundle |
| `npx nx test` | Run tests |
| `npx nx lint` | Run ESLint |
| `npx nx typecheck` | TypeScript checking |
| `npx nx graph` | Visualize project dependencies |

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means you can:
- ✅ Use the software for any purpose
- ✅ Study and modify the source code
- ✅ Distribute copies and modifications

**However**, if you distribute or provide this software as a service, you must:
- 📖 Make your source code available under AGPL-3.0
- 🔄 Share any modifications you make

For commercial licensing options that don't require open sourcing your modifications, please contact us.

See the [LICENSE](LICENSE) file for full details.

## 🙏 Support

If you find Dorkroom useful for your darkroom work:

- ⭐ Star the project on GitHub
- 🐛 Report bugs and suggest features
- 🔗 Share with fellow analog photographers
- ☕ Support development on Ko-fi

---

**Made with ❤️ for the analog photography community**