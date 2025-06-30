# Contributing to NuboDB

Thank you for your interest in contributing to NuboDB! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

We welcome contributions from the community! Here are the main ways you can contribute:

### 🐛 Bug Reports

- **Check existing issues** first to avoid duplicates
- **Use the bug report template** when creating a new issue
- **Provide detailed information** including:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (OS, Node.js version, etc.)
  - Error messages and stack traces

### 💡 Feature Requests

- **Describe the feature** clearly and concisely
- **Explain the use case** and why it would be valuable
- **Consider implementation complexity** and impact
- **Check if it aligns** with NuboDB's goals and architecture

### 🔧 Code Contributions

- **Fork the repository** and create a feature branch
- **Follow the coding standards** outlined below
- **Write tests** for new functionality
- **Update documentation** as needed
- **Submit a pull request** with a clear description

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Local Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/nubodb.git
cd nubodb

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Run examples
node examples/basic-usage.js
```

### Development Scripts

```bash
# Build TypeScript
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Run examples
pnpm examples
```

## 📝 Coding Standards

### TypeScript Guidelines

- **Use TypeScript** for all new code
- **Strict mode** - enable all TypeScript strict checks
- **Type everything** - avoid `any` types when possible
- **Use interfaces** for object shapes
- **Generic types** for reusable components
- **JSDoc comments** for public APIs

### Code Style

- **Prettier** for code formatting
- **ESLint** for code quality
- **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** required
- **Trailing commas** in objects and arrays

### File Organization

```
src/
├── core/           # Core database functionality
├── encryption/     # Encryption features
├── errors/         # Error classes
├── storage/        # Storage implementations
├── utils/          # Utility functions
└── index.ts        # Main exports
```

### Naming Conventions

- **PascalCase** for classes and interfaces
- **camelCase** for variables and functions
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names
- **Descriptive names** that explain purpose

## 🧪 Testing Guidelines

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', async () => {
    // Arrange
    const db = await createDatabase({ path: './test-db' });

    // Act
    const result = await db.collection('test').insert({ test: true });

    // Assert
    expect(result.document.test).toBe(true);
  });
});
```

### Testing Best Practices

- **Test one thing** per test case
- **Use descriptive test names** that explain the scenario
- **Arrange-Act-Assert** pattern
- **Test edge cases** and error conditions
- **Mock external dependencies** when appropriate
- **Clean up test data** after each test

### Test Coverage

- **Aim for 90%+ coverage** for new features
- **Test public APIs** thoroughly
- **Test error handling** paths
- **Test performance** for critical operations

## 📚 Documentation Standards

### Code Documentation

````typescript
/**
 * Creates a new database instance with the specified options.
 *
 * @param options - Database configuration options
 * @param options.path - Path to the database directory
 * @param options.encrypt - Whether to enable encryption
 * @returns Promise that resolves to a database instance
 *
 * @example
 * ```typescript
 * const db = await createDatabase({
 *   path: './my-db',
 *   encrypt: true
 * });
 * ```
 */
export async function createDatabase(
  options: DatabaseOptions
): Promise<Database>;
````

### README Updates

- **Update examples** when APIs change
- **Add new features** to the feature list
- **Update configuration** options
- **Include code examples** for new functionality

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure tests pass** locally
2. **Update documentation** if needed
3. **Add tests** for new functionality
4. **Check code style** with linting
5. **Rebase on main** to avoid conflicts

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Manual testing completed

## Documentation

- [ ] README updated
- [ ] API docs updated
- [ ] Examples updated

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No console.log statements left
```

### Review Process

1. **Automated checks** must pass (tests, linting, type checking)
2. **Code review** by maintainers
3. **Address feedback** and make requested changes
4. **Maintainer approval** required for merge

## 🏗️ Architecture Guidelines

### Modular Design

- **Single Responsibility** - each class/module has one purpose
- **Composition over Inheritance** - prefer composition patterns
- **Dependency Injection** - inject dependencies rather than creating them
- **Interface Segregation** - keep interfaces focused and small

### Performance Considerations

- **Async operations** for I/O operations
- **Caching** for frequently accessed data
- **Batch operations** for bulk data processing
- **Memory management** - avoid memory leaks
- **Indexing** for query performance

### Security Guidelines

- **Input validation** for all user inputs
- **Encryption** for sensitive data
- **Error handling** without exposing internals
- **Access control** where appropriate

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes written
- [ ] Examples tested

## 🆘 Getting Help

### Communication Channels

- **GitHub Issues** - for bugs and feature requests
- **GitHub Discussions** - for questions and ideas
- **Pull Requests** - for code contributions

### Resources

- **API Documentation** - see `/docs` folder
- **Examples** - see `/examples` folder
- **TypeScript Config** - see `tsconfig.json`
- **Build Config** - see `tsup.config.ts`

## 📋 Contributor License Agreement

By contributing to NuboDB, you agree that your contributions will be licensed under the same license as the project (MIT License).

## 🙏 Recognition

Contributors will be recognized in:

- **README.md** - for significant contributions
- **CHANGELOG.md** - for all contributions
- **GitHub Contributors** - automatically tracked

---

Thank you for contributing to NuboDB! Your help makes this project better for everyone. 🚀
