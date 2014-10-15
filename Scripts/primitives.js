var Draw = {
    initialize: function (ctx, canvas) {
        if (canvas) {
            ctx.width = canvas.width;
            ctx.height = canvas.height;
        }
        for (var drawMethodName in Draw) {
            ctx[drawMethodName] = Draw[drawMethodName];
        }
        for (drawMethodName in FastDraw) {
            ctx["fast" + drawMethodName] = FastDraw[drawMethodName];
        }
    },
    pixel: function (x, y, color) {
        var img = this.createImageData(1, 1);
        img.data[0] = color.red;
        img.data[1] = color.green;
        img.data[2] = color.blue;
        img.data[3] = 255;
        this.putImageData(img, x, y);
    },
    dottedLine: function (x0, y0, x1, y1, empty, solid, color) {
        if (!solid) return;
        var dy = y1 - y0,
            dx = x1 - x0,
            stepx, stepy,
            emptycount = empty,
            solidcount = solid;
        if (dy < 0) {
            dy = -dy;
            stepy = -1;
        } else {
            stepy = 1;
        }
        if (dx < 0) {
            dx = -dx;
            stepx = -1;
        } else {
            stepx = 1;
        }
        dy <<= 1; // dy is now 2*dy
        dx <<= 1; // dx is now 2*dx
        this.pixel(x0, y0, color); // always start with solid pixels
        solidcount--;
        if (dx > dy) {
            var fraction = dy - (dx >> 1); // same as 2*dy - dx
            while (x0 != x1) {
                if (fraction >= 0) {
                    y0 += stepy;
                    fraction -= dx; // same as fraction -= 2*dx
                }
                x0 += stepx;
                fraction += dy; // same as fraction -= 2*dy
                if (empty == 0) {
                    // always draw a pixel ... no dotted line requested
                    this.pixel(x0, y0, color);
                } else if (solidcount != 0) {
                    // Draw solid pxiel and decrement counter
                    this.pixel(x0, y0, color);
                    solidcount--;
                } else if (emptycount != 0) {
                    // Empty pixel ... don't draw anything an decrement counter
                    emptycount--;
                } else {
                    // Reset counters and draw solid pixel
                    emptycount = empty;
                    solidcount = solid;
                    this.pixel(x0, y0, color);
                    solidcount--;
                }
            }
        } else {
            fraction = dx - (dy >> 1);
            while (y0 != y1) {
                if (fraction >= 0) {
                    x0 += stepx;
                    fraction -= dy;
                }
                y0 += stepy;
                fraction += dx;
                if (empty == 0) {
                    // always draw a pixel ... no dotted line requested
                    this.pixel(x0, y0, color);
                }
                if (solidcount != 0) {
                    // Draw solid pixel and decrement counter
                    this.pixel(x0, y0, color);
                    solidcount--;
                } else if (emptycount != 0) {
                    // Empty pixel ... don't draw anything an decrement counter
                    emptycount--;
                } else {
                    // Reset counters and draw solid pixel
                    emptycount = empty;
                    solidcount = solid;
                    this.pixel(x0, y0, color);
                    solidcount--;
                }
            }
        }
    },
    line: function (x0, y0, x1, y1, color) {
        this.dottedLine(x0, y0, x1, y1, 0, 1, color);
    },
    circlePoints: function (cx, cy, x, y, color) {
        if (x == 0) {
            this.pixel(cx, cy + y, color);
            this.pixel(cx, cy - y, color);
            this.pixel(cx + y, cy, color);
            this.pixel(cx - y, cy, color);
        } else if (x == y) {
            this.pixel(cx + x, cy + y, color);
            this.pixel(cx - x, cy + y, color);
            this.pixel(cx + x, cy - y, color);
            this.pixel(cx - x, cy - y, color);
        } else if (x < y) {
            this.pixel(cx + x, cy + y, color);
            this.pixel(cx - x, cy + y, color);
            this.pixel(cx + x, cy - y, color);
            this.pixel(cx - x, cy - y, color);
            this.pixel(cx + y, cy + x, color);
            this.pixel(cx - y, cy + x, color);
            this.pixel(cx + y, cy - x, color);
            this.pixel(cx - y, cy - x, color);
        }
    },
    circle: function (xCenter, yCenter, radius, color) {
        var x = 0,
            y = radius,
            p = Math.floor((5 - radius * 4) / 4);
        this.circlePoints(xCenter, yCenter, x, y, color);
        while (x < y) {
            x++;
            if (p < 0) {
                p += 2 * x + 1;
            } else {
                y--;
                p += 2 * (x - y) + 1;
            }
            this.circlePoints(xCenter, yCenter, x, y, color);
        }
    },
    circleFilled: function (xCenter, yCenter, radius, color) {
        var f = 1 - radius,
            ddFx = 1,
            ddFy = -2 * radius,
            x = 0,
            y = radius;
        this.line(
            xCenter,
            yCenter - radius < 0 ? 0 : (yCenter - radius),
            xCenter,
            (yCenter - radius) + (2 * radius), color);
        while (x < y) {
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            var xcPx = xCenter + x;
            var xcMx = xCenter - x;
            var xcPy = xCenter + y;
            var xcMy = xCenter - y;
            var ycMx = yCenter - x;
            var ycMy = yCenter - y;
            this.line(xcPx, ycMy, xcPx, ycMy + 2 * y, color);
            this.line(xcMx, ycMy, xcMx, ycMy + 2 * y, color);
            this.line(xcPy, ycMx, xcPy, ycMx + 2 * x, color);
            this.line(xcMy, ycMx, xcMy, ycMx + 2 * x, color);
        }
    },
    cornerFilled: function (xCenter, yCenter, radius, position, color) {
        var f = 1 - radius,
            ddFx = 1,
            ddFy = -2 * radius,
            x = 0,
            y = radius;
        switch (position) {
            case cornerPosition.TopRight:
            case cornerPosition.TopLeft:
                this.line(xCenter, yCenter - radius < 0 ? 0 : yCenter - radius, xCenter, yCenter, color);
                break;
            case cornerPosition.BottomRight:
            case cornerPosition.BottomLeft:
                this.line(xCenter, yCenter - radius < 0 ? 0 : yCenter, xCenter, (yCenter - radius) + (2 * radius), color);
                break;
        }
        while (x < y) {
            if (f >= 0) {
                y--;
                ddFy += 2;
                f += ddFy;
            }
            x++;
            ddFx += 2;
            f += ddFx;
            var xcPx = xCenter + x,
                xcMx = xCenter - x,
                xcPy = xCenter + y,
                xcMy = xCenter - y,
                ycMx = yCenter - x,
                ycMy = yCenter - y;
            switch (position) {
                case cornerPosition.TopRight:
                    this.line(xcPx, ycMy, xcPx, yCenter, color);
                    this.line(xcPy, ycMx, xcPy, yCenter, color);
                    break;
                case cornerPosition.BottomRight:
                    this.line(xcPx, yCenter, xcPx, ycMy + 2 * y, color);
                    this.line(xcPy, yCenter, xcPy, ycMx + 2 * x, color);
                    break;
                case cornerPosition.TopLeft:
                    this.line(xcMx, ycMy, xcMx, yCenter, color);
                    this.line(xcMy, ycMx, xcMy, yCenter, color);
                    break;
                case cornerPosition.BottomLeft:
                    this.line(xcMx, yCenter, xcMx, ycMy + 2 * y, color);
                    this.line(xcMy, yCenter, xcMy, ycMx + 2 * x, color);
                    break;
            }
        }
    },
    arrow: function (x, y, size, direction, color) {
        this.pixel(x, y, color);
        if (size == 1) return;
        switch (direction) {
            case drawingDirection.Left:
                for (var i = 1; i < size; i++) {
                    this.line(x + i, y - i, x + i, y + i, color);
                }
                break;
            case drawingDirection.Right:
                for (i = 1; i < size; i++) {
                    this.line(x - i, y - i, x - i, y + i, color);
                }
                break;
            case drawingDirection.Up:
                for (i = 1; i < size; i++) {
                    this.line(x - i, y + i, x + i, y + i, color);
                }
                break;
            case drawingDirection.Down:
                for (i = 1; i < size; i++) {
                    this.line(x - i, y - i, x + i, y - i, color);
                }
                break;
            default:
                break;
        }
    },
    rectangle: function (x0, y0, x1, y1, color) {
        x0 += 0.5; x1 += 0.5; y0 += 0.5; y1 += 0.5;
        this.lineWidth = 1;
        this.strokeStyle = Color.html(color);
        this.beginPath();
        this.rect(x0, y0, x1 - x0, y1 - y0);
        this.stroke();
    },
    rectangleFilled: function (x0, y0, x1, y1, color) {
        if (y1 < y0) { // Switch y1 and y0
            var y = y1;
            y1 = y0;
            y0 = y;
        }
        if (x1 < x0) { // Switch x1 and x0
            var x = x1;
            x1 = x0;
            x0 = x;
        }
        x1++; y1++;
        this.fillStyle = Color.html(color);
        this.beginPath();
        this.rect(x0, y0, x1 - x0, y1 - y0);
        this.fill();
    },
    rectangleRounded: function (x0, y0, x1, y1, color, radius, corners) {
        if (corners == roundedCornerStyle.None) {
            this.rectangleFilled(x0, y0, x1, y1, color);
            return;
        }
        // Calculate height
        if (y1 < y0) {
            var y = y1;
            y1 = y0;
            y0 = y;
        }
        var h = y1 - y0;
        // Check radius
        if (radius > h / 2) {
            radius = Math.floor(h / 2);
        }
        radius -= 1;

        // Draw body
        this.rectangleFilled(x0 + radius, y0, x1 - radius, y1, color);
        switch (corners) {
            case roundedCornerStyle.All:
                this.circleFilled(x0 + radius, y0 + radius, radius, color);
                this.circleFilled(x1 - radius, y0 + radius, radius, color);
                this.circleFilled(x0 + radius, y1 - radius, radius, color);
                this.circleFilled(x1 - radius, y1 - radius, radius, color);
                if (radius * 2 + 1 < h) {
                    this.rectangleFilled(x0, y0 + radius, x0 + radius, y1 - radius, color);
                    this.rectangleFilled(x1 - radius, y0 + radius, x1, y1 - radius, color);
                }
                break;
            case roundedCornerStyle.Top:
                this.circleFilled(x0 + radius, y0 + radius, radius, color);
                this.circleFilled(x1 - radius, y0 + radius, radius, color);
                this.rectangleFilled(x0, y0 + radius, x0 + radius, y1, color);
                this.rectangleFilled(x1 - radius, y0 + radius, x1, y1, color);
                break;
            case roundedCornerStyle.Bottom:
                this.circleFilled(x0 + radius, y1 - radius, radius, color);
                this.circleFilled(x1 - radius, y1 - radius, radius, color);
                this.rectangleFilled(x0, y0, x0 + radius, y1 - radius, color);
                this.rectangleFilled(x1 - radius, y0, x1, y1 - radius, color);
                break;
            case roundedCornerStyle.Left:
                this.circleFilled(x0 + radius, y0 + radius, radius, color);
                this.circleFilled(x0 + radius, y1 - radius, radius, color);
                if (radius * 2 + 1 < h) {
                    this.rectangleFilled(x0, y0 + radius, x0 + radius, y1 - radius, color);
                }
                this.rectangleFilled(x1 - radius, y0, x1, y1, color);
                break;
            case roundedCornerStyle.Right:
                this.circleFilled(x1 - radius, y0 + radius, radius, color);
                this.circleFilled(x1 - radius, y1 - radius, radius, color);
                if (radius * 2 + 1 < h) {
                    this.rectangleFilled(x1 - radius, y0 + radius, x1, y1 - radius, color);
                }
                this.rectangleFilled(x0, y0, x0 + radius, y1, color);
                break;
            default:
                break;
        }
    },
    triangle: function (x0, y0, x1, y1, x2, y2, color) {
        this.line(x0, y0, x1, y1, color);
        this.line(x1, y1, x2, y2, color);
        this.line(x2, y2, x0, y0, color);
    },
    triangleFilled: function (x0, y0, x1, y1, x2, y2, color) {
        if (y0 > y1) { // Re-order vertices by ascending Y values (smallest first)
            var t = y0;
            y0 = y1;
            y1 = t;
            t = x0;
            x0 = x1;
            x1 = t;
        }
        if (y1 > y2) {
            t = y1;
            y1 = y2;
            y2 = t;
            t = x1;
            x1 = x2;
            x2 = t;
        }
        if (y0 > y1) {
            t = y0;
            y0 = y1;
            y1 = t;
            t = x0;
            x0 = x1;
            x1 = t;
        }
        // Scanline co-ordinates
        var sx1 = Math.floor(x0 * 1000),
            sx2 = sx1,
            sy = y0;
        // Calculate interpolation deltas
        var dx1 = (y1 - y0 > 0) ? Math.floor(((x1 - x0) * 1000) / (y1 - y0)) : 0;
        var dx2 = (y2 - y0 > 0) ? Math.floor(((x2 - x0) * 1000) / (y2 - y0)) : 0;
        var dx3 = (y2 - y1 > 0) ? Math.floor(((x2 - x1) * 1000) / (y2 - y1)) : 0;
        // Render scanlines (horizontal lines are the fastest rendering method)
        if (dx1 > dx2) {
            for (; sy <= y1; sy++, sx1 += dx2, sx2 += dx1) {
                this.line(Math.floor(sx1 / 1000), sy, Math.floor(sx2 / 1000), sy, color);
            }
            sx2 = x1 * 1000;
            sy = y1;
            for (; sy <= y2; sy++, sx1 += dx2, sx2 += dx3) {
                this.line(Math.floor(sx1 / 1000), sy, Math.floor(sx2 / 1000), sy, color);
            }
        } else {
            for (; sy <= y1; sy++, sx1 += dx1, sx2 += dx2) {
                this.line(Math.floor(sx1 / 1000), sy, Math.floor(sx2 / 1000), sy, color);
            }
            sx1 = x1 * 1000;
            sy = y1;
            for (; sy <= y2; sy++, sx1 += dx3, sx2 += dx2) {
                this.line(Math.floor(sx1 / 1000), sy, Math.floor(sx2 / 1000), sy, color);
            }
        }
    },
    progressBar: function (x, y, w, h, borderCorners, progressCorners, borderColor, borderFillColor, progressBorderColor, progressFillColor, progress) {
        // Draw border with rounded corners
        this.rectangleRounded(x, y, x + w, y + h, borderColor, 5, borderCorners);
        this.rectangleRounded(x + 1, y + 1, x + w - 1, y + h - 1, borderFillColor, 5, borderCorners);
        // Progress bar
        if (progress > 0 && progress <= 100) {
            // Calculate bar size
            var bw = (w - 6); // bar at 100%
            if (progress != 100) {
                bw = Math.floor((bw * progress) / 100);
            }
            this.rectangleRounded(x + 3, y + 3, bw + x + 3, y + h - 3, progressBorderColor, 5, progressCorners);
            this.rectangleRounded(x + 4, y + 4, bw + x + 3 - 1, y + h - 4, progressFillColor, 5, progressCorners);
        }
    },
    setColor: function (data, index, on, color) {
        if (on) {
            data[index] = color.red;
            data[index + 1] = color.green;
            data[index + 2] = color.blue;
            data[index + 3] = 255;
        }
        else {
            data[index] = data[index + 1] = data[index + 2] = data[index + 3] = 0;
        }
    },
    icon16: function (x, y, color, icon) {
        if (!icon.cache || !Color.areEqual(icon.cache.color, color)) {
            icon.cache = { color: color };
        }
        if (!icon.cache.canvas) {
            var canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d");
            canvas.width = canvas.height = 16;
            var bitmap = ctx.createImageData(16, 16),
                data = bitmap.data,
                i = -4;
            for (var row = 0; row < icon.length; row++) {
                for (var mask = 0x8000; mask >= 1; mask >>= 1) {
                    Draw.setColor(data, i += 4, (icon[row] & mask) != 0, color);
                }
            }
            ctx.putImageData(bitmap, 0, 0);
            icon.cache.canvas = canvas;
        }
        this.drawImage(icon.cache.canvas, x, y);
    },
    button: function (x, y, w, h, fontInfo, fontHeight, borderColor, fillColor, fontColor, text, cornerStyle) {
        // Border
        this.rectangleRounded(x, y, x + w, y + h, borderColor, 5, cornerStyle);
        // Fill
        this.rectangleRounded(x + 2, y + 2, x + w - 2, y + h - 2, fillColor, 5, cornerStyle);
        // Render text
        if (text.Length != 0) {
            var textWidth = Font.getStringWidth(fontInfo, text);
            var xStart = Math.floor(x + (w / 2) - (textWidth / 2));
            var yStart = Math.floor(y + (h / 2) - (fontHeight / 2) + 1);
            this.string(xStart, yStart, fontColor, fontInfo, text);
        }
    },
    charBitmap: function (xPixel, yPixel, color, glyph, glyphDataOffset, cols, rows) {
        // Figure out how many columns worth of data we have
        //        var imageData = this.createImageData(1, 1);
        //        copy(imageData.data, [color.red, color.green, color.blue, 255]);
        //        this.putImageData(imageData, x, y);
        if (!glyph.cache) glyph.cache = {};
        var cachedBitmap = glyph.cache["o" + glyphDataOffset];
        if (!cachedBitmap || !Color.areEqual(cachedBitmap.color, color)) {
            cachedBitmap = {
                color: color,
                canvas: document.createElement("canvas")
            };
            cachedBitmap.canvas.width = cols;
            cachedBitmap.canvas.height = rows;
            var colPages = Math.ceil(cols / 8),
                i = -4,
                ctx = cachedBitmap.canvas.getContext("2d"),
                bitmap = ctx.createImageData(colPages * 8, rows),
                data = bitmap.data;
            for (var row = 0; row < rows; row++) {
                for (var col = 0; col < colPages; col++) {
                    var indexIntoGlyph = (row == 0) ? col : (row * colPages) + col;
                    // send the data byte
                    for (var mask = 0x80; mask >= 1; mask >>= 1) {
                        Draw.setColor(
                            data, i += 4,
                            (glyph[glyphDataOffset + indexIntoGlyph] & mask) != 0,
                            color);
                    }
                }
            }
            ctx.putImageData(bitmap, 0, 0);
            glyph.cache["o" + glyphDataOffset] = cachedBitmap;
        }
        this.drawImage(cachedBitmap.canvas, xPixel, yPixel);
    },
    string: function (x, y, color, font, text) {
        // set current x, y to that of requested
        var currentX = x;
        // Send individual characters
        for (var i = 0; i < text.length; i++) {
            // We need to manually calculate width in pages since this is screwy with variable width fonts
            // var heightPages = charWidth % 8 ? charWidth / 8 : charWidth / 8 + 1;
            var c = text.charAt(i);
            var fontCharInfo = Font.getFontCharInfo(font, c);
            this.charBitmap(currentX, y, color, font.bitmaps, fontCharInfo.offset, fontCharInfo.widthBits, font.height);
            // next char X
            currentX += fontCharInfo.widthBits + 1;
        }
    },
    fillScreen: function (color) {
        this.rectangleFilled(0, 0, this.width, this.height, color);
    }
};

