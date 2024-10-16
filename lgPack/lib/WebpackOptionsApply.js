const EntryOptionPlugin = require("./EntryOptionPlugin")


class WebpackOptionsApply {
  process(options, compiler) {
    // 入口分析
    // 1、注册 entryOption 函数
    // 2、entryOption 方法内利用 SingleEntryPlugin 中方分析单入口
    new EntryOptionPlugin().apply(compiler)

    // 执行 entryOption 函数
    // 1、注册 make 方法
    // 2、make 方法内会执行 compilation.addEntry 方法
    // 3、make 方法会在 run --> compile --> make 中调用
    compiler.hooks.entryOption.call(options.context, options.entry)
  }
}

module.exports = WebpackOptionsApply
