/* eslint-disable no-restricted-syntax */
const { RawSource, SourceMapSource, ConcatSource } = require('webpack-sources');

const PLUGIN_NAME = 'RemoveCompiledCssScriptPlugin';

const importPattern = /__webpack_require__\([^;,]+\);/g;

const compiledPath =
  '@compiled/webpack-loader/css-loader!@compiled/webpack-loader/css-loader/compiled-css.css?style=';

function processSource(originalSource, compiledModuleIds) {
  if (compiledModuleIds.size === 0) return null;

  let newSource = originalSource;

  const matches = originalSource.matchAll(importPattern);
  for (const match of matches) {
    const requireExpression = match[0];
    if (requireExpression.includes(compiledPath)) {
      newSource = newSource.replace(requireExpression, '');
    }
  }

  compiledModuleIds.forEach(moduleId => {
    newSource = newSource.replace(`__webpack_require__(${moduleId})`, '');
  });

  // nothing has changed
  if (newSource === originalSource) {
    return null;
  }
  return newSource;
}

module.exports = class RemoveCompiledCssScriptPlugin {
  constructor(options) {
    this.options = { ...options };
    this.toIgnore = [];
    this.compiledModuleIds = new Set();
  }

  collectCompiledModuleIds(modules) {
    for (const module of modules) {
      if (
        typeof module.rawRequest === 'string' &&
        module.rawRequest.startsWith(compiledPath)
      ) {
        this.compiledModuleIds.add(module.id);
      }
    }
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
      compilation.hooks.afterOptimizeModuleIds.tap(
        PLUGIN_NAME,
        this.collectCompiledModuleIds.bind(this)
      );

      compilation.moduleTemplates.javascript.hooks.package.tap(
        PLUGIN_NAME,
        (moduleSource, module) => {
          const original = {
            source: moduleSource.source(),
            map:
              typeof moduleSource.map === 'function'
                ? moduleSource.map()
                : null,
          };
          const newSource = processSource(
            original.source,
            this.compiledModuleIds
          );

          if (newSource === null) {
            return moduleSource;
          }

          return original.map
            ? new SourceMapSource(
                newSource,
                module.id,
                original.map,
                original.source,
                original.map
              )
            : new RawSource(newSource);
        }
      );
      compilation.hooks.optimizeChunkAssets.tap(PLUGIN_NAME, chunks => {
        // append (window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{}]); to main
        // find the asset to delete
        let toUpdateAssetName;

        for (const chunk of chunks) {
          if (chunk.name === 'main' && chunk.files.length) {
            [toUpdateAssetName] = chunk.files;
          }
        }

        // Bail early if jira-spa.js cannot be found
        if (!toUpdateAssetName) {
          return;
        }

        debugger;

        for (const chunk of chunks) {
          if (
            chunk.chunkReason &&
            /split chunk.*(compiledCSS)/.test(chunk.chunkReason)
          ) {
            const jsFile = chunk.files.find(f => /\.js$/.test(f));
            chunk.files = chunk.files.filter(f => !/\.js/.test(f));
            compilation.updateAsset(toUpdateAssetName, oldSource => {
              this.toIgnore.push(jsFile);
              // source map?
              return new ConcatSource(
                oldSource,
                `\n\n(window["webpackJsonp"] = window["webpackJsonp"] || []).push([['compiled-css'],{}]);\n\n`
              );
            });
          }
        }
      });
    });
    compiler.hooks.emit.tap(PLUGIN_NAME, compilation => {
      // delete the asset
      this.toIgnore.forEach(file => {
        delete compilation.assets[file];
        delete compilation.assets[`${file}.map`];
      });
    });
  }
};
