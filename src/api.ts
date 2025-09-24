import { Hono } from 'hono'
import { generatePanelImage, generateScriptPanels, generateCharacterImage } from './gemini.js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// (Removed) No job queue; generation responds synchronously.

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export const api = new Hono()

async function getEnv(c: any) {
  // Prefer process.env (Cloud Run) and fall back to c.env (edge runtimes)
  const edgeEnv = (c && c.env) ? c.env : {}
  let key = (
    process.env.GEMINI_API_KEY
    ?? process.env.GOOGLE_API_KEY
    ?? process.env.GOOGLE_GENAI_API_KEY
    ?? (edgeEnv as any).GEMINI_API_KEY
    ?? (edgeEnv as any).GOOGLE_API_KEY
    ?? (edgeEnv as any).GOOGLE_GENAI_API_KEY
  ) as string | undefined

  // Fallback: file mounts (Cloud Run/Secret Manager volume)
  if (!key) {
    const fileVars = [
      process.env.GEMINI_API_KEY_FILE,
      process.env.GOOGLE_API_KEY_FILE,
      process.env.GOOGLE_GENAI_API_KEY_FILE,
    ].filter(Boolean) as string[]
    for (const p of fileVars) {
      try {
        const fp = resolve(p)
        if (existsSync(fp)) {
          const v = readFileSync(fp, 'utf8').trim()
          if (v) { key = v; process.env.GEMINI_API_KEY = key; break }
        }
      } catch {}
    }
  }

  if (!key && process.env.K_SERVICE) {
    // Cloud Run fallback: try Secret Manager directly if permitted
    try {
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager')
      const client = new SecretManagerServiceClient()
      const projectId = (await client.getProjectId().catch(() => process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT)) as string | undefined
      const secretRef = process.env.GEMINI_API_KEY_SECRET || 'GEMINI_API_KEY'
      const isFull = /\/secrets\//.test(secretRef)
      if (projectId || isFull) {
        const name = isFull ? secretRef : `projects/${projectId}/secrets/${secretRef}/versions/latest`
        const [resp] = await client.accessSecretVersion({ name })
        const buf = resp.payload?.data
        if (buf) {
          key = Buffer.from(buf).toString('utf8')
          // Cache for later calls in the same instance
          process.env.GEMINI_API_KEY = key
        }
      }
    } catch (e) {
      // ignore; we'll surface config error in handlers
    }
  }

  return { GEMINI_API_KEY: key }
}

// Script generation (mock)
api.post('/script/generate', async (c) => {
  const env = await getEnv(c)
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
  const env = await getEnv(c)
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

// Generation (parallel per request)
api.post('/generate/panels', async (c) => {
  const env = await getEnv(c)
  const body = await c.req.json()

  // Resolve panel inputs and generate images synchronously (MVP)
  const indexes: number[] = body.indexes || []

  const charRefData: Array<[mime: string, base64: string]> = [
    ...(body.characters?.A?.ref_data_urls || []),
    ...(body.characters?.B?.ref_data_urls || []),
  ]
    .filter((u: string) => typeof u === 'string' && u.startsWith('data:'))
    .map((u: string) => parseDataUrl(u))

  const tasks = indexes.map(async (i) => {
    const key = String(i)
    const p = (body.panels && body.panels[key]) || {}

    // Clone shared references per panel to avoid cross-mutation
    const references = charRefData.map(([mimeType, data]) => ({ inlineData: { mimeType, data } }))

    // Resolve optional canvas image and include as a reference when present
    let hasCanvas = false
    if (p.canvas_data_url) {
      try {
        const [mimeType, data] = parseDataUrl(p.canvas_data_url)
        references.unshift({ inlineData: { mimeType, data } })
        hasCanvas = true
      } catch {}
    }

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
      charB: body?.characters?.B
        ? {
            stylePreset: body?.characters?.B?.style_preset,
            prompt: body?.characters?.B?.prompt,
          }
        : undefined,
    }

    const { base64, mimeType } = await generatePanelImage({
      env,
      references,
      guidance,
      size: { width: 1024, height: 1024 },
    })

    const url = `data:${mimeType};base64,${base64}`
    return { index: i, url }
  })

  try {
    const outputs = await Promise.all(tasks)
    return c.json({ panel_outputs: outputs })
  } catch (err: any) {
    const message = err?.message || 'generation failed'
    return c.json({ error: { code: 'internal', message } }, 500)
  }
})

function parseDataUrl(dataUrl: string): [mime: string, base64: string] {
  // data:image/png;base64,xxxx
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!m) throw new Error('invalid data URL')
  return [m[1], m[2]]
}

// /jobs endpoint removed (synchronous generation)

export default api
