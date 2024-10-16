const ejs = require('ejs')
const Chunk = require('./Chunk')
const path = require('path')
const async = require('neo-async')
const Parser = require('./Parser')
const NormalModuleFactory = require('./NormalModuleFactory')
const { Tapable, SyncHook } = require('tapable')

// 实例化一个 normalModuleFactory parser 
const normalModuleFactory = new NormalModuleFactory()
const parser = new Parser()

class Compilation extends Tapable {
  constructor(compiler) {
    super()
    this.context = compiler.context
    this.options = compiler.options
    this.compiler = compiler

    // 让 compilation 具备文件的读写能力
    this.inputFileSystem = compiler.inputFileSystem
    this.outputFileSystem = compiler.outputFileSystem
    
    this.entries = []  // 存入所有入口模块的数组
    this.modules = [] // 存放所有模块的数据
    this.chunks = []  // 存放当前次打包过程中所产出的 chunk
    this.assets = []
    this.files = []

    this.hooks = {
      succeedModule: new SyncHook(['module']), 
      seal: new SyncHook(),
      beforeChunks: new SyncHook(),
      afterChunks: new SyncHook()
    }
  }

  /**
   * 添加入口模块
   */
  addEntry(context, entry, name, callback) {
    this._addModuleChain(context, entry, name, (err, module) => {
      callback(err, module)
    })
  }

  // 根据入口进行开始编译
  _addModuleChain(context, entry, name, callback) {
    this.createModule({
      parser, // 解析器
      name: name,
      context: context,
      rawRequest: entry,
      resource: path.posix.join(context, entry),
      moduleId: './' + path.posix.relative(context, path.posix.join(context, entry))
    }, (entryModule) => {
      this.entries.push(entryModule)
    }, callback)
  }

  /**
   * 定义一个创建模块的方法，达到复用的目的
   * @param {*} data 创建模块时所需要的一些属性值 
   * @param {*} doAddEntry 可选参数，在加载入口模块的时候，将入口模块的id 写入 this.entries 
   * @param {*} callback 
   */
  createModule(data, doAddEntry, callback) {
    // 返回 new NormalModule() 实例化对象
    let module = normalModuleFactory.create(data)
    const afterBuild = (err, module) => {
      // 判断当前模块内否是存在依赖
      if (module.dependencies.length > 0) {
        // 递归加载模块依赖
        this.processDependencies(module, (err) => {
          callback(err, module)
        })
      } else {
        callback(err, module)
      }
    }

    // 构建 Module
    this.buildModule(module, afterBuild)

    // 当我们完成了本次的 build 操作之后将 module 进行保存
    doAddEntry && doAddEntry(module)
    
    this.modules.push(module)
  }

  /**
   * 完成具体的 build 行为
   * @param {*} module 当前需要被编译的模块
   * @param {*} callback 
   */
  buildModule(module, callback) {
    // 编译 module
    module.build(this, (err) => {
      // Module 编译完成，执行 succeedModule 方法
      this.hooks.succeedModule.call(module)
      
      callback(err, module)
    })
  }

  // 递归加载模块
  processDependencies(module, callback) {
    let dependencies = module.dependencies
    async.forEach(dependencies, (dependency, done) => {
      this.createModule({
        parser,
        name: dependency.name,
        context: dependency.context,
        rawRequest: dependency.rawRequest,
        moduleId: dependency.moduleId,
        resource: dependency.resource
      }, null, done)
    }, callback)
  }

  seal(callback) {
    this.hooks.seal.call()
    this.hooks.beforeChunks.call()

    // 1、创建 chunk
    for (const entryModule of this.entries) {
      // 核心：创建模块加载已有模块的内容，同时记录模块信息 
      const chunk = new Chunk(entryModule)

      // 保存 chunk 信息
      this.chunks.push(chunk)

      // 给 chunk 属性赋值 
      chunk.modules = this.modules.filter(module => module.name === chunk.name)
    }

    // 2、chunk 流程梳理之后就进入到 chunk 代码处理环节（模板文件 + 模块中的源代码 ==> chunk.js)
    this.hooks.afterChunks.call(this.chunks)

    // 3、生成代码内容
    this.createChunkAssets()

    callback()
  }

  // 创建 chunk 对应的代码
  createChunkAssets() {
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i]
      const fileName = chunk.name + '.js'
      chunk.files.push(fileName)

      // 01 获取模板文件的路径
      let tempPath = path.posix.join(__dirname, 'temp/main.ejs')
      // 02 读取模块文件中的内容
      let tempCode = this.inputFileSystem.readFileSync(tempPath, 'utf8')
      // 03 获取渲染函数
      let tempRender = ejs.compile(tempCode)
      // 04 按ejs的语法渲染数据
      let source = tempRender({
        entryModuleId: chunk.entryModule.moduleId,
        modules: chunk.modules
      })

      // 输出文件
      this.emitAssets(fileName, source)
    }
  }

  emitAssets(fileName, source) {
    this.assets[fileName] = source
    this.files.push(fileName)
  }
}

module.exports = Compilation

