---
layout: post
title: 浏览器的加载过程
tags: [browser]
---

* Will be replaced with the ToC
{:toc}

本文将探讨浏览器渲染的loading过程，主要有2个目的：

* 了解浏览器在loading过程中的实现细节，具体都做了什么
* 研究如何根据浏览器的实现原理进行优化，提升页面响应速度

由于loading和parsing是相互交织、错综复杂的，这里面有大量的知识点，为了避免过于发散本文将不会对每个细节都深入研究，而是将重点放在开发中容易控制的部分（Web前端和Web Server），同时由于浏览器种类繁多且不同版本间差距很大，本文将侧重一些较新的浏览器特性

## 现有知识

提升页面性能方面已经有很多前人的优秀经验了，如[Best Practices for Speeding Up Your Web Site](http://developer.yahoo.com/performance/rules.html)和[Web Performance Best Practices](http://code.google.com/speed/page-speed/docs/rules_intro.html)

本文主要专注其中加载部分的优化，总结起来主要有以下几点：

* 带宽
    * 使用CDN
    * 压缩js、css，图片优化
* HTTP优化
    * 减少转向
    * 减少请求数
    * 缓存
    * 尽早Flush
    * 使用gzip
    * 减少cookie
    * 使用GET
* DNS优化
    * 减少域名解析时间
    * 增多域名提高并发
* JavaScript
    * 放页面底部
    * defer/async
* CSS
    * 放页面头部
    * 避免@import
* 其它
    * 预加载

接下来就从浏览器各个部分的实现来梳理性能优化方法


## network

首先是网络层部分，这方面的实现大部分是通过调用操作系统或gui框架提供的api

### DNS

为了应对DNS查询的延迟问题，一些新的浏览器会缓存或预解析DNS，如当Chrome访问google页面的搜索结果时，它会取出链接中的域名进行预解析

当然，Chrome并不是每次都将页面中的所有链接的域名都拿来预解析，为了既提升用户体验又不会对DNS造成太大负担，Chrome做了很多细节的优化，如通过学习用户之前的行为来进行判断

Chrome在启动时还会预先解析用户常去的网站，具体可以参考[DNS Prefetching](http://www.chromium.org/developers/design-documents/dns-prefetching)，当前Chrome中的DNS缓存情况可以通过[net-internals](chrome://net-internals/#dns)页面来察看

为了帮助浏览器更好地进行DNS的预解析，可以在html中加上以下这句标签来提示浏览器

    <link rel="dns-prefetch" href="//HOSTNAME.com">

除此之外还可以使用HTTP header中的X-DNS-Prefetch-Control来控制浏览器是否进行预解析，它有on和off两个值，更详细的信息请参考[Controlling DNS prefetching](https://developer.mozilla.org/En/Controlling_DNS_prefetching)

### CDN

本文不打算详细讨论这个话题，感兴趣的读者可以阅读[Content delivery network](http://en.wikipedia.org/wiki/Content_Delivery_Network)

在性能方面与此相关的一个问题是用户可能使用自定义的DNS，如OpenDNS或Google的8.8.8.8，需要注意对这种情况进行处理

### link prefetch

由于Web页面加载是同步模型，这意味着浏览器在执行js操作时需要将后续html的加载和解析暂停，因为js中有可能会调用`document.write`来改变dom节点，很多浏览器除了html之外还会将css的加载暂停，因为js可能会获取dom节点的样式信息，这个暂停会导致页面展现速度变慢，为了应对这个问题，Mozilla等浏览器会在执行js的同时简单解析后面的html，提取出链接地址提前下载，注意这里仅是先下载内容，并不会开始解析和执行

这一行为还可以通过在页面中加入以下标签来提示浏览器

    <link rel="prefetch" href="http://">

但这种写法目前并没有成为正式的标准，也只有Mozilla真正实现了该功能，可以看看[Link prefetching FAQ](https://developer.mozilla.org/en/Link_prefetching_FAQ)

WebKit也在尝试该功能，具体实现是在[HTMLLinkElement](http://trac.webkit.org/browser/trunk/Source/WebCore/html/HTMLLinkElement.cpp#L196)的process成员函数中，它会调用ResourceHandle::prepareForURL()函数，目前从实现看它是仅仅用做DNS预解析的，和Mozilla对这个属性的处理不一致

对于不在当前页面中的链接，如果需要预下载后续内容可以用js来实现，请参考这篇文章[Preload CSS/JavaScript without execution](http://www.phpied.com/preload-cssjavascript-without-execution/)

预下载后续内容还能做很多细致的优化，如在[Velocity China
2010](http://velocity.oreilly.com.cn/index.php?func=session&name=%E5%8F%A6%E8%BE%9F%E8%B9%8A%E5%BE%84%E2%80%94%E2%80%94%E8%85%BE%E8%AE%AFweb%E5%BA%94%E7%94%A8%E7%9A%84%E4%BC%98%E5%8C%96%E6%96%B0%E6%80%9D%E8%B7%AF)中，来自腾讯的黄希彤介绍了腾讯产品中使用的交叉预下载方案，利用空闲时间段的流量来预加载，这样即提升了用户访问后续页面的速度，又不会影响到高峰期的流量，值得借鉴

### 预渲染

预渲染比预下载更进一步，不仅仅下载页面，而且还会预先将它渲染出来，目前在Chrome（9.0.597.0）中有实现，不过需要在about:flags中将'Web Page Prerendering'开启

不得不说Chrome的性能优化做得很细致，各方面都考虑到了，也难怪Chrome的速度很快

## http

在网络层之上我们主要关注的是HTTP协议，这里将主要讨论1.1版本，如果需要了解1.0和1.1的区别请参考[Key Differences between HTTP/1.0 and HTTP/1.1](http://www8.org/w8-papers/5c-protocols/key/key.html)

### header

首先来看http中的header部分

#### header大小

header的大小一般会有500 多字节，cookie内容较多的情况下甚至可以达到1k以上，而目前一般宽带都是上传速度慢过下载速度，所以如果小文件多时，甚至会出现页面性能瓶颈出在用户上传速度上的情况，所以缩小header体积是很有必要的，尤其是对不需要cookie的静态文件上，最好将这些静态文件放到另一个域名上

将静态文件放到另一个域名上会出现的现象是，一旦静态文件的域名出现问题就会对页面加载造成严重影响，尤其是放到顶部的js，如果它的加载受阻会导致页面展现长时间空白，所以对于流量大且内容简单的首页，最好使用内嵌的js和css

#### header的扩展属性

header中有些扩展属性可以用来保护站点，了解它们是有益处的

* [X-Frame-Options](https://developer.mozilla.org/en/the_x-frame-options_response_header)
    * 这个属性可以避免网站被使用frame、iframe的方式嵌入，解决使用js判断会被var location;破解的问题，IE8、Firefox3.6、Chrome4以上的版本都支持
* [X-XSS-Protection](http://msdn.microsoft.com/en-us/library/dd565647.aspx)
    * 这是IE8引入的扩展header，在默认情况下IE8会自动拦截明显的XSS攻击，如query中写script标签并在返回的内容中包含这项标签，如果需要禁止可以将它的值设为0，因为这个XSS过滤有可能导致问题，如[IE8 XSS Filter Bug](http://michael-coates.blogspot.com/2009/11/ie8-xss-filter-bug.html)
* [X-Requested-With](http://en.wikipedia.org/wiki/List_of_HTTP_header_fields)
    * 用来标识Ajax请求，大部分js框架都会加入这个header
* [X-Content-Type-Options](http://blogs.msdn.com/b/ie/archive/2008/09/02/ie8-security-part-vi-beta-2-update.aspx)
    * 如果是html内容的文件，即使用Content-Type: text/plain;的header，IE仍然会识别成html来显示，为了避免它所带来的安全隐患，在IE8中可以通过在header中设置X-Content-Type-Options: nosniff来关闭它的自动识别功能

### 使用get请求来提高性能

首先性能因素不应该是考虑使用get还是post的主要原因，首先关注的应该是否符合HTTP中标准中的约定，get应该用做数据的获取而不是提交

之所以用get性能更好的原因是[有测试表明](http://josephscott.org/archives/2009/08/xmlhttprequest-xhr-uses-multiple-packets-for-http-post/)，即使数据很小，大部分浏览器（除了Firefox）在使用post时也会发送两个TCP的packet，所以性能上会有损失

### 连接数

在HTTP/1.1协议下，单个域名的最大连接数在IE6中是2个，而在其它浏览器中一般4-8个，而整体最大链接数在30左右

而在HTTP/1.0协议下，IE6、7单个域名的最大链接数可以达到4个，在[Even Faster Web Sites](http://oreilly.com/catalog/9780596522308/)一书中的11章还推荐了对静态文件服务使用HTTP/1.0协议来提高IE6、7浏览器的速度

浏览器链接数的详细信息可以在[Browserscope](http://www.browserscope.org)上查到

使用多个域名可以提高并发，但前提是每个域名速度都是同样很快的，否则就会出现某个域名很慢会成为性能瓶颈的问题

### cache

主流浏览器都遵循http规范中的[Caching in HTTP](http://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)来实现的

从HTTP cache的角度来看，浏览器的请求分为2种类型：conditional requests 和 unconditional requests

unconditional请求是当本地没有缓存或强制刷新时发的请求，web server返回200的heder，并将内容发送给浏览器

而conditional则是当本地有缓存时的请求，它有两种：

1. 使用了Expires或Cache-Control，如果本地版本没有过期，浏览器不会发出请求
2. 如果过期了且使用了ETag或Last-Modified，浏览器会发起conditional请求，附上If-Modified-Since或If-None-Match的header，web server根据它来判断文件是否过期，如果没有过期就返回304的header（不返回内容），浏览器见到304后会直接使用本地缓存中的文件

以下是IE发送conditional requests的条件，从[MSDN](http://blogs.msdn.com/b/ieinternals/archive/2010/07/08/technical-information-about-conditional-http-requests-and-the-refresh-button.aspx)上抄来

* The cached item is no longer fresh according to Cache-Control or Expires
* The cached item was delivered with a VARY header
* The containing page was navigated to via META REFRESH
* JavaScript in the page called reload on the location object, passing TRUE
* The request was for a cross-host HTTPS resource on browser startup
* The user refreshed the page

简单的来说，点击刷新按钮或按下F5时会发出conditional请求,而按下ctrl的同时点击刷新按钮或按下F5时会发出unconditional请求

需要进一步学习请阅读：

* [Caching Tutorial](http://www.mnot.net/cache_docs/)
* [Caching Improvements in Internet Explorer 9](http://blogs.msdn.com/b/ie/archive/2010/07/14/caching-improvements-in-internet-explorer-9.aspx)

#### 前进后退的处理

浏览器会尽可能地优化前进后退，使得在前进后退时不需要重新渲染页面，就好像将当前页面先“暂停”了，后退时再重新运行这个“暂停”的页面

不过并不是所有页面都能“暂停”的，如当页面中有函数监听unload事件时，所以如果页面中的链接是原窗口打开的，对于unload事件的监听会影响页面在前进后时的性能

在新版的WebKit里，在事件的对象中新增了一个persisted属性，可以用它来区分首次载入和通过后退键载入这两种不同的情况，而在Firefox中可以使用[pageshow和pagehide](https://developer.mozilla.org/En/Using_Firefox_1.5_caching#New_browser_events)这两个事件

unload事件在浏览器的实现中有很多不确定性因素，所以不应该用它来记录重要的事情，而是应该通过定期更新cookie或定期保存副本（如用户备份编辑文章到草稿中）等方式来解决问题

具体细节可以参考WebKit上的这2篇文章：

* [WebKit Page Cache I – The Basic](http://webkit.org/blog/427/webkit-page-cache-i-the-basics/)
* [WebKit Page Cache II – The unload Event](http://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/)

### cookie

浏览器中对cookie的支持一般是网络层库来实现的，浏览器不需要关心，如IE使用的是[WinINET](http://msdn.microsoft.com/en-us/library/aa383630.aspx)

需要注意IE对cookie的支持是基于[pre-RFC Netscape draft spec for cookies](http://web.archive.org/web/20080205173011/wp.netscape.com/newsref/std/cookie_spec.html)的，和标准有些不同，在设定cookie时会出现转义不全导致的问题，如在ie和webkit中会忽略“=”，不过大部分web开发程序（如php语言）都会处理好，自行编写http交互时则需要注意

#### p3p问题

在IE中默认情况下iframe中的页面如果域名和当前页面不同，iframe中的页面是不会收到cookie的，这时需要通过设置p3p来解决，具体可以察看[微软官方的文档](http://msdn.microsoft.com/en-us/library/ms537343.aspx#unsatisfactory_cookies)，加上如下header即可

    P3P:CP="IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT"

这对于用iframe嵌入到其它网站中的第三方应用很重要

### 编码识别

页面的编码可以在http header或meta标签中指明，对于没有指明编码的页面，浏览器会根据是否设置了auto detect来进行编码识别（如在chrome中的View-Encoding菜单）

关于编码识别，Mozilla开源了其中的[Mozilla Charset Detectors](http://www.mozilla.org/projects/intl/chardet.html)模块，感兴趣的可以对其进行学习

建议在http
header中指定编码，如果是在meta中指定，浏览器在得到html页面后会首先读取一部分内容，进行简单的meta标签解析来获得页面编码，如WebKit代码中的[HTMLMetaCharsetParser.cpp](http://trac.webkit.org/browser/trunk/Source/WebCore/html/parser/HTMLMetaCharsetParser.cpp)，可以看出它的实现是查找charset属性的值，除了WebKit以外的其它浏览器也是类似的做法，这就是为何HTML5中直接使用如下的写法浏览器都支持

    <meta charset="utf-8">

需要注意不设定编码会导致不可预测的问题，应尽可能做到明确指定

### chunked

浏览器在加载html时，只要网络层返回一部分数据后就会开始解析，并下载其中的js、图片，而不需要等到所有html都下载完成才开始，这就意味着如果可以分段将数据发送给浏览器，就能提高页面的性能，这就是chunked的作用，具体协议细节请参考[Chunked Transfer Coding](http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.6.1)

在具体实现上，php中可以通过[flush](http://www.php.net/flush)函数来实现，不过其中有不少需要注意的问题，如php的配置、web server、某些IE版本的问题等，具体请参考php文档及评论

注意这种方式只适用于html页面，对于xml类型的页面，由于xml的严格语法要求，浏览器只能等到xml全部下载完成后才会开始解析，这就意味着同等情况下，xml类型的页面展现速度必然比html慢，所以不推荐使用xml

即使不使用这种http传输方式，浏览器中html加载也是边下载边解析的，而不需等待所有html内容都下载完才开始，所以实际上chunked主要节省的是等待服务器响应的时间，因为这样可以做到服务器计算完一部分页面内容后就立刻返回，而不是等到所有页面都计算都完成才返回，将操作并行

另外Facebook所使用的[BigPipe](http://www.facebook.com/notes/facebook-engineering/bigpipe-pipelining-web-pages-for-high-performance/389414033919)实际上是在应用层将页面分为了多个部分，从而做到了服务端和浏览器计算的并行

### keepalive

keepalive使得在完成一个请求后可以不关闭socket连接，后续可以重复使用该连接发送请求，在HTTP/1.0和HTTP/1.1中都有支持，在HTTP/1.1中默认是打开的

keepalive在浏览器中都会有超时时间，避免长期和服务器保持连接，如IE是60秒

另外需要注意的是如果使用阻塞IO（如apache），开启keepalive保持连接会很消耗资源，可以考虑使用nginx、lighttpd等其它web server，具体请参考相关文档，这里就不展开描述

### pipelining

pipelining是HTTP/1.1协议中的一个技术，能让多个HTTP请求同时通过一个socket传输，注意它和keepalive的区别，keepalive能在一个socket中传输多个HTTP，但这些HTTP请求都是串行的，而pipelining是串行的

可惜目前绝大部分浏览器在默认情况下都不支持，已知目前只有opera是默认支持的，加上很多网络代理对其支持不好导致容易出现各种问题，所以并没有广泛应用

### SPDY

[SPDY](http://www.chromium.org/spdy/)是google提出的对HTTP协议的改进，主要是目的是提高加载速度，主要有几点：

* Mutiplexed streams
    * 可以在一个TCP中传输各种数据，减少链接的耗时
* Request prioritization
    * 请求分级，便于发送方定义哪些请求是重要的
* HTTP header compression
    * header压缩，减少数据量

## frame

从实现上看，frame类（包括iframe和frameset）的标签是最耗时的，而且会导致多一个请求，所以最好减少frame数量

### resticted

如果要嵌入不信任的网站，可以使用这个属性值来禁止页面中js、ActiveX的执行，可以参考[msdn的文档](http://msdn.microsoft.com/en-us/library/ms534622.aspx)

    <iframe security="restricted" src=""></iframe>

## javascript

### 加载

对于html的script标签，如果是外链的情况，如：

    <script src="a.js"></script>

浏览器对它的处理主要有2部分：下载和执行

下载在有些浏览器中是并行的，有些浏览器中是串行的，如IE8、Firefox3、Chrome2都是串行下载的

执行在所有浏览器中默认都是阻塞的，当js在执行时不会进行html解析等其它操作，所以页面顶部的js不宜过大，因为那样将导致页面长时间空白，对于这些外链js，有2个属性可以减少它们对页面加载的影响，分别是：

* async
    * 标识js是否异步执行，当有这个属性时则不阻塞当前页面的加载，并在js下载完后立刻执行
    * 不能保证多个script标签的执行顺序
* defer
    * 标示js是否延迟执行，当有这个属性时js的执行会推迟到页面解析完成之后
    * 可以保证多个script标签的执行顺序

下图来自[Asynchronous and deferred JavaScript execution explained](http://peter.sh/experiments/asynchronous-and-deferred-javascript-execution-explained/)，清晰地解释了普通情况和这2种情况下的区别

![defer-async](/browser/what-happen-when-browser-loading-the-page/defer-async.jpg)

需要注意的是这两个属性目前对于内嵌的js是无效的

而对于dom中创建的script标签在浏览器中则是异步的，如下所示：

{% highlight javascript %}
    var script = document.createElement('script'); 
    script.src = 'a.js'; 
    document.getElementsByTagName('head')[0].appendChild(script);
{% endhighlight %}

为了解决js阻塞页面的问题，可以利用浏览器不认识的属性来先下载js后再执行，如[ControlJS](http://stevesouders.com/controljs/)就是这样做的，它能提高页面的相应速度，不过需要注意处理在js未加载完时的显示效果

### document.write

document.write是不推荐的api，对于标示有async或defer属性的script标签，使用它会导致不可预料的结果，除此之外还有以下场景是不应该使用它的：

* 使用document.createElement创建的script
* 事件触发的函数中，如onclick
* setTimeout/setInterval

简单来说，document.write只适合用在外链的script标签中，它最常见的场景是在广告中，由于广告可能包含大量html，这时需要注意标签的闭合，如果写入的内容很多，为了避免受到页面的影响，可以使用类似[Google AdSense](https://www.google.com/adsense/)的方式，通过创建iframe来放置广告，这样做还能减少广告中的js执行对当前页面性能的影响

另外，可以使用[ADsafe](http://www.adsafe.org)等方案来保证嵌入第三方广告的安全，请参考[如何安全地嵌入第三方js – FBML/caja/sandbox/ADsafe简介](http://www.baiduux.com/blog/2010/07/07/js-safe/)

### script标签放底部

将script标签放底部可以提高页面展现给用户的速度，然而很多时候事情并没那么简单，如页面中的有些功能是依赖js的，所以更多的还需要根据实际需求进行调整

* 尝试用[Doloto](http://msdn.microsoft.com/en-us/devlabs/ee423534.aspx)分析出哪些JS和初始展现是无关的，将那些不必要的js延迟加载
* 手工进行分离，如可以先显示出按钮，但状态是不可点，等JS加载完成后再改成可点的

### 传输

js压缩可以使用[YUI Compressor](http://developer.yahoo.com/yui/compressor/)或[Closure Compiler](http://code.google.com/closure/compiler/)

gwt中的js压缩还针对gzip进行了优化，进一步减小传输的体积，具体请阅读[On Reducing the Size of Compressed Javascript](http://timepedia.blogspot.com/2009/08/on-reducing-size-of-compressed.html)

## css

比起js放底部，css放页面顶部就比较容易做到

### @import

使用@import在IE下会由于css加载延后而导致页面展现比使用link标签慢，不过目前几乎没有人使用@import，所以问题不大，具体细节请参考[don’t use @import](http://www.stevesouders.com/blog/2009/04/09/dont-use-import/)

### selector的优化

浏览器在构建DOM树的过程中会同时构建Render树，我们可以简单的认为浏览器在遇到每一个DOM节点时，都会遍历所有selector来判断这个节点会被哪些selector影响到

不过实际上浏览器一般是从右至左来判断selector是否命中的，对于ID、Class、Tag、Universal和Page的规则是通过hashmap的方式来查找的，它们并不会遍历所有selector，所以selector越精确越好，google page-speed中的一篇文档[Use efficient CSS selectors](http://code.google.com/speed/page-speed/docs/rendering.html#UseEfficientCSSSelectors)详细说明了如何优化selector的写法

另一个比较好的方法是从架构层面进行优化，将页面不同部分的模块和样式绑定，通过不同组合的方式来生成页面，避免后续页面顶部的css只增不减，越来越复杂和混乱的问题，可以参考[Facebook的静态文件管理](http://velocity.oreilly.com.cn/index.php?func=session&name=%E9%9D%99%E6%80%81%E7%BD%91%E9%A1%B5%E8%B5%84%E6%BA%90%E7%9A%84%E7%AE%A1%E7%90%86%E5%92%8C%E4%BC%98%E5%8C%96)

## 工具

以下整理一些性能优化相关的工具及方法

### Browserscope

之前提到的<http://www.browserscope.org>收集了各种浏览器参数的对比，如最大链接数等信息，方便参考

### Navigation Timing

[Navigation Timing](http://www.w3.org/TR/navigation-timing/)是还在草案中的获取页面性能数据api，能方便页面进行性能优化的分析

传统的页面分析方法是通过javascript的时间来计算，无法获取页面在网络及渲染上所花的时间，使用Navigation Timing就能很好地解决这个问题，具体它能取到哪些数据可以通过下图了解（来自w3c）

![timing-overview](/browser/what-happen-when-browser-loading-the-page/timing-overview.png)
 
目前这个api较新，目前只在一些比较新的浏览器上有支持，如Chrome、IE9，但也占用一定的市场份额了，可以现在就用起来

### boomerang

yahoo开源的一个页面性能检测工具，它的原理是通过监听页面的onbeforeunload事件，然后设置一个cookie，并在另一个页面中设置onload事件，如果cookie中有设置且和页面的refer保持一致，则通过这两个事件的事件来衡量当前页面的加载时间

另外就是通过静态图片来衡量带宽和网络延迟，具体可以看[boomerang](https://github.com/yahoo/boomerang)

### 检测工具

* [Speed Tracer](https://chrome.google.com/extensions/detail/ognampngfcbddbfemdapefohjiobgbdl)
* [Yahoo! YSlow](http://developer.yahoo.com/yslow/)
* [Page Speed](http://code.google.com/speed/page-speed/)
* [dynaTrace AJAX](http://ajax.dynatrace.com/ajax/en/)

## reference

* [Browser Performance Wishlist](http://www.stevesouders.com/blog/2010/02/15/browser-performance-wishlist/)
* [HTML5](http://dev.w3.org/html5/spec/Overview.html)
* [Testing Page Load Speed](http://weblogs.mozillazine.org/hyatt/archives/2004_05.html#005496)
* [Technically speaking, what makes Google Chrome fast?](http://blog.chromium.org/2009/12/technically-speaking-what-makes-google.html)
* [Optimizing Page Load Time](http://www.die.net/musings/page_load_time/)
* [An Engineer’s Guide to Bandwidth](http://developer.yahoo.com/blogs/ydn/posts/2009/10/a_engineers_gui/)
* [An Engineer’s Guide to DNS](http://developer.yahoo.com/blogs/ydn/posts/2009/11/guide_to_dns/)
* [EricLaw's IEInternals](http://blogs.msdn.com/b/ieinternals/)
* [Internet Explorer Platform for Privacy Preferences (P3P) Standards Support Document](http://msdn.microsoft.com/en-us/library/ff460558.aspx)
* [COMET Streaming in Internet Explorer](http://blogs.msdn.com/b/ieinternals/archive/2010/04/06/comet-streaming-in-internet-explorer-with-xmlhttprequest-and-xdomainrequest.aspx)
* [Internet Explorer Cookie Internals (FAQ)](http://blogs.msdn.com/b/ieinternals/archive/2009/08/20/wininet-ie-cookie-internals-faq.aspx)
* [Fiddler PowerToy - Part 2: HTTP Performance](http://msdn.microsoft.com/en-us/library/bb250442.aspx)
* [Frontend SPOF](http://www.stevesouders.com/blog/2010/06/01/frontend-spof/)
* [XMLHttpRequest (XHR) Uses Multiple Packets for HTTP POST?](http://josephscott.org/archives/2009/08/xmlhttprequest-xhr-uses-multiple-packets-for-http-post/)
* [WebKit Page Cache I – The Basics](http://webkit.org/blog/427/webkit-page-cache-i-the-basics/)
* [WebKit Page Cache II – The unload Event](http://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/)

