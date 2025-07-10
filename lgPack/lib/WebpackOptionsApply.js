const EntryOptionPlugin = require("./EntryOptionPlugin")


class WebpackOptionsApply {
  process(options, compiler) {
    // 入口分析
    // 1、compiler.hooks.entryOption 上注册(.tap) EntryOptionPlugin 方法，在 "entryOption" 阶段执行
    // 2、EntryOptionPlugin 方法内 compiler.hooks.make 上注册(.tapAsync) SingleEntryPlugin 方法，在 "make" 阶段执行
    new EntryOptionPlugin().apply(compiler)

    // 通过 call 执行 hooks.entryOption 函数，
    // 1、进入入口分析阶段
    // 2、compiler.hooks.make 上注册(.tapAsync) SingleEntryPlugin 方法，在 "make" 阶段执行
    // 3、SingleEntryPlugin 内执行，，执行 compilation.addEntry （将 compiler 与 compilation 链接起来）
    compiler.hooks.entryOption.call(options.context, options.entry)
  }
}

module.exports = WebpackOptionsApply
