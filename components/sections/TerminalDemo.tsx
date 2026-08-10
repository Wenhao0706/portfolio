'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/theme/useTheme'
import {
  complete,
  PROMPT,
  runCommand,
  SUGGESTED_COMMANDS,
  type OutputLine,
  type TerminalEffect,
} from '@/lib/terminal/commands'
import { FOCUS_RING, SECTION_HEADING } from '@/lib/ui'
import { TerminalHeading } from '@/components/TerminalHeading'

/** One submitted command and everything it printed. */
type Block = { id: number; input: string | null; lines: OutputLine[] }

const TONE_CLASS: Record<string, string> = {
  default: 'text-[#EDEFF2]',
  muted: 'text-[#8A9099]',
  accent: 'text-[#D9A441]',
  error: 'text-[#E0806B]',
}

const BANNER: Block = {
  id: 0,
  input: null,
  lines: [
    { text: 'yoon_man_hou portfolio shell', tone: 'accent' },
    { text: "Type 'help' to see what this can do. Tab completes.", tone: 'muted' },
  ],
}

export function TerminalDemo() {
  const [blocks, setBlocks] = useState<Block[]>([BANNER])
  const [input, setInput] = useState('')

  /* Submitted commands, newest last. Separate from `blocks` because clear wipes
     the screen but a real shell keeps your history. */
  const [history, setHistory] = useState<string[]>([])
  /* How far back the up arrow has walked. -1 means "editing a fresh line". */
  const [historyIndex, setHistoryIndex] = useState(-1)

  const nextId = useRef(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toggleTheme } = useTheme()

  /* Pin to the newest output. Only the transcript scrolls, never the page, so
     running a command cannot yank the reader away from the section. */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [blocks])

  const applyEffect = useCallback(
    (effect: TerminalEffect) => {
      switch (effect.kind) {
        case 'clear':
          setBlocks([])
          return
        case 'theme':
          toggleTheme()
          return
        case 'scroll':
          document.getElementById(effect.target)?.scrollIntoView({ behavior: 'smooth' })
          return
        case 'open':
          window.open(effect.href, '_blank', 'noopener,noreferrer')
          return
        case 'download': {
          /* A synthetic anchor rather than location.href, so the `download`
             attribute applies and the browser saves the file instead of
             navigating away from the page. */
          const anchor = document.createElement('a')
          anchor.href = effect.href
          anchor.download = ''
          anchor.click()
          return
        }
      }
    },
    [toggleTheme]
  )

  /* Takes the command explicitly so the suggestion chips can run one without
     first writing it into the field and waiting for a render. */
  const submit = (entered: string = input) => {
    setInput('')
    setHistoryIndex(-1)

    const trimmed = entered.trim()
    if (trimmed) setHistory((prev) => [...prev, trimmed])

    const result = runCommand(entered)

    /* The echoed prompt line is appended even for `clear`, then immediately
       discarded by the effect. Doing it in this order keeps the echo logic in one
       place rather than special-casing which commands print themselves. */
    setBlocks((prev) => [...prev, { id: nextId.current++, input: entered, lines: result.lines }])
    if (result.effect) applyEffect(result.effect)
  }

  /* Reads historyIndex rather than using the functional updater, because the
     recall also has to set the input. A state updater that calls another setter
     is not pure, and React invokes updaters twice in StrictMode. */
  const recall = (direction: -1 | 1) => {
    if (!history.length) return

    const next =
      historyIndex === -1
        ? direction === -1
          ? history.length - 1
          : -1
        : historyIndex + direction

    if (next < 0 || next >= history.length) {
      setHistoryIndex(-1)
      setInput('')
      return
    }
    setHistoryIndex(next)
    setInput(history[next])
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        submit(input)
        return
      case 'ArrowUp':
        event.preventDefault()
        recall(-1)
        return
      case 'ArrowDown':
        event.preventDefault()
        recall(1)
        return
      case 'Tab': {
        /* Tab is the browser's focus key, so this has to be prevented before the
           field can use it. That is a real accessibility trade-off: it traps Tab
           inside the input. Escape blurs, which is the documented way out and is
           announced by the field's own help text. */
        event.preventDefault()
        const matches = complete(input)
        if (!matches.length) return

        if (matches.length === 1) {
          const parts = input.trimStart().split(/\s+/)
          parts[parts.length - 1] = matches[0]
          setInput(parts.join(' ') + ' ')
          return
        }
        setBlocks((prev) => [
          ...prev,
          { id: nextId.current++, input, lines: [{ text: matches.join('   '), tone: 'muted' }] },
        ])
        return
      }
      case 'Escape':
        event.currentTarget.blur()
        return
    }
  }

  return (
    <section id="terminal" className="mt-20 scroll-mt-24">
      <TerminalHeading className={`${SECTION_HEADING}`}>Try it yourself</TerminalHeading>
      <p className="mt-3 max-w-2xl text-[#7A7568] dark:text-[#8A9099]">
        A small shell with real commands. It reads the same data the rest of this page
        does, so nothing it tells you is made up. Never used one? Tap a button below and
        it will run for you.
      </p>

      {/* Buttons first, prompt second. Someone who has never used a shell needs a
          way in that is not a blinking cursor daring them to guess. */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SUGGESTED_COMMANDS.map((command) => (
          <button
            key={command}
            type="button"
            onClick={() => {
              submit(command)
              inputRef.current?.focus()
            }}
            className={`rounded-[5px] border border-[#DFD7C8] px-3 py-1.5 font-mono text-xs text-[#7A7568] transition-colors hover:border-[#B5772E] hover:text-[#B5772E] dark:border-[#2A2F38] dark:text-[#8A9099] dark:hover:border-[#D9A441] dark:hover:text-[#D9A441] ${FOCUS_RING} cursor-pointer`}
          >
            {command}
          </button>
        ))}
      </div>

      {/* Always the dark terminal palette, in both site themes. A terminal that
          turns cream in light mode stops reading as a terminal. */}
      <div className="mt-6 overflow-hidden rounded-[7px] border border-[#2A2F38] bg-[#14171C] shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-2 border-b border-[#2A2F38] px-3 py-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#E0806B]" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#D9A441]" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#7FA57F]" />
          <p className="ml-2 font-mono text-[11px] text-[#5A6070]">{PROMPT}: ~</p>
        </div>

        {/* Clicking anywhere in the transcript focuses the field, the way a real
            terminal behaves. The field itself is still the only focusable thing,
            so this adds a pointer shortcut without inventing a keyboard trap. */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="chat-scroll h-64 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6 sm:h-72"
        >
          <div aria-live="polite" aria-atomic="false">
            {blocks.map((block) => (
              <div key={block.id}>
                {block.input !== null && (
                  <p className="break-all">
                    <span className="text-[#D9A441]">{PROMPT}</span>
                    <span className="text-[#5A6070]">:~$ </span>
                    <span className="text-[#EDEFF2]">{block.input}</span>
                  </p>
                )}
                {block.lines.map((output, i) => (
                  <p
                    key={i}
                    className={`whitespace-pre-wrap break-words ${
                      TONE_CLASS[output.tone ?? 'default']
                    }`}
                  >
                    {/* A non-breaking space keeps a blank spacer line at full
                        line-height instead of collapsing it to nothing. */}
                    {output.text || ' '}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-baseline">
            <label htmlFor="terminal-input" className="shrink-0">
              <span className="sr-only">Terminal input. Press Escape to leave the field.</span>
              <span aria-hidden className="text-[#D9A441]">
                {PROMPT}
              </span>
              <span aria-hidden className="text-[#5A6070]">
                :~${' '}
              </span>
            </label>
            <input
              ref={inputRef}
              id="terminal-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-[#EDEFF2] caret-[#D9A441] outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
