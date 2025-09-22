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

  // PUBLIC_INTERFACE
  /** Send a user message to the assistant; uses RAG/MCP mock pipeline for response. */
  async send() {
    const text = this.input.trim();
    if (!text || this.sending) return;

    this.sending = true;
    this.input = '';
    this.messages.push({ role: 'user', content: text });

    try {
      const response = await this.rag.ask(text, { topic: this.activeTopic ?? undefined });
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
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}
