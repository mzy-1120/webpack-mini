const {
  Tapable,
  SyncHook,
  SyncBailHook,
  AsyncSeriesHook,
  AsyncParallelHook,
} = require("tapable");

const path = require("path");
const mkdirp = require("mkdirp");
const Stats = require("./Stats");
const NormalModuleFactory = require("./NormalModuleFactory");
const Compilation = require("./Compilation");
const {emit} = require("process");
const {log} = require("console");

class Compiler extends Tapable {
  constructor(context) {
    super();

    // webpack.config.js 所在绝对路径
    this.context = context;

    // 挂载 hoos 挂载函数
    this.hooks = {
      done: new AsyncSeriesHook(["stats"]), // 异步、串行
      entryOption: new SyncBailHook(["context", "entry"]), // 同步

      beforeRun: new AsyncSeriesHook(["compiler"]), // 异步、串行
      run: new AsyncSeriesHook(["compiler"]), // 异步、串行

      thisCompilation: new SyncHook(["compilation", "params"]), // 同步
      compilation: new SyncHook(["compilation", "params"]), // 同步

      beforeCompile: new AsyncSeriesHook(["params"]), // 异步、串行
      compile: new SyncHook(["params"]), // 同步
      make: new AsyncParallelHook(["compilation"]), // 异步、并行
      afterCompile: new AsyncSeriesHook(["compilation"]), // 异步、串行

      emit: new AsyncSeriesHook(["compilation"]), // 异步、串行
    };
  }


  // 入口
  run(callback) {
    // 编译结束回调，执行 callback 函数
    const finalCallback = function (err, stats) {
      callback(err, stats);
    };

    // 编译完成回调
    const onCompiled = (err, compilation) => {
      // 最终在这里将处理好的 chunk 写入到指定的文件然后输出至 dist
      this.emitAssets(compilation, (err) => {
        let stats = new Stats(compilation);
        finalCallback(err, stats);
      });
    };

    // 进入 complie 阶段
    this.hooks.beforeRun.callAsync(this, (err) => {
      this.hooks.run.callAsync(this, (err) => {
        this.compile(onCompiled);
      });
    });
  }

  // 编译过程
  compile(callback) {
    // 1、返回的 params 中包含 normalModuleFactory.create 指向 new NormalModule
    // 2、内部实例化 NormalModule 对象
    const params = this.newCompilationParams();

    this.hooks.beforeRun.callAsync(params, (err) => {

      this.hooks.compile.call(params);

      // 返回 compilation 对象
      const compilation = this.newCompilation(params);

      this.hooks.make.callAsync(compilation, (err) => {
        // 在这里我们开始处理 chunk
        compilation.seal((err) => {
          this.hooks.afterCompile.callAsync(compilation, (err) => {
            callback(err, compilation);
          });
        });
      });
    });
  }

  /**
   * emit 阶段执行
   * 01 创建 dist
   * 02 在目录创建完成之后执行文件的写操作
   */
  emitAssets(compilation, callback) {
    // 01 定义一个工具方法用于执行文件的生成操作
    const emitFlies = (err) => {
      const assets = compilation.assets;
      let outputPath = this.options.output.path;

      for (let file in assets) {
        let source = assets[file];
        let targetPath = path.posix.join(outputPath, file);
        this.outputFileSystem.writeFileSync(targetPath, source, "utf8");
      }

      callback(err);
    };

    // 02、创建目录之后启动文件写入
    this.hooks.emit.callAsync(compilation, (err) => {
      // 创建目录
      mkdirp.sync(this.options.output.path);

      // 启动文件写入
      emitFlies();
    });
  }

  // 创建 params 对象，内部返回 NormalModule 对象
  newCompilationParams() {
    const params = {
      normalModuleFactory: new NormalModuleFactory(),
    };

    return params;
  }

  // 返回 Compilation 对象
  newCompilation(params) {
    // 创建 Compilation 对象实例
    const compilation = this.createCompilation();

    // 执行：thisCompilation、compilation 两个函数
    this.hooks.thisCompilation.call(compilation, params);
    this.hooks.compilation.call(compilation, params);

    return compilation;
  }

  // 创建 Compilation 对象
  createCompilation() {
    return new Compilation(this);
  }
}

module.exports = Compiler;
