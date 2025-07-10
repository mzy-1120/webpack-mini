class Chunk {
  constructor(entryModule) {
    this.entryModule = entryModule // 入口模块
    this.name = entryModule.name // 模块名称
    this.files = []  // 记录 entry chunk 的 fileName
    this.modules = [] // 根据 entry 过滤所有的 modules
  }
}


module.exports = Chunk

