'use strict'
const PORT = 3479
const URL = `http://127.0.0.1:${PORT}`
const socket = io(URL, {
  autoConnect: false,
  reconnectionDelayMax: 10000,
  auth: {
    token: '2022'
  },
  query: {
    'my-query': 'my-value'
  }
})
socket.onAny((event, ...args) => {
  inputLog(`【${event}】${args.toString().replace(',', ' : ')}`, '#AC40FF')
})

/**
 * 视频流配置
 * 结合场景权衡利弊
 * 带宽受限情况下，思考视频内容是优先保证帧率还是分辨率
 * 1.如果是通话，优先保证帧率
 * 2.如果是屏幕共享，优先分辨率
 */
const mediaStreamQuery = {
  video: {
    // deviceId: '',
    facingMode: "user", // environment 后置
    frameRate: { ideal: 10, max: 15 },
    width: {
      min: 320,
      ideal: 1280,
      max: 1920
    },
    height: {
      min: 240,
      ideal: 720,
      max: 1080
    }
  },
  audio: true
}
const configuration = {
  iceServers: [
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
let timer, sign
const isClinet = window.location.href.includes('clinet=')

// 变量声明
const localVideo = document.querySelector('#localVideo')
const remoteVideo = document.querySelector('#remoteVideo')
const rttDom = document.querySelectorAll('td')

let localMediaStream, remoteMediaStream
let localPeerConnection, remotePeerConnection

// 连接远程
const p2pConnection = async () => {
  try {
    // 清除未销毁的媒体流
    if (window.stream) {
      window.stream.getTracks().forEach(track => {
        track.stop()
      })
    }
    // getDisplayMedia 分享屏幕
    const mediaStream = await navigator.mediaDevices.getUserMedia(mediaStreamQuery)
    localVideo.srcObject = mediaStream
    localMediaStream = mediaStream

    /**
     * 各个浏览器尽量兼容 PeerConnection
     * addIceCandidate()： 保存 ICE 候选信息，即双方协商信息，持续整个建立通信过程，直到没有更多候选信息
     * addTrack() ：添加音频或者视频轨道
     * createAnswer() ：创建应答信令
     * createDataChannel()： 创建消息通道，建立WebRTC通信之后，就可以 p2p 的直接发送文本消息，无需中转服务器
     * createOffer()： 创建初始信令
     * setRemoteDescription()： 保存远端发送给自己的信令
     * setLocalDescription() ：保存自己端创建的信令
     */
    const PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection
    localPeerConnection = new PeerConnection(configuration)

    localPeerConnection.addEventListener('icecandidate', e => onIceCandidate(localPeerConnection, e))
    localPeerConnection.addEventListener('iceconnectionstatechange', e => onIceStateChange(localPeerConnection, e))

    localPeerConnection.addStream(localMediaStream)
    // localMediaStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localMediaStream))
    try {
      inputLog('localPeerConnection createOffer start')
      const offer = await localPeerConnection.createOffer(offerOptions)
      localPeerConnection.setLocalDescription(offer)
      socket.emit('msg', 2022, offer);
    } catch (error) {
      inputLog(`请先接通本地视频 Failed to create session description: ${error.toString()}`, '#F56C6C')
    }

    // if (!sign) {
    //   // 本地测试
    //   window.open('http://127.0.0.1:3478/?clinet=2022')
    //   setTimeout(() => {
    //     socket.emit('join', 2022)
    //   }, 1e3);
    // }
    inputLog('navigator.mediaDevices.getUserMedia success ~', '#67C23A')
  } catch (error) {
    // 错误日志
    inputLog('getLocalVideoStream ' + error, '#F56C6C')
  }

  await socket.on(`joined`, async res => {
    try {
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
              rttDom[2].innerText = `${(report.bytesSent / 1024 / 1024).toFixed(2)} MB` + ' | ' + `${(report.bytesReceived / 1024 / 1024).toFixed(2)} MB`
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
      
      remotePeerConnection.addEventListener('onaddstream', gotRemoteStream)
      remotePeerConnection.addEventListener('track', gotRemoteStream)
      inputLog('Added local stream to localPeerConnection')
  
      try {
        inputLog('localPeerConnection createOffer start')
        const offer = await localPeerConnection.createOffer(offerOptions)
        await onCreateOfferSuccess(offer)
      } catch (error) {
        inputLog(`请先接通本地视频 Failed to create session description: ${error.toString()}`, '#F56C6C')
      }
    } catch (error) {
      inputLog('p2pConnection ' + error, '#F56C6C')
    }
  })

  await socket.on('msg', async (roomid, data) => {
		console.log('receive message!', roomid, data);

		if (data === null || data === undefined){
			console.error('the message is invalid!');
			return;	
		}

		if (data.hasOwnProperty('type') && data.type === 'offer') {
      console.log('offer', data)
			remotePeerConnection.setRemoteDescription(new RTCSessionDescription(data));
			//create answer
      const answer = await remotePeerConnection.createAnswer()
      remotePeerConnection.setLocalDescription(answer)

			socket.emit('msg', 2022, answer);

		} else if (data.hasOwnProperty('type') && data.type == 'answer'){
      console.log('answer', data)

			// answer.value = data.sdp;
			localPeerConnection.setRemoteDescription(new RTCSessionDescription(data));
		
		} else if  (data.hasOwnProperty('type') && data.type === 'candidate'){
      console.log('candidate', data)

			const candidate = new RTCIceCandidate({
				sdpMLineIndex: data.label,
				candidate: data.candidate
			});
			localPeerConnection.addIceCandidate(candidate);
			remotePeerConnection.addIceCandidate(candidate);
		
		} else {
			console.log('the message is invalid!', data);
		}
	})
}

// 初始化
const init = async () => {
  socket.connect()

  inputLog('init success ~', '#67C23A')

  socket.emit('msg', 'socket success ~')

  inputLog('socket success ~', '#67C23A')

  window.addEventListener('error', e => {
    const error = e.error
    inputLog(error.toString(), '#F56C6C')
  })
  // 区分客户端
  if (isClinet && !sign) {
    sign = confirm('隔壁请求与你视频')
    console.log(sign)
    if (sign) {
      inputLog(`连接房间，开始视频`)        
      p2pConnection()
      socket.emit('join', 2022)
    }
  }
}

init()

// 挂断
const hangUp = () => {
  if (localPeerConnection && remotePeerConnection) {
    localPeerConnection.close()
    remotePeerConnection.close()
  }
  localVideo.srcObject = null
  remoteVideo.srcObject = null
  localPeerConnection = null
  remotePeerConnection = null
  setTimeout(() => {
    socket.emit('leave', 2022)
    socket.disconnect()
    clearInterval(timer)
  }, 0)
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
    if (event.candidate) {
      await getOtherPc(pc).addIceCandidate(event.candidate)
      inputLog(`${getPcName(pc)} addIceCandidate success`, '#67C23A')

      socket.emit('msg', 2022, {
        type: 'candidate',
        label:event.candidate.sdpMLineIndex, 
        id:event.candidate.sdpMid, 
        candidate: event.candidate.candidate
      });
    }
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

    socket.emit('msg', 2022, desc);
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
    await localPeerConnection.setLocalDescription(desc)
    inputLog(`${getPcName(localPeerConnection)} setLocalDescription complete`, '#67C23A')

    socket.emit('msg', 2022, desc);
  } catch (error) {
    inputLog(`请先接通本地视频 Failed to set session description: ${error.toString()}`, '#F56C6C')
  }

  inputLog('remotePeerConnection setRemoteDescription start')
  try {
    await remotePeerConnection.setRemoteDescription(desc)
    const answer = await remotePeerConnection.createAnswer()
    await onCreateAnswerSuccess(answer)
    inputLog(`${getPcName(remotePeerConnection)} setLocalDescription complete`, '#67C23A')
  } catch (error) {
    inputLog(`Failed to set session description: ${error.toString()}`, '#F56C6C')
  }  
}
