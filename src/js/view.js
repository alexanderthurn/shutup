var helper = require('./helper.js')

/* make sure to use https as the web audio api does not like http */

if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '0.0.0.0') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
}


/* start as soon as things are set up */
document.addEventListener("DOMContentLoaded", function (event) {


    var sineFrequency = 5800  //alarm frequency
    var canvasHistorySelectedValue = 0.5 // the default accepted volume (can be between 0 and 1)
    var arrayLength = Math.floor(document.body.clientWidth)
    var started = true
    var error = false
    var globalAverage
    var canvasHistory = document.getElementById('canvasHistory')
    var btnMute = document.getElementById('btnMute')
    var textInfo = document.getElementById('textInfo');
    var btnInfo = document.getElementById('btnInfo');
    var lineVolume = document.getElementById('lineVolume');
    var axisX = document.getElementById('axisX');
    var axisY = document.getElementById('axisY');
    var ctxHistory = canvasHistory.getContext("2d")
    var time;
    var values = []
    // prefill the array
    for (var i = 0; i < arrayLength; i++) {
        //values.push(0.1+(1+Math.sin(i*0.1))*0.1)
        values.push(0)
    }

    canvasHistory.width = Math.floor(arrayLength)
    canvasHistory.height = Math.floor(document.body.clientHeight)

    // we are using the mute button to show important info for simplicity
    function showMessage(message) {
        btnMute.innerHTML = message
    }

    function showErrorBrowserNotSupporting(message, code) {
        error = true
        btnMute.style.font = "14px Arial"
        btnMute.style.textAlign = 'center'
        btnMute.style.display = 'block';

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

    // get audio stuff together using helper methods for maximum compatibility
    helper.setAudioContextWithFallback()
    helper.setUserMediaWithFallback()
    helper.setRequestAnmationFrameWithFallback()


    // if the browser does not support audio stuff, show him an error message
    if (!window.AudioContext || !navigator.mediaDevices.getUserMedia || !Array.prototype.slice) {
        showErrorBrowserNotSupporting(null, (!AudioContext * 2) + (!navigator.mediaDevices.getUserMedia * 4) + (!Array.prototype.slice * 8))
        return
    }

    var audioCtx = new window.AudioContext()
    var audioCtxMic = new window.AudioContext()

    // create oscillator node for the alarm
    var oscillator = audioCtx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = sineFrequency // value in hertz

    // add a mute filter as we only want to hear the alarm if the volume is too high
    var noiseMuteFilter = audioCtx.createGain()
    noiseMuteFilter.gain.value = 0

    // add another mute filter in case the user does not want any sound at all and only visual effects
    var manualMuteFilter = audioCtx.createGain()
    manualMuteFilter.gain.value = 1

    // wire everything together
    oscillator.connect(noiseMuteFilter)
    noiseMuteFilter.connect(manualMuteFilter)
    manualMuteFilter.connect(audioCtx.destination)

    // start the larm
    oscillator.start()

    // source node is used for mic input
    var sourceNode

    // a biquadfilter is used to remove the sine "volume" from the mic input. otherwise it could result in an endless alarm if the alarmsound itself exceeds the limit
    var biquadFilter = audioCtxMic.createBiquadFilter()
    biquadFilter.type = "notch"
    biquadFilter.frequency.value = sineFrequency
    biquadFilter.Q.value = 0.01

    // analyser and javascript node to process the mic input and check if the volume is too high
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


    // ask for mic permission
    navigator.mediaDevices.getUserMedia({audio: true}).then(function (stream) {

        //display stuff if it works
        btnInfo.style.display = 'block';
        lineVolume.style.display = 'block';
        textInfo.style.display = 'block';


        console.log('getUserMedia', stream)

        //create the source node using the mic input as a stream
        sourceNode = audioCtxMic.createMediaStreamSource(stream)

        //wire everything together
        sourceNode.connect(biquadFilter)
        biquadFilter.connect(analyserNode)
        analyserNode.connect(javascriptNode)
        javascriptNode.connect(audioCtxMic.destination)


        if (!error) {
            //start rendering and switch title of the mute button as no error occured (and we were reusing the mute button for error messages)
            textInfo.style.display = 'none'
            showMessage(INTL_MUTE_ALARM)
            updateCanvasRegular()
        } else {
            // it did not work, do not show the canvas
            canvasHistory.style.display = 'none'
        }


    }).catch(function (err) {

        // the user did not allow it or it did not work
        error = true;
        console.log(err.name + ": " + err.message);
        showErrorBrowserNotSupporting(null, 16)
        return
    })


    // mute button, setting the gain value to 0 if no volume is wanted
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

    // display info about the app and axis
    btnInfo.onclick = function () {
        if (textInfo.style.display === 'none') {
            textInfo.style.display = 'block'
            axisX.style.display = 'block';
            axisY.style.display = 'block';
            btnMute.style.display = 'block';
        } else {
            textInfo.style.display = 'none'
            axisX.style.display = 'none';
            axisY.style.display = 'none';
            btnMute.style.display = 'none';
        }
    }

    // changing the maximum volume that is allowed
    canvasHistory.addEventListener('click', function (event) {

        var pos = helper.getCursorPosition(canvasHistory, event)
        canvasHistorySelectedValue = 1 - pos.y / canvasHistory.offsetHeight

    }, false)


    // render canvas
    var updateCanvas = function (options) {

        // use a nice gradient to show which recorded volume was too loud
        var myGradient = ctxHistory.createLinearGradient(0, (1 - canvasHistorySelectedValue) * canvasHistory.height - 1, 0, canvasHistory.height);
        myGradient.addColorStop(0, "darkred");
        myGradient.addColorStop(0.5, "yellow");
        myGradient.addColorStop(1, "green");

        // move the volume line to the correct position
        lineVolume.style.top = (1 - canvasHistorySelectedValue) * canvasHistory.height - 15;


        // render a blue background, but only with 10% of alpha to get a nice effect
        ctxHistory.fillStyle = 'rgba(50,50,255,0.1)'
        ctxHistory.fillRect(0, 0, canvasHistory.width, canvasHistory.height)

        // show shutup text if needed
        ctxHistory.font = Math.min(canvasHistory.height, canvasHistory.width * 0.25) * 0.5 + "px Arial"
        ctxHistory.textAlign = "center"
        ctxHistory.textBaseline = "middle"
        ctxHistory.fillStyle = 'rgba(255,0,0,' + noiseMuteFilter.gain.value * 0.1 + ')'
        ctxHistory.fillText(INTL_SHUTUP_MESSAGE, canvasHistory.width * 0.5 + (0.5 - Math.random()) * canvasHistory.width * 0.01, canvasHistory.height * 0.5 + (0.5 - Math.random()) * canvasHistory.width * 0.01)

        // show some more shutup texts to get a nice effect
        ctxHistory.save()
        ctxHistory.translate(canvasHistory.width * 0.5, canvasHistory.height * 0.5)
        for (var i = 0; i < noiseMuteFilter.gain.value * 10; i++) {
            ctxHistory.rotate(1)
            ctxHistory.scale(0.9, 0.9)
            ctxHistory.fillText(INTL_SHUTUP_MESSAGE, canvasHistory.width * Math.random(), canvasHistory.height * Math.random())
        }
        ctxHistory.restore()

        // render the volume bars
        for (var i = 0; i < arrayLength; i++) {
            var value = values[i]
            ctxHistory.fillStyle = myGradient
            //  ctxHistory.rotate((1.0 / 360.) * Math.PI * 2)
            ctxHistory.fillRect(i * canvasHistory.width / arrayLength, canvasHistory.height - value * canvasHistory.height, canvasHistory.width / arrayLength, value * canvasHistory.height)
        }


    }

    // main loop, calls the render method each 30ms + calculates the current average volume + activates the alarm
    var updateCanvasRegular = function () {

        var now = new Date().getTime(),
            dt = now - (time || now);

        var dtFactor = dt / 30.0;
        if (dtFactor < 0.001) {
            dtFactor = 0.001;
        } else if (dtFactor > 5.0) {
            dtFactor = 5.0;
        }
        time = now;

        values.unshift(globalAverage)
        values.pop()

        // we want the average of the last 30 recorded audio frames
        var currentValue = helper.getAverageValue(values.slice(0, 30))

        // if the volume is too loud, increase the value of the alarm gain node based on "how loud it is"
        var tooLoud = currentValue > canvasHistorySelectedValue
        if (tooLoud) {

            if (noiseMuteFilter.gain.value < 0.1) {
                noiseMuteFilter.gain.value = 0.1
            } else {
                noiseMuteFilter.gain.value *= (1.05 + (currentValue - canvasHistorySelectedValue) * 0.2 * dtFactor)
                if (noiseMuteFilter.gain.value > 1.0) {
                    noiseMuteFilter.gain.value = 1.0
                }
            }
        } else {

            // if the volume gets back to normal, reduce the volume over time
            noiseMuteFilter.gain.value *= (1 - 0.05 * dtFactor)
        }


        updateCanvas({tooLoud: tooLoud})
        window.requestAnimationFrame(updateCanvasRegular)

    }

// recalculate the canvas size after resize events
    window.onresize = function (event) {
        arrayLength = Math.floor(document.body.clientWidth)
        canvasHistory.width = Math.floor(arrayLength)
        canvasHistory.height = Math.floor(document.body.clientHeight)

        while (values.length < arrayLength) {
            values.push(0)
        }

    };


})
