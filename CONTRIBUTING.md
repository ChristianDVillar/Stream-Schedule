# Contributing to Streamer Scheduler Web

Thank you for your interest in contributing to Streamer Scheduler Web! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Redis
- Git

### Development Setup
1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Stream-Schedule.git
   cd Stream-Schedule
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

4. **Set up environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm start
   ```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Git Workflow
1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear commit messages
   - Keep commits focused and atomic

3. **Test your changes**
   ```bash
   # Backend tests
   cd backend && npm test
   
   # Frontend tests
   cd frontend && npm test
   ```

4. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Guidelines
- **Title**: Clear and descriptive
- **Description**: Explain what and why, not how
- **Tests**: Include tests for new features
- **Documentation**: Update docs if needed
- **Screenshots**: For UI changes

## 🐛 Bug Reports

When reporting bugs, please include:
- **Environment**: OS, browser, version
- **Steps to reproduce**: Clear, numbered steps
- **Expected vs actual behavior**
- **Screenshots or logs** if applicable

## 💡 Feature Requests

When suggesting features:
- **Problem**: What problem does this solve?
- **Solution**: How should it work?
- **Alternatives**: What else have you considered?

## 🔧 Development Tools

### Backend Development
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose
- **Queue**: Bull with Redis
- **Testing**: Jest

### Frontend Development
- **Framework**: React with TypeScript
- **UI Library**: Material-UI
- **State Management**: React Context
- **Testing**: React Testing Library

## 📚 Documentation

- **README.md**: Project overview and setup
- **docs/**: Detailed documentation
- **CODE_OPTIMIZATION_SUMMARY.md**: Recent optimizations
- **API Documentation**: In-code JSDoc comments

## 🤝 Community

- **Issues**: Use GitHub Issues for bugs and features
- **Discussions**: Use GitHub Discussions for questions
- **Code of Conduct**: Be respectful and inclusive

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Streamer Scheduler Web! 🎉 