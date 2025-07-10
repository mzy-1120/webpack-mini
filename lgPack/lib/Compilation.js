const ejs = require("ejs");
const Chunk = require("./Chunk");
const path = require("path");
const async = require("neo-async");
const Parser = require("./Parser");
const NormalModuleFactory = require("./NormalModuleFactory");
const {Tapable, SyncHook} = require("tapable");

// 实例化一个 normalModuleFactory parser
const normalModuleFactory = new NormalModuleFactory();

// 代码解析器
const parser = new Parser();

class Compilation extends Tapable {
  constructor(compiler) {
    super();

    this.context = compiler.context; // webpack.config.js 根路径
    this.options = compiler.options; // webpack.config.js 配置
    this.compiler = compiler;

    this.inputFileSystem = compiler.inputFileSystem;
    this.outputFileSystem = compiler.outputFileSystem;

    this.entries = []; // 根据 webpack 的入口，存储的 modules
    this.modules = []; // 存放所有编译后的模块信息
    this.chunks = []; // 根据 entry 生成的 entryModule 然后 new Chunk(entryModule)
    this.assets = []; // 遍历 this.chunks 中 [fileName] = source 的集合
    this.files = []; // 遍历 this.chunks 中 fileName 的集合

    this.hooks = {
      succeedModule: new SyncHook(["module"]),
      seal: new SyncHook(),
      beforeChunks: new SyncHook(),
      afterChunks: new SyncHook(),
    };
  }

  // Webpack 编译的起点
  addEntry(context, entry, name, callback) {
    this._addModuleChain(context, entry, name, (err, module) => {

      // 成功创建模块后的回调
      callback(err, module);
    });
  }


  // 根据入口进行开始编译
  _addModuleChain(context, entry, name, callback) {
    // 创建模块
    this._createModule(
      {
        parser, // 解析器
        name: name, // 文件名称
        context: context, // 配置文件的根目录
        rawRequest: entry, // webpack 配置的打包入口
        resource: path.posix.join(context, entry), // 文件入口的绝对路径
        moduleId: "./" + path.posix.relative(context, path.posix.join(context, entry)),
      },
      // 将创建好的所有模块都添加到 compilation.entries 数组中
      (entryModule) => {
        this.entries.push(entryModule);
      },
      callback
    );
  }

  // 创建模块
  _createModule(data, doAddEntry, callback) {
    // 每次调用 create 方法，实例化 NormalModule 对象
    let module = normalModuleFactory.create(data);

    // 构建 Module 成功后回调
    const afterBuild = (err, module) => {
      // 判断当前模块内否是存在依赖
      if (module.dependencies.length > 0) {
        // 递归加载模块依赖
        this._processDependencies(module, (err) => {
          callback(err, module);
        });
      } else {
        callback(err, module);
      }
    };

    // 构建 Module （ 异步执行 ）
    this._buildModule(module, afterBuild);

    //  只有从 entry 进来的才存储 module
    doAddEntry?.(module);

    // 存储所有的 module
    this.modules.push(module);
  }

  // 调用 module.build 编译
  _buildModule(module, callback) {
    // 真正编译 module 的地方
    module.build(this, (err) => {
      // Module 编译完成，执行 succeedModule 方法
      this.hooks.succeedModule.call(module);

      callback(err, module);
    });
  }

  // 递归加载模块
  _processDependencies(module, callback) {
    let dependencies = module.dependencies;
    async.forEach(dependencies, (dependency, done) => {
      // 继续创建
      this._createModule(
        {
          parser,
          name: dependency.name, // 入口名称
          context: dependency.context, // 配置文件的根目录
          rawRequest: dependency.rawRequest, // 入口依赖的路径
          moduleId: dependency.moduleId,
          resource: dependency.resource,
        },
        null,
        done
      );
    }, callback);
  }

  // 编译后在 Compiler 组件内执行
  seal(callback) {
    this.hooks.seal.call();
    this.hooks.beforeChunks.call();

    // 1、根据入口创建 chunk
    for (const entryModule of this.entries) {
      // 核心：创建 chunk 模块，记录模块信息
      const chunk = new Chunk(entryModule);

      // 保存 chunk 信息
      this.chunks.push(chunk);

      // 向 chunk 中添加模块
      chunk.modules = this.modules.filter(
        // module.name 就是入口的名称
        (module) => module.name === chunk.name
      );
    }

    // 2、chunk 流程梳理之后就进入到 chunk 代码处理环节（模板文件 + 模块中的源代码 ==> chunk.js)
    this.hooks.afterChunks.call(this.chunks);

    // 3、生成代码内容
    this._createChunkAssets();

    callback();
  }

  // 创建 chunk 转译后的代码
  _createChunkAssets() {
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const fileName = chunk.name + ".js";
      chunk.files.push(fileName);

      // 01 获取模板文件的路径：
      let tempPath = path.posix.join(__dirname, "temp/main.ejs");
      // 02 读取模块文件中的内容
      let tempCode = this.inputFileSystem.readFileSync(tempPath, "utf8");
      // 03 获取渲染函数
      let tempRender = ejs.compile(tempCode);
      // 04 按ejs的语法渲染数据
      let source = tempRender({
        entryModuleId: chunk.entryModule.moduleId,
        modules: chunk.modules,
      });

      // 输出文件
      this._emitAssets(fileName, source);
    }
  }

  // 负责将编译后的资源（assets）输出到指定的目标目录
  _emitAssets(fileName, source) {
    this.assets[fileName] = source;
    this.files.push(fileName);
  }
}

module.exports = Compilation;
