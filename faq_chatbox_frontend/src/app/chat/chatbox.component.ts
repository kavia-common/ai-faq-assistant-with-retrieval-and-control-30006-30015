import { Component, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagService, ChatMessage } from '../core/rag.service';
import { TopicsBridgeService } from '../core/topics-bridge.service';
import { Inject, PLATFORM_ID } from '@angular/core';

/**
 * Chatbox component provides the main user interaction area with the AI assistant.
 * It integrates with the RAG service and listens to topic changes to refine context.
 */
@Component({
  selector: 'app-chatbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbox.component.html',
  styleUrl: './chatbox.component.css'
})
export class ChatboxComponent implements OnDestroy {
  input = '';
  sending = false;
  messages: ChatMessage[] = [
    { role: 'assistant', content: 'Hi! I’m your AI FAQ assistant. Ask me anything or pick a topic from the left to get started.' }
  ];
  private activeTopic: string | null = null;
  private sub: any;

  /** Holds latest filter feedback message to show to the user, if any. */
  filterFeedback: string | null = null;

  constructor(
    private rag: RagService,
    private topicsBridge: TopicsBridgeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Listen to topic updates from sidebar
    this.sub = this.topicsBridge.topic$.subscribe((topic) => {
      this.activeTopic = topic;
      if (topic) {
        this.messages.push({
          role: 'system',
          content: `Context updated to topic: ${topic.replace('-', ' ')}`
        });
      }
    });
  }

  /**
   * Apply lightweight sanitization and filtering on the user input.
   * - Trims whitespace
   * - Collapses repeated spaces
   * - Simple banned-word masking example
   * - Ensures not empty after cleaning
   * Returns the cleaned text, or null if not acceptable.
   */
  private filterInput(raw: string): { cleaned: string | null; feedback?: string } {
    // Basic trim and whitespace normalization
    let text = (raw ?? '').replace(/\s+/g, ' ').trim();

    if (!text) {
      return { cleaned: null, feedback: 'Please enter a question before sending.' };
    }

    // Example banned words list for demo; extend as needed.
    const banned = ['badword', 'curse', 'offensive'];
    const bannedRegex = new RegExp(`\\b(${banned.join('|')})\\b`, 'gi');

    if (bannedRegex.test(text)) {
      // Option A: block outright
      // return { cleaned: null, feedback: 'Your message contains prohibited words. Please rephrase and try again.' };

      // Option B: mask banned words and proceed
      text = text.replace(bannedRegex, '****');
      // Provide subtle feedback but allow send
      return { cleaned: text, feedback: 'Note: Certain words were masked for safety.' };
    }

    // Simple sanitization: strip angle brackets to avoid naive HTML injection in mock rendering
    text = text.replace(/[<>]/g, '');

    return { cleaned: text };
  }

  // PUBLIC_INTERFACE
  /** Send a user message to the assistant; uses RAG/MCP mock pipeline for response. */
  async send() {
    if (this.sending) return;

    const { cleaned, feedback } = this.filterInput(this.input);
    this.filterFeedback = feedback ?? null;

    if (!cleaned) {
      // Do not send; keep the input so user can fix it
      return;
    }

    this.sending = true;
    // Clear input for UX once we're sending
    this.input = '';
    // Clear previous feedback once message accepted
    // (We keep "masked" feedback visible briefly as a system note for transparency)
    const showMaskNote = !!feedback && /masked/i.test(feedback);

    // Push user message
    this.messages.push({ role: 'user', content: cleaned });

    // Optionally add a system note if masking occurred
    if (showMaskNote) {
      this.messages.push({
        role: 'system',
        content: 'Note: Certain words were masked for safety.'
      });
    }

    try {
      const response = await this.rag.ask(cleaned, { topic: this.activeTopic ?? undefined });
      this.messages.push(response);
    } catch (e) {
      this.messages.push({
        role: 'assistant',
        content: 'Sorry, something went wrong while fetching the answer.',
        error: true
      });
      console.error(e);
    } finally {
      this.sending = false;
      // Reset filter feedback after a successful cycle unless a hard block happened (not the case here).
      this.filterFeedback = null;

      // Scroll bottom on browser only, guard SSR and globals
      if (isPlatformBrowser(this.platformId)) {
        const g: any = globalThis as any;
        const raf: (cb: () => void) => void =
          typeof g.requestAnimationFrame === 'function'
            ? (cb) => g.requestAnimationFrame(cb)
            : (cb) => (typeof g.setTimeout === 'function' ? g.setTimeout(cb, 0) : cb());
        raf(() => {
          const d: any = (globalThis as any).document;
          const list = d && typeof d.querySelector === 'function' ? d.querySelector('.messages') as HTMLElement | null : null;
          if (list) list.scrollTop = list.scrollHeight;
        });
      }
    }
  }

  // PUBLIC_INTERFACE
  /** Clears the current conversation. */
  clear() {
    this.messages = [
      { role: 'assistant', content: 'Chat cleared. How can I help you next?' }
    ];
    this.filterFeedback = null;
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}
