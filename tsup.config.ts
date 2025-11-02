import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: false,
    clean: true,
    target: 'es2022',
    outDir: 'dist',
    splitting: false,
    treeshake: true,
    minify: true,
    external: [],
    tsconfig: './tsconfig.json',
    onSuccess: 'echo "Build completed"',
  },
]);
