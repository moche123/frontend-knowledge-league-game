import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
  selector: 'app-root',
  imports: [NgxSonnerToaster, RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
