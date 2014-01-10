#!/usr/bin/python
# -*- coding: utf-8 -*-

from feedgen.feed import FeedGenerator
fg = FeedGenerator()
fg.id('http://wuduoyi.com/')
fg.title("Wuduoyi's Note")
fg.author({'name':'Duoyi Wu','email':'duoyi.wu@gmail.com'})
fg.link(href='http://wuduoyi.com', rel='alternate')
fg.logo('http://wuduoiy.com/favicon.ico')
fg.link(href='http://wuduoyi.com/atom.xml', rel='self')
fg.description(description = u'Wuduoyi 的个人笔记')

fe = fg.add_entry()
fe.id('http://wuduoiy.com/note/hhvm/')
fe.link(link={'href': 'http://wuduoiy.com/note/hhvm/'})
fe.title(u'HHVM 是如何提升 PHP 性能的？')
fe.pubdate('2014-1-1 10:00:00 +0800')
fe.description(description = u'''
HHVM 是 Facebook 开发的高性能 PHP 虚拟机，宣称比官方的快9倍，我很好奇，于是抽空简单了解了一下，并整理出这篇文章
''')
fe.updated('2014-1-8 10:00:00 +0800')

fe = fg.add_entry()
fe.id('http://wuduoiy.com/note/2013/')
fe.link(link={'href': 'http://wuduoiy.com/note/2013/'})
fe.title(u'2013年的学习体会')
fe.pubdate('2014-1-4 10:00:00 +0800')
fe.description(description = u'''
记录我在 2013 年学到的各种东西
''')
fe.updated('2014-1-4 10:00:00 +0800')

fe = fg.add_entry()
fe.id('http://wuduoiy.com/note/io-2013/')
fe.link(link={'href': 'http://wuduoiy.com/note/io-2013/'})
fe.title(u'Google I/O 2013 笔记')
fe.pubdate('2014-1-1 10:00:00 +0800')
fe.description(description = u'''
Google I/O 2013 中很多视频的重点介绍
''')
fe.updated('2014-1-1 10:00:00 +0800')



fg.rss_file('rss.xml')
