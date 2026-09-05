import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react'

type CallState = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

interface Line { speaker: 'agent' | 'user'; text: string }

const AGENT_PROMPT = `You are a polite payment recovery agent for Recover, a financial services platform.
The customer has a pending payment. Your goal is to resolve it in one short call.
Start with: "Hi, this is Recover calling about a pending payment. Can we sort this out quickly?"
Based on their response:
- If they agree to pay → confirm and say a payment link will be sent to their WhatsApp
- If they need more time → ask how many days, acknowledge, say you will follow up
- If they dispute → apologize, say a specialist will review and contact them
Keep it under 2 minutes. Be friendly, not pushy.`

export const WebCall: React.FC = () => {
  const [state, setState]         = useState<CallState>('idle')
  const [transcript, setTranscript] = useState<Line[]>([])
  const [errMsg, setErrMsg]       = useState('')
  const [muted, setMuted]         = useState(false)

  const wsRef           = useRef<WebSocket | null>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const processorRef    = useRef<ScriptProcessorNode | null>(null)
  const transcriptRef   = useRef<HTMLDivElement>(null)
  const agentBufRef     = useRef('')
  const userBufRef      = useRef('')

  const apiKey = (import.meta as any).env?.VITE_DEEPGRAM_API_KEY ?? ''

  useEffect(() => {
    if (transcriptRef.current)
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [transcript])

  useEffect(() => () => cleanup(), [])

  const cleanup = () => {
    wsRef.current?.close()
    processorRef.current?.disconnect()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
  }

  const startCall = async () => {
    if (!apiKey) {
      setErrMsg('VITE_DEEPGRAM_API_KEY not set in frontend .env')
      setState('error')
      return
    }
    setState('connecting')
    setTranscript([])

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setErrMsg('Microphone access denied')
      setState('error')
      return
    }

    const ws = new WebSocket(
      `wss://agent.deepgram.com/agent?authorization=Token ${apiKey}`
    )
    wsRef.current = ws
    audioCtxRef.current = new AudioContext({ sampleRate: 16000 })

    ws.onopen = () => {
      // Configure the agent
      ws.send(JSON.stringify({
        type: 'Settings',
        audio: {
          input:  { encoding: 'linear16', sample_rate: 16000 },
          output: { encoding: 'linear16', sample_rate: 16000, container: 'none' },
        },
        agent: {
          listen: { model: 'nova-2' },
          think: {
            provider: { type: 'open_ai' },
            model: 'gpt-4o-mini',
            instructions: AGENT_PROMPT,
          },
          speak: { model: 'aura-asteria-en' },
        },
      }))
      setState('active')
      startMic()
    }

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'AgentAudioDone') return
          if (msg.type === 'ConversationText') {
            const role = msg.role === 'assistant' ? 'agent' : 'user'
            setTranscript(prev => [...prev, { speaker: role, text: msg.content }])
          }
        } catch { /* ignore */ }
      } else {
        // Binary = agent audio PCM → play it
        playPCM(ev.data)
      }
    }

    ws.onerror = () => { setErrMsg('WebSocket error'); setState('error') }
    ws.onclose = () => { if (state !== 'ended') setState('ended') }
  }

  const startMic = () => {
    const ctx    = audioCtxRef.current!
    const source = ctx.createMediaStreamSource(streamRef.current!)
    const proc   = ctx.createScriptProcessor(4096, 1, 1)
    processorRef.current = proc

    proc.onaudioprocess = (e) => {
      if (!muted && wsRef.current?.readyState === WebSocket.OPEN) {
        const f32  = e.inputBuffer.getChannelData(0)
        const i16  = new Int16Array(f32.length)
        for (let i = 0; i < f32.length; i++)
          i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768))
        wsRef.current.send(i16.buffer)
      }
    }
    source.connect(proc)
    proc.connect(ctx.destination)
  }

  const playPCM = (data: ArrayBuffer) => {
    const ctx  = audioCtxRef.current
    if (!ctx) return
    const i16  = new Int16Array(data)
    const f32  = new Float32Array(i16.length)
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768
    const buf  = ctx.createBuffer(1, f32.length, 16000)
    buf.copyToChannel(f32, 0)
    const src  = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  }

  const endCall = () => {
    cleanup()
    setState('ended')
  }

  const toggleMute = () => setMuted(m => !m)

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-surface border border-border flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-accent-ice" />
            <span className="font-mono text-xs text-text-primary tracking-widest">RECOVER · VOICE AGENT</span>
          </div>
          <span className={`font-mono text-[10px] px-2 py-0.5 border ${
            state === 'active'     ? 'text-success border-success/40' :
            state === 'connecting' ? 'text-accent-ice border-accent-ice/40 animate-pulse' :
            state === 'ended'      ? 'text-text-secondary border-border' :
            state === 'error'      ? 'text-error border-error/40' :
                                     'text-text-secondary border-border'
          }`}>
            {state.toUpperCase()}
          </span>
        </div>

        {/* Transcript */}
        <div
          ref={transcriptRef}
          className="h-72 overflow-y-auto px-4 py-3 space-y-2 font-mono text-[11px]"
        >
          {state === 'idle' && (
            <p className="text-text-secondary">Click START CALL to connect to the AI recovery agent.</p>
          )}
          {state === 'connecting' && (
            <p className="text-accent-ice animate-pulse">Connecting to Deepgram Voice Agent...</p>
          )}
          {transcript.map((line, i) => (
            <div key={i} className={`flex gap-2 ${line.speaker === 'agent' ? 'text-accent-ice' : 'text-text-secondary'}`}>
              <span className="shrink-0 text-border w-10">{line.speaker === 'agent' ? 'AGENT' : 'YOU'}</span>
              <span>{line.text}</span>
            </div>
          ))}
          {state === 'ended' && transcript.length > 0 && (
            <p className="text-success pt-2">✓ Call ended</p>
          )}
          {state === 'error' && (
            <p className="text-error">{errMsg}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          {state === 'idle' || state === 'ended' || state === 'error' ? (
            <button
              onClick={startCall}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-accent-ice/40 font-mono text-[11px] text-accent-ice hover:bg-accent-ice/10 transition-colors"
            >
              <Phone size={12} /> START CALL
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`px-4 py-2 border font-mono text-[11px] transition-colors ${
                  muted
                    ? 'border-error/60 text-error hover:bg-error/10'
                    : 'border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {muted ? <MicOff size={12} /> : <Mic size={12} />}
              </button>
              <button
                onClick={endCall}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-error/60 font-mono text-[11px] text-error hover:bg-error/10 transition-colors"
              >
                <PhoneOff size={12} /> END CALL
              </button>
            </>
          )}
        </div>

        <p className="px-4 pb-3 font-mono text-[9px] text-border text-center">
          Powered by Deepgram Voice Agent · nova-2 STT · aura-asteria TTS
        </p>
      </div>
    </div>
  )
}

export default WebCall
