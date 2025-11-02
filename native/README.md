# Native Go Integration

This project includes Go implementations of core performance-critical operations for accelerated query processing.

## Structure

- `native/go/` - Go source code
  - `filter.go` - Parallel document filtering with goroutines
  - `index.go` - Index resolution and candidate ID lookup
  - `utils.go` - Memory management utilities
  - `main.go` - Entry point
  - `go.mod` - Go module definition

- `native/bindings/` - TypeScript bindings
  - `index.ts` - FFI wrapper for Go library

- `native/lib/` - Compiled shared libraries (generated)
  - `nubodb-native.so` (Linux)
  - `nubodb-native.dylib` (macOS)
  - `nubodb-native.dll` (Windows)

## Building

Run `npm run build` or `node build.js` to build both Go and TypeScript:

1. Builds Go shared library (`native/lib/nubodb-native.{so,dylib,dll}`)
2. Builds TypeScript (`dist/`)

If Go is not installed, the build will continue with TypeScript-only (fallback mode).

## Features

### QueryFilterEngine (Go)

- Parallel filtering using goroutines (8 workers by default)
- Cached regex compilation
- Optimized comparison operators
- Memory-efficient early termination

### IndexQueryResolver (Go)

- Concurrent index lookups
- Cached sorted entries for range queries
- Efficient set intersection operations
- Thread-safe index metadata management

## Performance

The Go implementation provides:

- 2-5x faster document filtering on large datasets
- Parallel processing across CPU cores
- Reduced memory allocations
- Faster index resolution

## Fallback

If the native library is not available, the TypeScript implementation is used automatically. No code changes needed.
