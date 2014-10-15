function enumeration(name, items) {
    for (var a in items) {
        items[a] = {
            isEnumerationValue: true,
            name: a,
            value: items[a],
            enumeration: name
        };
    }
    return enumeration[name] = window[name] = items;
}

enumeration("cornerPosition", {
    TopLeft: "CornerPosition.TopLeft",
    TopRight: "CornerPosition.TopRight",
    BottomLeft: "CornerPosition.BottomLeft",
    BottomRight: "CornerPosition.BottomRight"
});
enumeration("drawingDirection", {
    Left: "DrawingDirection.Left",
    Right: "DrawingDirection.Right",
    Up: "DrawingDirection.Up",
    Down: "DrawingDirection.Down"
});
enumeration("roundedCornerStyle", {
    None: "RoundedCornerStyle.None",
    All: "RoundedCornerStyle.All",
    Top: "RoundedCornerStyle.Top",
    Bottom: "RoundedCornerStyle.Bottom",
    Left: "RoundedCornerStyle.Left",
    Right: "RoundedCornerStyle.Right"
});