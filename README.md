# 简介

豆瓣音乐人 hybrid app，满足自己好奇心开发的（不是专业前端。。），实现了原版的大部分功能，完成度80%。

UI 布局自己设计的，配色参考了[vertial infinity](http://www.cssauthor.com/vertical-infinity-a-mega-flat-style-ui-kit-for-free-download/)。

在 Android 4.2.1 上测试通过，但体验离原生 app 还是有很大差距，而且由于安卓平台的分裂，在不同机器上测试时发现了各种各样奇葩的问题。

所以很大可能弃坑，*IOS版开发酝酿中* 。

截图：

![](https://raw.githubusercontent.com/novoland/douban-artist/master/screenshots/1.png)

![](https://raw.githubusercontent.com/novoland/douban-artist/master/screenshots/3.png)

![](https://raw.githubusercontent.com/novoland/douban-artist/master/screenshots/5.png)

可以直接安装的APK在[这里](https://github.com/novoland/douban-artist/raw/master/platforms/android/bin/DouBi-debug-unaligned.apk)。

# 使用的库

```
phonegap 3.3 
AngularJS 1.2.6
ionic 0.9.17
iScroll 5.0.9
```

# Build

请先按官网介绍安装好 phonegap 3.3 环境，然后 cd 到根目录，运行：
```sh
phonegap run android
```
如果一切顺利的话会在模拟器中看到运行的 app。

OS X 下的 build 没有尝试过，因为买不起 mac。

# 未实现的功能

1. 相册
2. 账号注册

原版app的功能本来就很少。。

# 有点意思的
1. 扩展 ionic 实现了一个基于 modal 的导航，模拟安卓平台上很多 APP 的场景切换效果（原版 ionic 的思路完全是按 ios 来的）；
2. 简单实现了 http 请求的缓存，已发出但未获取结果的请求也可以被重用。

