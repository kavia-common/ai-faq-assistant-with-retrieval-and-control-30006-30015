import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Mediates topic selection changes between the sidebar and chatbox.
 */
@Injectable({ providedIn: 'root' })
export class TopicsBridgeService {
  private topicSubject = new BehaviorSubject<string | null>('getting-started');
  topic$ = this.topicSubject.asObservable();

  // PUBLIC_INTERFACE
  /** Publish a topic selection for any component to consume. */
  setTopic(topic: string | null) {
    this.topicSubject.next(topic);
  }
}
