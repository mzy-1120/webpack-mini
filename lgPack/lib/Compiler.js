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

/**
 * Compiler 类，负责管理编译的生命周期
 * 1、创建模块
 * 2、编译模块
 * 3、生成代码
 */
class Compiler extends Tapable {
  constructor(context) {
    super();

    // webpack.config.js 所在绝对路径
    this.context = context;

    // 挂载 hoos 函数，在指定时机调用
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


  /**
   * 由使用者调用此方法开始进入编译阶段
   * 1、从 run 阶段、进入 compile 阶段
   * 2、compile 完成，调用 callback 函数
   */
  run(callback) {
    // 最终编译完成，调用外层传入的 callback 函数
    const finalCallback = function (err, stats) {
      callback(err, stats);
    };

    // 编译完成回调
    const onCompiled = (err, compilation) => {
      // 输出至 dist
      this._emitAssets(compilation, (err) => {
        let stats = new Stats(compilation);
        finalCallback(err, stats);
      });
    };

    // 从 run 阶段，进入 compile 阶段
    this.hooks.beforeRun.callAsync(this, (err) => {
      this.hooks.run.callAsync(this, (err) => {
        this._compile(onCompiled);
      });
    });
  }

  // 编译过程
  _compile(callback) {
    // 1、返回的 params 中包含 normalModuleFactory.create 指向 new NormalModule
    // 2、内部实例化 NormalModule 对象
    const params = this._newCompilationParams();


    // 1、执行 beforeRun 钩子
    this.hooks.beforeRun.callAsync(params, (err) => {

      // 调用 compile 钩子
      this.hooks.compile.call(params);

      // 返回 new Compilation 的实例化对象
      const compilation = this._newCompilation(params);

      // 调用注册的 hooks.make.tapAsyn('SingleEntryPlugin') 方法，执行 compilation.addEntry 方法
      // 1、调用 make 钩子
      // 2、make 函数里面执行 addEntry 函数，
      // 3、addEntry 里面执行 addModuleChain 函数
      // 4、addModuleChain里面执行 buildModule 函数
      // 5、buildModule 里面执行 build 函数，里面执行 build 函数，
      // 6、最后执行 compilation.seal 方法
      this.hooks.make.callAsync(compilation, (err) => {
        // 编译完成之后，调用 compilation 上的 seal 方法
        compilation.seal((err) => {
          // 调用 afterCompile 钩子
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
  _emitAssets(compilation, callback) {
    // 01 定义一个工具方法用于执行文件的生成操作
    const emitFlies = (err) => {
      const assets = compilation.assets;
      let outputPath = this.options.output.path;

      for (let file in assets) {
        let source = assets[file];
        let targetPath = path.posix.join(outputPath, file);

        // 写入文件
        this.outputFileSystem.writeFileSync(targetPath, source, "utf8");
      }

      callback(err);
    };

    // 02、创建目录之后启动文件写入
    // 调用 emit 钩子
    this.hooks.emit.callAsync(compilation, (err) => {
      // 创建目录
      mkdirp.sync(this.options.output.path);

      // 启动文件写入
      emitFlies();
    });
  }

  // 创建 params 对象，内部返回 NormalModule 对象
  _newCompilationParams() {
    const params = {
      normalModuleFactory: new NormalModuleFactory(),
    };

    return params;
  }

  // 返回 Compilation 对象
  _newCompilation(params) {
    // 创建 Compilation 对象实例
    const compilation = this._createCompilation();

    // 执行：thisCompilation、compilation 两个函数
    this.hooks.thisCompilation.call(compilation, params);
    this.hooks.compilation.call(compilation, params);

    return compilation;
  }

  // 创建 Compilation 对象
  _createCompilation() {
    return new Compilation(this);
  }
}

module.exports = Compiler;
