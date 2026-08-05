import BotAvatar from './BotAvatar'
import type { ChatMessage as Message } from '@/lib/chat/validate'

/**
 * One turn. The visitor's words sit right-aligned in a bordered surface; the bot's sit
 * left-aligned behind its own face.
 *
 * Deliberately NOT two mirrored bubbles. Only one side of this conversation is a
 * character, so only one side gets an avatar — which also means the eye never has to hunt
 * for who said what.
 */
export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-[5px] border border-[#DFD7C8] dark:border-[#2A2F38] bg-black/[0.035] dark:bg-black/20 px-3 py-2 font-mono text-sm leading-relaxed text-[#2B2A26] dark:text-[#EDEFF2] whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      {/* shrink-0 is load-bearing: without it a long reply squeezes the face flat. */}
      <BotAvatar className="mt-[3px] h-5 w-5 shrink-0 text-[#B5772E] dark:text-[#D9A441]" />
      <p className="max-w-[85%] font-mono text-sm leading-relaxed text-[#2B2A26] dark:text-[#EDEFF2] whitespace-pre-wrap break-words">
        {message.content}
      </p>
    </div>
  )
}
