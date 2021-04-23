'use strict'
const URL = 'ws://127.0.0.1:3479'
const socket = io(URL, { autoConnect: true })
socket.onAny((event, ...args) => {
  inputLog(`[ ${event} ] ${args.toString().replace(',', ' : ')}`, '#AC40FF')
})

// 视频流配置
const mediaStreamQuery = {
  video: {
    facingMode: "user",
    width: {
      min: 600,
      ideal: 1080,
      max: 1920
    },
    height: {
      min: 400,
      ideal: 720,
      max: 1080
    }
  },
  audio: false
}
const configuration = {
  iceServers: [
    // {
    //   'urls': 'stun:stun.l.google.com:19302'
    // },
    {
      urls: 'stun:119.28.31.21:3478',
    },
    {
      urls: 'turn:119.28.31.21:3478',
      username: 'user123',
      credential: 'pass123'
    }
  ],
  iceTransportPolicy: 'relay', // 可选值 all or relay
  iceCandidatePoolSize: 0
}
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
}
let timer

// 变量声明
const localVideo = document.querySelector('#localVideo')
const remoteVideo = document.querySelector('#remoteVideo')
const rttDom = document.querySelectorAll('td')

let localMediaStream, remoteMediaStream
let localPeerConnection, remotePeerConnection

init()

// 获取本地视频流
const getLocalVideoStream = async () => {
  try {
    socket.emit('create room', 2021)
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamQuery)
    localVideo.srcObject = mediaStream
    localMediaStream = mediaStream

    localPeerConnection = new RTCPeerConnection(configuration)

    localPeerConnection.addEventListener('icecandidate', e => onIceCandidate(localPeerConnection, e))
    localPeerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(localPeerConnection, e))

    localMediaStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localMediaStream))
    inputLog('navigator.mediaDevices.getUserMedia success ~', '#67C23A')
  } catch (error) {
    // 错误日志
    inputLog('getLocalVideoStream ' + error, '#F56C6C')
  }
}

// 连接远程
const p2pConnection = async () => {
  try {
    // 默认加入2021房间
    socket.emit('join room', 2021)

    const videoTracks = localMediaStream.getVideoTracks()
    const audioTracks = localMediaStream.getAudioTracks()
    if (videoTracks.length > 0) {
      inputLog(`Using video device: ${videoTracks[0].label}`)
    }
    if (audioTracks.length > 0) {
      inputLog(`Using audio device: ${audioTracks[0].label}`)
    }

    remotePeerConnection = new RTCPeerConnection(configuration)
    timer = setInterval(() => {
      remotePeerConnection.getStats(null).then(stats => {
        stats.forEach(report => {
          if (report && report.type === 'candidate-pair') {
            rttDom[1].innerText = ((report.totalRoundTripTime / report.responsesReceived) * 1000).toFixed(2) + ' ms'
            rttDom[2].innerText = (report.bytesSent / 1024 / 1024).toFixed(2) + ' / ' + (report.bytesReceived / 1024 / 1024).toFixed(2)
          } else if (report && report.type === 'remote-candidate') {
            rttDom[0].innerText = `remote ${report.ip} | ${report.protocol} | ${report.candidateType}`
          } else if (report && report.type === 'inbound-rtp') {
            rttDom[3].innerText = `${report.decoderImplementation} | ${report.framesPerSecond} | ${report.framesDropped} | ${(report.totalInterFrameDelay / report.framesReceived * 1000).toFixed(2)} ms`
          }
        })
      })
    }, 1e3)

    remotePeerConnection.addEventListener('icecandidate', e => onIceCandidate(remotePeerConnection, e))
    remotePeerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(remotePeerConnection, e))
    
    remotePeerConnection.addEventListener('track', gotRemoteStream)
    inputLog('Added local stream to localPeerConnection')

    try {
      inputLog('localPeerConnection createOffer start')
      const offer = await localPeerConnection.createOffer(offerOptions)
      await onCreateOfferSuccess(offer)
    } catch (error) {
    inputLog(`Failed to create session description: ${error.toString()}`, '#F56C6C')
    }
  } catch (error) {
    inputLog('p2pConnection ' + error, '#F56C6C')
  }
}

// 挂断
const hangUp = () => {
  clearInterval(timer)
  localPeerConnection.close()
  remotePeerConnection.close()
  localPeerConnection = null
  remotePeerConnection = null
  inputLog('hangUp success ~', '#67C23A')
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0]
    inputLog('remotePeerConnection received remote stream')
  }
}

function getPcName(pc) {
  return (pc === localPeerConnection) ? 'localPeerConnection' : 'remotePeerConnection'
}

function getOtherPcName(pc) {
  return (pc === localPeerConnection) ? 'remotePeerConnection' : 'localPeerConnection'
}

function getOtherPc(pc) {
  return (pc === localPeerConnection) ? remotePeerConnection : localPeerConnection
}

async function onIceCandidate(pc, event) {
  try {
    if (getPcName(pc) === 'localPeerConnection') {
      await socket.emit('local stream candidate', event.candidate)
    } else {
      await socket.emit('remote stream candidate', event.candidate)
    }
    await socket.on(`got ${getOtherPcName(pc)} candidate`, async candidate => {
      await (getOtherPc(pc).addIceCandidate(candidate))
    })
    // await (getOtherPc(pc).addIceCandidate(event.candidate))
    inputLog(`${getPcName(pc)} addIceCandidate success`, '#67C23A')
  } catch (error) {
    inputLog(`${getPcName(pc)} failed to add ICE Candidate: ${error.toString()}`, '#F56C6C')
  }
  inputLog(`${getPcName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : 'Authentication failed ?'}`)
}

function onIceStateChange(pc, event) {
  if (pc) {
    inputLog(`${getPcName(pc)} ICE state: ${pc.iceConnectionState}`)
    inputLog('ICE state change event: ', event)
  }
}

async function onCreateAnswerSuccess(desc) {
  inputLog(`Answer from remotePeerConnection:\n${desc.sdp}`, '#67C23A')
  inputLog('remotePeerConnection setLocalDescription start', '#67C23A')
  try {
    await remotePeerConnection.setLocalDescription(desc)
    inputLog(`${getPcName(remotePeerConnection)} setLocalDescription complete`, '#67C23A')

  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }
  inputLog('localPeerConnection setRemoteDescription start', '#67C23A')
  try {
    await localPeerConnection.setRemoteDescription(desc)
    inputLog(`${getPcName(localPeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }
}

async function onCreateOfferSuccess(desc) {
  inputLog(`Offer from localPeerConnection\n${desc.sdp}`)
  inputLog('localPeerConnection setLocalDescription start')
  try {
    await socket.emit('local stream desc', desc)
    await socket.on(`got localPeerConnection desc`, async resDesc => {
      await localPeerConnection.setLocalDescription(resDesc)
    })
    inputLog(`${getPcName(localPeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }

  inputLog('remotePeerConnection setRemoteDescription start')
  try {
    await socket.emit('remote stream desc', desc)
    await socket.on(`got remotePeerConnection desc`, async resDesc => {
      await remotePeerConnection.setRemoteDescription(resDesc)
      inputLog('remotePeerConnection createAnswer start')
      try {
        const answer = await remotePeerConnection.createAnswer()
        await onCreateAnswerSuccess(answer)
      } catch (error) {
        inputLog(`Failed to create session description: ${error.toString()}`, '#F56C6C')
      }
    })
    inputLog(`${getPcName(remotePeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }  
}
