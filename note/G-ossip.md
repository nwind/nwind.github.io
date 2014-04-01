---
layout: post
title: 八卦某 G 的前端开发方式及流程
author: nwind
---

> 他山之石，可以攻玉。

话说本人从毕业到现在一直在某 B 公司工作，前些年折腾过不少开发方式和工具，但总觉得或许有更好的方案，所以很好奇其它公司内部是如何工作的，我曾经浏览过某 Y 公司内部无所不包的 TWiki，也拜访过某 F 总部了解他们的开发流程，但对某 G 公司却了解不多，只零零碎碎知道一些，这两天抽空梳理了之前收集到的各种资料，希望能给 FEX 后续改进提供参考。

*注意：以下内容主要信息来自网上收集、[『In The Plex』](www.amazon.com/In-The-Plex-Google-Thinks/dp/1455875724)这本书及闲聊，纯粹为了技术交流和讨论，仅代表个人观点，本人从未在某 G 工作过，不受 [NDA](http://en.wikipedia.org/wiki/Non-disclosure_agreement) 限制，但大部分信息无法确认真伪，加上某 G 很大，每个部门都有可能不一样，所以这里的信息也是比较片面的，欢迎大家提供更多参考信息。*

## 分工协作

首先，某 G 大部分产品线都不区分前端工程师和后端工程师，一个人需要用从前到后都负责开发，尽管这几年似乎有变化，能看到专门的 [Front End](https://www.google.com/about/careers/search/#t=sq&q=j&d=Front+End&li=10&j=Front+End&) 职位了，但应该是很少数产品线的做法。

N 年前有人去 G 面试过，和他闲聊后了解到某 G 要求应聘者必须至少要会 C++ 和 Java 中的一种，只会 Python/PHP 是不够的，要是只懂 JS 就更不行了。这个信息很关键，能用来解释一些内部现象，后面我会提到。

我个人认为前端工程师确实应该了解基本的后端知识，某 B 公司以前很多前端工程师都只负责模板（比如 Smarty）开发，这导致一个很严重的问题，那就是前端工程师往往不知道如何搭建环境，开发时需要依赖后端工程师提供环境和数据，严重影响了开发效率，这也是为什么 FIS 还内嵌了本地服务功能。

另外国内有公司还对前端工程师做进一步细分，按照职能分为写 HTML/CSS 和 JS 的，对于我所属的团队，我个人并不赞同这种做法，因为 HTML 和 JS 是密切相关的，这样分工将不利于代码管理与优化，尤其是交互复杂的页面，因为 JS 很依赖 HTML，拆分反而增加沟通成本，但或许在重运营的网站这么做会更好。

## 代码管理方法

以下是一些零碎了解到的几点：

* **内部所有人都能看到代码**
    * 据说在 09 年时某国家的 office 有例外（来自『In The Plex』第 6 章，内容比较不和谐，这里就不展开了）
    * 提交代码需要相关人员的 review
    * 这使得某 G 内部工程师可以很方便地切换项目，很少一个人只负责一个项目
* **代码只有最新版(trunk)**，没有 release 版本，没有版本号
    * 一般大家喜欢新增接口
    * 如果要修改原有的接口，就必须通知所有使用方，不过因为所有人都能看到所有代码，所以很容易找到有谁使用
    * 据了解某 F 也是这样的
* **有个代码的搜索引擎**
    * 估计和下线的 Code Search 比较像（好像还是某高管写的，不过我忘记在哪看到的了）
    * 如果想使用某个基础库，最好的方法是搜索使用到这个库的相关代码，抄过来
        * 我认为这种方式比让工程师写文档靠谱多了，因为绝大部分调用这个库的代码都是相似的，所以直接给出例子能让别人更容易上手
* **代码依赖是通过全局的方式统一管理的**
    * 我猜应该很类似 Chromium 中的 [GYP](https://code.google.com/p/gyp/)，熟悉 node 的同学可以理解为 npm，不过是支持多语言的
    * 之前在某 G 工作过的 iOS 工程师也在[某篇后来删除的文章](https://news.ycombinator.com/item?id=5001830)中透露代码中不放 Xcode 项目文件，而是由工具生成出来（话说这篇文章挺有价值的，可惜老外不喜欢转帖，导致现在找不到了）
    * 这种依赖管理方式让人想起某 A 公司（卖书那个，不是卖水果的）内部完善的 SOA 机制，不过某 A 喜欢基于 service 来重用，而某 G  看起来喜欢代码级别的重用
* **很少使用第三方库**
    * 只能选用内部维护的版本，比如类似这个 [MySQL](https://code.google.com/p/google-mysql/)
    * 会将第三方库的编译工具改成内部的，比如 Chromium 中都改成 GYP 方便管理
    * 据说想申请用某个新第三方库需要审核，周期比较长
* **代码管理软件用的 Perforce**
    * 某 G 直接将这个公司收购了，这些员工为 G 内部打造了一套开发流程
    * 另外我找到一篇 [Perforce 的性能优化的论文](http://research.google.com/pubs/archive/39983.pdf)，这里面透露了很多 G 公司内部的代码情况（发表时间是 2011 年 5 月），以下信息取自这篇论文：
        * 这个程序用了 17 年，有 2 千万次 changelist（可以理解就是 ci 数量）
        * 最大的 client 有 6 百万个文件（应该绝大部分是数据吧，要知道 chromium 项目也就不到 30 万个文件）
        * 文档及相关数据文件也放上面
        * Reivew 工具叫 Mondrian（确认就是 [Rietveld](https://developers.google.com/appengine/articles/rietveld?csw=1) 的前身）

整体来说某 G 的代码管理方式有很多可取之处，尤其是代码开放，能最大程度地调动开发人员的主动性与协作意识，从而创造出更大的价值。不过没有版本管理这点是个双刃剑，我也没想好是否这样会更好。

### feature flag

因为没有分支，代码只有一份，所以要实验新功能就得通过 flag 来控制的，这个 flag 由线上 Borg 系统来管理，能做到针对某一部分的 Cookie 开启不同的 feature，方便进行对比抽样。

如果某个功能最终不上线，后续需要手工删除相关代码。

这个 flag 开关功能在某 F 也有，我认为这是大型网站是必备功能，但需要注意，这个系统本身会成为关键节点，之前某 F 的类似系统挂过，直接导致整个网站大部分功能都关闭了，所以一旦出问题后果很严重。

### 严格的代码检查

据说某 G 工程师大部分时间在写单元测试，单元测试可以保证 UI 无关代码的质量，但对于页面测试就很难了，虽然可以使用 selenium，但某 G 内部大家都不愿意写，我个人认为这个问题确实无解，页面随便一改就导致大量测试失效，我还没见任何一家公司解决（某 F 说他们用的是 Watir，但主要用于保证登录等基本功能可用），目前看来唯一可行的就是自动页面截图 diff，[某 G 在 Consumer Surveys 这个产品中也在尝试](http://velocityconf.com/velocity2013/public/schedule/detail/28452)。

据说某 G 的项目大多没有严格的上线时间点，所以不能以项目紧急为借口来不写单元测试，这点和天朝不太一样，大家更倾向牺牲质量来追求速度。

另外国外公司一般对浏览器兼容性问题都不怎么关注，因为现代浏览器中的兼容性问题比以前好得多，这点某 G 和某 F 公司一样，只支持高版本的 IE。

因为只有主干，所以提交代码很谨慎，需要经过 3 个主要阶段：

1. 代码风格检查
    * 应该主要参考[这个文档](https://code.google.com/p/google-styleguide/)
    * 非常严格，据说还会检查命名什么的
    * 有段子说 Python 作者 Guido van Rossum 写的 Python 代码无法通过检查，所以一直没提交。。。我认为这是假的，因为他老人家写的 [rietveld](https://code.google.com/p/rietveld) 还是挺符合某 G 规范的
2. 单元测试检查
3. 代码 owner 的 Review

提交一旦出错可能会导致影响其它人的工作（因为每个人都依赖主干啊），甚至遭到其它国家 office 工程师的指责，所以大家对于代码提交都非常谨慎，再三确认，压力不小。

在单元测试、代码风格和 review 的执行上，某 G 做得很彻底，这点值得学习，国内大家似乎更喜欢开发效率而不是质量。

## 前端如何开发

除了 Gmail、Maps、Plus 这样的特例，基本上都是由后端模板生成页面，很少项目使用 JS 来写界面，更少使用 MVC 框架，这点其实在很多公司都差不多，比如某 B 也是一样的，除了地图及广告管家等产品，其它产品基本上都是通过模板生成的。

某 G 的页面是通常是由 Java 或 C++ 语言所写的模版引擎生成的，而且开源出来了，分别是 [Closure Templates](https://developers.google.com/closure/templates/) 和 [CTemplate](https://code.google.com/p/ctemplate/)，话说某 B 在几年前也自己写了个 C++ 的模板引擎，但目前基本被淘汰了。

对某 G 来说，「前端」工程师要写 Java 和 JavaScript，而「后端」服务主要是 C++（某些地方开始使用 Go 了，[比如这个](http://matt-welsh.blogspot.com/2013/08/rewriting-large-production-system-in-go.html)）。

前面说到招人时都要会 Java，这带来的结果是大多数团队成员更了解 Java 而不是 JavaScript，于是在这种背景下很自然地诞生了 [GWT](http://www.gwtproject.org) 这个神奇的东西，它在内部很多地方使用，按照内部人士的说法，主要的考虑是：

* 能自动生成跨浏览器浏览器代码
* 结构规范，通过编译器就能提前发现很多问题
* 能使用强大的 IDE 来提高效率（重构、自动完成、方便跳转到定义等）

对于专业做前端的同学，看到 GWT 多半不喜欢，感觉就是多此一举，但如果是 Java 出身的工程师其实是很容易接受的，尤其是对于习惯了 Java 的代码组织方式及强类型语言的人，反而会很不习惯 JavaScript 这种弱类型的语言，觉得太难控制太容易出错了，比如拿到一个变量，在 Java 代码中通过它的类型就能知道它的数据结构，但 JavaScript 就不行了，只能在运行时 `console.dir` 出来或找相关实现的代码，从我个人体会来看，对于陌生代码，JavaScript 版本的理解难度要明显高于 Java 版本。

话说某 G 曾经弄过一个叫 Wave 的产品，后来产品失败后就将代码[开源出来了](http://incubator.apache.org/wave/source-code.html)，我认为这个代码能反应出 G 内部在使用 GWT 时的开发风格，我用 cloc 统计了一下它的代码情况，结果如下：

    ----------------------------------------------------------
    Language        files       blank      comment        code
    ----------------------------------------------------------
    Java             2329       50121       139226      245856
    Python             34        1308         2537        4451
    CSS                57         617         1670        2791
    XML               148        1009         2627        2487
    Ant                15         131          335         987
    HTML                8         124          155         831
    Bourne Shell        9          61          190         185
    Javascript          1          12           26          56

神奇吧，这么复杂的前端交互应用，只有 1 个 56 行的 JS 文件，而且其实我看了这个 JS 还是没必要的，所以你可以理解为什么某 G 只招懂 Java 或 C++ 的工程师了吧。

后来某 G 的 Lars Bak 大神推出了 Dart，在我看来就是用来取代 GWT 的，前面说到的 GWT 优点在 Dart 都有，而且在 I/O 2012 有一个演讲题目是 [Migrating Code from GWT to Dart](https://www.youtube.com/watch?v=EvACKPBo_R8)，赤裸裸啊。

另外其实某 G 内部也不是所有人都喜欢 GWT，比如 Plus 就没使用，而是[直接基于 Closure 开发](http://www.infoq.com/news/2011/07/Google-Plus)，并使用 Closure template。

说到 Closure，就不得不提它的起源：Gmail，在 WebApps 2010 会议上，[有篇 PPT 介绍了 Gmail 代码的情况](https://www.usenix.org/events/webapps10/tech/slides/deboor.pdf)，以下摘抄其中几个信息：

* 2004 年就有 9400 行代码了，还有个 JS 编译器（Closure compiler 的前身）来压缩代码、检查错误等
* 2005 年有 22000 行代码，10000 行注释
* 2006 年有 52000 行代码，23000 行注释，开始使用面向对象，并初步形成 Closure library
* 2007 年重写，代码达到 90000 行，注释居然有 97000 行（太厉害了。。。），开始出现模块化机制，而且出现了 Closure Templates
* 随后开始内部使用，并最终对外推出了 Closure 系列工具
* 演讲人认为 `Type-checking is important and possible`
* [有报道说](http://www.infoworld.com/d/developer-world/google-executive-frustrated-java-c-complexity-375)在这个会议中演讲人还透露 Gmail service 也是用 JS 写的，代码有 443000 行
    * 对于这个消息，我不确定是否真实，但确实是有可能，08 年时[ Stevey Yegge 也说过](http://steve-yegge.blogspot.jp/2008/05/dynamic-languages-strike-back.html)某 G 的规范有漏洞，没说 JS 只能用在前端，而且他还真这么做过。

最后插一句我的观点：对于我所处的团队及用户类产品来说，GWT 没有意义，而 Dart 虽然比起 GWT 要好得多，但和 JS 交互[实在太麻烦](https://www.dartlang.org/articles/js-dart-interop/)，导致它的使用场景很有限，语法有明显变化，使得难以让大部分前端工程师接受（Lars Bak 就在 I/O 2013 上[吐槽](https://developers.google.com/events/io/sessions/324431687)工程师太纠结语法，看起来大神在内部推广时肯定遇到不少阻力）。对于类型检查的好处，我个人是比较赞同的，因此我更喜欢 [TypeScript](http://www.typescriptlang.org/) 这种增强形方案，因为它可以逐步适应，既有类型支持的优势，又能直接使用现有代码。

## 内部工作流程

以下是打听到的某个产品项目开发流程：

* PM 或工程师提出某个想法，UX 做原型 mock
* PM 申请项目审核（通过率不高）、工程师开发 UX 无关部分
* 工程师完成开发
* 线上小流量实验
* PM/工程师分析实验结果，完成报告，申请全量上线（通过率不高）
    * 通过数据来证明这个功能是有价值的
    * 需要解释这些数据的变化原因
* 分批逐步上线，这个过程中还会有很多审核
* 最终确定是否要上线（通过率不高）

一般整个项目周期很长（至少一季度），项目最终上线时间点无法确定，大部分的项目最终都无法正式上线。

最大的特点是完全靠数据说话，而不是由某个 PM 决定一切，以前有个视觉设计师在离开 G 后就在博客上[吐槽这点](http://stopdesign.com/archive/2009/03/20/goodbye-google.html)，他认为这会导致无法进行大胆的界面改版。

这个流程和我们搜索产品几年前的开发流程很类似，对于成熟的搜索引擎来说这么做确实有它的道理，毕竟随便改个什么都很可能影响收入，当然要十分谨慎了，但这种开发方式并不适合面向用户类的产品，如社区、游戏等，因为开发周期太长了，很容易错过时机。

## 某人一天的工作

这里拿 [Matt Welsh](http://matt-welsh.blogspot.com/) 来举例介绍一个工程师在某 G 一天的工作，虽然他不是做前端开发的，但他目前在 Chrome 团队负责[移动 Web 性能优化]((http://matt-welsh.blogspot.com/2013/04/running-software-team-at-google.html)，所以还是比较相关，而且最重要的是他比较喜欢写博客，有意无意地透露了很多信息，所以我比较好公开谈。

另外话说他之前还是哈佛的计算机**终身**教授（！！！），八卦很多，比如[差点说服小扎同学](http://matt-welsh.blogspot.jp/2009/02/how-i-almost-killed-facebook.html)不要搞什么社交网络了，还是好好学习拿毕业证书。。。

这[这篇文章](http://matt-welsh.blogspot.com/2010/12/day-in-life-of-googler.html)里，Matt Welsh 介绍他的一天是如何度过的（另外还提到了在哈佛当教授是如何度过的，也很有意思），我摘抄如下：

* 9:00，到公司，查邮件
* 9:30-10:15，写代码，增加功能，编写单元测试，发起 changelist 代码 review，喝无糖可乐
* 10:15-11:00，切换 git 分支到其它项目，查看同事 review 代码的结果，回复评论并发新版本 changelist
* 10:00-11:30，再次切换 git 分支，提交一个要运行 3 小时的 MapReduce 任务分析网络延迟日志
* 11:30-12:00，和山景城的团队成员开视频会议
* 12:00-12:35，午餐
* 12:35-14:00，检查邮件，检查 MapReduce 任务运行状态，回复代码 review 的评论，再次提交代码，然后查看任务列表确定接下来的工作
* 14:00-15:00，和在剑桥（有评论指出这里是波士顿的剑桥，不是英国那个）、山景城等多个地区的团队成员开项目会议
* 15:00-16:00，喝红牛，这时 MapReduce 任务已经跑完了，生成图表，分析数据中不符合预期的部分，整理代码，准备下一次 MapReduce
* 16:00-17:00，喝苏格兰威士忌(scotch)并玩吉他英雄(Guitar Hero)
* 17:00，收拾笔记本回家

看完后我的几点体会是：

* 前面提到的代码只有 trunk 并不准确，当然每个部门确实可能不一样
* 代码 review 做得很认真
* 看起来任务很明确，所以虽然工作时间是 9-5，但效率挺高，这点我最为好奇的，怎么做到将工作安排这么具体？
* 除了写代码，分析数据也是每天的重要工作，具体分析什么可以通过他的[论文](http://www.mdw.la/pubs)了解，看得出来是很细致的

## 内部工具

2008 年前的内部工具情况可以通过[这篇文章](http://blogoscoped.com/archive/2008-03-12-n39.html)和[这个 PPT](http://www.slideshare.net/guestcc91d4/googles-internal-systems) 了解，不过之后就不清楚了，看起来很多外部工具都有内部版本(Docs、Mail、Talk、Calendar 等）。

这里说一下 Chromium 项目中我看到的工具使用情况：

* 网站是基于 [Sites](https://sites.google.com) 搭建的
* 设计文档喜欢使用 Docs，因为可以在线编辑和评论功能，所以多人协作会很方便
* https://codereview.chromium.org/
* 在 [Groups](http://groups.google.com/a/chromium.org/group/chromium-discuss) 中进行讨论
* 使用 [code](https://code.google.com/p/chromium/issues/) 来管理 issues
* [Buildbots](https://chromium-build.appspot.com/p/chromium/console) 来进行编译和集成测试
* 搭建了各种检测工具来保证质量，具体细节推荐[读这本书](http://www.amazon.com/Google-Tests-Software-James-Whittaker/dp/0321803027)，看完这本书我最大的体会是没什么神奇的东西，完全靠细心的工作

## 可用的石头

以下是我认为可以借鉴的地方：

* 源码不分版本，对内部所有人公开
    * 在 FEX 内部已经是这样了，但我们应该推动更广泛的开放与共享
* 严格的代码规范及单元测试机制
    * FEX 所有项目将接入 Travis CI
    * 代码规范及单元测试的强制检查
    * 代码 owner 的 review 机制
* 通过实际例子来使用，甚至不用看文档
    * 加强对 demo 及 example 的要求，不能是简单的 hello，而最好是从产品线实际使用案例中抽取出来
* 文档及相关资料和代码放一起
    * 这能保证找起来很方便
    * 如果由于种种原因不能放一起，至少也要放链接
* 外部产品有内网版，比如 Docs
    * 典型的 Eating your own dog food
    * 在内网提前测试外部产品的新功能，而且一般内部人员都会很积极地吐槽，对产品改进很有帮助
* GWT 的静态检查机制
    * 整理这篇文章时我发现 TypeScript 也已经接近 1.0 版本了，看起来时机快成熟了，后续计划尝试 TypeScript

