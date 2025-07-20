const esbuild = require('esbuild');
const path = require('path');
const { name } = require('./package.json');
const { execSync } = require('child_process');

const outputDir = 'dist';
const entryFile = 'src/index.ts';
const outputFile = path.join(outputDir, 'index.js');
const outputWasm = path.join(outputDir, `${name}.tlsn.wasm`);

async function build() {
  try {
    await esbuild.build({
      entryPoints: [entryFile],
      bundle: true,
      outdir: outputDir, // Use outdir for directory output
      sourcemap: true,
      minify: false, // might want to use true for production build
      format: 'cjs', // needs to be CJS for now
      target: ['es2020'], // don't go over es2020 because quickjs doesn't support it
      loader: {'.png': 'dataurl'}
    });

    console.log('esbuild completed successfully.');

    // Run extism-js to generate the wasm file
    const extismCommand = `extism-js ${outputFile} -i src/index.d.ts -o ${outputWasm}`;
    execSync(extismCommand, { stdio: 'inherit' });
    console.log('extism-js completed successfully.');
  } catch (error) {
    console.error('Build process failed:', error);
    process.exit(1);
  }
}

build();