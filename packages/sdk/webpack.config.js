const path = require('path')

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'litebase-sdk.umd.js',
    library: {
      name: 'LitebaseSDK',
      type: 'umd',
    },
    globalObject: 'this',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
}