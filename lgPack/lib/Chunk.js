class Chunk {
  constructor(entryModule) {
    this.entryModule = entryModule // 入口模块
    this.name = entryModule.name // 模块名称
    this.files = []  // 记录每个 chunk 的文件信息
    this.modules = [] // 当前入口，依赖的模块
  }
}


module.exports = Chunk

