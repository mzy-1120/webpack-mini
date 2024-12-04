// 1、Babylon 是Babel中使用的 JavaScript 解析器
// 2、支持 JSX 和 Flow
// 3、API 应用程序编程接口
//    babylon.parse(code, [options])：将提供的code解析为整个 ECMAScript 程序
//    babylon.parseExpression(code, [options])：在考虑性能的情况下解析单个表达式
const babylon = require('babylon')
const {Tapable} = require('tapable')

class Parser extends Tapable {
  parse(source) {
    return babylon.parse(source, {
      sourceType: 'module',
      plugins: ['dynamicImport']  // 当前插件可以支持 import() 动态导入的语法
    })
  }
}


module.exports = Parser

