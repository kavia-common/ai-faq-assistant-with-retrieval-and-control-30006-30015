import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  // PUBLIC_INTERFACE
  /** Current year for footer copyright text. */
  year = new Date().getFullYear();
}
