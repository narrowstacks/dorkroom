# Dorkroom Project Overview

## Purpose
Dorkroom is an Nx workspace containing a React application and supporting libraries. The main application is a React app built with Vite, using modern React 19, TypeScript, and Tailwind CSS.

## Tech Stack
- **Framework**: React 19 with TypeScript
- **Build System**: Nx workspace with Vite
- **Styling**: Tailwind CSS with PostCSS
- **Routing**: React Router DOM
- **Testing**: Vitest with Testing Library
- **Linting**: ESLint with Nx-specific rules
- **Formatting**: Prettier with single quotes

## Architecture
This is an Nx monorepo with the following structure:

### Apps
- `apps/dorkroom`: Main React application with Vite bundling

### Packages
- `packages/ui`: Shared UI component library with React components and utilities
- `packages/logic`: Business logic package

### Legacy Code
- `original-*` directories contain legacy code that appears to be in migration process

## Key Dependencies
- React 19.0.0
- React Router DOM 6.29.0
- Tailwind CSS 4.1.13
- Lucide React (icons)
- clsx and tailwind-merge (utility libraries)