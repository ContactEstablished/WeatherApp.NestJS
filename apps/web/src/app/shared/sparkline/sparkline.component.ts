import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [],
  templateUrl: './sparkline.component.html',
})
export class SparklineComponent {
  values = input<number[]>([]);
  variant = input<'line' | 'bars'>('line');

  private readonly width = 132;
  private readonly height = 46;

  linePath = computed((): string => {
    const vals = this.values();
    if (vals.length === 0) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    const step = this.width / Math.max(vals.length - 1, 1);
    return vals
      .map((value, index) => {
        const x = index * step;
        const y = this.height - ((value - min) / span) * (this.height - 10) - 5;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  });

  bars = computed(() =>
    this.values().map((value, index) => ({
      x: index * 14,
      y: this.height - value * 2.2 - 2,
      width: 6,
      height: Math.max(value * 2.2, 4),
      rx: 2,
    }))
  );
}
