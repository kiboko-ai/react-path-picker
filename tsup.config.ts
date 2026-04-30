import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  splitting: false,
  external: ['react'],
  target: 'es2020',
});
