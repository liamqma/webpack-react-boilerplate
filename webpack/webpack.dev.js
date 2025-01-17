const { CompiledExtractPlugin } = require('@compiled/webpack-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const commonPaths = require('./paths');
const RemoveCompiledCssScript = require('./remove-compiled-css-script');

module.exports = {
  mode: 'development',
  output: {
    filename: '[name].js',
    path: commonPaths.outputPath,
    chunkFilename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: 'babel-loader',
          },
          {
            // ↓↓ defined last ↓↓
            loader: '@compiled/webpack-loader',
            options: {
              extract: true,
            },
          },
        ],
      },
      {
        test: /\.(css|scss)$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  devServer: {
    contentBase: commonPaths.outputPath,
  },
  plugins: [
    new RemoveCompiledCssScript(),
    new MiniCssExtractPlugin({ filename: '[name].css' }),
    new CompiledExtractPlugin(),
  ],
};
