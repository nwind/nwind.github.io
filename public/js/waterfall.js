// brought to you by nwind
// feel free to change everything

function Waterfall(elm, wrapElm, config) {
    this.config = {
        columnWidth : 410,
        paddingWidth: 15
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

Waterfall.prototype._calcColors = function(number) {
    var div = (1 / number);
    var colors = [];
    var cricle = 18;

    for (var i=0; i<number; i++) {
        var hue = i * div;
        var rgb = hsb2rgb(hue, 0.26, 0.95);
        colors.push(rgb.hex);
    }
    return colors;
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
        var colors = this._calcColors(cells.length);
        baidu.array.each(cells, function(cell, index) {
            cell.style.width = columnWidth + 'px';
            var width = cell.offsetWidth;
            var height = cell.offsetHeight;
            var column = index % columnNumber;
            var h3 = cell.getElementsByTagName('h3')[0];
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
            h3.style.backgroundColor = colors[index];
        });
    }
};

Waterfall.prototype.show = function() {
    this._doLayout();
    this.contentElm.style.visibility = 'visible';
};


// color conver is from http://raphaeljs.com/
function hsb2rgb(h, s, b, o) {
    return hsl2rgb(h, s, b / 2, o);
};

function hsl2rgb(h, s, l, o) {
    if (h > 1 || s > 1 || l > 1) {
        h /= 360;
        s /= 100;
        l /= 100;
    }
    var rgb = {},
        channels = ["r", "g", "b"],
        t2, t1, t3, r, g, b;
    if (!s) {
        rgb = {
            r: l,
            g: l,
            b: l
        };
    } else {
        if (l < .5) {
            t2 = l * (1 + s);
        } else {
            t2 = l + s - l * s;
        }
        t1 = 2 * l - t2;
        for (var i = 0; i < 3; i++) {
            t3 = h + 1 / 3 * -(i - 1);
            t3 < 0 && t3++;
            t3 > 1 && t3--;
            if (t3 * 6 < 1) {
                rgb[channels[i]] = t1 + (t2 - t1) * 6 * t3;
            } else if (t3 * 2 < 1) {
                rgb[channels[i]] = t2;
            } else if (t3 * 3 < 2) {
                rgb[channels[i]] = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
            } else {
                rgb[channels[i]] = t1;
            }
        }
    }
    rgb.r *= 255;
    rgb.g *= 255;
    rgb.b *= 255;
    rgb.hex = "#" + (16777216 | rgb.b | (rgb.g << 8) | (rgb.r << 16)).toString(16).slice(1);
    return rgb;
};
