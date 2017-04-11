var helper = require('./helper.js')

if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '0.0.0.0') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
}

document.addEventListener("DOMContentLoaded", function (event) {

    var sineFrequency = 5800
    var arrayLength = Math.floor(document.body.clientWidth)
    var started = true
    var error = false

    var canvasHistory = document.getElementById('canvasHistory')
    canvasHistory.width = Math.floor(arrayLength)
    canvasHistory.height = Math.floor(document.body.clientHeight)

    var btnMute = document.getElementById('btnMute')
    var textInfo = document.getElementById('textInfo');
    var btnInfo = document.getElementById('btnInfo');


    function showMessage(message) {
        btnMute.innerHTML = message
    }

    function showErrorBrowserNotSupporting(message, code) {
        error = true
        btnMute.style.font = "14px Arial"
        btnMute.style.textAlign = 'center'

        if (!message) {
            if (window.location.protocol && window.location.protocol.indexOf('https') > -1) {
                showMessage(INTL_ERROR_SUPPORT_WITH_HTTPS + (code ? '[' + code + ']' : ''))
            } else {
                showMessage(INTL_ERROR_SUPPORT_WITHOUT_HTTPS + (code ? '[' + code + ']' : ''))
            }
        } else {
            showMessage(message)
        }


    }


    var AudioContext = helper.getAudioContext()
    navigator.getUserMedia = helper.getUserMedia()


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
        var average = helper.getAverageValue(array)
        globalAverage = average * 0.05
    }


    navigator.getUserMedia({audio: true}, function (stream) {
        console.log('getUserMedia', stream)
        sourceNode = audioCtxMic.createMediaStreamSource(stream)

        sourceNode.connect(biquadFilter)
        biquadFilter.connect(analyserNode)
        analyserNode.connect(javascriptNode)
        javascriptNode.connect(audioCtxMic.destination)
        showMessage(INTL_MUTE_ALARM)


        if (!error) {
            textInfo.style.display = 'none'
            updateCanvasRegular()
        } else {
            canvasHistory.style.display = 'none'
        }


    }, function () {
        error = true;
        showErrorBrowserNotSupporting(null, 16)
        return
    })


    btnMute.onclick = function () {
        if (!error) {
            if (manualMuteFilter.gain.value > 0) {
                manualMuteFilter.gain.value = 0
                showMessage(INTL_UNMUTE_ALARM)
            } else {
                manualMuteFilter.gain.value = 1
                showMessage(INTL_MUTE_ALARM)
            }
        }
    }

    btnInfo.onclick = function () {
        if (textInfo.style.display === 'none') {
            textInfo.style.display = 'block'
        } else {
            textInfo.style.display = 'none'
        }
    }


    var canvasHistorySelectedValue = 0.5

    canvasHistory.addEventListener('click', function (event) {

        var pos = helper.getCursorPosition(canvasHistory, event)
        canvasHistorySelectedValue = 1 - pos.y / canvasHistory.offsetHeight

    }, false)


    var ctxHistory = canvasHistory.getContext("2d")

    var values = []
    for (var i = 0; i < arrayLength; i++) {
        //values.push(0.1+(1+Math.sin(i*0.1))*0.1)
        values.push(0)
    }


    var updateCanvas = function (options) {

        var my_gradient = ctxHistory.createLinearGradient(0, (1 - canvasHistorySelectedValue) * canvasHistory.height - 1, 0, canvasHistory.height);
        my_gradient.addColorStop(0, "darkred");
        my_gradient.addColorStop(0.5, "yellow");
        my_gradient.addColorStop(1, "green");


        ctxHistory.fillStyle = '#000000'
        ctxHistory.fillRect(0, 0, canvasHistory.width, canvasHistory.height)


        ctxHistory.font = Math.min(canvasHistory.height, canvasHistory.width * 0.25) * 0.5 + "px Arial"
        ctxHistory.textAlign = "center"
        ctxHistory.textBaseline = "middle"
        ctxHistory.fillStyle = 'rgba(255,0,0,' + noiseMuteFilter.gain.value * 0.5 + ')'

        ctxHistory.fillText(INTL_SHUTUP_MESSAGE, canvasHistory.width * 0.5, canvasHistory.height * 0.5)

        ctxHistory.save()
        ctxHistory.translate(canvasHistory.width * 0.5, canvasHistory.height * 0.5)
        for (var i = 0; i < noiseMuteFilter.gain.value * 10; i++) {
            ctxHistory.rotate(1)
            ctxHistory.scale(0.9, 0.9)
            ctxHistory.fillText(INTL_SHUTUP_MESSAGE, canvasHistory.width * Math.random(), canvasHistory.height * Math.random())
        }

        ctxHistory.restore()

        for (var i = 0; i < arrayLength; i++) {
            var value = values[i]
            ctxHistory.fillStyle = my_gradient
            //  ctxHistory.rotate((1.0 / 360.) * Math.PI * 2)
            ctxHistory.fillRect(i * canvasHistory.width / arrayLength, canvasHistory.height - value * canvasHistory.height, canvasHistory.width / arrayLength, value * canvasHistory.height)
        }

        ctxHistory.fillStyle = '#ffffff'
        ctxHistory.fillRect(0, (1 - canvasHistorySelectedValue) * canvasHistory.height - 1, canvasHistory.width, 2)


        ctxHistory.font = "15px Arial"
        ctxHistory.fillStyle = '#ffffff'
        ctxHistory.textAlign = "left"
        ctxHistory.textBaseline = "bottom"
        ctxHistory.fillText(INTL_Y_AXIS_LEVEL_DESCRIPTION, 5, (1 - canvasHistorySelectedValue) * canvasHistory.height - 1)


        ctxHistory.textAlign = "left"
        ctxHistory.textBaseline = "top"
        ctxHistory.fillText(INTL_Y_AXIS_LEGEND, 2, 2)

        ctxHistory.textAlign = "right"
        ctxHistory.textBaseline = "bottom"
        ctxHistory.fillText(INTL_X_AXIS_LEGEND, canvasHistory.width - 2, canvasHistory.height - 2)


        //   ctxHistory.fillRect(0, 0, 2, canvasHistory.height)
        //    ctxHistory.fillRect(0, canvasHistory.height - 2, canvasHistory.width, 2)

    }

    var updateCanvasRegular = function () {
        setTimeout(function () {

            values.unshift(globalAverage)
            values.pop()

            //var currentValue = values[0];

            var currentValue = helper.getAverageValue(values.slice(0, 30))

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


    window.onresize = function (event) {
        arrayLength = Math.floor(document.body.clientWidth)
        canvasHistory.width = Math.floor(arrayLength)
        canvasHistory.height = Math.floor(document.body.clientHeight)

        while (values.length < arrayLength) {
            values.push(0)
        }

    };


})
