// ./src/modules/Frameworks/TimeTravelCheat.ts

import { TimeConstants } from '../../constants';
import type { MaplebirchCore } from '../../core';

type TimeTravelField = 'year' | 'month' | 'day' | 'hour' | 'minute';
class TimeTravelCheat {
  private readonly ids: Record<TimeTravelField, string> = {
    year: 'maplebirch-time-travel-year',
    month: 'maplebirch-time-travel-month',
    day: 'maplebirch-time-travel-day',
    hour: 'maplebirch-time-travel-hour',
    minute: 'maplebirch-time-travel-minute'
  };

  public constructor(private readonly core: MaplebirchCore) {}

  public fragment(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const root = this.createRoot();
    fragment.append(root);
    this.bind(root);
    return fragment;
  }

  private createRoot(): HTMLElement {
    const root = document.createElement('div');
    root.className = 'settingsToggleItemWide';
    new this.core.SugarCube.Wikifier(root, this.render());
    return root;
  }

  private bind(root: HTMLElement): void {
    const current = new window.DateTime(Time.date);
    this.setFields(root, current);

    root.querySelector<HTMLButtonElement>('.maplebirch-time-travel-confirm')?.addEventListener('click', () => this.travel(root));

    root.querySelectorAll<HTMLInputElement>('[data-time-travel-field]').forEach(input => input.addEventListener('change', () => this.syncDayLimit(root)));
    this.syncDayLimit(root);
  }

  private render(): string {
    const lan = (en: string, cn: string) => lanSwitch(en, cn);
    const field = (name: TimeTravelField, label: string, min: number, max: number) => `
      <label>
        <input id="${this.ids[name]}" class="macro-numberbox" type="number" min="${min}" max="${max}" step="1" data-time-travel-field="${name}">
        <span>${label}</span>
      </label>`;

    return `
      <div class="maplebirch-time-travel">
        <div class="maplebirch-time-travel-form">
          <div class="maplebirch-time-travel-date">
            ${field('year', lan('Year', '年'), TimeConstants.MIN_DATE.year, TimeConstants.MAX_DATE.year)}
            ${field('month', lan('Month', '月'), 1, 12)}
            ${field('day', lan('Day', '日'), 1, 31)}
          </div>
          <div class="maplebirch-time-travel-clock">
            ${field('hour', lan('Hour', '时'), 0, 23)}
            ${field('minute', lan('Minute', '分'), 0, 59)}
          </div>
          <div class="maplebirch-time-travel-actions">
            <<lanButton 'confirm' 'title' { class: 'maplebirch-time-travel-confirm' }>><</lanButton>>
          </div>
        </div>
        <div class="maplebirch-time-travel-status" data-time-travel-status></div>
      </div>`;
  }

  private fieldInput(root: HTMLElement, field: TimeTravelField): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>(`[data-time-travel-field="${field}"]`);
  }

  private setFields(root: HTMLElement, date: Pick<DateTime, TimeTravelField>): void {
    for (const field of Object.keys(this.ids) as TimeTravelField[]) {
      const input = this.fieldInput(root, field);
      if (input) input.value = String(date[field]);
    }
    this.syncDayLimit(root);
  }

  private readFields(root: HTMLElement): Record<TimeTravelField, number> {
    const values = {} as Record<TimeTravelField, number>;
    for (const field of Object.keys(this.ids) as TimeTravelField[]) {
      const value = Number(this.fieldInput(root, field)?.value);
      if (!Number.isInteger(value)) throw new Error(`${field} is invalid`);
      values[field] = value;
    }

    const lastDay = new window.DateTime(values.year, values.month, 1).lastDayOfMonth;
    if (values.month < 1 || values.month > 12) throw new Error(lanSwitch('Month must be 1-12.', '月份必须为 1-12。'));
    if (values.day < 1 || values.day > lastDay) throw new Error(lanSwitch('Day is invalid for the selected month.', '日期不符合所选月份。'));
    if (values.hour < 0 || values.hour > 23) throw new Error(lanSwitch('Hour must be 0-23.', '小时必须为 0-23。'));
    if (values.minute < 0 || values.minute > 59) throw new Error(lanSwitch('Minute must be 0-59.', '分钟必须为 0-59。'));
    return values;
  }

  private syncDayLimit(root: HTMLElement): void {
    try {
      const year = Number(this.fieldInput(root, 'year')?.value);
      const month = Number(this.fieldInput(root, 'month')?.value);
      const dayInput = this.fieldInput(root, 'day');
      if (!dayInput || !Number.isInteger(year) || !Number.isInteger(month)) return;
      const maxDay = new window.DateTime(year, month, 1).lastDayOfMonth;
      dayInput.max = String(maxDay);
      if (Number(dayInput.value) > maxDay) dayInput.value = String(maxDay);
    } catch {}
  }

  private travel(root: HTMLElement): void {
    try {
      const target = this.readFields(root);
      const date = new window.DateTime(target.year, target.month, target.day, target.hour, target.minute, 0);
      if (date.timeStamp < TimeConstants.MIN_DATE.timeStamp || date.timeStamp > TimeConstants.MAX_DATE.timeStamp) throw new Error(lanSwitch('Target date is out of range.', '目标时间超出范围。'));
      if (!this.core.dynamic.timeTravel({ ...target, second: 0 })) throw new Error(lanSwitch('Time travel failed.', '时间跳转失败。'));
      this.core.SugarCube.State.show();
    } catch (error: any) {
      this.status(root, error?.message || String(error));
    }
  }

  private status(root: HTMLElement, message: string): void {
    const status = root.querySelector<HTMLElement>('[data-time-travel-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.add('error', 'visible');
  }
}

export default TimeTravelCheat;
