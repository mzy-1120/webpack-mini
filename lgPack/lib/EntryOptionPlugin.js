const SingleEntryPlugin = require("./SingleEntryPlugin")

const itemToPlugin = function (context, item, name) {
  return new SingleEntryPlugin(context, item, name)
}

class EntryOptionPlugin {
  apply(compiler) {
    // 注册 entryOption 函数
    compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {

      // 单入口
      // 1、注册 make 方法
      // 2、调用 addEntry 方法
      itemToPlugin(context, entry, "main").apply(compiler)
    })
  }
}

module.exports = EntryOptionPlugin
