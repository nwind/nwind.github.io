---
layout: post
title: HHVM 的实现及性能优化
tags: [vm, javascript]
---

## 背景

HHVM 是 Facebook 开发的高性能 PHP 虚拟机，似乎能以很小的修改代价来大幅度节约服务器资源，于是抽空简单了解了一下，整理出这篇文章，主要打算回答两方面的问题：

* HHVM 到底靠谱么？是否可以用到产品中？
* 它为什么比官方的 PHP 快很多？到底是如何优化的？

## 你会怎么做？

在讨论目前 HHVM 实现原理前，我们先设身处地想想：假设你有个 PHP 写的网站遇到了性能问题，经分析发现很大一部分资源就耗在 PHP 上，这时你会怎么优化 PHP 性能？

比如可以有以下几种方式：

* 方案1，彻底换性能更好的语言，如 Java/C++
* 方案2，通过 RPC 将，比如 Twitter 将大量业务逻辑放到了 Scala 中
* 方案3，基于 PHP 扩展，在性能瓶颈地方换 C/C++
* 方案4，优化 PHP

*方案1*几乎不可行，十年前 Joel 就[拿 Netscape 的例子警告过](http://www.joelonsoftware.com/articles/fog0000000069.html)，你将放弃是多年的经验积累，尤其是像 Facebook 这种业务逻辑复杂的产品，PHP 代码实在太多了（据称有2千万行，引用自 [PHP on the Metal with HHVM]），修改起来的代价恐怕比写个虚拟机还大，而且对于一个近千人的团队，从头开始学习是不可接受的

*方案2*是最保险的方案，可以逐步切换，事实上 Facebook 也在朝这方面努力了，而且还开发了 Thrift 这样的 RPC 解决方案，不过 Facebook 主要使用的是 C++，这点从早期 Thrift RCP 的代码中可以看出，因为其它语言的实现都很简陋，没法在生产环境下使用

目前 PHP:C++ 已经从 9:1 [增加到 7:3 了](http://zh.reddit.com/r/IAmA/comments/1nl9at/i_am_a_member_of_facebooks_hhvm_team_a_c_and_d/ccjlvoq)，加上有 Andrei Alexandrescu 的存在，C++ 在 Facebook 中应该会越来越流行了，但这只能解决部分问题，毕竟 C++ 开发成本比 PHP 高得多，不适合用在经常修改的地方

*方案3*看起来美好，实际执行起来却很难，一般来说性能瓶颈并不会很显著，大多是不断累加的结果，扩展解决不了多少问题，加上 PHP 扩展开发成本高，这种方案一般只用在公共且变化不大的模块上

可以看到，前面3个方案并不能很好地解决问题，所以 Facebook 其实没有选择的余地，只能从考虑 PHP 本身的优化了

## 更快的 PHP

既然要优化 PHP，那如何去优化呢？在我看来可以有以下几种方法：

* 方案1，优化 PHP 的官方实现（也就是 Zend）
* 方案2，将 PHP 编译成其它语言的 bytecode（字节码），借助其它语言的虚拟机（如 JVM）来运行
* 方案3，将 PHP 转成 C/C++，然后编译成本地代码
* 方案4，开发更快的 PHP 虚拟机

一般来说首先想到的是去优化官方实现，也就是方案1，简单来说，Zend 的执行过程可以分为两部分：将 PHP 编译为 opcode、执行 opcode，而大部分 opcode 会对应某个 C 函数， Zend 的 interpreter（也叫解释器） 会根据 opcode 调用相关的函数（有几个 opcode 是直接 switch 的），然后执行各种语言相关的操作

所以要优化 Zend 可以从两方面来考虑：一个在 opcode 上做优化，另一个则是优化 opcode 的执行

优化 opcode 是一种常见的做法，可以避免重复解析 PHP，而且还能做一些静态的编译优化，比如 [Zend Optimizer Plus](https://github.com/zendtech/ZendOptimizerPlus)，但由于 PHP 语言的动态性，这种优化方法是有局限性的，乐观估计也只能提升30%的性能；另一种考虑是优化 opcode 架构本身，如基于寄存器的方式，但这种做法修改起来工作量太大，性能提升也不会特别明显

优化 opcode 的执行了可行么？如果只看 Zend 的 C 代码，就会觉得基本没法优化了，但事实上还是有办法，比如 Inline threading，它可以避免函数调用开销，另外就是像 [JavaScriptCore](http://trac.webkit.org/browser/trunk/Source/JavaScriptCore/llint/LowLevelInterpreter.asm) 和 [LuaJIT](http://repo.or.cz/w/luajit-2.0.git/blob_plain/HEAD:/src/vm_x86.dasc) 那样使用汇编来实现 interpreter，具体细节如何优化可以看看 [Mike 的解释](http://www.reddit.com/r/programming/comments/badl2/luajit_2_beta_3_is_out_support_both_x32_x64/c0lrus0)，但这方面做法代价太大，基本上等于重写一个

开发一个高性能的虚拟机不是件简单的事情，JVM 花了10多年才达到现在的性能，那是否能直接利用这些高性能的虚拟机来优化 PHP 的性能呢？这就是方案2的思路

事实上早就有人尝试过了，比如 [Quercus](http://quercus.caucho.com/) 和 P8，Quercus 几乎没见有人使用，而 IBM 的 P8 [看起来已经死掉了](https://www.ibm.com/developerworks/community/forums/html/topic?id=77777777-0000-0000-0000-000014910522&ps=25) 

Facebook 也调研过方案2，甚至还出现过这方面的[传闻](http://nerds-central.blogspot.ie/2012/08/facebook-moving-to-jvm.html) ，不过据我所知 Facebook 应该在2011年就放弃了这个方案

方案2看起来美好，但实际效果却不理想，按照很多大牛的说法（比如 [Mike](http://lambda-the-ultimate.org/node/3851#comment-57805)），VM 总是为某个语言优化的，其它语言在上面实现会遇到很多瓶颈，比如动态的方法调用，关于这点在 [Dart 的文档中有过介绍](https://www.dartlang.org/articles/why-not-bytecode/)，而且 Quercus 的性能与 Zend+APC 比差不了太多 [来自The HipHop Compiler for PHP]，所以没太大意义

方案3是 HPHPc（HHVM 的前身）的做法，它的原理是将 PHP 代码转成 C++，然后编译为本地文件，可以认为是一种 AOT（ahead of time）的方式，关于其中代码转换的技术细节可以参考 [The HipHop Compiler for PHP](http://dl.acm.org/citation.cfm?id=2384658)，以下是该论文中的一个截图，可以通过它来简单了解：

![hhvm](hiphop-vm.png)

这种做法的最大优点是实现简单（相对于一个 VM 来说），而且能做很多编译优化（因为是离线的），比如上面的例子就将` - 1`优化掉了，但它很难支持 PHP 中的很多动态的方法，如 eval()、create_function()，除非再内嵌一个 interpreter，所以 HPHPc 并不支持这些动态语法

除了 HPHPc，还有两个类似的项目，一个是 [Roadsend](http://www.roadsend.com/)，另一个叫 [phc](http://phpcompiler.org/) ，phc 是将 PHP 转成了 C 再编译，以下是它将 `file_get_contents($f)`+` 转成 C 代码的例子：

    static php_fcall_info fgc_info; 
    php_fcall_info_init ("file_get_contents", &fgc_info);
    php_hash_find (LOCAL_ST, "f", 5863275, &fgc_info.params);
    php_call_function (&fgc_info);

话说 [phc 作者曾经在博客上哭诉](http://blog.paulbiggar.com/archive/a-rant-about-php-compilers-in-general-and-hiphop-in-particular/#bottom)，说他两年前就去 Facebook 演示过 phc 了，还和他们的工程师交流，结果人家一发布就火了，而自己忙活了4年却默默无闻，基本上前途渺茫。。。于是后来他去 Mozilla 优化 SpiderMonkey 了

Roadsend 也已经不维护了，对于 PHP 这样的动态语言来说，这种做法有很多的局限性，由于无法动态 include，Facebook 将所有文件都编译到了一起，上线时的文件部署居然达到了 1G，越来越不能忍了

所以就只剩下一条路了，那就是写一个更快的 PHP 虚拟机，将一条黑路走到底，或许你也和我一样，一开始听到这个想法时觉得太离谱，但如果站在 Facebook 的角度仔细想想就会发现其实也只能这样了

## 更快的虚拟机

HHVM 为什么更快？在各种新闻报道中都提到了 JIT，其实远没有那么简单，JIT 不是什么神奇的魔法棒，用它轻轻一挥就能一下神奇地提升性能的，而且 JIT 这个操作本身也是会耗时的，对于简单的程序没准还比 interpreter 慢，最极端的例子是 [LuaJIT 2](http://lua-users.org/lists/lua-l/2010-03/msg00305.html) 的 Interpreter 就稍微比 V8 的 JIT 快，所以并不存在绝对的事情，更多还是在细节问题的处理上，HHVM 的发展历史就是不断优化的历史，你可以从下图看到它是一点点超过 HPHPc 的

![hhvm-vs-hhpc](hhvm-vs-hhpc.jpg)

话说在 Android 4.4 中新的虚拟机 ART 就采用的是 AOT 方案（还记得么？前面提到的 HPHPc 就是这种），结果比之前使用 JIT 的 Dalvik 快了一倍，所以 JIT 也不一定比 AOT 快

因此这个项目是有很大风险的，如果没有强大的内心和毅力，极有可能半途而废，[Google 就曾经想用 JIT 提升 Python 的性能](https://code.google.com/p/unladen-swallow/)，但最终因为太难就放弃了（觉得用 LLVM 搞不定）

不过比起 Google 几个工程师的业余项目，Facebook 显然有更大的动力和决心，我们来看看 Facebook 都有哪些大牛参与了这个项目（不全）： 

* Andrei Alexandrescu，『Modern C++ Design』和『C++ Coding Standards』的作者，C++领域大神
* Keith Adams，负责过 VMware 核心架构
* Drew Paroski，在微软参与过 .NET 虚拟机开发，改进了其中的 JIT
* Jason Evans，开发了 jemalloc 的低调大牛
* Sara Golemon，『Extending and Embedding PHP』的作者，PHP 内核专家

虽然没有像 Lars Bak、Mike Pall 这样的顶级专家，但如果这些大牛能齐心协力，写个虚拟机还是问题不大的，那么他们将面临什么样的挑战呢？接下来我们一一讨论

### 规范从哪来？

自己写 PHP 虚拟机要面临的第一个问题就是 PHP 没有语言规范，很多版本间的语法还会不兼容（甚至是小版本号，比如5.2.1和5.2.3），PHP 语言规范究竟如何定义呢？来看一篇来自 [IEEE](http://grouper.ieee.org/groups/plv/DocLog/000-099/060-thru-079/22-OWGV-N-0060/n0060.pdf) 的说法：

> The PHP group claim that they have the ﬁnal say in the speciﬁcation of (the language) PHP. This groups speciﬁcation is an implementation, and there is no prose speciﬁcation or agreed validation suite.

所以唯一的途径就是老老实实去看 cPHP 的实现，好在 HPHPc 已经痛苦过一次了，所以 HHVM 能直接利用现成，因此这个问题还不算太大

话说 Ruby 其实也有这个问题，直到这两年才从终于有了规范文档

### 语言还是扩展？

实现 PHP 语言不仅仅只是实现一个虚拟机那么简单，PHP 语言本身还包括了各种扩展，这些扩展和语言是一体的，如果分析过 PHP 的代码，就会发现它的 C 代码除去空行注释后居然还有80+万行，而你猜其中 Zend 引擎部分有多少？只有不到10万行

这点和 Java 不同，写个 Java 的虚拟机只需实现字节码解释及一些基础的 JNI 调用，内置库都是 Java 实现的，所以如果不考虑优化，单从工作量看，实现 PHP 虚拟机比 JVM 还难，比如就有人用8千行的 TypeScript 实现了一个 [JVM Doppio](https://github.com/int3/doppio)

对于这个问题，HHVM 的解决办法简单粗暴，那就是只实现 Facebook 中用到的，而是

### 实现 Interpreter

接下来是 Interpreter 的实现，在解析完 PHP 后会生成 HHVM 自己设计的一种 Bytecode，而且会存储在 ~/.hhvm.hhbc（SQLite 文件） 中以便重用，在执行 Bytecode 时和 Zend 类似，也是将不同的字节码放到不同的函数中去实现（这种方式在虚拟机中有个专门的称呼：[Subroutine threading](http://en.wikipedia.org/wiki/Threaded_code#Subroutine_threading)）

Interpreter 的主体实现在 [bytecode.cpp](https://github.com/facebook/hhvm/blob/master/hphp/runtime/vm/bytecode.cpp) 中，比如 `VMExecutionContext::iopAdd` 这样的方法，最终执行会根据不同类型来区分，比如 add 操作的实现是在 [tv-arith.cpp](https://github.com/facebook/hhvm/blob/master/hphp/runtime/base/tv-arith.cpp) 中，下面摘抄其中的一小段

    :::c++
    if (c2.m_type == KindOfInt64)  return o(c1.m_data.num, c2.m_data.num);
    if (c2.m_type == KindOfDouble) return o(c1.m_data.num, c2.m_data.dbl);

正是因为有了 Interpreter，HHVM 在对于 PHP 语法的支持上比 HPHPc 有明显改进，理论上做到完全兼容官方 PHP 是可行的，但仅这么做在性能并不会比 Zend 好多少，由于无法确定变量类型，所以需要加上类似上面的条件判断语句，但这样的代码不利于现代 CPU 的执行优化，另一个问题是数据都是 boxed 的，每次读取都需要通过类似 `m_data.num` 和 `m_data.dbl` 的方法来间接获取

对于这样的问题，就得靠 JIT 来优化了

### 实现 JIT 及优化

首先值得一提的是 PHP 的 JIT 之前并非没人尝试过：

* 2008年就有人[用 LLVM 实验过](http://llvm.org/devmtg/2008-08/Lopes_PHP-JIT-InTwoDays.pdf)，结果还比原来慢了 21 倍
* 2010年 IBM 日本研究院基于他们的 JVM 虚拟机代码开发了 P9，性能是官方 PHP 的 2.5 到 9.5 倍，可以看他们的论文[Evaluation of a just-in-time compiler retrofitted for PHP](http://dl.acm.org/citation.cfm?id=1736015)
* 2011年 Andrei Homescu 基于 RPython 弄过，还写了篇论文 [HappyJIT: a tracing JIT compiler for PHP](http://www.ics.uci.edu/~ahomescu/happyjit_paper.pdf)，测试结果有好有坏，[源码在这里](https://bitbucket.org/asuhan/happy)

那么究竟什么是 JIT？如何实现一个 JIT？

在动态语言中基本上都会有 eval 方法，可以将一段字符串传给它来执行，JIT 做的就是类似的事情，只不过它要拼接不是字符串，而是不同平台下的机器码，然后进行执行，那么如何用 C 实现一个简单的 JIT 呢？最近 Eli 写了[一个入门例子](http://eli.thegreenplace.net/2013/11/05/how-to-jit-an-introduction/)，感兴趣可以去看看，以下是文中的一段代码：

    ::c++
    unsigned char code[] = {
      0x48, 0x89, 0xf8,                   // mov %rdi, %rax
      0x48, 0x83, 0xc0, 0x04,             // add $4, %rax
      0xc3                                // ret
    };
    memcpy(m, code, sizeof(code));

然而手工编写机器码很容易出错，所以最好的有一个辅助的库，比如的 Mozilla 的 [Nanojit](https://developer.mozilla.org/en-US/docs/Nanojit) 以及 LuaJIT 的 [DynASM](http://luajit.org/dynasm.html)，但 HHVM 并没有使用这些，而是自己实现了一个只支持 x64 的（另外还在尝试用 [VIXL](https://github.com/armvixl/vixl) 来生成 ARM 64 位的），通过 mprotect 的方式来让代码可执行

但为什么 JIT 代码会更快？用 C++ 编写的代码最终编译出来的也是机器码，如果只是将同样的代码手动转成了机器码，那和 GCC 生成出来的有什么区别呢？虽然前面我们提到了一些针对 CPU 实现原理来优化的技巧，但其实更重要的优化是根据类型来生成特定的指令，从而大幅减少指令数，下面这张来自 [TraceMonkey](https://hacks.mozilla.org/2009/07/tracemonkey-overview/) 的图对此进行了很直观的对比，后面我们将看到 HHVM 中的具体例子

![TraceMonkey](tracemonkey.png)

那什么时候开始使用 JIT 呢？常见的 JIT 触发条件有2种：

* trace：记录循环执行次数，如果超过一定数量就对这段代码进行 JIT
* method：记录函数执行次数，如果超过一定数量就对整个函数进行 JIT，甚至直接 inline

关于这两种方法谁更好在 Lambada 上[有个帖子](http://lambda-the-ultimate.org/node/3851)引来了各路大神的讨论，尤其是 Mike Pall（LuaJIT 作者） 、Andreas Gal（Mozilla VP） 和 Brendan Eich（Mozilla CTO），很值得围观

它们之间的区别不仅仅是编译范围，还有很多细节问题，比如对局部变量的处理，在这里就不展开了

但 HHVM 并没有采用这两种方式，而是自创了一个叫 [tracelet](https://news.ycombinator.com/item?id=4856099) 的名词，它是根据类型来划分的，看下面这张图![tracelet](tracelet.png)

可以看到它将一个函数划分为了3个部分，上面2个部分是用于处理 `$k` 为整数或字符串两种不同情况的，下面的部分是返回值，所以看起来它主要是根据类型的变化情况来划分 JIT 区域的，具体是如何分析和拆解 Tracelet 的细节可以查看 [Translator.cpp](https://github.com/facebook/hhvm/blob/master/hphp/runtime/vm/jit/translator.cpp) 中的 `Translator::analyze` 方法，我还没空看，这里就不讨论了

当然，要实现高性能的 JIT 还需进行各种尝试和优化，比如 HHVM 之前新增的 tracelet 会放到前面，也就是将上图的 A 和 C 调换位置，后来尝试了一下放到后面，结果性能提示了14%，因为测试发现这样更容易提前命中响应的类型

JIT 的执行过程是首先将 HHBC 转成 SSA (hhbc-translator.cpp)，然后对 SSA 上做优化（比如 Copy propagation），再生成本地机器码，比如在 X64 下是由 [translator-x64.cpp](https://github.com/facebook/hhvm/blob/master/hphp/runtime/vm/jit/translator-x64.cpp) 实现的

我们用一个简单的例子来看看 HHVM 最终生成的机器码是怎样的，比如下面这个 PHP 函数

    :::php
    function a($b){
      echo $b + 2;
    }

编译后是这个样子

    :::assembly
    mov rcx,0x7200000
    mov rdi,rbp
    mov rsi,rbx
    mov rdx,0x20
    call 0x2651dfb <HPHP::Transl::traceCallback(HPHP::ActRec*, HPHP::TypedValue*, long, void*)>
    cmp BYTE PTR [rbp-0x8],0xa
    jne 0xae00306
    ; 前面是检查参数是否有效

    mov rcx,QWORD PTR [rbp-0x10]           ; 这里将 %rcx 被赋值为1了
    mov edi,0x2                            ; 将 %edi（也就是 %rdi 的低32位）赋值为2
    add rdi,rcx                            ; 加上 %rcx
    call 0x2131f1b <HPHP::print_int(long)> ; 调用 print_int 函数，这时第一个参数 %rdi 的值已经是3了

    ; 后面暂不讨论
    mov BYTE PTR [rbp+0x28],0x8
    lea rbx,[rbp+0x20]
    test BYTE PTR [r12],0xff
    jne 0xae0032a
    push QWORD PTR [rbp+0x8]
    mov rbp,QWORD PTR [rbp+0x0]
    mov rdi,rbp
    mov rsi,rbx
    mov rdx,QWORD PTR [rsp]
    call 0x236b70e <HPHP::JIT::traceRet(HPHP::ActRec*, HPHP::TypedValue*, void*)>
    ret 

而 HPHP::print_int 函数的实现是这样的

    :::c++
    void print_int(int64_t i) {
      char buf[256];
      snprintf(buf, 256, "%" PRId64, i);
      echo(buf);
      TRACE(1, "t-x64 output(int): %" PRId64 "\n", i);
    }

可以看到 HHVM 编译出来的代码直接使用了 int64_t，避免了 interpreter 中需要判断参数和间接取数据的问题，从而明显提升了性能，最终和 C 编译出来的代码区别不大

需要注意：HHVM 在 server mode 下，只有超过12个请求就才会触发 JIT，启动过 HHVM 时可以通过加上如下参数来让它首次请求就使用 JIT

    -v Eval.JitWarmupRequests=0

所以在测试性能时需要注意，运行一两次就拿来对比是看不出效果的

### 类型推导很麻烦，还是逼迫程序员写清楚吧

JIT 的关键是猜测类型，经常变化的类型是很难优化的，如果类型固定将很有利于 HHVM 优化，于是 HHVM 的工程师在 PHP 语法上做手脚，加上类型的支持，推出了一个新语言 - Hack（这名字真不利于 SEO），它的样子如下：

    :::php
    <?hh
    class Point2 {
      public float $x, $y;
      function __construct(float $x, float $y) {
        $this->x = $x;
        $this->y = $y;
      }
    }
    来自：https://raw.github.com/strangeloop/StrangeLoop2013/master/slides/sessions/Adams-TakingPHPSeriously.pdf

注意到 `float` 关键字了么？有了静态类型可以让 HHVM 更好地优化性能，但这也意味着和 PHP 语法不兼容，只能使用 HHVM 了

另一方面，我认为这样做最大的优点是让代码更加易懂，减少无意的出错，就像 Dart 中的可选类型也是这个初衷，同时还方便了 IDE 识别，于是 Facebook 据说还在开发一个[基于 Web 的 IDE](https://twitter.com/jpetazzo/status/308294205598474240)，方便协同开发代码，可以期待一下

## 你会使用 HHVM 么？

总的来说，比起之前的 HPHPc，我认为 HHVM 是值得一试的，它是真正的虚拟机，能够更好地支持各种 PHP 的语法，所以改动成本不会更高，而且因为能无缝切换到官方 PHP 版本，所以可以同时启动 FPM 来随时待命，HHVM 还有 [FastCGI](https://github.com/facebook/hhvm/wiki/FastCGI) 接口方便调用，只要做好应急备案，风险是可控的，从长远来看是很有希望的

性能究竟能提升多少我无法确定，需要拿自己的业务代码来进行真实测试，这样才能真正清楚 HHVM 能带来多少收益，尤其是对整体性能提升到底有多少，只有拿到这个数据才能做决策

最后整理一下可能会遇到的问题，有计划使用的产品线可以参考：

* 系统环境问题：目前 HHVM 官方只支持 Ubuntu、Debian 等几个最新的系统，公司的标准环境目前还没人成功编译过，因为用到了 C++ 11 中的特性，所以最好用 GCC 4.8，另外即便编译出来恐怕也会有问题，所以换系统几乎是必须的，这个问题需要提前考虑
* PHP 语法兼容性问题：从目前官方的测试来看有10%的例子还没通过，如果用到这些不支持的语法就得换种写法，具体细节我不太清楚，需要具体应用具体分析，从 HHVM [最近的更新](http://www.hhvm.com/blog/1301/hhvm-2-2-0)来看，它还在不断修复重要的问题，所以预计明年才能真正稳定可用
* 扩展问题：如果用到了 PHP 扩展，肯定是要重写的，不过 HHVM 扩展写起来比 Zend 要简单的多，具体细节可以看 [wiki 上的例子](https://github.com/facebook/hhvm/wiki/Extension-API)
* HHVM Server 的稳定性问题：这种多线程的架构运行一段时间可能会出现内存泄露问题，或者某个没写好的 PHP 直接导致整个进程挂掉，所以需要注意这方面的测试和容灾措施
* 问题解决困难：HHVM 在出现问题时将比 Zend 难修复，尤其是 JIT 的代码，只能期望它比较稳定了

<!--
http://lambda-the-ultimate.org/node/3851#comment-57760

LuaJIT also does: constant folding, constant propagation, copy propagation, algebraic simplifications, reassociation, common-subexpression elimination, alias analysis, load-forwarding, store-forwarding, dead-store elimination, store sinking, scalar replacement of aggregates, scalar-evolution analysis, narrowing, specialization, loop inversion, dead-code elimination, reverse-linear-scan register allocation with a blended cost-model, register hinting, register renaming, memory operand fusion.
-->

## 引用

* [Andrei Alexandrescu on AMA](http://zh.reddit.com/r/IAmA/comments/1nl9at/i_am_a_member_of_facebooks_hhvm_team_a_c_and_d/?limit=500)
* [Keith Adams 在 HN 上的蛛丝马迹](https://news.ycombinator.com/threads?id=kmavm)
* [How Three Guys Rebuilt the Foundation of Facebook](http://www.wired.com/wiredenterprise/2013/06/facebook-hhvm-saga/all/)
* [PHP on the Metal with HHVM](http://www.infoq.com/presentations/PHP-HHVM-Facebook)
* [Making HPHPi Faster](https://www.facebook.com/note.php?note_id=10150336948348920)
* [HHVM Optimization Tips](http://www.hhvm.com/blog/713/hhvm-optimization-tips)
* [The HipHop Virtual Machine (hhvm) PHP Execution at the Speed of JIT](http://www.oscon.com/oscon2012/public/schedule/detail/25828)
* [Julien Verlaguet, Facebook: Analyzing PHP statically](http://cufp.org/conference/sessions/2013/julien-verlaguet-facebook-analyzing-php-statically)
* [Speeding up PHP-based development with HHVM](https://www.facebook.com/notes/facebook-engineering/speeding-up-php-based-development-with-hiphop-vm/10151170460698920)
* [Adding an opcode to HHBC](http://www.hhvm.com/blog/311/adding-an-opcode-to-hhbc)