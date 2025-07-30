# Contributing to NuboDB

Thank you for your interest in contributing to NuboDB! This document provides guidelines and information for contributors.

## How to Contribute

We welcome contributions from the community! Here are the main ways you can contribute:

### Bug Reports

- **Check existing issues** first to avoid duplicates
- **Use the bug report template** when creating a new issue
- **Provide detailed information** including:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (OS, Node.js version, etc.)
  - Error messages and stack traces

### Feature Requests

- **Describe the feature** clearly and concisely
- **Explain the use case** and why it would be valuable
- **Consider implementation complexity** and impact
- **Check if it aligns** with NuboDB's goals and architecture

### Code Contributions

- **Fork the repository** and create a feature branch
- **Follow the coding standards** outlined below
- **Write tests** for new functionality
- **Update documentation** as needed
- **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Local Setup

```bash
# Clone the repository
git clone https://github.com/maybeizen/nubodb.git
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
pnpm build              # or npm run build

# Watch mode for development
pnpm dev                # or npm run dev

# Type checking
pnpm type-check         # or npm run type-check

# Linting
pnpm lint               # or npm run lint
pnpm lint:fix           # or npm run lint:fix (auto-fix issues)

# Code formatting
pnpm format             # or npm run format
pnpm format:check       # or npm run format:check

# Run individual examples
pnpm example:basic      # Basic usage example
pnpm example:query      # Query builder example
pnpm example:schema     # Schema validation example
pnpm example:modular    # Modular architecture example
pnpm example:encryption # Encryption example
pnpm example:performance # Performance benchmark

# Clean build artifacts
pnpm clean              # or npm run clean
```

**Note**: Currently, there are no test scripts configured. Contributors are encouraged to add testing infrastructure.

## Coding Standards

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

## Testing Guidelines

### Test Structure

**Note**: NuboDB currently lacks a formal testing framework. This is an excellent opportunity for contributors!

**Recommended testing setup** (to be implemented):

```typescript
// Example test structure using Jest/Vitest
import { createDatabase } from '../src';
import { NuboDB } from '../src/core/NuboDB';

describe('Database Operations', () => {
  let db: NuboDB;
  const testDbPath = './test-db-' + Date.now();

  beforeEach(async () => {
    db = await createDatabase({
      path: testDbPath,
      inMemory: true, // Use in-memory for faster tests
    });
    await db.open();
  });

  afterEach(async () => {
    await db.close();
    // Clean up test database files if not in-memory
  });

  it('should insert and retrieve a document', async () => {
    // Arrange
    const collection = db.collection('users');
    const userData = { name: 'John Doe', email: 'john@example.com' };

    // Act
    const insertResult = await collection.insert(userData);
    const foundUser = await collection.findById(insertResult.insertedId);

    // Assert
    expect(foundUser).toBeTruthy();
    expect(foundUser?.name).toBe('John Doe');
    expect(foundUser?._id).toBe(insertResult.insertedId);
  });
});
```

### Testing Best Practices

**Current Status**: Testing infrastructure needs to be established. Priorities for testing setup:

1. **Choose a testing framework** (Jest, Vitest, or Node.js built-in test runner)
2. **Set up test scripts** in package.json
3. **Create test utilities** for database setup/teardown
4. **Add CI/CD integration** for automated testing

**When implementing tests, follow these guidelines**:

- **Test one behavior** per test case
- **Use descriptive test names** that explain the scenario and expected outcome
- **Follow Arrange-Act-Assert** pattern for clarity
- **Test edge cases** and error conditions (invalid inputs, network failures, etc.)
- **Use in-memory databases** for faster test execution
- **Clean up test data** after each test to prevent interference
- **Test concurrency scenarios** for multi-user database operations

### Test Coverage Goals

- **Core functionality**: 95%+ coverage for database operations
- **Public APIs**: 100% coverage for all exported functions and classes
- **Error handling**: Test all error paths and exception scenarios
- **Performance**: Benchmark tests for critical operations
- **Integration**: End-to-end tests for complete workflows

**Priority testing areas**:

1. CRUD operations (insert, find, update, delete)
2. Query builder functionality
3. Schema validation
4. Encryption/decryption
5. File storage operations
6. Error handling and edge cases

## Documentation Standards

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

## Pull Request Process

### Before Submitting

1. **Run type checking**: `pnpm type-check` must pass without errors
2. **Check code style**: `pnpm lint` and `pnpm format:check` must pass
3. **Test manually**: Run relevant examples to verify functionality
4. **Update documentation** if APIs changed
5. **Add tests** for new functionality (when testing framework is available)
6. **Rebase on main** to avoid merge conflicts
7. **Verify build**: `pnpm build` must succeed

**Manual Testing Checklist**:

- Run affected examples in `/examples` folder
- Test with different database configurations (encrypted/unencrypted)
- Verify backward compatibility with existing APIs
- Test error scenarios and edge cases

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

1. **Automated checks** must pass:
   - TypeScript compilation (`pnpm type-check`)
   - Code linting (`pnpm lint`)
   - Code formatting (`pnpm format:check`)
   - Successful build (`pnpm build`)

2. **Manual verification**:
   - Examples run successfully
   - No breaking changes (unless intentional)
   - Documentation is accurate and up-to-date

3. **Code review** by maintainers:
   - Architecture and design review
   - Code quality and maintainability
   - Performance implications
   - Security considerations

4. **Address feedback** and make requested changes
5. **Maintainer approval** required for merge

**Note**: Once testing infrastructure is established, automated test execution will be added to this process.

## Architecture Guidelines

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

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Checklist

- [ ] All automated checks passing (type-check, lint, build)
- [ ] All examples tested and working
- [ ] Documentation updated (README, API docs, CHANGELOG)
- [ ] Version bumped in package.json
- [ ] Release notes written with:
  - New features
  - Bug fixes
  - Breaking changes (if any)
  - Migration guide (if needed)
- [ ] Examples updated for new features
- [ ] Performance benchmarks run (if applicable)
- [ ] Security review completed (for encryption/storage changes)

## Getting Help

### Communication Channels

- **GitHub Issues** - for bugs and feature requests
- **GitHub Discussions** - for questions and ideas
- **Pull Requests** - for code contributions

### Resources

- **API Documentation** - see `/docs` folder
- **Examples** - see `/examples` folder
- **TypeScript Config** - see `tsconfig.json`
- **Build Config** - see `tsup.config.ts`

## Contributor License Agreement

By contributing to NuboDB, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Recognition

Contributors will be recognized in:

- **README.md** - for significant contributions
- **GitHub Contributors** - automatically tracked

---

Thank you for contributing to NuboDB! Your help makes this project better for everyone.
