const Compiler = require('./Compiler')
const NodeEnvironmentPlugin = require('./node/NodeEnvironmentPlugin')
const WebpackOptionsApply = require('./WebpackOptionsApply')

const webpack = function (options) {
  /**
   * 01 创建 Compiler 对象实例
   * 1、参数 options.context 代表 webpack.config.js 所在绝对路径
   * 2、返回实例化对象
   *    1.1 options.hooks：挂载 hoos 函数
   *    1.2 提供 run、_compile、_emitAssets...等方法，调度编译的主要过程
   */
  let compiler = new Compiler(options.context)
  // 挂载 options
  compiler.options = options


  /**
   * 02 在 compiler 实例上扩展功能
   * 1、inputFileSystem 读取文件
   * 2、outputFileSystem 写入文件
   */
  new NodeEnvironmentPlugin().apply(compiler)


  /**
   * 03 扩展外部插件
   * 1、遍历 options.plugins
   * 2、调用插件的 apply 方法，传入 compiler 挂载
   */
  if (options.plugins && Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      // 通过 plugins 传入的插件，接受 compiler
      plugin.apply(compiler)
    }
  }

  /**
   * 04 从入口开始编译
   * 1、入口分析
   * 2、compiler.hooks 上挂载 entryOption、make 钩子函数
   * 3、将 compiler 与 compilation 链接起来
   */
  new WebpackOptionsApply().process(options, compiler);


  // 05 返回 compiler 对象
  return compiler
}

module.exports = webpack