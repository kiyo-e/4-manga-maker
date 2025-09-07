import { Hono } from 'hono'
import { generatePanelImage, generateScriptPanels, generateCharacterImage } from './gemini'

// (Removed) No job queue; generation responds synchronously.

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export const api = new Hono()

// Script generation (mock)
api.post('/script/generate', async (c) => {
  const env: any = c.env || {}
  const { overall_desc, tone, use_character_b } = await c.req.json()
  try {
    const out = await generateScriptPanels(env, {
      overallDesc: String(overall_desc || ''),
      tone: String(tone || ''),
      useCharacterB: !!use_character_b,
    })
    return c.json(out)
  } catch (err: any) {
    return c.json({ error: { code: 'internal', message: err?.message || 'script generation failed' } }, 500)
  }
})

// Character generation (Nano Banana / Flash Image)
api.post('/generate/character', async (c) => {
  const env: any = c.env || {}
  const body = await c.req.json()
  try {
    const { base64, mimeType } = await generateCharacterImage(env, {
      name: body?.name,
      stylePreset: body?.style_preset,
      prompt: body?.prompt,
      refDataUrls: body?.ref_data_urls || [],
    })
    return c.json({ url: `data:${mimeType};base64,${base64}` })
  } catch (err: any) {
    return c.json({ error: { code: 'internal', message: err?.message || 'character generation failed' } }, 500)
  }
})

// Generation (synchronous)
api.post('/generate/panels', async (c) => {
  const env: any = c.env || {}
  const body = await c.req.json()

  // Resolve panel inputs and generate images synchronously (MVP)
  const indexes: number[] = body.indexes || []
  const outputs: any[] = []

  for (const i of indexes) {
    const key = String(i)
    const p = (body.panels && body.panels[key]) || {}

    // Collect reference images from character A/B (data URLs only)
    const refDataUrls: string[] = [
      ...(body.characters?.A?.ref_data_urls || []),
      ...(body.characters?.B?.ref_data_urls || []),
    ]
    const references: any[] = refDataUrls
      .filter((u: string) => typeof u === 'string' && u.startsWith('data:'))
      .map((u: string) => {
        const [mimeType, data] = parseDataUrl(u)
        return { inlineData: { mimeType, data } }
      })

    // Resolve optional canvas image and include as a reference when present
    let hasCanvas = false
    if (p.canvas_data_url) {
      try {
        const [mimeType, data] = parseDataUrl(p.canvas_data_url)
        references.unshift({ inlineData: { mimeType, data } })
        hasCanvas = true
      } catch {}
    }

    // Build guidance text
    const guidance = {
      desc: p.desc,
      layoutHint: p.layoutHint,
      shot: p.shot,
      styleTone: body?.options?.style_tone,
      negative: [
        'no text, subtitles, captions, or UI',
        ...(hasCanvas ? ['clean background; remove any canvas scribble artifacts'] : []),
      ],
      charA: {
        stylePreset: body?.characters?.A?.style_preset,
        prompt: body?.characters?.A?.prompt,
      },
      charB: body?.characters?.B ? {
        stylePreset: body?.characters?.B?.style_preset,
        prompt: body?.characters?.B?.prompt,
      } : undefined,
    }

    // Call Gemini
    try {
      const { base64, mimeType } = await generatePanelImage({
        env,
        references,
        guidance,
        size: { width: 1024, height: 1024 },
      })

      const url = `data:${mimeType};base64,${base64}`
      outputs.push({ index: i, url })
    } catch (err: any) {
      const message = err?.message || 'generation failed'
      return c.json({ error: { code: 'internal', message } }, 500)
    }
  }

  return c.json({ panel_outputs: outputs })
})

function parseDataUrl(dataUrl: string): [mime: string, base64: string] {
  // data:image/png;base64,xxxx
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('invalid data URL')
  return [m[1], m[2]]
}

// /jobs endpoint removed (synchronous generation)

export default api
