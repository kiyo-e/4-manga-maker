import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Wand2, Play, RotateCw, ImageUp, Brush, Download, Trash2, Info, Sparkles, Check, Eraser, X } from 'lucide-react';
import { useI18n, type Lang } from './i18n';

const PANEL_COUNT = 4;
const DEFAULT_WIDTH = 1024; // 1:1 ratio -> height equals width
const RATIO_W = 1; const RATIO_H = 1;
const SEP = 4; const MARGIN = 16;

const shotOptions = [
  { value: 'wide',       labelKey: 'shot.wide.label',       titleKey: 'shot.wide.title' },
  { value: 'waist',      labelKey: 'shot.waist.label',      titleKey: 'shot.waist.title' },
  { value: 'closeup_A',  labelKey: 'shot.closeup_A.label',  titleKey: 'shot.closeup_A.title' },
  { value: 'closeup_B',  labelKey: 'shot.closeup_B.label',  titleKey: 'shot.closeup_B.title' },
  { value: 'two_shot',   labelKey: 'shot.two_shot.label',   titleKey: 'shot.two_shot.title' },
  { value: 'reaction_A', labelKey: 'shot.reaction_A.label', titleKey: 'shot.reaction_A.title' },
  { value: 'reaction_B', labelKey: 'shot.reaction_B.label', titleKey: 'shot.reaction_B.title' },
  { value: 'ots_A',      labelKey: 'shot.ots_A.label',      titleKey: 'shot.ots_A.title' },
  { value: 'ots_B',      labelKey: 'shot.ots_B.label',      titleKey: 'shot.ots_B.title' },
];

// Art style tone applied globally (guides panel generation)
const artToneOptions = [
  { value: 'mono-screen',  labelKey: 'tone.mono-screen' },
  { value: 'line-bold',    labelKey: 'tone.line-bold' },
  { value: 'soft-mono',    labelKey: 'tone.soft-mono' },
  { value: 'shonen-ink',   labelKey: 'tone.shonen-ink' },
  { value: 'shojo-mono',   labelKey: 'tone.shojo-mono' },
  { value: 'seinen-real',  labelKey: 'tone.seinen-real' },
  { value: 'gekiga',       labelKey: 'tone.gekiga' },
  { value: 'retro-90s',    labelKey: 'tone.retro-90s' },
  { value: 'horror-ink',   labelKey: 'tone.horror-ink' },
  { value: 'sumi-brush',   labelKey: 'tone.sumi-brush' },
  { value: 'hatch',        labelKey: 'tone.hatch' },
  { value: 'chibi-gag',    labelKey: 'tone.chibi-gag' },
  { value: 'flat-color',   labelKey: 'tone.flat-color' },
  { value: 'pastel-color', labelKey: 'tone.pastel-color' },
  { value: 'webtoon-color',labelKey: 'tone.webtoon-color' },
]

const toneOptions = [
  { value: 'story.boke_tsukkomi' },
  { value: 'story.kishotenketsu' },
  { value: 'story.running_gag' },
  { value: 'story.misunderstanding' },
  { value: 'story.slice_of_life' },
  { value: 'story.meta' },
  { value: 'story.heartful_blunder' },
  { value: 'story.absurd_silence_meta' },
]

// -------------------------------
// Utilities
// -------------------------------

function fileToDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
function makePlaceholder(w, h, label = 'Not generated') { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#f6f6f7'; x.fillRect(0,0,w,h); x.strokeStyle = '#e2e2e6'; for (let i=-h;i<w+h;i+=24){x.beginPath();x.moveTo(i,0);x.lineTo(i+h,h);x.stroke();} x.fillStyle = '#111'; x.font = '600 20px ui-sans-serif'; x.textAlign = 'center'; x.fillText(label, w/2, h/2); return c.toDataURL('image/png'); }
function downloadDataURL(url, filename){ const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); }
function loadImage(url){ return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=url; }); }

function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }
function wrapText(ctx, text, maxW){ const chars = text.split(""); const lines=[]; let line=""; for (const ch of chars){ const t=line+ch; if (ctx.measureText(t).width>maxW && line){ lines.push(line); line=ch; } else { line=t; } } if(line) lines.push(line); return lines.slice(0,3); }
// Determine speech font size and spacing based on scale
function calcSpeechMetrics(containerW: number){
  const base = Math.max(16, Math.round(containerW * 0.022)); // 1024px -> ~22px
  const fontSize = Math.min(36, base);
  const lineHeight = Math.round(fontSize * 1.25);
  const pad = Math.round(fontSize * 0.9);
  return { fontSize, lineHeight, pad };
}
function drawSpeechBubble(ctx, text, x, y, maxW){
  const { fontSize, lineHeight: lh, pad } = calcSpeechMetrics(maxW);
  ctx.font = `600 ${fontSize}px ui-sans-serif`;
  const lines = wrapText(ctx, text, maxW - pad*2);
  const minBox = Math.max(120, Math.round(fontSize * 6));
  const w = Math.min(maxW, Math.max(minBox, ...lines.map(l=>ctx.measureText(l).width))+pad*2);
  const h = lines.length*lh + pad*2;
  ctx.fillStyle="#fff"; ctx.strokeStyle="#111"; ctx.lineWidth=2;
  roundRect(ctx,x,y,w,h,12); ctx.fill(); ctx.stroke();
    // Simple tail
  ctx.beginPath(); ctx.moveTo(x+24,y+h); ctx.lineTo(x+40,y+h+Math.max(12, Math.round(fontSize*0.6))); ctx.lineTo(x+48,y+h); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Text
  ctx.fillStyle="#111"; ctx.textBaseline = 'alphabetic';
  lines.forEach((l,i)=> ctx.fillText(l, x+pad, y+pad + (i+1)*lh - Math.round(fontSize*0.25)));
}

