import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * Entra na sala de voz WebRTC da sala de jogo
 *
 * @param {string} roomId
 * @param {object} currentUser - { id, displayName, photoURL }
 * @param {object} callbacks - { onPeersChange, onSpeakingChange, onError }
 * @returns {object} { toggleMute, setDeafened, leaveVoice, isMuted, isDeafened }
 */
export async function joinVoiceChat(roomId, currentUser, { onPeersChange, onSpeakingChange, onError }) {
  if (!firestore || !roomId || !currentUser?.id) {
    throw new Error('Firestore ou identificação do usuário indisponível.')
  }

  let localStream = null
  let audioContext = null
  let analyserNode = null
  let isMuted = false
  let isDeafened = false
  let animationFrameId = null
  let lastSpeakingState = false

  // Obter microfone do usuário com cancelamento de ruído e eco
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
  } catch (micErr) {
    console.error('Erro ao acessar microfone:', micErr)
    throw new Error('Permissão de microfone necessária para entrar no chat de voz.')
  }

  // Mapa de conexões P2P: peerId -> { pc, audioEl, isSpeaking }
  const peerConnections = new Map()
  const peersInfoMap = new Map()

  // Configura Analyser para detecção de fala em tempo real
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(localStream)
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    source.connect(analyserNode)

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount)

    const checkSpeaking = () => {
      if (!analyserNode || isMuted) {
        if (lastSpeakingState) {
          lastSpeakingState = false
          onSpeakingChange?.(currentUser.id, false)
          updateSpeakingInFirestore(false)
        }
      } else {
        analyserNode.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        const isSpeaking = average > 18 // Limiar de sensibilidade de voz

        if (isSpeaking !== lastSpeakingState) {
          lastSpeakingState = isSpeaking
          onSpeakingChange?.(currentUser.id, isSpeaking)
          updateSpeakingInFirestore(isSpeaking)
        }
      }

      animationFrameId = requestAnimationFrame(checkSpeaking)
    }

    animationFrameId = requestAnimationFrame(checkSpeaking)
  } catch (analyserErr) {
    console.warn('Detecção de fala via AudioContext não disponível:', analyserErr)
  }

  // Registro de presença na sala de voz
  const myPeerRef = doc(firestore, 'game_rooms', roomId, 'voice_peers', currentUser.id)
  await setDoc(myPeerRef, {
    id: currentUser.id,
    name: currentUser.displayName || 'Jogador Retrô',
    photoURL: currentUser.photoURL || null,
    isMuted: false,
    isSpeaking: false,
    joinedAt: serverTimestamp(),
  })

  // Função debounce para atualizar speaking no Firestore
  let speakingTimeout = null
  function updateSpeakingInFirestore(speaking) {
    if (speakingTimeout) clearTimeout(speakingTimeout)
    speakingTimeout = setTimeout(() => {
      updateDoc(myPeerRef, { isSpeaking: speaking }).catch(() => {})
    }, 150)
  }

  // Escuta lista de participantes da sala de voz
  const peersCol = collection(firestore, 'game_rooms', roomId, 'voice_peers')
  const unsubPeers = onSnapshot(peersCol, (snapshot) => {
    const list = []
    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      list.push(data)
      peersInfoMap.set(data.id, data)
    })
    onPeersChange?.(list)

    // Remove conexões de quem saiu
    peerConnections.forEach((conn, peerId) => {
      if (!peersInfoMap.has(peerId) && peerId !== currentUser.id) {
        conn.pc.close()
        conn.audioEl?.remove()
        peerConnections.delete(peerId)
      }
    })
  }, (err) => {
    console.warn('Erro ao sincronizar voice_peers:', err)
  })

  // Criação de Peer Connection para outro participante
  function createPeerConnection(targetUserId) {
    if (peerConnections.has(targetUserId)) {
      return peerConnections.get(targetUserId).pc
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Adiciona track de áudio local
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })
    }

    // Cria elemento de áudio para reproduzir voz do peer
    const audioEl = document.createElement('audio')
    audioEl.autoplay = true
    audioEl.muted = isDeafened

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const signalDoc = doc(collection(firestore, 'game_rooms', roomId, 'voice_signals'))
        setDoc(signalDoc, {
          from: currentUser.id,
          to: targetUserId,
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          createdAt: serverTimestamp(),
        }).catch(() => {})
      }
    }

    peerConnections.set(targetUserId, { pc, audioEl })
    return pc
  }

  // Inicia oferta para peers já existentes que tenham ID maior (para evitar colisões de oferta)
  try {
    const existingSnap = await getDocs(peersCol)
    existingSnap.forEach(async (docSnap) => {
      const peerId = docSnap.id
      if (peerId === currentUser.id) return

      // O usuário recém-chegado inicia a oferta para os existentes
      const pc = createPeerConnection(peerId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const signalDoc = doc(collection(firestore, 'game_rooms', roomId, 'voice_signals'))
      await setDoc(signalDoc, {
        from: currentUser.id,
        to: peerId,
        type: 'offer',
        offer: { sdp: offer.sdp, type: offer.type },
        createdAt: serverTimestamp(),
      })
    })
  } catch (initOfferErr) {
    console.warn('Erro ao disparar ofertas de voz iniciais:', initOfferErr)
  }

  // Escuta sinais endereçados a este usuário
  const signalsCol = collection(firestore, 'game_rooms', roomId, 'voice_signals')
  const mySignalsQuery = query(signalsCol, where('to', '==', currentUser.id))

  const unsubSignals = onSnapshot(mySignalsQuery, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type !== 'added') return
      const signal = change.doc.data()
      const signalId = change.doc.id
      const fromPeerId = signal.from

      if (!fromPeerId || fromPeerId === currentUser.id) return

      try {
        if (signal.type === 'offer' && signal.offer) {
          const pc = createPeerConnection(fromPeerId)
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          const replyDoc = doc(collection(firestore, 'game_rooms', roomId, 'voice_signals'))
          await setDoc(replyDoc, {
            from: currentUser.id,
            to: fromPeerId,
            type: 'answer',
            answer: { sdp: answer.sdp, type: answer.type },
            createdAt: serverTimestamp(),
          })
        } else if (signal.type === 'answer' && signal.answer) {
          const conn = peerConnections.get(fromPeerId)
          if (conn?.pc && conn.pc.signalingState === 'have-local-offer') {
            await conn.pc.setRemoteDescription(new RTCSessionDescription(signal.answer))
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          const conn = peerConnections.get(fromPeerId)
          if (conn?.pc) {
            await conn.pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
          }
        }
      } catch (procErr) {
        console.warn('Erro ao processar sinal WebRTC de voz:', procErr)
      } finally {
        // Limpa o sinal consumido para manter o Firestore enxuto
        deleteDoc(doc(firestore, 'game_rooms', roomId, 'voice_signals', signalId)).catch(() => {})
      }
    })
  }, (err) => {
    console.warn('Erro ao sincronizar voice_signals:', err)
  })

  // Cleanup na saída
  const leaveVoice = async () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    if (speakingTimeout) clearTimeout(speakingTimeout)

    unsubPeers?.()
    unsubSignals?.()

    // Para todas as conexões
    peerConnections.forEach((conn) => {
      conn.pc.close()
      conn.audioEl?.remove()
    })
    peerConnections.clear()

    // Para microfone
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {})
    }

    // Remove do Firestore
    try {
      await deleteDoc(myPeerRef)
    } catch {}
  }

  // Desconecta se fechar a aba
  window.addEventListener('beforeunload', leaveVoice, { once: true })

  return {
    toggleMute: () => {
      isMuted = !isMuted
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted
        })
      }
      updateDoc(myPeerRef, { isMuted }).catch(() => {})
      return isMuted
    },
    setDeafened: (deafen) => {
      isDeafened = deafen !== undefined ? deafen : !isDeafened
      peerConnections.forEach((conn) => {
        if (conn.audioEl) conn.audioEl.muted = isDeafened
      })
      return isDeafened
    },
    leaveVoice: async () => {
      window.removeEventListener('beforeunload', leaveVoice)
      await leaveVoice()
    },
    getIsMuted: () => isMuted,
    getIsDeafened: () => isDeafened,
  }
}

