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

  /** When true, UI shows only filtered results computed after Send. */
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
      // Reset filter view on topic change to keep UX predictable
      this.resetFilterView();

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

    // If the user cleared the input, reset the filtered view.
    if (!text) {
      this.resetFilterView();
      return { cleaned: null, feedback: 'Please enter a question before sending.' };
    }

    // Example banned words list for demo; extend as needed.
    const banned = ['badword', 'curse', 'offensive'];
    const bannedRegex = new RegExp(`\\b(${banned.join('|')})\\b`, 'gi');

    if (bannedRegex.test(text)) {
      // Option B: mask banned words and proceed
      text = text.replace(bannedRegex, '****');
      // Provide subtle feedback but allow send
      return { cleaned: text, feedback: 'Note: Certain words were masked for safety.' };
    }

    // Simple sanitization: strip angle brackets to avoid naive HTML injection in mock rendering
    text = text.replace(/[<>]/g, '');

    return { cleaned: text };
  }

  /**
   * Build a local dataset to filter from:
   * - System/assistant seed messages
   * - Current conversation messages
   */
  private buildFilterDataset(): ChatMessage[] {
    // Use the current messages as the dataset to filter; this includes assistant greetings and any system notes.
    return this.messages.slice();
  }

  /**
   * Execute filtering for chat history using the query text.
   * - Case-insensitive substring match
   * - If topic is active, keep system "Context updated" notes but otherwise filter uniformly
   */
  private computeFilteredHistory(query: string): ChatMessage[] {
    const q = query.toLowerCase();
    const inTopic = this.activeTopic;
    const data = this.buildFilterDataset();

    return data.filter(m => {
      // Always allow system context updates for visibility when topic is active
      const isContextNote = m.role === 'system' && /Context updated to topic/i.test(m.content);
      if (inTopic && isContextNote) return true;

      return (m.content || '').toLowerCase().includes(q);
    });
  }

  /**
   * Filter FAQs for the active topic (or default) by matching title or content using
   * case-insensitive partial matching.
   */
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
  /** Send a user message to the assistant; uses RAG/MCP mock pipeline for response and filters visible data based on the input. */
  async send() {
    if (this.sending) return;

    const { cleaned, feedback } = this.filterInput(this.input);
    this.filterFeedback = feedback ?? null;

    if (!cleaned) {
      // Do not send; keep the input so user can fix it
      return;
    }

    // Compute filtered results across FAQs and chat history (frontend only)
    this.lastQuery = cleaned;
    this.filteredFaqs = this.computeFilteredFaqs(cleaned);
    this.filteredMessages = this.computeFilteredHistory(cleaned);
    this.filterMatches = true;

    this.sending = true;
    // Clear input for UX once we're sending
    this.input = '';
    // Clear previous feedback once message accepted
    // (We keep "masked" feedback visible briefly as a system note for transparency)
    const showMaskNote = !!feedback && /masked/i.test(feedback);

    // Push user message into conversation history (not visible while filter mode is active unless it matches)
    this.messages.push({ role: 'user', content: cleaned });

    // Optionally add a system note if masking occurred
    if (showMaskNote) {
      this.messages.push({
        role: 'system',
        content: 'Note: Certain words were masked for safety.'
      });
    }

    try {
      // Still perform the usual RAG flow to generate an answer
      const response = await this.rag.ask(cleaned, { topic: this.activeTopic ?? undefined });
      this.messages.push(response);

      // Update filtered view to reflect the newly added assistant response too
      // Keep showing only matches after send
      this.filteredFaqs = this.computeFilteredFaqs(this.lastQuery);
      this.filteredMessages = this.computeFilteredHistory(this.lastQuery);
    } catch (e) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong while fetching the answer.',
        error: true
      };
      this.messages.push(errMsg);
      // Update filtered set so the error is visible if it matches query (typically not)
      this.filteredFaqs = this.computeFilteredFaqs(this.lastQuery);
      this.filteredMessages = this.computeFilteredHistory(this.lastQuery);
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
    this.filterFeedback = null;
    this.resetFilterView();
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }
}
