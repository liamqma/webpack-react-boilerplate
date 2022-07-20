/* eslint-disable no-param-reassign, no-underscore-dangle */
/*
    Using webpack 4 with mini-css-extract-plugin, it will generate an empty JS file.
    This empty JS file costs us additional network connection.
    This problem has been fixed[https://github.com/webpack/webpack/commit/c5f94f3b6a79a88da9ed93b5f980830f496f4fad] in webpack 5.
    But webpack's maintainer don't want to fix it in webpack 4.
    This Webpack Plugin is created to remove the JS file.
*/

const pluginName = 'RemoveCompiledCssScriptPlugin';
const path = require('path');

const CSS_MODULE_TYPE = 'css/mini-extract';

module.exports = class RemoveCompiledCssScriptPlugin {
  constructor() {
    this.problemChunkInfos = [];
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      compilation.hooks.beforeChunkAssets.tap(pluginName, () => {
        // find `compiledCss` chunks. The chunkReason must match cacheGroup.compiledCss from
        // https://github.com/atlassian-labs/compiled/blob/master/packages/webpack-loader/src/extract-plugin.ts#L40
        const splitChunks = compilation.chunks.filter(
          thisChunk =>
            thisChunk.chunkReason &&
            /split chunk.*(compiledCSS)/.test(thisChunk.chunkReason)
        );

        splitChunks.forEach(splitChunk => {
          // store the empty modules
          const uselessModules = [];

          Array.from(splitChunk.modulesIterable).forEach(mod => {
            if (
              mod.type !== CSS_MODULE_TYPE &&
              mod._source &&
              // https://github.com/webpack-contrib/mini-css-extract-plugin/blob/b426f04961846991e8ca671c6a4d48e6a83a46c2/src/loader.js#L244
              // looking at the source code of mini-css-extract-plugin, assume that the empty module starts with
              // "// extracted by mini-css-extract-plugin"
              mod._source._value.startsWith(
                '// extracted by mini-css-extract-plugin'
              )
            ) {
              uselessModules.push(mod);
            }
          });

          // move the uselessModules to the originated chunk
          uselessModules.forEach(uselessModule => {
            uselessModule.reasons.forEach(reason => {
              reason.module.chunksIterable.forEach(previouslyConnectedChunk => {
                splitChunk.moveModule(uselessModule, previouslyConnectedChunk);
              });
            });
          });

          // store the chunk id so we can delete the .js file later
          this.problemChunkInfos.push(splitChunk.id);

          // remove the chunk from chunk group
          splitChunk.groupsIterable.forEach(group => {
            group.removeChunk(splitChunk);
          });
        });
      });

      compilation.hooks.additionalChunkAssets.tap(pluginName, chunks => {
        chunks.forEach(chunk => {
          if (this.problemChunkInfos.includes(chunk.id)) {
            chunk.files.forEach(file => {
              if (path.extname(file) === '.js') {
                // delete compiled-css.js
                chunk.files.pop();
                delete compilation.assets[file];
              }
            });
          }
        });
      });
    });
  }
};
