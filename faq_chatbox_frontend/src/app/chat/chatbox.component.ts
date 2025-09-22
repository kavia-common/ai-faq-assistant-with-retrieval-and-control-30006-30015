import { Component, OnDestroy, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagService, ChatMessage } from '../core/rag.service';
import { TopicsBridgeService } from '../core/topics-bridge.service';
import { PLATFORM_ID } from '@angular/core';

/**
 * Chatbox component provides the main user interaction area with the AI assistant.
 * It integrates with the RAG service and listens to topic changes to refine context.
 * Refactored: Filtering of FAQs and chat history occurs only when Send is clicked.
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

  /** When true, UI shows only filtered results computed from the last sent input. */
  filterMatches = false;

  /** Cached filtered results to show when filterMatches is true. */
  filteredMessages: ChatMessage[] = [];

  /** Cached filtered FAQ results to show when filterMatches is true. */
  filteredFaqs: Array<{ title: string; content: string }> = [];

  /** Last query used for filtering; shown in UI. */
  lastQuery: string = '';

  /** Minimal mock FAQ catalog by topic to allow UI-side searching across title & content. */
  private faqCatalog: Record<string, Array<{ title: string; content: string }>> = {
    'getting-started': [
      { title: 'Create an account', content: 'To get started, sign up and verify your email to activate your account.' },
      { title: 'Initial setup', content: 'Use the dashboard to configure preferences and connect integrations.' },
    ],
    account: [
      { title: 'Billing details', content: 'Update billing details under Settings > Billing and download invoices.' },
      { title: 'Invoices & charges', content: 'Invoices are generated monthly and emailed to the account owner.' },
    ],
    security: [
      { title: 'Authentication', content: 'We support SSO and MFA. Enable MFA for higher security.' },
      { title: 'Access control', content: 'Use granular role-based access control (RBAC) to restrict permissions.' },
    ],
    api: [
      { title: 'API keys', content: 'Generate and manage API keys from Settings > API.' },
      { title: 'Rate limits', content: 'API rate limiting is enforced at 60 requests per minute.' },
    ],
    troubleshooting: [
      { title: 'Common fixes', content: 'Clear cache and re-authenticate if something looks off.' },
      { title: 'Contact support', content: 'Provide your request ID to support for detailed investigation.' },
    ],
    default: [
      { title: 'General help', content: 'Ask about getting started, account & billing, security, API & integrations, or troubleshooting.' }
    ]
  };

  constructor(
    private rag: RagService,
    private topicsBridge: TopicsBridgeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Listen to topic updates from sidebar
    this.sub = this.topicsBridge.topic$.subscribe((topic) => {
      this.activeTopic = topic;
      // Reset filtered view on topic change (no live recompute)
      this.resetFilterView();
      // Provide subtle system message to note context change
      if (topic) {
        this.messages.push({
          role: 'system',
          content: `Context updated to topic: ${topic.replace('-', ' ')}`
        });
      }
    });
  }

  /**
   * Apply lightweight sanitization and validation on the user input.
   * - Trims whitespace
   * - Collapses repeated spaces
   * - Masks simple banned words
   * - Ensures not empty after cleaning
   * Returns the cleaned text, or null if not acceptable.
   */
  private filterInput(raw: string): { cleaned: string | null; feedback?: string } {
    // Basic trim and whitespace normalization
    let text = (raw ?? '').replace(/\s+/g, ' ').trim();

    if (!text) {
      return { cleaned: null };
    }

    // Example banned words list for demo; extend as needed.
    const banned = ['badword', 'curse', 'offensive'];
    const bannedRegex = new RegExp(`\\b(${banned.join('|')})\\b`, 'gi');

    if (bannedRegex.test(text)) {
      text = text.replace(bannedRegex, '****');
      return { cleaned: text, feedback: 'Note: Certain words were masked for safety.' };
    }

    // Simple sanitization: strip angle brackets to avoid naive HTML injection in mock rendering
    text = text.replace(/[<>]/g, '');

    return { cleaned: text };
  }

  /** Build a local dataset to filter from (current conversation). */
  private buildFilterDataset(): ChatMessage[] {
    return this.messages.slice();
  }

  /** Compute filtered chat history. */
  private computeFilteredHistory(query: string): ChatMessage[] {
    const q = query.toLowerCase();
    const inTopic = this.activeTopic;
    const data = this.buildFilterDataset();

    return data.filter(m => {
      const isContextNote = m.role === 'system' && /Context updated to topic/i.test(m.content);
      if (inTopic && isContextNote) return true;
      return (m.content || '').toLowerCase().includes(q);
    });
  }

  /** Compute filtered FAQs for current topic (or default). */
  private computeFilteredFaqs(query: string): Array<{ title: string; content: string }> {
    const q = query.toLowerCase();
    const topicKey = this.activeTopic && this.faqCatalog[this.activeTopic] ? this.activeTopic : 'default';
    const faqs = this.faqCatalog[topicKey] || [];
    return faqs.filter(f => (f.title?.toLowerCase().includes(q) || f.content?.toLowerCase().includes(q)));
  }

  /** Reset filtering state to show full conversation. */
  private resetFilterView() {
    this.filterMatches = false;
    this.filteredMessages = [];
    this.filteredFaqs = [];
    this.lastQuery = '';
  }

  // PUBLIC_INTERFACE
  /** Send a user message to the assistant; filters FAQs/history only on click/enter. */
  async send() {
    if (this.sending) return;

    const { cleaned, feedback } = this.filterInput(this.input);
    if (!cleaned) {
      this.filterFeedback = 'Please enter a question before sending.';
      return;
    }
    this.filterFeedback = feedback ?? null;

    // Compute filtered view only now (no live filtering)
    this.lastQuery = cleaned;
    this.filteredFaqs = this.computeFilteredFaqs(cleaned);
    this.filteredMessages = this.computeFilteredHistory(cleaned);
    this.filterMatches = true;

    this.sending = true;

    // Push user message and clear input
    this.messages.push({ role: 'user', content: cleaned });
    this.input = '';

    if (feedback && /masked/i.test(feedback)) {
      this.messages.push({ role: 'system', content: 'Note: Certain words were masked for safety.' });
    }

    try {
      const response = await this.rag.ask(this.lastQuery, { topic: this.activeTopic ?? undefined });
      this.messages.push(response);

      // Re-evaluate filters to include the new assistant message in results for the same query
      if (this.lastQuery) {
        this.filteredFaqs = this.computeFilteredFaqs(this.lastQuery);
        this.filteredMessages = this.computeFilteredHistory(this.lastQuery);
        this.filterMatches = true;
      }
    } catch (e) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong while fetching the answer.',
        error: true
      };
      this.messages.push(errMsg);
      if (this.lastQuery) {
        this.filteredFaqs = this.computeFilteredFaqs(this.lastQuery);
        this.filteredMessages = this.computeFilteredHistory(this.lastQuery);
        this.filterMatches = true;
      }
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
  /** Clears the current conversation and resets filtered view. */
  clear() {
    this.messages = [
      { role: 'assistant', content: 'Chat cleared. How can I help you next?' }
    ];
    this.filterFeedback = null;
    this.resetFilterView();
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}
