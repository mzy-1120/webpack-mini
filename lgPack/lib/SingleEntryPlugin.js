
// 处理单文件入口
class SingleEntryPlugin {
  constructor(context, entry, name) {
    this.context = context
    this.entry = entry
    this.name = name
  }

  apply(compiler) {
    // 注册 make 方法
    compiler.hooks.make.tapAsync('SingleEntryPlugin', (compilation, callback) => {
      const { context, entry, name } = this
      console.log("make 钩子监听执行了~~~~~~")

      // 调用 addEntry 方法
      compilation.addEntry(context, entry, name, callback)
    })
  }
}

module.exports = SingleEntryPlugin
