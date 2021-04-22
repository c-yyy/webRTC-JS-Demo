'use strict'
const socket = io.connect('ws://127.0.0.1:3478')
socket.on('connect', () => {
  console.log('connect')
})
socket.emit('create or join', '123')

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

// 变量声明
const localVideo = document.querySelector('#localVideo')
const remoteVideo = document.querySelector('#remoteVideo')

let localMediaStream, remoteMediaStream
let localPeerConnection, remotePeerConnection

init()

// 获取本地视频流
const getLocalVideoStream = async () => {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamQuery)
    localVideo.srcObject = mediaStream
    localMediaStream = mediaStream
    inputLog('navigator.mediaDevices.getUserMedia success ~', '#67C23A')
  } catch (error) {
    // 错误日志
    inputLog('getLocalVideoStream ' + error, '#F56C6C')
  }
}

// 连接远程
const p2pConnection = async () => {
  try {
    window.room = prompt('房间号：')
    if (room !== '') {
      inputLog('Message from client: Asking to join room ' + room)
      socket.emit('create or join', room)
    }

    const videoTracks = localMediaStream.getVideoTracks()
    const audioTracks = localMediaStream.getAudioTracks()
    if (videoTracks.length > 0) {
      inputLog(`Using video device: ${videoTracks[0].label}`)
    }
    if (audioTracks.length > 0) {
      inputLog(`Using audio device: ${audioTracks[0].label}`)
    }

    localPeerConnection = new RTCPeerConnection(configuration)
    localPeerConnection.addEventListener('icecandidate', e => onIceCandidate(localPeerConnection, e))
    localPeerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(localPeerConnection, e))

    remotePeerConnection = new RTCPeerConnection(configuration)
    remotePeerConnection.addEventListener('icecandidate', e => onIceCandidate(remotePeerConnection, e))
    remotePeerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(remotePeerConnection, e))
    
    remotePeerConnection.addEventListener('track', gotRemoteStream)

    localMediaStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localMediaStream))
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

function getName(pc) {
  return (pc === localPeerConnection) ? 'localPeerConnection' : 'remotePeerConnection'
}

function getOtherPc(pc) {
  return (pc === localPeerConnection) ? remotePeerConnection : localPeerConnection
}

async function onIceCandidate(pc, event) {
  try {
    await (getOtherPc(pc).addIceCandidate(event.candidate))
    inputLog(`${getName(pc)} addIceCandidate success`, '#67C23A')
  } catch (error) {
    inputLog(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`, '#F56C6C')
  }
  inputLog(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : 'Authentication failed ?'}`)
}

function onIceStateChange(pc, event) {
  if (pc) {
    inputLog(`${getName(pc)} ICE state: ${pc.iceConnectionState}`)
    inputLog('ICE state change event: ', event)
  }
}

async function onCreateAnswerSuccess(desc) {
  inputLog(`Answer from remotePeerConnection:\n${desc.sdp}`, '#67C23A')
  inputLog('remotePeerConnection setLocalDescription start', '#67C23A')
  try {
    await remotePeerConnection.setLocalDescription(desc)
    inputLog(`${getName(remotePeerConnection)} setLocalDescription complete`, '#67C23A')

  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }
  inputLog('localPeerConnection setRemoteDescription start', '#67C23A')
  try {
    await localPeerConnection.setRemoteDescription(desc)
    inputLog(`${getName(localPeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }
}

async function onCreateOfferSuccess(desc) {
  inputLog(`Offer from localPeerConnection\n${desc.sdp}`)
  inputLog('localPeerConnection setLocalDescription start')
  try {
    await localPeerConnection.setLocalDescription(desc)
    inputLog(`${getName(localPeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }

  inputLog('remotePeerConnection setRemoteDescription start')
  try {
    await remotePeerConnection.setRemoteDescription(desc)
    inputLog(`${getName(remotePeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }

  inputLog('remotePeerConnection createAnswer start')
  try {
    const answer = await remotePeerConnection.createAnswer()
    await onCreateAnswerSuccess(answer)
  } catch (error) {
    inputLog(`Failed to create session description: ${error.toString()}`, '#F56C6C')
  }
}
