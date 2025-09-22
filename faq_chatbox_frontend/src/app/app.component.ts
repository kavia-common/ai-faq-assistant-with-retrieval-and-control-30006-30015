import { Component } from '@angular/core';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { SidebarTopicsComponent } from './topics/sidebar-topics.component';
import { ChatboxComponent } from './chat/chatbox.component';
import { TopicsBridgeService } from './core/topics-bridge.service';

/**
 * Root app shell that composes header, sidebar topics, chat interface, and footer.
 * Applies the Ocean Professional theme styling and responsive layout.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, SidebarTopicsComponent, ChatboxComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  // PUBLIC_INTERFACE
  /** App title for display and metadata. */
  title = 'AI FAQ Assistant';

  constructor(private topicsBridge: TopicsBridgeService) {}

  // PUBLIC_INTERFACE
  /** Receive topic selection from sidebar and broadcast via bridge service. */
  onTopicSelected(topic: string) {
    this.topicsBridge.setTopic(topic);
  }
}