// -------------------------------
// Types/initialization
// -------------------------------
function emptyCharacter(id, defaultName) {
  return { id, name: defaultName, prompt: '', stylePreset: 'chibi-gag', refs: [], generated: null };
}
function emptyPanel(idx){ return { index: idx, desc: "", lineA: "", lineB: "", layoutHint: "", shot: "", drawingDataURL: null, generatedImage: null, status: "draft", _refsOpen: false }; }

// -------------------------------
// Root
// -------------------------------
const SITE_NAME = 'MangaMatic'
const FILE_BASENAME = 'manga-matic'

export default function ComicMakerApp(){
  const { t, lang, setLang } = useI18n();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const height = useMemo(()=> Math.round(width*(RATIO_H/RATIO_W)), [width]);

  const [characters, setCharacters] = useState(() => [
    emptyCharacter('A', t('character.A')),
    emptyCharacter('B', t('character.B')),
  ]);
  const [useCharacterB, setUseCharacterB] = useState(false); // Hidden by default

  const [tone, setTone] = useState('story.slice_of_life');
  const [overallDesc, setOverallDesc] = useState("");
  type AutoPlan = 'script' | 'script+characters' | 'full'
  const [autoPlan, setAutoPlan] = useState<AutoPlan>('full');
  const [artTone, setArtTone] = useState('chibi-gag');

  const [panels, setPanels] = useState(Array.from({length:PANEL_COUNT}, (_,i)=> emptyPanel(i)));

  const [showGuide, setShowGuide] = useState(false);
  useEffect(()=>{
    if(typeof window !== 'undefined' && !localStorage.getItem('seenGuide')){
      setShowGuide(true);
    }
  },[]);
  const closeGuide = ()=>{
    localStorage.setItem('seenGuide','1');
    setShowGuide(false);
  };

  // Settings modal removed
  const [isComposing, setIsComposing] = useState(false);
  const [overlayLabel, setOverlayLabel] = useState(null as null | string);

  // Style synchronization is optional (no automatic syncing)

  // Character reference upload/generation (optional)
  const uploadCharacterRefs = async (idx, files)=>{
    if (!files || files.length === 0) return;
    const url = await fileToDataURL(files[0]);
    setCharacters(prev=>{
      const next = [...prev];
      next[idx] = { ...next[idx], refs: [url], generated: null };
      return next;
    });
  };
  const generateCharacter = async (idx, override)=>{
    const ch = { ...characters[idx], ...(override||{}) };
    setOverlayLabel(t('overlay.generatingCharacter'));
    let outUrl: string | null = null
    try{
      const res = await fetch('/v1/generate/character', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: ch.name,
          style_preset: ch.stylePreset,
          prompt: ch.prompt,
          ref_data_urls: ch.refs?.slice(0, 1) || [],
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'character generation failed')
      const url = json.url
      setCharacters(prev => {
        const next = [...prev]
        next[idx] = { ...next[idx], ...(override || {}), generated: url }
        return next
      })
      outUrl = url
    } catch(e){
      console.error(e)
      alert(`${t('alert.characterGenFailed')}: ${e?.message || e}`)
    } finally {
      setOverlayLabel(null)
    }
    return outUrl
  };

  // Panel: overwrite canvas (upload -> confirm -> replace)
  const replaceCanvasWithUpload = async (i, files)=>{
    if (!files || !files.length) return;
    const dataURL = await fileToDataURL(files[0]);
    setPanels(prev=> prev.map(p=> p.index===i? { ...p, _pendingOverwrite: dataURL } : p));
  };
  const confirmOverwrite = (i)=> setPanels(prev=> prev.map(p=> p.index===i? { ...p, drawingDataURL: p._pendingOverwrite || p.drawingDataURL, _pendingOverwrite: undefined } : p));
  const cancelOverwrite = (i)=> setPanels(prev=> prev.map(p=> p.index===i? { ...p, _pendingOverwrite: undefined } : p));

  const saveSketch = (i, dataURL)=> setPanels(prev=> prev.map(p=> p.index===i? { ...p, drawingDataURL: dataURL } : p));

  // Actual generation via /v1/generate/panels
  const generateViaAPI = async (i, override?: { characters?: any; useCharacterB?: boolean; panels?: any[] }): Promise<string|null>=>{
    const localPanels = override?.panels || panels
    const localCharacters = override?.characters || characters
    const localUseB = typeof override?.useCharacterB === 'boolean' ? override.useCharacterB : useCharacterB
    const p = localPanels[i];
    setPanels(prev=> prev.map(x=> x.index===i? { ...x, status: 'generating' } : x));

    try {
      const refsA = [
        ...(localCharacters[0].generated ? [localCharacters[0].generated] : []),
        ...(localCharacters[0].refs || []),
      ]
      const refsB = localUseB
        ? [
            ...(localCharacters[1].generated ? [localCharacters[1].generated] : []),
            ...(localCharacters[1].refs || []),
          ]
        : []
      const payload = {
        indexes: [i],
        characters: {
          A: {
            style_preset: localCharacters[0].stylePreset,
            prompt: localCharacters[0].prompt,
            ref_data_urls: refsA,
          },
          B: localUseB
            ? {
                style_preset: localCharacters[1].stylePreset,
                prompt: localCharacters[1].prompt,
                ref_data_urls: refsB,
              }
            : null,
        },
        panels: {
          [i]: {
            desc: p.desc,
            lineA: p.lineA,
            ...(localUseB ? { lineB: p.lineB } : {}),
            layoutHint: p.layoutHint,
            shot: p.shot,
            canvas_data_url: p.drawingDataURL,
          }
        },
        options: { preserve_style: true, quality: 'standard', style_tone: artTone }
      };

      const res = await fetch('/v1/generate/panels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || 'generation request failed');

      const out = body.panel_outputs?.find((o:any)=> o.index===i);
      if (!out?.url) throw new Error('no output image');

      setPanels(prev=> prev.map(pp=> pp.index===i
        ? { ...pp, status: 'done', generatedImage: out.url }
        : pp));
      return out.url as string
    } catch (e){
      console.error(e);
      setPanels(prev=> prev.map(pp=> pp.index===i? { ...pp, status: 'error' } : pp));
      alert(`${t('alert.panelGenFailed')}: ${e?.message || e}`);
      return null
    } finally {}
  };

  const composeToDataURL = async (
    urlsOverride?: Array<string|null|undefined>,
    infoOverride?: Array<{ desc?: string; lineA?: string; lineB?: string }>
  )=>{
    const c = document.createElement('canvas')
    const totalH = (height * PANEL_COUNT) + (MARGIN * (PANEL_COUNT - 1)) + (SEP * (PANEL_COUNT + 1))
    c.width = width
    c.height = totalH
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0,0,c.width,c.height)
    let y = 0
    for (let i=0;i<PANEL_COUNT;i++){
      ctx.fillStyle = '#000'
      ctx.fillRect(0,y,width,SEP)
      y += SEP
      const chosen = urlsOverride ? urlsOverride[i] : panels[i].generatedImage
      const url = chosen || makePlaceholder(width, height, `Panel ${i+1}`)
      const img = await loadImage(url)
      const panelTop = y
      ctx.drawImage(img,0,panelTop,width,height)
      // Burn speech text into the image (A/B)
      try {
        const info = infoOverride ? infoOverride[i] : panels[i]
        const maxW = Math.floor(width * 0.5)
        const topY = panelTop + Math.round(Math.max(24, height * 0.04)) // Slight margin

        if (info?.lineA) {
          // Semi-transparent box with shadow, then text on top
          const { fontSize, lineHeight: lh, pad } = calcSpeechMetrics(width)
          ctx.font = `600 ${fontSize}px ui-sans-serif`
          const linesA = wrapText(ctx, String(info.lineA), maxW - pad * 2)
          const rawWA = Math.max(Math.max(120, Math.round(fontSize*6)), ...linesA.map(l=> ctx.measureText(l).width))
          const wA = Math.min(maxW, rawWA + pad * 2)
          const hA = linesA.length * lh + pad * 2
          ctx.save(); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.shadowColor='rgba(0,0,0,0.15)'; ctx.shadowBlur=8; ctx.shadowOffsetY=1; roundRect(ctx, 12, topY, wA, hA, 12); ctx.fill(); ctx.restore();
          ctx.fillStyle = '#111'; ctx.textBaseline='alphabetic'
          linesA.forEach((l,ix)=> ctx.fillText(l, 12 + pad, topY + pad + (ix + 1) * lh - Math.round(fontSize*0.25)))
        }
        if (info?.lineB) {
          const { fontSize, lineHeight: lh, pad } = calcSpeechMetrics(width)
          ctx.font = `600 ${fontSize}px ui-sans-serif`
          const linesB = wrapText(ctx, String(info.lineB), maxW - pad * 2)
          const rawWB = Math.max(Math.max(120, Math.round(fontSize*6)), ...linesB.map(l=> ctx.measureText(l).width))
          const wB = Math.min(maxW, rawWB + pad * 2)
          const hB = linesB.length * lh + pad * 2
          const xRight = width - wB - 12
          ctx.save(); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.shadowColor='rgba(0,0,0,0.15)'; ctx.shadowBlur=8; ctx.shadowOffsetY=1; roundRect(ctx, xRight, topY, wB, hB, 12); ctx.fill(); ctx.restore();
          ctx.fillStyle = '#111'; ctx.textBaseline='alphabetic'
          linesB.forEach((l,ix)=> ctx.fillText(l, xRight + pad, topY + pad + (ix + 1) * lh - Math.round(fontSize*0.25)))
        }
      } catch {}
      y += height
      if (i < PANEL_COUNT - 1){
        ctx.fillStyle = '#fff'
        ctx.fillRect(0,y,width,MARGIN)
        y += MARGIN
      }
    }
    ctx.fillStyle = '#000'
    ctx.fillRect(0,y,width,SEP)
    return c.toDataURL('image/png')
  }

// Single panel: burn speech text into PNG
  const composePanelToDataURL = async (panel: any, w: number, h: number)=>{
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h)
    const url = panel.generatedImage || makePlaceholder(w, h, `Panel ${panel.index+1}`)
    const img = await loadImage(url)
    ctx.drawImage(img,0,0,w,h)
    const info = panel
    const maxW = Math.floor(w * 0.5)
    const topY = Math.round(Math.max(24, h * 0.04))
    if (info?.lineA){
      const { fontSize, lineHeight: lh, pad } = calcSpeechMetrics(w)
      ctx.font = `600 ${fontSize}px ui-sans-serif`
      const linesA = wrapText(ctx, String(info.lineA), maxW - pad*2)
      const rawWA = Math.max(Math.max(120, Math.round(fontSize*6)), ...linesA.map(l=> ctx.measureText(l).width))
      const wA = Math.min(maxW, rawWA + pad * 2)
      const hA = linesA.length * lh + pad * 2
      ctx.save(); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.shadowColor='rgba(0,0,0,0.15)'; ctx.shadowBlur=8; ctx.shadowOffsetY=1; roundRect(ctx, 12, topY, wA, hA, 12); ctx.fill(); ctx.restore();
      ctx.fillStyle='#111'; ctx.textBaseline='alphabetic'
      linesA.forEach((l,ix)=> ctx.fillText(l, 12 + pad, topY + pad + (ix + 1) * lh - Math.round(fontSize*0.25)))
    }
    if (info?.lineB){
      const { fontSize, lineHeight: lh, pad } = calcSpeechMetrics(w)
      ctx.font = `600 ${fontSize}px ui-sans-serif`
      const linesB = wrapText(ctx, String(info.lineB), maxW - pad*2)
      const rawWB = Math.max(Math.max(120, Math.round(fontSize*6)), ...linesB.map(l=> ctx.measureText(l).width))
      const wB = Math.min(maxW, rawWB + pad * 2)
      const hB = linesB.length * lh + pad * 2
      const xRight = w - wB - 12
      ctx.save(); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.shadowColor='rgba(0,0,0,0.15)'; ctx.shadowBlur=8; ctx.shadowOffsetY=1; roundRect(ctx, xRight, topY, wB, hB, 12); ctx.fill(); ctx.restore();
      ctx.fillStyle='#111'; ctx.textBaseline='alphabetic'
      linesB.forEach((l,ix)=> ctx.fillText(l, xRight + pad, topY + pad + (ix + 1) * lh - Math.round(fontSize*0.25)))
    }
    return c.toDataURL('image/png')
  }

  const [composePreview, setComposePreview] = useState<string|null>(null)
  const [showComposeModal, setShowComposeModal] = useState(false)

  const openComposePreview = async ()=>{
    setIsComposing(true)
    setOverlayLabel(t('overlay.composingImages'))
    try{
      const url = await composeToDataURL()
      setComposePreview(url)
      setShowComposeModal(true)
    } catch(e){
      console.error(e)
      alert(`${t('alert.mergeFailed')}: ${e?.message || e}`)
    } finally { setIsComposing(false); setOverlayLabel(null) }
  }

  const resetAll = ()=>{
    if (!confirm(t('confirm.resetAll'))) return;
    setCharacters([emptyCharacter('A', t('character.A')), emptyCharacter('B', t('character.B'))])
    setUseCharacterB(false)
    setTone('story.boke_tsukkomi')
    setOverallDesc('')
    setPanels(Array.from({length:PANEL_COUNT}, (_,i)=> emptyPanel(i)))
    setWidth(DEFAULT_WIDTH)
  }

  const guessBFromText = (s)=>{
    if (!s) return false;
    const t = String(s);
    return /\u4E8C\u4EBA|\uFF12\u4EBA|2\u4EBA|\u3075\u305F\u308A|two\s+(girls|people|characters)|2\s*(girls|people|characters)|A\u3068B/.test(t);
  }

