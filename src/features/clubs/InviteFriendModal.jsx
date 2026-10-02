import { Check, Copy, Gamepad2, Link2, LoaderCircle, Send, Share2, Sparkles, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../auth/authService'
import { listMutualFriends } from '../social/friendService'
import { createOrGetDirectConversation, sendDirectMessage } from '../social/directChatService'

export default function InviteFriendModal({ club, onClose, isOpen = true }) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [friends, setFriends] = useState([])
  const [invitedIds, setInvitedIds] = useState(new Set())
  const [invitingId, setInvitingId] = useState(null)

  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return
    listMutualFriends(currentUser.id).then(setFriends)
  }, [isOpen, currentUser?.id])

  if (!isOpen || !club) return null

  const inviteCode = club.inviteCode || club.id
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?join=${encodeURIComponent(inviteCode)}`
    : ''

  function handleCopyCode() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  function handleCopyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleInviteFriend(friend) {
    if (invitedIds.has(friend.id) || invitingId) return
    setInvitingId(friend.id)

    try {
      const conv = await createOrGetDirectConversation(friend)
      if (conv?.id) {
        const inviteMsg = `🎮 Ei ${friend.displayName}! Te convido para entrar no clube "${club.name}"! Use o código: ${inviteCode} ou acesse: ${shareUrl}`
        await sendDirectMessage(conv.id, inviteMsg)
      }
      setInvitedIds((prev) => new Set([...prev, friend.id]))
    } finally {
      setInvitingId(null)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-panel shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/40 px-6 py-4">
          <div className="flex items-center gap-2 text-electric">
            <Share2 size={18} />
            <h3 className="font-pixel text-xs text-white">Convidar Amigo</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Info do Clube */}
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-slate-950/40 p-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-electric/30 bg-electric/10 text-electric text-xl font-pixel">
              {club.icon || '✦'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-pixel text-xs text-white truncate">{club.name}</h4>
              <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                {club.description || 'Comunidade retrô no ZEREI!'}
              </p>
            </div>
          </div>

          {/* Opção 1: Código de Convite */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Código do Clube
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-electric/30 bg-slate-950/70 px-4 py-3 font-mono text-sm font-bold tracking-widest text-electric select-all">
                {inviteCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 rounded-xl border border-electric/40 bg-electric/15 px-4 py-3 text-xs font-bold uppercase tracking-wider text-electric transition hover:bg-electric/25 active:scale-95"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Seu amigo pode entrar colando este código no botão &ldquo;Entrar por convite&rdquo;.
            </p>
          </div>

          {/* Opção 2: Link de Convite Direto */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Link Direto
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-300 outline-none truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 active:scale-95 shrink-0"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          {/* Opção 3: Convidar Amigos com 1 clique */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/15 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300">
                <Users size={16} />
                <h4 className="text-xs font-bold">Seus Amigos Mútuos</h4>
              </div>
              <span className="text-[10px] text-purple-400 font-bold">1-Clique</span>
            </div>

            {friends.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                Você ainda não tem amigos mútuos adicionados. Siga outros jogadores para convidar por aqui!
              </p>
            ) : (
              <div className="divide-y divide-white/5 max-h-40 overflow-y-auto pr-1">
                {friends.map((friend) => {
                  const isInvited = invitedIds.has(friend.id)
                  const isInviting = invitingId === friend.id

                  return (
                    <div key={friend.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={friend.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full border border-white/10 object-cover bg-slate-900 shrink-0"
                        />
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-bold text-white truncate">{friend.displayName}</p>
                          <p className="text-[10px] text-slate-500">Nível {friend.level || 1}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleInviteFriend(friend)}
                        disabled={isInvited || isInviting}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition shrink-0 ${
                          isInvited
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30'
                        }`}
                      >
                        {isInviting ? (
                          <LoaderCircle size={12} className="animate-spin" />
                        ) : isInvited ? (
                          <>
                            <Check size={12} />
                            Enviado
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            Convidar
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-slate-950/40 px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

