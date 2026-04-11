try {
  const agentId = process.env.ELEVENLABS_AGENT_ID!
  const apiKey = process.env.ELEVENLABS_API_KEY!

  // Step 1 — Update agent with full dynamic system prompt
  const updateResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt
            },
            first_message: `Hi ${firstName}, I'm ${agentName}, an AI interviewer. I'll be conducting your interview today for the ${job?.title || 'role'} position. We have ${questions.length} questions and the whole thing should take around 9 minutes. Are you ready to get started?`,
            language: 'en'
          },
          tts: {
            voice_id: 'bDTlr4ICxntY9qVWyL0o'
          }
        }
      })
    }
  )

  if (!updateResponse.ok) {
    const updateError = await updateResponse.json()
    console.error('Agent update error:', updateError)
    return res.status(500).json({ error: 'Could not configure interview agent' })
  }

  // Step 2 — Get signed URL for this session
  const signedUrlResponse = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
    {
      method: 'GET',
      headers: { 'xi-api-key': apiKey }
    }
  )

  if (!signedUrlResponse.ok) {
    const elError = await signedUrlResponse.json()
    console.error('ElevenLabs signed URL error:', elError)
    return res.status(500).json({ error: 'Could not create interview session' })
  }

  const elData = await signedUrlResponse.json()

  return res.status(200).json({
    success: true,
    signed_url: elData.signed_url,
    agent_name: agentName,
    candidate_name: candidate.name,
    job_title: job?.title || '',
    question_count: questions.length
  })

} catch (err: any) {
  console.error('Interview session error:', err)
  return res.status(500).json({ error: err.message || 'Failed to create session' })
}