// AI script generation (Gemini 2.5 Pro)
  const autoScript = async ()=>{
    setOverlayLabel(t('overlay.generatingScript'))
    try{
      const wantB = useCharacterB || guessBFromText(overallDesc)
      const res = await fetch('/v1/script/generate', {
        method:'POST', headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ overall_desc: overallDesc, tone: t(tone), use_character_b: wantB })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message || 'script generation failed')
      const pairs = json.panels || []
      const needB = (pairs || []).some((pp:any)=> !!(pp?.lineB && String(pp.lineB).trim())) || !!json.characters?.B
      const newUseB = useCharacterB || wantB || needB
      // Reflect B usage in UI state (sticky ON once requested or detected)
      setUseCharacterB(newUseB)

      const shotValues = new Set(shotOptions.map(s=> s.value))
      const isAllowedShot = (s:string)=>{
        if (!s || !shotValues.has(s)) return false
        if (!newUseB && (/_B$/.test(s) || s==='two_shot')) return false
        return true
      }
      setPanels(prev=> prev.map((p,idx)=> ({
        ...p,
        desc: pairs[idx]?.desc || '',
        lineA: pairs[idx]?.lineA || '',
        lineB: newUseB ? (pairs[idx]?.lineB || '') : '',
        shot: isAllowedShot(pairs[idx]?.shot) ? pairs[idx]?.shot : p.shot,
        drawingDataURL: null,
        generatedImage: null,
        status: 'draft',
      })))

      // Update character descriptions if provided (overwrite instead of merge)
      const charA = json.characters?.A || {}
      const charB = json.characters?.B || {}
      setCharacters([
        { ...emptyCharacter('A', t('character.A')), name: charA.name || '', prompt: charA.prompt || '', stylePreset: artTone },
        newUseB
          ? { ...emptyCharacter('B', t('character.B')), name: charB.name || '', prompt: charB.prompt || '', stylePreset: artTone }
          : { ...emptyCharacter('B', t('character.B')), stylePreset: artTone }
      ])

      let urlA: string | null = null
      let urlB: string | null = null
      if (autoPlan !== 'script') {
        urlA = await generateCharacter(0, { name: charA.name, prompt: charA.prompt, stylePreset: artTone, refs: [] })
        if (newUseB) {
          urlB = await generateCharacter(1, { name: charB.name, prompt: charB.prompt, stylePreset: artTone, refs: [] })
        }
      }

      if (autoPlan === 'full') {
        setOverlayLabel(t('overlay.generatingPanels'))
        // Use local state snapshot to avoid async setState issues
        const panelsForGen = panels.map((p,idx)=> ({
          ...emptyPanel(p.index),
          layoutHint: p.layoutHint,
          desc: pairs[idx]?.desc || '',
          lineA: pairs[idx]?.lineA || '',
          lineB: newUseB ? (pairs[idx]?.lineB || '') : '',
          shot: isAllowedShot(pairs[idx]?.shot) ? pairs[idx]?.shot : p.shot,
        }))
        const charactersForGen = [
          { stylePreset: charA.stylePreset || 'chibi-gag', prompt: charA.prompt || '', refs: [], generated: urlA },
          { stylePreset: charB.stylePreset || 'chibi-gag', prompt: charB.prompt || '', refs: [], generated: urlB },
        ]
        const genUrls: Array<string|null> = []
        for (let i=0;i<PANEL_COUNT;i++){
          const u = await generateViaAPI(i, { characters: charactersForGen, useCharacterB: newUseB, panels: panelsForGen })
          genUrls[i] = u
        }
        // Compose images and open preview
        setOverlayLabel(t('overlay.composingImages'))
        const info = panelsForGen.map(p=> ({ desc: p.desc || '', lineA: p.lineA || '', lineB: newUseB ? (p.lineB || '') : '' }))
        const url = await composeToDataURL(genUrls, info)
        setComposePreview(url)
        setShowComposeModal(true)
      }
    } catch(e){
      console.error(e)
      alert(`${t('alert.scriptGenFailed')}: ${e?.message || e}`)
    } finally {
      setOverlayLabel(null)
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {showGuide && <GuideModal onClose={closeGuide}/>}
      {overlayLabel && <LoadingOverlay label={overlayLabel}/>}
      {showComposeModal && composePreview && (
        <ComposePreviewModal
          url={composePreview}
          onClose={()=>{ setShowComposeModal(false); setComposePreview(null); }}
          onDownload={()=>{ downloadDataURL(composePreview, `${FILE_BASENAME}_vertical.png`) }}
        />
      )}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-5 w-5"/> {SITE_NAME}</div>
          <div className="flex items-center gap-2">
            <button onClick={openComposePreview} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"> <Play className="h-4 w-4"/> {t('header.preview')} </button>
            <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"> {t('header.reset')} </button>
            <select value={lang} onChange={(e)=>setLang(e.target.value as Lang)} className="rounded-lg border border-neutral-300 p-1.5 text-sm">
              <option value="en">{t('lang.en')}</option>
              <option value="ja">{t('lang.ja')}</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
        {/* Left column: automatic block on top */}
        <section className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader title={t('card.autoScript.title')} subtitle={t('card.autoScript.subtitle')}/>
            <div className="space-y-3">
              <label className="block text-sm font-medium" title={t('tooltip.overview')}>{t('form.overview')}</label>
              <textarea value={overallDesc} onChange={(e)=>setOverallDesc(e.target.value)} placeholder={t('placeholder.overviewExample')} className="h-24 w-full rounded-xl border border-neutral-300 p-3 text-sm" title={t('tooltip.overview')}/>
              <div className="flex items-center gap-2">
                <label className="text-sm" title={t('tooltip.tone')}>{t('form.tone')}:</label>
                <select value={tone} onChange={(e)=>setTone(e.target.value)} className="rounded-lg border border-neutral-300 p-1.5 text-sm" title={t('tooltip.tone')}>
                  {toneOptions.map(o=> <option key={o.value} value={o.value}>{t(o.value)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm" title={t('tooltip.artStyle')}>{t('form.artStyle')}:</label>
                <select value={artTone} onChange={(e)=>setArtTone(e.target.value)} className="rounded-lg border border-neutral-300 p-1.5 text-sm" title={t('tooltip.artStyle')}>
                  {artToneOptions.map(o=> <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <select value={autoPlan} onChange={(e)=>setAutoPlan(e.target.value as AutoPlan)} className="rounded-lg border border-neutral-300 p-1.5 text-sm" title={t('tooltip.autoPlan')}>
                  <option value="script">{t('option.autoPlan.script')}</option>
                  <option value="script+characters">{t('option.autoPlan.scriptCharacters')}</option>
                  <option value="full">{t('option.autoPlan.full')}</option>
                </select>
                <button onClick={autoScript} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
                  <Wand2 className="h-4 w-4"/> {t('button.create')}
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('card.characters.title')} subtitle={t('card.characters.subtitle')}/>
            <div className="space-y-4">
              <CharacterCard
                character={characters[0]}
                onUpdate={(next)=>setCharacters(prev=>[next, prev[1]])}
                onUpload={(files)=>uploadCharacterRefs(0, files)}
                onGenerate={()=>generateCharacter(0)}
              />

              <div className="flex items-center gap-2">
                <input id="toggleB" type="checkbox" checked={useCharacterB} onChange={(e)=>setUseCharacterB(e.target.checked)} title={t('tooltip.useCharacterB')}/>
                <label htmlFor="toggleB" className="text-sm" title={t('tooltip.useCharacterB')}>{t('label.useCharacterB')}</label>
              </div>

              {useCharacterB && (
                <CharacterCard
                  character={characters[1]}
                  onUpdate={(next)=>setCharacters(prev=>[prev[0], next])}
                  onUpload={(files)=>uploadCharacterRefs(1, files)}
                  onGenerate={()=>generateCharacter(1)}
                />
              )}
            </div>
          </Card>
        </section>

        {/* Right column: panels (script + canvas references + generation) */}
        <section className="lg:col-span-2 space-y-6">
          {panels.map((p,i)=> (
            <PanelCard key={i}
              panel={p}
              width={width}
              height={height}
              useCharacterB={useCharacterB}
              onChange={(patch)=> setPanels(prev=> prev.map(pp=> pp.index===i? { ...pp, ...patch } : pp))}
              onOpenCanvas={()=> setPanels(prev=> prev.map(pp=> pp.index===i? { ...pp, _editingCanvas: true } : pp))}
              onCloseCanvas={()=> setPanels(prev=> prev.map(pp=> pp.index===i? { ...pp, _editingCanvas: false } : pp))}
              onSaveSketch={(url)=> saveSketch(i, url)}
              onUploadReplace={(files)=> replaceCanvasWithUpload(i, files)}
              onConfirmOverwrite={()=> confirmOverwrite(i)}
              onCancelOverwrite={()=> cancelOverwrite(i)}
              onGenerate={()=> generateViaAPI(i)}
              onRegenerate={()=> generateViaAPI(i)}
              onDownload={()=>{ const url=p.generatedImage || makePlaceholder(width, height, `Panel ${i+1}`); downloadDataURL(url, `${FILE_BASENAME}_panel${i+1}.png`); }}
              onDownloadWithSpeech={async ()=>{ const url = await composePanelToDataURL(p, width, height); downloadDataURL(url, `${FILE_BASENAME}_panel${i+1}_speech.png`); }}
            />
          ))}
        </section>
      </main>


      <footer className="border-t border-neutral-200 bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-xs text-neutral-500">
          <div>© {new Date().getFullYear()} MangaMatic</div>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------
// Components
// -------------------------------
function Card({ children }){ return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">{children}</div>; }
function CardHeader({ title, subtitle }){ return (<div className="mb-3"><h2 className="text-base font-semibold leading-tight">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}</div>); }

function CharacterCard({ character, onUpdate, onUpload, onGenerate }){
  const { t } = useI18n();
  const fileInputRef = useRef(null as HTMLInputElement | null)
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white">{character.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onGenerate} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100"><Wand2 className="h-4 w-4"/> {t('button.aiGenerate')}</button>
        </div>
      </div>
      <textarea value={character.prompt} onChange={(e)=>onUpdate({ ...character, prompt: e.target.value })} className="mb-2 h-16 w-full rounded-md border border-neutral-300 p-2 text-xs" placeholder={t('placeholder.characterPrompt')}/>
      <div className="mb-2">
        <label className="block text-xs font-medium">{t('form.artStyle')}</label>
        <select
          value={character.stylePreset}
          onChange={(e)=>onUpdate({ ...character, stylePreset: e.target.value })}
          className="w-full rounded-md border border-neutral-300 p-1.5 text-xs"
        >
          {artToneOptions.map(o=> (
            <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {character.generated || character.refs.length > 0 ? (
          <label className="relative block aspect-square w-full cursor-pointer">
            <img src={character.generated || character.refs[0]} alt="ref" className="h-full w-full rounded-md object-cover"/>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>onUpload(e.target.files)}/>
            <span className="absolute right-2 bottom-2 inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white/90 p-1 shadow">
              <Upload className="h-4 w-4 text-neutral-700"/>
            </span>
          </label>
        ) : (
          <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-neutral-300 text-xs text-neutral-500 hover:bg-neutral-100">
            <Upload className="h-4 w-4"/> {t('button.addReference')}
            <input type="file" accept="image/*" className="hidden" onChange={(e)=>onUpload(e.target.files)}/>
          </label>
        )}
      </div>
    </div>
  );
}

function PanelCard({ panel, width, height, useCharacterB, onChange, onOpenCanvas, onCloseCanvas, onSaveSketch, onUploadReplace, onConfirmOverwrite, onCancelOverwrite, onGenerate, onRegenerate, onDownload, onDownloadWithSpeech }){
  const { t } = useI18n();
  const allowedShots = shotOptions.filter(s=>{
    if (useCharacterB) return true
    // Hide B-only shots when character B is unused
    if (s.value === 'two_shot') return false
    if (/_B$/.test(s.value)) return false
    return true
  });
  const showCanvasModal = !!panel._editingCanvas;
  const showOverwrite = !!panel._pendingOverwrite;

  return (
    <div className="relative rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      {panel.status==='generating' && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-white/70">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow"><RotateCw className="h-4 w-4 animate-spin"/><span className="text-xs">{t('status.generating')}…</span></div>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white">{panel.index+1}</span>
          <span className="text-sm font-medium">{t('panel.edit')}</span>
          <StatusBadge status={panel.status}/>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onGenerate} disabled={panel.status==='generating'} className={`inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100 ${panel.status==='generating'?'opacity-60 cursor-not-allowed':''}`}><Play className="h-4 w-4"/> {t('button.generate')}</button>
          <button onClick={onRegenerate} disabled={panel.status==='generating'} className={`inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100 ${panel.status==='generating'?'opacity-60 cursor-not-allowed':''}`}><RotateCw className="h-4 w-4"/> {t('button.regenerate')}</button>
          <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100"><Download className="h-4 w-4"/> {t('button.savePng')}</button>
          <button onClick={onDownloadWithSpeech} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100"><Download className="h-4 w-4"/> {t('button.savePngWithSpeech')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Preview */}
        <div>
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            <img src={panel.generatedImage || makePlaceholder(width, height, `Panel ${panel.index+1}`)} alt={`panel-${panel.index+1}`} className="h-auto w-full"/>
            {panel.lineA && (
              <div className="pointer-events-none absolute left-3 top-12 max-w-[45%] rounded-xl bg-white/80 p-3 text-base md:text-lg font-semibold text-neutral-900 shadow">{panel.lineA}</div>
            )}
            {useCharacterB && panel.lineB && (
              <div className="pointer-events-none absolute right-3 top-12 max-w-[45%] rounded-xl bg-white/80 p-3 text-base md:text-lg font-semibold text-neutral-900 shadow">{panel.lineB}</div>
            )}

          </div>
          {/* Restore-from-history UI hidden */}
        </div>

        {/* Script + canvas-based references */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="text-sm font-medium">{t('panel.script')}</div>
              <select value={panel.shot} onChange={(e)=>onChange({ shot: e.target.value })} className="ml-auto rounded-md border border-neutral-300 p-1.5 text-xs">
                <option value="">{t('panel.noShot')}</option>
                {allowedShots.map(s=> <option key={s.value} value={s.value} title={t(s.titleKey)}>{t(s.labelKey)}</option>)}
              </select>
              </div>
            <label className="block text-xs font-medium">{t('label.description')}</label>
            <textarea value={panel.desc} onChange={(e)=>onChange({ desc: e.target.value.slice(0,80) })} className="mb-2 h-14 w-full rounded-md border border-neutral-300 p-2 text-xs" placeholder={t('placeholder.descriptionExample')}/>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium">{t('label.lineA')}</label>
                <textarea value={panel.lineA} onChange={(e)=>onChange({ lineA: e.target.value.slice(0,80) })} className="h-14 w-full rounded-md border border-neutral-300 p-2 text-xs" placeholder={t('placeholder.lineA')}/>
              </div>
              {useCharacterB && (
                <div>
                  <label className="block text-xs font-medium">{t('label.lineB')}</label>
                  <textarea value={panel.lineB} onChange={(e)=>onChange({ lineB: e.target.value.slice(0,80) })} className="h-14 w-full rounded-md border border-neutral-300 p-2 text-xs" placeholder={t('placeholder.lineB')}/>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input value={panel.layoutHint} onChange={(e)=>onChange({ layoutHint: e.target.value })} placeholder={t('placeholder.layoutHint')} className="w-48 rounded-md border border-neutral-300 p-1.5 text-xs"/>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{t('label.rough')}</div>
                <label className="inline-flex items-center gap-1 text-xs text-neutral-700">
                  <input type="checkbox" checked={!!panel._refsOpen} onChange={(e)=>onChange({ _refsOpen: e.target.checked })}/>
                  {t('label.showTools')}
                </label>
              </div>
              {panel._refsOpen && (
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={onOpenCanvas} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100"><Brush className="h-4 w-4"/> {t('button.drawRough')}</button>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100 cursor-pointer">
                    <ImageUp className="h-4 w-4"/> {t('button.loadImage')}
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>onUploadReplace(e.target.files)}/>
                  </label>
                </div>
              )}
            </div>
            {panel._refsOpen && (
              <div className="rounded-md border border-neutral-200 bg-white p-2">
                {panel.drawingDataURL ? (
                  <img src={panel.drawingDataURL} alt="canvas-preview" className="mx-auto max-h-60 w-full object-contain"/>
                ) : (
                  <p className="text-center text-xs text-neutral-500">{t('message.noRough')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overwrite confirmation modal */}
      {showOverwrite && (
        <ConfirmModal
          message={t('confirm.replaceCanvas')}
          onCancel={onCancelOverwrite}
          onConfirm={onConfirmOverwrite}
          index={panel.index}
        />
      )}

      {/* Canvas editor modal */}
      {showCanvasModal && (
        <CanvasEditorModal
          initial={panel.drawingDataURL}
          ratio={{w:RATIO_W, h:RATIO_H}}
          onClose={onCloseCanvas}
          onSave={(url)=> onSaveSketch(url)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }){
  const { t } = useI18n();
  const map={ draft:{text:t('status.draft'),cls:'bg-neutral-200 text-neutral-700'}, generating:{text:t('status.generating'),cls:'bg-amber-200 text-amber-900'}, done:{text:t('status.done'),cls:'bg-emerald-200 text-emerald-900'}, failed:{text:t('status.failed'),cls:'bg-rose-200 text-rose-900'} };
  const it = map[status] || map.draft; return <span className={`rounded-full px-2 py-0.5 text-xs ${it.cls}`}>{it.text}</span>;
}

function LoadingOverlay({ label }: { label: string }){
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xl">
        <RotateCw className="h-5 w-5 animate-spin"/>
        <div className="text-sm font-medium text-neutral-800">{label}</div>
      </div>
    </div>
  );
}

// Composition preview modal
function ComposePreviewModal({ url, onClose, onDownload }: { url: string; onClose: ()=>void; onDownload: ()=>void }){
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{t('preview.title')}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100"><X className="h-5 w-5"/></button>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2">
          <img src={url} alt="composed-preview" className="mx-auto h-auto w-full max-w-full"/>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"><Download className="h-4 w-4"/> {t('preview.download')}</button>
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100">{t('preview.close')}</button>
        </div>
      </div>
    </div>
  )
}

// Settings modal removed

// -------------------------------
// Modal: first visit guide
// -------------------------------
function GuideModal({ onClose }){
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
        <h3 className="mb-2 text-base font-semibold">{t('guide.title')}</h3>
        <p className="mb-4 text-sm">{t('guide.message')}</p>
        <div className="text-right">
          <button onClick={onClose} className="rounded-xl bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white">{t('guide.close')}</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------
// Modal: overwrite confirmation
// -------------------------------
function ConfirmModal({ message, onCancel, onConfirm, index }){
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
        <div className="mb-3 text-sm">{message}</div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={()=>onCancel(index)} className="rounded-xl border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">{t('confirm.cancel')}</button>
          <button onClick={()=>onConfirm(index)} className="rounded-xl bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white">{t('confirm.overwrite')}</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------
// Modal: canvas editor (large)
// -------------------------------
function CanvasEditorModal({ initial, ratio, onClose, onSave }){
  const { t } = useI18n();
  // Provide generous canvas size inside modal
  const baseW = 900; // Internal resolution (keeps drawing quality)
  const baseH = Math.round(baseW * (ratio.h / ratio.w));
  const [brushSize, setBrushSize] = useState(6);
  const [mode, setMode] = useState('draw'); // 'draw' | 'erase'

  const canvasRef = useRef(null);
  const isDownRef = useRef(false);
  const lastRef = useRef(null);

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d');
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=brushSize; ctx.strokeStyle='#111'; ctx.globalCompositeOperation='source-over';
    if(initial){ loadImage(initial).then(img=>{ ctx.clearRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height); }); }
    else { ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height); }
  }, [initial]);

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d'); ctx.lineWidth=brushSize; }, [brushSize]);

  const toLocal = (e)=>{
    const c = canvasRef.current; if(!c) return {x:0,y:0};
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width;
    const sy = c.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  const down = (e)=>{ isDownRef.current=true; lastRef.current=toLocal(e); };
  const move = (e)=>{ if(!isDownRef.current) return; const p=toLocal(e); const ctx=canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(lastRef.current.x,lastRef.current.y); ctx.lineTo(p.x,p.y); ctx.strokeStyle = '#111'; ctx.globalCompositeOperation = (mode==='erase')? 'destination-out' : 'source-over'; ctx.stroke(); lastRef.current=p; };
  const up = ()=>{ isDownRef.current=false; };

  const clearAll = ()=>{ const c=canvasRef.current; const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.globalCompositeOperation='source-over'; ctx.fillRect(0,0,c.width,c.height); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{t('canvas.title')}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-neutral-100"><X className="h-5 w-5"/></button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm">
            <button onClick={()=>setMode('draw')} className={`inline-flex items-center gap-1 ${mode==='draw'? 'font-semibold' : ''}`}><Brush className="h-4 w-4"/> {t('canvas.draw')}</button>
            <span className="mx-2 h-4 w-px bg-neutral-300"/>
            <button onClick={()=>setMode('erase')} className={`inline-flex items-center gap-1 ${mode==='erase'? 'font-semibold' : ''}`}><Eraser className="h-4 w-4"/> {t('canvas.erase')}</button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm">
            <span>{t('canvas.thickness')}</span>
            <input type="range" min={2} max={36} step={1} value={brushSize} onChange={(e)=>setBrushSize(Number(e.target.value))}/>
            <span className="w-8 text-right text-xs text-neutral-600">{brushSize}</span>
          </div>
          <button onClick={clearAll} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs hover:bg-neutral-100"><Trash2 className="h-4 w-4"/> {t('canvas.clear')}</button>
          <button onClick={()=> onSave(canvasRef.current.toDataURL('image/png'))} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"><Check className="h-4 w-4"/> {t('canvas.save')}</button>
        </div>
        <div className="overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2">
          <canvas
            ref={canvasRef}
            width={baseW}
            height={baseH}
            onMouseDown={down}
            onMouseMove={move}
            onMouseUp={up}
            onMouseLeave={up}
            className="mx-auto block h-auto w-auto max-w-full max-h-[70vh] select-none rounded-lg bg-white"
          />
        </div>
      </div>
    </div>
  );
}
