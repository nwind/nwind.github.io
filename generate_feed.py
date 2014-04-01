#!/usr/bin/python
# -*- coding: utf-8 -*-

from feedgen.feed import FeedGenerator
fg = FeedGenerator()
fg.id('http://wuduoyi.com/')
fg.title("Wuduoyi's Note")
fg.author({'name':'Duoyi Wu','email':'duoyi.wu@gmail.com'})
fg.link(href='http://wuduoyi.com', rel='alternate')
fg.logo('http://wuduoyi.com/favicon.ico')
fg.link(href='http://wuduoyi.com/atom.xml', rel='self')
fg.description(description = u'Wuduoyi 的个人笔记')

fe = fg.add_entry()
fe.id('http://wuduoyi.com/note/G-ossip/')
fe.link(link={'href': 'http://wuduoyi.com/note/G-ossip/'})
fe.title(u'八卦某 G 的前端开发方式及流程')
fe.pubdate('2014-4-1 10:00:00 +0800')
fe.description(description = u'''
    话说本人从毕业到现在一直在某 B 公司工作，前些年折腾过不少开发方式和工具，但总觉得或许有更好的方案，所以很好奇其它公司内部是如何工作的，我曾经浏览过某 Y 公司内部无所不包的 TWiki，也拜访过某 F 总部了解他们的开发流程，但对某 G 公司却了解不多，只零零碎碎知道一些，这两天抽空梳理了之前收集到的各种资料，希望能给 FEX 后续改进提供参考。
''')
fe.updated('2014-4-1 10:00:00 +0800')

fe = fg.add_entry()
fe.id('http://wuduoyi.com/note/hhvm/')
fe.link(link={'href': 'http://wuduoyi.com/note/hhvm/'})
fe.title(u'HHVM 是如何提升 PHP 性能的？')
fe.pubdate('2014-1-1 10:00:00 +0800')
fe.description(description = u'''
HHVM 是 Facebook 开发的高性能 PHP 虚拟机，宣称比官方的快9倍，我很好奇，于是抽空简单了解了一下，并整理出这篇文章
''')
fe.updated('2014-1-8 10:00:00 +0800')

fe = fg.add_entry()
fe.id('http://wuduoyi.com/note/2013/')
fe.link(link={'href': 'http://wuduoyi.com/note/2013/'})
fe.title(u'2013年的学习体会')
fe.pubdate('2014-1-4 10:00:00 +0800')
fe.description(description = u'''
记录我在 2013 年学到的各种东西
''')
fe.updated('2014-1-4 10:00:00 +0800')

fe = fg.add_entry()
fe.id('http://wuduoyi.com/note/io-2013/')
fe.link(link={'href': 'http://wuduoyi.com/note/io-2013/'})
fe.title(u'Google I/O 2013 笔记')
fe.pubdate('2014-1-1 10:00:00 +0800')
fe.description(description = u'''
Google I/O 2013 中很多视频的重点介绍
''')
fe.updated('2014-1-1 10:00:00 +0800')



fg.rss_file('rss.xml')
