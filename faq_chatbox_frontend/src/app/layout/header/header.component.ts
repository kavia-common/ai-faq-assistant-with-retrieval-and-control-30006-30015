import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  // PUBLIC_INTERFACE
  /** Brand name shown in header. */
  @Input() brand = 'AI FAQ Assistant';
}
