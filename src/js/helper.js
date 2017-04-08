function getCursorPosition(canvas, event) {
    var rect = canvas.getBoundingClientRect()
    return {x: event.clientX - rect.left, y: event.clientY - rect.top}
}

function getAverageValue(array) {
    var values = 0
    var average

    var length = array.length

    for (var i = 0; i < length; i++) {
        values += array[i]
    }

    average = values / length
    return average
}


module.exports = {
    getCursorPosition: getCursorPosition,
    getAverageValue: getAverageValue
}
