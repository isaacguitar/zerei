import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { firestore } from '../../firebaseClient'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/**
 * Host inicia o streaming do canvas para espectadores via WebRTC
 * Transmite EXCLUSIVAMENTE os pixels do canvas e áudio do jogo
 */
export function startHostStream(roomId, canvasElement, { onSpectatorCountChange } = {}) {
  if (!firestore || !roomId || !canvasElement) return () => {}

  let stream = null
  try {
    if (typeof canvasElement.captureStream === 'function') {
      stream = canvasElement.captureStream(30)
    }
  } catch (err) {
    console.warn('Não foi possível capturar o stream do canvas:', err)
  }

  if (!stream) {
    console.warn('Canvas captureStream não suportado ou falhou.')
    return () => {}
  }

  // Tenta conectar o áudio do jogo ao stream WebRTC se disponível
  try {
    const audioCtx = window.retroAudioContext || null
    if (audioCtx && typeof audioCtx.createMediaStreamDestination === 'function') {
      const dest = audioCtx.createMediaStreamDestination()
      if (audioCtx.destination && typeof audioCtx.destination.connect === 'function') {
        audioCtx.destination.connect(dest)
      }
      dest.stream.getAudioTracks().forEach((track) => {
        stream.addTrack(track)
      })
    }
  } catch (audioErr) {
    console.warn('Captura de áudio do jogo não disponível:', audioErr)
  }

  const peers = new Map() // spectatorId -> RTCPeerConnection
  const signalingCol = collection(firestore, 'game_rooms', roomId, 'signaling')

  function notifyCount() {
    const count = peers.size
    onSpectatorCountChange?.(count)
    window.dispatchEvent(new CustomEvent('zerei:spectator_count', { detail: { roomId, count } }))
  }

  const unsubscribe = onSnapshot(signalingCol, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const spectatorId = change.doc.id
      const data = change.doc.data()

      if (change.type === 'removed') {
        const pc = peers.get(spectatorId)
        if (pc) {
          pc.close()
          peers.delete(spectatorId)
          notifyCount()
        }
        return
      }

      // Novo espectador solicitou conexão
      if (data.type === 'spectator_join' && !peers.has(spectatorId)) {
        try {
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
          peers.set(spectatorId, pc)
          notifyCount()

          // Adiciona tracks do canvas
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream)
          })

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              const candRef = doc(firestore, 'game_rooms', roomId, 'signaling', spectatorId)
              updateDoc(candRef, {
                hostCandidates: data.hostCandidates ? [...data.hostCandidates, event.candidate.toJSON()] : [event.candidate.toJSON()],
              }).catch(() => {})
            }
          }

          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          const sigRef = doc(firestore, 'game_rooms', roomId, 'signaling', spectatorId)
          await setDoc(sigRef, {
            type: 'offer',
            offer: { sdp: offer.sdp, type: offer.type },
            updatedAt: serverTimestamp(),
          }, { merge: true })
        } catch (err) {
          console.warn('Erro ao criar offer para espectador:', err)
        }
      }

      // Espectador enviou a answer
      if (data.type === 'answer' && data.answer && peers.has(spectatorId)) {
        const pc = peers.get(spectatorId)
        if (pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
          } catch (err) {
            console.warn('Erro ao setRemoteDescription no host:', err)
          }
        }
      }

      // Processa ICE candidates do espectador
      if (Array.isArray(data.spectatorCandidates) && peers.has(spectatorId)) {
        const pc = peers.get(spectatorId)
        for (const c of data.spectatorCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c))
          } catch {}
        }
      }
    })
  })

  return () => {
    unsubscribe()
    peers.forEach((pc) => pc.close())
    peers.clear()
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
  }
}

/**
 * Espectador conecta para receber o stream do host
 */
export function connectSpectatorStream(roomId, spectatorUser, onRemoteStream, onStatusChange) {
  if (!firestore || !roomId || !spectatorUser?.id) return () => {}

  onStatusChange?.('connecting')
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  const sigRef = doc(firestore, 'game_rooms', roomId, 'signaling', spectatorUser.id)

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream?.(event.streams[0])
      onStatusChange?.('streaming')
    }
  }

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'connected') {
      onStatusChange?.('streaming')
    } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
      onStatusChange?.('disconnected')
    }
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      updateDoc(sigRef, {
        spectatorCandidates: [event.candidate.toJSON()],
      }).catch(() => {})
    }
  }

  // Notifica o host que o espectador entrou
  setDoc(sigRef, {
    type: 'spectator_join',
    spectatorId: spectatorUser.id,
    spectatorName: spectatorUser.displayName || 'Espectador',
    createdAt: serverTimestamp(),
  }).catch(() => {})

  const unsubscribe = onSnapshot(sigRef, async (snapshot) => {
    if (!snapshot.exists()) return
    const data = snapshot.data()

    if (data.type === 'offer' && data.offer && pc.signalingState === 'stable') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        await updateDoc(sigRef, {
          type: 'answer',
          answer: { sdp: answer.sdp, type: answer.type },
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        console.warn('Erro ao responder offer do host:', err)
      }
    }

    if (Array.isArray(data.hostCandidates)) {
      for (const c of data.hostCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c))
        } catch {}
      }
    }
  })

  // Timeout para caso o host não esteja com streaming ativo
  const timeoutId = setTimeout(() => {
    if (pc.iceConnectionState !== 'connected') {
      onStatusChange?.('fallback')
    }
  }, 7000)

  return () => {
    clearTimeout(timeoutId)
    unsubscribe()
    pc.close()
    deleteDoc(sigRef).catch(() => {})
  }
}

