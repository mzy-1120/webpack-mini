const SingleEntryPlugin = require("./SingleEntryPlugin")


/**
 * 创建 SingleEntryPlugin 实例
 * 1、itemToPlugin 作为工厂函数
 * 2、通过实例化 SingleEntryPlugin 创建插件实例（）
 */
const itemToPlugin = function (context, item, name) {
  return new SingleEntryPlugin(context, item, name)
}

// 入口分析
class EntryOptionPlugin {
  apply(compiler) {
    // 注册 entryOption 方法
    compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {

      // 单入口
      // 1、注册 make 方法
      // 2、调用 compilation.addEntry 方法
      itemToPlugin(context, entry, "main").apply(compiler)
    })
  }
}

module.exports = EntryOptionPlugin
