import { Injectable } from '@angular/core';
import { delay } from '../utils/delay';

// Basic message types for chat
export type Role = 'user' | 'assistant' | 'system';
export interface ChatMessage {
  role: Role;
  content: string;
  error?: boolean;
}

// Public query options
export interface QueryOptions {
  topic?: string;
}

/**
 * RAG service orchestrates retrieval + generation and simulates MCP tool calls.
 * In production, replace mock calls with real REST/GraphQL endpoints.
 */
@Injectable({ providedIn: 'root' })
export class RagService {
  private mockKnowledgeBase: Record<string, string[]> = {
    'getting-started': [
      'Welcome to our platform! To get started, create an account and verify your email.',
      'Use your dashboard to set up initial preferences and connect integrations.'
    ],
    'account': [
      'You can update billing details under Settings > Billing.',
      'Invoices are generated monthly and emailed to the account owner.'
    ],
    'security': [
      'We support SSO, MFA, and granular role-based access control.',
      'All data is encrypted at rest and in transit.'
    ],
    'api': [
      'Use API keys from Settings > API to authenticate your requests.',
      'Rate limiting is enforced at 60 requests per minute.'
    ],
    'troubleshooting': [
      'Try clearing cache and re-authenticating if something looks off.',
      'Contact support with your request ID for detailed investigation.'
    ],
    'default': [
      'I can help with getting started, account & billing, security, API & integrations, and troubleshooting.',
      'Please ask a question or select a topic.'
    ]
  };

  // PUBLIC_INTERFACE
  /**
   * Ask a question. This simulates:
   * 1) Retrieval from ChromaDB (mocked),
   * 2) MCP tool selection (mocked),
   * 3) LLM generation (mocked).
   * Replace with real HTTP calls when backend is ready.
   */
  async ask(question: string, opts?: QueryOptions): Promise<ChatMessage> {
    // 1) Retrieve
    const docs = await this.retrieveFromChroma(question, opts?.topic);

    // 2) MCP tool choice (mock)
    const toolUsed = this.selectMcpTool(question);

    // 3) Generate answer (mock synthesis)
    const answer = this.synthesizeAnswer(question, docs, toolUsed);

    // Simulate latency
    await delay(450 + Math.random() * 300);
    return { role: 'assistant', content: answer };
  }

  private async retrieveFromChroma(query: string, topic?: string): Promise<string[]> {
    // Placeholder: Replace with fetch() to your retrieval endpoint, e.g.:
    // const res = await fetch(`${env.API_URL}/rag/retrieve?topic=${topic}&q=${encodeURIComponent(query)}`);
    // return await res.json();
    await delay(200);
    const key = topic && this.mockKnowledgeBase[topic] ? topic : 'default';
    const base = this.mockKnowledgeBase[key];
    // Simple filter by keyword presence
    const subset = base.filter(s => s.toLowerCase().includes(query.toLowerCase().split(' ')[0] || ''));
    return subset.length ? subset : base.slice(0, 2);
  }

  private selectMcpTool(question: string): string {
    // Extremely simple mock: choose a "tool" by keyword
    if (/billing|invoice|payment/i.test(question)) return 'billing.lookup';
    if (/api|key|token|rate/i.test(question)) return 'api.docs.search';
    if (/security|mfa|sso|rbac/i.test(question)) return 'security.policy.fetch';
    if (/troubleshoot|error|issue/i.test(question)) return 'diagnostics.helper';
    return 'knowledge.search';
  }

  private synthesizeAnswer(question: string, docs: string[], tool: string): string {
    const context = docs.map((d, i) => `• ${d}`).join('\n');
    return `Here’s what I found using ${tool}:\n${context}\n\nIf you need more details, feel free to ask or refine by selecting a topic.`;
  }
}
