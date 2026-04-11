import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const title = searchParams.get('title') || 'Job Opportunity'
  const company = searchParams.get('company') || ''
  const salary = searchParams.get('salary') || ''
  const location = searchParams.get('location') || ''
  const logoUrl = searchParams.get('logo') || ''
  const initials = company ? company.slice(0, 2).toUpperCase() : 'VR'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          padding: '60px 70px',
          position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102,126,234,0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '200px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(118,75,162,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* VoiceReach branding top left */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '70px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            VR
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', letterSpacing: '2px' }}>
            VOICEREACH
          </span>
        </div>

        {/* Company logo or initials */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                objectFit: 'contain',
                background: 'white',
                padding: '8px',
              }}
            />
          ) : (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {initials}
            </div>
          )}

          {company && (
            <span
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '22px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                fontWeight: '600',
              }}
            >
              {company}
            </span>
          )}
        </div>

        {/* Job title */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: '800',
            color: 'white',
            lineHeight: '1.1',
            marginBottom: '28px',
            maxWidth: '900px',
            letterSpacing: '-1px',
          }}
        >
          {title}
        </div>

        {/* Salary + location pills */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {salary && (
            <div
              style={{
                background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '100px',
                fontSize: '22px',
                fontWeight: '700',
                display: 'flex',
              }}
            >
              💰 {salary}
            </div>
          )}
          {location && (
            <div
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
                padding: '10px 24px',
                borderRadius: '100px',
                fontSize: '22px',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
              }}
            >
              📍 {location}
            </div>
          )}
          <div
            style={{
              background: 'rgba(102,126,234,0.3)',
              color: 'rgba(255,255,255,0.9)',
              padding: '10px 24px',
              borderRadius: '100px',
              fontSize: '22px',
              border: '1px solid rgba(102,126,234,0.4)',
              display: 'flex',
            }}
          >
            🎤 10-min voice interview
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