var FastDraw = {
    line: function (x0, y0, x1, y1, color) {
        this.lineWidth = 1;
        this.strokeStyle = Color.html(color);
        this.beginPath();
        this.moveTo(x0, y0);
        this.lineTo(x1, y1);
        this.stroke();
    },
    circle: function (xCenter, yCenter, radius, color) {
        this.lineWidth = 1;
        this.strokeStyle = Color.html(color);
        this.beginPath();
        this.arc(xCenter, yCenter, radius, 0, 6.29);
        this.stroke();
    },
    circleFilled: function (xCenter, yCenter, radius, color) {
        this.fillStyle = Color.html(color);
        this.beginPath();
        this.arc(xCenter, yCenter, radius + 0.5, 0, 6.29);
        this.fill();
    },
    cornerFilled: function (xCenter, yCenter, radius, position, color) {
        var startAngle = Math.PI * (
            position === cornerPosition.TopRight ? 1.5 :
                position === cornerPosition.TopLeft ? 1 :
                    position === cornerPosition.BottomLeft ? 0.5 : 0
        );
        this.fillStyle = Color.html(color);
        this.beginPath();
        this.moveTo(xCenter, yCenter);
        this.arc(xCenter + 0.5, yCenter + 0.5, radius + 0.5, startAngle, startAngle + Math.PI / 2);
        this.fill();
    },
    arrow: function (x, y, size, direction, color) {
        this.fillStyle = Color.html(color);
        this.beginPath();
        this.moveTo(x, y);
        switch (direction) {
            case drawingDirection.Left:
                this.lineTo(x + size, y - size);
                this.lineTo(x + size, y + size);
                break;
            case drawingDirection.Right:
                this.lineTo(x - size, y - size);
                this.lineTo(x - size, y + size);
                break;
            case drawingDirection.Up:
                this.lineTo(x - size, y + size);
                this.lineTo(x + size, y + size);
                break;
            case drawingDirection.Down:
                this.lineTo(x - size, y - size);
                this.lineTo(x + size, y - size);
                break;
        }
        this.lineTo(x, y);
        this.fill();
    },
    rectangleRounded: function (x0, y0, x1, y1, color, radius, corners) {
        if (corners == roundedCornerStyle.None) {
            this.rectangleFilled(x0, y0, x1, y1, color);
            return;
        }
        if (y1 < y0) {
            var y = y1;
            y1 = y0;
            y0 = y;
        }
        x1++; y1++;
        var h = y1 - y0;
        // Check radius
        if (radius > h / 2) {
            radius = Math.floor(h / 2);
        }
        // Draw body
        this.fillStyle = Color.html(color);
        this.beginPath();
        switch (corners) {
            case roundedCornerStyle.All:
                this.moveTo(x0 + radius, y0);
                this.arc(x0 + radius, y0 + radius, radius, Math.PI * 1.5, Math.PI, true);
                this.lineTo(x0, y1 - radius);
                this.arc(x0 + radius, y1 - radius, radius, Math.PI, Math.PI * 0.5, true);
                this.lineTo(x1 - radius, y1);
                this.arc(x1 - radius, y1 - radius, radius, Math.PI * 0.5, 0, true);
                this.lineTo(x1, y0 + radius);
                this.arc(x1 - radius, y0 + radius, radius, 0, Math.PI * 1.5, true);
                this.lineTo(x0 + radius, y0);
                break;
            case roundedCornerStyle.Top:
                this.moveTo(x0 + radius, y0);
                this.arc(x0 + radius, y0 + radius, radius, Math.PI * 1.5, Math.PI, true);
                this.lineTo(x0, y1);
                this.lineTo(x1, y1);
                this.lineTo(x1, y0 + radius);
                this.arc(x1 - radius, y0 + radius, radius, 0, Math.PI * 1.5, true);
                this.lineTo(x0 + radius, y0);
                break;
            case roundedCornerStyle.Bottom:
                this.moveTo(x0, y0);
                this.lineTo(x0, y1 - radius);
                this.arc(x0 + radius, y1 - radius, radius, Math.PI, Math.PI * 0.5, true);
                this.lineTo(x1 - radius, y1);
                this.arc(x1 - radius, y1 - radius, radius, Math.PI * 0.5, 0, true);
                this.lineTo(x1, y0);
                this.lineTo(x0, y0);
                break;
            case roundedCornerStyle.Left:
                this.moveTo(x0 + radius, y0);
                this.arc(x0 + radius, y0 + radius, radius, Math.PI * 1.5, Math.PI, true);
                this.lineTo(x0, y1 - radius);
                this.arc(x0 + radius, y1 - radius, radius, Math.PI, Math.PI * 0.5, true);
                this.lineTo(x1, y1);
                this.lineTo(x1, y0);
                this.lineTo(x0 + radius, y0);
                break;
            case roundedCornerStyle.Right:
                this.moveTo(x0, y0);
                this.lineTo(x0, y1);
                this.lineTo(x1 - radius, y1);
                this.arc(x1 - radius, y1 - radius, radius, Math.PI * 0.5, 0, true);
                this.lineTo(x1, y0 + radius);
                this.arc(x1 - radius, y0 + radius, radius, 0, Math.PI * 1.5, true);
                this.lineTo(x0 + radius, y0);
                break;
        }
        this.fill();
    },
    triangle: function (x0, y0, x1, y1, x2, y2, color) {
        this.lineWidth = 1;
        this.strokeStyle = Color.html(color);
        this.beginPath();
        this.moveTo(x0, y0);
        this.lineTo(x1, y1);
        this.lineTo(x2, y2);
        this.lineTo(x0, y0);
        this.stroke();
    },
    triangleFilled: function (x0, y0, x1, y1, x2, y2, color) {
        this.fillStyle = Color.html(color);
        this.beginPath();
        this.moveTo(x0, y0);
        this.lineTo(x1, y1);
        this.lineTo(x2, y2);
        this.lineTo(x0, y0);
        this.fill();
    },
    progressBar: function (x, y, w, h, borderCorners, progressCorners, borderColor, borderFillColor, progressBorderColor, progressFillColor, progress) {
        this.fastrectangleRounded(x, y, x + w, y + h, borderColor, 5, borderCorners);
        this.fastrectangleRounded(x + 1, y + 1, x + w - 1, y + h - 1, borderFillColor, 5, borderCorners);
        // Progress bar
        if (progress > 0 && progress <= 100) {
            // Calculate bar size
            var bw = (w - 6); // bar at 100%
            if (progress != 100) {
                bw = Math.floor((bw * progress) / 100);
            }
            this.fastrectangleRounded(x + 3, y + 3, bw + x + 3, y + h - 3, progressBorderColor, 5, progressCorners);
            this.fastrectangleRounded(x + 4, y + 4, bw + x + 3 - 1, y + h - 4, progressFillColor, 5, progressCorners);
        }
    },
    button: function (x, y, w, h, fontInfo, fontHeight, borderColor, fillColor, fontColor, text, cornerStyle) {
        // Border
        this.fastrectangleRounded(x, y, x + w, y + h, borderColor, 5, cornerStyle);
        // Fill
        this.fastrectangleRounded(x + 2, y + 2, x + w - 2, y + h - 2, fillColor, 5, cornerStyle);
        // Render text
        if (text.Length != 0) {
            var textWidth = Font.getStringWidth(fontInfo, text);
            var xStart = Math.floor(x + (w / 2) - (textWidth / 2));
            var yStart = Math.floor(y + (h / 2) - (fontHeight / 2) + 1);
            this.string(xStart, yStart, fontColor, fontInfo, text);
        }
    }
};

