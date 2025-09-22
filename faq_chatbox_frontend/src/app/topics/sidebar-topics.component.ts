import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Sidebar for FAQ topic navigation. Displays groups and allows filtering the chat context by topic.
 */
@Component({
  selector: 'app-sidebar-topics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-topics.component.html',
  styleUrl: './sidebar-topics.component.css'
})
export class SidebarTopicsComponent {
  // PUBLIC_INTERFACE
  /** Emits when a topic is selected to adjust RAG retrieval context. */
  @Output() topicSelected = new EventEmitter<string>();

  topics: Array<{ id: string; title: string; count?: number }> = [
    { id: 'getting-started', title: 'Getting Started', count: 8 },
    { id: 'account', title: 'Account & Billing', count: 5 },
    { id: 'security', title: 'Security', count: 6 },
    { id: 'api', title: 'API & Integrations', count: 9 },
    { id: 'troubleshooting', title: 'Troubleshooting', count: 7 },
  ];

  active = 'getting-started';

  // PUBLIC_INTERFACE
  /** Select a topic and emit selection for other components/services. */
  selectTopic(id: string) {
    this.active = id;
    this.topicSelected.emit(id);
  }
}
