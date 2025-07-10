const path = require("path");
const types = require("@babel/types");
const generator = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;


// 修改模块 name
class NormalModule {
  constructor(data) {
    this.context = data.context;
    this.name = data.name;
    this.moduleId = data.moduleId;
    this.rawRequest = data.rawRequest; // webpack 配置的打包入口
    this.parser = data.parser; // 解析器
    this.resource = data.resource; // 文件入口的绝对路径
    this._source; // 存放某个模块的源代码
    this._ast; // 存放源代码对应的 ast
    this.dependencies = []; // 保存当前模块依赖的其他模块信息
  }

  build(compilation, callback) {
    /**
     * 01 从文件中读取到将来需要被加载的 module 内容，这个
     * 02 如果当前不是 js 模块，需要 Loader 进行处理返回 js 模块
     * 03 将 js 代码转为 ast 语法树
     * 04 依赖其他模块，需要递归完成
     */
    this._doBuild(compilation, (err) => {
      // 1、将 code 码转为 ast 抽象语法树
      this._ast = this.parser.parse(this._source);

      // 2、再将 ast 经过修改后，转回成 code 代码
      traverse(this._ast, {
        CallExpression: (nodePath) => {
          let node = nodePath.node;

          // 如果当前文件里面有 require 方法，依赖其它文件
          if (node.callee.name === "require") {
            // 获取原始请求路径
            let modulePath = node.arguments[0].value; // './title'

            // 取出当前被加载的模块名称
            let moduleName = modulePath.split(path.posix.sep).pop(); // title

            // TODO：当前只处理 js 文件
            let extName = moduleName.indexOf(".") == -1 ? ".js" : "";
            moduleName += extName; // title.js

            // 【最终我们想要读取当前js里的内容】 所以我们需要个绝对路径
            let depResource = path.posix.join(
              path.posix.dirname(this.resource),
              moduleName
            );

            // 【将文件路径处理为 id】
            let depModuleId =
              "./" + path.posix.relative(this.context, depResource); // ./src/title.js

            // 记录当前被依赖模块的信息，方便后面递归加载
            this.dependencies.push({
              name: this.name, // TODO: 将来需要修改
              context: this.context,
              rawRequest: moduleName,
              moduleId: depModuleId,
              resource: depResource,
            });

            // 替换内容
            node.callee.name = "__webpack_require__";
            node.arguments = [types.stringLiteral(depModuleId)];
          }
        },
      });

      // 上述的操作是利用ast 按要求做了代码修改，下面的内容就是利用 .... 将修改后的 ast 转回成 code
      let {code} = generator(this._ast);
      this._source = code;

      callback(err);
    });
  }

  // 将源文件信息挂载到 this._source 上
  _doBuild(compilation, callback) {
    this._getSource(compilation, (err, source) => {
      this.resource = this.resource;
      this._source = source;
      callback();
    });
  }

  // 读取源文件信息
  _getSource(compilation, callback) {
    compilation.inputFileSystem.readFile(this.resource, "utf8", callback);
  }
}

module.exports = NormalModule;
