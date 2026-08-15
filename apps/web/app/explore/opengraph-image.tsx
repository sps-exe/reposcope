import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GitHub Data Explorer - Reposcope';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const poppinsMedium = fetch(new URL('./SpaceGrotesk.ttf', import.meta.url)).then((r) =>
    r.arrayBuffer(),
  );
  const poppinsSemiBold = fetch(new URL('./SpaceGrotesk.ttf', import.meta.url)).then((r) =>
    r.arrayBuffer(),
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0b0e14',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'Space Grotesk',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 8,
            backgroundColor: '#22d3ee',
          }}
        />
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            left: -200,
            top: -200,
            width: 800,
            height: 800,
            backgroundImage:
              'radial-gradient(circle, rgba(247,223,131,0.07) 0%, transparent 70%)',
            borderRadius: 9999,
          }}
        />

        {/* Label */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: '#22d3ee',
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          Reposcope
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 58,
            fontWeight: 600,
            color: '#ffffff',
            textAlign: 'center',
            maxWidth: 900,
            marginBottom: 24,
            lineHeight: 1.1,
          }}
        >
          Data Explorer
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          Ask questions in plain English · AI-generated SQL · 10B+ GitHub events
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            right: 48,
            fontSize: 16,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          reposcope.io/explore
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Space Grotesk',
          data: await poppinsMedium,
          style: 'normal' as const,
          weight: 500 as const,
        },
        {
          name: 'Space Grotesk',
          data: await poppinsSemiBold,
          style: 'normal' as const,
          weight: 600 as const,
        },
      ],
    },
  );
}
