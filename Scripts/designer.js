var Designer = function (options, $) {
    // This is a pixel-precise simulation of a native code library that is running on a display controller.
    // It is by design that it doesn't use native canvas operations.
    var operationsSelector = options.operations || "#operations",
        operations = $(operationsSelector),
        toolbar = $(options.toolbar || "#toolbar"),
        javascript = $(options.javascript || "#javascript"),
        csharp = $(options.csharp || "#csharp"),
        canvas = $(options.canvas || "#program-a-paint"),
        width = options.width || 320,
        height = options.height || 240,
        zoom = $(options.zoom || "#zoom-a-paint"),
        coordinates = $(options.coordinate || "#coordinates"),
        timeToRender = $(options.timeToRender || "#time-to-render"),
        emulate = $(options.emulate || "#emulate-hardware"),
        persistenceToolbar = $(options.persistenceToolbar || "#persistence-toolbar"),
        loadDialogDiv = $(options.loadDialog || "#load-dialog"),
        fast = !emulate.attr("checked"),
        zoomWidth = 160,
        zoomHeight = 160,
        zoomLevel = 16,
        ctx = canvas[0].getContext("2d"),
        zctx = zoom[0].getContext("2d"),
        rootPath = options.rootPath || "/";

    //Initialize context with primitives
    Draw.initialize(ctx, canvas[0]);

    // Utilities

    function removeEmptyStrings(array) {
        var out = [];
        for (var i = 0; i < array.length; i++) {
            if (array[i]) out.push(array[i]);
        }
        return out;
    }

    function format(template, context, handlers) {
        return template.replace(/\{(\w+)\}/gm, function ($0, $1) {
            var n = $1,
                v = context[n];
            if (handlers) {
                for (var i = 0; i < handlers.length; i++) {
                    var replaced = handlers[i](n, v, context);
                    if (typeof replaced === "string") return replaced;
                }
            }
            return v;
        });
    }

    function formatStringParameter(s, v) {
        return typeof v === "string" ? JSON.stringify(v) : null;
    }

    function formatSharpColorParameter(s, v) {
        return Color.isColor(v) ? "ColorHelpers.GetRGB24toRGB565(" + v.red + ", " + v.green + ", " + v.blue + ")" : null;
    }

    function formatScriptColorParameter(s, v) {
        return Color.isColor(v) ? "{ red: " + v.red + ", green: " + v.green + ", blue: " + v.blue + " }" : null;
    }

    function formatSharpEnumParameter(s, v) {
        return v.isEnumerationValue ? v.value : null;
    }

    function formatScriptEnumParameter(s, v) {
        return v.isEnumerationValue ? v.value.charAt(0).toLowerCase() + v.value.substr(1) : null;
    }

    function formatSharpFontParameter(s, v) {
        return Font.isFont(v) ? v.name + ".ID" : null;
    }

    function formatScriptFontParameter(s, v) {
        return Font.isFont(v) ? "Font." + v.name : null;
    }

    function formatSharpIconParameter(s, v) {
        if (Icon.isIcon(v)) return "Icons16." + v.name;
        if (v.join) return "new ushort[] {" + v.join(",") + "}";
        return null;
    }

    function formatScriptIconParameter(s, v) {
        if (Icon.isIcon(v)) return "Icon." + v.name;
        if (v.join) return "[" + v.join(",") + "]";
        return null;
    }

    function extractExpression(f) {
        var t = f.toString();
        return {
            name: t.match(/function\s+(\w*)\s*\([^\)]*\)\s*\{/)[1],
            parameters: t.match(/function\s+\w*\s*\([^\)]*\)\s*\{/)[1],
            expression: t.match(/\{\s*return\s+([^;]+);\s*\}/)[1]
        };
    }

    function formatFunctionParameter(s, v) {
        if (typeof v === "function") {
            return extractExpression(v.toString()).expression;
        }
        return null;
    }

    function formatForCSharp(template, context) {
        return format(template, context, [
            formatStringParameter,
            formatSharpColorParameter,
            formatSharpEnumParameter,
            formatSharpFontParameter,
            formatFunctionParameter,
            formatSharpIconParameter
        ]);
    }

    function nextCounter(counter) {
        return String.fromCharCode(counter.charCodeAt(0) + 1);
    }

    function sharpen(methodName, parameterFormatString, params, indent) {
        if (methodName === "loop") {
            var counter = params.counter,
                from = formatForCSharp("{from}", params),
                to = formatForCSharp("{to}", params),
                step = formatForCSharp("{step}", params),
                indentation = (new Array(indent + 1)).join("    "),
                out = [indentation + "for (var " + counter + " = " + from + "; " +
                    counter + " < " + to + "; " +
                        counter + (step == 1 ? "++" : " += " + step) +
                            ") {"];
            for (var i = 0; i < params.steps.length; i++) {
                var s = params.steps[i],
                    code = removeEmptyStrings(prepareSharp(s.command, s, indent + 1)
                            .split("\r\n")).join("\r\n    " + indentation);
                out.push(indentation + "    " + code);
            }
            out.push("}\r\n");
            return out.join("\r\n");
        }
        return "canvas." +
            methodName.charAt(0).toUpperCase() + methodName.substr(1) +
            "(" + formatForCSharp(parameterFormatString, params) + ");\r\n";
    }

    function formatForJavaScript(template, context) {
        return format(template, context, [
            formatStringParameter,
            formatScriptColorParameter,
            formatScriptEnumParameter,
            formatScriptFontParameter,
            formatFunctionParameter,
            formatScriptIconParameter
        ]);
    }

    function scriptize(methodName, parameterFormatString, params, indent) {
        if (methodName === "loop") {
            var counter = params.counter,
                from = formatForJavaScript("{from}", params),
                to = formatForJavaScript("{to}", params),
                step = formatForJavaScript("{step}", params),
                indentation = (new Array(indent + 1)).join("    "),
                out = [indentation + "for (var " + counter + " = " + from + "; " +
                    counter + " < " + to + "; " +
                        counter + (step == 1 ? "++" : " += " + step) +
                            ") {"];
            for (var i = 0; i < params.steps.length; i++) {
                var s = params.steps[i],
                    code = removeEmptyStrings(prepareScript(s.command, s, indent + 1)
                            .split("\r\n")).join("\r\n    " + indentation);
                out.push(indentation + "    " + code);
            }
            out.push("}\r\n");
            return out.join("\r\n");
        }
        return "ctx." + (fast && FastDraw[methodName] ? "fast" + methodName : methodName) +
            "(" + formatForJavaScript(parameterFormatString, params) + ");\r\n";
    }

    // Persistence
    function serialize(program) {
        return JSON.stringify(program, function (key, value) {
            if (key === "editor" || key === "canvas" || key === "parent") return undefined;
            if (Font.isFont(value)) return value.name;
            if (Color.isColor(value)) return value.toHex();
            if (Icon.isIcon(value)) return value.name;
            if (value.isEnumerationValue) return value.name;
            if (typeof value === "function") {
                return extractExpression(value).expression;
            }
            return value;
        });
    }
    function deserialize(programJson) {
        var program = JSON.parse(programJson);
        // Post-process for colors, fonts and expressions
        function postProcess(prg) {
            for (var i = 0; i < prg.length; i++) {
                var operation = prg[i],
                    proto = Primitives[operation.command].defaults;
                for (var propertyName in operation) {
                    if (!(propertyName in proto)) continue;
                    var protoValue = proto[propertyName];
                    if (typeof protoValue === "number" &&
                        typeof operation[propertyName] === "string") {
                        operation[propertyName] =
                            new Function("return " + operation[propertyName] + ";");
                    }
                    else if (Color.isColor(protoValue)) {
                        operation[propertyName] = new Color(operation[propertyName]);
                    }
                    else if (Font.isFont(protoValue)) {
                        operation[propertyName] = Font[operation[propertyName]];
                    }
                    else if (Icon.isIcon(protoValue)) {
                        operation[propertyName] = Icon[operation[propertyName]];
                    }
                    else if (protoValue.isEnumerationValue) {
                        operation[propertyName] = enumeration[protoValue.enumeration][operation[propertyName]];
                    }
                    else if ($.isArray(protoValue)) {
                        postProcess(operation[propertyName]);
                    }
                }
            }
        }
        postProcess(program);
        return program;
    }

    function loadProgram(programJson) {
        var program = deserialize(programJson);
        Editor.buildEditors(program, operations, function () { updateAll(program); });
        return program;
    }
    function loadProgramLocal(fileName) {
        return loadProgram(localStorage["Nutshell.File:" + fileName]);
    }
    function saveProgramLocal(fileName, prg, cnv) {
        localStorage["Nutshell.File:" + fileName] = serialize(prg);
        localStorage["Nutshell.Date:" + fileName] = new Date();
        if (cnv) {
            localStorage["Nutshell.Screenshot:" + fileName] =
                cnv.toDataURL();
        }
    }

    // Command execution engine

    function prepareScript(command, params, indent) {
        var c = Primitives[command],
            p = $.extend({ paramString: c.paramString }, c.defaults, params);
        return scriptize(
            c.render || command,
            c.paramString,
            p,
            indent);
    }

    function prepareSharp(command, params, indent) {
        var c = Primitives[command],
            p = $.extend({ paramString: c.paramString }, c.defaults, params);
        return sharpen(
            command,
            c.paramString,
            p,
            indent);
    }

    function prepareScriptBatch(prg, indent) {
        var batch = [];
        for (var i = 0; i < prg.length; i++) {
            var step = prg[i];
            batch.push(prepareScript(step.command, step, indent || 0));
        }
        return batch.join("");
    }

    function prepareSharpBatch(prg, indent) {
        var batch = ["var canvas = new VirtualCanvas(null, null);\r\ncanvas.Initialize(GoSockets.Socket5);\r\ncanvas.SetOrientation(Orientation.Landscape);\r\n"];
        for (var i = 0; i < prg.length; i++) {
            var step = prg[i];
            batch.push(prepareSharp(step.command, step, indent || 0));
        }
        return batch.join("") + "\r\ncanvas.Execute();\r\n";
    }

    function updateAll(program) {
        var javascriptCode = prepareScriptBatch(program),
            csharpCode = prepareSharpBatch(program),
            start = new Date();
        ctx.clearRect(0, 0, width, height);
        eval(javascriptCode);
        var end = new Date();
        timeToRender.html((end - start) + "ms");
        csharp.val(csharpCode);
        javascript.val(javascriptCode);
        localStorage["Nutshell.__AutoSave"] = serialize(program);
    }

    // Definition of the editor's UI itself
    return function (program) {
        // Load autosaved program if no program was passed in
        program = program || deserialize(localStorage["Nutshell.__AutoSave"] || "[]");

        // Set operation and canvas on the top operation container
        operations
            .addClass("operation")
            .data({
                operation: program,
                canvas: canvas
            });
        // Build the editors
        Editor.buildEditors(program, operations, function () { updateAll(program); });
        // Clicking the canvas toggles all handles
        var allSelected = false;

        function deSelectAll() {
            allSelected = false;
            selectedOperation = program;
            selectedElement = operations;
            $(".handle").hide();
            operations
                .find(".selected")
                .removeClass("selected")
                .end()
                .find(".property-editor")
                .trigger("operation-deselected");
        }

        // Bind emulation checkbox
        emulate.click(function () {
            fast = !emulate.attr("checked");
            updateAll(program);
        });
        // Set-up zoom
        canvas.mousemove(function (e) {
            var cpos = canvas.offset(),
            w = zoomWidth / zoomLevel,
            h = zoomHeight / zoomLevel,
            x0 = Math.floor(Math.min(Math.max(0, e.pageX - cpos.left - (canvas.outerWidth() - canvas.innerWidth()) / 2), canvas.innerWidth())),
            y0 = Math.floor(Math.min(Math.max(0, e.pageY - cpos.top - (canvas.outerHeight() - canvas.innerHeight()) / 2), canvas.innerHeight())),
            centerX = Math.min(Math.max(0, x0 - w / 2), width - w),
            centerY = Math.min(Math.max(0, y0 - h / 2), height - h),
            data = ctx.getImageData(centerX, centerY, w, h).data,
            zoomed = zctx.createImageData(zoomWidth, zoomHeight);
            coordinates.find(".coord-x").text(x0);
            coordinates.find(".coord-y").text(y0);
            for (var x = 0; x < w; x++) {
                for (var y = 0; y < h; y++) {
                    var pixelOffset = (y * w + x) * 4,
                    zoomOffset = (y * zoomWidth + x) * zoomLevel * 4;
                    for (var i = 0; i < zoomLevel; i++) {
                        for (var j = 0; j < zoomLevel; j++) {
                            var zoomPixelOffset = zoomOffset + (i * zoomWidth + j) * 4;
                            zoomed.data[zoomPixelOffset] = data[pixelOffset];
                            zoomed.data[zoomPixelOffset + 1] = data[pixelOffset + 1];
                            zoomed.data[zoomPixelOffset + 2] = data[pixelOffset + 2];
                            zoomed.data[zoomPixelOffset + 3] = data[pixelOffset + 3];
                        }
                    }
                }
            }
            zctx.putImageData(zoomed, 0, 0);
        })
        // Clicking the canvas shows all handles
        .on("click", function () {
            if (allSelected) deSelectAll();
            else {
                deSelectAll();
                allSelected = true;
                operations
                    .find(".property-editor")
                    .trigger("operation-selected");
            }
        });
        // Clicking a handle selects the operation
        $("#frame").on("click", ".handle", function (e) {
            deSelectAll();
            selectedElement = $(e.target).data("operation").editor;
            select(selectedElement);
        });
        // Set-up operation selection
        var selectedElement = operations,
            selectedOperation = program;

        function select(element) {
            element
                .addClass("selected")
                .find(".property-editor")
                .trigger("operation-selected");
            selectedOperation = selectedElement.data("operation");
            operations.animate({
                scrollTop: operations.scrollTop() + element.offset().top - operations.offset().top - 100
            });
        }

        $("#operations").on("click", ".operation", function (e) {
            deSelectAll();
            selectedElement = $($(e.target).parents(".operation")[0]);
            select(selectedElement);
            return false;
        });
        // Set-up drag and drop reordering of operations
        var sel = operationsSelector + "," + operationsSelector + " ol";
        $(sel)
            .sortable({
                opacity: 0.8,
                connectWith: sel,
                placeholder: "highlight",
                handle: "h2",
                cursor: "move",
                update: function (e, ui) {
                    var operation = ui.item.data("operation"),
                        movedElement = ui.item[0],
                        target = ui.item.parent().data("operation"),
                        origin = (e.target ? $(e.target).data("operation") : target),
                        oldIndex = origin.indexOf(operation),
                        newIndex = $.makeArray(movedElement.parentNode.childNodes).indexOf(movedElement);
                    origin.splice(oldIndex, 1);
                    target.splice(newIndex, 0, operation);
                    updateAll(program);
                }
            });
        // Set-up cancellable operation deletion
        $(operationsSelector)
            .on("click", ".delete", function (e) {
                var deleteButton = $(e.target);
                if (deleteButton.data("disabled")) {
                    var operationElements = deleteButton.parents(".operation"),
                        operation = operationElements.data("operation"),
                        parent = $(operationElements[1]).data("operation");
                    parent.splice(parent.indexOf(operation), 1);
                    operationElements.first().remove();
                    deSelectAll();
                    updateAll(program);
                } else {
                    deleteButton
                        .html("Confirm")
                        .data("disabled", true)
                        .before($("<a></a>")
                                .html("Cancel")
                                .attr("href", "#")
                                .addClass("cancel delete")
                                .click(function (eCancel) {
                                    deleteButton
                                        .html("Delete")
                                        .data("disabled", false);
                                    $(eCancel.target).remove();
                                    eCancel.stopPropagation();
                                    return false;
                                }));
                }
                e.stopPropagation();
                return false;
            });
        // Persistence Toolbar
        persistenceToolbar.find(".save-to-cloud a")
            .click(function () {
                $("#csharp").val(serialize(program));
                return false;
            });
        persistenceToolbar.find(".new")
            .click(function () {
                deSelectAll();
                program = loadProgram("[]");
                return false;
            });
        persistenceToolbar.find(".save")
            .click(function () {
                saveProgramLocal(persistenceToolbar.find("#filename").val(), program, canvas[0]);
                return false;
            });
        var loadDialog = loadDialogDiv.dialog({
            title: loadDialogDiv.data("title"),
            autoOpen: false,
            show: { effect: "drop", direction: "up" },
            hide: { effect: "drop", direction: "up" }
        });
        persistenceToolbar.find(".load")
            .click(function () {
                var localFiles = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key.substr(0, 14) == "Nutshell.File:") {
                        var fileName = key.substr(14);
                        localFiles.push({
                            fileName: fileName,
                            dateModified: new Date(
                                localStorage["Nutshell.Date:" + fileName])
                        });
                    }
                }
                loadDialogDiv.find("#local-files ul")
                    .empty()
                    .append(
                        localFiles.map(function (file) {
                            return $("<li></li>")
                                .append(
                                    $("<a></a>")
                                        .attr("href", "#")
                                        .click(function () {
                                            deSelectAll();
                                            program = loadProgramLocal(file.fileName);
                                            persistenceToolbar.find("#filename").val(file.fileName);
                                            loadDialog.dialog("close");
                                            return false;
                                        })
                                        .append($("<img/>")
                                            .css({
                                                width: 80,
                                                height: 60
                                            })
                                            .attr({
                                                src: localStorage["Nutshell.Screenshot:" + file.fileName],
                                                alt: file.fileName
                                            })
                                        )
                                        .append($("<div></div>").text(file.fileName))
                                )[0];
                        }));
                loadDialog.dialog("open");
                return false;
            });
        ZeroClipboard.setMoviePath(rootPath + "/Scripts/ZeroClipboard.swf");
        var clip = new ZeroClipboard.Client(),
            copyToCsharp = persistenceToolbar.find(".copy-csharp");
        clip.setHandCursor(true);
        clip.addEventListener('onMouseDown', function () {
            clip.setText($("#csharp").val());
        });
        clip.glue(copyToCsharp[0]);
        $("#" + clip.movieId).parent().attr("title", copyToCsharp.attr("title"));
        // Drawing Toolbar
        $.each(Primitives, function (key, primitive) {
            toolbar.append(
                $("<li></li>")
                    .css("cursor", "pointer")
                    .append(
                        $("<img/>")
                            .attr({
                                src: rootPath + "/Content/" + primitive.icon,
                                alt: primitive.name,
                                title: primitive.name
                            })
                    )
                    .click(function () {
                        var newOperation = $.extend(true, { command: key }, primitive.defaults),
                            container = selectedOperation.steps || selectedOperation.parent || program,
                            index = container.indexOf(selectedOperation);
                        if (newOperation.command === "loop") {
                            newOperation.steps.parent = newOperation;
                            var parentLoop = selectedOperation;
                            while (parentLoop && parentLoop.command !== "loop") {
                                parentLoop = parentLoop.parent;
                            }
                            if (parentLoop && parentLoop.command === "loop") {
                                newOperation.counter = nextCounter(parentLoop.counter);
                            }
                        }
                        if (index !== -1 && index + 1 < container.length) {
                            container.splice(index + 1, 0, newOperation);
                            var newEditor = Editor.buildEditor(
                                newOperation,
                                container,
                                container.editor,
                                function () { updateAll(program); },
                                selectedOperation.editor
                            );
                        } else {
                            container.push(newOperation);
                            newEditor = Editor.buildEditor(
                                newOperation,
                                container,
                                container.editor,
                                function () { updateAll(program); }
                            );
                        }
                        deSelectAll();
                        selectedElement = newEditor;
                        select(selectedElement);
                        updateAll(program);
                    })
            );
        });
        updateAll(program);
    };
};