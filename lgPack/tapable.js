const { SyncHook } = require("tapable");


// 1、同步钩子
// SyncHook  注册：tap；触发：call
// SyncBailHook  可中断执行（返回非 undefined 值停止后续调用
// SyncWaterfallHook  上一个回调返回值会作为下一个回调的参数
// SyncLoopHook  循环执行回调直到返回 undefined
// const hook = new SyncHook(["arg1", "arg2"]);
// hook.tap("Plugin1", (arg1, arg2) => {
//     console.log("Plugin1:", arg1, arg2);
// });
// hook.call("Hello", "World")


// 2、异步钩子类型
// AsyncParallelHook 注册方式：tap, tapAsync, tapPromise 触发方式：callAsync, promise 并行执行所有回调
// AsyncSeriesHook 同上                                 同上                        按顺序串行执行回调
// AsyncSeriesBailHook 同上                             同上                        可中断执行
// AsyncSeriesWaterfallHook 同上                        同上                        上一个回调返回值传递给下一个
// const { AsyncSeriesHook } = require("tapable");
// const hook = new AsyncSeriesHook(["arg"]);
// hook.tapAsync("Plugin1", (arg, callback) => {
//     setTimeout(() => {
//         console.log("Plugin1:", arg);
//         callback();
//     }, 100);
// });
// hook.tapAsync("Plugin2", (arg, callback) => {
//     setTimeout(() => {
//         console.log("Plugin2:", arg);
//         callback();
//     }, 50);
// });
// hook.callAsync("Webpack", () => {
//     console.log("Done");
// });
