const Compiler = require('./Compiler')
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin')
const WebpackOptionsApply = require('./WebpackOptionsApply')

const webpack = function (options) {
  // 01 创建 Compiler 对象
  let compiler = new Compiler(options.context)
  // 挂载 options
  compiler.options = options


  // 02 扩展读写功能
  new NodeEnvironmentPlugin().apply(compiler)


  // 03 扩展自定义插件
  if (options.plugins && Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      plugin.apply(compiler)
    }
  }


  // 04 开始编译
  new WebpackOptionsApply().process(options, compiler);


  // 05 返回 compiler 对象
  return compiler
}

module.exports = webpack