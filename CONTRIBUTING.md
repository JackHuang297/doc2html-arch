# Contributing to doc2html-arch

Thank you for your interest in contributing!

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/<your-fork>/doc2html-arch.git
cd doc2html-arch

# Install dependencies
npm install

# Start development (watch mode)
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

---

## Workflow

### 1. Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/xlsx-converter` |
| Bug fix | `fix/<short-description>` | `fix/pdf-crash-on-empty` |
| Chore | `chore/<short-description>` | `chore/update-dependencies` |
| Docs | `docs/<short-description>` | `docs/add-api-examples` |
| Refactor | `refactor/<short-description>` | `refactor/logger-async` |

### 2. Making changes

```bash
git checkout -b feat/my-new-feature
# make changes...
npm test # always pass before committing
git commit -m "feat(xlsx): add spreadsheet-to-HTML converter"
```

### 3. Commit message format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```
feat(xlsx): add XLSX to HTML table converter
fix(pdf): prevent crash on zero-length PDF
docs(api): add WebSocket usage example
chore(deps): update xlsx to ^0.19.0
```

### 4. Pull Request

- Fill out the PR template
- Reference any related issue: `Closes #123`
- Ensure CI passes
- Request review from a maintainer

---

## Code Style

- **TypeScript strict mode** — avoid `any`
- **Prettier** for formatting (run `npm run format`)
- **ESLint** for linting (run `npm run lint`)
- Add tests for new converters and utilities
- Keep functions small and single-purpose

---

## Adding a New Converter

1. Create `src/converters/<name>.converter.ts`
2. Implement `IAsyncConverter` (binary) or `IConverter` (text)
3. Register in `converter.factory.ts`:
   ```typescript
   this.registerAsync('myformat', new MyConverter());
   this.extMap.set('ext', 'myformat');
   this.mimeMap.set('application/x-myformat', 'myformat');
   ```
4. Add MIME type to `security.validator.ts`
5. Add tests: `src/converters/<name>.converter.test.ts`
6. Update `FEATURES.md` with usage example

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx jest src/converters/xlsx.converter.test.ts

# Coverage report
npx jest --coverage
```

Coverage requirements: **≥ 70%** branches, functions, lines, statements.

---

## Docker

```bash
# Build image locally
docker build -t doc2html-arch:local .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Questions?

Open an issue at https://github.com/<owner>/doc2html-arch/issues