// Tapable 是 Webpack 中的一个库，用于实现事件拦截和插件机制。它提供了多种 Hook 类型，使得开发者能够方便地在特定的执行点插入自定义逻辑。


const {SyncHook} = require('tapable');


/**
 * 1. SyncHook：同步执行所有注册的回调函数，不关心返回值
 */
const hook1 = new SyncHook(['arg1', 'arg2']);

hook1.tap('Plugin1', (arg1, arg2) => {
  console.log('Plugin1:', arg1, arg2);
});

hook1.call('hello', 'world');


/**
 * 2. 同步执行所有注册的回调函数，一旦某个回调函数返回非 undefined 值，则停止执行后续的回调函数。
 */
const hook2 = new SyncBailHook(['arg1', 'arg2']);

hook2.tap('Plugin1', (arg1, arg2) => {
  console.log('Plugin1:', arg1, arg2);
  return 'bail';
});

hook2.tap('Plugin2', (arg1, arg2) => {
  console.log('Plugin2:', arg1, arg2); // 不会执行
});

hook2.call('hello', 'world');


/**
 * 3. SyncWaterfallHook：同步执行所有注册的回调函数，每个回调函数的返回值将作为下一个回调函数的参数。
 */
const hook3 = new SyncWaterfallHook(['arg1', 'arg2']);

hook3.tap('Plugin1', (arg1, arg2) => {
  return `${arg1}-${arg2}`;
});

hook3.tap('Plugin2', (result) => {
  console.log('Plugin2:', result); // 输出: hello-world
});

hook3.call('hello', 'world');


/**
 * 4. SyncLoopHook：同步循环执行所有注册的回调函数，直到所有回调函数都返回 undefined。
 */
const {SyncLoopHook} = require('tapable');
const hook4 = new SyncLoopHook(['arg1', 'arg2']);

hook4.tap('Plugin1', (arg1, arg2) => {
  console.log('Plugin1:', arg1, arg2);
  return 1;
});

hook4.tap('Plugin2', (arg1, arg2) => {
  console.log('Plugin2:', arg1, arg2);
  return undefined;
});

hook4.call('hello', 'world');


/**
 * 5. AsyncParallelHook：异步并行执行所有注册的回调函数，所有回调函数执行完毕后调用完成回调
 */
const {AsyncParallelHook} = require('tapable');
const hook5 = new AsyncParallelHook(['arg1', 'arg2']);

hook5.tapAsync('Plugin1', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('Plugin1:', arg1, arg2);
    callback();
  }, 1000);
});

hook5.tapAsync('Plugin2', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('Plugin2:', arg1, arg2);
    callback();
  }, 500);
});

hook5.callAsync('hello', 'world', () => {
  console.log('All done');
});


/**
 * 6. AsyncSeriesHook：异步串行执行所有注册的回调函数，每个回调函数执行完毕后才会执行下一个回调函数
 */
const {AsyncSeriesHook} = require('tapable');
const hook6 = new AsyncSeriesHook(['arg1', 'arg2']);

hook6.tapAsync('Plugin1', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('Plugin1:', arg1, arg2);
    callback();
  }, 1000);
});

hook6.tapAsync('Plugin2', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('Plugin2:', arg1, arg2);
    callback();
  }, 500);
});

hook6.callAsync('hello', 'world', () => {
  console.log('All done');
});

