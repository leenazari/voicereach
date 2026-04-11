import { useState, useEffect, useRef, useCallback } from 'react'

type Props = {
  token: string
  candidateName: string
  jobTitle: string
  agentName: string
  questionCount: number
  onComplete: (transcript: string) => void
  onError: (error: string) => void
}

type Message = {
  role: 'agent' | 'candidate'
  text: string
  timestamp: Date
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export default function InterviewPanel({ token, candidateName, jobTitle, agentName, questionCount, onComplete, onError }: Props) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef(false)
  const transcriptRef = useRef<string>('')
  const durationRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const firstName = candidateName.split(' ')[0]

  useEffect(() => {
    initSession()
    return () => cleanup()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (status === 'connected') {
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } else {
      if (durationRef.current) clearInterval(durationRef.current)
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current) }
  }, [status])

  async function initSession() {
    setStatus('connecting')
    try {
      const res = await fetch('/api/interview-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = await res.json()
      if (!res.ok || !data.signed_url) {
        onError(data.error || 'Could not start interview session')
        setStatus('error')
        return
      }
      setSignedUrl(data.signed_url)
      setSystemPrompt(data.system_prompt)
      setSessionReady(true)
    } catch (err: any) {
      onError(err.message || 'Failed to initialise session')
      setStatus('error')
    }
  }

  async function startInterview() {
    if (!signedUrl || !systemPrompt) return
    setStatus('connecting')

    try {
      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Set up audio context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket(signedUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')

        // Send session config with dynamic system prompt
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt,
            voice: 'bDTlr4ICxntY9qVWyL0o',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800
            }
          }
        }))

        // Start streaming microphone audio
        startAudioStream(stream)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch { }
      }

      ws.onerror = () => {
        setStatus('error')
        onError('Connection error — please try again')
      }

      ws.onclose = (e) => {
        if (status === 'connected') {
          setStatus('disconnected')
          onComplete(transcriptRef.current)
        }
      }

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        onError('Microphone access denied — please allow microphone access and try again')
      } else {
        onError(err.message || 'Could not start interview')
      }
      setStatus('error')
    }
  }

  function startAudioStream(stream: MediaStream) {
    if (!audioContextRef.current) return
    const source = audioContextRef.current.createMediaStreamSource(stream)
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return
      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
      }
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
      wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }))
    }

    source.connect(processor)
    processor.connect(audioContextRef.current.destination)
  }

  function handleMessage(msg: any) {
    switch (msg.type) {
      case 'response.audio.delta':
        if (msg.delta) {
          const binary = atob(msg.delta)
          const buffer = new ArrayBuffer(binary.length)
          const view = new Uint8Array(buffer)
          for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
          audioQueueRef.current.push(buffer)
          if (!isPlayingRef.current) playNextAudio()
        }
        break

      case 'response.audio_transcript.delta':
        if (msg.delta) {
          setIsSpeaking(true)
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last && last.role === 'agent') {
              const updated = [...prev]
              updated[updated.length - 1] = { ...last, text: last.text + msg.delta }
              transcriptRef.current = buildTranscript([...updated])
              return updated
            }
            return [...prev, { role: 'agent', text: msg.delta, timestamp: new Date() }]
          })
          detectQuestionProgress(msg.delta)
        }
        break

      case 'response.audio_transcript.done':
        setIsSpeaking(false)
        break

      case 'conversation.item.input_audio_transcription.completed':
        if (msg.transcript) {
          setIsCandidateSpeaking(false)
          setMessages(prev => {
            const updated = [...prev, { role: 'candidate' as const, text: msg.transcript, timestamp: new Date() }]
            transcriptRef.current = buildTranscript(updated)
            return updated
          })
        }
        break

      case 'input_audio_buffer.speech_started':
        setIsCandidateSpeaking(true)
        break

      case 'input_audio_buffer.speech_stopped':
        setIsCandidateSpeaking(false)
        break

      case 'error':
        console.error('ElevenLabs error:', msg)
        break
    }
  }

  function detectQuestionProgress(text: string) {
    const lower = text.toLowerCase()
    if (lower.includes('question') || lower.includes('next') || lower.includes('move on') || lower.includes('finally')) {
      setCurrentQuestion(prev => Math.min(prev + 1, questionCount))
    }
    if (lower.includes("that's all my questions") || lower.includes('hiring team will review')) {
      setCurrentQuestion(questionCount)
      setTimeout(() => endInterview(), 30000)
    }
  }

  async function playNextAudio() {
    if (audioQueueRef.current.length === 0) { isPlayingRef.current = false; return }
    isPlayingRef.current = true
    const buffer = audioQueueRef.current.shift()!
    try {
      if (!audioContextRef.current) return
      const decoded = await audioContextRef.current.decodeAudioData(buffer.slice(0))
      const source = audioContextRef.current.createBufferSource()
      source.buffer = decoded
      source.connect(audioContextRef.current.destination)
      source.onended = () => playNextAudio()
      source.start()
    } catch {
      playNextAudio()
    }
  }

  function buildTranscript(msgs: Message[]): string {
    return msgs.map(m => `${m.role === 'agent' ? agentName : candidateName}: ${m.text}`).join('\n\n')
  }

  function endInterview() {
    cleanup()
    setStatus('disconnected')
    onComplete(transcriptRef.current)
  }

  function cleanup() {
    wsRef.current?.close()
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    if (durationRef.current) clearInterval(durationRef.current)
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (status === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 8 }}>Something went wrong</div>
        <button onClick={initSession} style={{ padding: '12px 24px', background: 'white', color: '#302b63', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 16 }}>
          Try again
        </button>
      </div>
    )
  }

  if (sessionReady && status === 'connecting') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 12 }}>Ready when you are, {firstName}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 32, lineHeight: 1.7 }}>
          Your interview for <strong style={{ color: 'white' }}>{jobTitle}</strong> is ready to start.<br />
          {agentName} will guide you through {questionCount} questions.<br />
          The whole interview takes around 9 minutes.
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'left' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'white' }}>Before you start:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 } as React.CSSProperties}>
            <div>🎤 Make sure you are in a quiet place</div>
            <div>🔊 Check your speakers or headphones are working</div>
            <div>📱 Allow microphone access when prompted</div>
            <div>⏱ Set aside 10 minutes without interruptions</div>
          </div>
        </div>
        <button
          onClick={startInterview}
          style={{ padding: '16px 48px', background: 'white', color: '#302b63', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', letterSpacing: '-0.3px' }}
        >
          Start interview →
        </button>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 14 }}>
          Your microphone will activate when you click start
        </div>
      </div>
    )
  }

  if (status === 'disconnected') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 10, letterSpacing: '-0.3px' }}>Interview complete</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
          Thank you {firstName}. The hiring team will review your interview and be in touch soon.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties}>

      {/* STATUS BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Live interview</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Q{Math.min(currentQuestion + 1, questionCount)}/{questionCount}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* QUESTION PROGRESS */}
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: questionCount }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < currentQuestion ? '#1D9E75' : i === currentQuestion ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
        ))}
      </div>

      {/* SPEAKING INDICATORS */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: isSpeaking ? 'rgba(102,126,234,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSpeaking ? 'rgba(102,126,234,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s' }}>
          {isSpeaking && (
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ width: 3, background: '#667eea', borderRadius: 2, animation: 'wave 0.8s ease-in-out infinite', animationDelay: `${i * 0.15}s`, height: 16 }} />
              ))}
            </div>
          )}
          <span style={{ fontSize: 12, color: isSpeaking ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', fontWeight: isSpeaking ? 600 : 400 }}>
            {isSpeaking ? `${agentName} is speaking...` : agentName}
          </span>
        </div>
        <div style={{ flex: 1, background: isCandidateSpeaking ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isCandidateSpeaking ? 'rgba(29,158,117,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s' }}>
          {isCandidateSpeaking && (
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ width: 3, background: '#1D9E75', borderRadius: 2, animation: 'wave 0.8s ease-in-out infinite', animationDelay: `${i * 0.15}s`, height: 16 }} />
              ))}
            </div>
          )}
          <span style={{ fontSize: 12, color: isCandidateSpeaking ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', fontWeight: isCandidateSpeaking ? 600 : 400 }}>
            {isCandidateSpeaking ? 'You are speaking...' : firstName}
          </span>
        </div>
      </div>

      {/* TRANSCRIPT */}
      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, height: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 } as React.CSSProperties}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 40 }}>
            The conversation will appear here...
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'agent' ? 'flex-start' : 'flex-end', gap: 4 } as React.CSSProperties}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                {msg.role === 'agent' ? agentName : firstName}
              </div>
              <div style={{ maxWidth: '80%', background: msg.role === 'agent' ? 'rgba(102,126,234,0.2)' : 'rgba(29,158,117,0.2)', border: `1px solid ${msg.role === 'agent' ? 'rgba(102,126,234,0.3)' : 'rgba(29,158,117,0.3)'}`, borderRadius: msg.role === 'agent' ? '4px 12px 12px 12px' : '12px 4px 12px 12px', padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* END INTERVIEW */}
      <button
        onClick={endInterview}
        style={{ padding: '10px', background: 'rgba(226,75,74,0.15)', color: '#E24B4A', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        End interview
      </button>

      <style>{`
        @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}
