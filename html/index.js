'use strict'

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
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
}

// 日志输出
const log = document.querySelector('#textarea')
const inputLog = (text, color = '#606266') => {
  const time = new Date()
  const y = time.getFullYear()
  const m = time.getMonth() + 1
  const d = time.getDate()
  const h = time.getHours() < 10 ? '0' + time.getHours() : time.getHours()
  const f = time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes()
  const s = time.getSeconds() < 10 ? '0' + time.getSeconds() : time.getSeconds()
  const now = `[&nbsp;${y}-${m}-${d} ${h}:${f}:${s}&nbsp;]`
  log.innerHTML += `<p><span>${now}<span>&nbsp;&nbsp;<span style="color:${color}">${text}</span></p>`

  // 异步控制滚动条位置，不阻塞主线程
  setTimeout(() => {
  const hScrollTop = log.scrollTop
  const hScrollHeight = log.scrollHeight
  const height = log.offsetHeight
  //滚动条已经到了容器底部
  if((height + hScrollTop) < hScrollHeight){
    const h = hScrollTop + height
    log.scrollTop = h
  }
  }, 0)
}

// 变量声明
const localVideo = document.querySelector('#localVideo')
const remoteVideo = document.querySelector('#remoteVideo')

let localMediaStream, remoteMediaStream
let localPeerConnection, remotePeerConnection

// 初始化
const init = () => {
  inputLog('init success ~', '#67C23A')
  window.addEventListener('error', e => {
    const error = e.error
    inputLog(error.toString(), '#F56C6C')
  })
}

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
    const videoTracks = localMediaStream.getVideoTracks()
    const audioTracks = localMediaStream.getAudioTracks()
    if (videoTracks.length > 0) {
      inputLog(`Using video device: ${videoTracks[0].label}`)
    }
    if (audioTracks.length > 0) {
      inputLog(`Using audio device: ${audioTracks[0].label}`)
    }

    // NAT网络类型
    localPeerConnection = new RTCPeerConnection()
    localPeerConnection.addEventListener('icecandidate', e => onIceCandidate(localPeerConnection, e))
    localPeerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(localPeerConnection, e))

    remotePeerConnection = new RTCPeerConnection()
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
  inputLog(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`)
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