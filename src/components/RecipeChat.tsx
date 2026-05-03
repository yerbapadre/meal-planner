'use client'
import { useState, useRef, useEffect } from 'react'
import { Loader2, ChefHat, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { Meal } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onParsed: (meal: Omit<Meal, 'id'>) => void
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (e: any) => void
  onerror: (e: any) => void
  onend: () => void
  start: () => void
  stop: () => void
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : null

export function RecipeChat({ open, onClose, onParsed }: Props) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Omit<Meal, 'id'> | null>(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const baseTextRef = useRef('')

  useEffect(() => {
    if (!open) stopListening()
  }, [open])

  function startListening() {
    if (!SpeechRecognitionAPI) return
    const recognition: SpeechRecognitionInstance = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    baseTextRef.current = description

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join('')
      setDescription((baseTextRef.current ? baseTextRef.current + ' ' : '') + transcript)
      if (parsed) setParsed(null)
    }

    recognition.onerror = () => stopListening()
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }

  function toggleListening() {
    listening ? stopListening() : startListening()
  }

  async function handleParse() {
    if (listening) stopListening()
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setParsed(null)
    try {
      const res = await fetch('/api/ai/parse-recipe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to parse recipe')
      setParsed(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenInForm() {
    if (!parsed) return
    onParsed(parsed)
    reset()
  }

  function reset() {
    stopListening()
    setDescription('')
    setParsed(null)
    setError(null)
    baseTextRef.current = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()} disablePointerDismissal>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Describe a Recipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Textarea
              placeholder="e.g. Chicken stir fry with 2 chicken breasts, 1 cup soy sauce, 2 tbsp sesame oil, 2 cups broccoli florets, 3 cloves garlic. Serves 4, takes about 20 minutes."
              value={description}
              onChange={e => { setDescription(e.target.value); if (parsed) setParsed(null) }}
              rows={6}
              className="resize-none pr-10"
              disabled={loading}
            />
            {SpeechRecognitionAPI && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                title={listening ? 'Stop recording' : 'Speak recipe'}
                className={`absolute right-2.5 top-2.5 p-1 rounded-md transition-colors ${
                  listening
                    ? 'text-red-500 hover:text-red-600 animate-pulse'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>

          {listening && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Listening… speak naturally, then hit Parse Recipe
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {parsed && (
            <div className="rounded-md bg-muted px-3 py-2.5 text-sm space-y-0.5">
              <p className="font-medium">{parsed.name}</p>
              <p className="text-muted-foreground">
                {parsed.ingredients.length} ingredient{parsed.ingredients.length !== 1 ? 's' : ''} · {parsed.servings} serving{parsed.servings !== 1 ? 's' : ''}
                {parsed.prepTimeMinutes ? ` · ${parsed.prepTimeMinutes} min` : ''}
              </p>
              {parsed.tags.length > 0 && (
                <p className="text-muted-foreground">{parsed.tags.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          {!parsed ? (
            <Button onClick={handleParse} disabled={loading || !description.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Parse Recipe
            </Button>
          ) : (
            <Button onClick={handleOpenInForm}>Open in form →</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
