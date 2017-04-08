document.addEventListener("DOMContentLoaded", function (event) {

    var sineFrequency = 5800
    var arrayLength = Math.floor(document.body.clientWidth)
    var started = true
    var error = false


    var canvasHistory = document.createElement('canvas')
    canvasHistory.id = "canvasHistory"
    canvasHistory.width = Math.floor(arrayLength)
    canvasHistory.height = Math.floor(arrayLength * 0.3)
    canvasHistory.style.width = '80%'
    canvasHistory.style.marginLeft = '10%'
    canvasHistory.style.marginTop = '10px'
    document.body.appendChild(canvasHistory)
    document.body.style.margin = 0
    document.body.style.backgroundColor = '#000000'


    var btnMute = document.createElement('a')
    btnMute.id = 'btnMute'
    btnMute.innerHTML = '1. Allow mic access<br />2. Turn your speaker on'
    btnMute.style.color = '#ffffff'
    btnMute.style.display = 'block'
    btnMute.style.font = '20px Arial'
    btnMute.style.width = '80%'
    btnMute.style.minHeight = '50px'
    btnMute.style.marginLeft = '10%'
    btnMute.style.textAlign = 'right'
    btnMute.style.marginBottom = '20px'

    document.body.appendChild(btnMute)


    var textInfo = document.createElement('div');
    textInfo.id = 'textInfo'
    textInfo.style.marginLeft = '10%'
    textInfo.style.width = '80%'
    textInfo.style.textAlign = 'center'
    textInfo.style.color = '#ffffff'
    textInfo.innerHTML = 'This application uses your microphone to detect the noise level in your office, room or wherever you are. You can choose a specific noise level that you are willing to take. If the volume gets above this level, an evil sine alarm sound will crush your noise enemy. Have fun. Author: Alexander Thurn 2017, <p><a style="color: #ffffff" href="https://froso.de">Frontend Solutions</a> <a style="color: #ffffff" href="https://github.com/alexanderthurn/shutup">Github</a></p>'

    document.body.appendChild(textInfo)


    function showMessage(message) {
        btnMute.innerHTML = message
    }

    function showErrorBrowserNotSupporting(message, code) {
        error = true
        btnMute.style.font = "30px Arial"
        btnMute.style.textAlign = 'center'

        if (!message) {
            if (window.location.protocol && window.location.protocol.indexOf('https') > -1) {
                showMessage('Sorry. This browser does not support microphone access (Or you did not allow the access). The app does not work without access. Best solution right now is a modern Chrome on a desktop computer (mac/windows/linux) !' + (code ? '[' + code + ']' : ''))
            } else {
                showMessage('Sorry. This browser does not support microphone access (Or you are not accessing this page via https). The app does not work without access. Best solution right now is a modern Chrome on a desktop computer (mac/windows/linux) !' + (code ? '[' + code + ']' : ''))
            }
        } else {
            showMessage(message)
        }


    }


    var AudioContext = ( AudioContext || window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.msAudioContext)

    navigator.getUserMedia = ( navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);


    if (!AudioContext || !navigator.getUserMedia || !Array.prototype.slice) {
        showErrorBrowserNotSupporting(null, (!AudioContext * 2) + (!navigator.getUserMedia * 4) + (!Array.prototype.slice * 8))
        return
    }

    var audioCtx = new AudioContext()
    var audioCtxMic = new AudioContext()

    // create Oscillator node
    var oscillator = audioCtx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = sineFrequency // value in hertz

    var noiseMuteFilter = audioCtx.createGain()
    noiseMuteFilter.gain.value = 0

    var manualMuteFilter = audioCtx.createGain()
    manualMuteFilter.gain.value = 1

    oscillator.connect(noiseMuteFilter)
    noiseMuteFilter.connect(manualMuteFilter)
    manualMuteFilter.connect(audioCtx.destination)

    oscillator.start()


    var globalAverage
    var sourceNode

    var biquadFilter = audioCtxMic.createBiquadFilter()
    biquadFilter.type = "notch"
    biquadFilter.frequency.value = sineFrequency
    biquadFilter.Q.value = 0.01

    var analyserNode = audioCtxMic.createAnalyser()
    analyserNode.smoothingTimeConstant = 0.3
    analyserNode.fftSize = 1024

    var javascriptNode = audioCtxMic.createScriptProcessor(1024, 1, 1)
    javascriptNode.onaudioprocess = function () {

        var array = new Uint8Array(analyserNode.frequencyBinCount)
        analyserNode.getByteFrequencyData(array)
        var average = getAverageVolume(array)
        globalAverage = average * 0.05
    }


    navigator.getUserMedia({audio: true}, function (stream) {
        console.log('getUserMedia', stream)
        sourceNode = audioCtxMic.createMediaStreamSource(stream)

        sourceNode.connect(biquadFilter)
        biquadFilter.connect(analyserNode)
        analyserNode.connect(javascriptNode)
        javascriptNode.connect(audioCtxMic.destination)
        showMessage('Mute alarm sound')


    }, function () {
        showErrorBrowserNotSupporting(null, 16)
        return
    })


    btnMute.onclick = function () {
        if (!error) {
            if (manualMuteFilter.gain.value > 0) {
                manualMuteFilter.gain.value = 0
                showMessage('Unmute alarm sound')
            } else {
                manualMuteFilter.gain.value = 1
                showMessage('Mute alarm sound')
            }
        }
    }


    var canvasHistorySelectedValue = 0.5

    canvasHistory.addEventListener('click', function (event) {

        var pos = getCursorPosition(canvasHistory, event)
        canvasHistorySelectedValue = 1 - pos.y / canvasHistory.offsetHeight

    }, false)


    var ctxHistory = canvasHistory.getContext("2d")

    var values = []
    for (var i = 0; i < arrayLength; i++) {
        //values.push(0.1+(1+Math.sin(i*0.1))*0.1)
        values.push(0)
    }

    var updateCanvas = function (options) {

        ctxHistory.fillStyle = '#000000'
        ctxHistory.fillRect(0, 0, canvasHistory.width, canvasHistory.height)

        ctxHistory.font = canvasHistory.height * 0.5 + "px Arial"
        ctxHistory.textAlign = "center"
        ctxHistory.textBaseline = "middle"
        ctxHistory.fillStyle = 'rgba(255,0,0,' + noiseMuteFilter.gain.value + ')'
        ctxHistory.fillText('SHUT UP', canvasHistory.width * 0.5, canvasHistory.height * 0.5)

        for (var i = 0; i < arrayLength; i++) {
            var value = values[i]
            ctxHistory.fillStyle = '#ff0000'
            ctxHistory.fillRect(i * canvasHistory.width / arrayLength, canvasHistory.height - value * canvasHistory.height, canvasHistory.width / arrayLength, value * canvasHistory.height)
        }

        ctxHistory.fillStyle = '#ffffff'
        ctxHistory.fillRect(0, (1 - canvasHistorySelectedValue) * canvasHistory.height - 1, canvasHistory.width, 2)


        ctxHistory.font = "15px Arial"
        ctxHistory.fillStyle = '#ffffff'
        ctxHistory.textAlign = "left"
        ctxHistory.textBaseline = "bottom"
        ctxHistory.fillText('MAXIMUM NOISE THAT YOU ARE WILLING TO TAKE', 5, (1 - canvasHistorySelectedValue) * canvasHistory.height - 1)


        ctxHistory.textAlign = "left"
        ctxHistory.textBaseline = "top"
        ctxHistory.fillText('NOISE LEVEL (no unit)', 5, 0)

        ctxHistory.textAlign = "right"
        ctxHistory.textBaseline = "bottom"
        ctxHistory.fillText('Time (seconds)', canvasHistory.width, canvasHistory.height - 2)


        ctxHistory.fillRect(0, 0, 2, canvasHistory.height)
        ctxHistory.fillRect(0, canvasHistory.height - 2, canvasHistory.width, 2)
    }

    var updateCanvasRegular = function () {
        setTimeout(function () {

            values.unshift(globalAverage)
            values.pop()

            //var currentValue = values[0];

            var currentValue = getAverageVolume(values.slice(0, 30))

            var tooLoud = currentValue > canvasHistorySelectedValue
            if (tooLoud) {

                if (noiseMuteFilter.gain.value < 0.1) {
                    noiseMuteFilter.gain.value = 0.1
                } else {
                    noiseMuteFilter.gain.value *= (1.05 + (currentValue - canvasHistorySelectedValue) * 0.2)
                    if (noiseMuteFilter.gain.value > 1.0) {
                        noiseMuteFilter.gain.value = 1.0
                    }
                }
            } else {
                noiseMuteFilter.gain.value *= 0.95
            }


            updateCanvas({tooLoud: tooLoud})
            updateCanvasRegular()
        }, 30)
    }
    updateCanvasRegular()


    window.onresize = function (event) {
        arrayLength = Math.floor(document.body.clientWidth)
        canvasHistory.width = Math.floor(arrayLength)
        canvasHistory.height = Math.floor(arrayLength * 0.3)

        while (values.length < arrayLength) {
            values.push(0)
        }

    };


    function getCursorPosition(canvas, event) {
        var rect = canvas.getBoundingClientRect()
        return {x: event.clientX - rect.left, y: event.clientY - rect.top}
    }

    function getAverageVolume(array) {
        var values = 0
        var average

        var length = array.length

        for (var i = 0; i < length; i++) {
            values += array[i]
        }

        average = values / length
        return average
    }


})