// Command definitions
var Primitives = {
    loop: {
        name: "Loop",
        defaults: { from: 0, to: 1, counter: "i", step: 1, steps: [], indent: 0 },
        editor: [
            { type: Editor.range, mapping: { from: "from", to: "to" } },
            { label: "Step", type: Editor.integer, min: 1, mapping: { integer: "step" } },
            { label: "Counter", type: Editor.string, mapping: { text: "counter" } },
            { label: "", type: Editor.program, mapping: { program: "steps" } }
        ],
        icon: "Loop.png"
    },
    drawPixel: {
        name: "Pixel",
        render: "pixel",
        defaults: { x: 0, y: 0, color: Color.black },
        editor: [
            { label: "", type: Editor.coordinates, mapping: { x: "x", y: "y" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "{x}, {y}, {color}",
        icon: "Pixel.png"
    },
    drawLine: {
        name: "Line",
        render: "line",
        defaults: { x0: 10, y0: 10, x1: 50, y1: 50, color: Color.black },
        editor: [
            { label: "From", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "To", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0}, {x1}, {y1},\r\n    {color}",
        icon: "Line.png"
    },
    drawLineDotted: {
        name: "DottedLine",
        render: "dottedLine",
        defaults: { x0: 10, y0: 10, x1: 50, y1: 50, empty: 2, solid: 5, color: Color.black },
        editor: [
            { label: "From", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "To", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Number of empty pixels", type: Editor.integer, mapping: { integer: "empty" } },
            { label: "Number of solid pixels", type: Editor.integer, mapping: { integer: "solid" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0}, {x1}, {y1},\r\n    {empty}, {solid},\r\n    {color}",
        icon: "DottedLine.png"
    },
    drawCircle: {
        name: "Circle",
        render: "circle",
        defaults: { xCenter: 40, yCenter: 40, radius: 10, color: Color.black },
        editor: [
            { label: "Center", type: Editor.coordinates, mapping: { x: "xCenter", y: "yCenter" } },
            { label: "Radius", type: Editor.integer, mapping: { integer: "radius" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {xCenter}, {yCenter}, {radius},\r\n    {color}",
        icon: "Circle.png"
    },
    drawCircleFilled: {
        name: "Disk",
        render: "circleFilled",
        defaults: { xCenter: 40, yCenter: 40, radius: 10, color: Color.black },
        editor: [
            { label: "Center", type: Editor.coordinates, mapping: { x: "xCenter", y: "yCenter" } },
            { label: "Radius", type: Editor.integer, mapping: { integer: "radius" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {xCenter}, {yCenter}, {radius},\r\n    {color}",
        icon: "Disk.png"
    },
    drawCornerFilled: {
        name: "Quart-de-Rond",
        render: "cornerFilled",
        defaults: { xCenter: 40, yCenter: 40, radius: 8, position: cornerPosition.TopLeft, color: Color.black },
        editor: [
            { label: "Center", type: Editor.coordinates, mapping: { x: "xCenter", y: "yCenter" } },
            { label: "Radius", type: Editor.integer, mapping: { integer: "radius" } },
            { label: "Position", type: Editor.enumeration, enumeration: cornerPosition, mapping: { enumeration: "position" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {xCenter}, {yCenter}, {radius},\r\n    {position},\r\n    {color}",
        icon: "QuartDeRond.png"
    },
    drawArrow: {
        name: "Arrow Head",
        render: "arrow",
        defaults: { x: 40, y: 40, size: 10, direction: drawingDirection.Right, color: Color.black },
        editor: [
            { label: "Origin", type: Editor.coordinates, mapping: { x: "x", y: "y" } },
            { label: "Size", type: Editor.integer, mapping: { integer: "size" } },
            { label: "Direction", type: Editor.enumeration, enumeration: drawingDirection, mapping: { enumeration: "direction" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x}, {y}, {size},\r\n    {direction},\r\n    {color}",
        icon: "ArrowHead.png"
    },
    drawRectangle: {
        name: "Rectangle",
        render: "rectangle",
        defaults: { x0: 10, y0: 10, x1: 20, y1: 30, color: Color.black },
        editor: [
            { label: "Top-Left Corner", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "Bottom-Right Corner", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0},\r\n    {x1}, {y1},\r\n    {color}",
        icon: "Rectangle.png"
    },
    drawRectangleFilled: {
        name: "Filled Rectangle",
        render: "rectangleFilled",
        defaults: { x0: 10, y0: 10, x1: 20, y1: 30, color: Color.black },
        editor: [
            { label: "Top-Left Corner", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "Bottom-Right Corner", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0},\r\n    {x1}, {y1},\r\n    {color}",
        icon: "FilledRectangle.png"
    },
    drawRectangleRounded: {
        name: "Rounded Rectangle",
        render: "rectangleRounded",
        defaults: { x0: 10, y0: 10, x1: 20, y1: 30, color: Color.black, radius: 5, corners: roundedCornerStyle.All },
        editor: [
            { label: "Top-Left Corner", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "Bottom-Right Corner", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Corner Radius", type: Editor.integer, mapping: { integer: "radius" } },
            { label: "Corner Style", type: Editor.enumeration, enumeration: roundedCornerStyle, mapping: { enumeration: "corners" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0},\r\n    {x1}, {y1},\r\n    {color},\r\n    {radius},\r\n    {corners}",
        icon: "RoundedRectangle.png"
    },
    drawTriangle: {
        name: "Triangle",
        render: "triangle",
        defaults: { x0: 30, y0: 20, x1: 40, y1: 50, x2: 20, y2: 60, color: Color.black },
        editor: [
            { label: "First Point", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "Second Point", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Third Point", type: Editor.coordinates, mapping: { x: "x2", y: "y2" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0},\r\n    {x1}, {y1},\r\n    {x2}, {y2},\r\n    {color}",
        icon: "Triangle.png"
    },
    drawTriangleFilled: {
        name: "Filled Triangle",
        render: "triangleFilled",
        defaults: { x0: 30, y0: 20, x1: 40, y1: 50, x2: 20, y2: 60, color: Color.black },
        editor: [
            { label: "First Point", type: Editor.coordinates, mapping: { x: "x0", y: "y0" } },
            { label: "Second Point", type: Editor.coordinates, mapping: { x: "x1", y: "y1" } },
            { label: "Third Point", type: Editor.coordinates, mapping: { x: "x2", y: "y2" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x0}, {y0},\r\n    {x1}, {y1},\r\n    {x2}, {y2},\r\n    {color}",
        icon: "TriangleFilled.png"
    },
    drawProgressBar: {
        name: "Progress Bar",
        render: "progressBar",
        defaults: {
            x: 10,
            y: 10,
            width: 50,
            height: 10,
            borderCorners: roundedCornerStyle.None,
            progressCorners: roundedCornerStyle.None,
            borderColor: Color.black,
            borderFillColor: Color.white,
            progressBorderColor: Color.black,
            progressFillColor: Color.black,
            progress: 20
        },
        editor: [
            { label: "Top-Left Corner", type: Editor.coordinates, mapping: { x: "x", y: "y" } },
            { label: "Width", type: Editor.integer, mapping: { integer: "width" } },
            { label: "Height", type: Editor.integer, mapping: { integer: "height" } },
            { label: "Progress", type: Editor.integer, min: 0, max: 100, mapping: { integer: "progress" } },
            { label: "Border Corners", type: Editor.enumeration, enumeration: roundedCornerStyle, mapping: { enumeration: "borderCorners" } },
            { label: "Progress Bar Corners", type: Editor.enumeration, enumeration: roundedCornerStyle, mapping: { enumeration: "progressCorners" } },
            { label: "Border Color", type: Editor.color, mapping: { color: "borderColor" } },
            { label: "Border Fill Color", type: Editor.color, mapping: { color: "borderFillColor" } },
            { label: "Progress Bar Border Color", type: Editor.color, mapping: { color: "progressBorderColor" } },
            { label: "Progress Bar Color", type: Editor.color, mapping: { color: "progressFillColor" } }
        ],
        paramString: "\r\n    {x}, {y},\r\n    {width}, {height},\r\n    {borderCorners},\r\n    {progressCorners},\r\n    {borderColor},\r\n    {borderFillColor},\r\n    {progressBorderColor},\r\n    {progressFillColor},\r\n    {progress}",
        icon: "ProgressBar.png"
    },
    drawString: {
        name: "Text",
        render: "string",
        defaults: { x: 10, y: 10, color: Color.black, font: Font.DejaVuSans9, text: "Text" },
        editor: [
            { label: "Origin", type: Editor.coordinates, mapping: { x: "x", y: "y" } },
            { label: "Text", type: Editor.string, mapping: { text: "text" } },
            { label: "Font", type: Editor.font, mapping: { font: "font" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x}, {y},\r\n    {color},\r\n    {font},\r\n    {text}",
        icon: "String.png"
    },
    drawIcon16: {
        name: "Icon",
        render: "icon16",
        defaults: {
            x: 10,
            y: 10,
            color: Color.black,
            icon: Icon.Alert
        },
        editor: [
            { label: "Origin", type: Editor.coordinates, mapping: { x: "x", y: "y" } },
            { label: "Icon", type: Editor.icon, mapping: { icon: "icon" } },
            { label: "Color", type: Editor.color, mapping: { color: "color" } }
        ],
        paramString: "\r\n    {x}, {y},\r\n    {color},\r\n    {icon}",
        icon: "Icon.png"
    },
    drawButton: {
        name: "Button",
        render: "button",
        defaults: {
            x: 10,
            y: 10,
            width: 50,
            height: 20,
            font: Font.DejaVuSans9,
            fontHeight: 12,
            borderColor: Color.black,
            fillColor: Color.white,
            fontColor: Color.black,
            text: "Button",
            cornerStyle: roundedCornerStyle.None
        },
        editor: [
            { label: "Top-Left Corner", type: Editor.coordinates, mapping: { x: "x", y: "y" } },
            { label: "Width", type: Editor.integer, mapping: { integer: "width" } },
            { label: "Height", type: Editor.integer, mapping: { integer: "height" } },
            { label: "Text", type: Editor.string, mapping: { text: "text" } },
            { label: "Font", type: Editor.font, mapping: { font: "font" } },
            { label: "Font Height", type: Editor.integer, mapping: { integer: "fontHeight" } },
            { label: "Border Color", type: Editor.color, mapping: { color: "borderColor" } },
            { label: "Fill Color", type: Editor.color, mapping: { color: "fillColor" } },
            { label: "Font Color", type: Editor.color, mapping: { color: "fontColor" } },
            { label: "Corner Style", type: Editor.enumeration, enumeration: roundedCornerStyle, mapping: { enumeration: "cornerStyle" } }
        ],
        paramString: "\r\n    {x}, {y},\r\n    {width}, {height},\r\n    {font}, {fontHeight},\r\n    {borderColor},\r\n    {fillColor},\r\n    {fontColor},\r\n    {text},\r\n    {cornerStyle}",
        icon: "Button.png"
    },
    drawFill: {
        name: "Fill Screen",
        render: "fillScreen",
        defaults: { color: Color.white },
        editor: [{ label: "Color", type: Editor.color, mapping: { color: "color" } }],
        paramString: "{color}",
        icon: "Fill.png"
    }
};