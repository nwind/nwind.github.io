// brought to you by nwind

function Waterfall(elm, wrapElm, config) {
    this.config = {
        columnWidth : 400,
        paddingWidth: 20
    };
    this.contentElm = elm;
    this.wrapElm = wrapElm;
    var me = this;
    baidu.event.on(window, 'resize', function() {
        me._doLayout();
    });
}

Waterfall.prototype._calcColumnNumber = function() {
    //ie scrollbar problem?
    var pageWidth = baidu.page.getViewWidth();
    var columnWidth = this.config.columnWidth;
    var paddingWidth = this.config.paddingWidth;
    if (pageWidth < columnWidth) {
        return 1;
    }

    var num = 2;
    while(num * columnWidth + (num - 1) * paddingWidth < pageWidth) {
        num = num + 1;
    }
    return num - 1;
};

Waterfall.prototype._doLayout = function() {
    var columnNumber = this._calcColumnNumber();
    var columnWidth = this.config.columnWidth;
    var paddingWidth = this.config.paddingWidth;
    var wrapElmWidth = columnNumber * columnWidth + (columnNumber - 1) * paddingWidth;
    this.wrapElm.style.width = wrapElmWidth + 'px';
    var cells = baidu.dom.q('cell', this.contentElm);
    //just use static position is enough for small window

    if (columnNumber == 1) {
        baidu.array.each(cells, function(cell) {
            cell.style.position = 'static';
            cell.style.marginBottom = this.paddingWidth + 'px';
        });
    } else if (columnNumber == 0 ) {
        alert('bad things happen, but we will fix that.');
    } else {
        var columnHeightMap = {};
        baidu.array.each(cells, function(cell, index) {
            cell.style.width = columnWidth + 'px';
            var width = cell.offsetWidth;
            var height = cell.offsetHeight;
            var column = index % columnNumber;
            var top = 0;
            if (column in columnHeightMap) {
                top = columnHeightMap[column];
                columnHeightMap[column] += height + paddingWidth;
            } else {
                columnHeightMap[column] = height + paddingWidth;
            }

            var left = 0;
            if (index != 0) {
                var left = column * (paddingWidth + width);
            }
            cell.style.left = left + 'px';
            cell.style.top = top + 'px';
        });
    }
};

Waterfall.prototype.show = function() {
    this._doLayout();
    this.contentElm.style.visibility = 'visible';
};


