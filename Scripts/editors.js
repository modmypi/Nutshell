var Editor = (function ($) {

    function bind(input, operation, property, mapper, changeCallback) {
        function changeHandler(e) {
            operation[property] = mapper(input.val());
            if (e && e.batch) return;
            if (typeof changeCallback === "function") {
                changeCallback({
                    operation: operation,
                    property: property,
                    value: operation[property]
                });
            }
            else if (changeCallback.length) {
                for (var i = 0; i < changeCallback.length; i++) {
                    changeCallback[i]({
                        operation: operation,
                        property: property,
                        value: operation[property]
                    });
                }
            }
        }

        input.keyup(changeHandler)
            .change(changeHandler);
        return changeHandler;
    }

    function label(text, tag) {
        return $(tag ? "<" + tag + "></" + tag + ">" : "<span></span>").html(text);
    }

    function numberMapper(value) {
        var number = parseInt(value, 10);
        try {
            if (isNaN(number) || number.toString() !== value) return new Function("return " + value + ";");
        }
        catch (e) { }
        return number;
    }
    function coordinateMapperBuilder(callback) {
        return function (value) {
            var mapped = numberMapper(value);
            callback(value);
            return mapped;
        };
    }

    function enumerationMapper(enumeration) {
        return function (value) {
            return enumeration[value];
        };
    }

    function colorMapper(value) {
        return new Color(value);
    }

    function fontMapper(value) {
        return Font[value];
    }

    function iconMapper(value) {
        return Icon[value];
    }

    function identity(value) {
        return value;
    }

    function extractExpression(f) {
        var t = f.toString();
        return {
            name: t.match(/function\s+(\w*)\s*\([^\)]*\)\s*\{/)[1],
            parameters: t.match(/function\s+\w*\s*\([^\)]*\)\s*\{/)[1],
            expression: t.match(/\{\s*return\s+([^;]+);\s*\}/)[1]
        };
    }

    function getValueOrExpression(v) {
        return typeof v === "function" ? extractExpression(v).expression : v;
    }

    function operationEditor(operation, changeCallback) {
        var c = Primitives[operation.command],
            container = $("<li></li>")
                .append(
                    label(c.name, "h2")
                        .css("cursor", "move")
                        .append(
                            $("<a></a>")
                                .html("Delete")
                                .attr("href", "#")
                                .addClass("delete")))
                .addClass("operation")
                .data("operation", operation);
        if (!c.editor) return container;
        for (var i = 0; i < c.editor.length; i++) {
            var editorDescription = c.editor[i],
                propertyEditor = editorDescription
                    .type(operation, editorDescription, changeCallback);
            if (propertyEditor) {
                var propertyContainer = $("<div></div>").addClass("edit-area");
                if (editorDescription.label) {
                    propertyContainer.append(label(editorDescription.label + ": "));
                }
                propertyEditor.addClass("property-editor");
                propertyContainer.append(propertyEditor);
                container.append(propertyContainer);
            }
        }
        return container;
    }

    return {
        integer: function (operation, description, changeCallback) {
            var property = description.mapping.integer,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                value = getValueOrExpression(values[property]),
                wrapper = $("<span></span>"),
                editor = $("<input/>")
                    .attr("type", "text")
                    .val(value),
                slider = $("<div></div>")
                    .slider({
                        min: description.min || 0,
                        max: description.max || 320,
                        value: value,
                        slide: function (e, ui) {
                            editor.val(ui.value);
                            changeHandler();
                        }
                    }),
                changeHandler = bind(editor, operation, property, numberMapper, [
                    changeCallback,
                    function () {
                        slider.slider("value", editor.val());
                    }
                ]);
            wrapper.append(editor, slider);
            return wrapper;
        },
        coordinates: function (operation, description, changeCallback) {
            var propertyX = description.mapping.x,
                propertyY = description.mapping.y,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                x = $("<input/>")
                    .attr("type", "text")
                    .val(getValueOrExpression(values[propertyX])),
                y = $("<input/>")
                    .attr("type", "text")
                    .val(getValueOrExpression(values[propertyY])),
                offset = operation.canvas.position(),
                handleOffset = 3,
                callback = function () {
                    var valueX = numberMapper(x.val()),
                        valueY = numberMapper(y.val());
                    if (typeof valueX === "number" && typeof valueY === "number") {
                        handle.show()
                            .css({
                                left: (offset.left + valueX - handleOffset) + "px",
                                top: (offset.top + valueY - handleOffset) + "px"
                            });
                    }
                    else {
                        handle.hide();
                    }
                },
                wrapper = $("<span></span>")
                    .append(label("X: "), x, label("Y: "), y)
                    .bind("operation-selected", callback)
                    .bind("operation-deselected", function () {
                        handle.hide();
                    }),
                handle = $("<div></div>")
                    .addClass("handle")
                    .css({
                        position: "absolute",
                        cursor: "move",
                        width: "5px",
                        height: "5px",
                        border: "solid 1px black",
                        backgroundColor: "white"
                    })
                    .data({
                        operation: operation
                    })
                    .hide()
                    .draggable({
                        containment: [
                            offset.left - handleOffset,
                            offset.top - handleOffset,
                            offset.left + operation.canvas.width() - handleOffset - 1,
                            offset.top + operation.canvas.height() - handleOffset - 1
                        ],
                        drag: function (e, ui) {
                            x.val(ui.offset.left - offset.left + handleOffset);
                            y.val(ui.offset.top - offset.top + handleOffset);
                            changeHandlerX({ batch: true });
                            changeHandlerY();
                        }
                    });
            operation.canvas.after(handle);
            var changeHandlerX = bind(x, operation, propertyX, coordinateMapperBuilder(callback), changeCallback),
                changeHandlerY = bind(y, operation, propertyY, coordinateMapperBuilder(callback), changeCallback);
            return wrapper;
        },
        range: function (operation, description, changeCallback) {
            var propertyFrom = description.mapping.from,
                propertyTo = description.mapping.to,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                valueFrom = getValueOrExpression(values[propertyFrom]),
                valueTo = getValueOrExpression(values[propertyTo]),
                wrapper = $("<span></span>"),
                from = $("<input/>").attr("type", "text").val(valueFrom),
                to = $("<input/>").attr("type", "text").val(valueTo),
                slider = $("<div></div>")
                    .slider({
                        range: true,
                        min: description.min || 0,
                        max: description.max || 100,
                        values: [valueFrom, valueTo],
                        slide: function (e, ui) {
                            if (ui.values[0] !== from.val()) {
                                from.val(ui.values[0]);
                                changeHandlerFrom();
                            }
                            if (ui.values[1] !== to.val()) {
                                to.val(ui.values[1]);
                                changeHandlerTo();
                            }
                        }
                    }),
                updateSlider = function () {
                    slider.slider("values", [from.val(), to.val()]);
                },
                changeHandlerFrom = bind(from, operation, propertyFrom, numberMapper, [
                    changeCallback,
                    updateSlider
                ]),
                changeHandlerTo = bind(to, operation, propertyTo, numberMapper, [
                    changeCallback,
                    updateSlider
                ]);
            wrapper.append(label("From: "), from, label("To: "), to, slider);
            return wrapper;
        },
        string: function (operation, description, changeCallback) {
            var property = description.mapping.text,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                value = values[property],
                editor = $("<input/>")
                    .attr("type", "text")
                    .val(value);
            bind(editor, operation, property, identity, changeCallback);
            return editor;
        },
        enumeration: function (operation, description, changeCallback) {
            var enumeration = description.enumeration,
                property = description.mapping.enumeration,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                value = values[property],
                editor = $("<select/>");
            for (var item in enumeration) {
                editor.append($("<option/>").html(item));
            }
            editor.val(value.name);
            bind(editor, operation, property, enumerationMapper(enumeration), changeCallback);
            return editor;
        },
        font: function (operation, description, changeCallback) {
            var property = description.mapping.font,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                value = values[property],
                editor = $("<select/>");
            for (var fontName in Font) {
                var font = Font[fontName];
                if (typeof font !== "object") continue;
                var option = $("<option/>").html(font.name).val(fontName);
                editor.append(option);
                if (font === value) option.attr("selected", "selected");
            }
            bind(editor, operation, property, fontMapper, changeCallback);
            return editor;
        },
        icon: function (operation, description, changeCallback) {
            // TODO: add icon editor
            var property = description.mapping.icon,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                value = values[property],
                editor = $("<select/>");
            for (var iconName in Icon) {
                var icon = Icon[iconName];
                if (!icon.isIcon) continue;
                var option = $("<option/>").html(icon.name).val(iconName);
                editor.append(option);
                if (icon === value) option.attr("selected", "selected");
            }
            bind(editor, operation, property, iconMapper, changeCallback);
            return editor;
        },
        color: function (operation, description, changeCallback) {
            var property = description.mapping.color,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                value = values[property],
                wrapper = $("<span></span>"),
                editor = $("<input/>")
                    .attr("type", "text")
                    .val("#" + Color.hex(value))
                    .focus(function () {
                        colorpicker.show();
                    })
                    .blur(function () {
                        colorpicker.hide();
                    }),
                colorpicker = $("<div></div>")
                    .hide()
                    .farbtastic(function (color) {
                        if (updating) return;
                        editor.val(color);
                        changeHandler();
                    }),
                updating = false,
                updateColor = function () {
                    updating = true;
                    $.farbtastic(colorpicker)
                        .setColor((new Color(editor.val())).toHtml());
                    updating = false;
                },
                changeHandler = bind(editor, operation, property, colorMapper, [changeCallback, updateColor]);
            wrapper.append(editor, colorpicker);
            return wrapper;
        },
        program: function (operation, description, changeCallback) {
            var property = description.mapping.program,
                values = $.extend({}, Primitives[operation.command].defaults, operation),
                program = values[property],
                wrapper = $("<ol></ol>")
                    .addClass("operation")
                    .data({
                        operation: program,
                        canvas: operation.canvas
                    });
            Editor.buildEditors(program, wrapper, changeCallback);
            return wrapper;
        },
        buildEditor: function (operation, parentOperation, target, changeCallback, previous) {
            operation.parent = parentOperation;
            operation.canvas = target.data("canvas");
            var editor = operationEditor(operation, changeCallback);
            if (target.children().length === 0) editor.addClass("first");
            if (previous) {
                editor.insertAfter(previous);
            }
            else {
                target.append(editor);
            }
            operation.editor = editor;
            return editor;
        },
        buildEditors: function (prg, target, changeCallback) {
            target.empty();
            prg.editor = target;
            target.data("operation", prg);
            for (var i = 0; i < prg.length; i++) {
                Editor.buildEditor(prg[i], prg, target, changeCallback);
            }
            changeCallback();
        }
    };
})(jQuery);